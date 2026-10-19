// Prints candidates for editorial review. Does not silently alter the live catalogue.
import { cleanDescription } from '../lib/descriptions.mjs';
const [identifier] = process.argv.slice(2);
if (!identifier || !/^[a-zA-Z0-9_.-]+$/.test(identifier)) throw Error('Usage: npm run import:archive -- ARCHIVE_IDENTIFIER');
const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw Error(`Archive returned ${response.status}`);
const data = await response.json();
const files = (data.files || []).filter(f => /\.(mp4|webm)$/i.test(f.name) && Number(f.length) > 0);
if (!files.length) throw Error('No playable files with known durations found.');
console.log(JSON.stringify(files.map((f, i) => ({ id: `${identifier}-${i}`, title: data.metadata.title + (files.length > 1 ? ` — ${f.name}` : ''), description:cleanDescription(data.metadata.description), duration: Number(f.length), url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(f.name)}`, sourceUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`, source: 'Internet Archive', rights: data.metadata.licenseurl || 'Unverified — review before public use' })), null, 2));
