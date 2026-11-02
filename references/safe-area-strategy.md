# Safe-area strategy for iPhone Duo

## What iPhone Duo changes

### The vertical rail

In many poses iOS moves the status bar, toolbar, and tab bar into a **vertical
rail on one edge**. React Native receives this as a large horizontal safe-area
inset:

- rail on the right → `insets.right ≈ 84`
- rail on the left → `insets.left ≈ 84`
- no rail (for example, open in portrait) → both are `0`

The rail can also contain the **camera cutout at the top**. A top-right button
positioned with a fixed `right: 16` can end up behind the camera even when the
rest of the layout looks fine.

### New sizes, poses, and Split View

The window changes size when the device folds, unfolds, rotates, or enters Split
View. Read `useWindowDimensions()` at render time for anything that must resize.
Do not cache a window size in a module-level constant for adaptive layout.

### Native navigation

`NativeTabs` and native stack headers let iOS place controls in the rail. A
custom JavaScript tab bar does not get this behavior for free. Prefer the
platform-native navigator and let iOS own the rail.

### Reserved regions and the fold

The fold, camera cutouts, and Dynamic Island are **reserved regions**, separate
from safe-area insets. iOS automatically moves alerts, menus, and sheets off the
fold. For ordinary screens, avoid placing critical content directly on the fold
in partially open poses. For custom split layouts, consider a dedicated two-pane
API (for example, Expo UI's `ArrangementView`).

## Requirements

| Requirement | Why |
| --- | --- |
| **Expo SDK 58** | iOS 27 / iPhone Duo support, and automatic UIScene lifecycle. |
| **Xcode 27.1+** | iOS 27.1 simulator runtime and the iPhone Duo simulator. |
| **`react-native-safe-area-context`** | Reliable safe-area values. Expo Router includes it as a peer dependency. |
| **`expo-hinge`** (optional) | Fold detection: `closed`, `partiallyOpen`, `fullyOpen`, `unknown`. |
| **Native navigation (`NativeTabs`, native stack)** | Lets iOS place bars and controls in the rail automatically. |

A known-good baseline at the time of writing:

```json
{
  "expo": "~58.0.x",
  "react-native": "0.88.x",
  "expo-router": "~58.0.x",
  "react-native-safe-area-context": "~5.10.x"
}
```

Version numbers move over time; the important requirement is **Expo SDK 58 or
newer**.

Without Expo Router, wrap the app in `SafeAreaProvider`:

```tsx
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
```

## Safe-area basics

### Use the hook, not `Dimensions`

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Screen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {/* content */}
    </View>
  );
}
```

`Dimensions.get("window")` gives the window size, not the usable safe area. It
does not include the rail inset.

### `SafeAreaView` is fine for content

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

function ArticleScreen() {
  return (
    <ScrollView>
      <SafeAreaView edges={["left", "right"]} style={{ padding: 16 }}>
        {/* readable content stays clear of the rail */}
      </SafeAreaView>
    </ScrollView>
  );
}
```

If the design allows it, prefer wrapping **scroll content** rather than the
`ScrollView` itself, so the background can still run edge to edge under the rail.

### Normal devices are unaffected

On a regular iPhone in portrait, `insets.left` and `insets.right` are `0`. Every
`+ insets.left` / `+ insets.right` rule is therefore a no-op. This is the
simplest way to add Duo support without device-model checks or flags.

Use safe-area values rather than checking for an iPhone Duo model name. The same
code also handles iPad Split View/Stage Manager and Android foldables or cutouts
whenever those platforms report horizontal insets.

## Choosing a strategy

| Screen type | Recommended approach |
| --- | --- |
| Tabbed / navigation-driven screens | Constant horizontal inset at the screen root. |
| Onboarding, marketing, splash, immersive content | No constant margin. Protect only edge-pinned controls, especially top-right camera-area actions. |
| Scroll views and lists | Inset the content container or wrap the content in `SafeAreaView`; let backgrounds bleed. |
| Bottom sheets / modals / portals | Apply insets inside the modal; the parent screen's padding does not reach it. |
| Absolutely positioned buttons / FABs / toasts | Add insets to the `left` / `right` offset, not just a margin. |
| Fixed grids, calendars, heatmaps | Compute size from the usable width, or let flex size the cells. |
| Full-bleed custom UI (games, video players) | Either inset the interactive UI, or explicitly disable the rail on screens where horizontal bars are essential. |

### Why two different strategies?

A tab screen usually has persistent native navigation chrome. Insetting the whole
screen keeps the content aligned with that chrome and avoids edge collisions
consistently.

An onboarding flow is usually a sequence of full-screen, centered designs with no
persistent navigation. Padding the whole screen there just makes the design
narrower and shifts everything. It is usually better to leave the layout alone
and move only the few controls that would sit under the camera or rail.

## Screen audit matrix

Use this when auditing an app for the first time:

| Screen / area | What to check |
| --- | --- |
| Tabbed screens with a top-right header action | Root-level safe-area padding covers the action; verify it in both left- and right-rail poses. |
| Standalone list or tracking screen with back + add/settings | Inset the right action; keep the centered title physically centered. |
| Screen with a top-right Sign out / Restore / Save | Protect the whole top bar, not just the content below it. |
| Screen with only a back button | Inset the left side if the rail can be on the left. |
| Header with a centered title and side actions | Use an absolute centered title layer; do not center it in the remaining flex space if side padding is asymmetric. |
| Sibling screens with the same header style | Match top offset, content-row height, and bottom padding so divider lines line up. |
| Bottom sheets and modals | Apply insets inside the modal, not on the parent screen. |
| Lists, calendars, heatmaps | Recalculate fixed widths or let flex handle the cells. |
| Folded state | If spacing should change when closed, use `expo-hinge` and trim only the base gutter, never the safe-area inset. |

## What not to do

- ❌ Do not read safe areas from `Dimensions`.
- ❌ Do not assume the rail is always on the right; it can be on either edge.
- ❌ Do not add a permanent horizontal margin to every screen by default. Use it
  for navigation-driven screens; use targeted control insets for immersive
  flows.
- ❌ Do not expect a screen's safe-area padding to apply inside a `Modal`.
- ❌ Do not replace native tabs with a JS tab bar just to "support" the rail.
- ❌ Do not center a header title in the remaining flex space when the side
  padding is asymmetric; use an absolute centered layer or equal side widths.
- ❌ Do not trim the safe-area inset when reducing folded-state padding; trim
  only the base gutter.
- ❌ Do not let sibling screens use different header vertical metrics (one with
  the top inset inside the header, one with it on the page); their divider lines
  will not match.
- ❌ Do not add `ios.enableSceneSupport` or `expo-build-properties` for scene
  support on Expo SDK 58.
- ❌ Do not cache window dimensions at module scope for adaptive layouts.

## References

- Expo: [Supporting iPhone Duo with Expo](https://expo.dev/blog/supporting-iphone-duo)
- Apple: [Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)
- Apple: [Preparing your app for iPhone Duo](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo)
- Expo SDK 58: [react-native-safe-area-context](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/)
- Expo: [Safe areas guide](https://docs.expo.dev/develop/user-interface/safe-areas/)
