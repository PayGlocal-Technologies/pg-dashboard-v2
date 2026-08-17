# Starter prompt for Claude Code (copy, paste, edit the parts in CAPS)

Paste this into the Claude Code panel in VS Code the first time you start a screen.
It tells Claude exactly how we work so the code comes out right the first time.

---

You are helping a designer build UI for pg-dashboard-v2. Follow the project's CLAUDE.md
rules at all times. Important context:

- I am a designer, not an engineer. Explain what you did in plain language, no jargon.
- Build the SCREEN and all its visual states only. Do NOT write real API or network code.
  Where real data would go, use realistic MOCK data and leave a `// TODO(integration):`
  comment for engineering.
- Use ONLY flux-ui components from `@/components/ui`. Never use bare HTML for buttons,
  inputs, tables, dialogs, etc.
- Cover every state: normal, loading, empty, error, and long or overflowing data.
- Make it work in light AND dark mode, and on mobile AND desktop.
- For any card, account, name, or ID in mock data, use fake masked values only
  (for example: `•••• •••• •••• 4242`, `Demo Merchant`, `MID_DEMO_001`). Never use real data.
- After you finish, run `npm run lint` and fix anything it reports.

The screen I want to build: DESCRIBE THE SCREEN HERE IN YOUR OWN WORDS.
For example: "A page to create a payment link. It has a form for amount, currency and a
note, a preview of the link on the right, and a table of links already created below."

Start by telling me your plan in a few bullet points before you write any code.

---

## Good things to say while you work

- "Show me the empty state and the error state too."
- "This spacing feels tight, use the next size up."
- "Make the primary button match the one on the Transactions page."
- "Add a loading skeleton while the table loads."
- "Check this in dark mode and fix anything that looks off."

## If something looks wrong

Just describe what you see: "the table is overflowing off the screen on mobile" or
"the text is hard to read in dark mode." Claude will find and fix it.
