/**
 * 访客人数：进页面时上报一次，取回「本页 / 全站」两个去重后的人数。
 *
 * 去重发生在服务端（同一个 IP + 浏览器指纹只算一次），所以这里
 * 每次打开页面都可以放心上报，不会把数字刷高。
 */

interface Stats {
  page?: number;
  site?: number;
  today?: number;
  todaySite?: number;
}

const formatter = new Intl.NumberFormat('zh-CN');

function pagePath(base: string): string {
  const pathname = window.location.pathname;
  let path = pathname;
  if (base !== '/' && base !== '' && path.startsWith(base)) {
    path = `/${path.slice(base.length)}`;
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

function paint(el: HTMLElement, stats: Stats): void {
  const pageNode = el.querySelector<HTMLElement>('[data-visitor-page]');
  const siteNode = el.querySelector<HTMLElement>('[data-visitor-site]');
  if (typeof stats.page === 'number' && pageNode) {
    pageNode.textContent = formatter.format(stats.page);
  }
  if (typeof stats.site === 'number' && siteNode) {
    siteNode.textContent = formatter.format(stats.site);
  }
  // 位置一开始就占好了，这里只负责让数字可见，避免文章分栏重新排版。
  el.removeAttribute('data-pending');
  el.removeAttribute('aria-hidden');
}

async function report(el: HTMLElement): Promise<void> {
  const endpoint = (el.dataset.endpoint ?? '').replace(/\/+$/, '');
  if (!endpoint) {
    el.remove();
    return;
  }
  const base = el.dataset.base ?? '/';
  try {
    const response = await fetch(`${endpoint}/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: pagePath(base) }),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      keepalive: true,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const stats = (await response.json()) as Stats;
    paint(el, stats);
  } catch {
    // 接口不可用时宁可不显示，也不要挂一个「—」在那里。
    el.remove();
  }
}

function run(): void {
  // 浏览器预渲染的页面不算一次真实访问。
  if ((document.visibilityState as string) === 'prerender') return;
  document.querySelectorAll<HTMLElement>('[data-visitor]').forEach((el) => {
    void report(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run, { once: true });
} else {
  run();
}

export {};
