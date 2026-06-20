FROM node:22-alpine

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY . .

RUN chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD curl -fsS http://127.0.0.1:3000/health || exit 1

CMD ["npm", "run", "start"]