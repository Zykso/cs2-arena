#!/bin/bash
echo "Starting CS2 Tournament Platform..."

cd "$(dirname "$0")/backend"
npm run dev &
BACKEND_PID=$!

sleep 3

cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
