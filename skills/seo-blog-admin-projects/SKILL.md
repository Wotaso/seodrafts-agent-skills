---
name: seo-blog-admin-projects
description: Connect a customer-owned website to SEODrafts, detect its real publishing stack, configure project context, and prepare secure Git, CMS, or webhook publishing.
metadata:
  version: 1.2.0
  public-source: https://raw.githubusercontent.com/Wotaso/seodrafts-agent-skills/main/skills/seo-blog-admin-projects/SKILL.md
---

# SEO Blog Admin Tenant Integration

Use this skill when a coding agent needs to connect a tenant website to Wotaso SEO Blog Admin, create or update a project, write tenant context, and prepare automated static publishing.

## Goal

Configure the tenant website so Wotaso can supply reviewed SEO content while the tenant website keeps control of rendering, routes, sitemap, styling, deployment, and CDN assets.

Choose the host's strongest publishing surface:

1. Wotaso stores research, drafts, review state, schedule, and learning.
2. Git-backed websites store final Markdown or MDX files and generated image assets in the repository.
3. No-code/CMS websites store final content as native CMS items.
4. Publishing runs through an event-driven content PR, CMS API publish, build hook, authenticated webhook, or a legacy scheduled runner.
5. The tenant website remains canonical and serves crawlable static or server-rendered pages.

## Workspace-wide requests

When the user asks to configure all projects in a SEODrafts workspace:

1. Authenticate once, then run `list-projects` before changing any repository or CMS.
2. Match every SEODrafts project to a repository, CMS, or publishing owner that is actually accessible in the current agent workspace.
3. Configure every reachable project using the strongest supported path in this skill.
4. Do not claim that an unrelated repository or external CMS was configured when it was not accessible. Report it as requiring a separate agent session or credential handoff.
5. Finish with a short per-project status: configured, already healthy, or blocked with the exact next action.

## Keep the skill and CLI current

Do this once at the start of a new setup session, not before every command:

1. If the skill is not installed yet, install the current repository version:

```sh
npx skills add Wotaso/seodrafts-agent-skills --skill seo-blog-admin-projects --agent universal --yes
```

2. If it is already installed and this setup is being resumed after seven or more days, update the project copy from the canonical GitHub repository. Re-read this file before continuing:

```sh
npx skills update seo-blog-admin-projects --project --yes
```

If the update command cannot resolve an older installation source, re-run the install command from step 1 once to migrate it to the GitHub source.

3. Only when the selected publishing path needs the tenant CLI, resolve the current published package through `npx`:

```sh
npm view @wotaso/seo-blog-admin-cli version
npx --yes @wotaso/seo-blog-admin-cli@latest --help
```

Never install the tenant CLI globally. Use `@latest` once per setup session, then keep that resolved version stable for the rest of the session. If a skill or CLI update changes instructions or generated files, stop, re-read the updated guidance, and show the user the resulting changes before proceeding.

Preferred order:

1. Managed GitHub App for Git-backed websites.
2. Legacy static runner only when the tenant cannot install the App.
3. Stable native CMS adapter for supported platforms; treat the Framer Server API adapter as beta.
4. Authenticated webhook for custom tenant publishers.
5. Hosted proxy only as a temporary demo fallback, never as the default SEO architecture.

## Hard Rules

- Treat the native navigation title as the screen title. When a screen already uses a Stack large title, do not render the same title or a renamed duplicate (for example “Insights” plus “Content performance”) again at the top of the content view.
- Use Apple Dynamic Type hierarchy for native admin UI. Avoid uppercase, letter-spaced, ultra-bold pre-titles; grouped-list section labels should be secondary footnote text and row titles should normally be regular or semibold.
- Keep the primary tab bar limited to recurring workflows. Put project administration in Settings instead of adding Research or Projects as permanent tabs.
- Do not put the publish token in an IPA, Android build, browser JavaScript, public repo, committed `.env`, or client-side code.
- When a tenant-run publisher is used, store its publish token only as a server-side environment variable or CI secret, usually `SEO_BLOG_PUBLISH_TOKEN`. The managed GitHub App does not require this repository secret.
- Do not create client-side-only SEO pages. Final pages must be static or server-rendered HTML.
- Do not overwrite existing blog files unless the user explicitly asks for a republish.
- Do not invent the blog route pattern, content directory, production URL, sitemap behavior, or framework. Read the repo first.
- Do not ask Webflow, Framer, or WordPress tenants to create GitHub Actions unless their canonical site actually deploys from a Git repository.
- Do not store Webflow, Framer, WordPress, GitHub, or CMS credentials in unencrypted repo files.
- Do not use Wotaso-hosted proxy pages as the default SEO path for tenants.
- Do not create spam backlinks, paid link schemes, fake reviews, hidden content, or doorway pages.

## Prerequisites

- Wotaso API URL:
  - Production: `https://api.seodrafts.com`
  - Local development: `http://localhost:3100`
- Internal admin token for project creation.
- Tenant publish token from project creation or token rotation only for CLI/CMS/legacy-runner paths.
- CLI:

```sh
npx --yes @wotaso/seo-blog-admin-cli@latest --help
```

Tenant repositories must use the published npm package. Do not copy `dist/index.js`, do not commit a local CLI build, and do not ask tenants to run a path from the Wotaso monorepo.

If `npx --yes @wotaso/seo-blog-admin-cli@latest --help` fails because the package is not published, stop the tenant setup and publish `@wotaso/seo-blog-admin-sdk` plus `@wotaso/seo-blog-admin-cli` first. The package release process uses npm Trusted Publishing through `.github/workflows/npm-publish.yml`; see `docs/npm-trusted-publishing.md`.

## Tenant CLI Usage

Tenants and setup agents use the CLI from npm with `npx`. They should not install or run any local JavaScript file from this repository.

Basic command shape:

```sh
npx --yes @wotaso/seo-blog-admin-cli@latest <command>
```

All later CLI examples use the unversioned package name only for readability. Execute them with the `@latest` package resolved at the start of the current setup session.

Supported tenant-facing flows:

- Create or update the Wotaso project and project context.
- Connect a Git-backed project through the managed GitHub App in the project dashboard.
- Initialize a legacy static publisher only where the managed App cannot be installed.
- Rotate the tenant-scoped publish token and store it directly as a GitHub Actions secret.
- Pull approved due posts into a static site.
- Pull approved due posts into a native CMS.
- Run a no-write payload and mapping preview before the first CMS publish.
- Report a health heartbeat from the real scheduled publisher runner.

For Git-backed tenant websites, the usual setup is **Project → Website publishing → GitHub App**: grant one repository, select it, verify the detected content and route mapping in the one-time setup PR, and merge it. No scheduled workflow or tenant publish-token secret is created.

The legacy fallback setup is:

```sh
npx --yes @wotaso/seo-blog-admin-cli init-static \
  --site-slug example \
  --site-origin https://example.com \
  --content-dir src/content/blog \
  --base-path /blog \
  --extension mdx

npx --yes @wotaso/seo-blog-admin-cli rotate-token example \
  --repo owner/repository
```

For CMS-backed tenant websites, begin with a provider-specific no-write preview. For example, Webflow uses:

```sh
SEO_BLOG_PUBLISH_TOKEN=<tenant-publish-token> \
SEO_BLOG_SITE_SLUG=example \
WEBFLOW_TOKEN=<webflow-token> \
WEBFLOW_COLLECTION_ID=<collection-id> \
npx --yes @wotaso/seo-blog-admin-cli publish-cms \
  --cms webflow \
  --site-slug example \
  --site-origin https://example.com \
  --dry-run
```

`--dry-run` reads approved due posts and builds the provider payload and field mapping without calling the CMS provider or marking posts published. It does not validate credentials or schema remotely, publish a page, or prove that the canonical route is live. If no post is due, provider-specific payload work might not run at all. Review the preview, then remove `--dry-run` only for an explicitly approved test publish and verify the rendered public route before scheduling writes.

Tenant secrets stay in the tenant's CI, server environment, CMS connector secret store, or GitHub Actions secrets. The tenant publish token is never stored in a mobile app, browser bundle, static public file, or committed repo file.

After `init-static`, the legacy tenant workflow runs daily and on manual dispatch. It stages files/assets, commits them, lets the tenant's normal host redeploy, then confirms publication only after the expected article is present in public HTML.

For CMS publishers, treat the platform API result as a publish result, not proof that the final route renders correctly. Verify the first public canonical route, metadata, and body in the tenant site. Static frontends backed by a headless CMS may still need a Vercel, Netlify, Coolify, or custom build hook after the CMS write.

## Repository Discovery

Before changing files in a tenant repo, determine:

- Production origin, for example `https://example.com`.
- Stable project slug, for example `example`.
- Real blog route pattern with `{slug}`, for example `/blog/{slug}`, `/articles/{slug}`, or `/resources/{slug}`.
- Content directory for posts, for example `src/content/blog`, `content/blog`, or `apps/website/src/content/blog`.
- File extension: `md` or `mdx`.
- Static public asset directory, usually `public/seo-assets` or `apps/website/public/seo-assets`.
- Sitemap source:
  - content-driven sitemap that reads the content directory
  - framework-native sitemap route
  - static checked-in sitemap
  - unknown/manual
- Deploy trigger:
  - deploys automatically on commits
  - requires a manual deploy command or host API
- Existing FAQ rendering and blog theme conventions.

Use `rg --files`, framework config, route files, content collections, and sitemap code. Prefer facts from code over guesses.

## Platform Decision Tree

Use this before creating files:

- Webflow: do not set up GitHub Actions. Use a native CMS adapter when available. Required facts: site ID, collection ID, required field slugs, localized collections, site publish behavior, canonical collection URL pattern.
- WordPress: use `publish-cms --cms wordpress`. Required facts: base URL, post type, author/category mapping, status policy, media upload behavior, SEO plugin conventions.
- Webflow: use `publish-cms --cms webflow`. Required facts: collection ID, field slugs, locale behavior, collection template URL pattern.
- Framer: do not set up GitHub Actions. Use `publish-cms --cms framer` on Node.js 22+ only as a beta Server API path; keep a Plugin API or reviewed export fallback when beta risk is unacceptable. Required facts: project URL, writable managed collection, typed field map, stable item IDs, publish behavior, and verified deployment result.
- Wix: use `publish-cms --cms wix`. Required facts: site ID, author member ID, Blog route, Ricos conversion and safe payload size.
- Headless CMS such as Sanity, Contentful, or Strapi: use `publish-cms` with the matching provider, then trigger a build hook only for static frontends.
- Ghost, Shopify, and HubSpot: use `publish-cms` with the matching provider when the canonical blog lives in that platform.
- Git-backed frameworks such as Astro, Next.js, Nuxt, SvelteKit, Remix, Eleventy, Hugo, Gatsby, Docusaurus, and VitePress: use GitHub App setup PR when available; otherwise use the static publisher.
- Squarespace: default to a reviewed manual handoff. Do not invent a native CLI command or request account credentials. A generic webhook is a separate connector only when the tenant already owns an authenticated publisher endpoint.
- Unknown custom systems: prefer an authenticated webhook into a tenant-owned publisher.
- No direct integration possible: recommend waiting for a native adapter or using a temporary hosted demo only with explicit SEO tradeoff disclosure.

Recommended SDK helper for product code:

```ts
import { recommendPublishingIntegration } from '@wotaso/seo-blog-admin-sdk';

const recommendation = recommendPublishingIntegration({
  framework: 'Next.js',
  hasGitRepository: true,
  canInstallGitHubApp: true,
});
```

## Project Context

Create a concise project context under 1000 characters. Include:

- What the product does.
- Target users and buyer stage.
- Core use cases.
- Strong differentiators and proof points.
- Public pages, docs, pricing, integrations, and product language that content can cite.
- Competitors and comparison constraints.
- Tone and style.
- Topics to avoid.
- Details that prevent generic AI content.

Never include secrets, private customer data, credentials, unpublished roadmap, or internal-only implementation details.

## Create Or Update Project

Authenticate once:

```sh
npx --yes @wotaso/seo-blog-admin-cli login \
  --token "$OWNER_ADMIN_TOKEN"
```

Create the project:

```sh
npx --yes @wotaso/seo-blog-admin-cli create-project https://example.com \
  --name "Example" \
  --slug example \
  --blog-path-pattern "/blog/{slug}" \
  --context-file ./seo-project-context.md
```

Update context later:

```sh
npx --yes @wotaso/seo-blog-admin-cli set-context example \
  --file ./seo-project-context.md
```

List projects:

```sh
npx --yes @wotaso/seo-blog-admin-cli list-projects
```

Use CLI login and token rotation when the tenant or setup agent needs the publish token:

```sh
npx --yes @wotaso/seo-blog-admin-cli login-password \
  --email owner@example.com \
  --password-stdin

npx --yes @wotaso/seo-blog-admin-cli rotate-token example \
  --repo owner/repository
```

Save the tenant publish token shown by project creation or token rotation. It is shown once. With `--repo`, the CLI stores it directly as the GitHub Actions secret `SEO_BLOG_PUBLISH_TOKEN` and does not print the token.

## GitHub App Setup PR Target

For Git-backed websites, the smooth SaaS version is:

1. Tenant installs the Wotaso GitHub App.
2. Wotaso detects framework, content directory, asset directory, sitemap behavior, and deploy behavior.
3. Wotaso creates a setup branch and pull request containing `seo-blog.config.json` only. It is hard-blocked from writing `.github`.
4. Tenant reviews and merges once.
5. Future approved due posts open checked content PRs. The App follows the current default branch, updates an out-of-date PR branch, stops on conflicts or failed checks, and waits for the expected production HTML after merge.

The managed path stores no long-lived GitHub token and no tenant publish token. Repository-limited installation tokens expire within one hour. Direct publishing mode is never read from a repository content edit; the authenticated workspace setting remains authoritative.

## Initialize Static Publishing

Run this inside a Git-backed tenant website repository only when the GitHub App path is unavailable:

```sh
npx --yes @wotaso/seo-blog-admin-cli init-static \
  --site-slug example \
  --site-origin https://example.com \
  --content-dir src/content/blog \
  --base-path /blog \
  --extension mdx
```

This creates:

- `seo-blog.config.json`
- `.github/workflows/seo-blog-publish.yml`

The config stores routing, content, FAQ, asset, and API settings. It does not store the publish token value.

Add a GitHub secret:

```sh
SEO_BLOG_PUBLISH_TOKEN=<tenant-publish-token>
```

Preferred for GitHub-backed sites:

```sh
npx --yes @wotaso/seo-blog-admin-cli rotate-token example \
  --repo owner/repository
```

After setup, the workflow runs daily and can be run manually. A local smoke test can use:

```sh
SEO_BLOG_PUBLISH_TOKEN=<tenant-publish-token> \
npx --yes @wotaso/seo-blog-admin-cli publish-static --dry-run
```

## Sitemap Requirements

The tenant website owns the canonical sitemap.

If the sitemap is generated from the content directory, no extra Wotaso API call is usually needed. The daily commit adds the file, the normal deploy rebuilds the sitemap, and the new URL appears.

If the sitemap is custom, add a server-side or build-time SDK merge:

```ts
import { SeoBlogPublisherClient, mergeSitemapEntries, sitemapXml } from '@wotaso/seo-blog-admin-sdk';

const client = new SeoBlogPublisherClient({
  apiUrl: process.env.SEO_BLOG_API_URL!,
  siteSlug: process.env.SEO_BLOG_SITE_SLUG!,
  publishToken: process.env.SEO_BLOG_PUBLISH_TOKEN!,
});

export async function GET() {
  const hostEntries = [
    { loc: 'https://example.com/', priority: 1 },
  ];
  const seoEntries = await client.listSitemapEntries({ limit: 1000 });

  return new Response(sitemapXml(mergeSitemapEntries([...hostEntries, ...seoEntries])), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
```

Keep sitemap fetching server-side or build-time. Never fetch with the publish token from the browser.

## FAQ And Theme Requirements

Default FAQ output should be crawlable visible HTML:

- `--faq-render details` for portable accordions.
- `--faq-render markdown` for plain Markdown.
- `--faq-render frontmatter` when the host template renders its own FAQ UI.
- `--faq-render none` only when the host intentionally skips FAQ display.

The generated details markup uses stable classes:

- `seo-blog-faq`
- `seo-blog-faq__item`
- `seo-blog-faq__question`
- `seo-blog-faq__answer`
- `seo-blog-faq--card`

Style these classes in the tenant theme. Do not rewrite the publishing pipeline just to change FAQ design.

## Generated Images And CDN

For production, always configure both:

- `assetDir`
- `assetPublicBaseUrl`

The static publisher rewrites `data:image/...` visuals into deterministic files and replaces visual URLs before Markdown/frontmatter generation. Default examples:

- `public/seo-assets`
- `https://example.com/seo-assets`

For monorepos:

- content directory: `apps/website/src/content/blog`
- asset directory: `apps/website/public/seo-assets`

The host static asset layer or CDN serves the files.

## Legacy Daily Publishing Behavior

The generated GitHub workflow:

- runs on a daily cron
- supports manual `workflow_dispatch`
- checks out the tenant repo
- runs `seo-blog-admin publish-static --config seo-blog.config.json`
- commits generated content and assets

Normal behavior:

- pulls only approved due posts
- writes only missing files
- skips existing files unless `--overwrite` is used
- does not mark a post published after the file write
- commits first, waits for deployment, verifies the expected post marker or title in public HTML, then runs `confirm-static`

If the host does not deploy on commits, add the host deploy command after the publish step.

## Edge Cache Revalidation

If the canonical landing host is proxied through Cloudflare, keep public HTML cacheable. Do not solve publishing freshness by disabling the blog cache and never use `purge_everything` for a routine article publish.

The supported post-deploy command is:

```sh
SEO_BLOG_PUBLISH_TOKEN=... \
  npx --yes @wotaso/seo-blog-admin-cli cache-revalidate --if-configured
```

`publish-static` writes a temporary publish-result manifest outside the repository. Run `cache-revalidate` only after the content commit has triggered the real host deployment. The command performs a cache-busted readiness probe, purges the new article route variants, blog index, sitemap files, `robots.txt`, and `llms.txt` by URL, then warms those URLs.

Required boundaries:

- Prefer the managed project connection: Cloudflare OAuth credentials remain encrypted in SEODrafts and the existing tenant publish token authorizes host-scoped purge requests.
- If managed OAuth is unavailable, store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` only in tenant CI/server secrets and use a zone-scoped token with only `Cache Purge`.
- Restrict the Cloudflare HTML Cache Rule to the public landing hostname and `GET`/`HEAD` requests.
- Exclude API, dashboard, login, admin, preview, checkout, and personalized hosts/routes.
- Keep query strings in the cache key so the readiness probe reaches the new origin deployment.
- Prefer `Cache-Control: public, max-age=60` for browsers and `Cloudflare-CDN-Cache-Control: public, max-age=86400, stale-while-revalidate=600, stale-if-error=86400` for public HTML when the origin can set headers.
- Keep authenticated or personalized responses `private, no-store`.
- If the host is not Cloudflare, preserve its existing CDN invalidation mechanism and document the equivalent post-deploy gate.

## Native CMS Publishing Requirements

Use this section for Webflow, Framer, WordPress, Shopify, Sanity, Contentful, Strapi, or similar CMS tenants. Do not create static publisher files unless the canonical website actually deploys from a Git repository.

Before configuring a connector, read its current entry from `https://seodrafts.com/integrations/catalog.json` and follow that entry's authentication, variables, field notes, limitations, and recovery guidance. Load only the selected connector. The provider IDs accepted by SEODrafts are `static`, `wordpress`, `webflow`, `framer`, `wix`, `contentful`, `sanity`, `strapi`, `ghost`, `shopify`, `hubspot`, `webhook`, and `squarespace`; an ID being stable does not imply that its publishing path is generally available or production-verified.

Nine CMS adapters have a stable tenant-run command shape: WordPress, Webflow, Wix, Contentful, Sanity, Strapi, Ghost, Shopify, and HubSpot. Framer uses the same command shape, but its Server API path remains beta. Start with a provider-specific no-write preview:

```sh
SEO_BLOG_PUBLISH_TOKEN=<tenant-publish-token> \
SEO_BLOG_SITE_SLUG=example \
WEBFLOW_TOKEN=<webflow-token> \
WEBFLOW_COLLECTION_ID=<collection-id> \
npx --yes @wotaso/seo-blog-admin-cli publish-cms \
  --cms webflow \
  --site-slug example \
  --site-origin https://example.com \
  --dry-run
```

Set the selected provider's credential and configuration variables before running the command. The preview renders the payload and mapping without calling the provider, validating remote credentials or schema, publishing a page, or proving a public URL. A non-dry-run calls `markPublished` only after the provider returns or confirms a canonical URL; still verify that URL in the tenant site before enabling the schedule.

### Scheduled publisher health

For CMS and webhook runners, `seo-blog.config.json` must contain the matching site identity and `cms.provider`. For the Webflow example, the relevant minimum shape is:

```json
{
  "apiUrl": "https://api.seodrafts.com",
  "siteSlug": "example",
  "siteOrigin": "https://example.com",
  "publishTokenEnv": "SEO_BLOG_PUBLISH_TOKEN",
  "cms": {
    "provider": "webflow"
  }
}
```

Run the heartbeat from the real cron or server environment, with its actual secret names and schedule declaration:

```sh
SEO_BLOG_PUBLISH_TOKEN=<tenant-publish-token> \
SEO_BLOG_SITE_SLUG=example \
SEO_BLOG_SITE_ORIGIN=https://example.com \
SEO_BLOG_SCHEDULED=true \
WEBFLOW_TOKEN=<webflow-token> \
npx --yes @wotaso/seo-blog-admin-cli health \
  --config seo-blog.config.json \
  --mode cms \
  --site-slug example \
  --site-origin https://example.com
```

This reports the runner's config, site identity, declared schedule, publish token, and presence of the configured provider credential. It does not authenticate against the provider or prove that a public page is live. Use the API's `publisherHealthNextExpectedAt` as the readiness deadline. If that field is unavailable, treat a heartbeat older than 36 hours as stale. A local manual run is diagnostic; only the real scheduled environment should declare `SEO_BLOG_SCHEDULED=true`.

### Webflow

Required tenant-run publisher behavior:

- Site token stored in tenant CI/server secrets, or OAuth stored in encrypted server-side storage for a future hosted SaaS connector.
- Tenant selects site and CMS collection.
- Field mapping validates required Webflow field slugs before publishing.
- Publisher creates or updates staged CMS items with stable Wotaso IDs or slugs.
- Publisher calls the CMS item publish endpoint and site publish flow when required.
- `markPublished` runs only after Wotaso has the final canonical collection item URL.

Environment:

- `WEBFLOW_TOKEN`
- `WEBFLOW_COLLECTION_ID`
- optional `SEO_BLOG_CMS_FIELD_MAP` or `--field-map`

### Framer

Required beta adapter behavior:

- Use managed CMS collections.
- Keep stable item IDs so repeated publishes update the same item.
- Map title, slug, excerpt, body, FAQ, images, updated date, and canonical fields.
- Treat Framer Server API as beta; prefer Plugin API or export fallback when beta risk is unacceptable.
- Confirm that collection pages render article content, FAQ, metadata, and canonical URLs visibly.

### WordPress

Required tenant-run publisher behavior:

- Store application password or OAuth credentials server-side only.
- Map post type, status, author, categories, tags, excerpt, content, slug, and media.
- Respect the tenant's SEO plugin and theme conventions.
- Usually no redeploy is required; WordPress serves the canonical URL after REST publishing.

Environment:

- `WORDPRESS_URL`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APP_PASSWORD`

### Wix

Required tenant-run publisher behavior:

- Confirm Wix Blog is installed and use an API key scoped to Blog and Ricos document management.
- Store the API key, site ID, and author member ID only in tenant CI/server secrets.
- Convert the reviewed body into Wix Rich Content instead of placing raw Markdown in a rich-content field.
- Create or update a draft by slug, then publish only after the field mapping and author context are verified.
- Treat the Wix Blog template, route, canonical tag, sitemap, and rendering as authoritative.

Environment:

- `WIX_API_KEY`
- `WIX_SITE_ID`
- `WIX_MEMBER_ID`

### Headless CMS

Required tenant-run publisher behavior:

- Map Wotaso fields into the tenant's existing content schema.
- Support locale-specific fields when the tenant site is multilingual.
- Upload or reference generated images through the tenant media/CDN layer.
- Trigger a Vercel, Netlify, Coolify, or custom build hook only when the frontend is statically generated.

Environment:

- Contentful: `CONTENTFUL_MANAGEMENT_TOKEN`, `CONTENTFUL_SPACE_ID`, `CONTENTFUL_CONTENT_TYPE`
- Sanity: `SANITY_TOKEN`, `SANITY_PROJECT_ID`, `SANITY_DATASET`
- Strapi: `STRAPI_URL`, `STRAPI_TOKEN`, `STRAPI_COLLECTION`
- optional `SEO_BLOG_CMS_FIELD_MAP` or `--field-map`

### Ghost, Shopify, HubSpot, Webhook

Use these when the canonical blog is in the platform:

- Ghost: `GHOST_ADMIN_URL`, `GHOST_ADMIN_API_KEY`
- Shopify: `SHOPIFY_SHOP`, `SHOPIFY_ADMIN_TOKEN`, `SHOPIFY_BLOG_ID`
- HubSpot: `HUBSPOT_PRIVATE_APP_TOKEN`, `HUBSPOT_CONTENT_GROUP_ID`, `HUBSPOT_AUTHOR_ID`
- Webhook: `WEBHOOK_URL`, optional `WEBHOOK_SECRET`

The webhook receiver must return `publishedUrl` or `url`. It must publish crawlable static or server-rendered pages before returning success.

### Squarespace reviewed fallback

Squarespace is not a native blog-writing provider in this workflow. Default to a reviewed manual handoff: give the approved Markdown or HTML to a human editor, let them create or update the draft in the tenant's normal Squarespace session, and verify the rendered route, metadata, assets, and canonical URL before recording completion. Do not show or run a native or optional Squarespace webhook command, request an account password, or automate the editor login. Only select the generic `webhook` connector separately when the tenant already owns an authenticated custom publisher endpoint; document it as a webhook integration, not as native Squarespace publishing.

## Acceptance Checklist

Before saying the tenant integration is finished:

- Project exists in Wotaso with correct slug, origin, blog route pattern, and context.
- The current `@wotaso/seo-blog-admin-cli` version was checked once for this setup session and is available through `npx @wotaso/seo-blog-admin-cli@latest`, or the setup is explicitly blocked until it is published.
- No repo-local CLI build, copied `dist/index.js`, npm tarball file, or Wotaso monorepo path is used inside the tenant project.
- The selected platform path is documented: managed GitHub App, legacy static publisher, native CMS adapter, or webhook.
- For Git-backed sites, `seo-blog.config.json` exists in the tenant repo.
- For managed Git-backed sites, the App is restricted to the selected repository, the setup PR is merged, and the dashboard reports the connection ready.
- Only for legacy Git-backed sites, `.github/workflows/seo-blog-publish.yml` or an equivalent CI/server job exists and `SEO_BLOG_PUBLISH_TOKEN` is configured as a CI/server secret.
- For Git-backed sites, a dry run completes without writing, or reports that there are no due posts; it is not treated as proof that a deployed route is live.
- For Cloudflare-backed Git sites, targeted post-deploy `cache-revalidate` is configured through the managed SEODrafts project connection, or explicitly reported as awaiting Cloudflare consent. Direct zone secrets are fallback-only.
- For Git-backed sites, generated content directory matches the website's blog source.
- For Git-backed sites, generated asset directory is publicly served or mapped to a CDN URL.
- For native CMS sites, the no-write payload/mapping preview is reviewed separately from remote credential and schema validation.
- For native CMS sites, an explicitly approved first write verifies idempotent item update, media handling, platform publish confirmation, and the rendered public canonical route.
- For automated CMS or webhook sites, the real scheduled runner reports a fresh health heartbeat before the integration is called ready; use `publisherHealthNextExpectedAt` or the 36-hour fallback deadline.
- For Squarespace, the reviewed manual handoff and human canonical-route verification are documented; no fake native or optional webhook command is presented.
- For tenant-run native CMS sites, platform credentials are stored only in CI/server secrets.
- For future hosted SaaS CMS connectors, platform credentials are stored only in encrypted server-side storage.
- For static headless CMS sites, the host build hook is configured and scoped to the correct project/branch.
- Sitemap behavior is verified and documented.
- FAQ rendering mode matches the tenant theme.
- No publish token, platform credential, GitHub token, OAuth grant, or CMS secret appears in client code, mobile builds, public files, logs, or committed env files.

## User-Facing Summary

When reporting back, include:

- The production URL and blog route pattern used.
- The selected publishing path and why it was selected.
- Whether the tenant uses the published npm CLI successfully, or whether npm publish/trusted-publisher setup is still blocking setup.
- The content directory and asset directory for Git-backed sites, or CMS collection/field mapping for native CMS sites.
- Where the publish token or platform credentials must be stored.
- Whether sitemap updates are automatic or require a custom SDK merge.
- How daily publishing triggers redeploys or platform publish.
- Any manual confirmation still needed.
