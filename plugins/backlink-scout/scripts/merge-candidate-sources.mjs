#!/usr/bin/env node
import {
  candidateSeedsToCsv,
  mergeCandidateReports,
  readJsonInput,
  writeOutput,
} from './lib.mjs';

const args = process.argv.slice(2);
const providerIndex = args.indexOf('--provider');
const outputIndex = args.indexOf('--output');
const formatIndex = args.indexOf('--format');
const maxIndex = args.indexOf('--max-candidates');
const valueIndexes = new Set([
  ...(providerIndex >= 0 ? [providerIndex + 1] : []),
  ...(outputIndex >= 0 ? [outputIndex + 1] : []),
  ...(formatIndex >= 0 ? [formatIndex + 1] : []),
  ...(maxIndex >= 0 ? [maxIndex + 1] : []),
]);
const positional = args.filter((arg, index) => !arg.startsWith('--') && !valueIndexes.has(index));

try {
  if (providerIndex < 0 || !args[providerIndex + 1]) throw new Error('--provider <dataforseo-report.json> is required.');
  const catalog = await readJsonInput(positional[0] ?? '-');
  const provider = await readJsonInput(args[providerIndex + 1]);
  const report = mergeCandidateReports(catalog, provider, {
    maxCandidates: maxIndex >= 0 ? Number(args[maxIndex + 1]) : undefined,
  });
  const format = formatIndex >= 0 ? args[formatIndex + 1] : 'json';
  if (!['json', 'csv'].includes(format)) throw new Error('--format must be json or csv.');
  const serialized = format === 'csv' ? candidateSeedsToCsv(report) : `${JSON.stringify(report, null, 2)}\n`;
  await writeOutput(serialized, outputIndex >= 0 ? args[outputIndex + 1] : undefined);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
