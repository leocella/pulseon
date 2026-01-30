@echo off
title Biocenter - Instalacao
cd /d "%~dp0"
echo ========================================
echo   BIOCENTER - Instalacao do Servidor
echo ========================================
echo.
echo Instalando dependencias...
npm install
echo.
echo ========================================
echo   Instalacao concluida!
echo   Execute 'start.bat' para iniciar
echo ========================================
pause
