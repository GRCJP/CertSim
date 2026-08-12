#!/usr/bin/env bash
# Build and publish the app to the gh-pages branch (GitHub Pages, deploy-from-branch).
set -euo pipefail

REPO_URL="${DEPLOY_REPO_URL:-https://github.com/GRCJP/certsim.git}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building (includes Kindle pack)..."
npm run build

echo "==> Publishing dist/ to gh-pages..."
touch dist/.nojekyll
cd dist
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email="richportpictures@gmail.com" -c user.name="GRCJP" commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -q -f "$REPO_URL" gh-pages
rm -rf .git
cd "$ROOT"

echo "==> Done. Live at https://grcjp.github.io/certsim/ (Pages rebuilds in ~1 min)"
