@echo off
cd /d C:\Users\nicol\Proyectos\AutomatizacionesAR

echo Iniciando git release v1.0.0... > git_release.log 2>&1

rem Limpiar lock si existe
if exist ".git\index.lock" (
    echo Eliminando index.lock residual... >> git_release.log
    del /f ".git\index.lock" >> git_release.log 2>&1
)

echo. >> git_release.log
echo === VERIFICACION SEGURIDAD === >> git_release.log
rem Verificar que archivos sensibles NO estan rastreados
git check-ignore -v .env .env.production CREDENCIALES.md build/cajapro.pfx >> git_release.log 2>&1
echo. >> git_release.log

echo === GIT ADD === >> git_release.log
git add -A >> git_release.log 2>&1
echo ADD EXIT_CODE=%ERRORLEVEL% >> git_release.log

echo. >> git_release.log
echo === ARCHIVOS STAGED === >> git_release.log
git diff --cached --name-only >> git_release.log 2>&1

echo. >> git_release.log
echo === GIT COMMIT === >> git_release.log
git commit -m "v1.0.0 - Build inicial estable" -m "- Fase 1-4 completadas: revision, fixes, build" -m "- Version 1.0.0, copyright 2026" -m "- Manejo de errores Supabase en PanelFacturar y Configuracion" -m "- Version dinamica desde package.json en preload" >> git_release.log 2>&1
echo COMMIT EXIT_CODE=%ERRORLEVEL% >> git_release.log

echo. >> git_release.log
echo === GIT TAG === >> git_release.log
git tag v1.0.0 >> git_release.log 2>&1
echo TAG EXIT_CODE=%ERRORLEVEL% >> git_release.log

echo. >> git_release.log
echo === GIT PUSH === >> git_release.log
git push origin main --tags >> git_release.log 2>&1
echo PUSH EXIT_CODE=%ERRORLEVEL% >> git_release.log

echo. >> git_release.log
echo === FINALIZADO === >> git_release.log
git log --oneline -3 >> git_release.log 2>&1
git tag --list >> git_release.log 2>&1
