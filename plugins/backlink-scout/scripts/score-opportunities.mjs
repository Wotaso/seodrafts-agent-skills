#!/usr/bin/env node
import { readJsonInput, reportToCsv, scoreOpportunities, writeOutput } from './lib.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const formatIndex = args.indexOf('--format');
const format = formatIndex >= 0 ? args[formatIndex + 1] : 'json';
const optionValueIndexes = new Set([
  ...(outputIndex >= 0 ? [outputIndex + 1] : []),
  ...(formatIndex >= 0 ? [formatIndex + 1] : []),
]);
const positional = args.filter((arg, index) => !arg.startsWith('--') && !optionValueIndexes.has(index));

try {
  if (!['json', 'csv'].includes(format)) throw new Error('--format must be json or csv.');
  const input = await readJsonInput(positional[0] ?? '-');
  const report = scoreOpportunities(input);
  const value = format === 'csv' ? reportToCsv(report) : `${JSON.stringify(report, null, 2)}\n`;
  await writeOutput(value, outputIndex >= 0 ? args[outputIndex + 1] : undefined);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
