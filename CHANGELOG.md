# Changelog

## 0.1.1

- Add station-wide advert/filler selection and an adjustable repeat cooldown, defaulting to two minutes in the scheduling editor.
- Keep channel-owned pools separate when toggling station-wide selection; exclude disabled clips and deduplicate media references.
- Normalise live audio and keep timestamps advancing through programme/advert handoffs, including silent sources.
- Preserve active HLS sessions when catalogue changes are saved.
- Limit programme descriptions to four visible lines, ending at a complete word with an ellipsis; remove expansion.
- Document Windows, Linux and Raspberry Pi ARM64 installation and add ARM64 container checks. Physical Pi performance and Mac testing remain follow-ups.

## 0.1.0

Initial self-hosted release with one demo channel, two demo programmes, the control room and setup guides.
