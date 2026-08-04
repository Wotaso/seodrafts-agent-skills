#!/usr/bin/env node
import {
  candidateSeedsToCsv,
  expandSourceCatalog,
  readJsonInput,
  writeOutput,
} from './lib.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const catalogIndex = args.indexOf('--catalog');
const minIndex = args.indexOf('--min-candidates');
const maxIndex = args.indexOf('--max-candidates');
const formatIndex = args.indexOf('--format');
const valueIndexes = new Set([
  ...(outputIndex >= 0 ? [outputIndex + 1] : []),
  ...(catalogIndex >= 0 ? [catalogIndex + 1] : []),
  ...(minIndex >= 0 ? [minIndex + 1] : []),
  ...(maxIndex >= 0 ? [maxIndex + 1] : []),
  ...(formatIndex >= 0 ? [formatIndex + 1] : []),
]);
const positional = args.filter((arg, index) => !arg.startsWith('--') && !valueIndexes.has(index));

try {
  if (catalogIndex < 0 || !args[catalogIndex + 1]) throw new Error('--catalog <source-catalog.json> is required.');
  const profile = await readJsonInput(positional[0] ?? '-');
  const catalog = await readJsonInput(args[catalogIndex + 1]);
  const report = expandSourceCatalog(profile, catalog, {
    minCandidates: minIndex >= 0 ? Number(args[minIndex + 1]) : undefined,
    maxCandidates: maxIndex >= 0 ? Number(args[maxIndex + 1]) : undefined,
  });
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'json';
  const serialized = format === 'csv' ? candidateSeedsToCsv(report) : `${JSON.stringify(report, null, 2)}\n`;
  if (!['json', 'csv'].includes(format)) throw new Error('--format must be json or csv.');
  await writeOutput(serialized, outputIndex >= 0 ? args[outputIndex + 1] : undefined);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
