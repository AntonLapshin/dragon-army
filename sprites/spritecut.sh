#!/usr/bin/env bash
# spritecut - zero-install launcher (chmod +x spritecut.sh && ./spritecut.sh --help)
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PYTHONPATH="$here${PYTHONPATH:+:$PYTHONPATH}"
exec python3 -m spritecut.cli "$@"