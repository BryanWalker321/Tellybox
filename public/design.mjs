const $ = id => document.getElementById(id);
const wording = [
 ['kicker', 'Intro strapline', 'YOUR MEDIA. YOUR STATION.'], ['heroLine1', 'Main heading, first line', 'Your collection.'], ['heroLine2', 'Main heading, second line', 'On the air.'],
 ['description', 'Short introduction', 'Pick a channel and settle in.'], ['about', 'About your network', 'An independent television network curated by its owner.'],
 ['serviceLine', 'Service bar', 'AN INDEPENDENT TELEVISION SERVICE'], ['footerLine', 'Footer message', 'Your media. Rediscovered together.'], ['paperTitle', 'Newspaper guide title', 'The Television Times'],
 ['guideNote', 'Guide introduction', 'Find your channel in the shared live schedule.'], ['standbyMessage', 'Off-air message', 'Please stand by. Our next programme follows shortly.']
];
const colours = [['background', 'Website background', '#07131f'], ['surface', 'Panels & windows', '#10232d'], ['text', 'Main text', '#e9edda'], ['highlight', 'Headings & highlights', '#ffda43'], ['link', 'Links & secondary accents', '#81d7e0']];
export function createDesign({ save, message }) {
  let brand;
  const container = $('owner-design-fields');
  for (const [key, label] of wording) { const wrapper = document.createElement('label'); wrapper.textContent = label; const input = document.createElement(['about', 'description'].includes(key) ? 'textarea' : 'input'); input.id = 'wording-' + key; wrapper.append(input); container.append(wrapper); }
  const palette = $('owner-palette-fields');
  for (const [key, label] of colours) { const wrapper = document.createElement('label'); wrapper.textContent = label; const input = document.createElement('input'); input.type = 'color'; input.id = 'palette-' + key; wrapper.append(input); palette.append(wrapper); }
  $('owner-design-form').addEventListener('submit', async e => { e.preventDefault(); try { const next = structuredClone(brand); for (const [key] of wording) next[key] = $('wording-' + key).value; next.theme = { ...next.theme, cabinet: $('owner-cabinet').value, font: $('owner-font').value, crtDefault: $('owner-crt-default').value === 'on' }; for (const [key] of colours) next.theme[key] = $('palette-' + key).value; next.holdingImage = $('owner-holding-url').value.trim() || '/test-card-f.jpg'; await save(next); message('Design, wording and holding screen saved. New browsers use the chosen CRT default; existing viewers keep their preference.'); } catch (err) { message(err.message); } });
  $('owner-upload-holding').addEventListener('click', async () => { const file = $('owner-holding-file').files[0]; if (!file) return message('Choose a holding-screen image first.'); document.dispatchEvent(new CustomEvent('owner-upload-holding', { detail: file })); });
  return { load(value) { brand = value; for (const [key, , fallback] of wording) $('wording-' + key).value = brand[key] || fallback; for (const [key, , fallback] of colours) $('palette-' + key).value = brand.theme?.[key] || fallback; $('owner-cabinet').value = brand.theme?.cabinet || 'wood'; $('owner-font').value = brand.theme?.font || 'mono'; $('owner-crt-default').value = brand.theme?.crtDefault === false ? 'off' : 'on'; $('owner-holding-url').value = brand.holdingImage || '/test-card-f.jpg'; } };
}
