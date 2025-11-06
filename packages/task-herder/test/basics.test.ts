import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskHerder, CancelReason } from '../src'

describe('basics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should create an instance', () => {
    const bucket = new TaskHerder({
      startingTokens: 3,
      burstLimit: 10,
      sustainRate: 1,
      queueCostLimit: 20,
    })
    expect(bucket).toBeInstanceOf(TaskHerder)
  })
  it('should reject a task that exceeds the burst limit', async () => {
    const bucket = new TaskHerder({
      startingTokens: 3,
      burstLimit: 2,
      sustainRate: 1,
      queueCostLimit: 20,
    })
    const task = () => Promise.resolve('done')

    // This task is too big to ever fit in this tiny bucket
    await expect(bucket.do(task, { cost: 3 })).rejects.toThrow(CancelReason.TaskTooExpensive)

    // This task fits
    await expect(bucket.do(task, { cost: 2 })).resolves.toBe('done')
  })
  it('should reject a task that pushes the queue past its cost limit', async () => {
    const bucket = new TaskHerder({
      startingTokens: 3,
      burstLimit: 10,
      sustainRate: 1,
      queueCostLimit: 10,
    })
    const task = () => Promise.resolve('done')

    void bucket.do(task, { cost: 5 })
    void bucket.do(task, { cost: 4 })
    expect(bucket.length).toBe(2)

    // This task is small enough to fit  too big to ever fit in the queue
    await expect(bucket.do(task, { cost: 2 })).rejects.toThrow(CancelReason.QueueCostLimitExceeded)
    expect(bucket.length).toBe(2)

    // This task fits
    void bucket.do(task, { cost: 1 })
    expect(bucket.length).toBe(3)
  })
})
