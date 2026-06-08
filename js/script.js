const icons = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h3.98v16H.5V8zM9.5 8h3.82v2.18h.05c.53-1 1.82-2.06 3.75-2.06C21.2 8.12 24 10 24 14.46V24h-4v-8.7c0-2.16-.04-4.94-3-4.94-3 0-3.46 2.34-3.46 4.76V24h-4V8z"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.78 3.1 8.83 7.4 10.26.54.1.74-.24.74-.53 0-.26-.01-1.12-.02-2.03-3.01.66-3.64-1.45-3.64-1.45-.49-1.26-1.2-1.6-1.2-1.6-.98-.67.07-.66.07-.66 1.08.08 1.65 1.11 1.65 1.11.96 1.64 2.52 1.17 3.14.9.1-.7.38-1.17.69-1.44-2.4-.27-4.93-1.2-4.93-5.36 0-1.18.42-2.14 1.11-2.9-.11-.28-.48-1.4.11-2.92 0 0 .9-.29 2.95 1.11a10.2 10.2 0 0 1 5.38 0c2.04-1.4 2.94-1.11 2.94-1.11.59 1.52.22 2.64.11 2.92.69.76 1.11 1.72 1.11 2.9 0 4.17-2.53 5.08-4.94 5.35.39.33.73.98.73 1.98 0 1.43-.01 2.58-.01 2.93 0 .29.2.63.75.52 4.3-1.44 7.39-5.48 7.39-10.26C23.1 5.33 18.27.5 12 .5z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2s-.2-1.6-.8-2.3c-.8-.9-1.7-.9-2.1-1C16.8 2.5 12 2.5 12 2.5s-4.8 0-8.6.4c-.4.1-1.3.1-2.1 1C.7 4.6.5 6.2.5 6.2S.3 8 .3 9.8v1.4c0 1.8.2 3.6.2 3.6s.2 1.6.8 2.3c.8.9 1.9.9 2.4 1 1.8.2 7.4.4 7.4.4s4.8 0 8.6-.4c.4-.1 1.3-.1 2.1-1 .6-.7.8-2.3.8-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.8 14.5v-7l6 3.5-6 3.5z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13 0 6v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6l-12 7zM12 11 24 4H0l12 7z"/></svg>'
};

document.addEventListener('DOMContentLoaded', async function () {
  setYear();
  setupNavigation();

  try {
    const data = await loadSiteData();
    renderSite(data);
    setupContactSuccess();
  } catch (error) {
    renderError(error);
  }
});

async function loadSiteData() {
  const response = await fetch('data/site.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error('Unable to load site content.');
  }

  return response.json();
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
    whatIDoSection(data.whatIDo),
    workSection(data.work),
    skillsSection(data.skills),
    aboutSection(data.about),
    resumeSection(data),
    contactSection(data)
  ].join('');
}

function heroSection(data) {
  const socialLinks = [
    { key: 'linkedin', label: 'LinkedIn profile', href: data.links.linkedin },
    { key: 'github', label: 'GitHub profile', href: data.links.github },
    { key: 'youtube', label: 'YouTube channel', href: data.links.youtube },
    { key: 'email', label: 'Email Ryan Scott', href: `mailto:${data.person.email}` }
  ];

  return `
    <section id="home" class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="eyebrow">${data.hero.eyebrow}</p>
          <h1>${data.person.name}</h1>
          <p class="headline">${data.person.title}</p>
          <p class="subheadline">${data.hero.subheadline}</p>
          <div class="hero-ctas" aria-label="Primary actions">
            ${data.hero.actions.map(actionLink).join('')}
          </div>
          <ul class="social-list" aria-label="Social links">
            ${socialLinks.map(socialLink).join('')}
          </ul>
        </div>
        <aside class="hero-panel" aria-label="Professional focus">
          <div class="profile-card">
            <div class="profile-initials" aria-hidden="true">${data.person.initials}</div>
            <p class="profile-label">${data.hero.panel.label}</p>
            <h2>${data.hero.panel.headline}</h2>
            <dl class="quick-facts">
              ${data.hero.panel.facts.map(function (fact) {
                return `<div><dt>${fact.label}</dt><dd>${fact.value}</dd></div>`;
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

  return `<a class="${classes.join(' ')}" href="${action.href}"${action.download ? ' download' : ''}>${action.label}</a>`;
}

function socialLink(link) {
  return `
    <li>
      <a href="${link.href}" aria-label="${link.label}" title="${titleCase(link.key)}">
        ${icons[link.key]}
      </a>
    </li>
  `;
}

function whatIDoSection(section) {
  return `
    <section id="what" class="section">
      <div class="container">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="card-grid four">
          ${section.items.map(function (item, index) {
            return `
              <article class="service-card">
                <span class="card-number">${String(index + 1).padStart(2, '0')}</span>
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

function workSection(section) {
  return `
    <section id="work" class="section muted-section">
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
                <div>
                  <p class="work-tag">${item.tag}</p>
                  <h3>${item.title}</h3>
                </div>
                <p>${item.text}</p>
              </article>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function skillsSection(section) {
  return `
    <section id="skills" class="section">
      <div class="container">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="skills-grid">
          ${section.groups.map(function (group, index) {
            const id = `skill-group-${index}`;
            return `
              <section class="skill-group" aria-labelledby="${id}">
                <h3 id="${id}">${group.title}</h3>
                <p>${group.text}</p>
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
    <section id="about" class="section muted-section">
      <div class="container about-grid">
        ${sectionHeading(section.eyebrow, section.headline)}
        <div class="about-copy">
          <p>${section.text}</p>
        </div>
      </div>
    </section>
  `;
}

function resumeSection(data) {
  return `
    <section id="resume" class="section resume-section">
      <div class="container resume-panel">
        <div>
          <p class="eyebrow">${data.resume.eyebrow}</p>
          <h2>${data.resume.headline}</h2>
          <p>${data.resume.text}</p>
        </div>
        <a class="btn primary" href="${data.person.resume}" download>${data.resume.button}</a>
      </div>
    </section>
  `;
}

function contactSection(data) {
  const email = data.person.email;
  const action = `https://formsubmit.co/${email}`;

  return `
    <section id="contact" class="section contact-section">
      <div class="container contact-grid">
        <div>
          <p class="eyebrow">${data.contact.eyebrow}</p>
          <h2>${data.contact.headline}</h2>
          <p>${data.contact.text}</p>
          <p class="form-status" data-form-status hidden>Your message was sent. Thanks for reaching out.</p>
          <div class="contact-links" aria-label="Contact links">
            <a href="mailto:${email}">Email</a>
            <a href="${data.links.linkedin}">LinkedIn</a>
            <a href="${data.links.github}">GitHub</a>
            <a href="${data.links.youtube}">YouTube</a>
          </div>
        </div>
        <form id="contact-form" class="contact-form" action="${action}" method="POST" aria-label="Contact form">
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

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (event) {
      const selector = anchor.getAttribute('href');
      if (!selector || selector === '#') return;

      const target = document.querySelector(selector);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', selector);
      }
    });
  });
}

function setupNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');

  function closeNav() {
    if (!navToggle || !nav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('open', !isOpen);
      document.body.classList.toggle('nav-open', !isOpen);
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeNav();
    });
  }
}

function setupContactSuccess() {
  const status = document.querySelector('[data-form-status]');
  const sent = new URLSearchParams(window.location.search).get('sent');
  if (status && sent === 'true') {
    status.hidden = false;
    const contact = document.getElementById('contact');
    if (contact) {
      contact.setAttribute('tabindex', '-1');
      contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
      contact.focus({ preventScroll: true });
    }
  }
}

function setYear() {
  const year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

function renderError(error) {
  const page = document.querySelector('[data-page]');
  if (!page) return;

  page.innerHTML = `
    <section class="section loading-section">
      <div class="container">
        <p class="eyebrow">Content unavailable</p>
        <h1>Ryan Scott</h1>
        <p>${error.message} Try opening this site through a local server or GitHub Pages.</p>
      </div>
    </section>
  `;
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
