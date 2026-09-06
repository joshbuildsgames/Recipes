const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");

  eleventyConfig.setLibrary("md", markdownIt({ html: true, linkify: true }));

  eleventyConfig.addCollection("recipe", (api) =>
    api.getFilteredByGlob("recipes/**/*.md")
  );
  eleventyConfig.addCollection("technique", (api) =>
    api.getFilteredByGlob("techniques/**/*.md")
  );

  // Categories appear in this order; anything else falls in alphabetically after.
  const CATEGORY_ORDER = [
    "shakes",
    "breakfast",
    "meal-prep",
    "beef",
    "chicken",
    "turkey",
    "seafood",
    "drinks",
  ];

  // Groups a collection into { category: [items] }, each group sorted by title.
  eleventyConfig.addFilter("groupByCategory", (collection) => {
    const groups = {};
    (collection || []).forEach((item) => {
      const cat = item.data.category || "uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    Object.values(groups).forEach((items) =>
      items.sort((a, b) => (a.data.title || "").localeCompare(b.data.title || ""))
    );

    const rank = (cat) => {
      const i = CATEGORY_ORDER.indexOf(cat);
      return i === -1 ? CATEGORY_ORDER.length : i;
    };
    const ordered = {};
    Object.keys(groups)
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .forEach((cat) => {
        ordered[cat] = groups[cat];
      });
    return ordered;
  });

  // "meal-prep" -> "Meal prep"
  eleventyConfig.addFilter("categoryName", (cat) => {
    const s = String(cat || "").replace(/-/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  eleventyConfig.addFilter("sortByTitle", (collection) =>
    [...(collection || [])].sort((a, b) =>
      (a.data.title || "").localeCompare(b.data.title || "")
    )
  );

  // Source files repeat their title as a leading `# Heading`; the layout already
  // renders the title from frontmatter.
  eleventyConfig.addFilter("stripLeadingH1", (html) =>
    String(html || "").replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "")
  );

  // `source` may be a URL, a publication name, or "original".
  eleventyConfig.addFilter("isUrl", (value) =>
    /^https?:\/\//i.test(String(value || ""))
  );

  // Shortens a source URL to its domain for display.
  eleventyConfig.addFilter("displayUrl", (value) => {
    try {
      return new URL(String(value)).hostname.replace(/^www\./, "");
    } catch {
      return value;
    }
  });

  return {
    // The site is served from https://<user>.github.io/Recipes/, so every
    // internal link must go through the `url` filter to pick this up.
    pathPrefix: "/Recipes/",
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    templateFormats: ["md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
