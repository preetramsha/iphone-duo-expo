# Testing checklist

Use Xcode 27.1+ and the iPhone Duo simulator. Xcode 27 uses Device Hub instead of
Simulator.app. Test every pose the app supports.

## Poses and devices

- [ ] **Folded** — important controls are not under the rail; every button
      responds.
- [ ] **Open portrait** — bars return to top/bottom; layout still holds.
- [ ] **Open landscape** — the rail appears on the expected edge; content and
      controls stay clear.
- [ ] **Partially open** — nothing critical sits on the fold; sheets and alerts
      land on one side.
- [ ] **Split View** — test the app in each window; the left window's rail is on
      its left edge.
- [ ] **Fold/unfold with a screen open** — same screen, same scroll position, no
      state loss.
- [ ] **Dynamic Island / live activity** — rail controls can shrink or move into
      an overflow menu.
- [ ] **A standard iPhone** — nothing changes.

## UI surfaces

- [ ] Every top-right button and menu
- [ ] Every header with a centered title, in both left- and right-rail poses
- [ ] Sibling headers share the same height and divider position
- [ ] Folded-state padding switches cleanly with no layout jump
- [ ] List/tracking screens with add/settings actions
- [ ] Every bottom-sheet action
- [ ] Toasts and floating buttons
- [ ] Any fixed grid or calendar
- [ ] Image/video full-screen modals
- [ ] The app after a cold launch, not just a fast refresh

## Upgrade checklist (Expo SDK 58)

- [ ] Upgrade Expo and related packages to SDK 58-compatible versions.
- [ ] Remove any SDK 57-era `ios.enableSceneSupport` configuration.
- [ ] Remove the `expo-build-properties` plugin if it was only added for scene
      support.
- [ ] Run `npx expo prebuild --clean`.
- [ ] Confirm `SceneDelegate.swift` exists.
- [ ] Confirm `Info.plist` contains `UIApplicationSceneManifest`.
- [ ] Build with Xcode 27.1+ (or an EAS image with the iOS 27 SDK).
- [ ] Run the safe-area audit on iPhone Duo.
- [ ] Re-test normal iPhones, iPads, and Split View.
- [ ] Check that any custom tab bar, toast, bottom sheet, and modal still behaves
      correctly.
- [ ] Remove any temporary testing/debug buttons before release.
