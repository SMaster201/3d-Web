@echo off
echo ===================================================
echo   Starting Aegis Vision (Frontend + Backend)
echo ===================================================

:: Start the FastAPI backend directly using the aegis python environment
echo [1/2] Starting FastAPI Backend server in 'aegis' environment...
start "Aegis Backend" /min "C:\Users\fcu\Anaconda\envs\aegis\python.exe" backend\main.py

:: Give the backend a moment to start up
echo [Wait] Waiting for backend to initialize...
timeout /t 3 /nobreak > nul

:: Open the frontend in the default browser
echo [2/2] Opening Aegis Vision Frontend...
start index.html

echo.
echo All systems started! 
echo You can close this terminal window, but DO NOT close the minimized "Aegis Backend" window.
timeout /t 3 > nul
