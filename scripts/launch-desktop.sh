#!/usr/bin/env bash
# Launch Client Craft as a desktop-style app on your Mac (no App Store, no $99 fee).
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PID_FILE="$ROOT/.client-craft-dev.pid"
WEB_URL="http://127.0.0.1:5173"

port_in_use() {
  lsof -i ":$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

app_healthy() {
  curl -sf --connect-timeout 2 "$WEB_URL" >/dev/null 2>&1
}

stop_stale_servers() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  for PORT in 5173 3001; do
    PIDS=$(lsof -ti ":$PORT" -sTCP:LISTEN 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
      echo "Stopping stale process on port $PORT…"
      kill $PIDS 2>/dev/null || true
    fi
  done
  sleep 1
}

start_servers() {
  echo "Starting Client Craft (web + PayPal API)…"
  nohup npm run dev > "$ROOT/.client-craft.log" 2>&1 &
  echo $! > "$PID_FILE"
  echo "Waiting for servers…"
  for i in {1..40}; do
    if app_healthy; then
      echo "Running at $WEB_URL"
      return 0
    fi
    sleep 0.5
  done
  echo "Could not start. Check .client-craft.log"
  tail -20 "$ROOT/.client-craft.log" 2>/dev/null || true
  exit 1
}

if app_healthy; then
  echo "Client Craft is already running."
  echo "Opening app window → $WEB_URL"
elif port_in_use 5173 || port_in_use 3001; then
  echo "Ports are in use but the app is not responding — restarting…"
  stop_stale_servers
  start_servers
else
  start_servers
fi

# Prefer Chrome app window (looks like a real app, no browser tabs)
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$WEB_URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$WEB_URL"
elif [ -d "/Applications/Brave Browser.app" ]; then
  open -na "Brave Browser" --args --app="$WEB_URL"
else
  echo "Opening in your default browser."
  open "$WEB_URL"
  echo ""
  echo "Tip: In Safari, open the site → File → Add to Dock…"
fi

echo ""
echo "To keep in Dock: while the app window is open, right-click its Dock icon → Options → Keep in Dock"
echo "To stop servers later: npm run desktop:stop"
