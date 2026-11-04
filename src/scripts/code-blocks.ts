for (const pre of document.querySelectorAll<HTMLPreElement>('.prose pre')) {
  const code = pre.querySelector('code');
  if (!code) continue;
  const block = document.createElement('div'); block.className = 'code-block';
  const toolbar = document.createElement('div'); toolbar.className = 'code-toolbar';
  const language = document.createElement('span'); language.textContent = pre.dataset.language || 'text';
  const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'code-copy'; copy.textContent = '复制'; copy.setAttribute('aria-label', '复制代码');
  const message = document.createElement('span'); message.className = 'code-copy-status'; message.setAttribute('role','status');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent || '');
      copy.textContent = '已复制'; message.textContent = '代码已复制';
    } catch { copy.textContent = '复制失败'; message.textContent = '请手动选择代码复制'; }
    setTimeout(() => { copy.textContent = '复制'; message.textContent = ''; }, 2000);
  });
  toolbar.append(language, message, copy);
  pre.before(block); block.append(toolbar,pre);
  pre.tabIndex = 0; pre.setAttribute('aria-label', `${language.textContent} 代码块`);
}
