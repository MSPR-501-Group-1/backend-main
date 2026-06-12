import express from "express";
import cors from "cors";
import 'dotenv/config';
import client from 'prom-client';

import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import userProfileRoutes from "./routes/userProfile.route.js";
import systemRoutes from "./routes/system.route.js";
import userMetricsRoutes from "./routes/userMetrics.route.js";
import workoutPredictionRoutes from "./routes/workoutPrediction.route.js";
import analyticsRoutes, { partnersRouter, dataQualityRouter, dashboardRouter, anomaliesRouter } from "./routes/analytics.route.js";
import etlRoutes from "./routes/etl.routes.js";
import filesRoutes from "./routes/files.routes.js";
import nutritionIARoutes from "./routes/nutritionIA.route.js";
import socialRoutes from "./routes/social.route.js";


// Cron pour les pipelines ETL
import './cron/cronForEtl.js';

const app = express();

// Pour exposer les métriques Prometheus
// On monte la route avant l'auth
client.collectDefaultMetrics();
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile, curl) et tous les localhost:*
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

app.use(express.json());

// Health check route pour docker et monitoring
app.use("/", systemRoutes);

// Routes publiques d'authentification
app.use("/auth", authRoutes);

// Routes protégées
app.use("/users", userRoutes);
app.use("/user-profiles", userProfileRoutes);
app.use("/metrics", userMetricsRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/partners", partnersRouter);
app.use("/data-quality", dataQualityRouter);
app.use("/", dashboardRouter);
app.use("/", anomaliesRouter);
app.use("/etl", etlRoutes);
app.use("/files", filesRoutes);
app.use("/workout-prediction", workoutPredictionRoutes);
app.use("/nutrition-ia", nutritionIARoutes);
app.use("/posts", socialRoutes);

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Erreur serveur interne"
  });
});

export default app;
