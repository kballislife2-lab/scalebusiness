# Scalebusiness Website

Single-page website for Scalebusiness — web design, web development, and marketing & advertising for businesses and brands nationwide.

## Structure

```
.
├── index.html              # The entire site: markup, CSS, and client-side JS
├── api/
│   └── generate-preview.js # Serverless backend for the AI Preview Tool
├── .htaccess                # Clean-path routing for Apache hosting
├── vercel.json               # Clean-path routing for Vercel
├── .gitignore
└── README.md
```

## Running locally

`index.html` is a static file — just open it directly in a browser, or serve it with any static server:

```bash
npx serve .
```

Note: client-side routing (clean paths like `/about`) and the AI Preview Tool's backend call both require a real server environment. Opening the file directly (`file://`) will still work — the site gracefully falls back to show/hide navigation without updating the URL.

## Deploying

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Import it into [Vercel](https://vercel.com) (or Netlify/Cloudflare Pages).
3. In your hosting provider's dashboard, add an environment variable:
   - `ANTHROPIC_API_KEY` — your key from [console.anthropic.com](https://console.anthropic.com)
4. Deploy. `api/generate-preview.js` will automatically become available at `/api/generate-preview`.
5. Update the `PREVIEW_API_ENDPOINT` constant in `index.html` if your API route lives at a different URL.

### Server routing for clean paths

For direct links like `yoursite.com/about` to work in production, this repo already includes:

- **`.htaccess`** — for Apache hosting (most shared hosting, cPanel, etc.)
- **`vercel.json`** — for Vercel (routes all paths to `index.html` except `/api/*`)

If you're deploying to Netlify or Cloudflare Pages instead, ask Claude for the equivalent `netlify.toml` / `_redirects` config.

## The AI Preview Tool

Located on the "AI Preview Tool" page and promoted on Home. Customers describe their desired website in plain language; `api/generate-preview.js` calls the Anthropic API server-side (so the API key never reaches the browser) and returns a generated concept (headline, tagline, palette, page list) that's rendered as a live mock preview.

Cost note: every generation is a real, billed API call (uses Claude Haiku 4.5 by default — fast and economical). Consider adding rate-limiting per IP if this page sees heavy public traffic.
