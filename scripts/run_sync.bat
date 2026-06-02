@echo off
C:\Python314\python.exe C:\home\tesla_laptops\ttml-app-work\scripts\sync-titles-to-master.py > C:\home\tesla_laptops\ttml-app-work\scripts\sync_out.txt 2>&1
echo Exit code: %ERRORLEVEL% >> C:\home\tesla_laptops\ttml-app-work\scripts\sync_out.txt
