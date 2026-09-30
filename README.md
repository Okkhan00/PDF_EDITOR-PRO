# PdfEdit Pro — Android (Capacitor)

PdfEdit Pro V1.3 wrapped, unchanged, as an offline Android app.
`www/index.html` is the original editor; the only edits are:

| Change | Why |
|---|---|
| CDN `<script>`/font links → `vendor/...` | Works offline |
| `pdfjsLib.GlobalWorkerOptions.workerSrc` → local worker | Offline PDF rendering |
| `Tesseract.recognize(..., {workerPath, corePath, langPath})` | Offline OCR (English) |
| `<script src="android-bridge.js">` added at the end | Native share/save, Back button, print fallback |

`www/android-bridge.js` does nothing in a normal browser.

## Get the APK (no Android Studio needed)
1. Push this folder to a GitHub repo (branch `main`).
2. **Actions → Android APK Build** runs automatically (or press *Run workflow*).
3. Download **PdfEdit-Pro-Android-APK** from the run's *Artifacts* → unzip → `app-debug.apk` → install.

Tick *create_release* when running manually to also publish a GitHub Release.

## Local commands
```bash
npm install
npm run build            # copies libs/fonts/OCR data into www/vendor
npx cap sync android
cd android && ./gradlew assembleDebug
```
Requires Node 20+, JDK 21. Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Signed release (optional, later)
Add repo secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`, then run the workflow manually with *build_signed_release* ticked.

## Behaviour on Android
- **Export/Download** (PDF, PNG, ZIP, split/extract/merge): file is written to app cache and the Android share sheet opens (Files, Drive, WhatsApp, Gmail…). Several files produced at once share one sheet.
- **Print**: `window.print()` doesn't exist in WebView, so Print exports the PDF to the share sheet instead (choose a print service from there). Print page-range/copies options are ignored.
- **Back button**: closes modal → advanced popover → tools sheet → sidebar drawer → search bar → crop mode; with a PDF open, needs a second press within 2 s to exit. Exports in progress can't be dismissed.
- **OCR**: English only (bundled). Other languages would need extra `.traineddata.gz` files in `www/vendor/tesseract/lang/`.
- **Fonts**: Latin subset of Inter, Roboto, Open Sans, Lato, Poppins, Montserrat.

## Regenerating icons/splash
`python3 scripts/make-assets.py` (needs Pillow).

## Privacy
No backend, analytics, ads or network calls. The `INTERNET` permission is Capacitor's default and is only used for the local `https://localhost` WebView origin.
