name: Update Timestamp

on:
  push:
    branches:
      - main
      - master
    paths-ignore:
      - 'timestamp.js'
  workflow_dispatch:

jobs:
  update-timestamp:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
        
      - name: Update timestamp in timestamp.js
        run: |
          # Get Chicago time with ISO 8601 offset
          TIMESTAMP=$(TZ='America/Chicago' date +"%Y-%m-%dT%H:%M:%S-06:00")
          cat > timestamp.js << 'EOF'
          const lastUpdated = "TIMESTAMP_PLACEHOLDER";
          
          if (typeof window !== 'undefined') {
              window.lastUpdated = lastUpdated;
          }
          
          if (typeof module !== 'undefined' && module.exports) {
              module.exports = { lastUpdated };
          }
          EOF
          sed -i "s/TIMESTAMP_PLACEHOLDER/$TIMESTAMP/" timestamp.js
          
      - name: Commit and push if changed
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          git add timestamp.js
          if git diff --staged --quiet; then
            echo "No changes to timestamp.js"
          else
            git commit -m "🤖 Auto-update timestamp [skip ci]"
            git push
          fi
