#!/bin/bash

echo "=================================================="
echo "🔍 Running Host Server Security & Readiness Audit"
echo "=================================================="

# 1. Check if user running FastAPI is non-root
CURRENT_USER=$(whoami)
echo -n "[1/5] Checking user privileges... "
if [ "$CURRENT_USER" = "root" ]; then
    echo "❌ WARNING: Running as root! You should run FastAPI as a dedicated unprivileged user."
else
    echo "✅ PASS: Running as non-root user ($CURRENT_USER)."
fi

# 2. Check if Docker daemon is accessible (redirect stream to prevent Git Bash hang)
echo -n "[2/5] Checking Docker socket permissions... "
if docker ps >/dev/null 2>&1; then
    echo "✅ PASS: Docker is running and accessible."
else
    echo "❌ FAIL: Cannot connect to Docker socket."
fi

# 3. Check if Sandbox Runner image is pre-built
echo -n "[3/5] Checking pre-built sandbox runner image... "
if docker image inspect sandbox-runner >/dev/null 2>&1; then
    echo "✅ PASS: Image 'sandbox-runner' exists locally."
else
    echo "❌ FAIL: 'sandbox-runner' image not found! Build it with 'docker compose build'."
fi

# 4. Check Nginx configuration
echo -n "[4/5] Checking Nginx reverse proxy configuration... "
if command -v nginx > /dev/null 2>&1; then
    if grep -r "proxy_set_header Upgrade" /etc/nginx/ > /dev/null 2>&1; then
        echo "✅ PASS: WebSocket upgrade headers found in Nginx config."
    else
        echo "⚠️ WARNING: Nginx detected, but 'proxy_set_header Upgrade' was not found in config."
    fi
else
    echo "ℹ️ INFO: Nginx not installed on host (skipping)."
fi

# 5. Check Environment Variables
echo -n "[5/5] Checking Environment Variables... "
if [ -n "$MAX_CONCURRENT_RUNS" ] && [ -n "$MAX_RUNTIME_SECONDS" ]; then
    echo "✅ PASS: Limits set (MAX_CONCURRENT_RUNS=$MAX_CONCURRENT_RUNS, MAX_RUNTIME_SECONDS=$MAX_RUNTIME_SECONDS)."
else
    echo "⚠️ WARNING: Environment variables MAX_CONCURRENT_RUNS or MAX_RUNTIME_SECONDS are not set in current shell."
fi

echo "=================================================="