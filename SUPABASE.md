# Syncing favorites across devices

By default, favorites and hidden recipes live in one browser's `localStorage`. That
means your phone and your laptop keep separate lists. Connecting Supabase gives you a
single list that follows you, with a one-time email link instead of a password.

**The site works fine without this.** Until `js/supabase-config.js` has real values,
the Sync button stays hidden and nothing changes.

## Your steps (about 10 minutes)

### 1. Create the project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Pick any name and region. The free tier is enough — this stores a few dozen rows.
3. Wait for it to finish provisioning.

### 2. Create the table

1. In the sidebar, open **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**. It should report success.

This creates one table with Row Level Security switched on, so each signed-in user can
only read and write their own rows.

### 3. Allow your site to sign people in

1. Go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to `https://joshbuildsgames.github.io/Recipes/`
3. Under **Redirect URLs**, add both:
   - `https://joshbuildsgames.github.io/Recipes/**`
   - `http://localhost:8080/**` (only needed if you want sign-in to work locally)

Without this, the email link will refuse to sign you in.

### 4. Copy your keys into the repo

1. Go to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Put them in `js/supabase-config.js`:

```js
window.RECIPEBOX_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "eyJhbGciOi...",
};
```

4. Commit and push. The deploy runs automatically.

**The anon key is meant to be public** — it identifies the project, it does not grant
access. The row-level security policies are what protect your data. The key you must
never commit is the **service role** key, which bypasses those policies entirely.

### 5. Sign in

Open the site, tap **Sync**, enter your email, and open the link it sends you *on that
device*. Repeat once on your other device. That's it.

## How syncing behaves

- The first time you sign in on a device, whatever you have already favorited there is
  merged up to the server, so nothing is lost.
- After that the server is the source of truth when a page loads. Un-favoriting on your
  laptop will be gone from your phone the next time it loads the page.
- Every tap writes immediately. If a write fails because you're offline, it's queued and
  retried next time the page opens.
- Signed out, or Supabase unreachable, the site falls back to this-browser-only
  behavior rather than breaking.

## Costs and caveats

- Free tier is comfortably sufficient here.
- Supabase pauses free projects after about a week of inactivity. If your favorites stop
  syncing after a break, open the dashboard and un-pause it.
- This adds a service dependency to a site that otherwise has none. If Supabase is down,
  favorites still work locally; they just don't sync.
