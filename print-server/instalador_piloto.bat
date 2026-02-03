@echo off
title Instalador Biocenter - Unidade Piloto
:: Entra na pasta onde o script esta
set BASE_DIR=%~dp0
cd /d "%BASE_DIR%"

echo [1/3] Limpando instalacoes anteriores...
nssm stop BiocenterPrint >nul 2>&1
nssm remove BiocenterPrint confirm >nul 2>&1

echo [2/3] Registrando Servico com IP 10.1.1.150...
:: Comando para instalar o servico usando o nssm que voce acabou de baixar
nssm install BiocenterPrint "C:\Program Files\nodejs\node.exe" "%BASE_DIR%server.js"
nssm set BiocenterPrint AppDirectory "%BASE_DIR%"
nssm set BiocenterPrint DisplayName "Biocenter - Servidor de Impressao"
nssm set BiocenterPrint Description "Gerencia a impressao das senhas via rede no IP 10.1.1.150"
nssm set BiocenterPrint Start SERVICE_AUTO_START

echo [3/3] Iniciando o servico oculto...
nssm start BiocenterPrint

echo.
echo ======================================================
echo   PILOTO 100% INSTALADO!
echo   Pode fechar esta janela. O servidor ja esta rodando.
echo ======================================================
pause