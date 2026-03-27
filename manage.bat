@echo off
setlocal
set PROJECT_ROOT=%~dp0
set BACKEND_DIR=%PROJECT_ROOT%backend
set FRONTEND_DIR=%PROJECT_ROOT%frontend

:MENU
cls
echo ======================================================
echo       GEM HOSPITAL IT ASSET MANAGEMENT SYSTEM
echo ======================================================
echo  [1] Start DEVELOPMENT Mode (Fresh Start)
echo  [2] Start DEVELOPMENT Mode (Fast)
echo  [3] Start PRODUCTION Mode (PM2)
echo  [4] STOP All Processes (Kill Node/PM2)
echo  [5] BUILD Frontend (Production Prep)
echo  [6] CLEAR Dependencies (Delete node_modules)
echo  [7] INSTALL Dependencies (npm install)
echo  [8] Check STATUS
echo  [9] Create New User (Database)
echo  [10] Start DOCKER Production
echo  [11] Stop DOCKER Production
echo  [12] View DOCKER Logs
echo  [0] Exit
echo ======================================================
set /p choice="Select an option: "

if "%choice%"=="1" goto FRESH_START
if "%choice%"=="2" goto START_DEV
if "%choice%"=="3" goto START_PROD
if "%choice%"=="4" goto STOP_ALL
if "%choice%"=="5" goto BUILD_FRONTEND
if "%choice%"=="6" goto CLEAR_DEPS
if "%choice%"=="7" goto INSTALL_DEPS
if "%choice%"=="8" goto CHECK_STATUS
if "%choice%"=="9" goto CREATE_USER
if "%choice%"=="10" goto START_DOCKER_PROD
if "%choice%"=="11" goto STOP_DOCKER
if "%choice%"=="12" goto DOCKER_LOGS
if "%choice%"=="0" exit
goto MENU

:FRESH_START
echo Cleaning environment...
taskkill /F /IM node.exe /T 2>nul
echo Checking dependencies...
if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] Backend node_modules missing. Installing...
    cd /d "%BACKEND_DIR%"
    call npm install
)
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Frontend node_modules missing. Installing...
    cd /d "%FRONTEND_DIR%"
    call npm install
)
goto START_DEV

:START_DEV
echo Launching Backend...
start "GEM-BACKEND-DEV" /D "%BACKEND_DIR%" cmd /k "npm run dev"
echo Launching Frontend...
start "GEM-FRONTEND-DEV" /D "%FRONTEND_DIR%" cmd /k "npm run dev"
echo System starting in development mode...
timeout /t 3 >nul
goto MENU

:START_PROD
echo Checking for PM2...
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] PM2 is not installed. Installing PM2 globally...
    call npm install -g pm2
)

echo Checking dependencies...
if not exist "%BACKEND_DIR%\node_modules" (
    echo [INFO] Installing Backend dependencies...
    cd /d "%BACKEND_DIR%"
    call npm install
)
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] Installing Frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

echo Building frontend for production...
cd /d "%FRONTEND_DIR%"
call npm run build

echo Starting production server with PM2...
cd /d "%BACKEND_DIR%"
set NODE_ENV=production

echo [INFO] Cleaning up old PM2 process if exists...
call pm2 delete GEM-SERVER 2>nul

echo [INFO] Starting new PM2 process in production mode...
call pm2 start server.js --name "GEM-SERVER"
call pm2 save

set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do set "IP=%%a"
if defined IP set LOCAL_IP=%IP: =%

echo ======================================================
echo  Production server is now running!
echo.
echo  Access Locally   : http://localhost:5000
echo  Access on Network: http://%LOCAL_IP%:5000
echo.
echo  Managed by PM2.
echo  To view logs, run: pm2 logs GEM-SERVER
echo  To monitor, run: pm2 monit
echo ======================================================
pause
goto MENU

:STOP_ALL
echo Killing Node.js processes...
taskkill /F /IM node.exe /T 2>nul
echo Stopping PM2...
call pm2 stop all 2>nul
call pm2 delete all 2>nul
echo Stopping Docker containers...
call docker-compose down 2>nul
echo All processes stopped.
pause
goto MENU

:CLEAR_DEPS
echo [WARNING] This will delete all node_modules folders.
set /p confirm="Are you sure? (y/n): "
if /i "%confirm%" neq "y" goto MENU
echo Cleaning Backend...
rmdir /s /q "%BACKEND_DIR%\node_modules" 2>nul
echo Cleaning Frontend...
rmdir /s /q "%FRONTEND_DIR%\node_modules" 2>nul
echo Dependencies cleared.
pause
goto MENU

:INSTALL_DEPS
echo Installing Backend dependencies...
cd /d "%BACKEND_DIR%"
call npm install
echo Installing Frontend dependencies...
cd /d "%FRONTEND_DIR%"
call npm install
echo Installation complete.
pause
goto MENU

:BUILD_FRONTEND
echo Building frontend...
cd /d "%FRONTEND_DIR%"
call npm run build
echo Build complete. Files are in frontend/dist.
pause
goto MENU

:CHECK_STATUS
echo --- Node Processes ---
tasklist /FI "IMAGENAME eq node.exe"
echo --- PM2 Status ---
call pm2 status
echo --- Folders ---
if exist "%BACKEND_DIR%\node_modules" (echo Backend: Installed) else (echo Backend: MISSING)
if exist "%FRONTEND_DIR%\node_modules" (echo Frontend: Installed) else (echo Frontend: MISSING)
pause
goto MENU

:CREATE_USER
cls
echo ===========================================
echo   GEM Hospital IT Asset - Create User
echo ===========================================
echo.

set /p USERNAME="Enter Username: "
set /p NAME="Enter Full Name: "
set /p EMAIL="Enter Email: "
set /p PASSWORD="Enter Password (min 6 chars): "
set /p ROLE="Enter Role (super_admin, branch_admin, viewer) [viewer]: "
set /p ASSIGNED_BRANCHES="Enter Assigned Branches (comma separated, e.g. CHN,MDU) or leave blank: "
set /p ALLOWED_PAGES="Enter Allowed Pages list (comma separated, e.g. dashboard,tickets) or leave blank: "
set /p FULL_ACCESS="Full Access to all branches? (true/false) [false]: "

if "%USERNAME%"=="" goto CREATE_USER_ERROR
if "%NAME%"=="" goto CREATE_USER_ERROR
if "%EMAIL%"=="" goto CREATE_USER_ERROR
if "%PASSWORD%"=="" goto CREATE_USER_ERROR
if "%ROLE%"=="" set ROLE=viewer
if "%FULL_ACCESS%"=="" set FULL_ACCESS=false

echo.
echo Creating user in database...
cd /d "%BACKEND_DIR%"
node scripts\createUser.js "%USERNAME%" "%PASSWORD%" "%NAME%" "%EMAIL%" "%ROLE%" "%ASSIGNED_BRANCHES%" "%ALLOWED_PAGES%" "%FULL_ACCESS%"

pause
goto MENU

:CREATE_USER_ERROR
echo.
echo ERROR: Username, Name, Email, and Password are required!
pause
goto MENU

:START_DOCKER_PROD
echo Starting DOCKER Production stack...
cd /d "%PROJECT_ROOT%"
call docker-compose up --build -d
echo.
echo ======================================================
echo  Docker Production stack is starting!
echo  Access at: https://localhost (Note: HTTPS)
echo ======================================================
pause
goto MENU

:STOP_DOCKER
echo Stopping Docker containers...
cd /d "%PROJECT_ROOT%"
call docker-compose down
echo Containers stopped.
pause
goto MENU

:DOCKER_LOGS
echo Fetching Docker logs (Ctrl+C to stop)...
cd /d "%PROJECT_ROOT%"
call docker-compose logs -f
goto MENU
