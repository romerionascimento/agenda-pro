$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGtpbXFxa2Rxbm1ha3RuY3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDg0MTcsImV4cCI6MjA5NzE4NDQxN30.T8sBnVe39HDMEzmFfvWkO8XceM-MEvPWRjAhw1Dw-aM"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGtpbXFxa2Rxbm1ha3RuY3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDg0MTcsImV4cCI6MjA5NzE4NDQxN30.T8sBnVe39HDMEzmFfvWkO8XceM-MEvPWRjAhw1Dw-aM"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$body = @{
    id = "usr_1"
    name = "Administrador"
    username = "admin"
    password = "admin123"
    role = "Administrador"
    status = "aprovado"
    permissions = @("ver_dashboard", "ver_agenda", "editar_agenda", "gerenciar_clientes", "gerenciar_tecnicos_equipes", "ver_relatorios", "gerenciar_usuarios", "ver_logs", "gerenciar_configuracoes", "editar_protocolo")
} | ConvertTo-Json -Depth 3

Write-Host "Inserting admin user..."
try {
    $response = Invoke-RestMethod -Uri "https://bllkimqqkdqnmaktncvj.supabase.co/rest/v1/users" -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS: User inserted!"
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
