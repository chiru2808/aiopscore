#!/bin/sh

# Set default values if not provided
export AP_APP_TITLE="${AP_APP_TITLE:-Activepieces}"
export AP_FAVICON_URL="${AP_FAVICON_URL:-https://cdn.activepieces.com/brand/favicon.ico}"

# Debug: Print environment variables
echo "AP_APP_TITLE: $AP_APP_TITLE"
echo "AP_FAVICON_URL: $AP_FAVICON_URL"

# Process environment variables in index.html BEFORE starting services
envsubst '${AP_APP_TITLE} ${AP_FAVICON_URL}' < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp && \
mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html

# Process environment variables in nginx.conf
export PORT="${PORT:-8080}"
envsubst '${PORT}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp && \
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf



# Start Nginx server
nginx -g "daemon off;" &

# Start backend server
if [ "$AP_CONTAINER_TYPE" = "APP" ] && [ "$AP_PM2_ENABLED" = "true" ]; then
    echo "Starting backend server with PM2 (APP mode)"
    pm2-runtime start dist/packages/server/api/main.cjs --name "activepieces-app" --node-args="--enable-source-maps" -i 0
else
    # Construct Redis URL if missing but Host/Port present
    if [ -z "$AP_REDIS_URL" ] && [ -n "$AP_REDIS_HOST" ]; then
        echo "DEBUG: Constructing AP_REDIS_URL from HOST/PORT..."
        export AP_REDIS_URL="redis://${AP_REDIS_HOST}:${AP_REDIS_PORT:-6379}"
    fi

    echo "DEBUG: Starting Real Process..."
    node --enable-source-maps --trace-warnings --trace-uncaught dist/packages/server/api/main.cjs
fi