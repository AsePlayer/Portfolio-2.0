const icons = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h3.98v16H.5V8zM9.5 8h3.82v2.18h.05c.53-1 1.82-2.06 3.75-2.06C21.2 8.12 24 10 24 14.46V24h-4v-8.7c0-2.16-.04-4.94-3-4.94-3 0-3.46 2.34-3.46 4.76V24h-4V8z"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.78 3.1 8.83 7.4 10.26.54.1.74-.24.74-.53 0-.26-.01-1.12-.02-2.03-3.01.66-3.64-1.45-3.64-1.45-.49-1.26-1.2-1.6-1.2-1.6-.98-.67.07-.66.07-.66 1.08.08 1.65 1.11 1.65 1.11.96 1.64 2.52 1.17 3.14.9.1-.7.38-1.17.69-1.44-2.4-.27-4.93-1.2-4.93-5.36 0-1.18.42-2.14 1.11-2.9-.11-.28-.48-1.4.11-2.92 0 0 .9-.29 2.95 1.11a10.2 10.2 0 0 1 5.38 0c2.04-1.4 2.94-1.11 2.94-1.11.59 1.52.22 2.64.11 2.92.69.76 1.11 1.72 1.11 2.9 0 4.17-2.53 5.08-4.94 5.35.39.33.73.98.73 1.98 0 1.43-.01 2.58-.01 2.93 0 .29.2.63.75.52 4.3-1.44 7.39-5.48 7.39-10.26C23.1 5.33 18.27.5 12 .5z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1C16.8 2.5 12 2.5 12 2.5s-4.8 0-8.6.4c-.4.1-1.3.1-2.1 1C.7 4.6.5 6.2.5 6.2S.3 8 .3 9.8v1.4c0 1.8.2 3.6.2 3.6s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.8.2 7.4.4 7.4.4s4.8 0 8.6-.4c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.8 14.5v-7l6 3.5-6 3.5z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13 0 6v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6l-12 7zM12 11 24 4H0l12 7z"/></svg>'
};

document.addEventListener('DOMContentLoaded', async function () {
  setYear();
  setupThemeToggle();
  setupNavigation();

  try {
    const data = await loadSiteData();
    renderSite(data);
    setupActiveNavigation();
    handleInitialHash();
    setupContactSuccess();
  } catch (error) {
    renderError(error);
  }
});

async function loadSiteData() {
  const response = await fetch('data/site.json');
  if (!response.ok) {
    throw new Error('Unable to load site content.');
  }

  const data = await response.json();
  validateSiteData(data);
  return data;
}

function validateSiteData(data) {
  const requiredObjects = ['person', 'links', 'hero', 'work', 'capabilities', 'experience', 'skills', 'about', 'contact'];
  const missingObject = requiredObjects.find(function (key) {
    return !data[key] || typeof data[key] !== 'object';
  });

  const requiredArrays = [data.nav, data.hero.capabilities, data.hero.actions, data.hero.panel?.facts, data.work.items, data.capabilities.items, data.experience.items, data.experience.development?.items, data.skills.groups, data.about.text];
  const invalidExperience = Array.isArray(data.experience?.items) && data.experience.items.some(function (item) {
    if (Array.isArray(item.roles)) return !item.organization || item.roles.length === 0;
    return !item.role || !item.text;
  });

  if (missingObject || invalidExperience || requiredArrays.some(function (value) { return !Array.isArray(value); })) {
    throw new Error('Site content is incomplete or incorrectly formatted.');
  }
}

function renderSite(data) {
  document.querySelectorAll('[data-site-name], [data-footer-name]').forEach(function (node) {
    node.textContent = data.person.name;
  });

  const initials = document.querySelector('[data-site-initials]');
  if (initials) initials.textContent = data.person.initials;

  renderNav(data.nav);
  renderPage(data);
  bindPageInteractions();
}

function renderNav(items) {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;

  nav.innerHTML = items.map(function (item) {
    return `<li><a href="${item.href}">${item.label}</a></li>`;
  }).join('');
}

function renderPage(data) {
  const page = document.querySelector('[data-page]');
  if (!page) return;

  page.innerHTML = [
    heroSection(data),
    workSection(data.work),
    capabilitiesSection(data.capabilities),
    experienceSection(data.experience),
    skillsSection(data.skills),
    aboutSection(data.about),
    resumeSection(data),
    contactSection(data)
  ].filter(Boolean).join('');
}

function heroSection(data) {
  const socialLinks = [
    { key: 'linkedin', label: 'LinkedIn profile', href: data.links.linkedin },
    { key: 'github', label: 'GitHub profile', href: data.links.github },
    { key: 'youtube', label: 'YouTube channel', href: data.links.youtube },
    { key: 'email', label: `Email ${data.person.name}`, href: `mailto:${data.person.email}` }
  ].filter(function (link) {
    return isUsableLink(link.href);
  });

  return `
    <section id="home" class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${data.hero.eyebrow}</p>
          <h1>${data.person.name}</h1>
          <p class="headline">${data.person.title}</p>
          <p class="subheadline">${data.hero.subheadline}</p>
          <ul class="capability-list" aria-label="Core capabilities">
            ${data.hero.capabilities.map(function (item) {
              return `<li>${item}</li>`;
            }).join('')}
          </ul>
          <div class="hero-ctas" aria-label="Primary actions">
            ${data.hero.actions.map(actionLink).join('')}
          </div>
          ${socialLinks.length ? `
            <ul class="social-list" aria-label="Professional links">
              ${socialLinks.map(socialLink).join('')}
            </ul>
          ` : ''}
        </div>
        <aside class="hero-panel" aria-label="Selected professional proof">
          <div class="proof-card">
            <p class="profile-label">${data.hero.panel.label}</p>
            <h2>${data.hero.panel.headline}</h2>
            <dl class="proof-facts">
              ${data.hero.panel.facts.map(function (fact) {
                return `
                  <div class="proof-stat">
                    <dt>${fact.value}</dt>
                    <dd>
                      <span class="proof-stat-label">${fact.label}</span>
                      <span class="proof-stat-detail">${fact.detail}</span>
                    </dd>
                  </div>
                `;
              }).join('')}
            </dl>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function actionLink(action) {
  const classes = ['btn'];
  if (action.style === 'primary') classes.push('primary');
  if (action.style === 'subtle') classes.push('subtle');

  return `<a class="${classes.join(' ')}" href="${action.href}"${action.download ? ' download' : newTabAttributes(action.href)}>${action.label}</a>`;
}

function socialLink(link) {
  return `
    <li>
      <a href="${link.href}" aria-label="${link.label}" title="${titleCase(link.key)}"${newTabAttributes(link.href, link.href.startsWith('http') ? 'me' : '')}>
        ${icons[link.key]}
      </a>
    </li>
  `;
}

function workSection(section) {
  return `
    <section id="work" class="section work-section">
      <div class="container">
        <div class="section-heading split">
          <div>
            <p class="eyebrow">${section.eyebrow}</p>
            <h2>${section.headline}</h2>
          </div>
          <p>${section.intro}</p>
        </div>
        <div class="work-list">
          ${section.items.map(function (item) {
            return `
              <article class="work-card">
                <div class="work-card-heading">
                  <p class="work-tag">${item.tag}</p>
                  <h3>${item.title}</h3>
                </div>
                <div class="work-card-copy">
                  <p>${item.text}</p>
                  <p class="work-result"><span>Outcome</span>${item.result}</p>
                  <ul class="tool-list" aria-label="Methods and tools used">
                    ${item.tools.map(function (tool) { return `<li>${tool}</li>`; }).join('')}
                  </ul>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function capabilitiesSection(section) {
  return `
    <section id="capabilities" class="section muted-section">
      <div class="container">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="card-grid services-grid">
          ${section.items.map(function (item, index) {
            return `
              <article class="service-card">
                <span class="card-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
                <h3>${item.title}</h3>
                <p>${item.text}</p>
              </article>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function experienceSection(section) {
  return `
    <section id="experience" class="section">
      <div class="container">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="experience-list">
          ${section.items.map(experienceItem).join('')}
        </div>
        ${developmentSection(section.development)}
      </div>
    </section>
  `;
}

function experienceItem(item) {
  if (Array.isArray(item.roles) && item.roles.length) {
    return `
      <article class="experience-item experience-item-grouped">
        <p class="experience-date">${item.date}</p>
        <div>
          <h3>${item.organization}</h3>
          <div class="role-progression">
            ${item.roles.map(function (role) {
              return `
                <section class="role-item">
                  <div class="role-heading">
                    <h4>${role.role}</h4>
                    <p class="role-date">${role.date}</p>
                  </div>
                  <p>${role.text}</p>
                </section>
              `;
            }).join('')}
          </div>
        </div>
      </article>
    `;
  }

  return `
    <article class="experience-item">
      <p class="experience-date">${item.date}</p>
      <div>
        <h3>${item.organization || item.role}</h3>
        ${item.organization ? `<h4 class="experience-role-title">${item.role}</h4>` : ''}
        <p>${item.text}</p>
      </div>
    </article>
  `;
}

function developmentSection(section) {
  if (!section || !Array.isArray(section.items) || !section.items.length) return '';

  return `
    <section class="development-block" aria-labelledby="development-heading">
      <div class="development-heading">
        <p class="eyebrow">${section.eyebrow}</p>
        <h3 id="development-heading">${section.headline}</h3>
      </div>
      <div class="development-grid">
        ${section.items.map(function (item) {
          return `
            <article class="development-card">
              <p class="work-tag">${item.label}</p>
              <h4>${item.title}</h4>
              ${item.organization ? `<p class="development-organization">${item.organization}</p>` : ''}
              <p>${item.text}</p>
              ${item.link && isUsableLink(item.link.href) ? `<a class="development-link" href="${item.link.href}" target="_blank" rel="noopener noreferrer">${item.link.label}<span aria-hidden="true">↗</span></a>` : ''}
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function skillsSection(section) {
  return `
    <section id="skills" class="section muted-section">
      <div class="container">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="skills-grid">
          ${section.groups.map(function (group, index) {
            const id = `skill-group-${index}`;
            return `
              <section class="skill-group" aria-labelledby="${id}">
                <h3 id="${id}">${group.title}</h3>
                <ul class="skill-list">
                  ${group.items.map(function (item) { return `<li>${item}</li>`; }).join('')}
                </ul>
              </section>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function aboutSection(section) {
  return `
    <section id="about" class="section">
      <div class="container about-grid">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="about-copy">
          ${section.text.map(function (paragraph) { return `<p>${paragraph}</p>`; }).join('')}
        </div>
      </div>
    </section>
  `;
}

function resumeSection(data) {
  if (!data.person.resume) return '';

  const section = data.resume || {
    eyebrow: 'Resume',
    headline: 'A closer look at my experience.',
    text: 'View a concise summary of my experience, technical background, and qualifications.',
    button: 'View Resume'
  };

  return `
    <section id="resume" class="section resume-section">
      <div class="container resume-panel">
        <div>
          <p class="eyebrow">${section.eyebrow}</p>
          <h2>${section.headline}</h2>
          <p>${section.text}</p>
        </div>
        <a class="btn primary" href="${data.person.resume}"${newTabAttributes(data.person.resume)}>${section.button}</a>
      </div>
    </section>
  `;
}

function contactSection(data) {
  const email = data.person.email;
  const action = `https://formsubmit.co/${email}`;
  const professionalLinks = [
    { label: 'LinkedIn', href: data.links.linkedin },
    { label: 'GitHub', href: data.links.github },
    { label: 'YouTube', href: data.links.youtube }
  ].filter(function (link) {
    return isUsableLink(link.href);
  });

  return `
    <section id="contact" class="section contact-section">
      <div class="container contact-grid">
        <div>
          <p class="eyebrow">${data.contact.eyebrow}</p>
          <h2>${data.contact.headline}</h2>
          <p>${data.contact.text}</p>
          <a class="btn primary contact-email" href="mailto:${email}">${email}</a>
          ${professionalLinks.length ? `
            <div class="contact-links" aria-label="Professional links">
              ${professionalLinks.map(function (link) {
                return `<a href="${link.href}"${newTabAttributes(link.href, 'me')}>${link.label}</a>`;
              }).join('')}
            </div>
          ` : ''}
          <p class="form-status" data-form-status role="status" aria-live="polite" tabindex="-1" hidden>Your message was sent. Thanks for reaching out.</p>
        </div>
        <form id="contact-form" class="contact-form" action="${action}" method="POST" aria-label="Contact Ryan Scott" aria-describedby="contact-form-intro">
          <p id="contact-form-intro" class="form-intro">${data.contact.formIntro}</p>
          <input type="hidden" name="_subject" value="${data.contact.formSubject}">
          <input type="hidden" name="_template" value="table">
          <input type="hidden" name="_next" data-next-url>
          <input type="text" name="_honey" class="honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">

          <label for="name">Name</label>
          <input id="name" name="name" type="text" autocomplete="name" required>

          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" required>

          <label for="message">Message</label>
          <textarea id="message" name="message" rows="5" required></textarea>

          <button type="submit" class="btn primary">Send Message</button>
        </form>
      </div>
    </section>
  `;
}

function sectionHeading(eyebrow, headline) {
  return `
    <div class="section-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h2>${headline}</h2>
    </div>
  `;
}

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

    const desktopQuery = window.matchMedia('(min-width: 721px)');
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

function newTabAttributes(href, relationship = '') {
  const opensInNewTab = /^https?:\/\//i.test(href) || /\.pdf(?:[?#]|$)/i.test(href);
  const rel = [relationship, opensInNewTab ? 'noopener noreferrer' : ''].filter(Boolean).join(' ');

  return `${opensInNewTab ? ' target="_blank"' : ''}${rel ? ` rel="${rel}"` : ''}`;
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
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('sent');
    cleanUrl.hash = 'contact';
    history.replaceState(null, '', cleanUrl);
  }
}

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function setYear() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}

function renderError(error) {
  const page = document.querySelector('[data-page]');
  if (!page) return;

  page.innerHTML = `
    <section class="section loading-section">
      <div class="container">
        <p class="eyebrow">Data operations · reporting · business systems</p>
        <h1>Ryan Scott</h1>
        <p class="headline">Data Operations | Reporting | Business Systems</p>
        <p>${error.message} You can still reach me at <a href="mailto:ryanscottcareer@gmail.com">ryanscottcareer@gmail.com</a>.</p>
      </div>
    </section>
  `;
}

function isUsableLink(value) {
  return typeof value === 'string' && value.trim() !== '' && value.trim() !== '#';
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
