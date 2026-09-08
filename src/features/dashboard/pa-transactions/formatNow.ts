/** Formats a Date as "DD/MM/YYYY, HH:MM:SS", same shape as
 * PaTransaction.formattedCreationDateTime, for a real event's own
 * createdAt/raisedOn/resolvedOn stamp. Only ever called from an event
 * handler (e.g. handleIssueRefund, handleConfirmAcceptFull), never during
 * render, see CLAUDE.md's Date.now() purity rule. */
export function formatNow(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
