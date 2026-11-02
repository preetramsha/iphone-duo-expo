# Expo SDK 58 and the iOS 27 UIScene lifecycle crash

## Symptom

On an iPhone running iOS 27, an app built with the **Xcode 27 SDK** can crash on
launch with:

```text
_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption
```

## Root cause

iOS 27 requires apps built with the **Xcode 27 SDK** to adopt the **UIScene
lifecycle**.

A real-world example:

- App A was built with **Xcode 27.2** (`iphoneos27.2`) and crashed with the
  runtime issue above.
- App B appeared to work because the installed build had been made with
  **Xcode 26.5** (`iphoneos26.5`), which is exempt.
- This was a build/SDK issue, not an application-code bug.

## The SDK 57-era workaround

Before Expo SDK 58, the workaround for a project on SDK 57 was:

1. Add `expo-build-properties@~57.0.22`.
2. Enable `ios.enableSceneSupport: true` in `app.json`.
3. Run `npx expo prebuild --clean`.
4. Verify:
   - `AppDelegate.swift` conforms to `ExpoReactNativeFactoryProvider`
   - `Info.plist` contains the scene manifest pointing at
     `EXExpoAppSceneDelegate`
5. Update the project README with the real cause and fix.

## ⚠️ Superseded by Expo SDK 58

**Do not apply the SDK 57 workaround on Expo SDK 58.**

The long-term fix is to upgrade to **Expo SDK 58**, which adopts the UIScene
lifecycle by default.

Expo SDK 58 uses the **UIScene lifecycle by default**. `ios.enableSceneSupport`
and the `expo-build-properties` plugin were removed from `app.json`.
`expo prebuild` now generates `SceneDelegate.swift` and the
`UIApplicationSceneManifest` entry in `Info.plist` automatically.

From the Expo SDK 58 guidance:

> SDK 58 generates the UIScene lifecycle automatically during prebuild. Do not
> add `ios.enableSceneSupport` or the `expo-build-properties` plugin for scene
> support — both were workarounds for SDK 57 and are unnecessary (and
> unsupported) in SDK 58. Prebuild produces `SceneDelegate.swift` and the
> `UIApplicationSceneManifest` entry in `Info.plist`.

The correct SDK 58 path is:

```bash
npx expo prebuild --clean
```

Then build and install with Xcode 27.1+ or an EAS Build image that includes the
iOS 27 SDK.

## Verification

```bash
ls ios/*/SceneDelegate.swift
grep -n "UIApplicationSceneManifest" ios/*/Info.plist
grep -n "enableSceneSupport" app.json app.config.js 2>/dev/null
```

Expected:

- `SceneDelegate.swift` exists.
- `Info.plist` contains `UIApplicationSceneManifest`.
- No `enableSceneSupport` entry.
