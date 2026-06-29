#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ANDROID_DIR="${ROOT}/mobile/android"
LOCAL_PROPS="${ANDROID_DIR}/local.properties"
APK="${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"
VERSION_JSON="${ROOT}/mobile/version.json"
FRONTEND_PKG="${ROOT}/frontend/package.json"
DOWNLOADS_DIR="${ROOT}/backend/public/downloads"

AUTO_YES=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -i) AUTO_YES=true; shift ;;
        -h|--help)
            cat <<'EOF'
Usage: mobile/scripts/build-apk.sh [-i]

  -i    Skopiuj APK do backend/public/downloads/ bez pytania
EOF
            exit 0
            ;;
        *) printf 'ERROR: Nieznana opcja: %s\n' "$1" >&2; exit 1 ;;
    esac
done

# shellcheck source=/dev/null
[[ -f "${ROOT}/mobile/build.env" ]] && source "${ROOT}/mobile/build.env"

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

read_mobile_version() {
    [[ -f "${VERSION_JSON}" ]] || fail "Brak ${VERSION_JSON}"
    python3 - "${VERSION_JSON}" "${FRONTEND_PKG}" <<'PY'
import json
import sys
from pathlib import Path

version_path = Path(sys.argv[1])
frontend_pkg = Path(sys.argv[2])

data = json.loads(version_path.read_text(encoding="utf-8"))
version_name = str(data["versionName"])
version_code = int(data["versionCode"])
min_raw = data.get("minVersionCode")
min_version = int(min_raw) if min_raw is not None else None

if frontend_pkg.is_file():
    fe_version = json.loads(frontend_pkg.read_text(encoding="utf-8")).get("version")
    if fe_version and fe_version != version_name:
        print(
            f"WARN: versionName {version_name} != frontend/package.json {fe_version}",
            file=sys.stderr,
        )

print(version_name)
print(version_code)
print("" if min_version is None else min_version)
PY
}

copy_apk_to_downloads() {
    local version_name="$1"
    local version_code="$2"
    local min_version="$3"

    mkdir -p "${DOWNLOADS_DIR}"

    local versioned_name="samfin-${version_name}.apk"
    cp -f "${APK}" "${DOWNLOADS_DIR}/${versioned_name}"
    cp -f "${APK}" "${DOWNLOADS_DIR}/samfin.apk"

    local published_at
    published_at="$(date -Iseconds)"

    VERSION_NAME="${version_name}" \
    VERSION_CODE="${version_code}" \
    MIN_VERSION="${min_version}" \
    VERSIONED_FILE="${versioned_name}" \
    PUBLISHED_AT="${published_at}" \
    OUTPUT="${DOWNLOADS_DIR}/mobile.json" \
    python3 - <<'PY'
import json
import os

min_raw = os.environ.get("MIN_VERSION", "")
manifest = {
    "versionName": os.environ["VERSION_NAME"],
    "versionCode": int(os.environ["VERSION_CODE"]),
    "minVersionCode": int(min_raw) if min_raw else None,
    "apkUrl": f"/downloads/{os.environ['VERSIONED_FILE']}",
    "latestApkUrl": "/downloads/samfin.apk",
    "publishedAt": os.environ["PUBLISHED_AT"],
}

out = os.environ["OUTPUT"]
with open(out, "w", encoding="utf-8") as fh:
    json.dump(manifest, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
PY

    printf '\n✓ Skopiowano do downloads:\n'
    printf '  %s/%s\n' "${DOWNLOADS_DIR}" "${versioned_name}"
    printf '  %s/samfin.apk\n' "${DOWNLOADS_DIR}"
    printf '  %s/mobile.json\n' "${DOWNLOADS_DIR}"
    printf '\nPo deploy: https://fin.samsoft.pl/downloads/mobile.json\n'
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

mapfile -t VERSION_FIELDS < <(read_mobile_version)
VERSION_NAME="${VERSION_FIELDS[0]}"
VERSION_CODE="${VERSION_FIELDS[1]}"
MIN_VERSION_CODE="${VERSION_FIELDS[2]:-}"

JAVA21_HOME="$(find_java21_home)" || fail \
    "Wymagane JDK 21 (Capacitor 7). Zainstaluj: sudo apt install openjdk-21-jdk"

export JAVA_HOME="${JAVA21_HOME}"
export PATH="${JAVA_HOME}/bin:${PATH}"

printf '==> Java: '
java -version 2>&1 | head -1
printf '==> Mobile version: %s (code %s)\n' "${VERSION_NAME}" "${VERSION_CODE}"

ensure_local_properties

[[ -d "${ANDROID_DIR}" ]] || fail "Brak katalogu ${ANDROID_DIR} — uruchom: make mobile-setup-android"

cd "${ANDROID_DIR}"
chmod +x gradlew

printf '==> Gradle assembleDebug...\n'
./gradlew assembleDebug -PappVersionCode="${VERSION_CODE}" -PappVersionName="${VERSION_NAME}"

[[ -f "${APK}" ]] || fail "Nie znaleziono APK po buildzie: ${APK}"

printf '\n✓ APK gotowy:\n  %s\n' "${APK}"

should_copy=false
if [[ "${AUTO_YES}" == true ]]; then
    should_copy=true
else
    printf '\n'
    read -r -p "Skopiować APK do backend/public/downloads/? [y/N] " copy_answer
    if [[ "${copy_answer}" == "y" || "${copy_answer}" == "Y" ]]; then
        should_copy=true
    fi
fi

if [[ "${should_copy}" == true ]]; then
    copy_apk_to_downloads "${VERSION_NAME}" "${VERSION_CODE}" "${MIN_VERSION_CODE}"
else
    printf '\nPominięto kopiowanie do downloads.\n'
    printf 'Instalacja USB: make mobile-copy-apk && make mobile-install-apk\n'
fi
