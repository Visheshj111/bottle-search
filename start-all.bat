@echo off
echo Starting BottleUp Services...

start "BottleUp Frontend" cmd /k "cd frontend && npm start"
start "BottleUp Data API" cmd /k "cd backend-api && node server.js"
start "BottleUp Search Worker" cmd /k "cd backend-worker && npx wrangler dev"

echo All services started in separate windows!
echo Frontend: http://localhost:3000
echo Data API: http://localhost:5001
echo Search Worker: http://localhost:8787
pause
