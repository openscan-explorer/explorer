#!/bin/bash

# Script to setup and run hardhat-test with transaction generation
# Usage: bash scripts/run-local.sh

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "================================================"
echo "🚀 Hardhat Test Environment Setup"
echo "================================================"
echo ""

# Create artifacts zip with contracts and ignition modules
echo "📦 Creating artifacts zip..."
ZIP_FILE="hardhat-test-artifacts.zip"
rm -f "$ZIP_FILE"
zip -r "$ZIP_FILE" contracts ignition -x "*.DS_Store" -x "*__pycache__*"
echo "   ✅ Created $ZIP_FILE"
echo ""

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile
echo ""

# Check if node is already running on port 8545
if lsof -i :8545 > /dev/null 2>&1; then
    echo "⚠️  Port 8545 is already in use. Killing existing process..."
    kill $(lsof -t -i :8545) 2>/dev/null || true
    sleep 2
fi

# Start hardhat node in background
echo "🌐 Starting Hardhat node..."
npx hardhat node --network hardhatMainnet &
NODE_PID=$!

# Wait for node to be ready
echo "   Waiting for node to start..."
sleep 5

# Check if node started successfully
if ! kill -0 $NODE_PID 2>/dev/null; then
    echo "❌ Failed to start Hardhat node"
    exit 1
fi

echo "   ✅ Hardhat node running (PID: $NODE_PID)"
echo ""

# Run transaction generation script
echo "📝 Running transaction generation script..."
echo ""
npx hardhat run scripts/generate-transactions.ts --network localhost

echo ""
echo "================================================"
echo "✨ Setup Complete!"
echo "================================================"
echo ""
echo "📍 Hardhat node running at: http://127.0.0.1:8545"
echo "📍 Chain ID: 31337"
echo "📦 Artifacts saved to: $ZIP_FILE"
echo ""
echo "🔍 Open OpenScan at: http://localhost:3000/31337"
echo ""
echo "Press Ctrl+C to stop the node..."

# Keep script running and forward signals to node
trap "echo ''; echo 'Stopping Hardhat node...'; kill $NODE_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for node process
wait $NODE_PID
