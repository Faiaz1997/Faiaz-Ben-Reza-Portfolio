/* Portfolio interactions. Content remains readable without JavaScript. */
(() => {
  'use strict';
  const menu = document.querySelector('#navbar');
  const menuToggle = document.querySelector('.menu-toggle');
  function closeMenu() { menu.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }
  menuToggle.addEventListener('click', () => { const open = menu.classList.toggle('is-open'); menuToggle.setAttribute('aria-expanded', String(open)); });
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    closeMenu();
    if (link.hash === '#salespro23' && document.getElementById('salespro23').hidden) {
      document.querySelector('[data-filter="all"]').click();
    }
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuToggle.focus(); } });
  document.addEventListener('click', event => { if (!menu.contains(event.target)) closeMenu(); });
  window.matchMedia('(max-width: 680px)').addEventListener('change', closeMenu);

  const themeButton = document.getElementById('theme-toggle');
  function updateThemeButton() {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelector('meta[name="theme-color"]').content = dark ? '#151d19' : '#f5f4ef';
  }
  updateThemeButton();
  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('faiaz-theme', theme); } catch (error) { /* Storage is optional. */ }
    updateThemeButton();
  });

  const filters = [...document.querySelectorAll('.filter-btn')];
  const projectColumns = [...document.querySelectorAll('#portfolio-grid > .col-md-4')];
  const salesFeature = document.getElementById('salespro23');
  filters.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    projectColumns.forEach(column => { column.hidden = filter !== 'all' && column.querySelector('.work-box').dataset.category !== filter; });
    salesFeature.hidden = filter !== 'all' && filter !== salesFeature.dataset.category;
    const count = projectColumns.filter(column => !column.hidden).length + Number(!salesFeature.hidden);
    document.getElementById('filter-status').textContent = `Showing ${count} ${count === 1 ? 'project' : 'projects'}${filter === 'all' ? '.' : ` in ${button.textContent.trim()}.`}`;
  }));

  const process = {
    research: {title:'Start with the right questions.',text:'Market research, conversations with stakeholders, and a closer look at the existing workflow. I need to understand the problem before deciding what to build.',artifact:'Market research · Requirements · Process flows'},
    define: {title:'Make the next step clear.',text:'I work through feature decisions, write user stories and acceptance criteria, and use wireframes or demo prototypes to make the requirements easier to discuss.',artifact:'Feature priorities · User stories · Demo prototypes'},
    build: {title:'Keep the team moving together.',text:'I coordinate with development and QA, manage the backlog, and take part in sprint planning, reviews, and retrospectives. GTM and marketing planning help connect the product with its market.',artifact:'Backlog · Sprint delivery · GTM planning'}
  };
  const tabs = [...document.querySelectorAll('.approach-tabs [role="tab"]')];
  const panel = document.getElementById('approach-panel');
  function selectTab(tab) {
    tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
    const step = process[tab.dataset.step];
    panel.setAttribute('aria-labelledby', tab.id);
    panel.querySelector('h3').textContent = step.title;
    panel.querySelector('p').textContent = step.text;
    panel.querySelector('.approach-artifact').textContent = step.artifact;
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next=(index+1)%tabs.length;
      if (event.key === 'ArrowLeft') next=(index+tabs.length-1)%tabs.length;
      if (event.key === 'Home') next=0;
      if (event.key === 'End') next=tabs.length-1;
      if(next!==undefined){event.preventDefault();selectTab(tabs[next]);tabs[next].focus();}
    });
  });

  document.getElementById('copy-email').addEventListener('click',async()=>{
    const status=document.getElementById('copy-status');
    try{await navigator.clipboard.writeText('faiazbenreza@gmail.com');status.textContent='Email copied.';}catch(error){status.textContent='Select the email above to copy it.';}
  });

  const navigation=[...document.querySelectorAll('#nav-links a')];
  let navigationFrame=0;
  function updateNavigation() {
    navigationFrame=0;
    const sections=navigation.map(link=>document.querySelector(link.hash));
    let active=null;
    sections.forEach(section=>{if(section&&section.getBoundingClientRect().top<150)active=section.id;});
    navigation.forEach(link=>{if(active&&link.hash===`#${active}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  }
  window.addEventListener('scroll',()=>{if(!navigationFrame)navigationFrame=requestAnimationFrame(updateNavigation);},{passive:true});
  window.addEventListener('resize',updateNavigation);
  updateNavigation();
})();
