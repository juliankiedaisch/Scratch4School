import pLimit, { type LimitFunction } from 'p-limit'

export interface BucketOptions {
  /** Maximum number of tokens in the bucket */
  maxTokens: number
  /** Rate at which tokens are added to the bucket (tokens per second) */
  refillRate: number
  /** Initial number of tokens in the bucket (default to a full bucket) */
  startingTokens?: number
  /** Reject a task if it would cause the total queue cost to exceed this limit (default: no limit) */
  queueCostLimit?: number
  /** Number of tasks that can be processed concurrently (default: 1) */
  concurrency?: number
}

export interface TaskOptions {
  /** Cost of the task in tokens (default: 1) */
  cost?: number
  /** If set, the task will be aborted if this signal is triggered */
  abortSignal?: AbortSignal
}

export const CancelReason = {
  QueueCostLimitExceeded: 'Queue cost limit exceeded',
  Aborted: 'Task aborted',
  Cancel: 'Task cancelled',
  TaskTooExpensive: 'Task cost exceeds maximum bucket size',
} as const

/**
 * Equivalent to `Promise.withResolvers`, which is not yet widely available.
 * @todo Remove this function when `Promise.withResolvers` is widely available, likely around September 2026.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers}
 * @returns An object containing the promise along with its resolve and reject functions.
 */
function PromiseWithResolvers<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
} {
  let resolve
  let reject
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  // The `as unknown as` casts are necessary because TypeScript doesn't
  // know that the Promise executor is called synchronously.
  return {
    promise,
    resolve: resolve as unknown as (value: T | PromiseLike<T>) => void,
    reject: reject as unknown as (reason?: unknown) => void,
  }
}

class TaskRecord<T> {
  /** The cost of the task in tokens */
  public readonly cost: number
  /** The promise wrapping the task */
  public readonly promise: Promise<T>
  /** Run the task and settle the promise */
  public readonly run: () => void
  /** Cancel the task and reject the promise */
  public readonly cancel: (e: Error) => void

  /**
   * @param task The task to wrap.
   * @param options The options for the task.
   */
  constructor(task: () => T | Promise<T>, options: TaskOptions = {}) {
    this.cost = options.cost ?? 1

    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => {
        this.cancel(new Error(CancelReason.Aborted))
      })
    }

    const { promise, resolve, reject } = PromiseWithResolvers<T>()

    this.promise = promise
    this.cancel = e => {
      reject(e)
    }
    this.run = () => {
      try {
        const result = task()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
  }
}

/**
 * Run tasks with rate and concurrency limits.
 * The rate limit is based on the token bucket algorithm. In this algorithm, a "bucket" holds a certain number of
 * tokens, which represent the capacity to perform work. The bucket gradually refills with tokens at a fixed rate, up
 * to a maximum capacity. Each task "costs" a certain number of tokens; if insufficient tokens are available, the task
 * must wait until enough tokens have accumulated.
 * In addition, a concurrency limit controls how many tasks can be run simultaneously. If the concurrency limit is
 * reached, additional tasks must wait until a running task completes even if there are enough tokens available.
 * @see {@link https://en.wikipedia.org/wiki/Token_bucket} for more information about the algorithm.
 */
export class TaskHerder {
  private readonly maxTokens: number
  private readonly refillRate: number
  private readonly queueCostLimit: number
  private readonly concurrencyLimiter: LimitFunction
  private readonly boundRunTasks = this.runTasks.bind(this)
  private tokenCount: number

  private pendingTaskRecords: TaskRecord<unknown>[] = []
  private timeout: number | null = null
  private lastRefillTime: number = Date.now()

  constructor(options: BucketOptions) {
    this.maxTokens = options.maxTokens
    this.refillRate = options.refillRate
    this.tokenCount = options.startingTokens ?? options.maxTokens
    this.queueCostLimit = options.queueCostLimit ?? Infinity
    this.concurrencyLimiter = pLimit(options.concurrency ?? 1)
  }

  /** @returns The number of tasks currently in the queue */
  get length(): number {
    return this.pendingTaskRecords.length
  }

  /**
   * Adds a task to the queue. The task will first wait until enough tokens are available, then will wait its turn in
   * the concurrency queue.
   * @param task The task to be added to the queue.
   * @param taskOptions Options for queueing the task, such as the task cost.
   * @returns A promise for the task's result.
   */
  do<T>(task: () => T | Promise<T>, taskOptions: TaskOptions = {}): Promise<T> {
    const taskRecord = new TaskRecord<T>(task, taskOptions)

    if (taskRecord.cost > this.maxTokens) {
      return Promise.reject(new Error(CancelReason.TaskTooExpensive))
    }

    if (this.queueCostLimit < Infinity) {
      const proposedQueueCost = this.pendingTaskRecords.reduce((sum, record) => sum + record.cost, taskRecord.cost)
      if (proposedQueueCost > this.queueCostLimit) {
        return Promise.reject(new Error(CancelReason.QueueCostLimitExceeded))
      }
    }

    this.pendingTaskRecords.push(taskRecord)

    // If the queue was empty, we need to prime the pump
    if (this.pendingTaskRecords.length === 1) {
      void this.runTasks()
    }

    return taskRecord.promise
  }

  /**
   * Cancel a task and remove it from the queue.
   * @param taskPromise - The promise of the task to cancel.
   * @param [reason] - The reason for cancellation.
   * @returns True if the task was found and cancelled, false otherwise.
   */
  cancel(taskPromise: Promise<unknown>, reason?: Error): boolean {
    const taskIndex = this.pendingTaskRecords.findIndex(record => record.promise === taskPromise)
    if (taskIndex !== -1) {
      const [taskRecord] = this.pendingTaskRecords.splice(taskIndex, 1)
      taskRecord.cancel(reason ?? new Error(CancelReason.Cancel))
      if (taskIndex === 0 && this.pendingTaskRecords.length > 0) {
        void this.runTasks()
      }
      return true
    }
    return false
  }

  /**
   * Cancel all pending tasks and clear the queue.
   * @param [reason] - The reason for cancellation.
   * @returns The number of tasks that were cancelled.
   */
  cancelAll(reason?: Error): number {
    if (this.timeout !== null) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    const oldTasks = this.pendingTaskRecords
    this.pendingTaskRecords = []
    reason = reason ?? new Error(CancelReason.Cancel)
    oldTasks.forEach(taskRecord => {
      taskRecord.cancel(reason)
    })
    return oldTasks.length
  }

  /**
   * Short-hand for calling refill() followed by spend().
   * @param cost The number of tokens to spend.
   * @returns True if the tokens were successfully spent, false otherwise.
   */
  private refillAndSpend(cost: number): boolean {
    this.refill()
    return this.spend(cost)
  }

  /**
   * Refill the token bucket based on the time elapsed since the last refill.
   */
  private refill(): void {
    const now = Date.now()
    const timeSinceRefill = now - this.lastRefillTime
    if (timeSinceRefill <= 0) {
      return
    }

    this.lastRefillTime = now
    const tokensToAdd = (timeSinceRefill / 1000) * this.refillRate
    this.tokenCount = Math.min(this.maxTokens, this.tokenCount + tokensToAdd)
  }

  /**
   * Attempt to spend tokens from the bucket.
   * @param cost The number of tokens to spend.
   * @returns True if the tokens were successfully spent, false otherwise.
   */
  private spend(cost: number): boolean {
    if (this.tokenCount >= cost) {
      this.tokenCount -= cost
      return true
    }
    return false
  }

  /**
   * Run tasks from the queue as tokens become available.
   */
  private runTasks(): void {
    if (this.timeout !== null) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    for (;;) {
      const nextRecord = this.pendingTaskRecords.shift()
      if (!nextRecord) {
        // No more tasks to run
        return
      }

      if (nextRecord.cost > this.maxTokens) {
        // This should have been caught when the task was added
        nextRecord.cancel(new Error(CancelReason.TaskTooExpensive))
        continue
      }

      // Refill before each task in case the time it took for the last task to run was enough to afford the next.
      if (this.refillAndSpend(nextRecord.cost)) {
        // Run the task within the concurrency limiter
        void this.concurrencyLimiter(nextRecord.run)
      } else {
        // We can't currently afford this task. Put it back and wait until we can, then try again.
        this.pendingTaskRecords.unshift(nextRecord)
        const tokensNeeded = Math.max(nextRecord.cost - this.tokenCount, 0)
        const estimatedWait = Math.ceil((1000 * tokensNeeded) / this.refillRate)
        this.timeout = setTimeout(this.boundRunTasks, estimatedWait)
        return
      }
    }
  }
}
