# Cloudflare Pages + Worker + D1 Demo

## What this is
A minimal login + search demo using:
- Cloudflare Pages (frontend files in `public/`)
- Cloudflare Worker (API in `worker/index.js`)
- Cloudflare D1 (SQLite-like DB) for `users` and `items`.

## Steps to deploy

1. Install Wrangler (if not installed):
   ```bash
   npm install -g wrangler
