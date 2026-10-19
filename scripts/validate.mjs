import { readFile } from 'node:fs/promises';
import { validateCatalogue } from '../lib/schedule.mjs';
const config = validateCatalogue(JSON.parse(await readFile(process.env.CATALOGUE_PATH || 'catalogue.json', 'utf8')));
console.log(`Valid: ${config.channels.length} channels, ${config.channels.reduce((n, c) => n + c.programmes.length, 0)} programmes.`);
