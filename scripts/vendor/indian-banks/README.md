# Indian bank logos (vendored)

The `symbol.svg` of each bank from the **indian-banks** repository
(`indian-banks-main.zip`, added to the PayGlocal Dashboard folder),
renamed to `<slug>.svg`, plus its `data/banks.json` (slug → bank name).
Slugs are the first four letters of each bank's IFSC code.

`scripts/generate-bank-logos.mjs` turns these into React components in
`src/components/icon/banks/`. To update: replace these files from a newer
copy of the repository and re-run the script.

The upstream repository ships no licence file. The marks remain their
banks' trademarks, used only to identify a bank beside its name.
