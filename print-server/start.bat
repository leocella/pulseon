@echo off
title Biocenter - Servidor de Impressao Termica
cd /d "%~dp0"

REM ============================================
REM Configuracao da Impressora USB Local
REM ============================================
REM Defina o nome EXATO da impressora conforme aparece no Windows
REM Para ver as impressoras disponiveis: Painel de Controle > Dispositivos e Impressoras
REM Ou execute: powershell Get-Printer
REM ============================================

set PRINTER_NAME=KPOS_80

echo ========================================
echo   BIOCENTER - Servidor de Impressao
echo ========================================
echo.
echo Impressora configurada: %PRINTER_NAME%
echo.
echo Iniciando servidor na porta 3001...
echo.

node server.js

pause
