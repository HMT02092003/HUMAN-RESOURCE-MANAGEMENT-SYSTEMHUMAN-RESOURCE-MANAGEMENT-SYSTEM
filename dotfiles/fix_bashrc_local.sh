#!/bin/bash
# Auto-fix ~/.bashrc_local (backup + replace with clean version)
# Created: 2025-11-15

set -e

echo "🔧 Fixing ~/.bashrc_local..."

# 1. Backup existing file (if exists)
if [ -f "$HOME/.bashrc_local" ]; then
  BACKUP="$HOME/.bashrc_local.backup.$(date +%Y%m%d%H%M%S)"
  cp -v "$HOME/.bashrc_local" "$BACKUP"
  echo "✅ Backup created: $BACKUP"
else
  echo "ℹ️  No existing ~/.bashrc_local found (will create new)"
fi

# 2. Get repo root (script should be in dotfiles/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 3. Copy clean version from repo
CLEAN_FILE="$SCRIPT_DIR/bashrc_local_clean"
if [ -f "$CLEAN_FILE" ]; then
  cp -v "$CLEAN_FILE" "$HOME/.bashrc_local"
  echo "✅ Replaced ~/.bashrc_local with clean version"
else
  echo "❌ Error: $CLEAN_FILE not found in repo"
  exit 1
fi

# 4. Source the new file
if [ -f "$HOME/.bashrc_local" ]; then
  source "$HOME/.bashrc_local"
  echo "✅ Sourced ~/.bashrc_local"
fi

# 5. Verify aliases
echo ""
echo "🔍 Checking aliases:"
alias | grep -E 'ydev|agw|ll|gs' || echo "⚠️  No aliases found (check file manually)"

echo ""
echo "✅ Done! Your ~/.bashrc_local has been fixed."
echo "   Backup location: $BACKUP"
echo "   To restore backup: cp -v $BACKUP ~/.bashrc_local && source ~/.bashrc_local"
