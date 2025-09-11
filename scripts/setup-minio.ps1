# MinIO Setup Script for Windows PowerShell
# This script creates the necessary bucket and sets up MinIO for development

Write-Host "🚀 Setting up MinIO for Document Management System..." -ForegroundColor Green

# Wait for MinIO to be ready
Write-Host "⏳ Waiting for MinIO to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Download MinIO client if not present
$mcPath = "mc.exe"
if (!(Test-Path $mcPath)) {
    Write-Host "📦 Downloading MinIO client..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://dl.min.io/client/mc/release/windows-amd64/mc.exe" -OutFile "mc.exe"
}

# Configure MinIO client
Write-Host "🔧 Configuring MinIO client..." -ForegroundColor Yellow
& $mcPath alias set local http://localhost:9000 minioadmin minioadmin123

# Create bucket for documents
Write-Host "📁 Creating documents bucket..." -ForegroundColor Yellow
& $mcPath mb local/documents --ignore-existing

# Set bucket policy to allow uploads
Write-Host "🔐 Setting bucket policy..." -ForegroundColor Yellow
$bucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::documents/*"]
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": ["s3:PutObject"],
      "Resource": ["arn:aws:s3:::documents/*"]
    }
  ]
}
"@

$bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding UTF8
& $mcPath policy set-json bucket-policy.json local/documents

# Clean up
Remove-Item "bucket-policy.json" -ErrorAction SilentlyContinue

Write-Host "✅ MinIO setup complete!" -ForegroundColor Green
Write-Host "🌐 MinIO Console: http://localhost:9001" -ForegroundColor Cyan
Write-Host "🔑 Username: minioadmin" -ForegroundColor Cyan
Write-Host "🔑 Password: minioadmin123" -ForegroundColor Cyan
Write-Host "📦 Bucket: documents" -ForegroundColor Cyan
