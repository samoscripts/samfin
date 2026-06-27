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

find_adb() {
  if [[ -n "${ADB_WIN:-}" && -x "${ADB_WIN}" ]]; then
    printf '%s\n' "${ADB_WIN}"
    return 0
  fi
  local adb
  for adb in \
    /mnt/c/Users/*/AppData/Local/Android/Sdk/platform-tools/adb.exe \
    /mnt/c/Users/*/platform-tools/adb.exe; do
    if [[ -x "${adb}" ]]; then
      printf '%s\n' "${adb}"
      return 0
    fi
  done
  return 1
}

[[ -f "${APK}" ]] || fail "Brak APK — najpierw: make mobile-build-apk"

ADB="$(find_adb)" || fail \
  "Nie znaleziono adb.exe. Zainstaluj platform-tools lub ustaw ADB_WIN w mobile/build.env"

printf '==> adb: %s\n' "${ADB}"
printf '==> Podłączone urządzenia:\n'
"${ADB}" devices

printf '\n==> Instalacja APK...\n'
"${ADB}" install -r "${APK}"

printf '\n✓ Zainstalowano. Uruchom aplikację SamFin na telefonie.\n'
