---
name: iphone-duo-expo
description: Make React Native and Expo apps work correctly on iPhone Duo foldables. Use when adding iPhone Duo or foldable support, fixing safe-area or vertical-rail layout bugs, auditing screens for camera/rail collisions, adapting layouts to fold poses with expo-hinge, or resolving the iOS 27 UIScene lifecycle crash on Expo SDK 58.
license: MIT
---

# iPhone Duo for React Native / Expo

iPhone Duo adds a **vertical rail** on either edge that iOS reports as a large
horizontal safe-area inset (~84pt). Layouts that only handle top and bottom
insets break: top-right buttons hide under the camera, centered titles drift,
fixed grids overflow, and modals ignore the screen's padding.

This skill is app-agnostic. Apply only the patterns that match each screen type.

## Baseline

| Requirement | Why |
| --- | --- |
| **Expo SDK 58+** | iOS 27 / iPhone Duo support and automatic UIScene lifecycle. |
| **Xcode 27.1+** | iOS 27.1 simulator runtime and the iPhone Duo simulator. |
| **`react-native-safe-area-context`** | Reliable inset values. Expo Router includes it. |
| **`expo-hinge`** (optional) | Fold pose: `closed`, `partiallyOpen`, `fullyOpen`, `unknown`. |
| **Native navigation** | `NativeTabs` / native stack let iOS place chrome in the rail. |

If the app does not use Expo Router, confirm `SafeAreaProvider` wraps the root.

## The six rules

1. **Read insets at render time.** Use `useSafeAreaInsets()` or
   `SafeAreaView` from `react-native-safe-area-context`. Never read safe areas
   from `Dimensions` and never cache window size at module scope.
2. **The rail can be on either edge.** `insets.left` or `insets.right` can be
   ~84; never assume right-only.
3. **Pick one strategy per screen.** Navigation-driven screens get a constant
   horizontal inset at the root. Immersive, onboarding, and content-first
   screens keep their layout and inset only edge-pinned controls.
4. **Let native navigation own the rail.** Keep `NativeTabs` and native headers;
   do not rebuild rail placement in JavaScript.
5. **Use `expo-hinge` for pose, insets for collisions.** Never infer fold state
   from a device-model name. When trimming padding for the folded pose, trim
   only the base gutter, never the safe-area inset.
6. **SDK 58 handles UIScene automatically.** Do not add
   `ios.enableSceneSupport` or `expo-build-properties` for scene support.

On a normal iPhone in portrait, horizontal insets are `0`, so every
`+ insets.left` / `+ insets.right` rule is a no-op. No device flags needed.

## Workflow

### 1. Inspect the project

```bash
cat package.json
cat app.json 2>/dev/null || cat app.config.js
```

Record the Expo SDK major, navigation library (`expo-router` vs React
Navigation), whether `react-native-safe-area-context` and `expo-hinge` are
installed, and whether the app uses `NativeTabs`.

### 2. Run the bundled audit

From the project root, using the absolute path to this skill's directory:

```bash
node <skill-dir>/scripts/audit.mjs .
node <skill-dir>/scripts/audit.mjs . --json   # machine-readable
```

The audit flags fixed edge offsets, `Dimensions.get`, `SafeAreaView` imported
from `react-native`, custom tab bars, modals, missing `SceneDelegate.swift`, and
SDK 57-era scene configuration. Treat findings as a checklist, not as proof of a
bug.

### 3. Classify every screen

| Screen type | Strategy |
| --- | --- |
| Tabbed / navigation-driven | Constant `paddingLeft/Right: insets.left/right` at the screen root. |
| Onboarding, splash, marketing, immersive | No permanent margin; protect only edge-pinned controls, especially top-right. |
| Scroll views and lists | Inset the content container or wrap content in `SafeAreaView`; let backgrounds bleed. |
| Bottom sheets, modals, portals | Apply insets inside the modal; the parent screen's padding does not reach it. |
| Absolute buttons, FABs, toasts | Add insets to the `left` / `right` offset, not just a margin. |
| Fixed grids, calendars, heatmaps | Compute cells from usable width, or let flex size them. |
| Full-bleed games / video | Inset interactive UI or explicitly disable the rail where horizontal bars are essential. |

Ask before padding an onboarding or content-first screen end to end. The usual
correct fix there is moving two controls, not narrowing the whole design.

### 4. Apply the patterns

Read the focused reference before editing:

- `references/safe-area-strategy.md` — rail behavior, requirements, strategy,
  screen audit matrix, anti-patterns.
- `references/code-patterns.md` — copy-ready patterns for roots, headers,
  absolute controls, modals, toasts, lists, grids, native tabs, and `expo-hinge`.
- `references/testing-checklist.md` — poses, devices, and upgrade checks.
- `references/uiscene-lifecycle.md` — the iOS 27 crash and the SDK 58 fix.

High-value rules while editing:

- **Top-right control:** `right: 16 + insets.right`, `top: insets.top + 8`.
- **Centered header title:** use an absolutely centered title layer across the
  full header width, with `pointerEvents="none"`. Do not center inside
  asymmetric flex space.
- **Sibling headers:** match total vertical metrics so divider lines align.
- **Bottom sheet:** add insets inside the modal/sheet, not on the parent screen.
- **List:** put horizontal padding on `contentContainerStyle`.
- **Drawer:** cap width to `windowWidth - insets.left - insets.right` and place
  it at `left: insets.left`.
- **Folded pose:** `paddingRight: (isFolded ? 12 : 24) + insets.right`.

### 5. Check the UIScene lifecycle

If the app is on SDK 58, verify after `npx expo prebuild --clean`:

- `ios/<Project>/SceneDelegate.swift` exists.
- `ios/<Project>/Info.plist` contains `UIApplicationSceneManifest`.
- `ios.enableSceneSupport` is absent from app config.
- `expo-build-properties` is not present only for scene support.

If the app is still on SDK 57, the old workaround exists, but the long-term fix
is upgrading to SDK 58. See `references/uiscene-lifecycle.md`.

### 6. Verify

Test the poses in `references/testing-checklist.md`: folded, open portrait, open
landscape, partially open, Split View, fold/unfold with a screen open, Dynamic
Island, and a standard iPhone. Also cold-launch the app, not just fast refresh.

## Guardrails

- ❌ Do not read safe areas from `Dimensions`.
- ❌ Do not assume the rail is on the right.
- ❌ Do not add a permanent horizontal margin to every screen by default.
- ❌ Do not expect a screen's padding to apply inside a `Modal`.
- ❌ Do not replace native tabs with a JS tab bar just to support the rail.
- ❌ Do not center a title in asymmetric remaining flex space.
- ❌ Do not trim the safe-area inset when reducing folded-state padding.
- ❌ Do not let sibling screens use different header vertical metrics.
- ❌ Do not add `ios.enableSceneSupport` on SDK 58.
- ❌ Do not cache window dimensions at module scope for adaptive layouts.
- ❌ Do not check for an "iPhone Duo" model name; safe-area and hinge APIs also
  cover iPad Split View, Android foldables, and cutouts.

## Report when done

State which files changed and why, which screens were intentionally left
unpadded, any findings that need manual testing, and the poses/devices actually
verified. Never claim Duo support was tested if only static analysis was run.
