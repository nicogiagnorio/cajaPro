@echo off
cd /d C:\Users\nicol\Proyectos\AutomatizacionesAR
echo Iniciando electron-builder v1.0.0... > build_v1.log
npx electron-builder --win --publish never >> build_v1.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> build_v1.log
echo Build finalizado. >> build_v1.log
