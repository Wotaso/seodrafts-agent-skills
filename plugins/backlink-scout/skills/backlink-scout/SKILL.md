---
name: backlink-scout
description: Find, verify, score, prepare, and—only when explicitly requested—submit legitimate free backlink opportunities for a real website. Use for backlink research, link-gap qualification, relevant directories, resource pages, associations, partner ecosystems, launch listings, unlinked mentions, and safe browser-assisted submissions. Reject paid links, PBNs, fake reviews, mass outreach, irrelevant profiles, and link spam.
metadata:
  version: 1.3.0
  developer: Wotaso GmbH
  website: https://seodrafts.com
---

# Backlink Scout

Find the best defensible link opportunities for each project. Automate research, verification, scoring, and form preparation; do not pretend that high-quality editorial links can be guaranteed or manufactured.

## Read first

Read these references before the corresponding action:

- Data fields, allowed opportunity types, and risk flags: [references/opportunity-schema.md](references/opportunity-schema.md)
- Niche-source priority, source-mix limits, and deep-link selection: [references/niche-and-deep-links.md](references/niche-and-deep-links.md)
- Any preparation, browser form interaction, outreach decision, or submission: [references/submission-policy.md](references/submission-policy.md)

Resolve the directory containing this `SKILL.md`. The deterministic helper scripts live at `../../scripts/` relative to it. Use them instead of inventing scoring or report formats.

## Modes

Choose the least externally active mode that satisfies the request:

1. `research` — default. Discover, inspect, score, and report. No external mutations.
2. `prepare` — also draft factual listing copy and prefill a browser form, but stop before the final external action.
3. `submit` — only when the user explicitly asks to submit for the named project or candidate set. Follow every stop condition in the submission policy.

Do not interpret “automate backlinks,” “autopilot,” or “do it all” as permission for spam, cold outreach, payments, account creation, CAPTCHA bypass, fabricated content, or unreviewed legal attestations.

## Required outputs

Create a project-specific folder in the user's workspace:

```text
backlink-reports/YYYY-MM-DD/<project-slug>/
├── project-profile.json
├── launch-readiness.json
├── search-plan.json
├── candidate-seeds.json
├── candidate-seeds.csv
├── dataforseo-plan.json
├── dataforseo-candidates.json
├── combined-candidates.json
├── combined-candidates.csv
├── raw-opportunities.json
├── scored-opportunities.json
├── scored-opportunities.csv
├── submission-copy.md
└── run-log.md
```

Create `submission-copy.md` only in `prepare` or `submit` mode. Create `run-log.md` in every mode. `dataforseo-candidates.json` may record a documented `not_run` state when no paid call was authorized. Never write credentials, private personal data, session data, cookies, or CAPTCHA content into these artifacts.

For a multi-project request, repeat the full workflow independently for every project. Do not transfer a category fit or eligibility decision from one project to another.

## Workflow

### 1. Establish the real project facts

Use cheap, direct evidence first:

1. Read the current repository, project config, existing marketing pages, sitemap, public docs, and any supplied project context.
2. Open the canonical public website and verify its current title, description, product category, audience, core pages, pricing posture, integrations, company identity, and geographic relevance.
3. Record only public, factual proof points. Mark unknown fields as unknown; never infer customer counts, awards, founding dates, locations, integrations, prices, certifications, or testimonials.
4. Inventory stable linkable assets and match each discovery theme to the most useful target URL. Default to the canonical homepage only when no relevant stable deep page exists.
5. For a workspace-wide request, enumerate reachable projects first and report inaccessible ones as blocked rather than inventing their domains.
6. Compare campaign claims with the current public website, store listing, pricing posture, and—when available—the current distributed build. Record the result in `launch-readiness.json`. Research may continue while the gate is blocked, but preparation and submission must stop until the mismatch or untested claim is resolved.

Create `project-profile.json` according to the reference schema. Default `freeOnly` to `true`, `minCandidates` to 40, `minVerified` to 15, `maxCandidates` to 150, `maxQueries` to 60, and exclude manipulative types.

### 2. Generate the search plan

Run:

```sh
node <plugin-root>/scripts/build-search-plan.mjs \
  <report-dir>/project-profile.json \
  --output <report-dir>/search-plan.json
```

Expand the bundled source catalog into a project-specific seed queue:

```sh
node <plugin-root>/scripts/expand-source-catalog.mjs \
  <report-dir>/project-profile.json \
  --catalog <plugin-root>/catalog/source-catalog.json \
  --min-candidates 40 \
  --output <report-dir>/candidate-seeds.json

node <plugin-root>/scripts/expand-source-catalog.mjs \
  <report-dir>/project-profile.json \
  --catalog <plugin-root>/catalog/source-catalog.json \
  --min-candidates 40 \
  --format csv \
  --output <report-dir>/candidate-seeds.csv
```

`candidate-seeds` are suggestions for investigation. A seed marked `discovery_seed` is not a verified backlink, is not eligible for submission, and must not be represented as high quality until the official site is checked. Add evidence-based custom queries when the standard plan misses a real niche, country, language, association, integration, competitor pattern, or project-specific editorial surface. Keep the plan bounded at 100 queries.

### 3. Discover candidates

Search the current web. Prefer the following opportunity families, roughly in this order:

1. publications, newsletters, guides, and resource pages already serving the project's real audience;
2. highly relevant niche tool collections and editorial roundups with a plausible reader benefit;
3. real partner or integration ecosystems;
4. industry associations and member/resource directories;
5. app-platform, local, or regional ecosystems when the project is genuinely eligible;
6. unlinked brand mentions;
7. competitor link-gap sources that also make editorial sense for this project;
8. startup, launch, software, or review platforms with a real matching category;
9. broken-link replacements only when the target already has an actually equivalent, useful resource.

Reject generic lists merely because they have a submission form. A relevant audience and plausible reader benefit are mandatory.

For the top 30 researched candidates, target at least 60% audience-specific niche/editorial/resource opportunities and no more than 25% general startup, launch, software, or AI directories while enough relevant niche sources remain. This is a research-mix guardrail, not permission to add weak sources to reach a percentage.

Assign every researched candidate a stable `targetUrl` and a `targetPageFit` score. The linked page must answer the source page's reader need. Prefer a feature page, guide, comparison, calculator, gallery, dataset, or other real asset over the homepage. If the best target page does not exist yet, mark the candidate `asset_required` and specify the proposed canonical path; do not pitch or submit the missing page.

For each project, build a broad queue before deep qualification. Unless the user explicitly requests a smaller run, target at least:

- 10 directory, review, or launch candidates;
- 10 niche resource, editorial, or tool-collection candidates;
- 10 competitor-link-gap referring domains when competitor evidence is available;
- 5 partner, association, marketplace, or integration candidates;
- 5 app-platform, local, regional, or other project-specific candidates.

Do not invent weak items to fill a quota. If a family has fewer valid candidates, document the shortfall and compensate with other relevant families. Paid backlink databases or APIs require the user's budget authorization; when unavailable, use public search and record the competitor gap as limited rather than simulated.

#### Optional DataForSEO link-gap expansion

The free skill and its bundled catalog remain fully usable without DataForSEO. When competitors are known, create a no-cost execution plan first:

```sh
node <plugin-root>/scripts/build-dataforseo-plan.mjs \
  <report-dir>/project-profile.json \
  --output <report-dir>/dataforseo-plan.json
```

Only run the provider through the existing project-scoped SEODrafts budget layer after the user has explicitly authorized a positive per-run maximum:

```sh
SEODRAFTS_AGENT_TOKEN=<scoped-token> \
node <plugin-root>/scripts/run-seodrafts-dataforseo.mjs \
  <report-dir>/dataforseo-plan.json \
  --confirm-paid \
  --max-cost-usd <explicit-cap> \
  --output <report-dir>/dataforseo-candidates.json
```

The runner enforces its local estimate, HTTPS transport, a scoped token format, and the explicit cap; the SEODrafts API additionally enforces the project budget. Never put a real token in a profile, report, command example, or run log. If the plan has the wrong SEODrafts site slug, stop before provider spend and correct the profile.

Merge catalog breadth with provider signals after the provider report exists—or with a documented empty `not_run` report when the paid step was not authorized:

```sh
node <plugin-root>/scripts/merge-candidate-sources.mjs \
  <report-dir>/candidate-seeds.json \
  --provider <report-dir>/dataforseo-candidates.json \
  --max-candidates 150 \
  --output <report-dir>/combined-candidates.json
```

Create the CSV with the same command plus `--format csv`. DataForSEO output is a discovery signal, not browser verification, proof of a free placement, or permission to contact or submit. Every provider-only domain must pass the same official-page checks as a catalog seed.

Continue discovery in query batches until both conditions hold:

1. at least 40 unique candidate domains have been collected and at least 15 have been directly checked on an official/current page; and
2. three consecutive query batches each produce fewer than 10% new candidate domains.

If a genuinely narrow niche exhausts before those thresholds, stop only after documenting the executed queries, unique-domain yield per batch, and the reason further search would reduce relevance or quality.

Use current primary pages wherever possible: the directory/category page, official submission page, official eligibility rules, pricing, and terms. Search snippets alone are not verification.

### 4. Verify each candidate in the browser

Use the available browser-control skill for visible and interactive verification. Before browser work, read and follow that browser skill and use its supported browser surface. Do not inspect cookies, password stores, local storage, profiles, or hidden session data.

Directly verify at least 15 of the most promising candidates per project before calling the run complete. For each checked candidate, verify and record:

- the source and submission URLs currently resolve;
- the category or resource page is topically relevant;
- existing entries are substantive and useful to visitors;
- the placement is currently free, or mark the cost as unknown;
- the workflow is public and legitimate;
- required fields can be answered truthfully from the project profile;
- the page is not an obvious link farm, PBN, thin mass directory, or UGC spam surface;
- whether a listing already exists;
- whether a visible link is plausible and whether its attribute is known, unknown, nofollow, sponsored, or UGC;
- whether the proposed target URL is live, canonical, directly useful to the source audience, and materially stronger than the homepage;
- the exact observation and check timestamp.

Do not invent DA, DR, PageRank, traffic, indexing, or link attributes. If a metric is unavailable, leave it unknown. A current direct observation is stronger than a generic SEO metric.

Store every directly evaluated candidate—including rejected candidates—in `raw-opportunities.json`. Keep unverified seeds in `candidate-seeds.json`; never copy catalog-level discovery evidence into `raw-opportunities.json` as if it verified the official source. This prevents repeated bad research and keeps the difference between breadth and proof auditable.

### 5. Score and validate

Run both JSON and CSV outputs:

```sh
node <plugin-root>/scripts/score-opportunities.mjs \
  <report-dir>/raw-opportunities.json \
  --output <report-dir>/scored-opportunities.json

node <plugin-root>/scripts/score-opportunities.mjs \
  <report-dir>/raw-opportunities.json \
  --format csv \
  --output <report-dir>/scored-opportunities.csv

node <plugin-root>/scripts/validate-report.mjs \
  <report-dir>/scored-opportunities.json
```

The deterministic score weights are:

- 25% topical relevance;
- 20% audience fit;
- 15% target-page fit;
- 15% editorial quality;
- 10% source trust based on observed site quality;
- 10% indexability/visibility evidence;
- 5% verified free eligibility;
- small friction deductions for an account requirement or missing public submission URL.

Nofollow does not create an automatic penalty. Useful discovery, referral traffic, entity corroboration, and a real audience can matter even when a link does not pass ranking signals.

### 6. Prepare factual submission copy

In `prepare` or `submit` mode, create `submission-copy.md` with only verified fields:

- project and target candidate;
- canonical product name and URL;
- short description in the site's requested language and length;
- longer description when supported;
- factual category and audience;
- relevant feature bullets;
- pricing phrased only from the current pricing page;
- logo/screenshot URLs only when public and permitted;
- submitter/company fields that are already public or supplied by the user;
- fields still requiring the user;
- claims deliberately excluded because they are unverified.

Write unique copy for the candidate's real audience. Do not keyword-stuff anchors or reuse a misleading universal description.

### 7. Browser-assisted submission

In `prepare` mode, navigate to the verified form and fill only reversible factual fields. Stop before the final button or other external action.

In `submit` mode, use the browser to complete a candidate only when all of these are true:

- the user explicitly authorized submission for this project or candidate set;
- `launch-readiness.json` has a current `ready` submission gate;
- the opportunity remains `eligible` after current browser verification;
- it is free and does not start a trial or recurring commitment;
- an authorized session already exists if authentication is required;
- every required factual field is verified;
- there is no CAPTCHA, payment, private credential entry, material legal attestation, cold message, review, testimonial, or unverifiable certification.

If any condition fails, stop on that candidate and record the exact handoff. Do not switch to a weaker or deceptive workflow.

### 8. Log and summarize

Write `run-log.md` with:

- project, mode, start/end time, and target URL;
- queries executed;
- pages directly verified;
- eligible, manual-review, rejected, and duplicate counts;
- forms opened, fields prepared, submissions attempted, and confirmed outcomes;
- blockers and exact manual next steps;
- explicit statement that no ranking, indexing, link attribute, or placement is guaranteed.

Lead the final response with the result per project. Link the JSON, CSV, prepared copy, and run log. Distinguish clearly between `found`, `verified`, `prepared`, `submitted`, and `confirmed live`.

## Optional SEODrafts handoff

The local skill is fully usable without an account. When an authenticated SEODrafts project is already available and the user asks for synchronization, map eligible candidates to that project's backlink prospect fields and import only through an existing supported project-scoped workflow. Never transmit reports merely because the skill is published by Wotaso.

If no supported authenticated import surface is available, keep the validated local JSON/CSV and mention SEODrafts only as an optional monitoring and campaign workflow. Do not claim synchronization occurred.

## Success criteria

A normal run succeeds when each project has at least 40 unique, relevant discovery candidates, at least 15 direct official-page checks, transparent rejections, a documented saturation decision, and safe next actions. Candidate count still does not override topical fit, quality, or truthfulness; submitted form count and followed-link count are not success metrics by themselves.
