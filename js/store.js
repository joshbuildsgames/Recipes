/*
 * RecipeBox store — favorites and hidden recipes.
 *
 * Always reads and writes localStorage, so the site works with no network and no
 * account. If Supabase is configured (js/supabase-config.js) AND you are signed in,
 * the same state is mirrored to your Supabase row so it follows you between devices.
 *
 * Sync model, deliberately simple because this is a single-user cookbook:
 *   - The first time you sign in on a device, whatever is already favorited locally
 *     is merged UP into Supabase, so you never lose existing stars.
 *   - After that, Supabase is the source of truth on load: a fresh page pulls the
 *     server list and replaces the local one. That is what makes un-favoriting on
 *     one device actually stick on the other.
 *   - Every toggle writes through immediately. Writes that fail (offline) are queued
 *     in localStorage and retried the next time the store initialises.
 */
window.RecipeBox = (function () {
  var FAV_KEY = "recipebox:favorites";
  var HIDDEN_KEY = "recipebox:hidden";
  var PENDING_KEY = "recipebox:pending";
  var MERGED_KEY = "recipebox:merged-for";
  var SDK_URL =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/dist/umd/supabase.js";
  var TABLE = "recipe_prefs";

  var listeners = [];
  var client = null;
  var session = null;
  var status = "local"; // local | signed-out | signing-in | synced | error
  var statusDetail = "";

  /* ---------- localStorage helpers ---------- */

  function loadSet(key) {
    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveSet(key, set) {
    try {
      window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch (e) {
      /* private mode: the page still works, it just will not remember */
    }
  }

  function loadJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }

  var favorites = loadSet(FAV_KEY);
  var hidden = loadSet(HIDDEN_KEY);

  function emit() {
    listeners.forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        /* one bad listener should not break the rest */
      }
    });
  }

  /* ---------- Supabase ---------- */

  function config() {
    return window.RECIPEBOX_SUPABASE || {};
  }

  function isConfigured() {
    var c = config();
    return !!(c.url && c.anonKey);
  }

  function loadSdk() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement("script");
      s.src = SDK_URL;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("Could not load the Supabase library"));
      };
      document.head.appendChild(s);
    });
  }

  function queuePending(key, fav, hid) {
    var pending = loadJSON(PENDING_KEY, {});
    pending[key] = { favorite: fav, hidden: hid };
    saveJSON(PENDING_KEY, pending);
  }

  function clearPending() {
    saveJSON(PENDING_KEY, {});
  }

  function rowsFor(keys) {
    return keys.map(function (k) {
      return {
        user_id: session.user.id,
        recipe_key: k.key,
        favorite: k.favorite,
        hidden: k.hidden,
      };
    });
  }

  function writeThrough(key) {
    if (!client || !session) return;
    var fav = favorites.has(key);
    var hid = hidden.has(key);
    client
      .from(TABLE)
      .upsert(
        {
          user_id: session.user.id,
          recipe_key: key,
          favorite: fav,
          hidden: hid,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,recipe_key" }
      )
      .then(function (res) {
        if (res && res.error) queuePending(key, fav, hid);
      })
      .catch(function () {
        queuePending(key, fav, hid);
      });
  }

  function flushPending() {
    var pending = loadJSON(PENDING_KEY, {});
    var keys = Object.keys(pending);
    if (!keys.length || !client || !session) return Promise.resolve();
    var rows = rowsFor(
      keys.map(function (k) {
        return { key: k, favorite: pending[k].favorite, hidden: pending[k].hidden };
      })
    );
    return client
      .from(TABLE)
      .upsert(rows, { onConflict: "user_id,recipe_key" })
      .then(function (res) {
        if (!res.error) clearPending();
      })
      .catch(function () {
        /* stay queued */
      });
  }

  function pull() {
    if (!client || !session) return Promise.resolve();
    var uid = session.user.id;

    return client
      .from(TABLE)
      .select("recipe_key, favorite, hidden")
      .then(function (res) {
        if (res.error) throw res.error;
        var rows = res.data || [];
        var remoteFav = new Set();
        var remoteHidden = new Set();
        rows.forEach(function (r) {
          if (r.favorite) remoteFav.add(r.recipe_key);
          if (r.hidden) remoteHidden.add(r.recipe_key);
        });

        var mergedFor = loadJSON(MERGED_KEY, null);
        if (mergedFor !== uid) {
          // First sign-in on this device: push local additions up, keep the union.
          var toPush = [];
          favorites.forEach(function (k) {
            if (!remoteFav.has(k)) {
              remoteFav.add(k);
              toPush.push(k);
            }
          });
          hidden.forEach(function (k) {
            if (!remoteHidden.has(k)) {
              remoteHidden.add(k);
              if (toPush.indexOf(k) === -1) toPush.push(k);
            }
          });
          saveJSON(MERGED_KEY, uid);
          if (toPush.length) {
            var rowsToPush = rowsFor(
              toPush.map(function (k) {
                return {
                  key: k,
                  favorite: remoteFav.has(k),
                  hidden: remoteHidden.has(k),
                };
              })
            );
            client
              .from(TABLE)
              .upsert(rowsToPush, { onConflict: "user_id,recipe_key" })
              .catch(function () {});
          }
        }

        favorites = remoteFav;
        hidden = remoteHidden;
        saveSet(FAV_KEY, favorites);
        saveSet(HIDDEN_KEY, hidden);
        status = "synced";
        statusDetail = session.user.email || "";
        emit();
      })
      .catch(function (err) {
        status = "error";
        statusDetail = (err && err.message) || "Sync failed";
        emit();
      });
  }

  function init() {
    if (!isConfigured()) {
      status = "local";
      return Promise.resolve();
    }
    return loadSdk()
      .then(function () {
        client = window.supabase.createClient(config().url, config().anonKey);
        return client.auth.getSession();
      })
      .then(function (res) {
        session = (res && res.data && res.data.session) || null;
        status = session ? "synced" : "signed-out";
        client.auth.onAuthStateChange(function (_event, newSession) {
          session = newSession;
          if (session) {
            status = "synced";
            statusDetail = session.user.email || "";
            flushPending().then(pull);
          } else {
            status = "signed-out";
            statusDetail = "";
          }
          emit();
        });
        emit();
        if (session) return flushPending().then(pull);
      })
      .catch(function (err) {
        status = "error";
        statusDetail = (err && err.message) || "Could not reach Supabase";
        emit();
      });
  }

  /* ---------- public API ---------- */

  return {
    init: init,

    isConfigured: isConfigured,
    getStatus: function () {
      return { status: status, detail: statusDetail };
    },
    getEmail: function () {
      return session && session.user ? session.user.email : "";
    },

    subscribe: function (fn) {
      listeners.push(fn);
    },

    /* Re-read localStorage — used when a page is restored from the bfcache. */
    refreshLocal: function () {
      favorites = loadSet(FAV_KEY);
      hidden = loadSet(HIDDEN_KEY);
      emit();
    },

    isFavorite: function (key) {
      return favorites.has(key);
    },
    isHidden: function (key) {
      return hidden.has(key);
    },
    countFavorites: function (keys) {
      return keys.filter(function (k) {
        return favorites.has(k);
      }).length;
    },
    countHidden: function (keys) {
      return keys.filter(function (k) {
        return hidden.has(k);
      }).length;
    },

    toggleFavorite: function (key) {
      if (favorites.has(key)) favorites.delete(key);
      else favorites.add(key);
      saveSet(FAV_KEY, favorites);
      writeThrough(key);
      emit();
    },

    toggleHidden: function (key) {
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      saveSet(HIDDEN_KEY, hidden);
      writeThrough(key);
      emit();
    },

    signIn: function (email) {
      if (!client) return Promise.reject(new Error("Sync is not configured"));
      status = "signing-in";
      emit();
      return client.auth
        .signInWithOtp({
          email: email,
          options: { emailRedirectTo: window.location.href },
        })
        .then(function (res) {
          if (res.error) throw res.error;
          return true;
        });
    },

    signOut: function () {
      if (!client) return Promise.resolve();
      return client.auth.signOut().then(function () {
        session = null;
        status = "signed-out";
        statusDetail = "";
        emit();
      });
    },
  };
})();
