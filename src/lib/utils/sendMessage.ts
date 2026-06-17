/** Post a message to the parent window (for website-embedded login iframes). */
export function sendMessage(data: unknown): void {
  if (typeof window !== "undefined" && window.parent) {
    window.parent.postMessage(data, "*");
  }
}
