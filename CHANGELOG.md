# Changelog

## 0.1.4

- Add Box Baffler!, an original daily twelve-question Teletext quiz starting on page 400.
- Include 144 questions across 12 subjects, rotated at midnight UK time with shuffled answer positions.
- Support coloured keys, tappable answers, wrong-answer resets, same-day saved progress and fullscreen.
- Use the supplied Bamber host artwork, show dates in UK format, and add quiz screenshots and documentation.

## 0.1.3

- Add Teletext fullscreen with automatic fit, resize handling and an exit button.
- Keep all Teletext controls available in fullscreen; support an expanded view when browser fullscreen is unavailable.
- Add full-size screenshots of the hosted station and update the project About text.

## 0.1.2

- Rebuild Teletext with period colours, pixel typography, station branding and channel listings.
- Enlarge the desktop screen and keep mobile layouts responsive.
- Retain coloured keys and page number entry; add subpage navigation.
- Use the owner-configured station name in the Teletext masthead.
- Publish updates through GitHub Releases, incrementing the patch version for every release.

## 0.1.1

- Add station-wide advert/filler selection and an adjustable repeat cooldown, defaulting to two minutes in the scheduling editor.
- Keep channel-owned pools separate when toggling station-wide selection; exclude disabled clips and deduplicate media references.
- Normalise live audio and keep timestamps advancing through programme/advert handoffs, including silent sources.
- Preserve active HLS sessions when catalogue changes are saved.
- Limit programme descriptions to four visible lines, ending at a complete word with an ellipsis; remove expansion.
- Document Windows, Linux and Raspberry Pi ARM64 installation and add ARM64 container checks. Physical Pi performance and Mac testing remain follow-ups.

## 0.1.0

Initial self-hosted release with one demo channel, two demo programmes, the control room and setup guides.
