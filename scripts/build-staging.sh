#!/bin/bash

# Set consistent encoding environment
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

echo "Building staging version..."

# Install dependencies
echo "Installing dependencies..."
bun install --frozen-lockfile

# Get current commit hash
COMMIT_HASH=$(git rev-parse HEAD)

# Build the app using Vite
echo "Building React app on commit $COMMIT_HASH"
NODE_ENV=staging REACT_APP_COMMIT_HASH=$COMMIT_HASH bun run vite build
echo "Staging build completed!"
echo "Build output is in ./dist/"
