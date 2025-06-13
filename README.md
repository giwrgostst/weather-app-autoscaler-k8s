# WeatherApp: Elastic Kubernetes‐Scaled 7-Day Forecast Service

A cloud-native Weather Forecast application demonstrating automatic, demand-driven scaling on Kubernetes.

## 🚀 Features

- **7-day weather forecast** via WeatherAPI.com  
- **Custom autoscaler**: scales pods based on measured HTTP RPS  
- **Oscillating load** generator (`wrk` sine-wave pattern) via `/demand` endpoint  
- **Real-time monitoring** of replica count with Chart.js  
- **RBAC-limited scaling** using Kubernetes subresource `deployments/scale`  
- Supports optional **Horizontal Pod Autoscaler (HPA)** if `metrics-server` is available

## 📦 Repository Layout

```
/WeatherApp
│
├── Dockerfile
├── package.json
├── server.js
├── index.html
│
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── rbac-scalers.yaml
│   └── hpa.yaml            
│
└── README.md
```

## ⚙️ Prerequisites

- Docker (Engine ≥ 20.10)  
- Kubernetes cluster (≥ v1.25) with kubectl configured  
- (Optional) metrics-server installed for HPA  

## 🛠 Build & Push Docker Image

```sh
docker build -t giwrgostst/weather-app:latest .
docker push giwrgostst/weather-app:latest
```

## ☸️ Deploy to Kubernetes

1. **Deploy core resources**

   ```sh
   kubectl apply -f k8s/deployment.yaml       -n gtsitlaouri-priv
   kubectl apply -f k8s/service.yaml          -n gtsitlaouri-priv
   kubectl apply -f k8s/rbac-scalers.yaml     -n gtsitlaouri-priv
   kubectl apply -f k8s/hpa.yaml              -n gtsitlaouri-priv
   ```
   
## 🎬 Usage

1. **Access the UI**  
   Open your browser to:  
   ```
   http://<NODE_IP>:<NODE_PORT>/index.html
   ```
2. **Get Forecast**  
   Enter a city name → click Get Forecast  
3. **View Real-Time Scaling**  
   Watch the Chart.js graph update every 5 s with current replica count  
4. **Stress Test / Sine-Wave Load**  
   Click Demand to run a 60 s sine-wave wrk load pattern  

## 🔍 Monitoring & Logs

* Pods & Metrics
  ```sh
  kubectl get pods -w -n gtsitlaouri-priv
  kubectl top pods         -n gtsitlaouri-priv
  ```
* Application Logs
  ```sh
  kubectl logs deployment/weather-app-deployment -n gtsitlaouri-priv
  ```

## 💡 How It Works

1. **RPS Metering:** Express middleware counts incoming requests.  
2. **Autoscaling Loop:** Every 5 s, compute rps = requests/5, decide desired replicas (1–5), and call  
   `replaceNamespacedDeploymentScale({ name, namespace, body:{spec:{replicas}} })`.  
3. **Demand Endpoint:** Spawns wrk processes with conns = offset + amplitude·sin(…) for sine-wave load.  
4. **Chart.js:** Front-end polls `/metrics` every 5 s and redraws live replica graph.  

## 📖 Further Reading

* [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
* [@kubernetes/client-node](https://github.com/kubernetes-client/javascript)
* [wrk Benchmark Tool](https://github.com/wg/wrk)
* [Chart.js](https://www.chartjs.org/)

---

## Feel free to customize and extend! 🚀

License: MIT
