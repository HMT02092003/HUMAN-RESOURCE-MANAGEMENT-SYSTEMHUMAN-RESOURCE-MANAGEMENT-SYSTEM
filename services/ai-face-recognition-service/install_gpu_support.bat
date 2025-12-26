@echo off
REM Install onnxruntime-gpu in QLNS environment for CUDA acceleration

echo ======================================
echo Installing ONNX Runtime GPU Support
echo ======================================
echo.

echo [INFO] Activating QLNS environment...
call E:\Anaconda\Scripts\activate.bat QLNS

if errorlevel 1 (
    echo [ERROR] Failed to activate QLNS environment
    pause
    exit /b 1
)

echo [INFO] Installing onnxruntime-gpu...
conda install -c conda-forge onnxruntime-gpu -y

if errorlevel 1 (
    echo [ERROR] Failed to install onnxruntime-gpu
    pause
    exit /b 1
)

echo.
echo [SUCCESS] onnxruntime-gpu installed successfully!
echo.
echo [INFO] Checking available providers...
python -c "import onnxruntime as ort; print('Available providers:', ort.get_available_providers())"

echo.
echo ======================================
echo Installation Complete
echo ======================================
pause
