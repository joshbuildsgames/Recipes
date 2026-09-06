(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    var sections = Array.prototype.slice.call(document.querySelectorAll(".category-group"));
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".collection-block"));
    var searchInput = document.getElementById("searchInput");
    var tagFiltersEl = document.getElementById("tagFilters");
    var noResults = document.getElementById("noResults");

    if (!cards.length || !searchInput || !tagFiltersEl) return;

    // Order filter chips by how many recipes carry each tag, so the most useful
    // ones sit at the front of the scrolling row.
    var tagCounts = {};
    cards.forEach(function (card) {
      (card.dataset.tags || "").split(",").filter(Boolean).forEach(function (t) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    var allTags = Object.keys(tagCounts).sort(function (a, b) {
      return tagCounts[b] - tagCounts[a] || a.localeCompare(b);
    });

    var selected = new Set();

    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "tag-filter-btn clear-btn";
    clearBtn.textContent = "Clear tags";
    clearBtn.addEventListener("click", function () {
      selected.clear();
      tagFiltersEl.querySelectorAll(".tag-filter-btn.active").forEach(function (b) {
        b.classList.remove("active");
      });
      applyFilters();
    });
    tagFiltersEl.appendChild(clearBtn);

    allTags.forEach(function (tag) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag-filter-btn";
      btn.textContent = tag;
      btn.addEventListener("click", function () {
        if (selected.has(tag)) {
          selected.delete(tag);
          btn.classList.remove("active");
        } else {
          selected.add(tag);
          btn.classList.add("active");
        }
        applyFilters();
      });
      tagFiltersEl.appendChild(btn);
    });

    function applyFilters() {
      var q = searchInput.value.trim().toLowerCase();
      var anyVisible = false;

      cards.forEach(function (card) {
        var tags = (card.dataset.tags || "").split(",").filter(Boolean);
        var title = (card.dataset.title || "").toLowerCase();
        var matchesSearch =
          !q || title.indexOf(q) !== -1 || tags.join(" ").indexOf(q) !== -1;
        var matchesTags = Array.from(selected).every(function (t) {
          return tags.indexOf(t) !== -1;
        });
        var visible = matchesSearch && matchesTags;
        card.hidden = !visible;
        if (visible) anyVisible = true;
      });

      sections.forEach(function (section) {
        var sectionHasVisible = Array.prototype.slice
          .call(section.querySelectorAll(".card"))
          .some(function (c) {
            return !c.hidden;
          });
        section.hidden = !sectionHasVisible;
      });

      blocks.forEach(function (block) {
        var blockHasVisible = Array.prototype.slice
          .call(block.querySelectorAll(".card"))
          .some(function (c) {
            return !c.hidden;
          });
        block.hidden = !blockHasVisible;
      });

      if (noResults) noResults.hidden = anyVisible;
    }

    searchInput.addEventListener("input", applyFilters);
  });
})();
