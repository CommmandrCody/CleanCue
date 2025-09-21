#!/usr/bin/env python3
"""
Dynamic dependency installer for CleanCue
Downloads and installs additional Python packages when needed
"""

import subprocess
import sys
import os
import json
from pathlib import Path
from typing import Dict, List, Optional

def get_venv_python() -> str:
    """Get the path to the Python executable in the virtual environment."""
    venv_path = Path(__file__).parent.parent / "venv"

    if sys.platform == "win32":
        python_path = venv_path / "Scripts" / "python.exe"
    else:
        python_path = venv_path / "bin" / "python"

    return str(python_path)

def check_package_installed(package_name: str) -> bool:
    """Check if a package is already installed."""
    try:
        python_path = get_venv_python()
        result = subprocess.run(
            [python_path, "-c", f"import {package_name}"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False

def install_requirements(requirements_file: str, progress_callback=None) -> bool:
    """Install packages from a requirements file."""
    try:
        python_path = get_venv_python()
        requirements_path = Path(__file__).parent.parent / requirements_file

        if not requirements_path.exists():
            print(f"ERROR: Requirements file not found: {requirements_path}")
            return False

        print(f"Installing packages from {requirements_file}...")
        if progress_callback:
            progress_callback(10)

        # Install packages
        result = subprocess.run(
            [python_path, "-m", "pip", "install", "-r", str(requirements_path)],
            capture_output=True,
            text=True
        )

        if progress_callback:
            progress_callback(90)

        if result.returncode == 0:
            print("✅ Installation successful!")
            if progress_callback:
                progress_callback(100)
            return True
        else:
            print(f"❌ Installation failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"❌ Installation error: {e}")
        return False

def check_stem_dependencies() -> Dict[str, bool]:
    """Check which STEM separation dependencies are available."""
    dependencies = {
        "torch": check_package_installed("torch"),
        "torchaudio": check_package_installed("torchaudio"),
        "demucs": check_package_installed("demucs")
    }
    return dependencies

def install_stem_dependencies(progress_callback=None) -> bool:
    """Install STEM separation dependencies if not already present."""
    deps = check_stem_dependencies()

    if all(deps.values()):
        print("✅ All STEM dependencies already installed!")
        return True

    print("📦 Installing STEM separation dependencies...")
    return install_requirements("requirements-stems.txt", progress_callback)

def main():
    """Command-line interface for dependency management."""
    import argparse

    parser = argparse.ArgumentParser(description="CleanCue dependency installer")
    parser.add_argument("--check-stems", action="store_true",
                       help="Check STEM dependencies status")
    parser.add_argument("--install-stems", action="store_true",
                       help="Install STEM dependencies")
    parser.add_argument("--install-requirements", type=str,
                       help="Install from specific requirements file")

    args = parser.parse_args()

    if args.check_stems:
        deps = check_stem_dependencies()
        print(json.dumps(deps, indent=2))
        sys.exit(0 if all(deps.values()) else 1)

    elif args.install_stems:
        success = install_stem_dependencies()
        sys.exit(0 if success else 1)

    elif args.install_requirements:
        success = install_requirements(args.install_requirements)
        sys.exit(0 if success else 1)

    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()