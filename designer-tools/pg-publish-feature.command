#!/bin/bash
#
# pg-publish-feature.command
# Double-click this when a screen or feature is finished.
# It saves your work, sends it to GitHub, records it in the feature list,
# and gives you a ready-to-send message for engineering.
#
# You never need to type any git commands. This does it for you.

REPO="$HOME/Desktop/PayGlocal Dashboard/pg-dashboard-v2"

# Make user-level tools available (Node via nvm, GitHub tool in ~/bin).
# A double-clicked .command does not read your shell startup files, so load them here.
export PATH="$HOME/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1

B=$(tput bold 2>/dev/null); G=$(tput setaf 2 2>/dev/null); Y=$(tput setaf 3 2>/dev/null)
R=$(tput setaf 1 2>/dev/null); C=$(tput setaf 6 2>/dev/null); N=$(tput sgr0 2>/dev/null)

pause_exit () {
  echo ""; echo "Press Enter to close this window."; read -r _
  osascript -e 'tell application "Terminal" to close (first window whose frontmost is true)' >/dev/null 2>&1 &
  exit "${1:-0}"
}

clear
echo "${B}${C}=====================================================${N}"
echo "${B}${C}   PayGlocal Dashboard  -  Publish your work${N}"
echo "${B}${C}=====================================================${N}"
echo ""

if [ ! -d "$REPO/.git" ]; then
  echo "${R}I could not find the project at:${N} $REPO"
  pause_exit 1
fi
cd "$REPO" || pause_exit 1

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Safety: only publish design branches
case "$BRANCH" in
  design/*) : ;;
  *)
    echo "${R}You are not on a design branch (you are on '$BRANCH').${N}"
    echo "Start a feature first with ${B}pg-new-feature${N}, then publish."
    pause_exit 1
    ;;
esac

FEATURE="${BRANCH#design/}"

if [ -z "$(git status --porcelain)" ]; then
  echo "${Y}There are no new changes to publish on '$BRANCH'.${N}"
  echo "If you already published, you are done. Otherwise build something first."
  pause_exit 0
fi

echo "You are publishing the feature: ${B}$FEATURE${N}"
echo ""
echo "In one line, what did you build? (for example:"
echo "  create-link screen with empty, loading and error states)"
echo ""
printf "Summary: "
read -r SUMMARY
[ -z "$SUMMARY" ] && SUMMARY="Design for $FEATURE"

NAME=$(git config user.name 2>/dev/null); [ -z "$NAME" ] && NAME=$(whoami)
DATE=$(date "+%Y-%m-%d")

# Make sure the tracker exists
if [ ! -f "FEATURES.md" ]; then
  {
    echo "# Feature Tracker (pg-dashboard-v2)"
    echo ""
    echo "| Feature | Design branch | Designer | Status | Date | Summary |"
    echo "|---------|---------------|----------|--------|------|---------|"
  } > FEATURES.md
fi
echo "| $FEATURE | \`$BRANCH\` | $NAME | Ready for integration | $DATE | $SUMMARY |" >> FEATURES.md

echo ""
echo "${C}Saving your work...${N}"
git add -A
git commit -m "design: $FEATURE - $SUMMARY" --quiet

echo "${C}Sending it to GitHub...${N}"
if ! git push -u origin "$BRANCH" --quiet 2>/dev/null; then
  echo "${R}Saved on your computer, but could not upload to GitHub.${N}"
  echo "Ask engineering to check your GitHub access, then run this again."
  pause_exit 1
fi

echo ""
echo "${B}${G}Done. Your work is published.${N}"
echo ""
echo "${B}Copy the message below and send it to engineering (Slack or email):${N}"
echo "${C}-----------------------------------------------------${N}"
echo "Design ready for integration: ${B}$FEATURE${N}"
echo "Branch: $BRANCH"
echo "What it is: $SUMMARY"
echo "Please create integration/$FEATURE from $BRANCH and wire up the APIs."
echo "${C}-----------------------------------------------------${N}"
echo ""
echo "It is also recorded in FEATURES.md automatically."
pause_exit 0
