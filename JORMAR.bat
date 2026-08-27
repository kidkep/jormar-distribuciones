@echo off
title JORMAR DISTRIBUCIONES - Iniciando...

echo ============================================
echo    JORMAR DISTRIBUCIONES
echo    Iniciando sistema...
echo ============================================
echo.

echo [1/2] Iniciando Backend (API)...
start "JORMAR - Backend" cmd /k "cd /d C:\Users\JUANCA\jormar-distribuciones\backend && venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (Navegador)...
start "JORMAR - Frontend" cmd /k "cd /d C:\Users\JUANCA\jormar-distribuciones\frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo    Abriendo navegador...
echo ============================================
start http://localhost:5173

echo.
echo Todo listo. Ya puedes usar el sistema.
echo Cierra esta ventana cuando quieras.
echo.
pause
