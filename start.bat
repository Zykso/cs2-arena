@echo off
echo Starting CS2 Tournament Platform...
echo.

start "CS2 Tournament Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "CS2 Tournament Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Both servers are starting. Open http://localhost:5173 in your browser.
pause
