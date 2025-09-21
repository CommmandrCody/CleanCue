#!/bin/bash

# Build CleanCue with minimal Python dependencies for smaller bundle size
# This creates a version without STEM separation capabilities but much smaller size

set -e

echo "🏗️ Building CleanCue with minimal Python environment..."

# Save current directory
ORIGINAL_DIR=$(pwd)
WORKERS_DIR="packages/workers"

# Check if we're in the right directory
if [ ! -d "$WORKERS_DIR" ]; then
    echo "❌ Please run this script from the CleanCue root directory"
    exit 1
fi

echo "📊 Current venv size:"
du -sh "$WORKERS_DIR/venv" 2>/dev/null || echo "No venv found"

# Create minimal venv
echo "🔧 Creating minimal Python environment..."

# Backup existing venv if it exists
if [ -d "$WORKERS_DIR/venv" ]; then
    echo "💾 Backing up existing venv..."
    mv "$WORKERS_DIR/venv" "$WORKERS_DIR/venv.full.backup"
fi

# Create new minimal venv
cd "$WORKERS_DIR"
python3 -m venv venv
source venv/bin/activate

# Install only minimal requirements
echo "📦 Installing minimal dependencies..."
pip install --no-cache-dir -r requirements-minimal.txt

# Return to original directory
cd "$ORIGINAL_DIR"

echo "📊 Minimal venv size:"
du -sh "$WORKERS_DIR/venv"

# Build the application
echo "🏗️ Building CleanCue desktop app..."
cd apps/desktop
npm run build

echo "✅ Minimal build complete!"
echo "📱 Check the release folder for optimized builds"
echo "💡 To restore full environment: rm -rf $WORKERS_DIR/venv && mv $WORKERS_DIR/venv.full.backup $WORKERS_DIR/venv"