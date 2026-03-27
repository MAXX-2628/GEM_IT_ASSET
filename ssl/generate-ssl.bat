@echo off
setlocal

set SSL_DIR=%~dp0
cd /d "%SSL_DIR%"

echo ======================================================
echo       SSL CERTIFICATE GENERATOR (Self-Signed)
echo ======================================================
echo.

where openssl >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] OpenSSL is not installed or not in your PATH.
    echo Please install OpenSSL for Windows to use this utility.
    pause
    exit /b 1
)

echo Generating private key...
openssl genrsa -out server.key 2048

echo Generating self-signed certificate...
openssl req -new -x509 -sha256 -key server.key -out server.crt -days 3650 -subj "/C=IN/ST=TamilNadu/L=Chennai/O=GEM Hospital/OU=IT/CN=localhost"

echo.
echo ======================================================
echo  SSL certificates generated successfully in:
echo  %SSL_DIR%
echo.
echo  Files:
echo  - server.key (Private Key)
echo  - server.crt (Public Certificate)
echo ======================================================
pause
