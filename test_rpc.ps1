$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGtpbXFxa2Rxbm1ha3RuY3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDg0MTcsImV4cCI6MjA5NzE4NDQxN30.T8sBnVe39HDMEzmFfvWkO8XceM-MEvPWRjAhw1Dw-aM"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGtpbXFxa2Rxbm1ha3RuY3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDg0MTcsImV4cCI6MjA5NzE4NDQxN30.T8sBnVe39HDMEzmFfvWkO8XceM-MEvPWRjAhw1Dw-aM"
    "Content-Type" = "application/json"
}

$body = @{
    p_username = "admin"
    p_password_hash = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://bllkimqqkdqnmaktncvj.supabase.co/rest/v1/rpc/verify_login" -Method Post -Headers $headers -Body $body
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}
