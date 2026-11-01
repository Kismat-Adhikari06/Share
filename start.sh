#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)..."
  npm install
fi

echo "Building the app..."
npm run build

echo "Starting ShareIdeas on port 3000..."
PORT=3000 node server.js &
APP_PID=$!

cleanup() {
  kill "$APP_PID" 2>/dev/null || true
  if [ -n "${NGROK_PID:-}" ]; then kill "$NGROK_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 40); do
  if curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then break; fi
  sleep 0.25
done

echo "Opening a public tunnel with ngrok..."
ngrok http 3000 --log=stdout >/tmp/shareideas-ngrok.log 2>&1 &
NGROK_PID=$!

PUBLIC_URL=""
for _ in $(seq 1 60); do
  PUBLIC_URL=$(curl -sf http://127.0.0.1:4040/api/tunnels 2>/dev/null | node -e '
    let raw = ""
    process.stdin.on("data", (chunk) => (raw += chunk))
    process.stdin.on("end", () => {
      try {
        const tunnels = JSON.parse(raw).tunnels || []
        const https = tunnels.find((t) => t.proto === "https") || tunnels[0]
        if (https) process.stdout.write(https.public_url)
      } catch {}
    })
  ' || true)
  if [ -n "$PUBLIC_URL" ]; then break; fi
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    echo
    echo "ngrok stopped. Last log lines:"
    tail -n 12 /tmp/shareideas-ngrok.log || true
    echo
    echo "If it mentions an authtoken, run: ngrok config add-authtoken <your-token>"
    exit 1
  fi
  sleep 0.5
done

if [ -z "$PUBLIC_URL" ]; then
  echo "Could not read the ngrok URL. Check /tmp/shareideas-ngrok.log"
  exit 1
fi

cat <<MSG

  ShareIdeas is live.

  Local:   http://localhost:3000
  Public:  $PUBLIC_URL

  Open the public link on any device. Everyone with it sees the same notes.
  Press Ctrl+C to stop.

MSG

wait "$NGROK_PID"
