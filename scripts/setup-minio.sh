#!/bin/bash

# MinIO Setup Script
# This script creates the necessary bucket and sets up MinIO for development

echo "🚀 Setting up MinIO for Document Management System..."

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO to start..."
sleep 10

# Install MinIO client if not present
if ! command -v mc &> /dev/null; then
    echo "📦 Installing MinIO client..."
    
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc
    # For Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    # For Windows (WSL)
    else
        curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    fi
fi

# Configure MinIO client
echo "🔧 Configuring MinIO client..."
mc alias set local http://localhost:9000 minioadmin minioadmin123

# Create bucket for documents
echo "📁 Creating documents bucket..."
mc mb local/documents --ignore-existing

# Set bucket policy to allow uploads
echo "🔐 Setting bucket policy..."
cat > bucket-policy.json << EOF
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
EOF

mc policy set-json bucket-policy.json local/documents

# Clean up
rm bucket-policy.json

echo "✅ MinIO setup complete!"
echo "🌐 MinIO Console: http://localhost:9001"
echo "🔑 Username: minioadmin"
echo "🔑 Password: minioadmin123"
echo "📦 Bucket: documents"
