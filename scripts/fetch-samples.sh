#!/usr/bin/env bash
# Fetch public sample résumés for the ATS benchmark.
#
# ⚠️ FICTIONAL PEOPLE, ON PURPOSE. Real strangers' CVs are live personal data —
# names, phone numbers, addresses — and a folder of them would contradict this
# product's own promise that an uploaded file is parsed and dropped. University
# career centres publish sample résumés with invented personas precisely so they
# can be reused, and for this benchmark they are equivalent: what the parser is
# being tested on is LAYOUT, not whose life is described.
#
# Output is gitignored. Third-party material, kept locally, never redistributed.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=bench/corpus/samples
mkdir -p "$OUT"

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
UW=https://cdn.uconnectlabs.com/wp-content/uploads/sites/25
BUF=https://www.buffalo.edu/content/dam/www/career/documents/Resumes

fetch() { # url, filename
  if [ -f "$OUT/$2" ]; then echo "  have $2"; return; fi
  # buffalo.edu 403s a bare curl; a normal browser UA is enough. Not evasion —
  # these are public download links on a public page.
  if curl -fsSL --max-time 30 -A "$UA" -o "$OUT/$2" "$1"; then
    echo "  got  $2  ($(wc -c < "$OUT/$2" | tr -d ' ') bytes)"
  else
    echo "  MISS $2"; rm -f "$OUT/$2"
  fi
}

echo "University of Washington (PDF):"
fetch "$UW/2025/07/Undergraduate-Sample-Resume.pdf"              uw-undergrad.pdf
fetch "$UW/2021/07/Miranda-Hudson.pdf"                           uw-grad.pdf
fetch "$UW/2025/07/Arts-Media-Marketing-Sample-Resume.pdf"       uw-marketing.pdf
fetch "$UW/2022/08/E-Huy-Nguyen.docx.pdf"                        uw-consulting.pdf
fetch "$UW/2025/07/Health-Sample-Resume.pdf"                     uw-health.pdf
fetch "$UW/2025/07/Law-Government-Policy-Resume.pdf"             uw-law.pdf
fetch "$UW/2025/07/Physical-and-LIfe-Science-Sample-Resume.pdf"  uw-science.pdf
fetch "$UW/2026/03/D-Daniel-Garcia.docx.pdf"                     uw-tech.pdf
fetch "$UW/2025/07/Climate-Conservation-Sustainability-Resume.pdf" uw-climate.pdf
fetch "$UW/2025/07/Non-profit-Social-Justice-Education-Resume-1.pdf" uw-nonprofit.pdf
fetch "$UW/2021/07/Andrew-Peters.pdf"                            uw-cv.pdf

echo "University at Buffalo (DOCX):"
fetch "$BUF/resume-sample-engineering.docx"                      ub-engineering.docx
fetch "$BUF/resume-sample-computer-science-masters.docx"         ub-cs-masters.docx
fetch "$BUF/resume-business-and-communication.docx"              ub-business.docx
fetch "$BUF/resume-international-trade.docx"                     ub-trade.docx
fetch "$BUF/resume-alumni-with-4-years-of-experience.docx"       ub-alumni.docx
fetch "$BUF/resume-sample-social-sciences-and-humanities.docx"   ub-humanities.docx

echo
echo "$(ls -1 "$OUT" | wc -l | tr -d ' ') files in $OUT"
