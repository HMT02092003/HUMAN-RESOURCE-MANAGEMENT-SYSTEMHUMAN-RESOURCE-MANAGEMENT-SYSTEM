#!/bin/bash
# ============================================================================
# Script: Update IP Address in all .env files
# Usage: ./update-ip.sh [NEW_IP]
# Example: ./update-ip.sh 192.168.1.10
# ============================================================================

set -e

# Get current IP if not provided
if [ -z "$1" ]; then
    echo "No IP provided. Detecting current IP..."
    
    # Try to detect IP (works on Linux/Mac)
    if command -v hostname &> /dev/null; then
        IP=$(hostname -I | awk '{print $1}')
    elif command -v ifconfig &> /dev/null; then
        IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
    else
        echo "ERROR: Could not detect IP address"
        echo "Usage: ./update-ip.sh [IP_ADDRESS]"
        exit 1
    fi
    
    if [ -z "$IP" ]; then
        echo "ERROR: Could not detect IP address"
        echo "Usage: ./update-ip.sh [IP_ADDRESS]"
        exit 1
    fi
    
    echo "Detected IP: $IP"
else
    IP="$1"
    echo "Using provided IP: $IP"
fi

echo ""
echo "============================================================================"
echo "Updating all .env files with IP: $IP"
echo "============================================================================"
echo ""

# Update root .env
echo "[1/3] Updating root .env..."
sed -i.bak "s|http://[0-9.]\+:|http://$IP:|g" .env
echo "      Done."

# Update QLNS_App .env
echo "[2/3] Updating QLNS_App/.env..."
sed -i.bak "s|http://[0-9.]\+:|http://$IP:|g" QLNS_App/.env
echo "      Done."

# Update app-face-recognition .env
echo "[3/3] Updating services/app-face-recognition/.env..."
sed -i.bak "s|http://[0-9.]\+:|http://$IP:|g" services/app-face-recognition/.env
echo "      Done."

# Clean up backup files
rm -f .env.bak QLNS_App/.env.bak services/app-face-recognition/.env.bak

echo ""
echo "============================================================================"
echo "✅ SUCCESS! All .env files updated with IP: $IP"
echo "============================================================================"
echo ""
echo "Next steps:"
echo "  - Restart Docker: docker-compose restart"
echo "  - Restart mobile apps: npm start"
echo ""
