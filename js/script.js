document.addEventListener('DOMContentLoaded', function () {
  document.documentElement.classList.add('js');
  setYear();
  setupThemeToggle();
  setupNavigation();
  bindPageInteractions();
  setupActiveNavigation();
  handleInitialHash();
  setupContactSuccess();
});

function bindPageInteractions() {
  const nextUrl = document.querySelector('[data-next-url]');
  if (nextUrl) {
    nextUrl.value = `${window.location.origin}${window.location.pathname}?sent=true#contact`;
  }

  document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      const selector = anchor.getAttribute('href');
      if (!selector || selector === '#') return;

      const target = document.querySelector(selector);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        if (window.location.hash !== selector) history.pushState(null, '', selector);
        focusDestination(target);
      }
    });
  });
}

function setupThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const root = document.documentElement;
  const themeColor = document.getElementById('theme-color');
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
  let hasSavedPreference = false;

  try {
    hasSavedPreference = Boolean(localStorage.getItem('portfolio-theme'));
  } catch (error) {
    hasSavedPreference = false;
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    const nextThemeLabel = isDark ? 'light' : 'dark';

    root.dataset.theme = isDark ? 'dark' : 'light';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', `Switch to ${nextThemeLabel} mode`);
    toggle.setAttribute('title', `Switch to ${nextThemeLabel} mode`);
    if (themeColor) themeColor.setAttribute('content', isDark ? '#0b1220' : '#14213d');
  }

  applyTheme(root.dataset.theme || (systemPreference.matches ? 'dark' : 'light'));

  toggle.addEventListener('click', function () {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    hasSavedPreference = true;

    try {
      localStorage.setItem('portfolio-theme', nextTheme);
    } catch (error) {
      // The selected theme still applies for the current page if storage is unavailable.
    }
  });

  systemPreference.addEventListener('change', function (event) {
    if (!hasSavedPreference) applyTheme(event.matches ? 'dark' : 'light');
  });
}

function setupNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');

  function closeNav(returnFocus) {
    if (!navToggle || !nav) return;
    const wasOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
    if (returnFocus && wasOpen) navToggle.focus();
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      nav.classList.toggle('open', !isOpen);
      document.body.classList.toggle('nav-open', !isOpen);
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav(false);
    });

    nav.addEventListener('focusout', function () {
      window.requestAnimationFrame(function () {
        const focusStayedInHeader = document.querySelector('.site-header')?.contains(document.activeElement);
        if (navToggle.getAttribute('aria-expanded') === 'true' && !focusStayedInHeader) closeNav(false);
      });
    });

    document.addEventListener('click', function (event) {
      if (navToggle.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) {
        closeNav(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav(true);
    });

    const desktopQuery = window.matchMedia('(min-width: 861px)');
    desktopQuery.addEventListener('change', function (event) {
      if (event.matches) closeNav(false);
    });
  }
}

function setupActiveNavigation() {
  if (!('IntersectionObserver' in window)) return;

  const links = Array.from(document.querySelectorAll('[data-nav] a[href^="#"]'));
  const sections = links.map(function (link) {
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (link) {
        const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
        if (isCurrent) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-30% 0px -60%', threshold: 0 });

  sections.forEach(function (section) { observer.observe(section); });
}

function handleInitialHash() {
  if (!window.location.hash || new URLSearchParams(window.location.search).get('sent') === 'true') return;
  let target;

  try {
    target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  } catch {
    return;
  }

  if (target) {
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }
}

function focusDestination(section) {
  const destination = section.matches('h1, h2') ? section : section.querySelector('h1, h2') || section;
  const hadTabindex = destination.hasAttribute('tabindex');

  if (!hadTabindex) destination.setAttribute('tabindex', '-1');
  destination.focus({ preventScroll: true });

  if (!hadTabindex) {
    destination.addEventListener('blur', function () {
      destination.removeAttribute('tabindex');
    }, { once: true });
  }
}

function setupContactSuccess() {
  const status = document.querySelector('[data-form-status]');
  const sent = new URLSearchParams(window.location.search).get('sent');
  if (status && sent === 'true') {
    status.hidden = false;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('sent');
    cleanUrl.hash = 'contact';
    history.replaceState(null, '', cleanUrl);
    // Apply focus after the browser's initial fragment navigation completes.
    window.requestAnimationFrame(function () {
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    });
  }
}

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function setYear() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}
