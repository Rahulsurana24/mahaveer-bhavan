# APK Build Guide - Mahaveer Bhavan Apps

Complete guide to building production-ready APK files for both Member and Admin apps.

---

## ⚠️ Prerequisites

### Required Software
- **Node.js**: v18 or higher
- **Java JDK**: 11 or 17 (required by React Native 0.73)
- **Android Studio**: Latest version with Android SDK
- **React Native CLI**: `npm install -g react-native-cli`

### Verify Installation
```bash
# Check Node version
node --version  # Should be v18+

# Check Java version
java -version   # Should be 11 or 17

# Check Android SDK
echo $ANDROID_HOME  # Should point to Android SDK directory
```

---

## 📱 Setup Instructions

### 1. Install Android Studio

1. Download from: https://developer.android.com/studio
2. Install Android SDK (API Level 33+)
3. Set environment variables:

**For Mac/Linux** (add to `.bashrc` or `.zshrc`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**For Windows** (add to System Environment Variables):
```
ANDROID_HOME=C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
PATH=%PATH%;%ANDROID_HOME%\platform-tools
```

### 2. Install Dependencies

```bash
cd /path/to/mahaveer-bhavan

# Member App
cd member-app
npm install

# Admin App
cd ../admin-app
npm install
```

### 3. Generate Signing Key

**Production builds MUST be signed**. Generate a signing key:

```bash
cd member-app/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore mahaveer-release.keystore -alias mahaveer-key -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (SAVE THIS!)
# - Key password (can be same as keystore)
# - Your name, organization, location, etc.
```

**⚠️ IMPORTANT**:
- Save the keystore file (`mahaveer-release.keystore`)
- Save the passwords securely
- **NEVER commit the keystore to git**
- **NEVER share the keystore publicly**
- Losing this keystore means you can't update your app on Play Store!

---

## 🏗️ Building the APK

### Member App

#### Step 1: Configure Signing

Create/edit `member-app/android/gradle.properties`:

```properties
MAHAVEER_RELEASE_STORE_FILE=mahaveer-release.keystore
MAHAVEER_RELEASE_KEY_ALIAS=mahaveer-key
MAHAVEER_RELEASE_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
MAHAVEER_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

#### Step 2: Update `build.gradle`

Edit `member-app/android/app/build.gradle`:

```gradle
android {
    ...

    signingConfigs {
        release {
            if (project.hasProperty('MAHAVEER_RELEASE_STORE_FILE')) {
                storeFile file(MAHAVEER_RELEASE_STORE_FILE)
                storePassword MAHAVEER_RELEASE_STORE_PASSWORD
                keyAlias MAHAVEER_RELEASE_KEY_ALIAS
                keyPassword MAHAVEER_RELEASE_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Step 3: Build the APK

```bash
cd member-app/android
./gradlew assembleRelease

# Or for bundle (for Play Store):
./gradlew bundleRelease
```

**Output location**:
- APK: `member-app/android/app/build/outputs/apk/release/app-release.apk`
- Bundle: `member-app/android/app/build/outputs/bundle/release/app-release.aab`

### Admin App

Follow the same steps as Member App but in the `admin-app` directory.

```bash
cd admin-app/android
./gradlew assembleRelease
```

**Output**: `admin-app/android/app/build/outputs/apk/release/app-release.apk`

---

## 🧪 Testing the APK

### Install on Physical Device

```bash
# Enable USB debugging on your Android device
# Connect device via USB

# Install the APK
adb install member-app/android/app/build/outputs/apk/release/app-release.apk

# If app already installed:
adb install -r member-app/android/app/build/outputs/apk/release/app-release.apk
```

### Testing Checklist

- [ ] App launches successfully
- [ ] Login works
- [ ] Registration works
- [ ] All screens accessible
- [ ] Images load correctly
- [ ] QR code generates
- [ ] Push notifications work (if enabled)
- [ ] App doesn't crash
- [ ] Performance is smooth

---

## 🚀 Advanced Build Options

### Build Variants

React Native supports multiple build variants:

```bash
# Debug APK (larger, slower, includes debugging tools)
./gradlew assembleDebug

# Release APK (optimized, signed, ready for distribution)
./gradlew assembleRelease
```

### Reduce APK Size

1. **Enable ProGuard** (already configured in release builds)

2. **Enable separate APKs per architecture**:

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk true
        }
    }
}
```

This creates multiple APKs:
- `app-armeabi-v7a-release.apk` (for older devices)
- `app-arm64-v8a-release.apk` (for modern 64-bit devices)
- `app-x86-release.apk` (for emulators)
- `app-universal-release.apk` (for all architectures - use this for testing)

3. **Remove unused resources**:

```gradle
android {
    ...
    buildTypes {
        release {
            shrinkResources true
            minifyEnabled true
        }
    }
}
```

---

## 📦 Google Play Store Deployment

### Step 1: Create App Bundle (AAB)

Google Play requires AAB format (not APK):

```bash
cd member-app/android
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### Step 2: Prepare Play Store Listing

Required assets:
- **App icon**: 512x512 PNG
- **Feature graphic**: 1024x500 PNG
- **Screenshots**: At least 2 (phone), 1920x1080 recommended
- **Privacy policy URL**
- **App description** (4000 char limit)
- **Short description** (80 char limit)

### Step 3: Upload to Play Console

1. Go to: https://play.google.com/console
2. Create new app
3. Complete store listing
4. Upload AAB file
5. Complete content rating questionnaire
6. Set pricing (Free or Paid)
7. Submit for review

**Review time**: Usually 1-7 days

---

## 🔧 Troubleshooting

### Build Fails: "SDK location not found"

**Solution**: Create `android/local.properties`:

```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### Build Fails: "Java version mismatch"

**Solution**: Use Java 11 or 17

```bash
# Check current Java version
java -version

# Switch to Java 11 (if using multiple versions)
export JAVA_HOME=$(/usr/libexec/java_home -v 11)
```

### APK Install Fails: "App not installed"

**Solutions**:
1. Uninstall previous version first
2. Enable "Install from unknown sources" in Android settings
3. Check if device has enough storage
4. Verify APK is properly signed

### App Crashes on Launch

**Debug steps**:
```bash
# View crash logs
adb logcat | grep -i "error\|exception\|fatal"

# Clear app data and try again
adb shell pm clear com.mahaverbhavan.member
```

**Common causes**:
- Missing environment variables (.env file)
- Supabase credentials incorrect
- Network permissions missing in AndroidManifest.xml

### Build is Too Slow

**Speed up builds**:

Edit `android/gradle.properties`:

```properties
# Increase memory
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

# Enable Gradle daemon
org.gradle.daemon=true

# Enable parallel execution
org.gradle.parallel=true

# Enable build cache
android.enableBuildCache=true
org.gradle.caching=true
```

---

## 📝 Pre-Release Checklist

Before distributing your APK:

- [ ] All features tested and working
- [ ] No hardcoded credentials in code
- [ ] Environment variables properly configured
- [ ] ProGuard enabled (obfuscation)
- [ ] APK signed with release keystore
- [ ] App version and build number incremented
- [ ] Privacy policy URL updated
- [ ] Terms of service reviewed
- [ ] Crash reporting configured (optional)
- [ ] Analytics configured (optional)
- [ ] Push notifications tested (if enabled)
- [ ] Deep links working (if implemented)
- [ ] APK file size reasonable (<50MB ideal)
- [ ] App icon and splash screen finalized
- [ ] Store listing complete (if publishing)

---

## 🎯 Quick Reference

### Build Commands

```bash
# Development
react-native run-android

# Release APK
cd android && ./gradlew assembleRelease

# Release Bundle (for Play Store)
cd android && ./gradlew bundleRelease

# Clean build
cd android && ./gradlew clean

# Install APK on device
adb install -r app/build/outputs/apk/release/app-release.apk
```

### File Locations

- **APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Keystore**: `android/app/mahaveer-release.keystore` (DON'T COMMIT!)
- **Build config**: `android/app/build.gradle`
- **Gradle properties**: `android/gradle.properties`

---

## 🆘 Need Help?

**Common resources**:
- React Native docs: https://reactnative.dev/docs/signed-apk-android
- Android Studio: https://developer.android.com/studio/build/building-cmdline
- Stack Overflow: Tag your questions with `react-native` and `android`

**Error logs**:
```bash
# View build logs
cd android && ./gradlew assembleRelease --stacktrace

# View device logs
adb logcat
```

---

## ✅ Success Criteria

Your build is successful when:
1. ✅ APK file generated in `build/outputs/apk/release/`
2. ✅ APK installs on Android device
3. ✅ App launches without crashes
4. ✅ All features work as expected
5. ✅ Supabase connection successful
6. ✅ No errors in adb logcat

**File size check**:
```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk
# Should be 20-50MB for a typical React Native app
```

---

**Last Updated**: October 25, 2025
**React Native Version**: 0.73.2
**Target Android Version**: API 33 (Android 13)
