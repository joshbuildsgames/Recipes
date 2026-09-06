/*
 * Page behaviour: filtering, search, and the favorite/hide controls.
 * All persistence lives in js/store.js (RecipeBox).
 */
(function () {
  var store = window.RecipeBox;
  if (!store) return;

  document.addEventListener("DOMContentLoaded", function () {
    store.init();
    initSyncPanel();
    if (document.getElementById("searchInput")) initIndex();
    else initDetail();
  });

  // A page restored from the back/forward cache does not re-run scripts, so
  // re-read storage and repaint whenever it comes back into view.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) store.refreshLocal();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") store.refreshLocal();
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
        var fav = store.isFavorite(key);
        favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
        favBtn.classList.toggle("is-on", fav);
        favBtn.querySelector(".btn-label").textContent = fav ? "Favorited" : "Favorite";
      }
      if (hideBtn) {
        var isHidden = store.isHidden(key);
        hideBtn.classList.toggle("is-on", isHidden);
        hideBtn.querySelector(".btn-label").textContent = isHidden
          ? "Hidden from home"
          : "Hide";
      }
    }

    if (favBtn) {
      favBtn.addEventListener("click", function () {
        store.toggleFavorite(key);
      });
    }
    if (hideBtn) {
      hideBtn.addEventListener("click", function () {
        store.toggleHidden(key);
      });
    }
    store.subscribe(sync);
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
          store.toggleFavorite(key);
        });
      }
      if (hideBtn) {
        hideBtn.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          store.toggleHidden(key);
        });
      }
      syncCard(card);
    });

    function syncCard(card) {
      var key = card.dataset.key;
      var fav = store.isFavorite(key);
      var isHidden = store.isHidden(key);
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
      var keys = cards.map(function (c) {
        return c.dataset.key;
      });
      var favCount = store.countFavorites(keys);
      var hiddenCount = store.countHidden(keys);
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
          matchesView = store.isFavorite(key) && !store.isHidden(key);
        } else if (view === "hidden") {
          matchesView = store.isHidden(key);
        } else {
          matchesView = !store.isHidden(key);
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

    store.subscribe(function () {
      cards.forEach(syncCard);
      applyFilters();
    });
    applyFilters();
  }

  /* ---------- Sync panel ---------- */

  function initSyncPanel() {
    var btn = document.getElementById("syncBtn");
    var panel = document.getElementById("syncPanel");
    if (!btn || !panel) return;

    // With no Supabase credentials the button stays hidden and the site is
    // exactly as it was: this browser only.
    if (!store.isConfigured()) return;
    btn.hidden = false;

    var form = panel.querySelector("form");
    var emailInput = panel.querySelector("#syncEmail");
    var message = panel.querySelector("#syncMessage");
    var signedIn = panel.querySelector("#syncSignedIn");
    var signedOut = panel.querySelector("#syncSignedOut");
    var whoami = panel.querySelector("#syncWho");
    var signOutBtn = panel.querySelector("#syncSignOut");

    function render() {
      var s = store.getStatus();
      var isSignedIn = s.status === "synced" && store.getEmail();
      signedIn.hidden = !isSignedIn;
      signedOut.hidden = isSignedIn;
      if (isSignedIn) whoami.textContent = store.getEmail();
      btn.classList.toggle("is-on", isSignedIn);
      if (s.status === "error") {
        message.textContent = s.detail;
        message.hidden = false;
      }
    }

    btn.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) render();
    });

    panel.addEventListener("click", function (e) {
      if (e.target === panel) panel.hidden = true;
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = emailInput.value.trim();
      if (!email) return;
      message.hidden = false;
      message.textContent = "Sending…";
      store
        .signIn(email)
        .then(function () {
          message.textContent =
            "Check " + email + " for a sign-in link. Open it on this device.";
        })
        .catch(function (err) {
          message.textContent = err.message || "Could not send the link.";
        });
    });

    signOutBtn.addEventListener("click", function () {
      store.signOut().then(function () {
        message.hidden = true;
        render();
      });
    });

    store.subscribe(render);
    render();
  }
})();
