@echo off
chcp 65001 >nul
echo ================================
echo 📦 주문 관리 시스템 시작
echo ================================
echo.

cd /d "%~dp0"

echo [1/2] Flask 서버 시작 중...
start "Flask Server" cmd /k ".\venv\Scripts\python.exe run.py"
timeout /t 3 /nobreak >nul

echo [2/2] ngrok 터널 시작 중...
start "ngrok" cmd /k ".\ngrok.exe http 5000"
timeout /t 2 /nobreak >nul

echo.
echo ✅ 서버가 시작되었습니다!
echo.
echo 📝 사용 방법:
echo    1. ngrok 창에서 공개 URL 확인
echo    2. 브라우저에서 해당 URL/excel_view 접속
echo    3. 두 창을 닫지 마세요!
echo.
pause





