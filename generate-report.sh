#!/bin/bash
# ──────────────────────────────────────────────────
# Snaffalyzer Static Report Generator
# Generates a self-contained, encrypted HTML report
# from a Snaffler log file.
#
# Usage:
#   ./generate-report.sh <logfile> [output.html]
#   ./generate-report.sh --no-encrypt <logfile> [output.html]
# ──────────────────────────────────────────────────

set -euo pipefail

ENCRYPT=true
if [ "${1:-}" = "--no-encrypt" ]; then
  ENCRYPT=false
  shift
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 [--no-encrypt] <snaffler-log-file> [output.html]"
  echo ""
  echo "Generates a self-contained Snaffalyzer report."
  echo "The output file can be opened in any browser — no internet or tools required."
  echo ""
  echo "Options:"
  echo "  --no-encrypt  Skip encryption (report is viewable without a password)"
  echo ""
  echo "Security: AES-256-GCM with PBKDF2-SHA256 (600,000 rounds)"
  exit 1
fi

LOGFILE="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/public/report-template.html"

if [ ! -f "$LOGFILE" ]; then
  echo "Error: Log file not found: $LOGFILE"
  exit 1
fi

if [ ! -f "$TEMPLATE" ]; then
  echo "Error: Template not found: $TEMPLATE"
  echo "Make sure public/report-template.html exists."
  exit 1
fi

BASENAME=$(basename "$LOGFILE" | sed 's/\.[^.]*$//')
OUTPUT="${2:-${BASENAME}-report.html}"

echo "Snaffalyzer Report Generator"
echo "----------------------------"
echo "  Input:  $LOGFILE ($(wc -l < "$LOGFILE" | tr -d ' ') lines)"
echo "  Output: $OUTPUT"

PASSWORD=""
if [ "$ENCRYPT" = true ]; then
  echo ""
  echo -n "  Password: "
  read -s PASSWORD
  echo ""
  if [ -z "$PASSWORD" ]; then
    echo "Error: Password cannot be empty."
    exit 1
  fi
  echo -n "  Confirm:  "
  read -s PASSWORD2
  echo ""
  if [ "$PASSWORD" != "$PASSWORD2" ]; then
    echo "Error: Passwords do not match."
    exit 1
  fi
  echo "  Encrypt:  AES-256-GCM / PBKDF2-SHA256 / 600k rounds"
else
  echo "  Encrypt:  disabled"
fi
echo ""

PYSCRIPT=$(mktemp /tmp/snaffalyzer-gen.XXXXXX.py)
trap "rm -f $PYSCRIPT" EXIT

cat > "$PYSCRIPT" << 'PYEOF'
import sys, json, os, hashlib, base64, secrets

template_path = sys.argv[1]
log_path = sys.argv[2]
output_path = sys.argv[3]
encrypt = sys.argv[4] == 'true'
password = sys.argv[5] if len(sys.argv) > 5 else ''

with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
    log_data = f.read()

log_filename = os.path.basename(log_path)

if encrypt:
    # PBKDF2-SHA256, 600k rounds -> 256-bit key
    salt = secrets.token_bytes(32)
    iv = secrets.token_bytes(12)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 600000, dklen=32)

    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    aesgcm = AESGCM(dk)
    plaintext = json.dumps({'log': log_data, 'filename': log_filename}).encode('utf-8')
    ciphertext = aesgcm.encrypt(iv, plaintext, None)

    enc_payload = json.dumps({
        'salt': base64.b64encode(salt).decode(),
        'iv': base64.b64encode(iv).decode(),
        'ct': base64.b64encode(ciphertext).decode(),
    })

    # Base64-encode the encrypted payload JSON (safe for data attributes)
    b64_payload = base64.b64encode(enc_payload.encode('utf-8')).decode()
    mode = 'encrypted'
else:
    # Base64-encode the log data JSON (safe for data attributes)
    data_json = json.dumps({'log': log_data, 'filename': log_filename})
    b64_payload = base64.b64encode(data_json.encode('utf-8')).decode()
    mode = 'plain'

# Just fill in the data attributes — no HTML/script injection
output = template.replace('data-payload=""', f'data-payload="{b64_payload}"')
output = output.replace('data-mode=""', f'data-mode="{mode}"')

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(output)

size_kb = len(output.encode('utf-8')) // 1024
print(f'  Generated: {output_path} ({size_kb} KB, {mode})')
PYEOF

python3 "$PYSCRIPT" "$TEMPLATE" "$LOGFILE" "$OUTPUT" "$ENCRYPT" "$PASSWORD"

echo ""
echo "Done. Open $OUTPUT in any browser to view the report."
