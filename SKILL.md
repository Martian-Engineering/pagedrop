---
name: pagedrop
description: Create shareable HTML pages for instant mobile preview and visual collaboration. Use when building documents, visualizations, or anything that needs structure — view it in a browser from any device, then iterate with Google Docs-style annotations.
---

# Pagedrop

Escape the chat window. Render complex content as a shareable web page, get structured feedback via annotations.

## Workflow

### 1. Create the HTML

Write self-contained HTML (inline CSS/JS). Save to a temp file.

**Default template** — use Pico CSS dark theme as the base:

```bash
cat > /tmp/preview.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Preview</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
</head>
<body>
  <main class="container">
    <!-- content -->
  </main>
</body>
</html>
HTMLEOF
```

**No need to add annotation scripts** — pagedrop.ai automatically injects the revision and annotation UI.

### 2. Upload and share

```bash
gh gist create /tmp/preview.html -d "Description #pagedrop"
```

**Always include `#pagedrop` in the description** — this tags it as a drop so it appears in the user's profile.

Note: Gists are created as **secret** by default (not listed on profile, not indexed). Anyone with the pagedrop.ai link can still view.

### 2a. Host Images/Assets (Public GitHub Repo)

If your drop needs images or other static assets, put them in a **public** GitHub repo (so viewers can load them). Convention:
- `drops/<gist_id>/...` (no timestamps)

Copy/paste (example uses placeholders):

```bash
# 0) Set your gist id (from https://gist.github.com/<USER>/<GIST_ID>)
export GIST_ID="<GIST_ID>"

# 1) Create (or choose) a public assets repo (one-time; skip if it already exists)
export ORG="<ORG>"
export REPO="<REPO>" # e.g. "pagedrop-assets"
gh repo create "$ORG/$REPO" --public --confirm

# 2) Clone it locally (one-time) into any folder you want
export ASSETS_DIR="/path/to/local/assets-repo"
git clone "git@github.com:$ORG/$REPO.git" "$ASSETS_DIR"

# 3) Add assets for this drop
cd "$ASSETS_DIR"
mkdir -p "drops/$GIST_ID"
cp "/path/to/<FILE>" "drops/$GIST_ID/"

# 4) Commit + push
git add "drops/$GIST_ID"
git commit -m "Add assets for $GIST_ID"
git push
```

Raw URL pattern (replace the filename):
- `https://raw.githubusercontent.com/<ORG>/<REPO>/<BRANCH>/drops/<GIST_ID>/<FILE>`
- Or: open the file on GitHub and click **Raw**

In your HTML:
```html
<img src="https://raw.githubusercontent.com/<ORG>/<REPO>/<BRANCH>/drops/<GIST_ID>/<FILE>" alt="Example">
```

In your Markdown:
```md
![Example](https://raw.githubusercontent.com/<ORG>/<REPO>/<BRANCH>/drops/<GIST_ID>/<FILE>)
```

Convert the gist URL to a pagedrop URL:
- Gist: `https://gist.github.com/USER/GIST_ID`
- Pagedrop: `https://pagedrop.ai/g/USER/GIST_ID`

Send the pagedrop.ai URL. Works on phone, tablet, desktop.

### 3. Share Links

For sharing with others, use the **Share** button in the revision bar to generate a share link:
- `/s/TOKEN` — share link with configurable settings

Share links let you control what viewers see:
- **Show annotations** — enable/disable annotation UI
- **Show revisions** — enable/disable revision navigation

Or create programmatically:

```bash
curl -X POST "https://pagedrop.ai/api/share" \
  -H "Content-Type: application/json" \
  -d '{"gist_user": "USER", "gist_id": "GIST_ID", "settings": {"annotations": true, "revisions": true}}'
```

### 4. Iterate

Edit the gist in place to preserve revision history:

```bash
gh gist edit GIST_ID -f /tmp/preview.html
```

GitHub keeps all revisions — accessible via the revision bar or API.

**Cache behavior:**
- `/g/USER/GIST_ID` — latest version (cached ~5 min)
- `/g/USER/GIST_ID/SHA` — specific revision (cached longer, immutable)
- `/s/TOKEN` — share link (cached ~1 min)

---

## Recommended Libraries

Only include libraries when the content needs them. All available via CDN — no build step.

### 🎨 Pico CSS — Base Styling (always include)

Classless semantic CSS. Write HTML, get beautiful output. **Default to dark theme.**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
```

**Theming:**
- `<html data-theme="dark">` — dark theme (default for drops)
- `<html data-theme="light">` — light theme
- `<html data-theme="auto">` — follows OS preference

Pico handles typography, tables, forms, buttons, cards, and layout with zero classes. Just use semantic HTML (`<table>`, `<article>`, `<details>`, `<form>`, etc.).

**When to use:** Always. It's the base layer.

**When to skip:** Only if the content demands a fully custom aesthetic (dashboards, landing pages with specific brand styling).

### 🧜 Mermaid — Architecture & Flow Diagrams

Flowcharts, sequence diagrams, ERDs, state machines, Gantt charts, and more.

```html
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
</script>
```

Usage in HTML:
```html
<pre class="mermaid">
graph TD
    A[User] -->|visits| B[CloudFront]
    B --> C[Lambda@Edge]
    C --> D[GitHub Gist]
</pre>
```

**Theme consistency:** Use `theme: 'dark'` with Pico dark, `theme: 'default'` with Pico light.

**When to use:** Architecture diagrams, flowcharts, sequence diagrams, ERDs, state machines, timelines.

### 📊 Chart.js — Charts & Plots

Simple, responsive charts with beautiful defaults.

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
```

Usage:
```html
<canvas id="myChart"></canvas>
<script>
new Chart(document.getElementById('myChart'), {
  type: 'bar',  // bar, line, pie, doughnut, radar, scatter, bubble
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Revenue',
      data: [12, 19, 3],
      backgroundColor: 'rgba(88, 166, 255, 0.7)',
      borderRadius: 6,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { labels: { color: '#c9d1d9' } } },
    scales: {
      x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
      y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }
    }
  }
});
</script>
```

**Theme consistency (dark):** Set `color: '#c9d1d9'` for labels, `color: '#8b949e'` for ticks, `color: '#30363d'` for grid lines. For light theme, omit these (Chart.js defaults are light-friendly).

**When to use:** Bar charts, line charts, pie/doughnut, scatter plots, radar charts. Any time there's numeric data to visualize.

### 💻 Prism.js — Syntax Highlighting

VS Code-quality code rendering. 300+ languages.

```html
<!-- Dark theme (matches Pico dark) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css">

<!-- Light theme (matches Pico light) -->
<!-- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css"> -->

<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
<!-- Add languages as needed -->
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
```

Usage:
```html
<pre><code class="language-javascript">
const greeting = "Hello, world!";
console.log(greeting);
</code></pre>
```

**Theme consistency:**
- Pico dark → `prism-tomorrow.min.css` (dark background, light text)
- Pico light → `prism.min.css` (light background, dark text)

**When to use:** Any content containing code snippets. Skip if there's no code.

### 🧮 KaTeX — Math Rendering

Fast LaTeX math. Way faster than MathJax.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
```

Usage:
```html
<!-- Display math -->
<div id="equation"></div>
<script>
  katex.render('E = mc^2', document.getElementById('equation'), { displayMode: true });
</script>

<!-- Or use auto-render for LaTeX in text -->
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>renderMathInElement(document.body);</script>
```

With auto-render, use `$$...$$` for display math and `\(...\)` for inline math directly in HTML text.

**Theme consistency:** KaTeX inherits text color from CSS — works with both Pico dark and light automatically.

**When to use:** Math equations, formulas, technical papers, scientific content. Skip if there's no math.

---

## Theme Consistency Cheat Sheet

| Library | Dark mode setting | Light mode setting |
|---------|------------------|--------------------|
| Pico CSS | `data-theme="dark"` | `data-theme="light"` |
| Mermaid | `theme: 'dark'` | `theme: 'default'` |
| Chart.js | Custom colors (see above) | Default colors |
| Prism.js | `prism-tomorrow.min.css` | `prism.min.css` |
| KaTeX | Automatic (inherits) | Automatic (inherits) |

**Rule:** Pick dark or light, then match ALL libraries to that choice. Don't mix.

---

## Library Selection Guide

**Include only what the content needs:**

| Content type | Libraries to include |
|-------------|---------------------|
| Text/docs only | Pico CSS |
| Has code snippets | + Prism.js |
| Has data/metrics | + Chart.js |
| Has architecture/flows | + Mermaid |
| Has math/equations | + KaTeX |
| Dashboard with custom look | Skip Pico, use custom CSS |

**Size budget (gzipped):**
| Library | Size |
|---------|------|
| Pico CSS | ~10 KB |
| Mermaid | ~300 KB |
| Chart.js | ~70 KB |
| Prism.js | ~6 KB + langs |
| KaTeX | ~90 KB |

A typical drop with all libraries loads in <500 KB. Most drops need only Pico + one other.

---

## Annotations

The annotation UI is automatically injected on pagedrop.ai pages:

1. **User selects text** → "Annotate" button appears
2. **Add comment** → saved with location context
3. **Click "Finish"** → exports structured markdown
4. **Paste in chat** → agent addresses each point

### Export Format

```markdown
## Preview Feedback
**Preview:** Document Title
**Date:** 2/1/2026, 7:44:30 PM
**Annotations:** 3

---

### 1. [by @jalehman]
📍 Section: "Performance Results"

> ...reduced latency across all endpoints. Redis caching reduced validate latency by 87%, making auth nearly invisible...

This is the key win — call it out more prominently!

---

### 2. [by @collaborator]

> Sort key: UUID annotation ID

Another annotation

---
```

The format includes:
- **Author attribution** (`[by @username]` or `[by Anonymous]`)
- **Location context** (section heading, table position, code block)
- **Selected text** as blockquote
- **User's comment**

## Notes

- **Self-contained HTML** — inline all CSS/JS to avoid CORS issues (CDN links are fine)
- **Secret gists** — not on profile or indexed, but anyone with the pagedrop.ai link can view
- **Annotations** — auto-injected by pagedrop.ai. Persistent for Pro users, localStorage for free
- **Mobile-friendly** — annotation button positioned for thumb reach
- **You own your content** — gists stay in your GitHub, pagedrop just proxies
- **Share links** — control annotations/revisions visibility for viewers
