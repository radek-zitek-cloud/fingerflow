#!/bin/bash
# FingerFlow Full Stack Development Startup Script

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FingerFlow Development Environment        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}Note: tmux not found. Starting services in background...${NC}"

    # Start backend
    echo -e "${BLUE}Starting backend...${NC}"
    cd backend
    source .venv/bin/activate
    uvicorn main:app --reload --log-level info > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..

    # Wait for backend to start
    sleep 3

    # Start frontend
    echo -e "${BLUE}Starting frontend...${NC}"
    cd frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..

    echo ""
    echo -e "${GREEN}✓ Services started!${NC}"
    echo -e "${GREEN}  Backend:  http://localhost:8000${NC}"
    echo -e "${GREEN}  Frontend: http://localhost:5173${NC}"
    echo -e "${GREEN}  API Docs: http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW}Logs are being written to backend.log and frontend.log${NC}"
    echo -e "${YELLOW}To stop services: kill ${BACKEND_PID} ${FRONTEND_PID}${NC}"
    echo ""
    echo "Backend PID: ${BACKEND_PID}" > .dev-pids
    echo "Frontend PID: ${FRONTEND_PID}" >> .dev-pids

else
    # Use tmux for better management
    echo -e "${BLUE}Starting services in tmux...${NC}"

    # Create a new tmux session
    tmux new-session -d -s fingerflow

    # Split window horizontally
    tmux split-window -h

    # Start backend in left pane
    tmux send-keys -t fingerflow:0.0 'cd backend && source .venv/bin/activate && uvicorn main:app --reload --log-level info' C-m

    # Start frontend in right pane
    tmux send-keys -t fingerflow:0.1 'cd frontend && npm run dev' C-m

    echo ""
    echo -e "${GREEN}✓ Services started in tmux session 'fingerflow'${NC}"
    echo -e "${GREEN}  Backend:  http://localhost:8000${NC}"
    echo -e "${GREEN}  Frontend: http://localhost:5173${NC}"
    echo -e "${GREEN}  API Docs: http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${BLUE}To attach to tmux session: tmux attach -t fingerflow${NC}"
    echo -e "${BLUE}To detach from tmux: Ctrl+B, then D${NC}"
    echo -e "${BLUE}To stop all services: tmux kill-session -t fingerflow${NC}"
    echo ""
fi
