# Build stage
FROM node:18-alpine as build

# Only VITE_* vars are needed at build time; secrets are runtime-only
ARG VITE_GOFMX_STATUS
ARG VITE_API_BASE_URL

ENV VITE_GOFMX_STATUS=$VITE_GOFMX_STATUS
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files and configs
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install tzdata and set timezone
RUN apk add --no-cache tzdata
ENV TZ=America/Chicago

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy and make entrypoint executable
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Lets Arcane report this container as healthy rather than merely running, and
# makes a crash-looping nginx visible as unhealthy instead of silently up.
# busybox wget ships in nginx:alpine, so this needs no extra packages.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["/docker-entrypoint.sh"]
