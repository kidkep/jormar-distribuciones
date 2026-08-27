@echo off
title JORMAR - Copia de Seguridad

echo ============================================
echo    JORMAR DISTRIBUCIONES
echo    Generando copia de seguridad...
echo ============================================
echo.

set DB=C:\Users\JUANCA\jormar-distribuciones\backend\jormar.db
set BACKUPS=C:\Users\JUANCA\jormar-distribuciones\backups

if not exist "%DB%" (
    echo ERROR: No se encontro la base de datos.
    echo Ruta: %DB%
    pause
    exit /b 1
)

if not exist "%BACKUPS%" mkdir "%BACKUPS%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:value') do set DT=%%I
set FECHA=%DT:~0,4%-%DT:~4,2%-%DT:~6,2%_%DT:~8,2%-%DT:~10,2%-%DT:~12,2%

copy "%DB%" "%BACKUPS%\jormar_%FECHA%.db"

echo.
echo Copia creada exitosamente:
echo %BACKUPS%\jormar_%FECHA%.db
echo.
echo Carpeta de copias:
echo %BACKUPS%
echo.
pause
