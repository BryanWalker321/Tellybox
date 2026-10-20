# Teletext

The station Teletext uses the name configured by its owner. It has a black background, eight period colours, Teletext50 pixel typography and original mosaic artwork. The desktop screen expands to 1,200 pixels and scales to the available mobile width.

## Navigation

- Red: main index (100).
- Green: television now (601).
- Yellow: television next (602).
- Blue: toggle the automatic 15-second carousel.
- Enter any three-digit page number using the number field or keyboard.
- Use the previous/next arrows for subpages on longer listings.
- Select a channel in now/next listings to watch it.

## Pages

| Page | Contents |
| --- | --- |
| 100 | Main index |
| 150 | Station information |
| 160 | How to watch |
| 199 | Help and index |
| 200 | Channel directory |
| 300 | Listings index |
| 301 onwards | Channel running orders |
| 601 | Television now |
| 602 | Television next |

Programme information comes from the same station catalogue and schedule as playback. Times use the viewer's local timezone. News and weather feeds are not included.

## Credits

[PagesFromCeefax](https://github.com/robsonjb1/PagesFromCeefax) and historical Teletext screens were visual references. No source code, logos or artwork from that GPL project are included. The renderer and mosaic artwork are original Tellybox code. Teletext50 fonts are CC0/public domain; see THIRD_PARTY_NOTICES.md and public/fonts/Teletext50-LICENSE.txt.

## Fullscreen

Select Fullscreen beneath the coloured keys. The whole page and its controls scale to fit the screen without scrolling. Resize or rotate the device to refit. Select Exit fullscreen or press Escape to return. Browsers without fullscreen support use a fitted expanded view.

## Box Baffler! daily quiz

Page 400 is the start page, 401–412 are the twelve questions, and 413 is the completion page. A wrong answer returns you to question one; retries keep the same daily questions and answer positions. Page-number entry resumes your current question rather than skipping ahead. The red, green, yellow and blue keys select answers A–D; tapping the answer works too. The automatic page carousel pauses during the quiz.

Box Baffler! is an original quiz inspired by historical colour-key Teletext games, including Bamboozle. Bamber Boozler artwork is displayed from the owner-supplied host image, preserving its original pixels. The question bank is independently worded. See THIRD_PARTY_NOTICES.md for the character artwork notice.

The included bank has 144 original question wordings across 12 subjects. A date-based rotation selects one question per subject, shared by all viewers, and changes at midnight in Europe/London, including daylight-saving time. The initial bank is exhausted over each twelve-day rotation block. Answers are shuffled deterministically for the day. Progress is stored only in the viewer's browser; the next day's quiz resets it. No account or external trivia API is needed.

The bank is in public/quiz-questions.mjs. Each item needs a unique ID, category, question and four distinct answers; the first answer in the source is correct before the daily shuffle. Keep all twelve subjects represented and review factual edits before publishing. Extra questions within an existing subject are included in its daily rotation.
