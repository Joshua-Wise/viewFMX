FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001

# Hits the unauthenticated /healthz route added in server.js. PORT is honoured
# so the check follows the port the app actually binds.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT:-3001}/healthz" || exit 1

CMD ["node", "server.js"]
