# PDF EDIT PRO

A modern Android PDF editor built with Capacitor, designed for practical PDF viewing, editing, annotation, export, and printing.

**Powered by AZI CREATIONS**

## 🚀 Download Latest Android APK

**Direct latest APK download:**

https://github.com/Okkhan00/PDF_EDITOR-PRO/releases/latest/download/app-debug.apk

**Latest Releases:**

https://github.com/Okkhan00/PDF_EDITOR-PRO/releases/latest

> The direct download always points to the APK attached to the latest GitHub Release. No need to search through old releases.

## ✨ Features

- 📄 Open and view PDF files
- ✏️ Edit PDF text
- 🔎 Find & Replace
- 🖼️ Add and edit images
- ✍️ Draw and upload signatures
- 💾 Save reusable signatures
- 💧 Add watermarks
- ✂️ Crop and rotate pages
- 📑 Organize PDF pages
- 🔀 Merge PDF files
- ✂️ Split and extract pages
- 🔍 OCR support
- 🖨️ Print PDF documents
- 📤 Export PDF
- 🖼️ Export pages as PNG
- 📦 Export as ZIP
- ↩️ Undo / Redo
- 🌙 Dark mode
- 💾 Draft autosave
- 🏠 Home screen
- 🕘 Recent Files
- 📱 Android touch-friendly workflow
- 🔍 Mobile pinch zoom and panning
- 🎯 Accurate watermark/image/signature export positioning

## 📱 Android

The Android application is built with:

- Capacitor
- Android
- Java / Gradle
- GitHub Actions

The web editor is packaged into a native Android application without requiring Android Studio for the normal GitHub Actions build workflow.

## 🛠️ Build Locally

Install dependencies:

```bash
npm ci
```

Build the web application:

```bash
npm run build
```

Sync Capacitor:

```bash
npx cap sync android
```

Build the Android debug APK:

```bash
cd android
./gradlew assembleDebug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 🤖 GitHub Actions

The repository automatically builds the Android APK when changes are pushed to the `main` branch.

The workflow:

1. Checks out the repository
2. Installs Node.js
3. Installs Java 21
4. Verifies and installs Android SDK packages
5. Installs npm dependencies
6. Builds the web application
7. Syncs Capacitor
8. Builds the Android debug APK
9. Uploads the APK as a GitHub Actions artifact
10. Creates a GitHub Release
11. Attaches the APK to the Release

A manual build can also be started from:

**GitHub → Actions → Android APK Build → Run workflow**

## 📥 Direct APK URL

The stable latest-download URL is:

```text
https://github.com/Okkhan00/PDF_EDITOR-PRO/releases/latest/download/app-debug.apk
```

This URL is intentionally independent of the version number. When a new GitHub Release becomes the latest release, the same URL automatically points to the newest APK.

## 🔐 Signed Release APK

The workflow also supports an optional signed release build.

Signed builds require these GitHub Actions secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

When the signing secrets are configured, the manual workflow can build the signed release APK.

## 🧪 Quality Checks

The project includes tests for important PDF coordinate and export behavior, including:

- PDF coordinate conversion
- Watermark export positioning
- Image/signature export positioning
- Zoom and pan behavior

The goal is to keep editor coordinates stable while the user zooms, pans, edits, and exports documents.

## 📂 Project Structure

```text
PDF_EDITOR-PRO/
├── android/                  # Capacitor Android project
├── www/                      # PDF editor web application
├── tests/                    # PDF/editor tests
├── scripts/                  # Project scripts
├── .github/
│   └── workflows/
│       └── Android.yml       # Android APK build + release workflow
├── package.json
└── capacitor.config.ts
```

## 🔄 Release Flow

```text
Push to main
     ↓
GitHub Actions
     ↓
Build Web App
     ↓
Capacitor Sync
     ↓
Build Android APK
     ↓
Create GitHub Release
     ↓
Upload app-debug.apk
     ↓
Latest APK URL updated automatically
```

## ⚠️ Notes

- The direct latest APK link points to the debug APK produced by the automatic workflow.
- A signed release APK requires the Android keystore secrets described above.
- Do not commit private keystores, passwords, or signing credentials to the repository.
- Keep existing working editor functionality intact when making future changes.
- Test PDF editing, export, printing, zoom/pan, and Android behavior after major changes.

## 👨‍💻 Project

**PDF EDIT PRO**

**Powered by AZI CREATIONS**
