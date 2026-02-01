---
name: pagedrop
description: Create shareable HTML pages for instant mobile preview and visual collaboration. Use when building documents, visualizations, or anything that needs structure — view it in a browser from any device, then iterate with Google Docs-style annotations.
---

# Pagedrop

Escape the chat window. Render complex content as a shareable web page, get structured feedback via annotations.

## Workflow

### 1. Create the HTML

Write self-contained HTML (inline CSS/JS). Save to a temp file:

```bash
cat > /tmp/preview.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Preview</title>
  <style>/* inline styles */</style>
</head>
<body>
  <!-- content -->
</body>
</html>
EOF
```

**No need to add annotation scripts** — pagedrop.ai automatically injects the revision and annotation UI.

### 2. Upload and share

```bash
gh gist create /tmp/preview.html -d "Description"
```

Note: Gists are created as **secret** by default (not listed on profile, not indexed). Anyone with the pagedrop.ai link can still view.

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

## Annotations

The annotation UI is automatically injected on pagedrop.ai pages:

1. **User selects text** → "Annotate" button appears
2. **Add comment** → saved to localStorage with location context
3. **Click "Finish"** → exports structured markdown
4. **Paste in chat** → agent addresses each point

### Export Format

```markdown
## Preview Feedback
**Preview:** Document Title
**Date:** 1/31/2026, 7:44:30 PM
**Annotations:** 3

---

### 1.
📍 Section: "Performance Results"

...reduced latency across all endpoints. **[Redis caching reduced validate latency by 87%]**, making auth nearly invisible...

This is the key win — call it out more prominently!

---

### 2.
📍 Table Row 2, Column 3 · Section: "Benchmarks"

> 120ms

Can we get this under 100ms?

---
```

The format includes:
- **Location context** (section heading, table position, code block)
- **Surrounding text** with selection highlighted in bold brackets
- **User's comment**

## Notes

- **Self-contained HTML** — inline all CSS/JS to avoid CORS issues
- **Secret gists** — not on profile or indexed, but anyone with the link can view
- **Annotations are client-side** — stored in localStorage per page
- **Mobile-friendly** — annotation button positioned for thumb reach
- **You own your content** — gists stay in your GitHub, pagedrop just proxies
- **Share links** — control annotations/revisions visibility for viewers
