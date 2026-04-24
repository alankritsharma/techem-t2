#!/usr/bin/env python3
"""Run the thin FastAPI demo server over outputs/demo JSON files."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import uvicorn

from techem_forecast.demo_api import create_app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local Techem demo FastAPI server.")
    parser.add_argument("--output-dir", default="outputs/demo")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    app = create_app(output_dir=args.output_dir)
    uvicorn.run(app, host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
