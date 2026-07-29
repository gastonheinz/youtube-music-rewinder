#!/usr/bin/env bash
set -euo pipefail

echo "==> python: $(python --version)"
echo "==> node:   $(node --version)"
echo "==> npm:    $(npm --version)"

if [ -f requirements.txt ]; then
  echo "==> instalando requirements.txt"
  pip install --upgrade pip
  pip install -r requirements.txt
else
  echo "==> sin requirements.txt, salteando pip"
fi

if [ -f package.json ]; then
  echo "==> instalando dependencias de node"
  npm install
else
  echo "==> sin package.json, salteando npm"
fi

echo "==> dev container listo"
