@echo off
REM ================================================
REM Firebase Storage CORS Fix Script for WordFlow
REM ================================================
REM 
REM This script applies CORS configuration to your Firebase Storage bucket.
REM You need Google Cloud SDK installed and authenticated.
REM
REM Prerequisites:
REM 1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
REM 2. Login: gcloud auth login
REM 3. Set project: gcloud config set project YOUR_PROJECT_ID
REM
REM Your Storage bucket format: YOUR_PROJECT_ID.appspot.com
REM ================================================

echo ==============================================
echo Firebase Storage CORS Configuration Tool
echo ==============================================
echo.

REM Check if gsutil is available
where gsutil >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: gsutil not found!
    echo Please install Google Cloud SDK from https://cloud.google.com/sdk/docs/install
    echo After installing, run: gcloud auth login
    pause
    exit /b 1
)

REM Your Firebase Storage bucket (new format)
set BUCKET=sermon-recording-b79d4.firebasestorage.app

echo.
echo Applying CORS configuration to gs://%BUCKET% ...
echo.

gsutil cors set cors.json gs://%BUCKET%

if %ERRORLEVEL% equ 0 (
    echo.
    echo ================================================
    echo SUCCESS! CORS has been configured.
    echo ================================================
    echo.
    echo Verifying configuration...
    gsutil cors get gs://%BUCKET%
    echo.
    echo Your Firebase Storage should now accept requests from:
    echo  - https://word-flow-app.vercel.app
    echo  - http://localhost:3000
    echo  - http://localhost:5173
    echo.
) else (
    echo.
    echo ERROR: Failed to apply CORS configuration.
    echo.
    echo Possible fixes:
    echo 1. Make sure you're logged in: gcloud auth login
    echo 2. Set your project: gcloud config set project sermon-recording-b79d4
    echo 3. Verify bucket exists: gsutil ls gs://%BUCKET%
    echo.
)

pause
