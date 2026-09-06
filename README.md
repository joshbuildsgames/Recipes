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
- Macros are recorded per serving in frontmatter and rendered on each recipe page.

**v1 scope (implemented):**
1. Static site generator (Eleventy) producing an index grouped by category, plus a page per recipe.
2. Tag-based filtering (client-side, on the index page).
3. Client-side search (matches recipe/technique titles).
4. Mobile-first layout — large tap targets, readable at arm's length, no hover-dependent UI.
5. GitHub Action (`.github/workflows/deploy.yml`) to build and deploy on push to `main`.

**Suggested v2 ideas:**
- Step-by-step "cook mode" with one step per screen
- Scaling servings
- Timers

## Directory structure

```
/recipes/<category>/<slug>.md   Recipes, grouped by main protein or type
/techniques/<slug>.md           Cooking principles and reference material
/images/                        Recipe photos
/_includes/                     Eleventy layouts (base.njk, recipe.njk)
/css/, /js/                     Site styling and client-side search/filter
index.njk                       Homepage: recipes grouped by category + techniques
.eleventy.js                    Eleventy config
.github/workflows/deploy.yml    Build + deploy to GitHub Pages on push to main
```

## Adding a recipe

Workflow: paste a screenshot or link into a Claude Code session, have it transcribe
into the frontmatter format below, drop it in the right category folder, commit.

## Adding a photo

Share the image in a Claude Code session and ask for it to be attached to a recipe.
It gets saved to `images/<slug>.jpg` and the recipe's `image:` field is set to point
at it. Photos appear as a hero image on the recipe page and a thumbnail on the index.

Doing it by hand: drop the file in `images/`, then add `image: /images/<file>` to the
recipe's frontmatter. Always write the path with a leading `/images/` — the build adds
the site's path prefix. Recipes without a photo render fine; the card is text-only.

Keep photos reasonably sized (roughly 1600px wide, under ~500KB). They are committed to
the repo, so full-resolution phone photos will bloat it quickly.

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
image: /images/filet-mignon.jpg   # optional
image_alt: Sliced filet with sauce # optional, defaults to the title
macros:
  calories: 415
  protein: 36g
  carbs: 30g
  fat: 7g
  basis: published        # or "estimated"
  serving_size: 1.5 cups  # optional
  note: Macros vary by brand.  # optional
---
```

Field notes:
- `category` matches the folder name
- `rating` 1–5, personal
- `source` a URL, a publication name, or `original`. URLs render as a clickable link
  showing the domain; `original` renders as "Original recipe"
- `time_total` in minutes, including resting and prep
- `image` / `image_alt` optional, see above
- `macros` optional. Values are free-form, so ranges like `240–280` work as well as plain
  numbers. `basis: published` means the numbers came from the recipe's source;
  `basis: estimated` marks a calculation and renders an "Estimated" badge on the page.
  Calories and protein also appear on the index cards.

## House conventions

- Temperatures in °F
- Write pan temperature targets explicitly — this cookbook is built around heat control
- Note where a step is failure-prone and why, not just what to do
- Keep personal notes in a `## Notes` section at the bottom of each recipe

## Path prefix

The site is served from `https://<user>.github.io/Recipes/`, not the domain root, so
`.eleventy.js` sets `pathPrefix: "/Recipes/"` and every internal link in a template goes
through Eleventy's `url` filter (`{{ item.url | url }}`). Writing a bare `/css/...` or
`/recipes/...` link produces a 404 on the live site.

**If the repository is ever renamed, update `pathPrefix` to match.**

## Enabling GitHub Pages (one-time)

In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. The deploy
workflow runs automatically after that on every push to `main`.
