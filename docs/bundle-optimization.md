# CleanCue Bundle Size Optimization

## Overview

CleanCue's app bundle size is primarily driven by the Python virtual environment (1.0GB) required for audio analysis and STEM separation. This document outlines optimization strategies implemented to reduce bundle size.

## Current Bundle Size Analysis

- **Total DMG Size**: ~375MB (optimized from 388MB)
- **Main Contributors**:
  - Python venv: ~800MB (PyTorch: 474MB, NumPy: 97MB, SciPy: 82MB, etc.)
  - Electron Framework: ~261MB
  - App code (asar): ~33MB

## Optimization Strategies

### 1. Bundle Filtering (Implemented)

**File**: `apps/desktop/package.json` - `extraResources.filter`

Excludes unnecessary files from the Python environment:
- Development packages (pip, setuptools, wheel, pytest)
- PyTorch development components (include/, bin/, testing/, distributed/)
- Test directories and example data
- Metadata files and compiled Python files

**Size Reduction**: ~13MB

### 2. Dynamic Dependency Installation (Implemented)

**Files**:
- `packages/workers/requirements-minimal.txt` - Core dependencies only
- `packages/workers/requirements-stems.txt` - STEM separation dependencies
- `packages/workers/src/dependency_installer.py` - Dynamic installer

**Strategy**: Bundle only essential dependencies, install STEM dependencies when first needed.

### 3. Minimal Build Option (Implemented)

**File**: `scripts/build-minimal.sh`

Creates a version without STEM separation for ~70% smaller Python footprint:
- Only librosa, numpy, scipy, soundfile for core analysis
- No PyTorch/demucs (saves ~550MB)
- Users can still enable STEM separation via dynamic installation

### 4. Bundle Optimization Script (Implemented)

**File**: `scripts/optimize-bundle.sh`

Post-installation cleanup script that can be run on existing venv:
- Removes development and testing packages
- Cleans PyTorch development components
- Removes example data and unnecessary metadata

## Usage

### Standard Optimized Build
```bash
pnpm run build  # Uses optimized filtering
```

### Minimal Build (No STEM)
```bash
./scripts/build-minimal.sh
```

### Optimize Existing Bundle
```bash
./scripts/optimize-bundle.sh packages/workers
```

## Future Optimization Ideas

1. **Platform-specific PyTorch**: Only include CPU version for macOS, remove CUDA components
2. **Lazy Loading**: Split core analysis and STEM separation into separate processes
3. **External Dependencies**: Move Python dependencies outside app bundle
4. **Compression**: Use better compression for Python libraries

## Size Comparison

| Build Type | Python venv | Total DMG | STEM Support |
|------------|-------------|-----------|--------------|
| Original   | ~1.0GB      | ~388MB    | ✅ Bundled   |
| Optimized  | ~800MB      | ~375MB    | ✅ Bundled   |
| Minimal    | ~200MB      | ~180MB    | 🔄 Dynamic   |

## Technical Notes

- Dynamic installation requires internet connection for first STEM use
- Minimal builds still support all core analysis features (tempo, key, energy)
- Optimization scripts create backups before making changes
- Electron-builder filtering is case-sensitive and uses glob patterns