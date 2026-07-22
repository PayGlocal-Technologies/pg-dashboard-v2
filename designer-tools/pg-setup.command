#!/bin/bash
#
# pg-setup.command   (run this ONCE, the very first time)
# Double-click this to install everything you need and download the project.
# It is safe to run again later; it will skip anything already installed.

set +e
REPO_DIR="$HOME/PayGlocal/pg-dashboard-v2"
REPO_URL="PayGlocal-Technologies/pg-dashboard-v2"
DESK="$HOME/Desktop/PayGlocal Dashboard"

B=$(tput bold 2>/dev/null); G=$(tput setaf 2 2>/dev/null); Y=$(tput setaf 3 2>/dev/null)
R=$(tput setaf 1 2>/dev/null); C=$(tput setaf 6 2>/dev/null); N=$(tput sgr0 2>/dev/null)

step () { echo ""; echo "${B}${C}>> $1${N}"; }
ok ()   { echo "${G}   OK: $1${N}"; }
warn () { echo "${Y}   Note: $1${N}"; }
pause () { echo ""; echo "${Y}$1${N}"; printf "Press Enter to continue... "; read -r _; }
pause_exit () { echo ""; echo "Press Enter to close this window."; read -r _; exit "${1:-0}"; }

clear
echo "${B}${C}=====================================================${N}"
echo "${B}${C}   PayGlocal Dashboard  -  One-time setup${N}"
echo "${B}${C}=====================================================${N}"
echo ""
echo "This will set up your Mac to design the new dashboard."
echo "It takes about 15 to 20 minutes. You can leave it running."
echo "You may be asked for your Mac password once or twice - that is normal."
pause "Ready to begin?"

# 1. Command line tools (gives us git)
step "Step 1 of 8: Base developer tools"
if xcode-select -p >/dev/null 2>&1; then
  ok "Already installed."
else
  warn "A small Apple installer window will pop up. Click 'Install' and wait for it to finish."
  xcode-select --install
  pause "Once the Apple installer says it is done, come back here and continue."
fi

# 2. Homebrew (installs the rest)
step "Step 2 of 8: Homebrew (the installer we use for everything else)"
if command -v brew >/dev/null 2>&1; then
  ok "Already installed."
else
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
# Make sure brew is on PATH for Apple Silicon and Intel
if [ -x /opt/homebrew/bin/brew ]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
if [ -x /usr/local/bin/brew ]; then eval "$(/usr/local/bin/brew shellenv)"; fi

if ! command -v brew >/dev/null 2>&1; then
  echo "${R}Homebrew did not install correctly. Please ask engineering for help.${N}"
  pause_exit 1
fi

# 3. Node, GitHub tool
step "Step 3 of 8: Node and the GitHub tool"
command -v node >/dev/null 2>&1 && ok "Node already installed." || brew install node
command -v gh   >/dev/null 2>&1 && ok "GitHub tool already installed." || brew install gh

# 4. VS Code (the editor)
step "Step 4 of 8: VS Code (your editor)"
if [ -d "/Applications/Visual Studio Code.app" ]; then
  ok "Already installed."
else
  brew install --cask visual-studio-code
fi
CODE="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"

# 5. Claude Code (the AI helper) + the VS Code extension
step "Step 5 of 8: Claude Code (your AI helper)"
if command -v claude >/dev/null 2>&1; then
  ok "Claude Code already installed."
else
  npm install -g @anthropic-ai/claude-code
fi
if [ -x "$CODE" ]; then
  "$CODE" --install-extension anthropic.claude-code >/dev/null 2>&1 \
    && ok "Claude Code extension added to VS Code." \
    || warn "Could not auto-add the VS Code extension. Your walkthrough shows how to add it by hand."
fi

# 6. Identify you to git + GitHub
step "Step 6 of 8: Sign you in"
if [ -z "$(git config --global user.name)" ]; then
  printf "   Your full name: "; read -r GN; git config --global user.name "$GN"
fi
if [ -z "$(git config --global user.email)" ]; then
  printf "   Your PayGlocal email: "; read -r GE; git config --global user.email "$GE"
fi
ok "Name: $(git config --global user.name)  Email: $(git config --global user.email)"

echo ""
if gh auth status >/dev/null 2>&1; then
  ok "Already signed in to GitHub."
else
  warn "A GitHub sign-in will open in your browser. Choose: GitHub.com, then HTTPS, then 'Login with a web browser'."
  pause "Ready to sign in to GitHub?"
  gh auth login
  gh auth setup-git >/dev/null 2>&1
fi

# 7. Download the project
step "Step 7 of 8: Download the dashboard project"
mkdir -p "$HOME/PayGlocal"
if [ -d "$REPO_DIR/.git" ]; then
  ok "Already downloaded. Updating to the latest."
  cd "$REPO_DIR" && git fetch origin --quiet
else
  gh repo clone "$REPO_URL" "$REPO_DIR"
  if [ ! -d "$REPO_DIR/.git" ]; then
    echo "${R}Could not download the project. Ask engineering to confirm your GitHub access to $REPO_URL.${N}"
    pause_exit 1
  fi
fi
cd "$REPO_DIR" || pause_exit 1
step "Installing the design system (one or two minutes)"
npm install

# 8. Put the shortcuts on your Desktop
step "Step 8 of 8: Add your shortcuts"
mkdir -p "$DESK"
cp "$REPO_DIR/designer-tools/pg-new-feature.command"     "$DESK/" 2>/dev/null
cp "$REPO_DIR/designer-tools/pg-publish-feature.command" "$DESK/" 2>/dev/null
chmod +x "$DESK/"*.command 2>/dev/null
ok "Shortcuts are in the 'PayGlocal Dashboard' folder on your Desktop."

echo ""
echo "${B}${G}=====================================================${N}"
echo "${B}${G}   Almost done. One last thing: sign in to Claude.${N}"
echo "${B}${G}=====================================================${N}"
echo ""
echo "A sign-in for Claude Code will start now. Log in with your PayGlocal Claude account"
echo "in the browser window that opens, then return here."
pause "Ready to sign in to Claude?"
claude login 2>/dev/null || claude /login 2>/dev/null || warn "If nothing opened, open VS Code, click the Claude icon, and use its 'Sign in' button."

echo ""
echo "${B}${G}Setup complete.${N}"
echo "To start designing, open the ${B}PayGlocal Dashboard${N} folder on your Desktop"
echo "and double-click ${B}pg-new-feature${N}."
pause_exit 0
