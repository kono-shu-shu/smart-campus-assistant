@echo off
chcp 65001 >nul
title 智慧校园后端服务 (回环 127.0.0.1:3000)
cd /d "%~dp0"
echo 正在启动智慧校园登录认证后端...
node server.js
pause