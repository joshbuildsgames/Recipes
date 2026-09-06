# Recipe Repository

Personal cookbook and cooking-technique reference. Recipes live as markdown files
with YAML frontmatter; a static site renders them for phone-friendly reading while cooking.

The site is built with [Eleventy](https://www.11ty.dev/) and deployed to GitHub Pages
automatically on every push to `main`.

## Running locally

```
npm install
npm run serve   # local dev server with live reload
npm run build   # build to _site/
```

## Project brief (for Claude Code)

**Goal:** a browsable recipe site, hosted on GitHub Pages, readable on a phone in the kitchen.

**Decisions already made:**
- Recipes are markdown files, not database rows. Readable and portable regardless of what renders them.
- Static site generator + GitHub Pages. No backend, no auth, no hosting cost.
- Public repo (required for free GitHub Pages).
- **Macros are out of scope for v1.** The frontmatter reserves a field; leave it empty.

**v1 scope (implemented):**
1. Static site generator (Eleventy) producing an index grouped by category, plus a page per recipe.
2. Tag-based filtering (client-side, on the index page).
3. Client-side search (matches recipe/technique titles).
4. Mobile-first layout — large tap targets, readable at arm's length, no hover-dependent UI.
5. GitHub Action (`.github/workflows/deploy.yml`) to build and deploy on push to `main`.

**Suggested v2 ideas:**
- Macro calculation
- Step-by-step "cook mode" with one step per screen
- Scaling servings
- Timers

## Directory structure

```
/recipes/<category>/<slug>.md   Recipes, grouped by main protein or type
/techniques/<slug>.md           Cooking principles and reference material
/_includes/                     Eleventy layouts (base.njk, recipe.njk)
/css/, /js/                     Site styling and client-side search/filter
index.njk                       Homepage: recipes grouped by category + techniques
.eleventy.js                    Eleventy config
.github/workflows/deploy.yml    Build + deploy to GitHub Pages on push to main
```

## Adding a recipe

Workflow: paste a screenshot or link into a Claude Code session, have it transcribe
into the frontmatter format below, drop it in the right category folder, commit.

## Frontmatter schema

```yaml
---
title: Filet Mignon with Red Wine Mushroom Sauce
category: beef
tags: [steak, pan-sauce, stainless, date-night]
cookware: [nanobond-stainless]
time_total: 60
servings: 2
source: original
rating: 5
macros:      # reserved, v2
---
```

Field notes:
- `category` matches the folder name
- `rating` 1–5, personal
- `source` a URL, a publication name, or `original`
- `time_total` in minutes, including resting and prep

## House conventions

- Temperatures in °F
- Write pan temperature targets explicitly — this cookbook is built around heat control
- Note where a step is failure-prone and why, not just what to do
- Keep personal notes in a `## Notes` section at the bottom of each recipe

## Enabling GitHub Pages (one-time)

In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. The deploy
workflow runs automatically after that on every push to `main`.
