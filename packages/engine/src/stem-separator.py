#!/usr/bin/env python3
"""
CleanCue STEM Separation Worker
Uses Demucs Hybrid for high-quality audio source separation
"""

import sys
import os
import json
import sqlite3
import time
import traceback
from pathlib import Path
import tempfile
import shutil

try:
    import demucs.separate
    import torch
    import torchaudio
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import numpy as np
except ImportError as e:
    print(f"ERROR: Missing required dependencies: {e}")
    print("Please install: pip install demucs torch torchaudio")
    sys.exit(1)


class StemSeparator:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.model = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"Using device: {self.device}")

    def load_model(self, model_name: str = "htdemucs"):
        """Load the Demucs model"""
        try:
            print(f"Loading model: {model_name}")
            self.model = get_model(model_name)
            self.model.to(self.device)
            self.model.eval()
            print("Model loaded successfully")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False

    def update_progress(self, separation_id: str, progress: float, status: str = None):
        """Update progress in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            if status:
                cursor.execute(
                    "UPDATE stem_separations SET progress = ?, status = ? WHERE id = ?",
                    (progress, status, separation_id)
                )
            else:
                cursor.execute(
                    "UPDATE stem_separations SET progress = ? WHERE id = ?",
                    (progress, separation_id)
                )

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error updating progress: {e}")

    def update_error(self, separation_id: str, error_message: str):
        """Update error status in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "UPDATE stem_separations SET status = ?, error_message = ? WHERE id = ?",
                ('error', error_message, separation_id)
            )

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error updating error status: {e}")

    def update_completion(self, separation_id: str, stem_paths: dict, processing_time: int):
        """Update completion status with file paths"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                UPDATE stem_separations SET
                    status = ?,
                    progress = ?,
                    vocals_path = ?,
                    drums_path = ?,
                    bass_path = ?,
                    other_path = ?,
                    processing_time_ms = ?,
                    completed_at = ?
                WHERE id = ?
            """, (
                'completed',
                100.0,
                stem_paths.get('vocals'),
                stem_paths.get('drums'),
                stem_paths.get('bass'),
                stem_paths.get('other'),
                processing_time,
                int(time.time() * 1000),
                separation_id
            ))

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error updating completion: {e}")

    def separate_audio(self, input_path: str, output_dir: str, separation_id: str, settings: dict):
        """Perform STEM separation using Demucs"""
        start_time = time.time()

        try:
            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)

            # Update status to processing
            self.update_progress(separation_id, 0.0, 'processing')

            # Load audio file
            print(f"Loading audio: {input_path}")
            waveform, sample_rate = torchaudio.load(input_path)

            # Convert to the model's expected format
            if waveform.shape[0] > 2:  # More than stereo
                waveform = waveform[:2]  # Take first 2 channels
            elif waveform.shape[0] == 1:  # Mono
                waveform = waveform.repeat(2, 1)  # Convert to stereo

            self.update_progress(separation_id, 10.0)

            # Apply the model
            print("Applying separation model...")
            with torch.no_grad():
                waveform = waveform.to(self.device)
                sources = apply_model(
                    self.model,
                    waveform.unsqueeze(0),  # Add batch dimension
                    device=self.device,
                    split=True,
                    overlap=0.25
                )[0]  # Remove batch dimension

            self.update_progress(separation_id, 70.0)

            # Get the source names from the model
            source_names = self.model.sources
            print(f"Separated sources: {source_names}")

            # Save each stem
            stem_paths = {}
            base_name = Path(input_path).stem

            for i, source_name in enumerate(source_names):
                output_path = os.path.join(output_dir, f"{base_name}_{source_name}.wav")

                # Get the source audio
                source_audio = sources[i].cpu()

                # Save as WAV
                torchaudio.save(output_path, source_audio, sample_rate)
                stem_paths[source_name] = output_path

                print(f"Saved {source_name}: {output_path}")

            self.update_progress(separation_id, 90.0)

            # Calculate processing time
            processing_time = int((time.time() - start_time) * 1000)

            # Update completion
            self.update_completion(separation_id, stem_paths, processing_time)

            print(f"Separation completed in {processing_time/1000:.2f}s")
            return True

        except Exception as e:
            error_msg = f"Separation failed: {str(e)}"
            print(error_msg)
            print(traceback.format_exc())
            self.update_error(separation_id, error_msg)
            return False


def main():
    if len(sys.argv) != 6:
        print("Usage: python stem-separator.py <db_path> <input_file> <output_dir> <separation_id> <settings_json>")
        sys.exit(1)

    db_path = sys.argv[1]
    input_file = sys.argv[2]
    output_dir = sys.argv[3]
    separation_id = sys.argv[4]
    settings_json = sys.argv[5]

    try:
        settings = json.loads(settings_json)
    except json.JSONDecodeError:
        print("Error: Invalid settings JSON")
        sys.exit(1)

    # Validate input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file does not exist: {input_file}")
        sys.exit(1)

    # Create separator instance
    separator = StemSeparator(db_path)

    # Load model
    model_name = settings.get('model', 'htdemucs')
    if not separator.load_model(model_name):
        separator.update_error(separation_id, f"Failed to load model: {model_name}")
        sys.exit(1)

    # Perform separation
    success = separator.separate_audio(input_file, output_dir, separation_id, settings)

    if success:
        print("STEM separation completed successfully")
        sys.exit(0)
    else:
        print("STEM separation failed")
        sys.exit(1)


if __name__ == "__main__":
    main()