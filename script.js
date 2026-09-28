(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const container = document.querySelector('[data-scenarios]');
  if (container) {
    const navigation = container.querySelector('.scenario-nav');
    const buttons = [...container.querySelectorAll('[data-scenario]')];
    const panels = [...container.querySelectorAll('[data-panel]')];
    navigation.setAttribute('role', 'tablist');
    let selectedIndex = 0;
    const select = (button, moveFocus = false) => {
      const nextIndex = buttons.indexOf(button);
      container.style.setProperty('--panel-shift', nextIndex >= selectedIndex ? '18px' : '-18px');
      selectedIndex = nextIndex;
      buttons.forEach(item => {
        const active = item === button;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => {
        const active = panel.dataset.panel === button.dataset.scenario;
        panel.hidden = !active;
        panel.classList.toggle('is-changing', active);
      });
      if (moveFocus) button.focus();
    };
    buttons.forEach((button, index) => {
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `scenario-${button.dataset.scenario}`);
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = buttons.length - 1;
        if (next !== undefined) { event.preventDefault(); select(buttons[next], true); }
      });
    });
    panels.forEach(panel => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `scenario-button-${panel.dataset.panel}`);
      panel.tabIndex = 0;
    });
    select(buttons[0]);
    const content = container.querySelector('.scenario-content');
    let gesture = null;
    content.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !event.isPrimary || event.target.closest('a,button,summary')) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() };
    }, {passive:true});
    content.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const elapsed = performance.now() - gesture.at;
      gesture = null;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5 || elapsed > 900) return;
      const nextIndex = (selectedIndex + (dx < 0 ? 1 : -1) + buttons.length) % buttons.length;
      select(buttons[nextIndex]);
    }, {passive:true});
    content.addEventListener('pointercancel', () => { gesture = null; }, {passive:true});
    const hint = document.querySelector('.swipe-hint');
    if (hint) hint.hidden = false;
  }
  // The catalog unfolds only when it reaches the reader, including on a phone.
  const animatedScenes = new Map();
  const activeScenes = new Map();
  const art = document.querySelector('.hero-art');
  const learning = document.querySelector('.learning-demo');
  const replay = document.querySelector('.motion-replay');
  if (art) animatedScenes.set(art, 'is-unfolding');
  if (learning) animatedScenes.set(learning, 'is-assembling');
  function stopScene(element) {
    const state = activeScenes.get(element);
    if (state) {
      cancelAnimationFrame(state.frame);
      clearTimeout(state.timer);
      element.classList.remove(state.className);
      activeScenes.delete(element);
    }
  }
  function playScene(element) {
    if (!element || motionPreference.matches || document.hidden) return;
    stopScene(element);
    const state = { className: animatedScenes.get(element), frame: 0, timer: 0 };
    activeScenes.set(element, state);
    state.frame = requestAnimationFrame(() => {
      state.frame = requestAnimationFrame(() => {
        element.classList.add(state.className);
        state.timer = setTimeout(() => stopScene(element), 1650);
      });
    });
  }
  function syncMotionPreference() {
    if (replay) replay.hidden = motionPreference.matches;
    if (motionPreference.matches) [...activeScenes.keys()].forEach(stopScene);
  }
  syncMotionPreference();
  motionPreference.addEventListener('change', syncMotionPreference);
  if (replay) replay.addEventListener('click', () => playScene(art));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) [...activeScenes.keys()].forEach(stopScene);
  });
  if ('IntersectionObserver' in window) {
    const played = new WeakSet();
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) { stopScene(entry.target); return; }
        if (entry.intersectionRatio < .25 || played.has(entry.target)) return;
        played.add(entry.target);
        playScene(entry.target);
      });
    }, {threshold:[0,.25]});
    animatedScenes.forEach((_,element) => sceneObserver.observe(element));
    const diagrams = document.querySelector('.scenario-content');
    if (diagrams) {
      const diagramObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => diagrams.classList.toggle('is-in-view', entry.isIntersecting));
      }, {threshold:.15});
      diagramObserver.observe(diagrams);
    }
  }
  const progress = document.getElementById('reading-progress');
  const navLinks = [...document.querySelectorAll('.top-nav a')];
  const navSections = navLinks.map(link => document.querySelector(link.hash));
  const header = document.querySelector('.site-header');
  let activeSection = null;
  let scheduled = false;
  function updateProgress() {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const proportion = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
    if (progress) progress.style.transform = `scaleX(${proportion})`;
    const threshold = (header ? header.offsetHeight : 0) + 40;
    let activeIndex = -1;
    navSections.forEach((section,index) => { if (section && section.getBoundingClientRect().top <= threshold) activeIndex = index; });
    if (activeIndex !== activeSection) {
      navLinks.forEach((link,index) => {
        if (index === activeIndex) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
      activeSection = activeIndex;
    }
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); }
  }, {passive:true});
  window.addEventListener('resize', updateProgress);
  window.addEventListener('load', updateProgress, {once:true});
  document.querySelectorAll('details').forEach(item => item.addEventListener('toggle', updateProgress));
  let detailsBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    [...activeScenes.keys()].forEach(stopScene);
    detailsBeforePrint = [...document.querySelectorAll('details')].map(item => [item, item.open]);
    detailsBeforePrint.forEach(([item]) => { item.open = true; });
  });
  window.addEventListener('afterprint', () => {
    detailsBeforePrint.forEach(([item, wasOpen]) => { item.open = wasOpen; });
  });
  updateProgress();
})();
