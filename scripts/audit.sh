#!/bin/bash
# Audit script for bun projects
# Generates a temporary package-lock.json for npm audit

set -e

echo "Generating package-lock.json..."
npm i --package-lock-only --silent

echo "Running npm audit..."
npm audit "$@" || true

echo "Cleaning up..."
rm -f package-lock.json

echo "Done."
