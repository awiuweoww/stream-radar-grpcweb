$headers = @{
    "X-API-KEY" = "edd1c9f034335f136f87ad84b625c8f1"
    "Content-Type" = "application/json"
}

$body = @{
    id = "radar-route"
    uri = "/radar.RadarService/*"
    plugins = @{
        "grpc-web" = @{}
        "cors" = @{
            "allow_origins" = "*"
            "allow_methods" = "GET,POST,PUT,DELETE,OPTIONS"
            "allow_headers" = "*"
            "expose_headers" = "grpc-status,grpc-message"
        }
    }
    upstream = @{
        scheme = "grpc"
        type = "roundrobin"
        nodes = @{
            "radar-backend:50051" = 1
        }
        timeout = @{
            connect = 60
            send = 60
            read = 60
        }
        keepalive_pool = @{
            size = 32
            idle_timeout = 60
            requests = 1000
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "--- Memperbarui Rute Radar (Enhanced Mode) ---" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Method Put -Uri "http://localhost:9180/apisix/admin/routes/radar-route" -Headers $headers -Body $body
    Write-Host "✅ UPDATE SUKSES: Rute sekarang lebih stabil." -ForegroundColor Green
    Write-Host "Tips: Cek status Upstream di http://localhost:9000/upstream/list" -ForegroundColor Yellow
} catch {
    Write-Host "❌ UPDATE GAGAL." -ForegroundColor Red
    $_.Exception.Message
}
