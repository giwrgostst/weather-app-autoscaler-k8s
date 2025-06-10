import express from 'express';
import axios from 'axios';
import { spawn } from 'child_process';
import { KubeConfig, AppsV1Api } from '@kubernetes/client-node';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname replacement for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Constants
const DEPLOYMENT_NAME = 'weather-app-deployment';
const NAMESPACE       = 'gtsitlaouri-priv';

app.use(express.json());
app.use(express.static(__dirname));

// Kubernetes client
const kc     = new KubeConfig();
kc.loadFromDefault();       // in-cluster or ~/.kube/config
const k8sApi = kc.makeApiClient(AppsV1Api);

// In-memory history for the chart
const metricsHistory = [];

// Count incoming requests
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  next();
});

// Every 5s: calculate desired replicas and replace Scale subresource
setInterval(async () => {
  const rps    = requestCount / 5;  // measured RPS per 5 seconds
  requestCount = 0;

  // Scale ratio: 1 pod per 1 RPS
  let desired = Math.ceil(rps / 1);
  desired     = Math.max(1, Math.min(desired, 5));

  console.log(`[Autoscaler] RPS=${rps.toFixed(1)} → desired=${desired}`);

  const scaleBody = {
    apiVersion: 'autoscaling/v1',
    kind:       'Scale',
    metadata:   { name: DEPLOYMENT_NAME, namespace: NAMESPACE },
    spec:       { replicas: desired }
  };

  try {
    await k8sApi.replaceNamespacedDeploymentScale({
      name:      DEPLOYMENT_NAME,
      namespace: NAMESPACE,
      body:      scaleBody
    });
    console.log(` → Scaled to ${desired}`);
  } catch (err) {
    console.error('Scale error:', err.body?.message || err.message);
  }

  metricsHistory.push({ time: Date.now(), replicas: desired });
  if (metricsHistory.length > 60) {
    metricsHistory.shift();
  }
}, 5000);

// Weather endpoint
app.post('/weather', async (req, res) => {
  const city   = req.body.city;
  const apiKey = '11d2247344064245810190553250705';
  const url    = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=7`;

  try {
    const { data } = await axios.get(url);
    const forecast = data.forecast.forecastday.map(d => ({
      date:       d.date,
      maxTemp:    d.day.maxtemp_c,
      minTemp:    d.day.mintemp_c,
      condition:  d.day.condition.text,
      humidity:   d.day.avghumidity,
      windSpeed:  d.day.maxwind_kph,
      windDir:    d.day.wind_dir,
      precipProb: d.day.daily_chance_of_rain,
      uvIndex:    d.day.uv
    }));
    res.json(forecast);
  } catch (e) {
    console.error('Weather API error:', e.response?.data || e.message);
    const msg = e.response?.data?.error?.message || 'Server error';
    res.status(e.response ? 400 : 500).json({ error: msg });
  }
});

// Metrics & Demand endpoints
app.get('/metrics', (_req, res) => {
  res.json(metricsHistory);
});

app.post('/demand', (_req, res) => {
  const amplitude = 20;
  const offset    = 20;
  const period    = 60;   // seconds
  const duration  = 60;   // seconds
  const stepMs    = 1000; // ms

  let elapsed = 0;
  const loop = setInterval(() => {
    const t     = elapsed / period;
    let conns   = Math.floor(offset + amplitude * Math.sin(2 * Math.PI * t));
    if (conns < 1) conns = 1;
    spawn('wrk', ['-t2', `-c${conns}`, '-d1s', `http://0.0.0.0:${port}`]);
    elapsed++;
    if (elapsed >= duration) {
      clearInterval(loop);
    }
  }, stepMs);

  res.json({ status: 'Stress test started', duration, period, amplitude, offset });
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
