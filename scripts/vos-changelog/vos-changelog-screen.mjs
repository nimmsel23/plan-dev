// Shared, dependency-free release dialog. Works with React and other app shells.
export function showVosChangelogScreen({ release, appId, appName = appId, accent = '#fb923c', storageKey = `${appId}:seen-release` } = {}) {
  if (!appId || typeof release?.id !== 'string' || typeof document === 'undefined') return null;
  // The shell owns its single combined dialog; embedded apps stay silent.
  if (appId !== 'vitalos' && (document.documentElement.dataset.vosShell === 'true' || window.self !== window.top)) return null;
  try { if (localStorage.getItem(storageKey) === release.id) return null; } catch { /* Private mode: show without persistence. */ }
  if (document.getElementById('vos-changelog-screen')) return null;

  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.id = 'vos-changelog-screen';
  dialog.setAttribute('aria-labelledby', 'vos-changelog-title');
  dialog.style.setProperty('--vos-accent', accent);
  const style = document.createElement('style');
  style.textContent = `
    #vos-changelog-screen { box-sizing:border-box; width:min(32rem,calc(100% - 2rem)); max-height:85dvh; margin:auto; padding:1.5rem; border:1px solid #ffffff26; border-radius:1rem; background:#171717; color:#fff; box-shadow:0 24px 80px #0008; font:14px/1.6 system-ui,sans-serif; overflow:auto; }
    #vos-changelog-screen::backdrop { background:#000b; }
    #vos-changelog-screen h3 { margin:1.4rem 0 .5rem; font-size:1rem; }
    #vos-changelog-screen h2 { margin:0 0 1rem; font-size:1.5rem; line-height:1.3; }
    #vos-changelog-screen .vos-label { margin:0 0 .5rem; color:var(--vos-accent); font-size:.75rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
    #vos-changelog-screen ul { padding-left:1.2rem; margin:0 0 1.5rem; }
    #vos-changelog-screen li { margin:.6rem 0; overflow-wrap:anywhere; }
    #vos-changelog-screen li::marker { color:var(--vos-accent); }
    #vos-changelog-screen a { color:var(--vos-accent); text-decoration:underline; }
    #vos-changelog-screen footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
    #vos-changelog-screen button { border:0; border-radius:.6rem; padding:.65rem 1.3rem; background:var(--vos-accent); color:#111; font:700 14px system-ui,sans-serif; cursor:pointer; }
    #vos-changelog-screen :focus-visible { outline:2px solid var(--vos-accent); outline-offset:4px; }
  `;
  dialog.append(style);
  const element = (tag, text, parent = dialog) => {
    const node = document.createElement(tag);
    node.textContent = text;
    parent.append(node);
    return node;
  };
  element('p', `${appName} Update`).className = 'vos-label';
  element('h2', 'Neu in diesem Update').id = 'vos-changelog-title';
  const repositoryUrl = (value) => {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password) return url.origin + url.pathname.replace(/\/$/, '');
    } catch { /* Missing/invalid repository: display notes without links. */ }
    return null;
  };
  const link = (text, href, parent) => {
    const node = element('a', text, parent);
    node.href = href;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  };
  const sections = Array.isArray(release.sections) && release.sections.length ? release.sections : [release];
  for (const section of sections) {
    const group = element('section', '');
    if (sections.length > 1) element('h3', section.appName || appName, group);
    const repository = repositoryUrl(section.repository);
    const list = element('ul', '', group);
    const commits = Array.isArray(section.commits) ? section.commits : [];
    for (const commit of commits.slice(0, 30)) {
      if (typeof commit?.message !== 'string') continue;
      const item = element('li', commit.message, list);
      if (repository && /^[a-f0-9]{7,64}$/i.test(commit.sha)) {
        item.append(document.createTextNode(' '));
        link(commit.sha.slice(0, 7), `${repository}/commit/${commit.sha}`, item);
      }
    }
    if (!list.children.length) element('li', 'Die App wurde aktualisiert.', list);
    if (sections.length > 1 && repository) link('Alle Commits ansehen', `${repository}/commits`, group);
  }
  const footer = element('footer', '');
  const repository = repositoryUrl(release.repository);
  if (repository) link('Alle Commits ansehen', `${repository}/commits`, footer);
  const button = element('button', 'Weiter', footer);
  button.type = 'button';
  button.autofocus = true;
  button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    try { localStorage.setItem(storageKey, release.id); } catch { /* Storage can be unavailable. */ }
    dialog.remove();
    if (previousFocus?.isConnected) previousFocus.focus();
  }, { once: true });
  document.body.append(dialog);
  if (typeof dialog.showModal !== 'function') { dialog.remove(); return null; }
  dialog.showModal();
  return dialog;
}
