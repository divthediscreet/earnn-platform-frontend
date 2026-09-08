$logFile = "C:\Users\divth\Desktop\Earnn_Python_code\Frontend\mem_log.csv"
"Timestamp,PID,ProcessName,Mem_MB,CPU_s" | Out-File -FilePath $logFile -Encoding utf8

while ($true) {
    $ts = Get-Date -Format "HH:mm:ss.fff"
    Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
        $line = "$ts,$($_.Id),$($_.ProcessName),$([math]::Round($_.WorkingSet64/1MB,1)),$([math]::Round($_.CPU,1))"
        $line | Out-File -FilePath $logFile -Append -Encoding utf8
    }
    Start-Sleep -Milliseconds 1000
}
