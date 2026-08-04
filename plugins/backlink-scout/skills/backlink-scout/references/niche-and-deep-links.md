# Niche-source and deep-link policy

Use this reference during search planning, candidate qualification, scoring, and final prioritization.

## Quality order

Prefer sources in this order when relevance and legitimacy are comparable:

1. An editorial page, guide, newsletter, publication, or professional resource read by the project's actual users.
2. A niche collection or app roundup whose category directly matches the product and target page.
3. A real association, integration, partner, platform, or marketplace surface.
4. A reputable app, review, launch, or software platform with a matching category.
5. A general directory that provides real discovery value and has a legitimate free workflow.

Do not use a third-party authority score to override weak topical or audience fit. A smaller relevant publication can outrank a large generic directory in the opportunity score.

## Top-30 source mix

When enough legitimate sources exist, the top 30 researched candidates should contain:

- at least 18 audience-specific niche, editorial, resource, association, partner, or integration opportunities;
- no more than 7 general startup, launch, AI-tool, app, or software directories;
- the remainder from relevant unlinked mentions, competitor-link-gap sources, local ecosystems, or other project-specific surfaces.

If the niche is narrower than this mix allows, document the shortfall. Never include an irrelevant source to satisfy a quota.

## Deep-link selection

For each candidate, choose the target in this order:

1. A live canonical page that directly answers the source page's reader need.
2. A live feature, use-case, comparison, gallery, research, guide, calculator, or free-tool page with strong contextual fit.
3. The canonical homepage only when the product as a whole is the subject or no stable relevant deep page exists.
4. A proposed new canonical page marked `asset_required`; this candidate cannot be pitched or submitted until the page is live and verified.

Record:

- `targetUrl`: the live or proposed canonical destination;
- `targetPageFit`: 0–100 based on intent match, audience usefulness, content completeness, and stability;
- `riskFlags: ["asset_required"]` when the target does not exist yet;
- evidence explaining why the target is more useful than the homepage.

Do not keyword-stuff anchor text. A factual product, feature, page-title, URL, or natural descriptive anchor is sufficient.

## Progress measurement

Track backlink work through a small group of independent signals:

- confirmed live referring domains and their change over time;
- links to priority deep pages, not only the homepage;
- Google Search Console impressions, clicks, and average position for the linked page and query cluster;
- qualified referral visits and downstream actions when analytics consent permits;
- provider authority/rank as a comparative third-party estimate, never as a Google metric or guaranteed ranking factor.

Weekly aggregate backlink snapshots are normally sufficient. Avoid daily paid scans unless a launch, migration, or incident creates a short-lived monitoring need.
