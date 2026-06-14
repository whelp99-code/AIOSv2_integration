#!/bin/bash
set -e
PORT=${1:-8080}
PHASE=${2:-capture}

echo "[sangfor-capture] phase: $PHASE"
echo "[sangfor-capture] mitmproxy port: $PORT"
echo "[sangfor-capture] targets: 10.80.1.106(EPP) / 10.80.1.108(IAG) / 10.80.1.107(CC)"
echo ""

if [ "$PHASE" = "capture" ]; then
  HAR="/Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/traffic.har"
  echo "[sangfor-capture] starting mitmweb on :$PORT"
  echo "[sangfor-capture] HAR -> $HAR"
  echo "[sangfor-capture] press Ctrl+C when done capturing"
  /Users/jmpark/Library/Python/3.9/bin/mitmweb \
    --listen-port "$PORT" \
    --set hardump="$HAR" \
    --set flow_detail=3 \
    --set console_eventlog_verbosity=info
elif [ "$PHASE" = "convert" ]; then
  HAR="/Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/traffic.har"
  OUT="/Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/openapi.yaml"
  echo "[sangfor-capture] converting HAR -> OpenAPI ..."
  python3 - << 'PYBLOCK'
import json, os
har_path = "/Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/traffic.har"
if not os.path.exists(har_path):
    raise SystemExit("ERROR: HAR not found at " + har_path)
d = json.load(open(har_path))
hosts = sorted({
    e["request"]["url"].split("/")[2]
    for e in d.get("log", {}).get("entries", [])
})
targets = [h for h in hosts if "10.80.1" in h or "sangfor" in h.lower()]
print("Sangfor targets:", targets if targets else "(none)")
if not targets:
    raise SystemExit(1)
open("/Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/.hosts", "w").write("\n".join(targets))
PYBLOCK
  if [ ! -f "/Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/.hosts" ]; then
    echo "ERROR: no Sangfor traffic found"
    exit 1
  fi
  mapfile -t HOSTS < /Users/jmpark/Documents/Playground/AIOSv2_integration/.sangfor-capture/.hosts
  for HOST in "${HOSTS[@]}"; do
    echo "[sangfor-capture] converting $HOST ..."
    /Users/jmpark/Library/Python/3.9/bin/mitmproxy2swagger \
      -i "$HAR" -o "$OUT" \
      -p "https://$HOST" --examples 2>&1 || true
    COUNT=$(python3 -c "import yaml; d=yaml.safe_load(open('$OUT')); print(len(d.get('paths',{}) if d else {}))" 2>/dev/null || echo "?")
    echo "[sangfor-capture] endpoints in $HOST: $COUNT"
  done
  echo "[sangfor-capture] DONE -> $OUT"
else
  echo "Usage: $0 [capture|convert] [port]"
fi