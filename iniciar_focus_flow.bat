@echo off
cd /d "%~dp0mi-dia"
start microsoft-edge:http://127.0.0.1:8765
"C:\Program Files (x86)\Python314\python.exe" servidor.py
