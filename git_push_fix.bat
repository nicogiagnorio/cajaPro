@echo off
cd /d C:\Users\nicol\Proyectos\AutomatizacionesAR

echo Iniciando fix push v1.0.0... > git_push_fix.log 2>&1

echo === GIT PULL REBASE === >> git_push_fix.log
git pull --rebase origin main >> git_push_fix.log 2>&1
echo PULL EXIT_CODE=%ERRORLEVEL% >> git_push_fix.log

echo. >> git_push_fix.log
echo === GIT PUSH === >> git_push_fix.log
git push origin main >> git_push_fix.log 2>&1
echo PUSH EXIT_CODE=%ERRORLEVEL% >> git_push_fix.log

echo. >> git_push_fix.log
echo === LOG FINAL === >> git_push_fix.log
git log --oneline -5 >> git_push_fix.log 2>&1

echo. >> git_push_fix.log
echo === ESTADO REMOTO === >> git_push_fix.log
git log --oneline origin/main -3 >> git_push_fix.log 2>&1
