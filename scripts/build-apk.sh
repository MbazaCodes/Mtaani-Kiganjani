#!/bin/bash
# Build E-Serikali Mtaa Android APK
# Requirements: Node.js 20+, Android Studio with SDK 35, Java 17
set -e

echo "🇹🇿 E-Serikali Mtaa — Android Build Script"
echo "=========================================="

# Step 1: Build web assets
echo ""
echo "📦 Step 1: Building web assets with Vite..."
npm run build

# Step 2: Sync to Capacitor Android
echo ""
echo "📱 Step 2: Syncing to Capacitor Android..."
npx cap sync android

# Step 3: Build APK
echo ""
echo "🔨 Step 3: Building APK..."
cd android
./gradlew assembleDebug

# Step 4: Output
echo ""
echo "✅ Build complete!"
echo "📁 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "To install on a connected device:"
echo "  adb install app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "To build a release APK (signed):"
echo "  ./gradlew assembleRelease"
