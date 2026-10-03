@echo off
title KASIRKU POS UMKM Launcher
echo ===================================================
echo   MEMULAI SISTEM KASIRKU POS UMKM
echo ===================================================

echo [1/2] Menjalankan Backend Server (Port 5000)...
start "KASIRKU Backend" cmd /k "cd backend && npm start"

echo [2/2] Menjalankan Frontend Web App (Port 3000)...
start "KASIRKU Frontend" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo   Aplikasi berhasil dijalankan!
echo   Buka browser di: http://localhost:3000
echo ===================================================
pause
