#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APK="${ROOT}/mobile/android/app/build/outputs/apk/debug/app-debug.apk"

# shellcheck source=/dev/null
[[ -f "${ROOT}/mobile/build.env" ]] && source "${ROOT}/mobile/build.env"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

find_windows_downloads() {
  if [[ -n "${MOBILE_WIN_DOWNLOADS:-}" ]]; then
    printf '%s\n' "${MOBILE_WIN_DOWNLOADS}"
    return 0
  fi
  local dir
  for dir in /mnt/c/Users/*/Downloads; do
    if [[ -d "${dir}" ]]; then
      printf '%s\n' "${dir}"
      return 0
    fi
  done
  return 1
}

[[ -f "${APK}" ]] || fail "Brak APK — najpierw: make mobile-build-apk"

DEST_DIR="$(find_windows_downloads)" || fail \
  "Nie znaleziono Pobranych Windows. Ustaw MOBILE_WIN_DOWNLOADS w mobile/build.env"

DEST="${DEST_DIR}/app-debug.apk"
cp -f "${APK}" "${DEST}"

printf '✓ Skopiowano APK:\n  %s\n' "${DEST}"
printf '\nPowerShell:\n  adb install -r %s\n' "$(echo "${DEST}" | sed 's|/mnt/c/|C:\\|' | sed 's|/|\\|g')"
