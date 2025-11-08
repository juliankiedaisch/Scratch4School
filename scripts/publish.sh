#!/usr/bin/env bash
set -euo pipefail

# Configuration
SOURCE_BRANCH="refs/heads/mdg"        # Branch to publish
PUBLIC_REPO_DIR="/home/julian/Code/scratch4school"  # Public repo directory
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
if [ ! -f "$LAST_SYNC_FILE" ]; then
  echo "No last sync commit found - will create an initial snapshot (no history)"
  FIRST_RUN=true
else
  LAST_SYNC_COMMIT=$(cat "$LAST_SYNC_FILE")
  echo "Found last sync commit: $LAST_SYNC_COMMIT"
fi

# Get the latest commit from the source branch
cd "$WORKING_REPO_DIR"
git checkout mdg
echo "Checkout done"
git pull mdg mdg

LATEST_COMMIT=$(git rev-parse "$SOURCE_BRANCH")
echo "Latest commit in $SOURCE_BRANCH: $LATEST_COMMIT"

# Create temporary directory
TMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TMP_DIR"

# Cleanup function
cleanup() {
  echo "Cleaning up temporary directory..."
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# Check if this is the first run (no history to preserve)
if [ "$FIRST_RUN" = true ]; then
  echo "FIRST RUN: Creating clean snapshot without history..."
  
  # Create a fresh clone for the export instead of using git archive
  echo "Cloning the repository to ensure all files are included..."
  cd "$WORKING_REPO_DIR"
  git checkout "$SOURCE_BRANCH"
  
  # Copy all files directly (not using git archive which may filter files)
  echo "Copying all files to temporary directory..."
  rsync -av --exclude=".git/" . "$TMP_DIR/"
  
  # Verify SVG files were copied
  echo "Verifying SVG files..."
  SVG_COUNT=$(find "$TMP_DIR" -name "*.svg" | wc -l)
  echo "Found $SVG_COUNT SVG files in temp directory"
  
  # Now setup the public repository
  echo "Setting up public repository at $PUBLIC_REPO_DIR..."
  if [ ! -d "$PUBLIC_REPO_DIR" ]; then
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
    git rm -rf . 2>/dev/null || true
    git clean -fdx 2>/dev/null || true
  fi

  # Set remote
  if ! git remote | grep -q "^origin$"; then
    echo "Adding remote origin..."
    git remote add origin "$PUBLIC_REMOTE"
  else
    echo "Updating remote URL..."
    git remote set-url origin "$PUBLIC_REMOTE"
  fi

  # Copy files from temp to public repo with explicit binary handling
  echo "Copying files to public repository..."
  rsync -av --delete --exclude=".git/" \
        --include="*.svg" --include="*.png" --include="*.jpg" --include="*.jpeg" \
        --include="*.gif" --include="*.webp" --include="*.ico" \
        "$TMP_DIR/" "$PUBLIC_REPO_DIR/"
  
  # Verify files were copied correctly
  echo "Verifying files were copied correctly..."
  SVG_COUNT_DEST=$(find "$PUBLIC_REPO_DIR" -name "*.svg" | wc -l)
  echo "Found $SVG_COUNT_DEST SVG files in public repository"
  
  # Add all files and make a single initial commit
  git add -A .
  git commit -m "Initial snapshot from $SOURCE_BRANCH as of $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Created initial snapshot commit"
  
else

  # Now setup the public repository
  cd "$PUBLIC_REPO_DIR"

  # Pull latest changes
  echo "Syncing with GitHub..."
  git pull origin "$PUBLIC_BRANCH" || echo "Could not pull (possibly empty repository)"

  cd "$WORKING_REPO_DIR"

  # Not the first run - create patches for incremental updates with history
  PATCHES_DIR="$TMP_DIR/patches"
  mkdir -p "$PATCHES_DIR"
  echo "Creating patches for new commits since last sync..."
  
  # Check if the last sync commit exists in the working repository
  if git rev-parse --quiet --verify "$LAST_SYNC_COMMIT^{commit}" >/dev/null; then
    # Create patches from last sync commit to HEAD
    git format-patch -o "$PATCHES_DIR" "$LAST_SYNC_COMMIT..$LATEST_COMMIT"
    NEW_COMMITS=$(git rev-list --count "$LAST_SYNC_COMMIT..$LATEST_COMMIT")
    echo "Found $NEW_COMMITS new commits"
  else
    echo "Error: Last sync commit not found in repository. This shouldn't happen."
    echo "Please delete $LAST_SYNC_FILE and run again for a clean snapshot."
    exit 1
  fi

  # Check if we have any patches to apply
  PATCH_COUNT=$(ls -1 "$PATCHES_DIR"/*.patch 2>/dev/null | wc -l || echo "0")
  echo "$PATCH_COUNT is Patchcount"
  if [ "$PATCH_COUNT" -eq 0 ]; then
    echo "No new commits to publish. Already up to date."
    
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

  echo "Created $PATCH_COUNT patch files"

  # Apply patches in order to apply new commits
  echo "Applying patches for new commits..."
  if [ "$PATCH_COUNT" -gt 0 ]; then
    git am --ignore-whitespace "$PATCHES_DIR"/*.patch || {
      echo "Error applying patches. Aborting."
      git am --abort
      exit 1
    }
    echo "Applied all patches with original commit messages"
  fi
fi

# Save the latest commit for next sync
echo "$LATEST_COMMIT" > "$LAST_SYNC_FILE"
echo "Saved latest commit hash for next sync"

# Create tag if requested
if [ -n "$TAG_NAME" ]; then
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
echo "Pushing to GitHub..."
if [ -n "$TAG_NAME" ]; then
  git push -u origin "$PUBLIC_BRANCH" --tags
  echo "Pushed branch and tags to GitHub."
else
  git push -u origin "$PUBLIC_BRANCH"
  echo "Pushed branch to GitHub."
fi

echo "==== Publishing complete! ===="
if [ "$FIRST_RUN" = true ]; then
  echo "Published initial snapshot from $SOURCE_BRANCH to GitHub"
else
  echo "Published $PATCH_COUNT new commits from $SOURCE_BRANCH to GitHub"
fi
if [ -n "$TAG_NAME" ]; then
  echo "Created and pushed tag: $TAG_NAME"
fi