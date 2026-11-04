const viewport = document.querySelector<HTMLElement>('.book-viewport');
const content = document.querySelector<HTMLElement>('#book-content');
const controls = document.querySelector<HTMLElement>('#reading-controls');
const previous = document.querySelector<HTMLButtonElement>('#prev-page');
const next = document.querySelector<HTMLButtonElement>('#next-page');
const status = document.querySelector<HTMLElement>('#page-status');
const progress = document.querySelector<HTMLElement>('#progress-fill');
if (viewport && content && controls && previous && next && status && progress) {
  const media = matchMedia('(min-width: 901px) and (min-height: 561px)');
  let page = 0;
  let pages = 1;
  let stride = 0;
  let frame = 0;
  const showPage = () => {
    page = Math.max(0, Math.min(page, pages - 1));
    content.style.transform = media.matches ? `translateX(${-page * stride}px)` : '';
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
    document.body.classList.toggle('is-paginated', media.matches);
    controls.hidden = !media.matches;
    content.style.transform = '';
    if (media.matches) {
      content.style.setProperty('--code-max-height', `${Math.max(100, content.clientHeight - 100)}px`);
      const width = viewport.clientWidth;
      const gap = parseFloat(getComputedStyle(content).columnGap) || 0;
      stride = width + gap;
      pages = Math.max(1, Math.ceil((content.scrollWidth + gap - 2) / stride));
      page = Math.round(ratio * (pages - 1));
    } else { page = 0; pages = 1; }
    showPage();
  };
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(layout); };
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
    if (!media.matches || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || target.closest('input,textarea,select,[contenteditable="true"],.code-block,pre')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); page += event.key === 'ArrowRight' ? 1 : -1; showPage();
    }
  });
  media.addEventListener('change', schedule);
  new ResizeObserver(schedule).observe(viewport);
  document.fonts.ready.then(schedule);
  content.querySelectorAll('img').forEach(img => img.addEventListener('load', schedule));
  layout();
}
