# Build stage
FROM node:18-alpine as build

# Accept build arguments
ARG GOFMX_TOKEN
ARG NGINX_PROXY_PASS
ARG NGINX_PROXY_HOST
ARG VITE_GOFMX_STATUS
ARG VITE_API_BASE_URL

# Set environment variables
ENV GOFMX_TOKEN=$GOFMX_TOKEN
ENV NGINX_PROXY_PASS=$NGINX_PROXY_PASS
ENV NGINX_PROXY_HOST=$NGINX_PROXY_HOST
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

CMD ["/docker-entrypoint.sh"]