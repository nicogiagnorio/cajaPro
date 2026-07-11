@echo off
cd /d "%~dp0"

echo === CajaPro - Commit pendientes ===
echo.

:: Sanear el indice antes de cualquier cosa
:: (previene el bug donde git add -u genera 198 staged deletions)
git restore --staged . >nul 2>&1

:: Reparar indice si esta corrupto
if exist ".git\index.lock" del /f ".git\index.lock"

:: Quitar timestamps de Vite del tracking si quedaron trackeados
for /f "delims=" %%f in ('git ls-files "vite.config.js.timestamp-*.mjs" 2^>nul') do (
    git rm --cached "%%f" >nul 2>&1
)
for /f "delims=" %%f in ('git ls-files "cajapro-web/vite.config.js.timestamp-*.mjs" 2^>nul') do (
    git rm --cached "%%f" >nul 2>&1
)

:: Agregar archivos del proyecto
echo Agregando archivos...
git add cajapro-web/
git add supabase-email-templates/
git add email_confirmacion_cajapro.html
git add database/
git add electron/
git add src/
git add package.json
git add vite.config.js
git add tailwind.config.js
git add postcss.config.js
git add index.html
git add public/
git add scripts/
git add .gitignore
git add vercel.json
git add git_commit_todo.bat

:: Excluir siempre
git reset HEAD .claude/ >nul 2>&1
git reset HEAD CajaPro_Arquitectura_Tecnica.docx >nul 2>&1
git reset HEAD CajaPro_Deploy_Vercel.pdf >nul 2>&1
git reset HEAD CajaPro_Manual_Usuario.pdf >nul 2>&1
git reset HEAD CREDENCIALES.md >nul 2>&1

:: Mostrar resumen
echo.
echo --- Archivos a commitear ---
git diff --cached --stat
echo.

set /p CONFIRM=Confirmar commit? (s/n):
if /i "%CONFIRM%" neq "s" (
    echo Cancelado.
    pause
    exit /b 0
)

set /p MSG=Mensaje del commit:
if "%MSG%"=="" set MSG=fix: actualizaciones generales

git commit -m "%MSG%"

echo.
set /p PUSH=Hacer push ahora? (s/n):
if /i "%PUSH%" equ "s" (
    git push origin main
    if %errorlevel% equ 0 (
        echo Push exitoso!
    ) else (
        echo ERROR en el push. Intentar: git push origin main
    )
)

echo.
pause
