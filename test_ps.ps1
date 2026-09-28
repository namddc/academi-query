$headers = @{
    "Authorization" = "Bearer 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"
    "Accept" = "application/json"
    "Content-Type" = "application/json"
}

$body = @{
    model = "meta/llama-3.3-70b-instruct"
    messages = @(
        @{
            role = "user"
            content = @(
                @{ type = "text"; text = "hi" }
            )
        }
    )
    max_tokens = 512
    temperature = 1
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Sending request..."
    $response = Invoke-RestMethod -Uri "https://integrate.api.nvidia.com/v1/chat/completions" -Method Post -Headers $headers -Body $body -TimeoutSec 15
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
