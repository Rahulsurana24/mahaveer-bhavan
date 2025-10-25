# Detailed Setup Guide

## Prerequisites

### Required Software

1. **Node.js** (>= 18.0.0)
   ```bash
   node --version
   ```

2. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

3. **iOS Development (Mac only)**
   - Xcode (latest version from App Store)
   - CocoaPods
   ```bash
   sudo gem install cocoapods
   ```

4. **Android Development**
   - Android Studio
   - Android SDK (API 33+)
   - Java Development Kit (JDK 11+)

5. **Git**
   ```bash
   git --version
   ```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/mahaveer-bhavan.git
cd mahaveer-bhavan
```

### 2. Install Member App

```bash
cd member-app
npm install

# iOS only
cd ios
pod install
cd ..
```

### 3. Install Admin App

```bash
cd ../admin-app
npm install

# iOS only
cd ios
pod install
cd ..
```

### 4. Configure Environment Variables

Create `.env` files in both `member-app/` and `admin-app/`:

```env
# Supabase Configuration
SUPABASE_URL=https://juvrytwhtivezeqrmtpq.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Payment Gateway (Optional)
RAZORPAY_KEY_ID=rzp_test_xxxx

# App Configuration
APP_VERSION=1.0.0
```

## Database Setup

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and anon key

### 2. Apply Database Migrations

Navigate to Supabase SQL Editor and run migrations:

**audit_log table:**
```bash
# Copy contents of supabase/migrations/20251025_create_audit_log.sql
# Paste into SQL Editor and execute
```

**form_fields table:**
```bash
# Copy contents of supabase/migrations/20251025_create_form_fields.sql
# Paste into SQL Editor and execute
```

**gallery table:**
```bash
# Copy contents of supabase/migrations/20251025_rename_gallery_items.sql
# Paste into SQL Editor and execute
```

### 3. Configure Storage Buckets

Create the following storage buckets in Supabase:

1. **member-photos** - For profile pictures
   - Public: Yes
   - File size limit: 5MB

2. **gallery** - For approved gallery media
   - Public: Yes
   - File size limit: 50MB

3. **gallery-posts** - For pending gallery uploads
   - Public: No
   - File size limit: 50MB

4. **messaging-attachments** - For message media
   - Public: No
   - File size limit: 20MB

### 4. Set Up Authentication

In Supabase Dashboard → Authentication:

1. Enable Email provider
2. Disable email confirmation (or configure SMTP)
3. Set Site URL to your app's deep link scheme
4. Add redirect URLs for password reset

## iOS Setup

### 1. Configure Xcode Project

```bash
cd member-app/ios
open MahaveerBhavan.xcworkspace
```

In Xcode:
1. Select project in navigator
2. Update Bundle Identifier: `com.mahaverbhavan.member`
3. Select Team for code signing
4. Update Display Name: "Mahaveer Bhavan"

### 2. Configure Permissions

Edit `ios/MahaveerBhavan/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access for profile photos and QR scanning</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to upload images</string>

<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for voice messages</string>
```

### 3. Run on iOS

```bash
npm run ios
# or
react-native run-ios --device "Your Device Name"
```

## Android Setup

### 1. Configure Build

Edit `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.mahaverbhavan.member"
        minSdkVersion 23
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 2. Configure Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 3. Generate Signing Key (for release)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore mahaveer-release.keystore -alias mahaveer-key -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/gradle.properties`:
```
MAHAVEER_RELEASE_STORE_FILE=mahaveer-release.keystore
MAHAVEER_RELEASE_KEY_ALIAS=mahaveer-key
MAHAVEER_RELEASE_STORE_PASSWORD=your-password
MAHAVEER_RELEASE_KEY_PASSWORD=your-password
```

### 4. Run on Android

```bash
npm run android
# or
react-native run-android --device
```

## Edge Functions Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Project

```bash
supabase link --project-ref your-project-ref
```

### 4. Deploy Edge Functions

```bash
cd supabase/functions

# Deploy all functions
supabase functions deploy

# Or deploy individual functions
supabase functions deploy email-service
supabase functions deploy payment-processing
# ... etc
```

### 5. Set Function Secrets

```bash
# OpenRouter API Key (for AI chat)
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-your-key

# Razorpay Keys
supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx
supabase secrets set RAZORPAY_KEY_SECRET=xxx

# Email Service (optional)
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_USER=your@email.com
supabase secrets set SMTP_PASS=your-app-password
```

## Testing

### Run Tests

```bash
# Member App
cd member-app
npm test

# Admin App
cd ../admin-app
npm test
```

### Manual Testing Checklist

Member App:
- [ ] Login with existing account
- [ ] Register new member
- [ ] View profile and ID card
- [ ] Browse events and register
- [ ] Send and receive messages
- [ ] Upload to gallery
- [ ] Make a test donation

Admin App:
- [ ] Login as admin
- [ ] View dashboard analytics
- [ ] Create new event
- [ ] Scan QR code for attendance
- [ ] Moderate gallery uploads
- [ ] Export member list
- [ ] View audit logs

## Troubleshooting

### Common Issues

**Metro bundler not starting:**
```bash
npx react-native start --reset-cache
```

**iOS build fails:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Android build fails:**
```bash
cd android
./gradlew clean
cd ..
```

**Supabase connection issues:**
- Check SUPABASE_URL and SUPABASE_ANON_KEY in `.env`
- Verify project is not paused in Supabase dashboard
- Check Row Level Security policies

**Image picker not working:**
- Verify permissions in Info.plist (iOS) and AndroidManifest.xml
- Request permissions at runtime

## Next Steps

1. Test all features on both iOS and Android devices
2. Set up crash reporting (Sentry)
3. Configure push notifications (optional)
4. Prepare app store assets (screenshots, descriptions)
5. Submit to App Store and Play Store

## Support

For issues:
- Check `/docs` folder
- Review Supabase logs
- Contact development team
