#!/usr/bin/env node
import { buildDataForSeoLinkGapPlan, readJsonInput, writeOutput } from './lib.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const siteSlugIndex = args.indexOf('--site-slug');
const limitIndex = args.indexOf('--limit');
const requestCostIndex = args.indexOf('--request-cost-usd');
const rowCostIndex = args.indexOf('--row-cost-usd');
const valueIndexes = new Set([
  ...(outputIndex >= 0 ? [outputIndex + 1] : []),
  ...(siteSlugIndex >= 0 ? [siteSlugIndex + 1] : []),
  ...(limitIndex >= 0 ? [limitIndex + 1] : []),
  ...(requestCostIndex >= 0 ? [requestCostIndex + 1] : []),
  ...(rowCostIndex >= 0 ? [rowCostIndex + 1] : []),
]);
const positional = args.filter((arg, index) => !arg.startsWith('--') && !valueIndexes.has(index));

try {
  const profile = await readJsonInput(positional[0] ?? '-');
  const plan = buildDataForSeoLinkGapPlan(profile, {
    siteSlug: siteSlugIndex >= 0 ? args[siteSlugIndex + 1] : undefined,
    limit: limitIndex >= 0 ? Number(args[limitIndex + 1]) : undefined,
    requestCostUsd: requestCostIndex >= 0 ? Number(args[requestCostIndex + 1]) : undefined,
    rowCostUsd: rowCostIndex >= 0 ? Number(args[rowCostIndex + 1]) : undefined,
  });
  await writeOutput(`${JSON.stringify(plan, null, 2)}\n`, outputIndex >= 0 ? args[outputIndex + 1] : undefined);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
