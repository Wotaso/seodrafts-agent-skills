# Opportunity data contract

Use schema version `1` for profiles and opportunity reports.

## Project profile

```json
{
  "schemaVersion": 1,
  "project": {
    "name": "Example",
    "domain": "example.com",
    "targetUrl": "https://example.com/",
    "seodraftsSiteSlug": "example",
    "category": "B2B SaaS",
    "description": "A factual one-sentence description.",
    "audiences": ["content teams"],
    "topics": ["SEO operations"],
    "tags": ["b2b_saas", "marketing"],
    "locales": ["en-US"],
    "countries": ["US"],
    "competitors": []
  },
  "constraints": {
    "freeOnly": true,
    "minCandidates": 40,
    "minVerified": 15,
    "maxCandidates": 100,
    "maxQueries": 60,
    "excludedTypes": ["paid_link", "mass_ugc", "link_exchange"]
  }
}
```

## Launch-readiness gate

`launch-readiness.json` records the current website/store/build claim audit. Its `submissionGate.status` is either `ready` or a specific `blocked_*` value, with evidence, prohibited claims, and exact unblock conditions. A blocked gate does not stop research or candidate discovery. It does stop copy preparation that repeats the disputed claim and every external submission.

## Candidate seed report

`candidate-seeds.json` is the broad discovery queue. It contains `verificationStatus` (`verified` or `discovery_seed`), `freeStatus` (`verified_free`, `unknown`, or `paid`), project tag matches, official URLs, and catalog evidence. Catalog evidence proves only why a source entered the research queue; it does not replace direct verification of the source's official submission page.

Never pass `discovery_seed` entries directly to browser submission or the deterministic opportunity scorer. First check the official source, add current project-specific evidence, and convert the result to the raw research schema below.

## Provider enrichment reports

`dataforseo-plan.json` contains the project-scoped request, pricing snapshot, estimated maximum, and paid-confirmation requirement. `dataforseo-candidates.json` contains either a documented `not_run` state or normalized provider results. A provider candidate uses `verificationStatus: "provider_signal"`, `freeStatus: "unknown"`, and `requiresManualReview: true`.

`combined-candidates.json` deduplicates catalog and provider candidates by normalized source domain. Provider metrics are retained as discovery evidence only. They must never be renamed as direct verification, eligibility, DA/DR, guaranteed authority, or a live backlink.

## Raw research report

```json
{
  "schemaVersion": 1,
  "project": {
    "domain": "example.com",
    "targetUrl": "https://example.com/"
  },
  "candidates": [
    {
      "sourceDomain": "directory.example",
      "sourcePageUrl": "https://directory.example/category",
      "submissionUrl": "https://directory.example/submit",
      "opportunityType": "niche_directory",
      "topicalRelevance": 80,
      "editorialQuality": 70,
      "sourceTrust": 65,
      "audienceFit": 75,
      "indexability": 80,
      "free": true,
      "linkAttribute": "unknown",
      "requiresAccount": true,
      "requiresManualReview": true,
      "evidence": [
        {
          "url": "https://directory.example/submit",
          "observation": "The current public submission page accepts products in this category at no charge.",
          "checkedAt": "2026-08-04T10:00:00.000Z"
        }
      ],
      "riskFlags": []
    }
  ]
}
```

Scores are observations on a 0–100 scale, not third-party domain authority metrics. Do not label them DR, DA, PageRank, or a search-engine ranking factor.

Allowed `opportunityType` values:

- `niche_directory`
- `local_directory`
- `startup_directory`
- `association`
- `partner_ecosystem`
- `integration_gallery`
- `resource_page`
- `tool_collection`
- `editorial_pitch`
- `unlinked_mention`
- `broken_link_resource`
- `review_platform`
- `launch_platform`
- `other`

Common hard-rejection `riskFlags`:

- `paid_link`
- `pbn`
- `link_exchange_required`
- `fake_review`
- `mass_ugc`
- `automated_outreach`
- `unrelated`
- `malware`
- `adult_or_gambling`
- `fabricated_identity`
- `captcha_bypass`

The scorer preserves unknown flags but treats them as requiring manual review.
