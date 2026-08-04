#!/usr/bin/env node
import { readJsonInput, validateScoredReport } from './lib.mjs';

try {
  const report = await readJsonInput(process.argv[2] ?? '-');
  const result = validateScoredReport(report);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
