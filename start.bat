@echo off
REM Daydream — double-click to run the demo.
cd /d "%~dp0"
echo.
echo   Starting Daydream...
echo   Open http://localhost:8000 in your browser.
echo   (Open a SECOND window at the same URL to demo the live layer.)
echo.
start "" http://localhost:8000
py serve.py 8000 || python serve.py 8000
pause
