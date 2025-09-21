#!/bin/bash

# Bundle optimization script for CleanCue
# Reduces Python venv size by removing unnecessary components

set -e

WORKERS_DIR="${1:-packages/workers}"
VENV_DIR="$WORKERS_DIR/venv"

echo "🔧 Optimizing Python bundle size..."

if [ ! -d "$VENV_DIR" ]; then
    echo "❌ Virtual environment not found at $VENV_DIR"
    exit 1
fi

echo "📊 Original venv size:"
du -sh "$VENV_DIR"

# Create backup if needed
if [ ! -d "$VENV_DIR.backup" ]; then
    echo "💾 Creating backup..."
    cp -r "$VENV_DIR" "$VENV_DIR.backup"
fi

echo "🧹 Removing development and testing packages..."

# Remove development/testing packages
rm -rf "$VENV_DIR/lib/python*/site-packages/pip"* 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/setuptools"* 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/wheel"* 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/pytest"* 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/_pytest"* 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/coverage"* 2>/dev/null || true

# Remove PyTorch development components
echo "🔥 Removing PyTorch development components..."
rm -rf "$VENV_DIR/lib/python*/site-packages/torch/include" 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/torch/bin" 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/torch/testing" 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/torch/distributed" 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/torch/onnx" 2>/dev/null || true

# Remove test directories from all packages
echo "🧪 Removing test directories..."
find "$VENV_DIR/lib/python*/site-packages" -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find "$VENV_DIR/lib/python*/site-packages" -name "test" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove example data
echo "📚 Removing example data..."
rm -rf "$VENV_DIR/lib/python*/site-packages/sklearn/datasets" 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/scipy/datasets" 2>/dev/null || true
rm -rf "$VENV_DIR/lib/python*/site-packages/librosa/example_data" 2>/dev/null || true

# Remove unnecessary metadata
echo "📋 Cleaning metadata..."
find "$VENV_DIR/lib/python*/site-packages" -name "*.dist-info" -type d | while read dir; do
    rm -f "$dir/RECORD" "$dir/INSTALLER" "$dir/direct_url.json" 2>/dev/null || true
done

# Remove unnecessary directories
rm -rf "$VENV_DIR/share" 2>/dev/null || true
rm -rf "$VENV_DIR/include" 2>/dev/null || true

# Remove .pyc files and __pycache__ directories
echo "🗑️ Removing compiled Python files..."
find "$VENV_DIR" -name "*.pyc" -delete 2>/dev/null || true
find "$VENV_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo "📊 Optimized venv size:"
du -sh "$VENV_DIR"

echo "✅ Bundle optimization complete!"
echo "💡 To restore original, run: rm -rf $VENV_DIR && mv $VENV_DIR.backup $VENV_DIR"