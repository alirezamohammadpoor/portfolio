/**
 * True for the click that should run an in-page transition: primary button,
 * no modifier. Cmd/ctrl/shift-click and middle-click are left to the browser
 * so the link opens in a new tab or window as the visitor asked.
 */
export function isPlainLeftClick(e: { button?: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return (e.button ?? 0) === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
