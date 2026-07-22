# SEODrafts Agent Skills

Official public agent skills for connecting customer-owned websites and content systems to [SEODrafts](https://seodrafts.com).

## Install

Run this inside the repository that owns the website or publishing integration:

```sh
npx skills add Wotaso/seodrafts-agent-skills --skill seo-blog-admin-projects --agent universal --yes
```

The skill is installed into the current project under `.agents/skills/`. It then guides the coding agent through repository discovery, project configuration, and the safest supported publishing setup.

## Included skills

- [`seo-blog-admin-projects`](skills/seo-blog-admin-projects/SKILL.md) — detect the real website stack, configure SEODrafts projects, and prepare Git, CMS, or webhook publishing without putting secrets in browser code or committed files.

## Updates

Update the project-local copy with:

```sh
npx skills update seo-blog-admin-projects --project --yes
```

Review skill changes before allowing an agent to make external or production changes.

## Public mirror

SEODrafts also publishes a read-only mirror at [`seodrafts.com/skills/seo-blog-admin-projects/SKILL.md`](https://seodrafts.com/skills/seo-blog-admin-projects/SKILL.md) so older installation prompts and direct links continue to work.
