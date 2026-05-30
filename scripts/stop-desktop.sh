#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT/.client-craft-dev.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    echo "Stopped Client Craft (pid $PID)."
  fi
  rm -f "$PID_FILE"
fi

# Also free ports if something is still listening
for PORT in 5173 3001; do
  PIDS=$(lsof -ti ":$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Stopping process on port $PORT…"
    kill $PIDS 2>/dev/null || true
  fi
done

echo "Done."
