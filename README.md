# iphone-duo-expo

A skill for making React Native / Expo apps work correctly on Apple's iPhone Duo
foldable — safe areas, the vertical rail, dynamic window sizes, native
navigation, `expo-hinge`, and the iOS 27 `UIScene` lifecycle crash.

It packages the guide in
[`add_support_for_iphone_duo_reactnative_expo.md`](https://github.com/preetramsha/winnr-app-expo/blob/main/add_support_for_iphone_duo_reactnative_expo.md)
into an agent-ready workflow with focused references and a project audit script.

## Install

```bash
npx skills add preetramsha/iphone-duo-expo -g
```

Install for one project instead of globally:

```bash
npx skills add preetramsha/iphone-duo-expo
```

## What it covers

- Reading the ~84pt horizontal rail inset with
  `react-native-safe-area-context` at render time
- Choosing between a constant root inset (tab/navigation screens) and targeted
  control insets (onboarding/immersive screens)
- Top-right camera-area actions, centered header titles, drawers, toasts,
  bottom sheets, modals, lists, and fixed grids
- Keeping `NativeTabs` so iOS places the tab bar in the rail
- Detecting fold pose with `expo-hinge` without device-model checks
- The iOS 27 `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`
  crash and why `ios.enableSceneSupport` must not be used on Expo SDK 58
- A pose-by-pose testing checklist

## Structure

```text
iphone-duo-expo/
├── SKILL.md
├── references/
│   ├── safe-area-strategy.md
│   ├── code-patterns.md
│   ├── testing-checklist.md
│   └── uiscene-lifecycle.md
└── scripts/
    └── audit.mjs
```

`SKILL.md` is deliberately focused. The agent loads a reference only when the
task needs the detailed patterns or checklist.

## Audit script

The bundled script scans a project for the exact anti-patterns from the guide:

```bash
node scripts/audit.mjs /path/to/app
node scripts/audit.mjs /path/to/app --json
node scripts/audit.mjs /path/to/app --strict
```

It checks the Expo SDK version, safe-area dependency, SDK 57-era scene config,
`SceneDelegate.swift`, `UIApplicationSceneManifest`, `Dimensions.get`,
`SafeAreaView` imported from `react-native`, fixed absolute offsets, custom tab
bars, and modals. It has no dependencies and never modifies files.

Exit codes: `0` clean, `1` errors (or warnings with `--strict`), `2` bad usage.

## Example requests

- "Make this Expo app work on iPhone Duo."
- "Our top-right button disappears under the camera on the foldable."
- "Audit our screens for the vertical rail."
- "Add expo-hinge support for the folded state."
- "We crash on iOS 27 with `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`."

## Baseline

Expo SDK 58+, Xcode 27.1+, `react-native-safe-area-context`, and optionally
`expo-hinge`. On a normal iPhone the horizontal insets are `0`, so the added
rules are no-ops.

## License

MIT
