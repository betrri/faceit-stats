require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

if (!FACEIT_API_KEY) {
  console.warn('Warning: FACEIT_API_KEY not set. Set it in .env or environment to use API.');
}

const FACEIT_BASE = 'https://open.faceit.com/data/v4';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/player', async (req, res) => {
  const nickname = req.query.nickname;
  if (!nickname) return res.status(400).json({ error: 'nickname query required' });
  if (!FACEIT_API_KEY) return res.status(500).json({ error: 'Server not configured with FACEIT_API_KEY' });

  try {
    const headers = { 'Authorization': `Bearer ${FACEIT_API_KEY}` };
    const pResp = await fetch(`${FACEIT_BASE}/players?nickname=${encodeURIComponent(nickname)}`, { headers });
    if (!pResp.ok) {
      const text = await pResp.text();
      return res.status(pResp.status).json({ error: 'Faceit player lookup failed', details: text });
    }
    const player = await pResp.json();
    const playerId = player.player_id || player.playerId || player.id;
    if (!playerId) return res.status(404).json({ error: 'Player not found in Faceit response', player });

    // fetch CS2 stats (if available)
    const statsResp = await fetch(`${FACEIT_BASE}/players/${playerId}/stats/cs2`, { headers });
    const stats = statsResp.ok ? await statsResp.json() : null;

    return res.json({ player, stats });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error', details: err.message });
  }
});

// fetch multiple players by comma-separated nicknames
app.get('/api/players', async (req, res) => {
  const q = req.query.nicknames;
  if (!q) return res.status(400).json({ error: 'nicknames query required' });
  if (!FACEIT_API_KEY) return res.status(500).json({ error: 'Server not configured with FACEIT_API_KEY' });
  const nicknames = q.split(',').map(s=>s.trim()).filter(Boolean);
  const headers = { 'Authorization': `Bearer ${FACEIT_API_KEY}` };

  try {
    const results = await Promise.all(nicknames.map(async (nick) => {
      try {
        const pResp = await fetch(`${FACEIT_BASE}/players?nickname=${encodeURIComponent(nick)}`, { headers });
        if (!pResp.ok) return { nickname: nick, error: `player_lookup_failed:${pResp.status}` };
        const player = await pResp.json();
        const playerId = player.player_id || player.playerId || player.id;
        if (!playerId) return { nickname: nick, error: 'player_id_missing', player };
        const statsResp = await fetch(`${FACEIT_BASE}/players/${playerId}/stats/cs2`, { headers });
        const stats = statsResp.ok ? await statsResp.json() : null;
        return { nickname: nick, player, stats };
      } catch (err) {
        return { nickname: nick, error: 'internal', details: err.message };
      }
    }));
    return res.json({ results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
