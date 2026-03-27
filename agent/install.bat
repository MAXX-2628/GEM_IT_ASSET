@echo off
:: GEM Hospital PC Agent - Install Script
:: This script copies the agent and sets it up to run silently on every boot.
:: Does NOT require admin rights for the current user's startup.

echo Installing GEM PC Agent (User Mode)...
set TARGET_DIR=%LOCALAPPDATA%\Programs\GEM_Agent

:: 1. Create directory in LocalAppData
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: 2. Copy the executable
copy /Y "gem-pc-agent.exe" "%TARGET_DIR%\gem-pc-agent.exe"

:: 3. Set up Auto-Startup via Registry (HKCU - No Admin Required)
echo Setting up auto-startup...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "GEM_Agent" /t REG_SZ /d "\"%TARGET_DIR%\gem-pc-agent.exe\"" /f >nul

:: 4. Clean up old installation methods if they exist
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
if exist "%STARTUP_DIR%\GEM_Agent.url" del "%STARTUP_DIR%\GEM_Agent.url"
if exist "%APPDATA%\GEM_Agent" rd /s /q "%APPDATA%\GEM_Agent"

:: 5. Start the agent hidden using PowerShell
echo Starting agent...
powershell -WindowStyle Hidden -Command "Start-Process '%TARGET_DIR%\gem-pc-agent.exe' -WindowStyle Hidden"

echo.
echo Install Complete! The GEM Agent is now running in the background.
echo It will automatically start every time you log in.
pause
