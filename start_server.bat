@echo off
echo Starting Church Web Server Environment...

:: Start Backend Server
start "Backend Server" cmd /k "cd /d %~dp0server && node server.js"

:: Start Frontend Client
start "Frontend Client" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Both servers have been launched in separate windows.
echo Please wait for them to initialize.
echo.
pause
