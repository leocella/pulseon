@echo off
title Biocenter - Instalacao do Servidor de Impressao
cd /d "%~dp0"

echo ========================================
echo   BIOCENTER - Instalacao do Servidor
echo ========================================
echo.
echo Instalando dependencias do Node.js...
echo.

npm install

echo.
echo ========================================
echo   Instalacao concluida!
echo ========================================
echo.
echo PROXIMO PASSO:
echo.
echo 1. Abra 'start.bat' com o Bloco de Notas
echo 2. Verifique se PRINTER_NAME esta correto:
echo    set PRINTER_NAME=KPOS_80
echo.
echo 3. Execute 'start.bat' para iniciar o servidor
echo.
echo Para ver as impressoras disponiveis no Windows:
powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"
echo.
echo ========================================
pause
