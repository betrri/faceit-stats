# Faceit Stats Viewer

This version runs entirely in the browser and performs Faceit API requests directly from client-side JavaScript.

Getting started

1. Open `index.html` in your browser (no server required).
2. Paste your Faceit Open API key into the "Faceit API key" field and click "Save".
3. Enter a nickname and click "Search" or use the dashboard button to fetch multiple players.

Important notes & security

- You need a Faceit Open API key. See https://developers.faceit.com/ for details.
- The API key is stored in your browser's `localStorage` and will be sent from the client. Do NOT share the machine or expose the key publicly.
- Some browsers or hosting setups may block direct requests due to CORS — if the Faceit API rejects cross-origin requests, the browser will fail to fetch data. In that case you will need a server-side proxy or use a hosting platform that supports secure serverless functions.

If you want to run a server/proxy instead (to keep the key secret), restore `server.js` or deploy a small serverless function that injects the key server-side.
