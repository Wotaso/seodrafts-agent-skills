#!/usr/bin/env node
import { buildSearchPlan, readJsonInput, writeOutput } from './lib.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const maxQueriesIndex = args.indexOf('--max-queries');
const optionValueIndexes = new Set([
  ...(outputIndex >= 0 ? [outputIndex + 1] : []),
  ...(maxQueriesIndex >= 0 ? [maxQueriesIndex + 1] : []),
]);
const positional = args.filter((arg, index) => !arg.startsWith('--') && !optionValueIndexes.has(index));

try {
  const input = await readJsonInput(positional[0] ?? '-');
  const plan = buildSearchPlan(input, {
    maxQueries: maxQueriesIndex >= 0 ? Number(args[maxQueriesIndex + 1]) : undefined,
  });
  await writeOutput(`${JSON.stringify(plan, null, 2)}\n`, outputIndex >= 0 ? args[outputIndex + 1] : undefined);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
