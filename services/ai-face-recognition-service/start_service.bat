@echo off
echo ======================================
echo Starting AI Face Recognition Service (QLNS)
echo ======================================

REM 1. Kich hoat moi truong Conda (Day la buoc QUAN TRONG nhat)
REM Duong dan nay dua tren thu muc E:\Anaconda ma ban da cung cap
call E:\Anaconda\Scripts\activate.bat QLNS

REM 2. Chuyen thu muc lam viec ve noi chua file script nay
pushd %~dp0

echo [INFO] Dang chay server voi GPU...

REM 3. Chay file main.py (Luc nay da co du moi truong)
python main.py

if errorlevel 1 (
    echo.
    echo [LOI] Chuong trinh bi dung dot ngot.
    pause
)

pause