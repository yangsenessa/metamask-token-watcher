@echo off
cd /d "%~dp0"
echo 当前工作目录: %CD%
echo 正在启动开发服务器...
npm run dev 