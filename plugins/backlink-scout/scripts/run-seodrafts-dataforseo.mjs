#!/usr/bin/env node
import {
  normalizeSeodraftsLinkGapResponse,
  readJsonInput,
  writeOutput,
} from './lib.mjs';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const apiUrlIndex = args.indexOf('--api-url');
const maxCostIndex = args.indexOf('--max-cost-usd');
const optionValueIndexes = new Set([
  ...(outputIndex >= 0 ? [outputIndex + 1] : []),
  ...(apiUrlIndex >= 0 ? [apiUrlIndex + 1] : []),
  ...(maxCostIndex >= 0 ? [maxCostIndex + 1] : []),
]);
const planPath = args.find((arg, index) => !arg.startsWith('--') && !optionValueIndexes.has(index));

const validApiOrigin = (value) => {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('API URL must use HTTPS; HTTP is allowed only for loopback development.');
  if (url.username || url.password || url.search || url.hash) throw new Error('API URL must not contain credentials, query parameters, or fragments.');
  return url.origin;
};

try {
  if (!args.includes('--confirm-paid')) throw new Error('Live provider work requires --confirm-paid.');
  const maxCostUsd = maxCostIndex >= 0 ? Number(args[maxCostIndex + 1]) : NaN;
  if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) throw new Error('--max-cost-usd must be a positive explicit run cap.');
  const plan = await readJsonInput(planPath ?? '-');
  if (plan.status !== 'ready_awaiting_paid_confirmation') throw new Error(`Plan is not runnable: ${plan.blockers?.join(' ') || plan.status}.`);
  const estimatedMax = Number(plan.costGuard?.estimatedMaxCostUsd ?? Infinity);
  if (!Number.isFinite(estimatedMax) || estimatedMax > maxCostUsd) {
    throw new Error(`Estimated maximum $${estimatedMax.toFixed(6)} exceeds the explicit $${maxCostUsd.toFixed(6)} run cap.`);
  }
  const token = String(process.env.SEODRAFTS_AGENT_TOKEN ?? '').trim();
  if (!/^sda_live_[A-Za-z0-9_-]{20,}$/.test(token)) throw new Error('SEODRAFTS_AGENT_TOKEN must contain a valid scoped agent token.');
  const apiOrigin = validApiOrigin(
    apiUrlIndex >= 0 ? args[apiUrlIndex + 1] : process.env.SEODRAFTS_API_URL ?? 'https://api.seodrafts.com'
  );
  const response = await fetch(`${apiOrigin}${plan.provider.endpointPath}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(plan.request),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || payload?.error || `SEODrafts link-gap request failed with HTTP ${response.status}.`);
  }
  const report = normalizeSeodraftsLinkGapResponse(payload, plan, { maxCostUsd });
  if (report.budget.providerCostUsd === null) {
    throw new Error('Provider cost was missing or unreconciled; automation remains paused pending budget review.');
  }
  if (report.budget.providerCostUsd > maxCostUsd) throw new Error('Provider-reported cost exceeded the explicit cap; automation must remain paused pending review.');
  await writeOutput(`${JSON.stringify(report, null, 2)}\n`, outputIndex >= 0 ? args[outputIndex + 1] : undefined);
} catch (error) {
  process.stderr.write(`backlink-scout: ${error.message}\n`);
  process.exitCode = 1;
}
