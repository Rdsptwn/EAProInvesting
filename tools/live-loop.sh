#!/usr/bin/env bash
# Perbarui harga live berulang selama jam bursa (dipanggil sync-live.yml). Tiap putaran: ambil kuotasi, commit, lalu minta Pages deploy
# (commit oleh GITHUB_TOKEN tidak memicu deploy sendiri, dan situs hanya berubah saat deploy jalan).
# Pemakaian: tools/live-loop.sh idx|global [putaran=11] [jeda_detik=270]
set -u
WHAT="$1"; N="${2:-11}"; GAP="${3:-270}"
git config user.name "github-actions[bot]"; git config user.email "github-actions[bot]@users.noreply.github.com"
for i in $(seq 1 "$N"); do
  if node tools/build-live.mjs "$WHAT"; then
    git add assets/data/live-idx.json assets/data/live-global.json 2>/dev/null || true
    if ! git diff --staged --quiet; then
      git commit -q -m "chore(data): live"
      for t in 1 2 3; do git pull -q --rebase -X theirs origin main && git push -q && break || sleep 4; done
      gh api -X POST "repos/$GITHUB_REPOSITORY/actions/workflows/pages-deploy.yml/dispatches" -f ref=main >/dev/null 2>&1 || echo "dispatch deploy gagal"
    fi
  else
    echo "putaran $i gagal, lanjut"
  fi
  if [ "$i" -lt "$N" ]; then sleep "$GAP"; fi
done
exit 0
