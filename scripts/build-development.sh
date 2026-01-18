#!/bin/bash

# Set consistent encoding environment
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export NODE_OPTIONS="--max-old-space-size=4096"

echo "Building Hardhat-only version (network 31337 only)..."

# Get current commit hash
COMMIT_HASH=$(git rev-parse HEAD)

# Clean previous build
rm -r dist || true

# Build the app with only Hardhat network (31337) enabled
echo "Building React app on commit $COMMIT_HASH"
NODE_ENV=development REACT_APP_ENVIRONMENT=development REACT_APP_COMMIT_HASH=$COMMIT_HASH REACT_APP_OPENSCAN_NETWORKS=31337 npm run build

echo "Hardhat-only build completed!"
echo "Build output is in ./dist/"
echo "Enabled network: 31337 (Hardhat)"

