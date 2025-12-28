const form = document.getElementById('searchForm');
const nickInput = document.getElementById('nick');
const result = document.getElementById('result');

// Background particle animation (subtle gaming neon effect)
;(function initParticles(){
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles;
  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const colors = ['rgba(110,241,167,0.14)','rgba(124,249,255,0.12)','rgba(180,110,255,0.08)'];
  function makeParticles(){
    particles = Array.from({length: Math.round((w*h)/90000)}, ()=>({
      x: Math.random()*w,
      y: Math.random()*h,
      r: 0.6+Math.random()*2.4,
      vx: (Math.random()-0.5)*0.15,
      vy: (Math.random()-0.5)*0.15,
      c: colors[Math.floor(Math.random()*colors.length)]
    }));
  }
  makeParticles();

  function step(){
    ctx.clearRect(0,0,w,h);
    // slight gradient overlay
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'rgba(6,10,14,0.15)');
    g.addColorStop(1,'rgba(2,6,12,0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // draw particles
    for (const p of particles){
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w+20; if (p.x > w+20) p.x = -20;
      if (p.y < -20) p.y = h+20; if (p.y > h+20) p.y = -20;
      const rad = Math.max(0.5, p.r);
      ctx.beginPath();
      ctx.fillStyle = p.c;
      ctx.arc(p.x,p.y,rad,0,Math.PI*2);
      ctx.fill();
    }

    // connect nearest particles lightly
    for (let i=0;i<particles.length;i++){
      const a = particles[i];
      for (let j=i+1;j<i+4 && j<particles.length;j++){
        const b = particles[j];
        const dx = a.x-b.x, dy = a.y-b.y; const d2 = dx*dx+dy*dy;
        if (d2 < 16000){
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(124,249,255,0.03)';
          ctx.lineWidth = 1;
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
    }

    requestAnimationFrame(step);
  }
  step();
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nick = nickInput.value.trim();
  if (!nick) return;
  result.innerHTML = 'Loading...';
  try {
    const resp = await fetch(`/api/player?nickname=${encodeURIComponent(nick)}`);
    if (!resp.ok) {
      const txt = await resp.text();
      result.innerHTML = `<div class="card">Error: ${resp.status} ${txt}</div>`;
      return;
    }
    const data = await resp.json();
    render(data);
  } catch (err) {
    result.innerHTML = `<div class="card">Network error: ${err.message}</div>`;
  }
});

// Dashboard for multiple nicknames with sorting
const dashboardBtn = document.getElementById('dashboardBtn');
const sortSelect = document.getElementById('sortSelect');
const DASH_NICKS = ['betri','puukankku','tuutti','pehMiz','teppo','henrj'];
let lastDashboardResults = null;

dashboardBtn.addEventListener('click', async () => {
  result.innerHTML = '<div class="card">Loading dashboard...</div>';
  try {
    const resp = await fetch(`/api/players?nicknames=${encodeURIComponent(DASH_NICKS.join(','))}`);
    if (!resp.ok) {
      result.innerHTML = `<div class="card">Error loading dashboard: ${resp.status}</div>`;
      return;
    }
    const data = await resp.json();
    lastDashboardResults = data.results || [];
    renderDashboardSorted();
  } catch (err) {
    result.innerHTML = `<div class="card">Network error: ${err.message}</div>`;
  }
});

sortSelect.addEventListener('change', () => {
  if (!lastDashboardResults) return;
  renderDashboardSorted();
});

function getNumericStat(item, key){
  const s = item && item.stats && item.stats.lifetime ? item.stats.lifetime : {};
  let v = null;
  if (key === 'matches') v = s['Matches'] || s['Total Matches'] || s['Matches'] || s['Total Matches'];
  if (key === 'kd') v = s['Average K/D Ratio'] || s['Average K/D Ratio'] || s['Average K/D'] || s['K/D Ratio'];
  if (key === 'adr') v = s['ADR'] || s['ADR'];
  if (v == null) return 0;
  // strip non-numeric characters and parse
  const num = parseFloat(String(v).replace(/[^0-9.\-]/g,''));
  return Number.isFinite(num) ? num : 0;
}

function renderDashboardSorted(){
  const sortKey = sortSelect.value || 'matches';
  const list = (lastDashboardResults||[]).slice();
  list.sort((a,b)=>{
    const av = getNumericStat(a, sortKey);
    const bv = getNumericStat(b, sortKey);
    return bv - av; // descending
  });
  renderDashboard(list);
}

function renderDashboard(list){
  if (!Array.isArray(list) || list.length===0) {
    result.innerHTML = '<div class="card">No results</div>';
    return;
  }
  const parts = [];
  parts.push('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">');
  list.forEach(item => {
    if (item.error) {
      parts.push(`<div class="card"><strong>${escapeHtml(item.nickname)}</strong><div class="muted">Error: ${escapeHtml(item.error)}</div></div>`);
      return;
    }
    const p = item.player || {};
    const s = item.stats && item.stats.lifetime ? item.stats.lifetime : {};
    const elo = (p.games && (p.games.cs2 || {}).faceit_elo) || p.faceit_elo || '—';
    parts.push('<div class="card">');
    parts.push('<div class="summary">');
    parts.push(`<img class="avatar" src="${escapeHtml(p.avatar||'')}" onerror="this.style.display='none'"/>`);
    parts.push('<div class="meta">');
    parts.push(`<div style="font-weight:700">${escapeHtml(p.nickname||item.nickname)}</div>`);
    parts.push(`<div class="muted">Elo: ${escapeHtml(String(elo))} • Skill: ${escapeHtml(String((p.games && (p.games.cs2||{}).skill_level) || '—'))}</div>`);
    parts.push('</div></div>');

    parts.push('<div style="margin-top:10px">');
    parts.push(`<div class="muted">Matches</div><div style="font-weight:700">${escapeHtml(s['Matches']||s['Total Matches']||s['Matches']||'—')}</div>`);
    parts.push(`<div style="margin-top:6px"><span class="muted">Win Rate</span> <strong>${escapeHtml(s['Win Rate %']||'—')}%</strong></div>`);
    parts.push(`<div style="margin-top:6px"><span class="muted">Avg K/D</span> <strong>${escapeHtml(s['Average K/D Ratio']||s['Average K/D']||s['Average K/D Ratio']||'—')}</strong></div>`);
    parts.push(`<div style="margin-top:6px"><span class="muted">ADR</span> <strong>${escapeHtml(s['ADR']||'—')}</strong></div>`);
    parts.push('</div>');

    parts.push('</div>');
  });
  parts.push('</div>');
  result.innerHTML = parts.join('\n');
}

function render(data) {
  const { player, stats } = data;
  const life = (stats && stats.lifetime) ? stats.lifetime : {};

  const parts = [];
  parts.push('<div class="card">');
  parts.push('<div class="summary">');
  const avatar = player.avatar || '';
  parts.push(`<img class="avatar" src="${escapeHtml(avatar)}" alt="avatar" onerror="this.style.display='none'"/>`);
  parts.push('<div class="meta">');
  parts.push(`<div style="font-size:18px;font-weight:700">${escapeHtml(player.nickname || 'Unknown')}</div>`);
  const country = player.country || '';
  parts.push(`<div class="muted">${country ? '<img src=\"https://flagcdn.com/16x12/'+country.toLowerCase()+'.png\" style=\"vertical-align:middle;margin-right:6px\">' : ''}${escapeHtml(player.steam_nickname || '')}</div>`);
  parts.push('<div style="margin-top:8px">');
  parts.push(`<strong>Faceit Elo:</strong> ${escapeHtml(String((player.games && (player.games.csgo || player.games.cs2 || {}).faceit_elo) || player.faceit_elo || '—'))}`);
  parts.push(' &nbsp; ');
  parts.push(`<strong>Skill:</strong> ${escapeHtml(String((player.games && (player.games.csgo || player.games.cs2 || {}).skill_level) || '—'))}`);
  parts.push('</div>');
  parts.push('</div>');
  parts.push('</div>');

  // quick stats grid
  parts.push('<div class="stats-grid">');
  parts.push(`<div class="stat"><div class="muted">Matches</div><div>${escapeHtml(life['Matches'] || '—')}</div></div>`);
  parts.push(`<div class="stat"><div class="muted">Wins</div><div>${escapeHtml(life['Wins'] || '—')}</div></div>`);
  parts.push(`<div class="stat"><div class="muted">Win Rate</div><div>${escapeHtml(life['Win Rate %'] || '—')}%</div></div>`);
  parts.push(`<div class="stat"><div class="muted">Avg K/D</div><div>${escapeHtml(life['Average K/D Ratio'] || '—')}</div></div>`);
  parts.push(`<div class="stat"><div class="muted">HS %</div><div>${escapeHtml(life['Average Headshots %'] || '—')}</div></div>`);
  parts.push(`<div class="stat"><div class="muted">Longest WS</div><div>${escapeHtml(life['Longest Win Streak'] || '—')}</div></div>`);
  parts.push('</div>');

  // top maps
  if (stats && Array.isArray(stats.segments)) {
    const maps = stats.segments.filter(s=>s.type==='Map' && s.stats && s.stats.Matches).slice();
    maps.sort((a,b)=>Number(b.stats.Matches||0)-Number(a.stats.Matches||0));
    const top = maps.slice(0,3);
    if (top.length) {
      parts.push('<div class="maps"><strong>Top maps</strong><ul>');
      top.forEach(m=>{
        const label = m.label || m.stats.label || 'map';
        const matches = m.stats && m.stats.Matches ? m.stats.Matches : '—';
        const wr = m.stats && (m.stats['Win Rate %'] || m.stats['Win Rate %']) ? (m.stats['Win Rate %']||m.stats['Win Rate %']) : null;
        parts.push(`<li>${escapeHtml(label)} — ${escapeHtml(String(matches))} matches${wr ? ' — '+escapeHtml(String(wr))+'%' : ''}</li>`);
      });
      parts.push('</ul></div>');
    }
  }

  parts.push('</div>');
  result.innerHTML = parts.join('\n');
}

function escapeHtml(s){
  if (!s) return '';
  return String(s).replace(/[&<>\"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}
