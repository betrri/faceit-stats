# Faceit Stats Viewer

Small demo app that proxies Faceit API calls and displays CS:GO stats for a given nickname.

Getting started

1. Copy `.env.example` to `.env` and set `FACEIT_API_KEY`.
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open http://localhost:3000 and enter a Faceit nickname.

Notes

- You need a Faceit Open API key. See https://developers.faceit.com/ for details.
- This is a small demo; it proxies requests server-side to avoid exposing the key.
