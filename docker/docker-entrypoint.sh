#!/bin/sh
set -e

# Function to check required environment variables
check_required_vars() {
    local missing=0
    for var in "$@"; do
        if [ -z "$(eval echo \$$var)" ]; then
            echo "Warning: Environment variable $var is not set or empty"
            missing=1
        fi
    done
    return $missing
}

echo "Starting environment check..."

# Check required variables
check_required_vars "NGINX_PROXY_PASS" "NGINX_PROXY_HOST" "GOFMX_TOKEN" || {
    echo "Some environment variables are missing. Using default values where applicable."
}

# Debug output (safe version)
echo "Environment variables status:"
echo "NGINX_PROXY_PASS is set: $(if [ -n "$NGINX_PROXY_PASS" ]; then echo "yes"; else echo "no"; fi)"
echo "NGINX_PROXY_HOST is set: $(if [ -n "$NGINX_PROXY_HOST" ]; then echo "yes"; else echo "no"; fi)"
echo "GOFMX_TOKEN is set: $(if [ -n "$GOFMX_TOKEN" ]; then echo "yes"; else echo "no"; fi)"

# Create temp nginx conf with environment variables
echo "Generating nginx configuration..."
envsubst '${NGINX_PROXY_PASS} ${NGINX_PROXY_HOST} ${GOFMX_TOKEN}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

echo "Starting nginx..."
exec nginx -g 'daemon off;'