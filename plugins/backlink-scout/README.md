# Backlink Scout

Backlink Scout is a free Codex skill from [SEODrafts](https://seodrafts.com). It builds a broad project-specific queue of at least 40 backlink candidates, verifies the strongest sources, scores each directly observed candidate with evidence, and prepares legitimate submissions.

It is deliberately not a mass link generator. It rejects paid link schemes, private blog networks, fake reviews, comment spam, irrelevant profiles, forced link exchanges, and automated cold outreach.

## What it does

- builds a project-specific opportunity search plan;
- expands a curated 88-source catalog and optional link-gap signals into as many as 150 deduplicated suggestions per project;
- optionally expands competitor link gaps through DataForSEO behind explicit local and server-side cost guards;
- researches directories, resource pages, associations, ecosystems, integrations, and editorial opportunities;
- verifies eligibility, relevance, cost, and submission requirements in a browser;
- creates deterministic JSON and CSV reports;
- prepares factual submission copy;
- submits only when the user explicitly requests that external action;
- records every attempted and completed action.

## Local deterministic tools

The scripts require Node.js 22 or newer and have no third-party dependencies.

```sh
node scripts/build-search-plan.mjs examples/project-profile.json
node scripts/expand-source-catalog.mjs examples/project-profile.json \
  --catalog catalog/source-catalog.json
node scripts/build-dataforseo-plan.mjs examples/project-profile.json
node scripts/score-opportunities.mjs examples/raw-opportunities.json \
  --output examples/scored-opportunities.json
node scripts/validate-report.mjs examples/scored-opportunities.json
node --test test/backlink-scout.test.mjs
```

Catalog entries marked `discovery_seed` are research suggestions, not verified backlinks. All quality, cost, eligibility, and link claims still need current official-page evidence. The scripts score and validate supplied observations; they do not invent authority metrics or crawl the web by themselves.

DataForSEO is optional and paid. The plan generator is local and free; the live runner refuses to execute without `--confirm-paid`, an explicit `--max-cost-usd`, a scoped SEODrafts agent token, and the API's project budget approval. Provider rows are marked as signals and still require browser verification.

## Distribution

The plugin manifest is in `.codex-plugin/plugin.json`, and the installable skill is in `skills/backlink-scout/`. The core skill is free under the MIT license. SEODrafts is an optional workflow and monitoring layer, not a requirement for local reports.

## Safety boundary

Backlink Scout can reduce research and form-filling work. It cannot guarantee a placement, a followed link, indexing, rankings, traffic, or editorial acceptance. CAPTCHAs, authentication, payments, legal attestations, and unverifiable required fields always require the user.
