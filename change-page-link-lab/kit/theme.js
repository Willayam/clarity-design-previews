// The app themes through a .dark class on <html>. The board sets data-theme instead,
// so mirror it, take ?theme=light|dark for screenshots, and fall back to the OS scheme
// the way editor/src/lib/theme.ts does.
(() => {
  const root = document.documentElement;
  const media = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const chosen = root.getAttribute('data-theme') || new URLSearchParams(location.search).get('theme');
    root.classList.toggle('dark', chosen ? chosen === 'dark' : media.matches);
  };
  apply();
  media.addEventListener('change', apply);
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();
