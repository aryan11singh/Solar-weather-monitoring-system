// Solar/space data → local dataset | Earth weather → Open-Meteo live API

async function getSolarWind() {
  const data = await fetch('/data/solar_wind.json').then(r => r.json());
  // skip header row
  const rows = data[0][0] === 'time_tag' ? data.slice(1) : data;
  const p = rows[rows.length - 1];
  return {
    speed:       parseFloat(p[2]).toFixed(0),
    density:     parseFloat(p[1]).toFixed(2),
    temperature: parseFloat(p[3]).toExponential(2),
    bt:          parseFloat(p[5]).toFixed(2),
    bz:          parseFloat(p[4]).toFixed(2),
    source:      'Local Dataset (NOAA format)',
  };
}

async function getKpIndex() {
  return fetch('/data/kp_index.json').then(r => r.json());
}

async function getSolarFlares() {
  const [goes16, goes18] = await Promise.all([
    fetch('/data/xray_primary.json').then(r => r.json()),
    fetch('/data/xray_secondary.json').then(r => r.json()),
  ]);
  return { goes16, goes18 };
}

async function getProtonFlux() {
  const data = await fetch('/data/protons.json').then(r => r.json());
  return data[0][0] === 'time_tag' ? data.slice(1) : data;
}

async function getElectronFlux() {
  const data = await fetch('/data/electrons.json').then(r => r.json());
  return data[0][0] === 'time_tag' ? data.slice(1) : data;
}

async function getCME() {
  return fetch('/data/cme.json').then(r => r.json());
}

async function getAuroraForecast() {
  return fetch('/data/kp_forecast.json').then(r => r.json());
}

async function getISSPosition() {
  const d = await fetch('/data/iss.json').then(r => r.json());
  return {
    lat:        d.latitude.toFixed(2),
    lon:        d.longitude.toFixed(2),
    altitude:   d.altitude.toFixed(1),
    velocity:   d.velocity.toFixed(0),
    visibility: d.visibility,
  };
}

async function getEarthquakes() {
  const data = await fetch('/data/quakes.json').then(r => r.json());
  const features = data.features || [];
  const significant = features.filter(f => f.properties.mag >= 5.5);
  const recent = features.slice(0, 10);
  return { significant, recent, count: features.length };
}

async function getEarthWeather() {
  const { lat, lon, city } = await _resolveLocation();
  return getEarthWeatherForLocation(lat, lon, city);
}

async function getWeatherChart() {
  const { lat, lon } = await _resolveLocation();
  return getWeatherChartForLocation(lat, lon);
}

// ─── Location Search ─────────────────────────────────────────────────────────
let _activeLocation = null;

function setLocation(lat, lon, city) {
  _activeLocation = { lat, lon, city };
}

// Auto-detect location via IP (no browser permission needed)
async function detectLocationByIP() {
  try {
    const d = await fetch('/api/ip-location').then(r => r.json());
    if (d.latitude && d.longitude) {
      const city = [d.city, d.region, d.country_name].filter(Boolean).join(', ');
      _activeLocation = { lat: d.latitude, lon: d.longitude, city };
      return _activeLocation;
    }
  } catch (_) {}
  return { lat: 28.61, lon: 77.23, city: 'New Delhi' };
}

function _resolveLocation() {
  if (_activeLocation) return Promise.resolve(_activeLocation);
  return detectLocationByIP().then(loc => {
    _activeLocation = loc;
    return loc;
  });
}

async function searchLocations(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`).then(r => r.json());
  return res.map(r => ({
    short: [r.name, r.address?.state, r.address?.country].filter(Boolean).join(', '),
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));
}

async function getEarthWeatherForLocation(lat, lon, city) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: [
      'temperature_2m','relative_humidity_2m','precipitation',
      'weather_code','cloud_cover','wind_speed_10m',
      'wind_direction_10m','wind_gusts_10m','surface_pressure',
      'precipitation_probability'
    ].join(','),
    timezone: 'auto',
  });
  const data = await fetch(`/api/weather?${params}`).then(r => r.json());
  const c = data.current;
  return {
    temperature:     c.temperature_2m,
    humidity:        c.relative_humidity_2m,
    precipitation:   c.precipitation,
    weatherCode:     c.weather_code,
    cloudCover:      c.cloud_cover,
    windSpeed:       c.wind_speed_10m,
    windDirection:   c.wind_direction_10m,
    windGusts:       c.wind_gusts_10m,
    pressure:        c.surface_pressure,
    rainProbability: c.precipitation_probability ?? 0,
    city, lat: parseFloat(lat).toFixed(2), lon: parseFloat(lon).toFixed(2),
  };
}

async function getWeatherChartForLocation(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    hourly: 'temperature_2m,wind_speed_10m,precipitation_probability',
    forecast_days: 2,
    timezone: 'auto',
  });
  const data = await fetch(`/api/weather?${params}`).then(r => r.json());
  const h = data.hourly;
  const now = new Date();
  const idx = h.time.findIndex(t => new Date(t) >= now);
  const start = idx >= 0 ? idx : 0;
  const slice = arr => arr.slice(start, start + 24);
  return {
    times: slice(h.time).map(t => t.slice(11, 16)),
    temps: slice(h.temperature_2m),
    wind:  slice(h.wind_speed_10m),
    rain:  slice(h.precipitation_probability),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function weatherCodeLabel(code) {
  const map = {
    0:  { icon: '☀️',  label: 'Clear Sky' },
    1:  { icon: '🌤️', label: 'Mainly Clear' },
    2:  { icon: '⛅',  label: 'Partly Cloudy' },
    3:  { icon: '☁️',  label: 'Overcast' },
    45: { icon: '🌫️', label: 'Foggy' },
    48: { icon: '🌫️', label: 'Icy Fog' },
    51: { icon: '🌦️', label: 'Light Drizzle' },
    53: { icon: '🌦️', label: 'Drizzle' },
    55: { icon: '🌧️', label: 'Heavy Drizzle' },
    61: { icon: '🌧️', label: 'Light Rain' },
    63: { icon: '🌧️', label: 'Rain' },
    65: { icon: '🌧️', label: 'Heavy Rain' },
    71: { icon: '🌨️', label: 'Light Snow' },
    73: { icon: '🌨️', label: 'Snow' },
    75: { icon: '❄️',  label: 'Heavy Snow' },
    80: { icon: '🌦️', label: 'Rain Showers' },
    81: { icon: '🌧️', label: 'Heavy Showers' },
    95: { icon: '⛈️',  label: 'Thunderstorm' },
    99: { icon: '⛈️',  label: 'Thunderstorm + Hail' },
  };
  return map[code] || { icon: '🌡️', label: `Code ${code}` };
}

function windDirLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}
