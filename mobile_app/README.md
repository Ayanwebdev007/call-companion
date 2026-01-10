# Mobile App Setup Guide

Since Flutter was not detected in your environment, only the source code has been generated. You need to initialize the project structure.

## 1. Initialize Flutter Project
Run the following command in this directory:
```bash
flutter create .
```
(Using `.` to use the current directory)

## 2. Add Android Permissions
Open `android/app/src/main/AndroidManifest.xml` and add these lines inside the `<manifest>` tag, above `<application>`:

```xml
<uses-permission android:name="android.permission.READ_CALL_LOG" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
```

## 3. Run the App
```bash
flutter pub get
flutter run
```
