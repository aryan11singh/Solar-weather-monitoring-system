#!/usr/bin/env python3
import json, urllib.request, urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

LOCAL_DATA = {
    '/data/solar_wind.json':    'data/solar_wind.json',
    '/data/kp_index.json':      'data/kp_index.json',
    '/data/kp_forecast.json':   'data/kp_forecast.json',
    '/data/xray_primary.json':  'data/xray_primary.json',
    '/data/xray_secondary.json':'data/xray_secondary.json',
    '/data/protons.json':       'data/protons.json',
    '/data/electrons.json':     'data/electrons.json',
    '/data/cme.json':           'data/cme.json',
    '/data/iss.json':           'data/iss.json',
    '/data/quakes.json':        'data/quakes.json',
    '/data/weather.json':       'data/weather.json',
    '/data/weather_chart.json': 'data/weather_chart.json',
}

def proxy(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {'User-Agent': 'SolarWeatherApp/1.0'})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read()

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        qs   = self.path[len(path):]  # includes '?...'

        if path in LOCAL_DATA:
            try:
                with open(LOCAL_DATA[path], 'rb') as f:
                    data = f.read()
                self._json(200, data)
            except Exception as e:
                self._json(404, json.dumps({'error': str(e)}).encode())

        elif path == '/api/geocode':
            # ?q=city+name  →  Nominatim search
            params = urllib.parse.parse_qs(qs.lstrip('?'))
            q = params.get('q', [''])[0]
            url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({
                'q': q, 'format': 'json', 'limit': 5,
                'addressdetails': 1, 'featuretype': 'city'
            })
            try:
                self._json(200, proxy(url))
            except Exception as e:
                self._json(502, json.dumps({'error': str(e)}).encode())

        elif path == '/api/ip-location':
            # auto-detect location from IP using ipapi.co
            try:
                data = proxy('https://ipapi.co/json/', headers={'User-Agent': 'SolarWeatherApp/1.0'})
                self._json(200, data)
            except Exception as e:
                self._json(502, json.dumps({'error': str(e)}).encode())

        elif path == '/api/weather':
            # forward all query params to open-meteo
            url = 'https://api.open-meteo.com/v1/forecast' + qs
            try:
                self._json(200, proxy(url))
            except Exception as e:
                self._json(502, json.dumps({'error': str(e)}).encode())

        else:
            super().do_GET()

    def _json(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        print(fmt % args)  # enable logs

if __name__ == '__main__':
    server = HTTPServer(('', 8181), Handler)
    print('Solar Weather Server running at http://localhost:8181')
    server.serve_forever()
