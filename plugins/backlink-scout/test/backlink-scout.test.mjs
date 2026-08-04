import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildSearchPlan,
  buildDataForSeoLinkGapPlan,
  candidateSeedsToCsv,
  estimateDataForSeoLinkGapCost,
  expandSourceCatalog,
  mergeCandidateReports,
  normalizeDomain,
  normalizeSeodraftsLinkGapResponse,
  reportToCsv,
  scoreOpportunities,
  validateScoredReport,
} from '../scripts/lib.mjs';

const sourceCatalog = JSON.parse(readFileSync(new URL('../catalog/source-catalog.json', import.meta.url), 'utf8'));
const linkGapFixture = JSON.parse(readFileSync(new URL('./fixtures/seodrafts-link-gap-response.json', import.meta.url), 'utf8'));

const checkedAt = '2026-08-04T10:00:00.000Z';
const projectProfile = {
  schemaVersion: 1,
  project: {
    name: 'Example SaaS',
    domain: 'https://www.example.com/',
    targetUrl: 'https://example.com/',
    category: 'content operations software',
    audiences: ['B2B content teams'],
    topics: ['editorial workflow'],
    linkableAssets: [{
      url: 'https://example.com/editorial-workflow-guide',
      topic: 'editorial workflow',
      audiences: ['B2B content teams'],
      assetType: 'guide',
    }],
    countries: ['Germany'],
    competitors: ['competitor.test'],
  },
  constraints: { freeOnly: true, maxCandidates: 20 },
};

const candidate = (overrides = {}) => ({
  sourceDomain: 'quality.example.org',
  sourcePageUrl: 'https://quality.example.org/tools',
  submissionUrl: 'https://quality.example.org/submit',
  targetUrl: 'https://example.com/editorial-workflow-guide',
  targetPageFit: 90,
  opportunityType: 'tool_collection',
  topicalRelevance: 88,
  editorialQuality: 78,
  sourceTrust: 74,
  audienceFit: 84,
  indexability: 75,
  free: true,
  linkAttribute: 'unknown',
  requiresAccount: false,
  requiresManualReview: true,
  actionChannel: 'public_form',
  effortMinutes: 10,
  requiresFounderAppearance: false,
  evidence: [{
    url: 'https://quality.example.org/submit',
    observation: 'The current public form accepts relevant content workflow tools without a listing charge.',
    checkedAt,
  }],
  riskFlags: [],
  ...overrides,
});

test('normalizes domains without retaining www or paths', () => {
  assert.equal(normalizeDomain('https://WWW.Example.COM/path'), 'example.com');
  assert.equal(normalizeDomain('not a domain'), '');
});

test('builds a bounded project-specific search plan', () => {
  const plan = buildSearchPlan(projectProfile, { generatedAt: checkedAt, maxQueries: 60 });
  assert.equal(plan.project.domain, 'example.com');
  assert.ok(plan.queries.length >= 40);
  assert.ok(plan.queries.length <= 60);
  assert.ok(plan.queries.some((item) => item.query.includes('editorial workflow')));
  assert.ok(plan.queries.some((item) => item.priorityTier === 'deep_link'));
  assert.ok(plan.queries.some((item) => item.targetUrl === 'https://example.com/editorial-workflow-guide'));
  assert.ok(plan.queries.some((item) => item.query.includes('Germany')));
  assert.equal(new Set(plan.queries.map((item) => item.query)).size, plan.queries.length);
  assert.equal(plan.discoveryTargets.uniqueCandidates, 40);
  assert.equal(plan.discoveryTargets.directlyVerified, 15);
  assert.equal(plan.constraints.maxCandidates, 40);
  assert.equal(plan.strategy.audienceSpecificTop30Minimum, 18);
  assert.equal(plan.strategy.generalDirectoryTop30Maximum, 7);
});

test('rejects cross-domain linkable assets in a project profile', () => {
  assert.throws(() => buildSearchPlan({
    ...projectProfile,
    project: {
      ...projectProfile.project,
      linkableAssets: [{ url: 'https://other.example/guide', topic: 'editorial workflow' }],
    },
  }), /must be a canonical URL on example\.com/);
});

test('expands the source catalog to at least 40 unique project candidates', () => {
  const report = expandSourceCatalog({
    ...projectProfile,
    project: { ...projectProfile.project, tags: ['b2b_saas', 'developer', 'ai_tool'] },
    constraints: { freeOnly: true, minCandidates: 40, maxCandidates: 60 },
  }, sourceCatalog, { generatedAt: checkedAt });

  assert.equal(report.summary.candidates, 60);
  assert.equal(report.summary.minimumSatisfied, true);
  assert.equal(new Set(report.candidates.map((item) => item.sourceDomain)).size, 60);
  assert.ok(report.candidates.some((item) => item.verificationStatus === 'verified'));
  assert.ok(report.candidates.some((item) => item.verificationStatus === 'discovery_seed'));
  assert.match(candidateSeedsToCsv(report), /"verificationStatus"/);
});

test('keeps niche-only AI directories out of non-AI projects and excludes paid sources', () => {
  const report = expandSourceCatalog({
    ...projectProfile,
    project: { ...projectProfile.project, category: 'iPhone photo cleaner app', tags: ['mobile_app', 'photo', 'utility'] },
    constraints: { freeOnly: true, minCandidates: 40, maxCandidates: 60 },
  }, sourceCatalog, { generatedAt: checkedAt });

  assert.equal(report.candidates.some((item) => item.id === 'theres-an-ai-for-that'), false);
  assert.equal(report.candidates.some((item) => item.id === 'betalist'), false);
  assert.ok(report.excluded.some((item) => item.id === 'betalist' && /paid/.test(item.reason)));
});

test('builds a bounded paid link-gap plan with current row-cost estimation', () => {
  const profile = {
    ...projectProfile,
    project: {
      ...projectProfile.project,
      seodraftsSiteSlug: 'example-saas',
      competitors: ['https://competitor.test/path', 'second-competitor.test'],
    },
  };
  const plan = buildDataForSeoLinkGapPlan(profile, { generatedAt: checkedAt, limit: 60 });
  assert.equal(plan.status, 'ready_awaiting_paid_confirmation');
  assert.deepEqual(plan.request.competitorUrls, ['competitor.test', 'second-competitor.test']);
  assert.equal(plan.request.limit, 60);
  assert.deepEqual(estimateDataForSeoLinkGapCost({ limit: 60 }), {
    limit: 60,
    requestCostUsd: 0.024,
    rowCostUsd: 0.000036,
    estimatedMaxCostUsd: 0.02616,
  });
  assert.equal(plan.paidConfirmationRequired, true);

  const highVolumePlan = buildDataForSeoLinkGapPlan(profile, { generatedAt: checkedAt });
  assert.equal(highVolumePlan.request.limit, 100);
  assert.equal(highVolumePlan.costGuard.estimatedMaxCostUsd, 0.0276);
});

test('DataForSEO runner keeps the plan positional argument when --api-url is omitted', () => {
  const profile = {
    ...projectProfile,
    project: { ...projectProfile.project, seodraftsSiteSlug: 'example-saas', competitors: ['competitor.test'] },
  };
  const plan = buildDataForSeoLinkGapPlan(profile, { generatedAt: checkedAt, limit: 60 });
  const tempDir = mkdtempSync(join(tmpdir(), 'backlink-scout-runner-'));
  const planPath = join(tempDir, 'plan.json');
  writeFileSync(planPath, JSON.stringify(plan));
  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../scripts/run-seodrafts-dataforseo.mjs', import.meta.url)),
      planPath,
      '--confirm-paid',
      '--max-cost-usd',
      '0.03',
    ], {
      encoding: 'utf8',
      env: { ...process.env, SEODRAFTS_AGENT_TOKEN: '' },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /SEODRAFTS_AGENT_TOKEN must contain a valid scoped agent token/);
    assert.doesNotMatch(result.stderr, /Unexpected end of JSON input|ENOENT/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('normalizes provider signals, deduplicates domains, and merges them with catalog seeds', () => {
  const profile = {
    ...projectProfile,
    project: { ...projectProfile.project, seodraftsSiteSlug: 'example-saas', competitors: ['competitor.test'] },
  };
  const plan = buildDataForSeoLinkGapPlan(profile, { generatedAt: checkedAt, limit: 60 });
  const provider = normalizeSeodraftsLinkGapResponse(linkGapFixture, plan, { generatedAt: checkedAt, maxCostUsd: 0.03 });
  assert.equal(provider.summary.rawProspects, 3);
  assert.equal(provider.summary.uniqueCandidates, 2);
  assert.equal(provider.budget.providerCostUsd, 0.024108);
  assert.ok(provider.candidates.every((item) => item.verificationStatus === 'provider_signal'));

  const missingCost = normalizeSeodraftsLinkGapResponse(
    { ...linkGapFixture, providerCostUsd: null },
    plan,
    { generatedAt: checkedAt, maxCostUsd: 0.03 }
  );
  assert.equal(missingCost.budget.providerCostUsd, null);

  const catalog = expandSourceCatalog({
    ...projectProfile,
    project: { ...projectProfile.project, tags: ['b2b_saas'] },
    constraints: { freeOnly: true, minCandidates: 40, maxCandidates: 60 },
  }, sourceCatalog, { generatedAt: checkedAt });
  const merged = mergeCandidateReports(catalog, provider, { generatedAt: checkedAt, maxCandidates: 100 });
  assert.equal(merged.summary.catalogCandidates, 60);
  assert.equal(merged.summary.providerCandidates, 2);
  assert.equal(merged.summary.providerOnly, 2);
  assert.equal(merged.summary.combinedUnique, 62);
});

test('qualifies a strong free opportunity and rejects paid links', () => {
  const report = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [
      candidate(),
      candidate({
        sourceDomain: 'paid.example.net',
        sourcePageUrl: 'https://paid.example.net/links',
        submissionUrl: 'https://paid.example.net/checkout',
        free: false,
        riskFlags: ['paid_link'],
      }),
    ],
  }, { generatedAt: checkedAt });

  assert.equal(report.summary.eligible, 1);
  assert.equal(report.summary.rejected, 1);
  assert.equal(report.candidates[0].qualificationStatus, 'eligible');
  assert.equal(report.candidates[1].qualificationStatus, 'rejected');
  assert.match(report.candidates[1].qualificationReasons.join(' '), /paid_link|not free/);
  assert.deepEqual(validateScoredReport(report), { valid: true, candidates: 2, eligible: 1 });
});

test('prioritizes low-effort wins and excludes configured founder appearances', () => {
  const report = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    constraints: {
      freeOnly: true,
      maxEffortMinutes: 45,
      allowFounderAppearances: false,
      excludedActionChannels: ['podcast_guest'],
    },
    candidates: [
      candidate({ sourceDomain: 'form.example.org', actionChannel: 'public_form', effortMinutes: 10 }),
      candidate({ sourceDomain: 'email.example.org', sourcePageUrl: 'https://email.example.org/resources', submissionUrl: 'https://email.example.org/contact', actionChannel: 'editorial_email', effortMinutes: 35 }),
      candidate({ sourceDomain: 'podcast.example.org', sourcePageUrl: 'https://podcast.example.org/about', submissionUrl: 'https://podcast.example.org/contact', actionChannel: 'podcast_guest', effortMinutes: 120, requiresFounderAppearance: true }),
    ],
  }, { generatedAt: checkedAt });

  assert.equal(report.candidates[0].sourceDomain, 'form.example.org');
  assert.equal(report.candidates[0].effortBand, 'quick_win');
  assert.ok(report.candidates[0].executionScore > report.candidates[1].executionScore);
  const podcast = report.candidates.find((item) => item.sourceDomain === 'podcast.example.org');
  assert.equal(podcast.qualificationStatus, 'rejected');
  assert.match(podcast.qualificationReasons.join(' '), /podcast_guest|founder appearance/);
  assert.deepEqual(report.policy.excludedActionChannels, ['podcast_guest']);
});

test('deduplicates the same submission target and keeps the stronger observation', () => {
  const report = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [
      candidate({ topicalRelevance: 70 }),
      candidate({ sourcePageUrl: 'https://quality.example.org/another-list', topicalRelevance: 95 }),
    ],
  }, { generatedAt: checkedAt });

  assert.equal(report.summary.unique, 1);
  assert.equal(report.summary.duplicates, 1);
  assert.equal(report.candidates[0].topicalRelevance, 95);
});

test('does not penalize a useful nofollow opportunity', () => {
  const unknown = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [candidate({ linkAttribute: 'unknown' })],
  }, { generatedAt: checkedAt });
  const nofollow = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [candidate({ linkAttribute: 'nofollow' })],
  }, { generatedAt: checkedAt });
  assert.equal(nofollow.candidates[0].score, unknown.candidates[0].score);
});

test('prioritizes a strong deep-page match over a generic target', () => {
  const report = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [
      candidate(),
      candidate({
        sourceDomain: 'generic.example.net',
        sourcePageUrl: 'https://generic.example.net/tools',
        submissionUrl: 'https://generic.example.net/submit',
        targetUrl: 'https://example.com/',
        targetPageFit: 20,
      }),
    ],
  }, { generatedAt: checkedAt });

  const matched = report.candidates.find((item) => item.sourceDomain === 'quality.example.org');
  const generic = report.candidates.find((item) => item.sourceDomain === 'generic.example.net');
  assert.ok(matched.score > generic.score);
  assert.equal(matched.qualificationStatus, 'eligible');
  assert.equal(generic.qualificationStatus, 'manual_review');
  assert.match(generic.qualificationReasons.join(' '), /target page/);
});

test('requires direct dated evidence and emits spreadsheet-safe CSV', () => {
  assert.throws(() => scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [candidate({ evidence: [] })],
  }), /evidence must contain at least one/);

  const report = scoreOpportunities({
    schemaVersion: 1,
    project: { domain: 'example.com', targetUrl: 'https://example.com/' },
    candidates: [candidate()],
  }, { generatedAt: checkedAt });
  const csv = reportToCsv(report);
  assert.match(csv, /"qualificationStatus"/);
  assert.match(csv, /"eligible"/);
  assert.equal(csv.endsWith('\n'), true);
});
