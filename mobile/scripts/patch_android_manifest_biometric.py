#!/usr/bin/env python3
"""Idempotent: add USE_BIOMETRIC to AndroidManifest.xml."""
from pathlib import Path

manifest = Path(__file__).resolve().parent.parent / "android/app/src/main/AndroidManifest.xml"
text = manifest.read_text(encoding="utf-8")
if "USE_BIOMETRIC" in text:
    raise SystemExit(0)

needle = '    <uses-permission android:name="android.permission.INTERNET" />'
if needle not in text:
    raise SystemExit("INTERNET permission not found in AndroidManifest.xml")

manifest.write_text(
    text.replace(
        needle,
        needle + '\n    <uses-permission android:name="android.permission.USE_BIOMETRIC" />',
        1,
    ),
    encoding="utf-8",
)
