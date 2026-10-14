import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
/* Page interactions. The content works without JavaScript; the 3D world listens to the events emitted here. */
(() => {
  'use strict';
  const root = document.documentElement;
  const emit = detail => window.dispatchEvent(new CustomEvent('faiaz:ui', { detail }));
  root.classList.add('js');

  // Smooth, eased scrolling for wheel and keyboard (touch keeps native momentum). Skipped when the visitor prefers reduced motion.
  let lenis = null;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: { offset: -8 } });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // Navigation drawer (small screens)
  const menu = document.querySelector('#navbar');
  const menuToggle = document.querySelector('.menu-toggle');
  const closeMenu = () => { menu.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); };
  menuToggle.addEventListener('click', () => { const open = menu.classList.toggle('is-open'); menuToggle.setAttribute('aria-expanded', String(open)); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuToggle.focus(); } });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) closeMenu(); });
  matchMedia('(max-width: 860px)').addEventListener('change', closeMenu);

  // Day / night
  const themeButton = document.getElementById('theme-toggle');
  function updateThemeButton() {
    const day = root.dataset.theme === 'light';
    themeButton.setAttribute('aria-pressed', String(day));
    themeButton.setAttribute('aria-label', day ? 'Switch to night mode' : 'Switch to day mode');
    document.querySelector('meta[name="theme-color"]').content = day ? '#9dd2ff' : '#070b1f';
  }
  updateThemeButton();
  // Day and night follow the visitor's own clock (light 06:00 to 18:00) unless they flip the switch themselves today.
  const clockTheme = () => { const hour = new Date().getHours(); return hour >= 6 && hour < 18 ? 'light' : 'dark'; };
  setInterval(() => {
    let manual = null; try { manual = JSON.parse(localStorage.getItem('faiaz-theme-manual') || 'null'); } catch (error) { /* ignore */ }
    if (manual && manual.day === new Date().toDateString()) return;
    const theme = clockTheme(); if (root.dataset.theme !== theme) { root.dataset.theme = theme; updateThemeButton(); emit({ type: 'theme' }); }
  }, 60000);
  themeButton.addEventListener('click', () => {
    const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = theme;
    try { localStorage.setItem('faiaz-theme-manual', JSON.stringify({ theme, day: new Date().toDateString() })); } catch (error) { /* Storage is optional. */ }
    updateThemeButton(); emit({ type: 'theme' });
  });

  // Project filters
  const chips = [...document.querySelectorAll('.chip')];
  const projects = [...document.querySelectorAll('#project-list .project')];
  const feature = document.getElementById('salespro23');
  function applyFilter(filter) {
    chips.forEach(chip => { const on = chip.dataset.filter === filter; chip.classList.toggle('active', on); chip.setAttribute('aria-pressed', String(on)); });
    projects.forEach(project => { project.hidden = filter !== 'all' && project.dataset.category !== filter; });
    feature.hidden = filter !== 'all' && filter !== feature.dataset.category;
    const count = projects.filter(project => !project.hidden).length + Number(!feature.hidden);
    const label = chips.find(chip => chip.dataset.filter === filter).textContent.trim();
    document.getElementById('filter-status').textContent = `Showing ${count} ${count === 1 ? 'project' : 'projects'}${filter === 'all' ? '.' : ` in ${label}.`}`;
  }
  chips.forEach(chip => chip.addEventListener('click', () => { applyFilter(chip.dataset.filter); emit({ type: 'filter' }); }));
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    closeMenu(); if (link.hash === '#salespro23' && feature.hidden) applyFilter('all');
  }));

  // Working-process tabs
  const process = {
    research: { title: 'Start with the right questions.', text: 'Market research, conversations with stakeholders, and a closer look at the existing workflow. I need to understand the problem before deciding what to build.', artifact: 'Market research · Requirements · Process flows' },
    define: { title: 'Make the next step clear.', text: 'I work through feature decisions, write user stories and acceptance criteria, and use wireframes or demo prototypes to make the requirements easier to discuss.', artifact: 'Feature priorities · User stories · Demo prototypes' },
    build: { title: 'Keep the team moving together.', text: 'I coordinate with development and QA, manage the backlog, and take part in sprint planning, reviews, and retrospectives. GTM and marketing planning help connect the product with its market.', artifact: 'Backlog · Sprint delivery · GTM planning' }
  };
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const tabPanel = document.getElementById('approach-panel');
  function selectTab(tab, announce = true) {
    tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
    const step = process[tab.dataset.step];
    tabPanel.setAttribute('aria-labelledby', tab.id);
    tabPanel.querySelector('h3').textContent = step.title;
    tabPanel.querySelector('p').textContent = step.text;
    tabPanel.querySelector('.artifact').textContent = step.artifact;
    if (announce) emit({ type: 'tab', key: tab.dataset.step });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next]); tabs[next].focus(); }
    });
  });

  // Skill cards: one open at a time, in step with the gems in the world.
  const cards = [...document.querySelectorAll('.skill-card')];
  cards.forEach((card, index) => card.addEventListener('toggle', () => {
    if (card.open) { cards.forEach(other => { if (other !== card) other.open = false; }); emit({ type: 'skill', index }); }
    else if (!cards.some(other => other.open)) emit({ type: 'skill', index: -1 });
  }));
  window.addEventListener('faiaz:world', event => {
    if (event.detail.type === 'skill') { const card = cards[event.detail.index]; if (card) { card.open = true; card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
    if (event.detail.type === 'step') { const tab = tabs[event.detail.index]; if (tab) selectTab(tab); }
  });
  emit({ type: 'skill', index: cards.findIndex(card => card.open) });

  // Thor hammer cursor: follows the mouse, glows over clickable things and swings down on every click.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.createElement('div'); cursor.className = 'hammer-cursor'; cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<svg viewBox="0 0 54 54"><g stroke="#10151f" stroke-width="1.8" stroke-linejoin="round"><rect x="11" y="22" width="6" height="30" rx="2" fill="#7a5a3f"/><path d="M11 30h6M11 36h6M11 42h6" stroke="#3b2a1c" stroke-width="1.2"/><rect x="1" y="4" width="26" height="18" rx="3" class="head"/><rect x="1" y="4" width="26" height="5" rx="2.5" fill="#f4f8fd" stroke="none"/><path d="M6 15h16" stroke="#6c7a8c" stroke-width="1.6"/></g></svg>';
    document.body.append(cursor); document.documentElement.classList.add('has-hammer');
    const hot = 'a, button, summary, [role="tab"], .chip, input, textarea, label';
    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      cursor.style.transform = 'translate(' + event.clientX + 'px,' + event.clientY + 'px)';
      cursor.classList.toggle('is-hot', !!(event.target.closest && event.target.closest(hot)));
    }, { passive: true });
    document.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') return; cursor.classList.add('is-strike'); setTimeout(() => cursor.classList.remove('is-strike'), 170); });
    document.documentElement.addEventListener('mouseleave', () => { cursor.style.opacity = 0; });
    document.documentElement.addEventListener('mouseenter', () => { cursor.style.opacity = 1; });
  }

  // Hammer strike: a few lightning bolts and a ring burst wherever you click.
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') return;
    const ring = document.createElement('i'); ring.className = 'ring-pulse'; ring.style.left = event.clientX + 'px'; ring.style.top = event.clientY + 'px'; document.body.append(ring); setTimeout(() => ring.remove(), 520);
    for (let i = 0; i < 6; i++) {
      const bolt = document.createElement('i'); bolt.className = 'bolt'; const angle = i * 60 + Math.random() * 40 - 20;
      bolt.style.cssText = `left:${event.clientX}px;top:${event.clientY}px;height:${28 + Math.random() * 30}px;--a:${angle + 180}deg`; document.body.append(bolt); setTimeout(() => bolt.remove(), 480);
    }
  });

  // Copy email
  document.getElementById('copy-email').addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try { await navigator.clipboard.writeText('faiazbenreza@gmail.com'); status.textContent = 'Email copied.'; emit({ type: 'copied' }); }
    catch (error) { status.textContent = 'Select the email above to copy it.'; }
  });

  // Active link in the navigation, and panels that fade in as they arrive
  const links = [...document.querySelectorAll('#nav-links a')];
  const sections = links.map(link => document.querySelector(link.hash));
  let frame = 0;
  function updateNavigation() {
    frame = 0; let active = null;
    sections.forEach(section => { if (section && section.getBoundingClientRect().top < innerHeight * .5) active = section.id; });
    links.forEach(link => { if (active && link.hash === `#${active}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    document.getElementById('header').classList.toggle('is-scrolled', scrollY > 24);
  }
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateNavigation); }, { passive: true });
  addEventListener('resize', updateNavigation);
  updateNavigation();
  const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); reveal.unobserve(entry.target); } }), { threshold: .01, rootMargin: "0px 0px -4% 0px" });
  document.querySelectorAll('.panel, .copy').forEach(el => reveal.observe(el));
})();
