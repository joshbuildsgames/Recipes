/*
 * Favorites and hidden recipes are stored in this browser's localStorage, keyed by
 * the recipe's URL. They are per-device: they do not sync between your phone and
 * laptop, and clearing site data clears them.
 */
(function () {
  var FAV_KEY = "recipebox:favorites";
  var HIDDEN_KEY = "recipebox:hidden";

  function load(key) {
    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      return new Set();
    }
  }

  function save(key, set) {
    try {
      window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (e) {
      /* private mode or storage disabled — the page still works, just without memory */
    }
  }

  function toggle(set, key, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
    save(key, set);
  }

  var favorites = load(FAV_KEY);
  var hidden = load(HIDDEN_KEY);

  // Re-read storage and repaint. Navigating back from a recipe page usually restores
  // the homepage from the back/forward cache, which does NOT re-run scripts — so
  // without this the page would still show the state it had when you left it.
  var rerender = function () {};

  function refreshFromStorage() {
    favorites = load(FAV_KEY);
    hidden = load(HIDDEN_KEY);
    rerender();
  }

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) refreshFromStorage();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refreshFromStorage();
  });

  document.addEventListener("DOMContentLoaded", function () {
    var isIndex = !!document.getElementById("searchInput");
    if (isIndex) initIndex();
    else initDetail();
  });

  /* ---------- Recipe detail page ---------- */

  function initDetail() {
    var article = document.querySelector(".detail[data-key]");
    if (!article) return;
    var key = article.dataset.key;

    var favBtn = article.querySelector(".js-fav");
    var hideBtn = article.querySelector(".js-hide");

    function sync() {
      if (favBtn) {
        var fav = favorites.has(key);
        favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
        favBtn.classList.toggle("is-on", fav);
        favBtn.querySelector(".btn-label").textContent = fav ? "Favorited" : "Favorite";
      }
      if (hideBtn) {
        var isHidden = hidden.has(key);
        hideBtn.classList.toggle("is-on", isHidden);
        hideBtn.querySelector(".btn-label").textContent = isHidden
          ? "Hidden from home"
          : "Hide";
      }
    }

    if (favBtn) {
      favBtn.addEventListener("click", function () {
        toggle(favorites, FAV_KEY, key);
        sync();
      });
    }
    if (hideBtn) {
      hideBtn.addEventListener("click", function () {
        toggle(hidden, HIDDEN_KEY, key);
        sync();
      });
    }
    rerender = sync;
    sync();
  }

  /* ---------- Index page ---------- */

  function initIndex() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
    var sections = Array.prototype.slice.call(document.querySelectorAll(".category-group"));
    var blocks = Array.prototype.slice.call(document.querySelectorAll(".collection-block"));
    var searchInput = document.getElementById("searchInput");
    var tagFiltersEl = document.getElementById("tagFilters");
    var noResults = document.getElementById("noResults");
    var viewTabs = document.getElementById("viewTabs");
    var viewHint = document.getElementById("viewHint");

    if (!cards.length || !searchInput || !tagFiltersEl) return;

    var view = "all";

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

    // Favorite / hide buttons on each card.
    cards.forEach(function (card) {
      var key = card.dataset.key;
      var favBtn = card.querySelector(".js-fav");
      var hideBtn = card.querySelector(".js-hide");

      if (favBtn) {
        favBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggle(favorites, FAV_KEY, key);
          syncCard(card);
          applyFilters();
        });
      }
      if (hideBtn) {
        hideBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggle(hidden, HIDDEN_KEY, key);
          syncCard(card);
          applyFilters();
        });
      }
      syncCard(card);
    });

    function syncCard(card) {
      var key = card.dataset.key;
      var fav = favorites.has(key);
      var isHidden = hidden.has(key);
      var favBtn = card.querySelector(".js-fav");
      var hideBtn = card.querySelector(".js-hide");

      card.classList.toggle("is-favorite", fav);
      card.classList.toggle("is-hidden-recipe", isHidden);

      if (favBtn) {
        favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
        favBtn.classList.toggle("is-on", fav);
      }
      if (hideBtn) {
        hideBtn.classList.toggle("is-on", isHidden);
        hideBtn.title = isHidden ? "Unhide" : "Hide";
        hideBtn.querySelector(".icon-hide").textContent = isHidden ? "↩" : "✕";
      }
    }

    if (viewTabs) {
      viewTabs.addEventListener("click", function (e) {
        var tab = e.target.closest(".view-tab");
        if (!tab) return;
        view = tab.dataset.view;
        viewTabs.querySelectorAll(".view-tab").forEach(function (t) {
          t.classList.toggle("is-active", t === tab);
        });
        applyFilters();
      });
    }

    function updateCounts() {
      var favCount = cards.filter(function (c) {
        return favorites.has(c.dataset.key);
      }).length;
      var hiddenCount = cards.filter(function (c) {
        return hidden.has(c.dataset.key);
      }).length;
      var favEl = document.querySelector('[data-count="favorites"]');
      var hidEl = document.querySelector('[data-count="hidden"]');
      if (favEl) favEl.textContent = favCount;
      if (hidEl) hidEl.textContent = hiddenCount;
    }

    function applyFilters() {
      var q = searchInput.value.trim().toLowerCase();
      var anyVisible = false;

      cards.forEach(function (card) {
        var key = card.dataset.key;
        var tags = (card.dataset.tags || "").split(",").filter(Boolean);
        var title = (card.dataset.title || "").toLowerCase();
        var matchesSearch =
          !q || title.indexOf(q) !== -1 || tags.join(" ").indexOf(q) !== -1;
        var matchesTags = Array.from(selected).every(function (t) {
          return tags.indexOf(t) !== -1;
        });

        var matchesView;
        if (view === "favorites") {
          matchesView = favorites.has(key) && !hidden.has(key);
        } else if (view === "hidden") {
          matchesView = hidden.has(key);
        } else {
          matchesView = !hidden.has(key);
        }

        var visible = matchesSearch && matchesTags && matchesView;
        card.hidden = !visible;
        if (visible) anyVisible = true;
      });

      sections.forEach(function (section) {
        section.hidden = !Array.prototype.slice
          .call(section.querySelectorAll(".card"))
          .some(function (c) {
            return !c.hidden;
          });
      });

      blocks.forEach(function (block) {
        block.hidden = !Array.prototype.slice
          .call(block.querySelectorAll(".card"))
          .some(function (c) {
            return !c.hidden;
          });
      });

      if (viewHint) {
        if (view === "hidden") {
          viewHint.textContent =
            "Hidden recipes. Tap ↩ on a card to bring it back to the homepage.";
          viewHint.hidden = false;
        } else if (view === "favorites") {
          viewHint.textContent = "Your favorites. Tap ★ on any card to add or remove one.";
          viewHint.hidden = false;
        } else {
          viewHint.hidden = true;
        }
      }

      if (noResults) {
        noResults.hidden = anyVisible;
        if (!anyVisible) {
          if (view === "favorites") {
            noResults.textContent =
              "No favorites yet. Tap the ★ on any recipe to add one.";
          } else if (view === "hidden") {
            noResults.textContent = "Nothing hidden.";
          } else {
            noResults.textContent =
              "No matches. Try a different search or clear the tag filters.";
          }
        }
      }

      updateCounts();
    }

    searchInput.addEventListener("input", applyFilters);

    rerender = function () {
      cards.forEach(syncCard);
      applyFilters();
    };
    applyFilters();
  }
})();
