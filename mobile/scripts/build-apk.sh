#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ANDROID_DIR="${ROOT}/mobile/android"
LOCAL_PROPS="${ANDROID_DIR}/local.properties"
APK="${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"

# shellcheck source=/dev/null
[[ -f "${ROOT}/mobile/build.env" ]] && source "${ROOT}/mobile/build.env"

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

find_java21_home() {
  if [[ -n "${JAVA_HOME:-}" ]] && [[ -x "${JAVA_HOME}/bin/java" ]]; then
    if "${JAVA_HOME}/bin/java" -version 2>&1 | grep -q '"21'; then
      printf '%s\n' "${JAVA_HOME}"
      return 0
    fi
  fi
  local candidate
  for candidate in \
    /usr/lib/jvm/java-21-openjdk-amd64 \
    /usr/lib/jvm/java-21-openjdk; do
    if [[ -d "${candidate}" && -x "${candidate}/bin/java" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

find_android_sdk() {
  if [[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME}" ]]; then
    printf '%s\n' "${ANDROID_HOME}"
    return 0
  fi
  if [[ -d "${HOME}/Android" ]]; then
    printf '%s\n' "${HOME}/Android"
    return 0
  fi
  local sdk
  for sdk in /mnt/c/Users/*/AppData/Local/Android/Sdk; do
    if [[ -d "${sdk}" ]]; then
      printf '%s\n' "${sdk}"
      return 0
    fi
  done
  return 1
}

ensure_local_properties() {
  if [[ -f "${LOCAL_PROPS}" ]]; then
    return 0
  fi
  local sdk_dir
  sdk_dir="$(find_android_sdk)" || fail \
    "Brak Android SDK. Ustaw ANDROID_HOME lub utwórz ${LOCAL_PROPS} z sdk.dir=..."
  printf 'sdk.dir=%s\n' "${sdk_dir}" > "${LOCAL_PROPS}"
  printf '==> Utworzono %s (sdk.dir=%s)\n' "${LOCAL_PROPS}" "${sdk_dir}"
}

JAVA21_HOME="$(find_java21_home)" || fail \
  "Wymagane JDK 21 (Capacitor 7). Zainstaluj: sudo apt install openjdk-21-jdk"

export JAVA_HOME="${JAVA21_HOME}"
export PATH="${JAVA_HOME}/bin:${PATH}"

printf '==> Java: '
java -version 2>&1 | head -1

ensure_local_properties

[[ -d "${ANDROID_DIR}" ]] || fail "Brak katalogu ${ANDROID_DIR} — uruchom: make mobile-setup-android"

cd "${ANDROID_DIR}"
chmod +x gradlew

printf '==> Gradle assembleDebug...\n'
./gradlew assembleDebug

[[ -f "${APK}" ]] || fail "Nie znaleziono APK po buildzie: ${APK}"

printf '\n✓ APK gotowy:\n  %s\n' "${APK}"
printf '\nInstalacja na telefonie (PowerShell, USB):\n'
printf '  adb install -r <skopiowany-apk>\n'
printf 'lub z WSL:\n'
printf '  make mobile-copy-apk\n'
printf '  make mobile-install-apk\n'
