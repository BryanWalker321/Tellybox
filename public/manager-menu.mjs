// Put action menus in the top layer so tables cannot clip them.
export function overlayMenu(details) {
  const summary = details.querySelector('summary');
  const panel = document.createElement('div');
  panel.className = 'manager-menu-panel';
  panel.setAttribute('popover', 'auto');
  panel.append(...[...details.children].filter(child => child !== summary));
  details.append(panel);
  summary.setAttribute('aria-expanded', 'false');
  function close() { if (panel.matches(':popover-open')) panel.hidePopover(); }
  function position() {
    const anchor = summary.getBoundingClientRect();
    const width = panel.offsetWidth, height = panel.offsetHeight;
    panel.style.left = `${Math.max(8, Math.min(anchor.left, innerWidth - width - 8))}px`;
    const below = innerHeight - anchor.bottom - 8;
    panel.style.top = `${Math.max(8, below >= height || below >= anchor.top ? anchor.bottom + 4 : anchor.top - height - 4)}px`;
    panel.style.maxHeight = `${Math.max(80, Math.max(below, anchor.top - 12))}px`;
  }
  summary.addEventListener('click', event => {
    event.preventDefault();
    if (panel.matches(':popover-open')) return close();
    details.open = true;
    panel.showPopover();
    position();
  });
  panel.addEventListener('beforetoggle', event => {
    const open = event.newState === 'open';
    details.open = open;
    summary.setAttribute('aria-expanded', String(open));
  });
  panel.addEventListener('click', event => { if (event.target.closest('button,a')) close(); });
  details.addEventListener('toggle', () => { if (!details.open) close(); });
  return panel;
}
