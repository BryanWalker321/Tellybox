# Accessibility at Tellybox

## Our commitment

We want viewers and station owners to enjoy Tellybox with different devices, input methods and access needs. Accessibility improvements and reports are welcome. The retro visual style should not prevent people from finding channels or controlling their station.

Tellybox is in beta. We have not completed an independent accessibility audit and do not claim WCAG conformance or compatibility with every assistive technology.

## Current interface and environments

The website has desktop and mobile layouts. The mobile navigation button has an accessible name and expanded state, supports Escape dismissal and restores focus. Standard buttons and links provide the main navigation and player controls. Owners can customise station presentation. Browser zoom and device orientation may help with the guide and settings, but individual views still need testing at higher zoom and with assistive technology.

Automated and browser checks cover selected navigation and layout behaviours on desktop Chrome and narrow mobile viewports. These checks are not a substitute for screen-reader, keyboard-only, low-vision or physical-device testing. See [platforms](docs/PLATFORMS.md) and [testing](docs/TESTING.md) for the current verification scope. IPTV and TV casting use other players and devices whose accessibility support varies.

## Known limitations and areas needing testing

- The dense programme guide, Teletext, player overlays and owner forms need broader keyboard and screen-reader assessment.
- Retro fonts, scanlines, contrast choices, motion and station-owner customisation can affect readability. Reduced-motion CSS currently disables smooth scrolling; it does not guarantee that all animation or video motion is removed.
- Captions, audio description and transcripts depend on the supplied media and playback route. Tellybox does not generate them automatically or guarantee that embedded caption tracks are exposed in every player.
- We have not certified Google Cast, AirPlay, Anyview/Miracast, TV remotes or CRT adapters for accessibility.
- Third-party sign-in, media sources and external players may introduce additional barriers.

These are areas for improvement rather than a complete audit of all barriers. The absence of an item from this list does not mean it has been tested.

## Report an accessibility barrier

[Open a GitHub issue](https://github.com/BryanWalker321/Tellybox/issues/new/choose) and include **Accessibility** in the title, or [join our Discord](https://discord.gg/WeTsEbdcCZ) and ask for help. If a report contains personal details, ask a moderator for a private conversation instead of posting them publicly. Please do not include passwords, tokens or private media.

Tell us the page/control, what you were trying to do, what prevented it, the Tellybox version, browser/device and any assistive technology and version you are comfortable sharing. Reproduction steps, zoom level or a screenshot can help, but no diagnosis or proof of disability is required.

Maintainers will consider reports and practical improvements; response and resolution times depend on volunteer availability. Contributors should describe accessibility effects in pull requests and test keyboard navigation, focus, readable layout and accessible names when changing the interface.

Last reviewed: 23 October 2026.
