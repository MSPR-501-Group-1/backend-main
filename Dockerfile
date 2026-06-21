# syntax=docker/dockerfile:1

# =============================================================================
#  BACKEND MAIN — Dockerfile hardened (DHI) — version complète autonome
#  Corrections vs "Dockerfile copy 2" :
#    1. Stage 1 ajouté (builder)
#    2. Chemins COPY corrigés (pas de /src, fichiers à la racine)
#    3. Swagger pré-généré dans le builder (pas au démarrage)
#    4. CMD pointe directement sur node (startup plus rapide)
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
#  STAGE 1 : builder
#  Image DHI avec outils de build (-dev). Non shippée en production.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Cache Docker : si package.json/package-lock.json n'ont pas changé,
# npm ci n'est pas ré-exécuté au prochain build.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Copier le code source après l'install des deps (optimisation cache)
RUN npm install @opentelemetry/api @opentelemetry/auto-instrumentations-node prom-client

COPY . .

# Pré-générer la doc Swagger au build, pas au runtime
RUN node ./swagger.cjs


# ─────────────────────────────────────────────────────────────────────────────
#  STAGE 2 : runtime
#  Image DHI minimale. C'est cette image qui est shippée.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

LABEL org.opencontainers.image.title="Backend Main"
LABEL org.opencontainers.image.description="API Node.js backend principal"
LABEL org.opencontainers.image.vendor="MSPR-501-Group-1"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/MSPR-501-Group-1/backend-main"
LABEL org.opencontainers.image.version="1.0.0"

# curl uniquement pour le HEALTHCHECK
RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

# ── Dépendances de production ──
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# ── Fichiers source (racine) ──
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/app.js ./app.js
COPY --from=builder /app/db.js ./db.js
COPY --from=builder /app/mongo.js ./mongo.js
COPY --from=builder /app/swagger.cjs ./swagger.cjs
COPY --from=builder /app/swagger-output.json ./swagger-output.json

# ── Dossiers applicatifs ──
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/services ./services
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/schemas ./schemas
COPY --from=builder /app/middlewares ./middlewares
COPY --from=builder /app/repositories ./repositories
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/cron ./cron

# Propriété des fichiers → utilisateur non-root `node`
RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/health || exit 1

# Pas de `npm run start` : swagger déjà généré, on démarre directement
CMD ["node", "./server.js"]
