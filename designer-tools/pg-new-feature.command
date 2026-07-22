#!/bin/bash
#
# pg-new-feature.command
# Double-click this to start work on a NEW screen or feature.
# It sets you up on a fresh branch from the latest "uat", opens VS Code,
# and starts the live preview at http://localhost:4100
#
# You never need to type any git commands. This does it for you.

REPO="$HOME/PayGlocal/pg-dashboard-v2"

# Colors (safe if unsupported)
B=$(tput bold 2>/dev/null); G=$(tput setaf 2 2>/dev/null); Y=$(tput setaf 3 2>/dev/null)
R=$(tput setaf 1 2>/dev/null); C=$(tput setaf 6 2>/dev/null); N=$(tput sgr0 2>/dev/null)

pause_exit () { echo ""; echo "Press Enter to close this window."; read -r _; exit "${1:-0}"; }

clear
echo "${B}${C}=====================================================${N}"
echo "${B}${C}   PayGlocal Dashboard  -  Start a new feature${N}"
echo "${B}${C}=====================================================${N}"
echo ""

# 1. Repo present?
if [ ! -d "$REPO/.git" ]; then
  echo "${R}I could not find the project on your computer.${N}"
  echo "Expected it here: $REPO"
  echo ""
  echo "Please run the one-time 'pg-setup' first, or ask engineering for help."
  pause_exit 1
fi
cd "$REPO" || pause_exit 1

# 2. Any unsaved work from before?
if [ -n "$(git status --porcelain)" ]; then
  CUR=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  echo "${Y}You still have unsaved work on the branch:${N} $CUR"
  echo ""
  echo "Please finish that first by double-clicking ${B}pg-publish-feature${N},"
  echo "then come back here to start something new."
  pause_exit 1
fi

# 3. Ask for the feature name
echo "What are you designing? Use a short name, for example:"
echo "  payment links, settlements, refunds, team management"
echo ""
printf "Feature name: "
read -r RAW
if [ -z "$RAW" ]; then
  echo "${R}No name entered. Nothing to do.${N}"; pause_exit 1
fi

# Turn "Payment Links" into "payment-links"
SLUG=$(echo "$RAW" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')
BRANCH="design/$SLUG"

echo ""
echo "${C}Getting the latest project files...${N}"
git fetch origin --quiet

# 4. Create a fresh branch from the latest uat
if ! git checkout -B "$BRANCH" origin/uat --quiet 2>/dev/null; then
  echo "${R}Could not start the branch from uat.${N}"
  echo "Ask engineering to check that 'uat' exists and that you have access."
  pause_exit 1
fi
echo "${G}You are now on your own branch:${N} ${B}$BRANCH${N}"

# 5. Make sure building blocks are up to date
echo ""
echo "${C}Checking design system packages (this can take a minute the first time)...${N}"
npm install --silent 2>/dev/null

# 6. Open the editor
echo ""
echo "${C}Opening VS Code...${N}"
open -a "Visual Studio Code" "$REPO" 2>/dev/null

# 7. Start the live preview
echo ""
echo "${C}Starting the live preview...${N}"
echo "Keep THIS window open while you work. It runs the preview."
echo ""
npm run dev &
DEV_PID=$!

# Wait for the preview to be ready, then open the browser
for i in $(seq 1 90); do
  if curl -s -o /dev/null http://localhost:4100 2>/dev/null; then break; fi
  sleep 1
done
open "http://localhost:4100" 2>/dev/null

echo ""
echo "${B}${G}All set. Here is what to do now:${N}"
echo "  1. In VS Code, click the ${B}Claude${N} icon in the left sidebar."
echo "  2. Tell it what to build (see your walkthrough for the starter prompt)."
echo "  3. Watch your changes appear at ${B}http://localhost:4100${N}"
echo ""
echo "When you are done, double-click ${B}pg-publish-feature${N} to hand it to engineering."
echo ""
echo "${Y}(To stop the preview later, close this window.)${N}"

wait $DEV_PID
