@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Python environment missing. Follow README.md installation steps.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" run.py --port 5173
if errorlevel 1 pause
