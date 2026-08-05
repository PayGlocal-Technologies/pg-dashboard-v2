#!/bin/bash
#
# pg-setup.command   (run this ONCE, the very first time)
# No admin rights needed. Everything it installs lives inside your home folder.
#
# HOW TO RUN IT (because it came over chat, macOS blocks a normal double-click):
#   1. Open Terminal (Cmd+Space, type Terminal, Enter)
#   2. Type:  bash    then a space
#   3. Drag this file into the Terminal window
#   4. Press Enter
#
# It is safe to run again later; it skips anything already done.

set +e
DESK="$HOME/Desktop/PayGlocal Dashboard"
REPO_DIR="$DESK/pg-dashboard-v2"
REPO_URL="PayGlocal-Technologies/pg-dashboard-v2"
BIN="$HOME/bin"
NVM_DIR="$HOME/.nvm"
NVM_VERSION="v0.40.1"

B=$(tput bold 2>/dev/null); G=$(tput setaf 2 2>/dev/null); Y=$(tput setaf 3 2>/dev/null)
R=$(tput setaf 1 2>/dev/null); C=$(tput setaf 6 2>/dev/null); N=$(tput sgr0 2>/dev/null)

step () { echo ""; echo "${B}${C}>> $1${N}"; }
ok ()   { echo "${G}   OK: $1${N}"; }
warn () { echo "${Y}   Note: $1${N}"; }
err ()  { echo "${R}   $1${N}"; }
pause () { echo ""; echo "${Y}$1${N}"; printf "Press Enter to continue... "; read -r _; }
pause_exit () {
  echo ""; echo "Press Enter to close this window."; read -r _
  osascript -e 'tell application "Terminal" to close (first window whose frontmost is true)' >/dev/null 2>&1 &
  exit "${1:-0}"
}

# Put our user-level tools (nvm's node, ~/bin) on PATH for this run.
load_tools () {
  export PATH="$BIN:$PATH"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
}

# Prints the signed-in Claude account email (returns 0) if already logged in.
claude_account () {
  local cfg="$HOME/.claude.json"
  [ -f "$cfg" ] || return 1
  if command -v node >/dev/null 2>&1; then
    node -e 'try{const c=require(process.env.HOME+"/.claude.json");const e=c&&c.oauthAccount&&c.oauthAccount.emailAddress;if(e){process.stdout.write(e);process.exit(0)}process.exit(1)}catch(_){process.exit(1)}' 2>/dev/null
  else
    grep -q "\"emailAddress\"" "$cfg" 2>/dev/null && echo "your Claude account"
  fi
}

# Find the VS Code "code" command in either Applications location.
code_bin () {
  for p in "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
           "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"; do
    [ -x "$p" ] && { echo "$p"; return 0; }
  done
  return 1
}

clear
echo "${B}${C}=====================================================${N}"
echo "${B}${C}   PayGlocal Dashboard  -  One-time setup${N}"
echo "${B}${C}=====================================================${N}"
echo ""
echo "This gets your Mac ready to design the new dashboard."
echo "No admin password is needed. It takes about 10 to 15 minutes."
pause "Ready to begin?"

load_tools

# 1. git (must already be there - it needs admin to install)
step "Step 1 of 7: Checking git"
if command -v git >/dev/null 2>&1; then
  ok "git is installed ($(git --version 2>/dev/null))."
else
  err "git is not installed, and installing it needs admin rights."
  err "Please install it from your company software portal (Self Service / Company Portal),"
  err "or ask IT to install 'Xcode Command Line Tools'. Then run this setup again."
  pause_exit 1
fi

# 2. VS Code (downloaded from the official site into ~/Applications - no admin)
step "Step 2 of 7: VS Code (your editor)"
HAVE_CODE=0
if code_bin >/dev/null 2>&1 || [ -d "/Applications/Visual Studio Code.app" ] || [ -d "$HOME/Applications/Visual Studio Code.app" ]; then
  ok "VS Code is already installed."
  HAVE_CODE=1
else
  echo "   Downloading VS Code from the official site (a large download, a few hundred MB) ..."
  mkdir -p "$HOME/Applications"
  TMPV=$(mktemp -d)
  if curl -fsSL "https://update.code.visualstudio.com/latest/darwin-universal/stable" -o "$TMPV/vscode.zip"; then
    unzip -q "$TMPV/vscode.zip" -d "$TMPV" 2>/dev/null
    if [ -d "$TMPV/Visual Studio Code.app" ]; then
      rm -rf "$HOME/Applications/Visual Studio Code.app"
      mv "$TMPV/Visual Studio Code.app" "$HOME/Applications/"
      ok "VS Code installed into your Applications folder."
      HAVE_CODE=1
    fi
  fi
  rm -rf "$TMPV"
  if [ "$HAVE_CODE" != "1" ]; then
    warn "Could not download VS Code automatically. Install it yourself from https://code.visualstudio.com"
    warn "and run this setup again."
  fi
fi

# 3. Node (user-level, via nvm - no admin)
step "Step 3 of 7: Node (installed into your home folder, no admin)"
if command -v node >/dev/null 2>&1; then
  ok "Node is installed ($(node -v))."
else
  echo "   Installing nvm (Node Version Manager) into ~/.nvm ..."
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
  load_tools
  echo "   Installing the latest stable Node ..."
  nvm install --lts >/dev/null 2>&1
  nvm alias default 'lts/*' >/dev/null 2>&1
  load_tools
  if command -v node >/dev/null 2>&1; then ok "Node installed ($(node -v))."; else
    err "Node did not install. Please check your internet connection and run setup again."; pause_exit 1
  fi
fi

# 4. GitHub CLI (user-level standalone binary - no admin)
step "Step 4 of 7: GitHub tool"
if command -v gh >/dev/null 2>&1; then
  ok "GitHub tool already installed."
else
  case "$(uname -m)" in
    arm64)  GHARCH="macOS_arm64" ;;
    x86_64) GHARCH="macOS_amd64" ;;
    *)      GHARCH="macOS_arm64" ;;
  esac
  echo "   Downloading the GitHub tool for $GHARCH ..."
  ASSET=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest \
    | grep "browser_download_url" | grep "${GHARCH}.zip" | head -1 | cut -d'"' -f4)
  if [ -n "$ASSET" ]; then
    TMP=$(mktemp -d)
    curl -fsSL "$ASSET" -o "$TMP/gh.zip"
    unzip -q "$TMP/gh.zip" -d "$TMP"
    GHBIN=$(find "$TMP" -type f -name gh -path '*/bin/*' | head -1)
    mkdir -p "$BIN"
    [ -n "$GHBIN" ] && cp "$GHBIN" "$BIN/gh" && chmod +x "$BIN/gh"
    rm -rf "$TMP"
    load_tools
  fi
  if command -v gh >/dev/null 2>&1; then ok "GitHub tool installed."; else
    warn "Could not install the GitHub tool automatically. Ask engineering for help with this step."
  fi
fi

# 5. Claude Code + VS Code extension
step "Step 5 of 7: Claude Code (your AI helper)"
if command -v claude >/dev/null 2>&1; then
  ok "Claude Code already installed."
else
  npm install -g @anthropic-ai/claude-code >/dev/null 2>&1
  load_tools
  command -v claude >/dev/null 2>&1 && ok "Claude Code installed." || warn "Claude Code did not install. Run setup again or ask engineering."
fi
if [ "$HAVE_CODE" = "1" ]; then
  CB="$(code_bin)"
  if [ -n "$CB" ]; then
    "$CB" --install-extension anthropic.claude-code >/dev/null 2>&1 \
      && ok "Claude Code extension added to VS Code." \
      || warn "Could not auto-add the VS Code extension. Your walkthrough shows how to add it by hand."
  fi
fi

# 6. Identify you + sign in to GitHub
step "Step 6 of 7: Sign you in"
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
  warn "A GitHub sign-in will open in your browser. Choose 'Login with a web browser' and approve."
  warn "If it offers to add an SSH key, say yes and accept the defaults (just press Enter for the passphrase)."
  pause "Ready to sign in to GitHub?"
  gh auth login --hostname github.com --git-protocol ssh --web
fi
# Use SSH for all git operations (pushing over HTTPS is not allowed on our repos).
gh config set git_protocol ssh 2>/dev/null
gh auth setup-git >/dev/null 2>&1

# 7. Download the project + shortcuts
step "Step 7 of 7: Download the dashboard project"
mkdir -p "$DESK"
if [ -d "$REPO_DIR/.git" ]; then
  ok "Already downloaded. Updating to the latest."
  cd "$REPO_DIR"
  git remote set-url origin "git@github.com:${REPO_URL}.git" 2>/dev/null
  git fetch origin --quiet
else
  gh repo clone "$REPO_URL" "$REPO_DIR" -- --origin origin
  if [ ! -d "$REPO_DIR/.git" ]; then
    err "Could not download the project. Ask engineering to confirm your GitHub access to $REPO_URL."
    pause_exit 1
  fi
  git -C "$REPO_DIR" remote set-url origin "git@github.com:${REPO_URL}.git" 2>/dev/null
fi
cd "$REPO_DIR" || pause_exit 1
echo "   Installing the design system (one or two minutes) ..."
npm install

echo ""
echo "${B}${C}>> Adding your shortcuts${N}"
cp "$REPO_DIR/designer-tools/pg-new-feature.command"     "$DESK/" 2>/dev/null
cp "$REPO_DIR/designer-tools/pg-publish-feature.command" "$DESK/" 2>/dev/null
chmod +x "$DESK/"*.command 2>/dev/null
ok "Shortcuts are in the 'PayGlocal Dashboard' folder on your Desktop."

# Claude sign-in (runs in its own window so it never blocks this one)
echo ""
echo "${B}${G}=====================================================${N}"
echo "${B}${G}   Last step: Claude sign-in${N}"
echo "${B}${G}=====================================================${N}"
echo ""
ACCT="$(claude_account)"
if [ -n "$ACCT" ]; then
  ok "Already signed in to Claude as $ACCT. Nothing to do here."
else
  echo "A separate Terminal window will open for the Claude sign-in."
  echo "Log in there with your PayGlocal Claude account. THIS window will continue"
  echo "on its own the moment it sees you are signed in."
  pause "Ready to sign in to Claude?"
  osascript >/dev/null 2>&1 \
    -e 'tell application "Terminal" to do script "claude login; exit"' \
    -e 'tell application "Terminal" to activate'
  printf "Waiting for you to finish signing in"
  SIGNED=""
  for i in $(seq 1 150); do
    SIGNED="$(claude_account)"
    [ -n "$SIGNED" ] && break
    printf "."
    sleep 2
  done
  echo ""
  if [ -n "$SIGNED" ]; then
    ok "Signed in to Claude as $SIGNED."
  else
    warn "Did not detect a sign-in yet. You can finish it in the other window, or later in the"
    warn "VS Code Claude panel via its 'Sign in' button. Setup is otherwise complete."
  fi
fi

echo ""
echo "${B}${G}Setup complete.${N}"
[ "$HAVE_CODE" = "0" ] && warn "Reminder: install VS Code from https://code.visualstudio.com before you start designing."
echo "To start designing, open the ${B}PayGlocal Dashboard${N} folder on your Desktop"
echo "and double-click ${B}pg-new-feature${N}."
pause_exit 0
