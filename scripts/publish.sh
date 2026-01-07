#!/usr/bin/env bash
set -euo pipefail

# Configuration
SOURCE_BRANCH="mdg"                   # Branch to publish (without refs/heads/)
PUBLIC_REPO_DIR="/home/julian/Code/Scratch4School"  # Public repo directory
WORKING_REPO_DIR="/home/julian/Code/scratch-editor"  # Working repo directory
PUBLIC_REMOTE="git@github.com:juliankiedaisch/Scratch4School.git"  # GitHub remote
PUBLIC_BRANCH="main"                  # Branch to push to GitHub
LAST_SYNC_FILE="$PUBLIC_REPO_DIR/.last_sync_commit"  # File to track last sync point

# Process arguments
TAG_NAME=""
SHOW_HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag)
      if [[ -z "$2" || "$2" == -* ]]; then
        echo "Error: Tag name is required after -t/--tag"
        exit 1
      fi
      TAG_NAME="$2"
      shift 2
      ;;
    -h|--help)
      SHOW_HELP=true
      shift
      ;;
    *)
      echo "Error: Unknown parameter '$1'"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
  echo "Usage: $(basename $0) [options]"
  echo "Options:"
  echo "  -t, --tag TAG_NAME    Create a Git tag in the public repository"
  echo "  -h, --help            Show this help message"
  echo ""
  echo "Example:"
  echo "  $(basename $0) --tag v1.2.0"
  exit 0
fi

echo "==== Publishing from $SOURCE_BRANCH to GitHub ===="
if [ -n "$TAG_NAME" ]; then
  echo "Will create tag: $TAG_NAME"
fi

# Check if we have a last sync commit recorded
FIRST_RUN=false
if [ !  -f "$LAST_SYNC_FILE" ]; then
  echo "No last sync commit found - will create an initial snapshot (no history)"
  FIRST_RUN=true
else
  LAST_SYNC_COMMIT=$(cat "$LAST_SYNC_FILE")
  echo "Found last sync commit: $LAST_SYNC_COMMIT"
fi

# Save the current branch/commit in working repo to restore it later
cd "$WORKING_REPO_DIR"
if git symbolic-ref -q HEAD > /dev/null; then
  # We're on a branch
  ORIGINAL_REF=$(git symbolic-ref --short HEAD)
  RESTORE_TYPE="branch"
else
  # We're in detached HEAD state
  ORIGINAL_REF=$(git rev-parse HEAD)
  RESTORE_TYPE="commit"
fi
echo "Working repo currently on: $ORIGINAL_REF ($RESTORE_TYPE)"

# Cleanup function - restore working repo state
cleanup() {
  echo "Cleaning up..."
  
  # Restore original branch/commit in working repo
  if [ -n "${ORIGINAL_REF:-}" ]; then
    cd "$WORKING_REPO_DIR" 2>/dev/null || true
    echo "Restoring working repository to original state: $ORIGINAL_REF"
    if [ "$RESTORE_TYPE" = "branch" ]; then
      git checkout "$ORIGINAL_REF" 2>/dev/null || true
    else
      git checkout --detach "$ORIGINAL_REF" 2>/dev/null || true
    fi
  fi
  
  # Remove temporary directory
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    echo "Removing temporary directory..."
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

# Update and checkout the source branch
cd "$WORKING_REPO_DIR"
echo "Updating $SOURCE_BRANCH branch..."

# Stash any local changes
STASHED=false
if !  git diff --quiet || ! git diff --cached --quiet; then
  echo "Stashing local changes..."
  git stash push -m "Auto-stash by publish script"
  STASHED=true
fi

# Make sure we have the latest
git fetch origin "$SOURCE_BRANCH" || git fetch "$SOURCE_BRANCH" || true
git checkout "$SOURCE_BRANCH"
git pull origin "$SOURCE_BRANCH" 2>/dev/null || git pull "$SOURCE_BRANCH" 2>/dev/null || true

LATEST_COMMIT=$(git rev-parse HEAD)
echo "Latest commit in $SOURCE_BRANCH: $LATEST_COMMIT"

# Create temporary directory
TMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TMP_DIR"

# Check if this is the first run (no history to preserve)
if [ "$FIRST_RUN" = true ]; then
  echo "FIRST RUN:  Creating clean snapshot without history..."
  
  # Copy all files directly
  echo "Copying all files to temporary directory..."
  rsync -av --exclude=".git/" .  "$TMP_DIR/"
  
  # Verify SVG files were copied
  echo "Verifying SVG files..."
  SVG_COUNT=$(find "$TMP_DIR" -name "*.svg" | wc -l)
  echo "Found $SVG_COUNT SVG files in temp directory"
  
  # Now setup the public repository
  echo "Setting up public repository at $PUBLIC_REPO_DIR..."
  if [ !  -d "$PUBLIC_REPO_DIR" ]; then
    echo "Creating directory $PUBLIC_REPO_DIR..."
    mkdir -p "$PUBLIC_REPO_DIR"
  fi

  cd "$PUBLIC_REPO_DIR"

  # Initialize Git if needed
  if [ ! -d "$PUBLIC_REPO_DIR/.git" ]; then
    echo "Initializing Git repository..."
    git init -b "$PUBLIC_BRANCH"
    echo "Git repository initialized."
  else
    echo "Using existing Git repository."
    # If repo exists, clean it for the initial snapshot
    git rm -rf .  2>/dev/null || true
    git clean -fdx 2>/dev/null || true
  fi

  # Set remote
  if !  git remote | grep -q "^origin$"; then
    echo "Adding remote origin..."
    git remote add origin "$PUBLIC_REMOTE"
  else
    echo "Updating remote URL..."
    git remote set-url origin "$PUBLIC_REMOTE"
  fi

  # Copy files from temp to public repo
  echo "Copying files to public repository..."
  rsync -av --delete --exclude=".git/" \
        --include="*.svg" --include="*. png" --include="*.jpg" --include="*.jpeg" \
        --include="*.gif" --include="*.webp" --include="*.ico" \
        "$TMP_DIR/" "$PUBLIC_REPO_DIR/"
  
  # Verify files were copied correctly
  echo "Verifying files were copied correctly..."
  SVG_COUNT_DEST=$(find "$PUBLIC_REPO_DIR" -name "*. svg" | wc -l)
  echo "Found $SVG_COUNT_DEST SVG files in public repository"
  
  # Add all files and make a single initial commit
  git add -A . 
  git commit -m "Initial snapshot from $SOURCE_BRANCH as of $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Created initial snapshot commit"
  
else
  # Not the first run - use rsync approach instead of patches
  echo "Syncing changes since last sync..."
  
  # Check if the last sync commit exists in the working repository
  if !  git rev-parse --quiet --verify "$LAST_SYNC_COMMIT^{commit}" >/dev/null; then
    echo "Error:  Last sync commit not found in repository."
    echo "Please delete $LAST_SYNC_FILE and run again for a clean snapshot."
    exit 1
  fi

  NEW_COMMITS=$(git rev-list --count "${LAST_SYNC_COMMIT}..${LATEST_COMMIT}")
  echo "Found $NEW_COMMITS new commits since last sync"

  if [ "$NEW_COMMITS" -eq 0 ]; then
    echo "No new commits to publish.  Already up to date."
    
    # Create tag even if there are no new commits (if requested)
    if [ -n "$TAG_NAME" ]; then
      cd "$PUBLIC_REPO_DIR"
      if git rev-parse "$TAG_NAME" &>/dev/null; then
        echo "Warning: Tag '$TAG_NAME' already exists. Skipping tag creation."
      else
        echo "Creating tag '$TAG_NAME'..."
        git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
        git push origin "$TAG_NAME"
        echo "Tag '$TAG_NAME' created and pushed."
      fi
    fi
    
    exit 0
  fi

  # Get commit messages for the summary commit
  echo "Collecting commit messages..."
  COMMIT_MESSAGES=$(git log --format="- %s" "${LAST_SYNC_COMMIT}..${LATEST_COMMIT}")
  
  # Now setup the public repository
  cd "$PUBLIC_REPO_DIR"

  # Pull latest changes
  echo "Syncing with GitHub..."
  git pull origin "$PUBLIC_BRANCH" || echo "Could not pull (possibly empty repository)"

  # Sync files using rsync (more reliable than patches)
  echo "Syncing files from source repository..."
  rsync -av --delete \
        --exclude=".git/" \
        --exclude=".last_sync_commit" \
        --include="*.svg" --include="*. png" --include="*.jpg" --include="*.jpeg" \
        --include="*.gif" --include="*.webp" --include="*.ico" \
        "$WORKING_REPO_DIR/" "$PUBLIC_REPO_DIR/"
  
  # Check if there are any changes
  if git diff --quiet && git diff --cached --quiet; then
    echo "No file changes detected after sync."
  else
    echo "Changes detected, creating commit..."
    
    # Stage all changes
    git add -A . 
    
    # Create a single commit with summary of all source commits
    SUMMARY_MESSAGE="Sync $NEW_COMMITS commits from $SOURCE_BRANCH

$COMMIT_MESSAGES

Source commit range: ${LAST_SYNC_COMMIT}..${LATEST_COMMIT}"
    
    git commit -m "$SUMMARY_MESSAGE"
    echo "Created sync commit summarizing $NEW_COMMITS source commits"
  fi
fi

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
  cd "$WORKING_REPO_DIR"
  echo "Restoring stashed changes..."
  git stash pop || echo "Warning: Could not restore stashed changes"
fi

# Save the latest commit for next sync
echo "$LATEST_COMMIT" > "$LAST_SYNC_FILE"
echo "Saved latest commit hash for next sync"

# Create tag if requested
if [ -n "$TAG_NAME" ]; then
  cd "$PUBLIC_REPO_DIR"
  # Check if tag already exists
  if git rev-parse "$TAG_NAME" &>/dev/null; then
    echo "Warning: Tag '$TAG_NAME' already exists. Skipping tag creation."
  else
    echo "Creating tag '$TAG_NAME'..."
    git tag -a "$TAG_NAME" -m "Release $TAG_NAME"
    echo "Tag '$TAG_NAME' created."
  fi
fi

# Push to GitHub
cd "$PUBLIC_REPO_DIR"
echo "Pushing to GitHub..."
if [ -n "$TAG_NAME" ]; then
  git push -u origin "$PUBLIC_BRANCH" --tags
  echo "Pushed branch and tags to GitHub."
else
  git push -u origin "$PUBLIC_BRANCH"
  echo "Pushed branch to GitHub."
fi

echo "==== Publishing complete!  ===="
if [ "$FIRST_RUN" = true ]; then
  echo "Published initial snapshot from $SOURCE_BRANCH to GitHub"
else
  echo "Published $NEW_COMMITS new commits from $SOURCE_BRANCH to GitHub"
fi
if [ -n "$TAG_NAME" ]; then
  echo "Created and pushed tag: $TAG_NAME"
fi
echo "Working repository restored to:  $ORIGINAL_REF"