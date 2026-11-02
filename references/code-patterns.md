# Code patterns

All snippets assume:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
const insets = useSafeAreaInsets();
```

## Constant inset for tab / navigation screens

Use when the screen has persistent navigation chrome and the whole layout should
respect the rail.

```tsx
export default function TabScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* header, content, cards, etc. */}
      </ScrollView>
    </View>
  );
}
```

For a drawer or split layout, cap the drawer width to the safe width:

```tsx
const safeWidth = Math.max(0, windowWidth - insets.left - insets.right);
const drawerWidth = Math.min(windowWidth * 0.82, safeWidth);
```

Place the drawer at `left: insets.left` and the scrim at
`left: insets.left + drawerWidth`.

## Targeted top-right control

Use in onboarding or content-first flows where the whole screen should not be
padded.

```tsx
<View
  style={{
    position: "absolute",
    top: insets.top + 8,
    left: 16 + insets.left,
    right: 16 + insets.right,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  }}
>
  <LanguageButton />
  <SignOutButton />
</View>
```

This keeps the left and right controls clear of the camera/rail without adding a
permanent margin to the screen content.

For a top bar in the normal flow rather than absolutely positioned:

```tsx
<View
  style={{
    paddingLeft: insets.left,
    paddingRight: insets.right,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <BackButton />
  <RestorePurchasesButton />
</View>
```

## Absolutely positioned button

```tsx
<Pressable
  style={{
    position: "absolute",
    right: 16 + insets.right,
    bottom: 16 + insets.bottom,
  }}
>
  {/* icon */}
</Pressable>
```

Do not add a fixed `right: 16` and expect it to remain tappable on Duo.

## Bottom sheet / modal content

React Native `Modal`s render outside the screen's view hierarchy. The screen's
root padding does not apply inside them.

```tsx
<Modal transparent visible={visible} onRequestClose={onClose}>
  <View
    style={{
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.6)",
    }}
  >
    <View
      style={{
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingLeft: 24 + insets.left,
        paddingRight: 24 + insets.right,
      }}
    >
      {children}
    </View>
  </View>
</Modal>
```

If there is a reusable bottom sheet, consider an opt-in prop such as `railSafe`
so only the flows that need it receive the extra padding:

```tsx
<BottomSheet railSafe visible={visible} onClose={onClose}>
  {children}
</BottomSheet>
```

Inside the sheet component:

```tsx
const sideInsets = railSafe
  ? { left: insets.left, right: insets.right }
  : { left: 0, right: 0 };
```

## Toast / floating overlay

If the toast root is absolutely positioned full-width, inset its available area.
If it is global, apply the inset only on navigation-driven screens and preserve
older layouts elsewhere.

```tsx
<View
  style={[
    styles.toastRoot,
    {
      left: insets.left,
      right: insets.right,
    },
  ]}
>
  {/* toast pills */}
</View>
```

## Scroll views and lists

Preferred: wrap the content, not the scroll view.

```tsx
<ScrollView contentInsetAdjustmentBehavior="automatic">
  <SafeAreaView edges={["left", "right"]} style={{ padding: 16 }}>
    {/* content */}
  </SafeAreaView>
</ScrollView>
```

For a `FlatList`, put horizontal padding on `contentContainerStyle`:

```tsx
<FlatList
  data={items}
  contentContainerStyle={{
    paddingLeft: 16 + insets.left,
    paddingRight: 16 + insets.right,
  }}
  renderItem={renderItem}
/>
```

If items are intentionally full-bleed, add the horizontal inset inside the item,
not to the list itself.

## Fixed grids and computed widths

A 15-column grid or a seven-column calendar can exceed the usable width once the
rail appears.

```tsx
const usableWidth = Math.max(
  0,
  windowWidth - insets.left - insets.right - horizontalPadding * 2,
);

const cellSize = Math.floor(
  (usableWidth - (columns - 1) * gap) / columns,
);
```

Or let flex handle it:

```tsx
<View style={{ flexDirection: "row", gap: 8 }}>
  {days.map((day) => (
    <Pressable
      key={day}
      style={{
        flex: 1,
        maxWidth: 38,
        aspectRatio: 1,
        borderRadius: 999,
      }}
    >
      <Text>{day}</Text>
    </Pressable>
  ))}
</View>
```

Avoid module-scope `Dimensions.get("window")` for anything that must adapt when
the device folds.

## Native tabs

If the app uses Expo Router, keep `NativeTabs`:

```tsx
<NativeTabs>
  <NativeTabs.Trigger name="index">
    <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
    <NativeTabs.Trigger.Icon sf="house" />
  </NativeTabs.Trigger>
  {/* ... */}
</NativeTabs>
```

iOS places the tab bar in the rail automatically. Do not recreate rail placement
in JavaScript.

If the app uses a JavaScript tab bar, expect to handle rail placement, reserved
regions, and Dynamic Island growth manually. The platform-native route is much
more reliable.

## Detecting folded state with `expo-hinge`

Safe-area insets tell you where the rail/camera is. They do **not** tell you
whether the device is physically folded. When the design needs to change based on
the pose, use `expo-hinge`.

```bash
npx expo install expo-hinge
```

```tsx
import { useHinge } from "expo-hinge";

function MyScreen() {
  const hinge = useHinge();

  const isFolded = hinge?.status === "closed";
  const isPartiallyOpen = hinge?.status === "partiallyOpen";
  const isFullyOpen = hinge?.status === "fullyOpen";

  return (
    // ...
  );
}
```

`useHinge()` returns `null` on devices without a hinge. Status values:

- `closed`
- `partiallyOpen`
- `fullyOpen`
- `unknown`

Imperative forms:

```tsx
import { getHinge, addHingeListener } from "expo-hinge";

const hinge = getHinge();

const unsubscribe = addHingeListener((nextHinge) => {
  console.log(nextHinge?.status, nextHinge?.angle);
});
```

Typical use: trim the **base gutter** around an edge action when folded, without
touching the safe-area inset.

```tsx
paddingRight: (isFolded ? 12 : 24) + insets.right,
```

Keep this rule in mind:

- ✅ Trim the base gutter: `12 + insets.right`
- ❌ Do not trim the safe-area inset: `12` alone can put the button back under
  the camera
- ✅ Use `expo-hinge` for pose, `useSafeAreaInsets` for collision avoidance
- ❌ Do not check for an "iPhone Duo" model name; the same code also works with
  Android foldables

`expo-hinge` is a native module. After installing it, rebuild the dev client or
native app (`npx expo run:ios`, EAS Build, etc.).

## Header with a right action and a centered title

This is the layout that most often looks wrong on Duo: a back button on the left,
an add/settings button on the right, and a centered title.

If only the right action is inset for the camera/rail, the remaining flex space is
asymmetric and the title drifts left. If the whole header is inset, the title
still drifts because the left and right paddings differ.

Use an **absolute centered title layer** over the full header width, while the
buttons stay in the padded flow:

```tsx
import { useHinge } from "expo-hinge";

function ScreenHeader() {
  const insets = useSafeAreaInsets();
  const hinge = useHinge();
  const isFolded = hinge?.status === "closed";

  return (
    <View style={{ position: "relative" }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            paddingLeft: 24 + insets.left,
            paddingRight: (isFolded ? 12 : 24) + insets.right,
            paddingBottom: 24,
          },
        ]}
      >
        <Pressable onPress={onBack} style={styles.backButton}>
          <BackIcon />
        </Pressable>

        <Pressable onPress={onAction} style={styles.rightButton}>
          <ActionIcon />
        </Pressable>
      </View>

      <View
        pointerEvents="none"
        style={[
          styles.headerCenter,
          { top: insets.top + 12, bottom: 24 },
        ]}
      >
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}
```

```tsx
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  // backButton / rightButton: fixed 44-48pt square hit areas
});
```

Key details:

- **`position: "relative"` wrapper**: the absolute title layer is positioned
  against the full header width, not the padded content box.
- **`pointerEvents="none"`** on the title layer so both buttons stay tappable.
- **`top` and `bottom` must match the content row**, not the whole header. If the
  header has `paddingTop: insets.top + 12` and `paddingBottom: 24`, use the same
  values on the absolute layer. Otherwise the title sits too low and the gap
  below it shrinks.
- **Keep the safe-area inset in the button padding**; only reduce the base gutter
  when folded.

### Matching header heights across screens

If two screens should have the same header height and divider position, match the
total vertical metrics, not just one property.

These produce the same visual result:

```tsx
// Screen A: top inset on the page, header starts below it
<View style={{ flex: 1, paddingTop: 64 }}>
  <View style={styles.header}>
    {/* row = 48pt, paddingBottom = 24 */}
  </View>
</View>
// total from top: 64 + 48 + 24 = 136

// Screen B: top inset on the header itself
<View style={{ flex: 1 }}>
  <View style={[styles.header, { paddingTop: 64 }]}>
    {/* row = 48pt, paddingBottom = 24 */}
  </View>
</View>
// total from top: 64 + 48 + 24 = 136
```

If one screen puts the top offset inside the header and another puts it on the
page, their divider lines will not line up even when both have "the same"
`paddingBottom`.
