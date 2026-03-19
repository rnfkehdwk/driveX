# DriveLog Android (TWA)

PWA를 Android 앱으로 감싸는 TWA(Trusted Web Activity) 프로젝트입니다.

## 설정 정보

- **PWA URL**: https://rnfkehdwk.synology.me:38443/m/
- **패키지명**: com.drivelog.app
- **최소 Android**: API 24 (Android 7.0)

## 빌드 방법

### 사전 준비
1. Android Studio 설치 (https://developer.android.com/studio)
2. JDK 17 이상 설치

### 빌드 단계

1. Android Studio에서 `drivelog-android` 폴더를 Open
2. Gradle Sync 완료 대기
3. Build > Build Bundle(s) / APK(s) > Build APK(s)
4. 생성된 APK: `app/build/outputs/apk/debug/app-debug.apk`

### 서명 키 생성 (릴리즈용)

```bash
keytool -genkey -v -keystore drivelog-release.keystore -alias drivelog -keyalg RSA -keysize 2048 -validity 10000
```

### SHA-256 핑거프린트 확인

```bash
# 디버그 키
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android

# 릴리즈 키
keytool -list -v -keystore drivelog-release.keystore -alias drivelog
```

### Digital Asset Links 설정

1. SHA-256 핑거프린트를 `assetlinks-setup/assetlinks.json`에 입력
2. NAS 웹 서버의 `/.well-known/assetlinks.json` 경로에 배포
   - 경로: `https://rnfkehdwk.synology.me:38443/.well-known/assetlinks.json`

## 테스트

1. 안드로이드 폰에서 USB 디버깅 활성화
2. Android Studio에서 Run 버튼 클릭
3. 폰에 앱이 설치되고 PWA가 전체화면으로 표시됨
