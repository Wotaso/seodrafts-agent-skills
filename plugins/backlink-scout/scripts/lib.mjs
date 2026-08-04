import { readFile, writeFile } from 'node:fs/promises';
import { domainToASCII } from 'node:url';

export const OPPORTUNITY_TYPES = new Set([
  'niche_directory',
  'local_directory',
  'startup_directory',
  'association',
  'partner_ecosystem',
  'integration_gallery',
  'resource_page',
  'tool_collection',
  'editorial_pitch',
  'unlinked_mention',
  'broken_link_resource',
  'review_platform',
  'launch_platform',
  'other',
]);

export const HARD_RISK_FLAGS = new Set([
  'paid_link',
  'pbn',
  'link_exchange_required',
  'fake_review',
  'mass_ugc',
  'automated_outreach',
  'unrelated',
  'malware',
  'adult_or_gambling',
  'fabricated_identity',
  'captcha_bypass',
]);

const LINK_ATTRIBUTES = new Set(['dofollow', 'nofollow', 'sponsored', 'ugc', 'mixed', 'unknown']);
const ACTION_CHANNELS = new Set([
  'public_form',
  'editorial_email',
  'account_submission',
  'contact_form',
  'partner_application',
  'guest_post',
  'podcast_guest',
  'passive_earning',
  'manual_review',
]);
const QUALIFICATION_ORDER = new Map([
  ['eligible', 0],
  ['manual_review', 1],
  ['rejected', 2],
]);

const asArray = (value) => Array.isArray(value) ? value : [];
const uniqueStrings = (value) => [...new Set(asArray(value).map((item) => String(item).trim()).filter(Boolean))];
const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value))));

export const isHttpUrl = (value) => {
  try {
    const url = new URL(String(value));
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
};

export const normalizeDomain = (value) => {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return domainToASCII(url.hostname.replace(/^www\./, '')).toLowerCase();
  } catch {
    return '';
  }
};

const canonicalUrl = (value) => {
  if (!isHttpUrl(value)) return '';
  const url = new URL(String(value));
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|ref$|source$|campaign$|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString();
};

const requireObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
};

const requireProfile = (input) => {
  const payload = requireObject(input, 'Project profile');
  if (payload.schemaVersion !== 1) throw new Error('Project profile schemaVersion must be 1.');
  const project = requireObject(payload.project, 'project');
  const domain = normalizeDomain(project.domain || project.targetUrl);
  if (!domain) throw new Error('project.domain must be a valid domain.');
  if (!isHttpUrl(project.targetUrl)) throw new Error('project.targetUrl must be an absolute HTTP(S) URL.');
  if (!String(project.name ?? '').trim()) throw new Error('project.name is required.');
  if (!String(project.category ?? '').trim()) throw new Error('project.category is required.');
  return { payload, project: { ...project, domain } };
};

const quoted = (value) => `"${String(value).replaceAll('"', '').trim()}"`;

const searchableProjectTags = (project) => {
  const explicit = uniqueStrings(project.tags).map((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const haystack = [
    project.category,
    project.description,
    ...asArray(project.topics),
    ...asArray(project.audiences),
  ].join(' ').toLowerCase();
  const inferred = ['all_software', 'startup'];
  const rules = [
    ['ai_tool', /\bai\b|artificial intelligence|coding agent/],
    ['b2b_saas', /\bb2b\b|software|platform|teams|workflow|analytics|aso/],
    ['developer', /developer|coding|cli|api|github|software team/],
    ['mobile_app', /iphone|ios|mobile app|app store/],
    ['consumer_app', /iphone user|people |consumer|wellbeing|photo|tattoo/],
    ['marketing', /marketing|aso|growth|localization|seo/],
    ['design', /design|screenshot|creative|tattoo/],
    ['photo', /photo|camera roll|image/],
    ['wellbeing', /wellbeing|breakup|journaling|mental health/],
    ['analytics', /analytics|telemetry|revenue|crash/],
    ['utility', /clean|storage|utility|duplicate/],
  ];
  for (const [tag, pattern] of rules) if (pattern.test(haystack)) inferred.push(tag);
  return new Set([...explicit, ...inferred]);
};

export const buildSearchPlan = (input, options = {}) => {
  const { payload, project } = requireProfile(input);
  const category = String(project.category).trim();
  const topics = uniqueStrings(project.topics).slice(0, 5);
  const audiences = uniqueStrings(project.audiences).slice(0, 3);
  const countries = uniqueStrings(project.countries).slice(0, 3);
  const competitors = uniqueStrings(project.competitors).map(normalizeDomain).filter(Boolean).slice(0, 5);
  const linkableAssets = asArray(project.linkableAssets).map((value, index) => {
    const asset = requireObject(value, `project.linkableAssets[${index}]`);
    const url = canonicalUrl(asset.url);
    if (!url || normalizeDomain(url) !== project.domain) {
      throw new Error(`project.linkableAssets[${index}].url must be a canonical URL on ${project.domain}.`);
    }
    return {
      url,
      topic: String(asset.topic ?? '').trim() || category,
      audiences: uniqueStrings(asset.audiences),
      assetType: String(asset.assetType ?? 'resource').trim() || 'resource',
    };
  }).slice(0, 20);
  const seeds = [];
  const add = (query, opportunityType, rationale, targetUrl = project.targetUrl, priorityTier = 'supporting') => seeds.push({
    query: query.replace(/\s+/g, ' ').trim(),
    opportunityType,
    rationale,
    targetUrl: canonicalUrl(targetUrl) || project.targetUrl,
    priorityTier,
  });

  for (const topic of topics) {
    const target = linkableAssets.find((asset) => asset.topic.toLowerCase().includes(topic.toLowerCase()))?.url ?? project.targetUrl;
    add(`${quoted(topic)} magazine apps`, 'editorial_pitch', `Find publications already serving readers interested in “${topic}”.`, target, 'audience_first');
    add(`${quoted(topic)} guide recommended tools`, 'resource_page', `Find useful guides whose readers would benefit from the matched “${topic}” page.`, target, 'audience_first');
    add(`${quoted(topic)} newsletter submit resource`, 'editorial_pitch', `Find niche newsletters with a legitimate resource-suggestion path for “${topic}”.`, target, 'audience_first');
    add(`${quoted(topic)} professional resources apps`, 'resource_page', `Find professional or enthusiast resource hubs for “${topic}”.`, target, 'audience_first');
  }
  for (const audience of audiences) {
    const target = linkableAssets.find((asset) => asset.audiences.some((item) => item.toLowerCase().includes(audience.toLowerCase())))?.url ?? project.targetUrl;
    add(`${quoted(audience)} publications recommended tools`, 'editorial_pitch', `Find publications written for the actual audience “${audience}”.`, target, 'audience_first');
    add(`${quoted(audience)} guides resources apps`, 'resource_page', `Find audience resources where the matched page can help “${audience}”.`, target, 'audience_first');
    add(`${quoted(audience)} association resources`, 'association', `Find genuine audience or professional associations serving “${audience}”.`, target, 'audience_first');
  }
  for (const asset of linkableAssets) {
    add(`${quoted(asset.topic)} ${quoted(asset.assetType)} recommended`, 'resource_page', `Find pages that can cite the live ${asset.assetType} instead of the homepage.`, asset.url, 'deep_link');
    add(`${quoted(asset.topic)} intitle:resources`, 'resource_page', `Find relevant resource pages for the live target ${asset.url}.`, asset.url, 'deep_link');
    add(`${quoted(asset.topic)} intitle:"best tools"`, 'editorial_pitch', `Find editorial roundups whose intent matches the live target ${asset.url}.`, asset.url, 'deep_link');
  }

  add(`${quoted(category)} tools directory submit`, 'niche_directory', 'Find category-specific directories with a public submission workflow.');
  add(`${quoted(category)} software directory add product`, 'niche_directory', 'Find real product listings rather than generic profile pages.');
  add(`${quoted(category)} startup directory submit free`, 'startup_directory', 'Find current free startup and product listings.');
  add(`${quoted(category)} association member directory`, 'association', 'Find relevant trade or professional associations with visible member resources.');
  add(`${quoted(category)} integration partner directory`, 'partner_ecosystem', 'Find ecosystems where a real integration or partnership can be listed.');
  add(`${quoted(category)} resources recommended tools`, 'resource_page', 'Find editorial resource pages serving the project audience.');
  add(`${quoted(project.name)} -site:${project.domain}`, 'unlinked_mention', 'Find existing public brand mentions that may lack a canonical link.');
  add(`${quoted(project.name)} alternatives`, 'tool_collection', 'Find legitimate comparison collections where the product fits factually.');
  add(`${quoted(category)} "submit a tool"`, 'tool_collection', 'Find curated collections with an explicit submission route.');
  add(`${quoted(category)} "add your product"`, 'niche_directory', 'Find category directories accepting product suggestions.');
  add(`${quoted(category)} "suggest an app"`, 'niche_directory', 'Find app databases with a suggestion workflow.');
  add(`${quoted(category)} "claim your profile"`, 'review_platform', 'Find review platforms with a vendor-profile workflow.');
  add(`${quoted(category)} "vendor profile" free`, 'review_platform', 'Find free vendor profile opportunities serving category buyers.');
  add(`${quoted(category)} marketplace submit`, 'integration_gallery', 'Find relevant marketplaces and galleries.');
  add(`${quoted(category)} partner program directory`, 'partner_ecosystem', 'Find genuine partner ecosystems with public directories.');
  add(`${quoted(category)} "awesome list" github`, 'resource_page', 'Find maintained open resource lists where a factual suggestion may fit.');
  add(`${quoted(category)} intitle:resources tools`, 'resource_page', 'Find editorial resource pages rather than generic homepages.');
  add(`${quoted(category)} intitle:"best tools"`, 'editorial_pitch', 'Find current editorial tool roundups to qualify manually.');
  add(`${quoted(category)} intitle:alternatives software`, 'tool_collection', 'Find comparison pages with existing category demand.');
  add(`${quoted(category)} "submit startup"`, 'startup_directory', 'Find startup discovery platforms with a submission process.');
  add(`${quoted(category)} "launch your product"`, 'launch_platform', 'Find current product launch communities.');
  add(`${quoted(category)} community showcase submit`, 'launch_platform', 'Find community showcases with topical fit.');
  add(`${quoted(category)} association resource directory`, 'association', 'Find professional associations and resource directories.');
  add(`${quoted(category)} nonprofit resources tools`, 'resource_page', 'Find credible nonprofit resource pages when the product provides real user value.');
  add(`${quoted(category)} newsletter tools submit`, 'editorial_pitch', 'Find audience-specific newsletters with public suggestion routes.');
  add(`${quoted(project.name)} review -site:${project.domain}`, 'unlinked_mention', 'Find brand reviews and mentions that may warrant attribution correction.');
  add(`${quoted(project.name)} ${quoted(project.targetUrl)}`, 'unlinked_mention', 'Find indexed citations and duplicate listings for monitoring.');

  for (const topic of topics) {
    add(`${quoted(topic)} tools submit`, 'tool_collection', `Find curated tool pages for the project topic “${topic}”.`);
    add(`${quoted(topic)} resources software`, 'resource_page', `Find useful resource pages for “${topic}”.`);
    add(`${quoted(topic)} "add tool"`, 'tool_collection', `Find submission workflows specifically covering “${topic}”.`);
    add(`${quoted(topic)} intitle:"best apps"`, 'editorial_pitch', `Find current editorial app collections for “${topic}”.`);
    add(`${quoted(topic)} github awesome`, 'resource_page', `Find maintained GitHub resource lists for “${topic}”.`);
  }
  for (const audience of audiences) {
    add(`${quoted(audience)} recommended ${quoted(category)} tools`, 'resource_page', `Find resources written for the real audience “${audience}”.`);
    add(`${quoted(audience)} resource directory apps`, 'resource_page', `Find audience-specific resource hubs for “${audience}”.`);
    add(`${quoted(audience)} community tools showcase`, 'launch_platform', `Find communities where “${audience}” discovers tools.`);
  }
  for (const country of countries) {
    add(`${quoted(country)} ${quoted(category)} directory`, 'local_directory', `Find geographically relevant directories in ${country}.`);
    add(`${quoted(country)} ${quoted(category)} association`, 'association', `Find relevant associations in ${country}.`);
  }
  for (const competitor of competitors) {
    add(`${quoted(competitor)} ${quoted(category)} directory`, 'tool_collection', `Sample legitimate collections that already mention competitor ${competitor}.`);
    add(`${quoted(competitor)} -site:${competitor}`, 'editorial_pitch', `Find public referring pages mentioning competitor ${competitor} for a manual link-gap review.`);
    add(`${quoted(competitor)} alternatives`, 'tool_collection', `Find comparison surfaces covering competitor ${competitor}.`);
  }

  const seen = new Set();
  const maxQueries = Math.max(8, Math.min(100, Number(options.maxQueries ?? payload.constraints?.maxQueries ?? 60)));
  const queries = seeds
    .filter((item) => {
      const key = item.query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxQueries)
    .map((item, index) => ({ id: `q-${String(index + 1).padStart(3, '0')}`, ...item }));

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: {
      name: project.name,
      domain: project.domain,
      targetUrl: project.targetUrl,
      category,
    },
    constraints: {
      freeOnly: payload.constraints?.freeOnly !== false,
      maxCandidates: Math.max(40, Math.min(300, Number(payload.constraints?.maxCandidates ?? 100))),
      excludedTypes: uniqueStrings(payload.constraints?.excludedTypes),
    },
    discoveryTargets: {
      uniqueCandidates: Math.max(40, Number(payload.constraints?.minCandidates ?? 40)),
      directlyVerified: Math.max(5, Number(payload.constraints?.minVerified ?? 15)),
      saturation: {
        consecutiveLowYieldBatches: 3,
        lowYieldThreshold: 0.10,
      },
    },
    strategy: {
      audienceSpecificTop30Minimum: 18,
      generalDirectoryTop30Maximum: 7,
      homepageIsFallback: true,
      deepLinkTargets: linkableAssets,
    },
    queries,
  };
};

export const expandSourceCatalog = (profileInput, catalogInput, options = {}) => {
  const { payload, project } = requireProfile(profileInput);
  const catalog = requireObject(catalogInput, 'Source catalog');
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.sources)) {
    throw new Error('Source catalog must use schemaVersion 1 and contain a sources array.');
  }
  const projectTags = searchableProjectTags(project);
  const freeOnly = options.freeOnly ?? payload.constraints?.freeOnly ?? true;
  const maxCandidates = Math.max(40, Math.min(300, Number(options.maxCandidates ?? payload.constraints?.maxCandidates ?? 100)));
  const minCandidates = Math.max(40, Math.min(maxCandidates, Number(options.minCandidates ?? payload.constraints?.minCandidates ?? 40)));
  const seen = new Set();
  const rejected = [];
  const eligible = [];

  for (const [index, value] of catalog.sources.entries()) {
    const source = requireObject(value, `sources[${index}]`);
    const officialUrl = canonicalUrl(source.officialUrl);
    const sourceDomain = normalizeDomain(source.domain || officialUrl);
    if (!source.id || !source.name || !officialUrl || !sourceDomain) throw new Error(`sources[${index}] is missing a valid id, name, domain, or officialUrl.`);
    if (seen.has(sourceDomain)) continue;
    seen.add(sourceDomain);
    const freeStatus = ['verified_free', 'unknown', 'paid'].includes(source.freeStatus) ? source.freeStatus : 'unknown';
    if (freeOnly && freeStatus === 'paid') {
      rejected.push({ id: source.id, name: source.name, sourceDomain, reason: 'Excluded because the source is marked paid and this project is free-only.' });
      continue;
    }
    const tags = uniqueStrings(source.tags).map((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    const exclusiveTags = uniqueStrings(source.exclusiveTags).map((tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
    if (exclusiveTags.length && !exclusiveTags.some((tag) => projectTags.has(tag))) {
      rejected.push({ id: source.id, name: source.name, sourceDomain, reason: `Excluded because it is specific to ${exclusiveTags.join(', ')}.` });
      continue;
    }
    const matchedTags = tags.filter((tag) => projectTags.has(tag));
    const isGeneral = tags.includes('all_software') || tags.includes('startup');
    if (!isGeneral && matchedTags.length === 0) {
      rejected.push({ id: source.id, name: source.name, sourceDomain, reason: 'No project tag matched this niche source.' });
      continue;
    }
    const verificationStatus = source.verificationStatus === 'verified' ? 'verified' : 'discovery_seed';
    const suitabilityScore = Math.min(100,
      Number(source.basePriority ?? 45) +
      matchedTags.length * 7 +
      (verificationStatus === 'verified' ? 8 : 0) +
      (freeStatus === 'verified_free' ? 5 : 0)
    );
    eligible.push({
      id: source.id,
      name: source.name,
      sourceDomain,
      officialUrl,
      submissionUrl: canonicalUrl(source.submissionUrl),
      opportunityType: OPPORTUNITY_TYPES.has(source.opportunityType) ? source.opportunityType : 'other',
      verificationStatus,
      freeStatus,
      suitabilityScore,
      matchedTags,
      requiresAccount: source.requiresAccount === true,
      requiresManualReview: source.requiresManualReview !== false,
      rationale: String(source.rationale ?? '').trim() || `Potentially relevant ${source.opportunityType || 'listing'} source; verify the current workflow before action.`,
      evidence: asArray(source.evidence).map((item) => ({
        url: canonicalUrl(item.url),
        observation: String(item.observation ?? '').trim(),
        checkedAt: Number.isFinite(Date.parse(String(item.checkedAt ?? ''))) ? new Date(item.checkedAt).toISOString() : null,
      })).filter((item) => item.url),
    });
  }

  eligible.sort((a, b) => b.suitabilityScore - a.suitabilityScore || a.name.localeCompare(b.name));
  const candidates = eligible.slice(0, maxCandidates).map((candidate, index) => ({
    rank: index + 1,
    ...candidate,
  }));
  if (candidates.length < minCandidates) {
    throw new Error(`Only ${candidates.length} matching free/unknown candidates were found; ${minCandidates} are required. Expand the catalog or project tags.`);
  }
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: { name: project.name, domain: project.domain, targetUrl: project.targetUrl, tags: [...projectTags].sort() },
    policy: {
      freeOnly: Boolean(freeOnly),
      discoverySeedsAreNotVerifiedBacklinks: true,
      externalActionRequiresExplicitRequest: true,
    },
    summary: {
      catalogSources: catalog.sources.length,
      candidates: candidates.length,
      directlyVerifiedSeeds: candidates.filter((candidate) => candidate.verificationStatus === 'verified').length,
      discoverySeeds: candidates.filter((candidate) => candidate.verificationStatus === 'discovery_seed').length,
      excluded: rejected.length,
      minimumSatisfied: candidates.length >= minCandidates,
    },
    candidates,
    excluded: rejected,
  };
};

export const candidateSeedsToCsv = (report) => {
  const fields = ['rank', 'name', 'sourceDomain', 'opportunityType', 'suitabilityScore', 'verificationStatus', 'freeStatus', 'officialUrl', 'submissionUrl', 'matchedTags', 'requiresAccount', 'requiresManualReview', 'rationale'];
  const lines = [fields.map(csvCell).join(',')];
  for (const candidate of asArray(report.candidates)) lines.push(fields.map((field) => csvCell(candidate[field])).join(','));
  return `${lines.join('\n')}\n`;
};

export const estimateDataForSeoLinkGapCost = (options = {}) => {
  const limit = Math.max(1, Math.min(1000, Number(options.limit ?? 100)));
  const requestCostUsd = Math.max(0, Number(options.requestCostUsd ?? 0.024));
  const rowCostUsd = Math.max(0, Number(options.rowCostUsd ?? 0.000036));
  const estimatedMaxCostUsd = Number((requestCostUsd + rowCostUsd * limit).toFixed(6));
  return { limit, requestCostUsd, rowCostUsd, estimatedMaxCostUsd };
};

export const buildDataForSeoLinkGapPlan = (input, options = {}) => {
  const { project } = requireProfile(input);
  const competitors = uniqueStrings(project.competitors).map(normalizeDomain).filter(Boolean).slice(0, 20);
  const siteSlug = String(options.siteSlug ?? project.seodraftsSiteSlug ?? project.slug ?? '').trim();
  const estimate = estimateDataForSeoLinkGapCost({
    limit: options.limit ?? 100,
    requestCostUsd: options.requestCostUsd,
    rowCostUsd: options.rowCostUsd,
  });
  const blockers = [];
  if (!siteSlug) blockers.push('A SEODrafts site slug is required for the project-scoped API call.');
  if (!competitors.length) blockers.push('At least one verified competitor domain is required.');
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: {
      name: project.name,
      domain: project.domain,
      targetUrl: project.targetUrl,
      seodraftsSiteSlug: siteSlug || null,
    },
    provider: {
      name: 'dataforseo',
      operation: 'backlinks_domain_intersection_live',
      transport: 'seodrafts_budgeted_api',
      endpointPath: '/api/v1/internal/seo/backlinks/link-gap-scan',
    },
    status: blockers.length ? 'blocked' : 'ready_awaiting_paid_confirmation',
    blockers,
    paidConfirmationRequired: true,
    request: {
      siteSlug: siteSlug || null,
      competitorUrls: competitors,
      targetUrl: project.targetUrl,
      limit: Math.min(100, estimate.limit),
    },
    costGuard: {
      ...estimate,
      currency: 'USD',
      pricingCheckedAt: '2026-08-04',
      pricingSource: 'https://dataforseo.com/pricing/backlinks/backlinks',
      projectBudgetIsAlsoEnforcedServerSide: true,
    },
    outputContract: {
      providerSignalsAreNotBrowserVerification: true,
      requiresManualReview: true,
      externalSubmissionAllowed: false,
    },
  };
};

const valueFrom = (record, ...keys) => {
  for (const key of keys) if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  return undefined;
};

export const normalizeSeodraftsLinkGapResponse = (input, plan, options = {}) => {
  const response = requireObject(input, 'SEODrafts link-gap response');
  const planPayload = requireObject(plan, 'DataForSEO link-gap plan');
  const rawProspects = asArray(response.prospects);
  const seen = new Set();
  const candidates = [];
  for (const prospect of rawProspects) {
    const sourceDomain = normalizeDomain(valueFrom(prospect, 'sourceDomain', 'source_domain'));
    if (!sourceDomain || seen.has(sourceDomain)) continue;
    seen.add(sourceDomain);
    const sourcePageUrl = canonicalUrl(valueFrom(prospect, 'sourcePageUrl', 'source_page_url')) || `https://${sourceDomain}/`;
    const rawPayload = valueFrom(prospect, 'rawPayload', 'raw_payload') ?? {};
    const intersectionsCount = Number(rawPayload.intersectionsCount ?? rawPayload.intersections_count ?? 0) || 0;
    const backlinks = Number(rawPayload.backlinks ?? 0) || 0;
    const spamScore = Number(rawPayload.spamScore ?? rawPayload.spam_score ?? 0) || 0;
    const suitabilityScore = clampScore(valueFrom(prospect, 'outreachPriority', 'outreach_priority') ?? 50);
    const relevanceScore = clampScore(valueFrom(prospect, 'relevanceScore', 'relevance_score') ?? 50);
    const qualityScore = clampScore(valueFrom(prospect, 'qualityScore', 'quality_score') ?? 50);
    candidates.push({
      id: `dataforseo-${sourceDomain.replace(/[^a-z0-9]+/g, '-')}`,
      name: sourceDomain,
      sourceDomain,
      officialUrl: sourcePageUrl,
      submissionUrl: '',
      opportunityType: 'resource_page',
      verificationStatus: 'provider_signal',
      freeStatus: 'unknown',
      suitabilityScore,
      matchedTags: ['competitor_link_gap'],
      requiresAccount: false,
      requiresManualReview: true,
      rationale: String(valueFrom(prospect, 'reason') ?? '').trim() || `DataForSEO reported this domain as linking to a competitor but not the target project.`,
      providerSignals: {
        source: 'dataforseo_link_gap',
        intersectionsCount,
        backlinks,
        spamScore,
        relevanceScore,
        qualityScore,
      },
      evidence: [{
        url: sourcePageUrl,
        observation: `Provider signal only: DataForSEO reported this referring domain in a competitor link gap (${intersectionsCount} intersections; ${backlinks} backlinks; spam score ${spamScore}). The official page and outreach path have not been browser-verified.`,
        checkedAt: options.generatedAt ?? new Date().toISOString(),
        evidenceType: 'paid_provider_signal',
      }],
    });
  }
  candidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore || a.sourceDomain.localeCompare(b.sourceDomain));
  const rawProviderCostUsd = response.providerCostUsd ?? response.provider_cost_usd;
  const providerCostUsd = rawProviderCostUsd === null || rawProviderCostUsd === undefined
    ? null
    : Number(rawProviderCostUsd);
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: planPayload.project,
    provider: planPayload.provider,
    status: 'completed_provider_enrichment',
    budget: {
      maxCostUsd: Number(options.maxCostUsd ?? 0) || null,
      providerCostUsd: Number.isFinite(providerCostUsd) && providerCostUsd >= 0 ? providerCostUsd : null,
      estimate: planPayload.costGuard,
    },
    policy: {
      providerSignalsAreNotVerifiedBacklinks: true,
      externalActionRequiresExplicitRequest: true,
    },
    summary: {
      rawProspects: rawProspects.length,
      uniqueCandidates: candidates.length,
      duplicates: rawProspects.length - candidates.length,
    },
    candidates: candidates.map((candidate, index) => ({ rank: index + 1, ...candidate })),
  };
};

export const mergeCandidateReports = (seedInput, providerInput, options = {}) => {
  const seedReport = requireObject(seedInput, 'Catalog candidate report');
  const providerReport = requireObject(providerInput, 'Provider candidate report');
  const maxCandidates = Math.max(40, Math.min(300, Number(options.maxCandidates ?? 150)));
  const mergedByDomain = new Map();
  for (const candidate of asArray(seedReport.candidates)) {
    const domain = normalizeDomain(candidate.sourceDomain || candidate.officialUrl);
    if (!domain) continue;
    mergedByDomain.set(domain, { ...candidate, sourceDomain: domain, discoverySources: ['catalog'] });
  }
  let providerOnly = 0;
  let enrichedExisting = 0;
  for (const candidate of asArray(providerReport.candidates)) {
    const domain = normalizeDomain(candidate.sourceDomain || candidate.officialUrl);
    if (!domain) continue;
    const current = mergedByDomain.get(domain);
    if (current) {
      enrichedExisting += 1;
      mergedByDomain.set(domain, {
        ...current,
        suitabilityScore: Math.max(Number(current.suitabilityScore ?? 0), Number(candidate.suitabilityScore ?? 0)),
        verificationStatus: current.verificationStatus === 'verified' ? 'verified' : 'provider_signal',
        providerSignals: candidate.providerSignals,
        evidence: [...asArray(current.evidence), ...asArray(candidate.evidence)],
        discoverySources: ['catalog', 'dataforseo_link_gap'],
      });
    } else {
      providerOnly += 1;
      mergedByDomain.set(domain, { ...candidate, sourceDomain: domain, discoverySources: ['dataforseo_link_gap'] });
    }
  }
  const candidates = [...mergedByDomain.values()]
    .sort((a, b) => Number(b.suitabilityScore ?? 0) - Number(a.suitabilityScore ?? 0) || a.sourceDomain.localeCompare(b.sourceDomain))
    .slice(0, maxCandidates)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: seedReport.project,
    policy: {
      discoverySeedsAndProviderSignalsRequireDirectVerification: true,
      externalActionRequiresExplicitRequest: true,
    },
    summary: {
      catalogCandidates: asArray(seedReport.candidates).length,
      providerCandidates: asArray(providerReport.candidates).length,
      providerOnly,
      enrichedExisting,
      combinedUnique: candidates.length,
      truncated: Math.max(0, mergedByDomain.size - candidates.length),
    },
    candidates,
  };
};

const validateEvidence = (value, index) => asArray(value).map((item, evidenceIndex) => {
  const evidence = requireObject(item, `candidates[${index}].evidence[${evidenceIndex}]`);
  if (!isHttpUrl(evidence.url)) throw new Error(`candidates[${index}].evidence[${evidenceIndex}].url must be an absolute HTTP(S) URL.`);
  if (String(evidence.observation ?? '').trim().length < 20) {
    throw new Error(`candidates[${index}].evidence[${evidenceIndex}].observation must contain at least 20 characters.`);
  }
  if (!Number.isFinite(Date.parse(String(evidence.checkedAt ?? '')))) {
    throw new Error(`candidates[${index}].evidence[${evidenceIndex}].checkedAt must be an ISO date.`);
  }
  return {
    url: canonicalUrl(evidence.url),
    observation: String(evidence.observation).trim(),
    checkedAt: new Date(evidence.checkedAt).toISOString(),
  };
});

const normalizeRawCandidate = (value, index, projectDomain, projectTargetUrl) => {
  const candidate = requireObject(value, `candidates[${index}]`);
  const sourcePageUrl = canonicalUrl(candidate.sourcePageUrl);
  if (!sourcePageUrl) throw new Error(`candidates[${index}].sourcePageUrl must be an absolute HTTP(S) URL.`);
  const sourceDomain = normalizeDomain(candidate.sourceDomain || sourcePageUrl);
  if (!sourceDomain) throw new Error(`candidates[${index}].sourceDomain must be a valid domain.`);
  const opportunityType = String(candidate.opportunityType ?? 'other');
  if (!OPPORTUNITY_TYPES.has(opportunityType)) throw new Error(`candidates[${index}].opportunityType is unsupported.`);
  const scores = {};
  for (const field of ['topicalRelevance', 'editorialQuality', 'sourceTrust', 'audienceFit', 'indexability']) {
    if (!Number.isFinite(Number(candidate[field]))) throw new Error(`candidates[${index}].${field} must be a number from 0 to 100.`);
    scores[field] = clampScore(candidate[field]);
  }
  const linkAttribute = LINK_ATTRIBUTES.has(candidate.linkAttribute) ? candidate.linkAttribute : 'unknown';
  const evidence = validateEvidence(candidate.evidence, index);
  if (!evidence.length) throw new Error(`candidates[${index}].evidence must contain at least one current observation.`);
  const riskFlags = uniqueStrings(candidate.riskFlags).map((flag) => flag.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const targetUrl = canonicalUrl(candidate.targetUrl || projectTargetUrl);
  if (!targetUrl || normalizeDomain(targetUrl) !== projectDomain) {
    throw new Error(`candidates[${index}].targetUrl must be a canonical URL on ${projectDomain}.`);
  }
  const targetPageFit = candidate.targetPageFit === undefined
    ? 50
    : Number.isFinite(Number(candidate.targetPageFit))
      ? clampScore(candidate.targetPageFit)
      : NaN;
  if (!Number.isFinite(targetPageFit)) throw new Error(`candidates[${index}].targetPageFit must be a number from 0 to 100.`);
  const actionChannel = ACTION_CHANNELS.has(candidate.actionChannel)
    ? candidate.actionChannel
    : candidate.opportunityType === 'editorial_pitch'
      ? 'editorial_email'
      : candidate.requiresAccount === true
        ? 'account_submission'
        : candidate.submissionUrl
          ? 'public_form'
          : 'manual_review';
  const effortMinutes = candidate.effortMinutes === undefined
    ? 30
    : Number.isFinite(Number(candidate.effortMinutes))
      ? Math.max(0, Math.min(10_080, Math.round(Number(candidate.effortMinutes))))
      : NaN;
  if (!Number.isFinite(effortMinutes)) throw new Error(`candidates[${index}].effortMinutes must be a number from 0 to 10080.`);
  return {
    ...candidate,
    ...scores,
    sourceDomain,
    sourcePageUrl,
    submissionUrl: canonicalUrl(candidate.submissionUrl),
    opportunityType,
    linkAttribute,
    free: candidate.free === true ? true : candidate.free === false ? false : null,
    existingLink: candidate.existingLink === true,
    requiresAccount: candidate.requiresAccount === true,
    requiresManualReview: candidate.requiresManualReview !== false,
    evidence,
    riskFlags,
    targetUrl,
    targetPageFit,
    actionChannel,
    effortMinutes,
    requiresFounderAppearance: candidate.requiresFounderAppearance === true,
    sameDomainAsProject: sourceDomain === projectDomain || sourceDomain.endsWith(`.${projectDomain}`),
  };
};

const scoreCandidate = (candidate, constraints) => {
  const freeOnly = constraints.freeOnly;
  const hardRisks = candidate.riskFlags.filter((flag) => HARD_RISK_FLAGS.has(flag));
  const unknownRisks = candidate.riskFlags.filter((flag) => !HARD_RISK_FLAGS.has(flag));
  const reasons = [];
  let hardReject = false;

  if (candidate.sameDomainAsProject) {
    hardReject = true;
    reasons.push('The source belongs to the target project, so it is not an external backlink opportunity.');
  }
  if (candidate.existingLink) {
    hardReject = true;
    reasons.push('A link already exists; keep it for monitoring rather than a new submission.');
  }
  if (hardRisks.length) {
    hardReject = true;
    reasons.push(`Hard-rejection risk: ${hardRisks.join(', ')}.`);
  }
  if (freeOnly && candidate.free === false) {
    hardReject = true;
    reasons.push('The opportunity is not free.');
  }
  if (candidate.topicalRelevance < 40 || candidate.audienceFit < 35) {
    hardReject = true;
    reasons.push('Topical relevance or audience fit is too weak.');
  }
  if (constraints.excludedActionChannels.has(candidate.actionChannel)) {
    hardReject = true;
    reasons.push(`The configured campaign excludes the ${candidate.actionChannel} action channel.`);
  }
  if (!constraints.allowFounderAppearances && candidate.requiresFounderAppearance) {
    hardReject = true;
    reasons.push('The configured campaign excludes opportunities that require a founder appearance.');
  }

  const baseScore =
    candidate.topicalRelevance * 0.25 +
    candidate.audienceFit * 0.20 +
    candidate.targetPageFit * 0.15 +
    candidate.editorialQuality * 0.15 +
    candidate.sourceTrust * 0.10 +
    candidate.indexability * 0.10 +
    (candidate.free === true ? 100 : 35) * 0.05;
  const frictionPenalty = (candidate.requiresAccount ? 2 : 0) + (!candidate.submissionUrl ? 3 : 0);
  const score = clampScore(baseScore - frictionPenalty);
  const effortPenalty = Math.min(20, Math.round(candidate.effortMinutes / 30) * 2);
  const executionScore = clampScore(score - effortPenalty);
  const exceedsEffortLimit = constraints.maxEffortMinutes !== null && candidate.effortMinutes > constraints.maxEffortMinutes;

  let qualificationStatus = 'manual_review';
  if (hardReject || score < 45) qualificationStatus = 'rejected';
  else if (
    score >= 65 &&
    candidate.free === true &&
    candidate.topicalRelevance >= 50 &&
    candidate.editorialQuality >= 40 &&
    candidate.sourceTrust >= 40 &&
    candidate.audienceFit >= 45 &&
    candidate.targetPageFit >= 45 &&
    candidate.indexability >= 40 &&
    unknownRisks.length === 0
  ) qualificationStatus = 'eligible';

  if (!hardReject && candidate.free === null) reasons.push('Free eligibility is not yet verified.');
  if (!hardReject && !candidate.submissionUrl) reasons.push('No current public submission workflow was verified.');
  if (!hardReject && candidate.targetPageFit < 45) reasons.push('The proposed target page is not yet a strong enough match for the source audience and intent.');
  if (!hardReject && exceedsEffortLimit) reasons.push(`Estimated effort (${candidate.effortMinutes} minutes) exceeds the configured ${constraints.maxEffortMinutes}-minute low-effort limit.`);
  if (unknownRisks.length) reasons.push(`Unknown risk flags require review: ${unknownRisks.join(', ')}.`);
  if (!reasons.length) reasons.push('Current evidence meets the configured relevance, audience, target-page fit, quality, trust, indexability, and free-placement thresholds.');

  if (qualificationStatus === 'eligible' && exceedsEffortLimit) qualificationStatus = 'manual_review';

  const priority = qualificationStatus === 'rejected'
    ? 'excluded'
    : executionScore >= 80
      ? 'P0'
      : executionScore >= 70
        ? 'P1'
        : executionScore >= 60
          ? 'P2'
          : 'research';
  const effortBand = candidate.effortMinutes <= 15 ? 'quick_win' : candidate.effortMinutes <= 45 ? 'low' : candidate.effortMinutes <= 120 ? 'medium' : 'high';

  const { sameDomainAsProject: _sameDomainAsProject, ...cleanCandidate } = candidate;
  return { ...cleanCandidate, score, executionScore, effortBand, qualificationStatus, priority, qualificationReasons: reasons };
};

const duplicateKey = (candidate) => {
  const url = candidate.submissionUrl || candidate.sourcePageUrl;
  return `${candidate.sourceDomain}|${candidate.opportunityType}|${url}`;
};

export const scoreOpportunities = (input, options = {}) => {
  const payload = requireObject(input, 'Opportunity report');
  if (payload.schemaVersion !== 1) throw new Error('Opportunity report schemaVersion must be 1.');
  const project = requireObject(payload.project, 'project');
  const projectDomain = normalizeDomain(project.domain || project.targetUrl);
  if (!projectDomain) throw new Error('project.domain must be a valid domain.');
  if (!isHttpUrl(project.targetUrl)) throw new Error('project.targetUrl must be an absolute HTTP(S) URL.');
  if (!Array.isArray(payload.candidates)) throw new Error('candidates must be an array.');

  const freeOnly = options.freeOnly ?? payload.constraints?.freeOnly ?? true;
  const maxEffortValue = options.maxEffortMinutes ?? payload.constraints?.maxEffortMinutes;
  const maxEffortMinutes = maxEffortValue === undefined || maxEffortValue === null
    ? null
    : Math.max(0, Math.min(10_080, Math.round(Number(maxEffortValue))));
  if (maxEffortMinutes !== null && !Number.isFinite(maxEffortMinutes)) throw new Error('constraints.maxEffortMinutes must be a number from 0 to 10080.');
  const excludedActionChannels = new Set(uniqueStrings(options.excludedActionChannels ?? payload.constraints?.excludedActionChannels));
  for (const channel of excludedActionChannels) {
    if (!ACTION_CHANNELS.has(channel)) throw new Error(`constraints.excludedActionChannels contains unsupported channel: ${channel}.`);
  }
  const allowFounderAppearances = options.allowFounderAppearances ?? payload.constraints?.allowFounderAppearances ?? true;
  const constraints = { freeOnly, maxEffortMinutes, excludedActionChannels, allowFounderAppearances };
  const scored = payload.candidates.map((candidate, index) => scoreCandidate(
    normalizeRawCandidate(candidate, index, projectDomain, project.targetUrl),
    constraints
  ));
  const winners = new Map();
  const duplicates = [];
  for (const candidate of scored) {
    const key = duplicateKey(candidate);
    const current = winners.get(key);
    if (!current || candidate.score > current.score) {
      if (current) duplicates.push({ sourceDomain: current.sourceDomain, sourcePageUrl: current.sourcePageUrl, keptUrl: candidate.sourcePageUrl, reason: 'Lower-scoring duplicate.' });
      winners.set(key, candidate);
    } else {
      duplicates.push({ sourceDomain: candidate.sourceDomain, sourcePageUrl: candidate.sourcePageUrl, keptUrl: current.sourcePageUrl, reason: 'Lower-scoring duplicate.' });
    }
  }

  const candidates = [...winners.values()].sort((a, b) => {
    const statusDelta = QUALIFICATION_ORDER.get(a.qualificationStatus) - QUALIFICATION_ORDER.get(b.qualificationStatus);
    return statusDelta || b.executionScore - a.executionScore || b.score - a.score || a.sourceDomain.localeCompare(b.sourceDomain);
  });
  const summary = {
    researched: payload.candidates.length,
    unique: candidates.length,
    eligible: candidates.filter((candidate) => candidate.qualificationStatus === 'eligible').length,
    manualReview: candidates.filter((candidate) => candidate.qualificationStatus === 'manual_review').length,
    rejected: candidates.filter((candidate) => candidate.qualificationStatus === 'rejected').length,
    duplicates: duplicates.length,
  };

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    project: { ...project, domain: projectDomain },
    policy: {
      mode: 'white_hat_free_only',
      freeOnly: Boolean(freeOnly),
      maxEffortMinutes,
      excludedActionChannels: [...excludedActionChannels],
      allowFounderAppearances: Boolean(allowFounderAppearances),
      externalActionRequiresExplicitRequest: true,
      guarantees: [],
    },
    summary,
    candidates,
    duplicates,
  };
};

export const validateScoredReport = (input) => {
  const report = requireObject(input, 'Scored report');
  const errors = [];
  if (report.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!Number.isFinite(Date.parse(String(report.generatedAt ?? '')))) errors.push('generatedAt must be an ISO date.');
  if (!normalizeDomain(report.project?.domain)) errors.push('project.domain must be valid.');
  if (!isHttpUrl(report.project?.targetUrl)) errors.push('project.targetUrl must be an absolute HTTP(S) URL.');
  if (!Array.isArray(report.candidates)) errors.push('candidates must be an array.');
  for (const [index, candidate] of asArray(report.candidates).entries()) {
    if (!normalizeDomain(candidate.sourceDomain)) errors.push(`candidates[${index}].sourceDomain is invalid.`);
    if (!isHttpUrl(candidate.sourcePageUrl)) errors.push(`candidates[${index}].sourcePageUrl is invalid.`);
    if (!isHttpUrl(candidate.targetUrl) || normalizeDomain(candidate.targetUrl) !== normalizeDomain(report.project?.domain)) errors.push(`candidates[${index}].targetUrl must be on the project domain.`);
    if (!Number.isFinite(candidate.targetPageFit) || candidate.targetPageFit < 0 || candidate.targetPageFit > 100) errors.push(`candidates[${index}].targetPageFit must be 0–100.`);
    if (!OPPORTUNITY_TYPES.has(candidate.opportunityType)) errors.push(`candidates[${index}].opportunityType is unsupported.`);
    if (!['eligible', 'manual_review', 'rejected'].includes(candidate.qualificationStatus)) errors.push(`candidates[${index}].qualificationStatus is invalid.`);
    if (!Number.isFinite(candidate.score) || candidate.score < 0 || candidate.score > 100) errors.push(`candidates[${index}].score must be 0–100.`);
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) errors.push(`candidates[${index}].evidence must not be empty.`);
    if (!Array.isArray(candidate.qualificationReasons) || candidate.qualificationReasons.length === 0) errors.push(`candidates[${index}].qualificationReasons must not be empty.`);
  }
  if (errors.length) throw new Error(`Invalid scored report:\n- ${errors.join('\n- ')}`);
  return {
    valid: true,
    candidates: report.candidates.length,
    eligible: report.candidates.filter((candidate) => candidate.qualificationStatus === 'eligible').length,
  };
};

const csvCell = (value) => {
  const raw = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll('"', '""')}"`;
};

export const reportToCsv = (report) => {
  validateScoredReport(report);
  const fields = [
    'priority',
    'qualificationStatus',
    'score',
    'executionScore',
    'effortBand',
    'effortMinutes',
    'actionChannel',
    'requiresFounderAppearance',
    'sourceDomain',
    'opportunityType',
    'sourcePageUrl',
    'submissionUrl',
    'targetUrl',
    'targetPageFit',
    'free',
    'linkAttribute',
    'topicalRelevance',
    'editorialQuality',
    'sourceTrust',
    'audienceFit',
    'indexability',
    'requiresAccount',
    'requiresManualReview',
    'riskFlags',
    'qualificationReasons',
  ];
  const lines = [fields.map(csvCell).join(',')];
  for (const candidate of report.candidates) lines.push(fields.map((field) => csvCell(candidate[field])).join(','));
  return `${lines.join('\n')}\n`;
};

export const readJsonInput = async (path) => {
  const text = path && path !== '-'
    ? await readFile(path, 'utf8')
    : await new Promise((resolve, reject) => {
        let buffer = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { buffer += chunk; });
        process.stdin.on('end', () => resolve(buffer));
        process.stdin.on('error', reject);
      });
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Input is not valid JSON: ${error.message}`);
  }
};

export const writeOutput = async (value, path) => {
  if (path) await writeFile(path, value, 'utf8');
  else process.stdout.write(value);
};
