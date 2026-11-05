const viewport = document.querySelector<HTMLElement>('.book-viewport');
const content = document.querySelector<HTMLElement>('#book-content');
const controls = document.querySelector<HTMLElement>('#reading-controls');
const previous = document.querySelector<HTMLButtonElement>('#prev-page');
const next = document.querySelector<HTMLButtonElement>('#next-page');
const status = document.querySelector<HTMLElement>('#page-status');
const progress = document.querySelector<HTMLElement>('#progress-fill');
if (viewport && content && controls && previous && next && status && progress) {
  const media = matchMedia('(min-width: 901px) and (min-height: 561px)');
  const switcher = document.querySelector<HTMLElement>('.layout-switch');
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-layout]'));
  let mode = document.documentElement.dataset.readingLayout === 'single' ? 'single' : 'double';
  const paginated = () => media.matches && mode === 'double';
  const syncButtons = () => {
    if (switcher) switcher.hidden = false;
    buttons.forEach(button => {
      const double = button.dataset.layout === 'double';
      button.disabled = double && !media.matches;
      button.title = double && !media.matches ? '双栏需要更宽、更高的窗口' : '';
      button.setAttribute('aria-pressed', String(button.dataset.layout === (media.matches ? mode : 'single')));
    });
  };
  let page = 0;
  let pages = 1;
  let stride = 0;
  let frame = 0;
  const showPage = () => {
    page = Math.max(0, Math.min(page, pages - 1));
    content.style.transform = paginated() ? `translateX(${-page * stride}px)` : '';
    previous.disabled = page === 0;
    const lastPage = page === pages - 1;
    next.disabled = false;
    const label = lastPage ? (next.dataset.nextPost ? '下一篇' : '返回目录') : '下一页';
    next.textContent = `${label} →`;
    next.setAttribute('aria-label', lastPage ? label : '下一组双页');
    status.textContent = `${page + 1} / ${pages}`;
    progress.style.width = `${((page + 1) / pages) * 100}%`;
  };
  const layout = () => {
    const ratio = pages > 1 ? page / (pages - 1) : 0;
    document.body.classList.toggle('is-paginated', paginated());
    controls.hidden = !paginated();
    syncButtons();
    content.style.transform = '';
    if (paginated()) {
      content.style.setProperty('--code-max-height', `${Math.max(100, content.clientHeight - 100)}px`);
      const width = viewport.clientWidth;
      const gap = parseFloat(getComputedStyle(content).columnGap) || 0;
      stride = width + gap;
      pages = Math.max(1, Math.ceil((content.scrollWidth + gap - 2) / stride));
      page = Math.round(ratio * (pages - 1));
    } else { page = 0; pages = 1; content.style.removeProperty('--code-max-height'); }
    showPage();
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); };
  buttons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.layout;
    if ((selected !== 'single' && selected !== 'double') || selected === mode) return;
    const blocks = Array.from(content.querySelectorAll<HTMLElement>('.article-header,.prose > *, .article-end'));
    // Keep the first visible block when changing between scroll and pagination.
    const anchor = blocks.find(block => {
      const rect = block.getBoundingClientRect();
      return paginated() ? rect.right > 0 && rect.left < innerWidth && rect.bottom > 88 : rect.bottom > 88;
    });
    mode = selected;
    document.documentElement.dataset.readingLayout = mode;
    try { localStorage.setItem(`unehao-reading-layout-${document.documentElement.dataset.readingType}`, mode); } catch {}
    layout();
    if (anchor) {
      if (paginated()) {
        window.scrollTo(0, 0);
        page = Math.floor((anchor.getBoundingClientRect().left - content.getBoundingClientRect().left) / stride);
        showPage();
      } else {
        // The article opening must include the site header, not align its
        // title below it and accidentally scroll the navigation out of view.
        const top = anchor.classList.contains('article-header')
          ? 0
          : Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - 110);
        window.scrollTo({ top, left: 0, behavior: 'instant' });
      }
    }
  }));
  previous.addEventListener('click', () => { page--; showPage(); });
  next.addEventListener('click', () => {
    if (page === pages - 1) {
      const url = next.dataset.nextPost || next.dataset.listUrl;
      if (url) location.assign(url);
      return;
    }
    page++; showPage();
  });
  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    if (!paginated() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || target.closest('button,a,input,textarea,select,[contenteditable="true"],.code-block,pre')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); page += event.key === 'ArrowRight' ? 1 : -1; showPage();
    }
  });
  media.addEventListener('change', schedule);
  new ResizeObserver(schedule).observe(viewport);
  const fontsReady = (window as Window & { unehaoFontsReady?: Promise<void> }).unehaoFontsReady;
  (fontsReady || document.fonts.ready).then(schedule);
  content.querySelectorAll('img').forEach(img => img.addEventListener('load', schedule));
  layout();
}
