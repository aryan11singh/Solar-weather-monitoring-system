function setHTML(id, html) {
  document.getElementById(id).innerHTML = html;
}

function kpColor(kp) {
  if (kp >= 8) return '#ff2200';
  if (kp >= 6) return '#ff6600';
  if (kp >= 4) return '#ffcc00';
  if (kp >= 2) return '#44cc44';
  return '#4488ff';
}

function kpStatus(kp) {
  if (kp >= 8) return { label: 'Severe Storm', color: '#ff2200' };
  if (kp >= 6) return { label: 'Strong Storm', color: '#ff6600' };
  if (kp >= 5) return { label: 'Moderate Storm', color: '#ffaa00' };
  if (kp >= 4) return { label: 'Minor Storm', color: '#ffcc00' };
  if (kp >= 2) return { label: 'Quiet', color: '#44cc44' };
  return { label: 'Very Quiet', color: '#4488ff' };
}

function flareClass(classLetter) {
  const map = { X: '#ff2200', M: '#ff8800', C: '#ffcc00', B: '#44aa44', A: '#2266cc' };
  return map[classLetter] || '#888';
}

async function loadSolarWind() {
  try {
    const data = await getSolarWind();
    const bzColor = parseFloat(data.bz) < 0 ? '#ff6666' : '#66ff88';
    setHTML('solar-wind', `
      <div style="font-size:0.75rem;color:#666688;margin-bottom:0.5rem;">📡 ${data.source}</div>
      <div class="wind-stat">
        <span class="wind-label">Speed</span>
        <span class="wind-value">${data.speed}<span class="wind-unit">km/s</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">Density</span>
        <span class="wind-value">${data.density}<span class="wind-unit">p/cm³</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">Temperature</span>
        <span class="wind-value">${data.temperature}<span class="wind-unit">K</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">Bt (Total Field)</span>
        <span class="wind-value">${data.bt}<span class="wind-unit">nT</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">Bz (North-South)</span>
        <span class="wind-value" style="color:${bzColor}">${data.bz}<span class="wind-unit">nT</span></span>
      </div>
    `);
  } catch (e) {
    setHTML('solar-wind', `<div class="error">Failed to load solar wind data</div>`);
  }
}

async function loadKpIndex() {
  try {
    const data = await getKpIndex();
    // new format: [{time_tag, Kp, a_running, station_count}]
    const latest = data[data.length - 1];
    const kp = parseFloat(latest.Kp ?? latest[1]);
    const status = kpStatus(kp);
    const color = kpColor(kp);
    const segments = Array.from({ length: 9 }, (_, i) => {
      const active = i < Math.round(kp);
      return `<div class="kp-segment ${active ? 'active' : ''}" style="color:${color}"></div>`;
    }).join('');

    setHTML('kp-index', `
      <div class="kp-display">
        <div class="kp-number" style="color:${color}">${kp.toFixed(1)}</div>
        <div class="kp-label">Kp Index (0–9 scale)</div>
        <div class="kp-bar">${segments}</div>
        <div class="kp-status" style="color:${status.color}">${status.label}</div>
      </div>
    `);
  } catch (e) {
    setHTML('kp-index', `<div class="error">Failed to load Kp index</div>`);
  }
}

async function loadSolarFlares() {
  try {
    const { goes16, goes18 } = await getSolarFlares();

    const filterFlares = (data, sat) =>
      data.filter(d => d[2] && ['X', 'M', 'C'].includes(d[2][0]))
          .slice(-3).reverse()
          .map(d => ({ ...d, sat }));

    const combined = [
      ...filterFlares(goes16, 'GOES-16 (East)'),
      ...filterFlares(goes18, 'GOES-18 (West)'),
    ].sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 5);

    if (!combined.length) {
      setHTML('solar-flares', `<div class="no-data">No significant flares in last 6 hours</div>`);
      return;
    }

    const html = combined.map(d => {
      const cls = d[2][0];
      const time = new Date(d[0]).toUTCString().slice(0, 25);
      return `
        <div class="flare-item">
          <span class="flare-class ${cls}">${d[2]}</span>
          <span class="flare-time">${time} UTC</span>
          <div class="flare-region">📡 ${d.sat}</div>
        </div>`;
    }).join('');

    setHTML('solar-flares', html);
  } catch (e) {
    setHTML('solar-flares', `<div class="error">Failed to load flare data</div>`);
  }
}

async function loadParticles() {
  try {
    const [protons, electrons] = await Promise.all([getProtonFlux(), getElectronFlux()]);
    const p = protons[protons.length - 1];   // [time, p1, p5, p10, p30, p50, p100]
    const e = electrons[electrons.length - 1]; // [time, e0.8, e2.0]

    setHTML('particles', `
      <div style="font-size:0.75rem;color:#666688;margin-bottom:0.5rem;">📡 GOES-16 / GOES-18</div>
      <div class="wind-stat">
        <span class="wind-label">Protons &gt;10 MeV</span>
        <span class="wind-value">${parseFloat(p[3]).toExponential(2)}<span class="wind-unit">pfu</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">Protons &gt;100 MeV</span>
        <span class="wind-value">${parseFloat(p[6]).toExponential(2)}<span class="wind-unit">pfu</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">Electrons &gt;0.8 MeV</span>
        <span class="wind-value">${parseFloat(e[1]).toExponential(2)}<span class="wind-unit">e/cm²/s/sr</span></span>
      </div>
    `);
  } catch (e) {
    setHTML('particles', `<div class="error">Failed to load particle data</div>`);
  }
}

async function loadCME() {
  try {
    const data = await getCME();
    const recent = data.slice(-4).reverse();

    if (!recent.length) {
      setHTML('cme-list', `<div class="no-data">No recent CME data</div>`);
      return;
    }

    const html = recent.map(c => `
      <div class="cme-item">
        <div class="cme-speed">🌊 ${c.speed ? c.speed + ' km/s' : 'Speed N/A'}</div>
        <div class="cme-time">${c.time || c.start_time || 'Time N/A'}</div>
        <div class="cme-type">${c.type || ''}</div>
      </div>`).join('');

    setHTML('cme-list', html);
  } catch (e) {
    setHTML('cme-list', `<div class="error">Failed to load CME data</div>`);
  }
}

async function loadEarthWeather() {
  try {
    const d = await getEarthWeather();
    const wc = weatherCodeLabel(d.weatherCode);
    const rainColor = d.rainProbability > 70 ? '#66aaff' : d.rainProbability > 40 ? '#ffcc44' : '#44cc88';

    setHTML('earth-weather', `
      <div style="font-size:0.75rem;color:#666688;margin-bottom:0.6rem;">
        📡 ECMWF/ERA5 Satellite Model &nbsp;|&nbsp; 📍 ${d.city} (${d.lat}°, ${d.lon}°)
      </div>
      <div class="weather-main">
        <span class="weather-icon">${wc.icon}</span>
        <div>
          <div class="weather-temp">${d.temperature}°C</div>
          <div class="weather-desc">${wc.label}</div>
        </div>
      </div>
      <div class="wind-stat">
        <span class="wind-label">💧 Rain Probability</span>
        <span class="wind-value" style="color:${rainColor}">${d.rainProbability}<span class="wind-unit">%</span></span>
      </div>
      <div class="rain-bar-wrap">
        <div class="rain-bar" style="width:${d.rainProbability}%;background:${rainColor}"></div>
      </div>
      <div class="wind-stat">
        <span class="wind-label">🌧️ Precipitation</span>
        <span class="wind-value">${d.precipitation}<span class="wind-unit">mm</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">💨 Wind Speed</span>
        <span class="wind-value">${d.windSpeed}<span class="wind-unit">km/h ${windDirLabel(d.windDirection)}</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">💨 Wind Gusts</span>
        <span class="wind-value">${d.windGusts}<span class="wind-unit">km/h</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">💦 Humidity</span>
        <span class="wind-value">${d.humidity}<span class="wind-unit">%</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">☁️ Cloud Cover</span>
        <span class="wind-value">${d.cloudCover}<span class="wind-unit">%</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">🔵 Pressure</span>
        <span class="wind-value">${d.pressure}<span class="wind-unit">hPa</span></span>
      </div>
    `);
  } catch (e) {
    setHTML('earth-weather', `<div class="error">Failed to load weather data</div>`);
  }
}

// ─── Alert System ────────────────────────────────────────────────────────────
let notifEnabled = false;
let lastAlertKp = 0;

function requestAlerts() {
  if (!('Notification' in window)) return alert('Browser notifications not supported');
  Notification.requestPermission().then(p => {
    notifEnabled = p === 'granted';
    document.getElementById('notif-btn').textContent = notifEnabled ? '🔔 On' : '🔕 Off';
  });
}

function checkAlerts(kp, flareClass) {
  const banner = document.getElementById('alert-banner');
  const alerts = [];

  if (kp >= 7) alerts.push({ msg: `🚨 Severe Geomagnetic Storm! Kp = ${kp}`, color: '#ff2200' });
  else if (kp >= 5) alerts.push({ msg: `⚠️ Geomagnetic Storm Active. Kp = ${kp}`, color: '#ff8800' });

  if (flareClass === 'X') alerts.push({ msg: '🔥 X-Class Solar Flare Detected!', color: '#ff4400' });
  else if (flareClass === 'M') alerts.push({ msg: '⚡ M-Class Solar Flare Detected', color: '#ffaa00' });

  if (alerts.length) {
    banner.innerHTML = alerts.map(a =>
      `<div class="alert-item" style="border-left:4px solid ${a.color}">${a.msg}</div>`
    ).join('');
    banner.classList.remove('hidden');

    if (notifEnabled && kp > lastAlertKp) {
      new Notification('Solar Weather Alert', { body: alerts[0].msg, icon: '☀️' });
      lastAlertKp = kp;
    }
  } else {
    banner.classList.add('hidden');
    lastAlertKp = 0;
  }
}

async function loadAurora() {
  try {
    const data = await getAuroraForecast();
    const upcoming = data.slice(0, 8);
    // format: [{time_tag, kp, observed, noaa_scale}]
    const maxKp = Math.max(...upcoming.map(d => parseFloat(d.kp ?? d[1] ?? 0)));

    function auroraChance(kp) {
      if (kp >= 7) return { text: 'Visible at mid-latitudes', color: '#ff4488' };
      if (kp >= 5) return { text: 'Visible at high latitudes', color: '#aa44ff' };
      if (kp >= 3) return { text: 'Possible near poles', color: '#4488ff' };
      return { text: 'Unlikely', color: '#555577' };
    }

    const chance = auroraChance(maxKp);
    const rows = upcoming.map(d => {
      const kp = parseFloat(d.kp ?? d[1] ?? 0);
      const color = kpColor(kp);
      const time = (d.time_tag ?? d[0] ?? '').slice(5, 16);
      const type = d.observed ?? d[2] ?? '';
      return `<div class="aurora-row">
        <span class="aurora-time">${time}</span>
        <div class="aurora-bar-wrap">
          <div class="aurora-bar" style="width:${(kp/9)*100}%;background:${color}"></div>
        </div>
        <span class="aurora-kp" style="color:${color}">${kp.toFixed(1)}</span>
        <span class="aurora-type">${type}</span>
      </div>`;
    }).join('');

    setHTML('aurora', `
      <div class="aurora-chance" style="color:${chance.color}">🌌 ${chance.text}</div>
      <div style="font-size:0.75rem;color:#666688;margin:0.4rem 0 0.8rem;">Peak Kp forecast: ${maxKp.toFixed(1)}</div>
      ${rows}
    `);
  } catch (e) {
    setHTML('aurora', `<div class="error">Failed to load aurora forecast</div>`);
  }
}

// ─── ISS Tracker ─────────────────────────────────────────────────────────────
async function loadISS() {
  try {
    const iss = await getISSPosition();
    const visColor = iss.visibility === 'daylight' ? '#ffcc44' : '#aaaaff';
    setHTML('iss', `
      <div class="iss-globe">🛰️</div>
      <div class="wind-stat">
        <span class="wind-label">📍 Latitude</span>
        <span class="wind-value">${iss.lat}°</span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">📍 Longitude</span>
        <span class="wind-value">${iss.lon}°</span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">🏔️ Altitude</span>
        <span class="wind-value">${iss.altitude}<span class="wind-unit">km</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">⚡ Velocity</span>
        <span class="wind-value">${iss.velocity}<span class="wind-unit">km/h</span></span>
      </div>
      <div class="wind-stat">
        <span class="wind-label">☀️ Visibility</span>
        <span class="wind-value" style="color:${visColor}">${iss.visibility}</span>
      </div>
      <div style="font-size:0.72rem;color:#555577;margin-top:0.5rem;">
        <a href="https://www.n2yo.com/satellite/?s=25544" target="_blank" style="color:#6688aa">View on map ↗</a>
      </div>
    `);
  } catch (e) {
    setHTML('iss', `<div class="error">Failed to load ISS data</div>`);
  }
}

// ─── 24h Chart ───────────────────────────────────────────────────────────────
let chartInstance = null;
let chartData = null;
let activeChart = 'temp';

async function loadWeatherChart() {
  try {
    chartData = await getWeatherChart();
    renderChart(activeChart);
  } catch (e) {
    document.getElementById('chart-container').innerHTML =
      `<div class="error" style="padding:1rem">Failed to load chart data</div>`;
  }
}

function showChart(type) {
  activeChart = type;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderChart(type);
}

function renderChart(type) {
  if (!chartData) return;
  const ctx = document.getElementById('weather-chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const configs = {
    temp: { data: chartData.temps, label: 'Temperature (°C)', color: '#ffcc44', fill: 'rgba(255,204,68,0.15)' },
    wind: { data: chartData.wind,  label: 'Wind Speed (km/h)', color: '#66aaff', fill: 'rgba(102,170,255,0.15)' },
    rain: { data: chartData.rain,  label: 'Rain Probability (%)', color: '#44aaff', fill: 'rgba(68,170,255,0.15)' },
  };
  const c = configs[type];

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.times,
      datasets: [{
        label: c.label,
        data: c.data,
        borderColor: c.color,
        backgroundColor: c.fill,
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#666688', maxTicksLimit: 8 }, grid: { color: '#1a1a3a' } },
        y: { ticks: { color: '#666688' }, grid: { color: '#1a1a3a' } },
      }
    }
  });
}

// ─── Earthquake Alerts ───────────────────────────────────────────────────────
async function loadEarthquakes() {
  try {
    const { significant, recent, count } = await getEarthquakes();
    const list = significant.length ? significant : recent;

    function magColor(m) {
      if (m >= 7) return '#ff2200';
      if (m >= 6) return '#ff6600';
      if (m >= 5) return '#ffaa00';
      if (m >= 4) return '#ffcc44';
      return '#44cc88';
    }

    function magLabel(m) {
      if (m >= 7) return '🚨 Major';
      if (m >= 6) return '⚠️ Strong';
      if (m >= 5) return '🟠 Moderate';
      if (m >= 4) return '🟡 Light';
      return '🟢 Minor';
    }

    const html = list.slice(0, 6).map(f => {
      const p = f.properties;
      const mag = p.mag?.toFixed(1) ?? '?';
      const place = p.place || 'Unknown location';
      const time = new Date(p.time).toLocaleString();
      const depth = f.geometry?.coordinates?.[2]?.toFixed(1) ?? '?';
      const color = magColor(p.mag);

      // browser notification for M6+
      if (notifEnabled && p.mag >= 6) {
        new Notification('🌋 Earthquake Alert', {
          body: `M${mag} - ${place}`,
        });
      }

      return `
        <div class="quake-item">
          <div class="quake-top">
            <span class="quake-mag" style="background:${color}">M${mag}</span>
            <span class="quake-label" style="color:${color}">${magLabel(p.mag)}</span>
          </div>
          <div class="quake-place">${place}</div>
          <div class="quake-meta">🕐 ${time} &nbsp;|&nbsp; 📏 Depth: ${depth} km</div>
        </div>`;
    }).join('');

    setHTML('earthquakes', `
      <div style="font-size:0.75rem;color:#666688;margin-bottom:0.6rem;">
        📡 USGS Real-time Feed &nbsp;|&nbsp; ${count} events in last 24h
      </div>
      ${list.length ? html : '<div class="no-data">No significant earthquakes in last 24h</div>'}
    `);
  } catch (e) {
    setHTML('earthquakes', `<div class="error">Failed to load earthquake data</div>`);
  }
}

async function loadAll() {
  document.getElementById('last-updated').textContent = 'Updating...';
  await Promise.allSettled([
    loadSolarWind(), loadKpIndex(),
    loadEarthWeather(), loadAurora(),
    loadISS(), loadWeatherChart(), loadEarthquakes()
  ]);

  try {
    const kpRaw = await getKpIndex();
    const kp = parseFloat(kpRaw[kpRaw.length - 1][1]);
    const { goes16 } = await getSolarFlares();
    const topFlare = goes16.filter(d => d[2]).slice(-1)[0];
    checkAlerts(kp, topFlare?.[2]?.[0] || '');
  } catch {}

  document.getElementById('last-updated').textContent =
    'Last updated: ' + new Date().toLocaleTimeString();
}

// ─── Location Search ─────────────────────────────────────────────────────────
let _searchTimeout = null;
let _searchResults = [];
let _selectedIdx = -1;

const _input = document.getElementById('location-input');
const _ul    = document.getElementById('search-results');

_input.addEventListener('input', function () {
  clearTimeout(_searchTimeout);
  _selectedIdx = -1;
  const q = this.value.trim();
  if (q.length < 2) { _ul.classList.add('hidden'); return; }
  _searchTimeout = setTimeout(doSearch, 400);
});

_input.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowDown') {
    _selectedIdx = Math.min(_selectedIdx + 1, _searchResults.length - 1);
    highlightItem();
  } else if (e.key === 'ArrowUp') {
    _selectedIdx = Math.max(_selectedIdx - 1, 0);
    highlightItem();
  } else if (e.key === 'Enter') {
    if (_selectedIdx >= 0 && _searchResults[_selectedIdx]) {
      const r = _searchResults[_selectedIdx];
      pickLocation(r.lat, r.lon, r.short);
    } else {
      doSearch();
    }
  } else if (e.key === 'Escape') {
    _ul.classList.add('hidden');
  }
});

function highlightItem() {
  [..._ul.querySelectorAll('li')].forEach((li, i) => {
    li.style.background = i === _selectedIdx ? '#1e1e3a' : '';
  });
}

async function doSearch() {
  const q = _input.value.trim();
  if (!q) return;
  _ul.innerHTML = '<li class="search-loading">Searching...</li>';
  _ul.classList.remove('hidden');
  try {
    _searchResults = await searchLocations(q);
    if (!_searchResults.length) {
      _ul.innerHTML = '<li class="search-loading">No results found</li>';
      return;
    }
    _ul.innerHTML = _searchResults.slice(0, 5).map((r, i) =>
      `<li data-idx="${i}"><span class="result-pin">📍</span><span>${r.short}</span></li>`
    ).join('');
    // attach click via JS — no inline handlers
    _ul.querySelectorAll('li[data-idx]').forEach(li => {
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        const r = _searchResults[+this.dataset.idx];
        if (r) pickLocation(r.lat, r.lon, r.short);
      });
    });
  } catch (err) {
    _ul.innerHTML = '<li class="search-loading">Search failed</li>';
  }
}

function pickLocation(lat, lon, city) {
  _input.value = city;
  _ul.classList.add('hidden');
  _searchResults = [];
  _selectedIdx = -1;
  setLocation(lat, lon, city);

  setHTML('earth-weather', `<div class="loading">Fetching weather for ${city}...</div>`);
  document.getElementById('chart-container').innerHTML =
    '<canvas id="weather-chart" height="120"></canvas>';
  chartInstance = null;

  Promise.all([
    getEarthWeatherForLocation(lat, lon, city),
    getWeatherChartForLocation(lat, lon),
  ]).then(([w, c]) => {
    renderWeather(w);
    renderChartData(c);
  }).catch(err => {
    setHTML('earth-weather', `<div class="error">Failed: ${err.message}</div>`);
  });
}

// close dropdown only when clicking outside search-wrap
document.addEventListener('mousedown', function (e) {
  if (!e.target.closest('.search-wrap')) _ul.classList.add('hidden');
});

function renderWeather(d) {
  const wc = weatherCodeLabel(d.weatherCode);
  const rainColor = d.rainProbability > 70 ? '#66aaff' : d.rainProbability > 40 ? '#ffcc44' : '#44cc88';
  setHTML('earth-weather', `
    <div style="font-size:0.75rem;color:#666688;margin-bottom:0.6rem;">
      📡 Open-Meteo Live &nbsp;|&nbsp; 📍 ${d.city} (${d.lat}°, ${d.lon}°)
    </div>
    <div class="weather-main">
      <span class="weather-icon">${wc.icon}</span>
      <div>
        <div class="weather-temp">${d.temperature}°C</div>
        <div class="weather-desc">${wc.label}</div>
      </div>
    </div>
    <div class="wind-stat">
      <span class="wind-label">💧 Rain Probability</span>
      <span class="wind-value" style="color:${rainColor}">${d.rainProbability}<span class="wind-unit">%</span></span>
    </div>
    <div class="rain-bar-wrap">
      <div class="rain-bar" style="width:${d.rainProbability}%;background:${rainColor}"></div>
    </div>
    <div class="wind-stat">
      <span class="wind-label">🌧️ Precipitation</span>
      <span class="wind-value">${d.precipitation}<span class="wind-unit">mm</span></span>
    </div>
    <div class="wind-stat">
      <span class="wind-label">💨 Wind Speed</span>
      <span class="wind-value">${d.windSpeed}<span class="wind-unit">km/h ${windDirLabel(d.windDirection)}</span></span>
    </div>
    <div class="wind-stat">
      <span class="wind-label">💨 Wind Gusts</span>
      <span class="wind-value">${d.windGusts}<span class="wind-unit">km/h</span></span>
    </div>
    <div class="wind-stat">
      <span class="wind-label">💦 Humidity</span>
      <span class="wind-value">${d.humidity}<span class="wind-unit">%</span></span>
    </div>
    <div class="wind-stat">
      <span class="wind-label">☁️ Cloud Cover</span>
      <span class="wind-value">${d.cloudCover}<span class="wind-unit">%</span></span>
    </div>
    <div class="wind-stat">
      <span class="wind-label">🔵 Pressure</span>
      <span class="wind-value">${d.pressure}<span class="wind-unit">hPa</span></span>
    </div>
  `);
}

function renderChartData(data) {
  chartData = data;
  renderChart(activeChart);
}

// Load on start, then auto-refresh every 5 minutes
detectLocationByIP().then(loc => {
  document.getElementById('location-input').placeholder = `📍 ${loc.city}`;
});
loadAll();
setInterval(loadAll, 5 * 60 * 1000);
