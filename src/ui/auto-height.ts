/**
 * 書く欄(textarea)の高さを中身に合わせる(spec R49 補、plan/023、plan/025)。
 * 上限は CSS の max-h で決め、超えたら中で送る
 */
export function fitHeight(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  // 下線(border)の分も足す。足さないと、1px 足りずに中で送る印が出る
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`
}
