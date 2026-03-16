#!/bin/bash
# Setup daily report schedule using macOS launchd
# Generates both EN and ZH reports at 8:00 AM daily

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_NAME="com.defi-radar.daily-report.plist"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"
NODE_PATH="$(which node)"
CLI_PATH="$(cd "$SCRIPT_DIR/.." && pwd)/dist/cli.js"

if [ ! -f "$PLIST_SRC" ]; then
  echo "Error: $PLIST_SRC not found"
  exit 1
fi

# Build first
echo "Building project..."
(cd "$SCRIPT_DIR/.." && npm run build)

# Update paths in plist
sed -e "s|/usr/local/bin/node|$NODE_PATH|" \
    -e "s|/Users/dylan/dev/side/defi-radar/dist/cli.js|$CLI_PATH|" \
    "$PLIST_SRC" > "$PLIST_DST"

# Unload if already loaded
launchctl unload "$PLIST_DST" 2>/dev/null || true

# Load the agent
launchctl load "$PLIST_DST"

echo "Daily report scheduled!"
echo "  Schedule: 8:00 AM daily"
echo "  Reports:  ~/.defi-radar/reports/"
echo "  Logs:     /tmp/defi-radar-report.log"
echo ""
echo "To uninstall: launchctl unload $PLIST_DST && rm $PLIST_DST"
echo "To test now:  node $CLI_PATH report --both"
