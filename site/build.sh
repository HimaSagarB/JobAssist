#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
out=${1:-_site}
mkdir -p "$out/images"
cp site/index.html site/style.css "$out/"
cp src/app/icon.svg "$out/"
cp docs/images/jobassist-ai-connections.png "$out/images/"
