"""Read-only validation of committed FLORARIA artifacts."""
import argparse
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('floraria_artifact_checker', ROOT / 'data-pipeline/run.py')
    pipeline = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pipeline)
    try:
        counts = pipeline.run(args.root, 'verify', offline=True)
    except (ValueError, OSError, KeyError, TypeError, IndexError) as exc:
        print(f'FLORARIA artifacts FAIL: {exc}', file=sys.stderr)
        return 1
    print('FLORARIA artifacts verified: ' + ', '.join(f'{key}={value}' for key, value in counts.items()))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
