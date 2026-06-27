#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${HOME}/.nvm"
# shellcheck source=/dev/null
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"

nvm use 20

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}/mobile"

if [[ ! -d android ]]; then
  npx cap add android
fi

npx cap sync android

echo ""
echo "✓ Platforma Android gotowa (mobile/android/)."
echo "  Następny krok: otwórz projekt w Android Studio na Windows — patrz mobile/README.md"
