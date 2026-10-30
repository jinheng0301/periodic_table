# Periodic Table

A static JavaScript application that replaces the cards in the Three.js CSS3D Periodic Table example with 200 people read from a Google Sheet. Users authorize access with Google Identity Services; the app displays a Table, Sphere, double Helix, or Grid layout and colors cards by net worth.

## Files

- `index.html` — login and application views, import map, GIS script.
- `css/style.css` — login, cards, controls, status panel, and color legend.
- `js/config.js` — Google client and Sheet identifiers, scope, range, thresholds, and colors.
- `js/auth.js` — GIS authorization, user profile lookup, and sign-out.
- `js/sheets.js` — Sheets API read, header matching, and data cleaning.
- `js/card.js` — safe DOM card construction and net-worth colors.
- `js/layouts.js` — Table, Sphere, double Helix, and Grid positions.
- `js/main.js` — scene, animation, UI events, and application state.

## Run locally

From this folder, start a local HTTP server:

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. Do not open `index.html` as a `file://` URL; Google Identity Services requires an HTTP or HTTPS origin.

The OAuth client must allow `http://localhost:8000`. The current app uses the Google Cloud client, Sheet ID, and `Data Template` tab configured in `js/config.js`.

## Deploy to GitHub Pages

1. Put the project files at the repository root, with `index.html` at the top level.
2. In GitHub, open **Settings → Pages**.
3. Select **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
4. The site URL should be `https://jinheng0301.github.io/<repo-name>/`.
5. In Google Cloud, the authorized JavaScript origin is the host only: `https://jinheng0301.github.io`.

All local asset paths are relative so the app can run from a GitHub Pages repository subpath.

## Net-worth color rules

- `netWorth <= 100000`: red (`#EF3022`)
- `100000 < netWorth <= 200000`: orange/yellow (`#FDCA35`)
- `netWorth > 200000`: green (`#3A9F48`)

Exactly `$100,000` is red; exactly `$200,000` is orange/yellow. Formatted currency values such as `$251,260.80` are parsed before comparison. Per the TRD, an invalid amount is treated as zero.

## OAuth testing status

The OAuth app is configured as External / Testing. Only configured test users can authorize it; the intended reviewer account is included in that list and must also have access to the Sheet. Google may show an unverified-app warning for the sensitive Sheets read-only scope. In Testing status, user authorizations expire after seven days and may need to be granted again.

The OAuth Client ID and Sheet ID are identifiers, not client secrets. No Client Secret or API key belongs in this static application. The access token is kept in memory and is not written to local storage.
