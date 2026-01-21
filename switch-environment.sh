#!/bin/bash
# Script to switch environment configuration between LOCAL and DOCKER

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Environment Configuration Switcher                    ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Select environment:"
echo "1) LOCAL Development (ports 4000-4011, localhost)"
echo "2) DOCKER Production (ports 4100-4111, service names)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
  1)
    echo ""
    echo "🔄 Switching to LOCAL development environment..."
    
    # Frontend
    if [ -f "frontend/.env.local" ]; then
      echo "✅ Frontend already configured for LOCAL"
    fi
    
    # Face Recognition App
    if [ -f "services/app-face-recognition/.env" ]; then
      sed -i 's/192.168.1.8:4100/192.168.1.8:4000/g' services/app-face-recognition/.env 2>/dev/null || \
      sed -i '' 's/192.168.1.8:4100/192.168.1.8:4000/g' services/app-face-recognition/.env 2>/dev/null
      echo "✅ Face Recognition App switched to LOCAL (port 4000)"
    fi
    
    # Mobile App (if exists)
    if [ -f "QLNS_App/.env" ]; then
      sed -i 's/:4100\/api/:4000\/api/g' QLNS_App/.env 2>/dev/null || \
      sed -i '' 's/:4100\/api/:4000\/api/g' QLNS_App/.env 2>/dev/null
      echo "✅ Mobile App switched to LOCAL (port 4000)"
    fi
    
    echo ""
    echo "📋 Local Development Configuration:"
    echo "   - Frontend: http://192.168.1.8:4000"
    echo "   - Services: localhost:400X"
    echo "   - Face Recognition App: http://192.168.1.8:4000"
    echo ""
    echo "✅ Ready to start local development!"
    echo "   Run: Start All (in VS Code tasks)"
    ;;
    
  2)
    echo ""
    echo "🔄 Switching to DOCKER production environment..."
    
    # Face Recognition App
    if [ -f "services/app-face-recognition/.env" ]; then
      sed -i 's/192.168.1.8:4000/192.168.1.8:4100/g' services/app-face-recognition/.env 2>/dev/null || \
      sed -i '' 's/192.168.1.8:4000/192.168.1.8:4100/g' services/app-face-recognition/.env 2>/dev/null
      echo "✅ Face Recognition App switched to DOCKER (port 4100)"
    fi
    
    # Mobile App (if exists)
    if [ -f "QLNS_App/.env" ]; then
      sed -i 's/:4000\/api/:4100\/api/g' QLNS_App/.env 2>/dev/null || \
      sed -i '' 's/:4000\/api/:4100\/api/g' QLNS_App/.env 2>/dev/null
      echo "✅ Mobile App switched to DOCKER (port 4100)"
    fi
    
    echo ""
    echo "📋 Docker Production Configuration:"
    echo "   - Frontend: http://192.168.1.8:4100 (external)"
    echo "   - Services: service-name:41XX (internal)"
    echo "   - Face Recognition App: http://192.168.1.8:4100"
    echo ""
    echo "✅ Ready to build Docker!"
    echo "   Run: docker-compose up --build"
    ;;
    
  *)
    echo "❌ Invalid choice. Please run again and select 1 or 2."
    exit 1
    ;;
esac

echo ""
echo "════════════════════════════════════════════════════════"
