#!/bin/bash
# FingerFlow Production Health Check Script
# Usage: ./scripts/health-check.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load domain from .env
if [ -f .env ]; then
    DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2)
else
    DOMAIN="fingerflow.zitek.cloud"
fi

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  FingerFlow Production Health Check${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Docker services
echo -e "${YELLOW}🐳 Docker Container Status:${NC}"
docker compose ps
echo ""

# Check backend health endpoint
echo -e "${YELLOW}💚 Backend Health Check:${NC}"
BACKEND_HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
    echo "   Response: $BACKEND_HEALTH"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
fi
echo ""

# Check frontend
echo -e "${YELLOW}🌐 Frontend Health Check:${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend is responding (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Frontend error (HTTP $FRONTEND_STATUS)${NC}"
fi
echo ""

# Check public URL (if accessible)
echo -e "${YELLOW}🌍 Public URL Health Check:${NC}"
PUBLIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/health 2>/dev/null)
if [ "$PUBLIC_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Public URL is accessible (HTTP $PUBLIC_STATUS)${NC}"
    echo "   URL: https://$DOMAIN"
else
    echo -e "${RED}❌ Public URL error (HTTP $PUBLIC_STATUS)${NC}"
    echo "   This might be a Traefik routing issue"
fi
echo ""

# Check security headers
echo -e "${YELLOW}🔒 Security Headers Check:${NC}"
HEADERS=$(curl -sI https://$DOMAIN/health 2>/dev/null)
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    echo -e "${GREEN}✅ x-content-type-options${NC}"
else
    echo -e "${RED}❌ x-content-type-options missing${NC}"
fi
if echo "$HEADERS" | grep -qi "x-frame-options"; then
    echo -e "${GREEN}✅ x-frame-options${NC}"
else
    echo -e "${RED}❌ x-frame-options missing${NC}"
fi
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    echo -e "${GREEN}✅ strict-transport-security${NC}"
else
    echo -e "${RED}❌ strict-transport-security missing${NC}"
fi
echo ""

# Check database connectivity
echo -e "${YELLOW}🗄️  Database Check:${NC}"
DB_STATUS=$(docker compose exec -T backend python -c "from app.database import engine; print('connected' if engine else 'error')" 2>/dev/null)
if [ "$DB_STATUS" = "connected" ]; then
    echo -e "${GREEN}✅ Database connection OK${NC}"
else
    echo -e "${RED}❌ Database connection error${NC}"
fi
echo ""

# Check disk space
echo -e "${YELLOW}💾 Disk Space:${NC}"
df -h | grep -E "Filesystem|/$" | head -2
echo ""

# Check container resource usage
echo -e "${YELLOW}📊 Container Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

# Check recent errors in logs
echo -e "${YELLOW}⚠️  Recent Errors (last 10 minutes):${NC}"
ERROR_COUNT=$(docker compose logs --since 10m 2>&1 | grep -i error | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${RED}Found $ERROR_COUNT errors${NC}"
    docker compose logs --since 10m 2>&1 | grep -i error | tail -5
else
    echo -e "${GREEN}✅ No errors in last 10 minutes${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Health check completed${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
