import path from 'node:path';
import {createCatalogueReader} from './catalogue-reader.mjs';
import {validateCatalogue} from './schedule.mjs';
import {applySourceHealth} from './source-health.mjs';
export function companionCatalogueReader(directory){return createCatalogueReader({configPath:path.join(directory,'catalogue.json'),healthPath:path.join(directory,'source-health.json'),validate:validateCatalogue,applyHealth:applySourceHealth});}
