/**
 * Code block collapse/expand — "Observatory"
 * Collapses code blocks longer than 10 lines with a gradient mask
 * and a bottom bar with text + CSS chevron toggle.
 */
function initCodeBlockCollapse(): void {
  const article = document.querySelector('.article-content');
  if (!article) return;

  const isZh = document.documentElement.lang?.startsWith('zh') ?? true;
  const labelExpand = isZh ? '展开代码' : 'Expand';
  const labelCollapse = isZh ? '收起代码' : 'Collapse';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TRANSITION = prefersReduced
    ? 'none'
    : 'max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)';

  article.querySelectorAll<HTMLElement>('div.highlight').forEach(highlight => {
    const lines = highlight.querySelectorAll('span.line');
    if (lines.length <= 10) return;

    // Establish positioning context for ::after gradient mask
    highlight.style.position = 'relative';
    // Take over height control — disable CSS transition for instant snap
    highlight.style.transition = 'none';
    highlight.style.maxHeight = '320px';
    highlight.classList.add('code-collapsed');

    const btn = document.createElement('button');
    btn.className = 'code-expand-btn';
    btn.setAttribute('aria-label', labelExpand);
    btn.setAttribute('aria-expanded', 'false');
    btn.type = 'button';
    btn.innerHTML = `<span class="code-expand-toggle"><span class="code-expand-text">${labelExpand}</span><span class="code-expand-chevron"></span></span>`;
    highlight.insertAdjacentElement('afterend', btn);

    const textEl = btn.querySelector('.code-expand-text')!;

    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        // Collapse: snap to current full height, then animate to 320px
        highlight.style.transition = 'none';
        highlight.style.maxHeight = highlight.scrollHeight + 'px';
        highlight.getBoundingClientRect(); // force reflow
        highlight.style.transition = TRANSITION;
        highlight.style.maxHeight = '320px';
        highlight.classList.remove('code-expanded');
        highlight.classList.add('code-collapsed');
        btn.setAttribute('aria-label', labelExpand);
        btn.setAttribute('aria-expanded', 'false');
        textEl.textContent = labelExpand;
      } else {
        // Expand: animate to full height, then release constraint
        highlight.style.transition = TRANSITION;
        highlight.style.maxHeight = highlight.scrollHeight + 'px';
        highlight.classList.remove('code-collapsed');
        highlight.classList.add('code-expanded');
        btn.setAttribute('aria-label', labelCollapse);
        btn.setAttribute('aria-expanded', 'true');
        textEl.textContent = labelCollapse;

        highlight.addEventListener('transitionend', function handler() {
          highlight.style.maxHeight = 'none';
          highlight.removeEventListener('transitionend', handler);
        });
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initCodeBlockCollapse, 100);
});
