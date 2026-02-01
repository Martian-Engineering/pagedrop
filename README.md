# Pagedrop

Render complex content as shareable web pages for visual collaboration outside the chat.

When ideas get complex — PRs, architecture diagrams, documents — text threads break down. Pagedrop renders them as pages you can see, annotate, and iterate on.

## How it works

1. Agent writes self-contained HTML
2. Uploads to GitHub Gist  
3. Serves via pagedrop.ai (CloudFront CDN)
4. User annotates with inline comments
5. Feedback exports as structured markdown

## Files

- `SKILL.md` — Agent skill documentation
- `annotate.js` — Client-side annotation system (include in your HTML)

## Annotation Script

Include at the end of your HTML body:

```html
<script src="https://pagedrop.ai/g/jalehman/3c031225cb70b73fe080f60f1b174cce"></script>
```

## Example

```bash
# Create HTML with annotation support
cat > /tmp/preview.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>My Doc</title></head>
<body>
  <h1>Content here</h1>
  <script src="https://pagedrop.ai/g/jalehman/3c031225cb70b73fe080f60f1b174cce"></script>
</body>
</html>
EOF

# Upload and get preview URL
gh gist create /tmp/preview.html --public
# Gist: https://gist.github.com/USER/GIST_ID
# Pagedrop: https://pagedrop.ai/g/USER/GIST_ID
```

## Infrastructure

Pagedrop.ai is hosted on AWS (Martian Engineering):
- CloudFront CDN with edge functions
- Proxies GitHub Gist raw content
- Sets `Content-Type: text/html` automatically
- 5-minute cache TTL

Your content stays in your GitHub Gist — pagedrop just serves it.

## License

MIT
