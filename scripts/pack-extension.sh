#!/usr/bin/env bash
# Pack the Jobinko browser extension into public/downloads/jobinko-extension.zip so a tester can install it from the
# profile page ("Load unpacked"). Runtime files only — no tests, no README written for engineers.
# Re-run after ANY change under extension/ and commit the zip: the deploy leaves extension/ out, so the zip is the only
# copy that ships. src/lib/__tests__/extension-package.test.ts fails if the zip and the manifest disagree.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
work=$(mktemp -d)
dir="$work/jobinko-extension"
mkdir -p "$dir" public/downloads
cp extension/manifest.json extension/popup.html extension/options.html "$dir"/
for f in extension/*.js; do cp "$f" "$dir"/; done
cat > "$dir/INSTALL.txt" <<TXT
Jobinko browser extension — test version $version

1. Unzip this file. You get a folder called "jobinko-extension".
2. In Chrome, open  chrome://extensions  (type it in the address bar).
3. Turn on "Developer mode" (top right).
4. Click "Load unpacked" and choose the "jobinko-extension" folder.
5. Click the puzzle-piece icon in Chrome's toolbar and pin Jobinko.
6. Sign in at https://jobinko.in in the same browser, then open a job on a supported site (Greenhouse, Lever, Workable,
   Ashby, Workday and others) and click the Jobinko icon.

It reads only the page you are on. It does not run on LinkedIn or Naukri, on purpose.
To update: download the new zip, replace the folder, then press the reload arrow on chrome://extensions.
TXT
out="$PWD/public/downloads/jobinko-extension.zip"
rm -f "$out"
(cd "$work" && zip -rqX "$out" jobinko-extension)
rm -rf "$work"
echo "packed $out (version $version, $(du -h "$out" | cut -f1))"
unzip -l "$out" | tail -n +4 | head -20
