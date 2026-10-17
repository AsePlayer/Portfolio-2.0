export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function escapeContent(value) {
  if (typeof value === 'string') return escapeHtml(value);
  if (Array.isArray(value)) return value.map(escapeContent);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, escapeContent(item)]));
  }
  return value;
}

// Preserve the existing organization emphasis; all other content stays plain text.
function organizationName(value = '') {
  return value.replaceAll('&lt;i&gt;', '<i>').replaceAll('&lt;/i&gt;', '</i>');
}

export function renderDocument(data, template, year = new Date().getUTCFullYear()) {
  const safe = escapeContent(data);
  const schema = {
    '@context': 'https://schema.org', '@type': 'Person',
    '@id': `${data.seo.url}#person`,
    name: data.person.name, url: data.seo.url, email: `mailto:${data.person.email}`,
    jobTitle: data.seo.jobTitle,
    sameAs: Object.values(data.links).filter(isUsableLink),
    knowsAbout: data.seo.knowsAbout
  };
  const workSchema = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: data.selectedWork.headline,
    itemListElement: data.selectedWork.items.filter(item => item.featured).map((item, index) => ({
      '@type': 'ListItem', position: index + 1,
      item: {
        '@type': 'CreativeWork', name: item.title, abstract: item.summary,
        url: `${data.seo.url}#work-${item.id}`,
        author: {'@id': `${data.seo.url}#person`}
      }
    }))
  };
  const jsonLd = (value) => `<script type="application/ld+json">${JSON.stringify(value, null, 2).replaceAll('<', '\\u003c')}</script>`;
  const shareImage = data.seo.image ? escapeHtml(new URL(data.seo.image.path, data.seo.url).href) : '';
  const values = {
    name: safe.person.name, initials: safe.person.initials, year, footer: safe.footer,
    navigation: safe.nav.map((item) => `<li><a href="${item.href}"${newTabAttributes(item.href)}>${item.label}</a></li>`).join(''),
    content: [heroSection(safe), selectedWorkSection(safe.selectedWork), experienceSection(safe.experience), projectsSection(safe.projects),
      developmentSection(safe.experience.development),
      skillsSection(safe.skills), contactSection(safe)].join(''),
    metadata: `<title>${safe.seo.title}</title>
  <meta name="description" content="${safe.seo.description}">
  <meta name="author" content="${safe.person.name}">
  <link rel="canonical" href="${safe.seo.url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${safe.person.name} Portfolio">
  <meta property="og:title" content="${safe.seo.title}">
  <meta property="og:description" content="${safe.seo.socialDescription}">
  <meta property="og:url" content="${safe.seo.url}">
  ${shareImage ? `<meta property="og:image" content="${shareImage}">
  <meta property="og:image:alt" content="${safe.seo.image.alt}">
  ${safe.seo.image.width ? `<meta property="og:image:width" content="${safe.seo.image.width}">
  <meta property="og:image:height" content="${safe.seo.image.height}">` : ''}` : ''}
  <meta name="twitter:card" content="${shareImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${safe.seo.title}">
  <meta name="twitter:description" content="${safe.seo.socialDescription}">
  ${shareImage ? `<meta name="twitter:image" content="${shareImage}">
  <meta name="twitter:image:alt" content="${safe.seo.image.alt}">` : ''}
  ${jsonLd(schema)}
  ${jsonLd(workSchema)}`
  };
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${key}`);
    return values[key];
  }).replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '');
}

function selectedWorkSection(section) {
  return `<section id="work" class="section work-section" aria-labelledby="work-heading">
    <div class="container">
      ${sectionHeading(section.eyebrow || '', section.headline, 'work-heading')}
      ${section.intro ? `<p class="section-intro">${section.intro}</p>` : ''}
      <ul class="work-grid">
        ${section.items.filter(item => item.featured).map(item => `<li>
          <article id="work-${item.id}" class="work-card" aria-labelledby="work-${item.id}-heading">
            <p class="case-context">${item.organization} · ${item.category}</p>
            <h3 id="work-${item.id}-heading">${item.title}</h3>
            <p class="case-summary">${item.summary}</p>
            <ul class="case-technologies" aria-label="Tools and methods">
              ${item.technologies.map(technology => `<li>${technology}</li>`).join('')}
            </ul>
            <details class="case-study">
              <summary>Read case study<span class="visually-hidden">: ${item.title}</span></summary>
              <dl class="case-body">
                <dt>Challenge</dt><dd>${item.challenge}</dd>
                <dt>My contribution</dt><dd>${item.role}</dd>
                <dt>Approach</dt><dd>${item.approach}</dd>
                <dt>Result</dt><dd>${item.outcome}</dd>
              </dl>
            </details>
          </article>
        </li>`).join('')}
      </ul>
    </div>
  </section>`;
}

function projectsSection(section) {
  if (!section) return '';
  return `<section id="projects" class="section projects-section" aria-labelledby="projects-heading">
    <div class="container">
      ${sectionHeading(section.eyebrow || '', section.headline, 'projects-heading')}
      ${section.intro ? `<p class="section-intro">${section.intro}</p>` : ''}
      <ul class="project-list">
        ${section.items.map(project => `<li>
          <a class="project-card" href="${project.href}"${newTabAttributes(project.href)} aria-labelledby="project-${project.id}-heading">
            <span class="project-icon" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${project.id === 'stretch-finder'
                ? '<circle cx="20" cy="9" r="3"/><path d="M20 16v10m-8-5 8-5 8 5M14 34l6-8 6 8"/>'
                : project.id === 'what-we-eating'
                  ? '<path d="M7 19h26a13 13 0 0 1-26 0Zm6 16h14M14 7v6m6-8v8m6-6v6"/>'
                : project.id === 'aseplayer'
                  ? '<rect x="5" y="9" width="30" height="22" rx="6"/><path d="m17 15 9 5-9 5Z"/>'
                  : '<path d="m13 12-8 8 8 8m14-16 8 8-8 8M23 8l-6 24"/>'}</svg>
            </span>
            <div class="project-copy">
              ${project.type ? `<p class="project-type">${project.type}</p>` : ''}
              <h3 id="project-${project.id}-heading">${project.title}</h3>
              <p class="project-summary">${project.summary}</p>
              ${project.highlight ? `<p class="project-highlight">${project.highlight}</p>` : ''}
              <p class="project-technologies">${project.technologies.join(' &middot; ')}</p>
            </div>
            <span class="project-action">${project.actionLabel || 'Open project'} <span aria-hidden="true">&rarr;</span></span>
          </a>
        </li>`).join('')}
      </ul>
    </div>
  </section>`;
}

const icons = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.48 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h3.98v16H.5V8zM9.5 8h3.82v2.18h.05c.53-1 1.82-2.06 3.75-2.06C21.2 8.12 24 10 24 14.46V24h-4v-8.7c0-2.16-.04-4.94-3-4.94-3 0-3.46 2.34-3.46 4.76V24h-4V8z"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.78 3.1 8.83 7.4 10.26.54.1.74-.24.74-.53 0-.26-.01-1.12-.02-2.03-3.01.66-3.64-1.45-3.64-1.45-.49-1.26-1.2-1.6-1.2-1.6-.98-.67.07-.66.07-.66 1.08.08 1.65 1.11 1.65 1.11.96 1.64 2.52 1.17 3.14.9.1-.7.38-1.17.69-1.44-2.4-.27-4.93-1.2-4.93-5.36 0-1.18.42-2.14 1.11-2.9-.11-.28-.48-1.4.11-2.92 0 0 .9-.29 2.95 1.11a10.2 10.2 0 0 1 5.38 0c2.04-1.4 2.94-1.11 2.94-1.11.59 1.52.22 2.64.11 2.92.69.76 1.11 1.72 1.11 2.9 0 4.17-2.53 5.08-4.94 5.35.39.33.73.98.73 1.98 0 1.43-.01 2.58-.01 2.93 0 .29.2.63.75.52 4.3-1.44 7.39-5.48 7.39-10.26C23.1 5.33 18.27.5 12 .5z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13 0 6v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V6l-12 7zM12 11 24 4H0l12 7z"/></svg>'
};

function heroSection(data) {
  const socialLinks = [
    { key: 'linkedin', label: 'LinkedIn profile', href: data.links.linkedin },
    { key: 'github', label: 'GitHub profile', href: data.links.github },
    { key: 'email', label: `Email ${data.person.name}`, href: `mailto:${data.person.email}` }
  ].filter(function (link) {
    return isUsableLink(link.href);
  });

  return `
    <section id="home" class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <h1>${data.person.name}</h1>
          <p class="headline">${data.person.title}</p>
          <p class="hero-role">${data.person.currentRole} · ${data.person.currentEmployer}</p>
          ${data.experience.development.items.some(item => item.featured) ? `<p class="hero-credentials">${data.experience.development.items.filter(item => item.featured).map(item => item.title).join(' · ')}</p>` : ''}
          <p class="subheadline">${data.hero.subheadline}</p>
          <ol class="approach-sequence" aria-label="How I work">
            ${data.hero.approach.map((step, index) => `<li>${step}${index < data.hero.approach.length - 1 ? '<span aria-hidden="true"> →</span>' : ''}</li>`).join('')}
          </ol>
          <div class="hero-ctas" aria-label="Primary actions">
            ${data.hero.actions.map(actionLink).join('')}
          </div>
          ${socialLinks.length ? `
            <ul class="social-list" aria-label="Professional links">
              ${socialLinks.map(socialLink).join('')}
            </ul>
          ` : ''}
        </div>
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

function experienceSection(section) {
  return `
    <section id="experience" class="section">
      <div class="container">
        ${sectionHeading(section.eyebrow, section.headline)}
        ${section.intro ? `<p class="section-intro">${section.intro}</p>` : ''}
        <div class="experience-list">
          ${section.items.map(experienceItem).join('')}
        </div>

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
        <h3>${organizationName(item.organization) || item.role}</h3>
        ${item.organization ? `<h4 class="experience-role-title">${item.role}</h4>` : ''}
        <p>${item.text}</p>
      </div>
    </article>
  `;
}

function developmentSection(section) {
  if (!section || !Array.isArray(section.items) || !section.items.length) return '';

  return `
    <section id="education" class="section credentials-section" aria-labelledby="development-heading">
      <div class="container">
      ${sectionHeading('', section.headline, 'development-heading')}
      <ul class="credential-list">
        ${section.items.map(function (item) {
          return `
            <li${item.secondary ? ' class="credential-secondary"' : ''}>
              <h3>${item.link && isUsableLink(item.link.href) ? `<a href="${item.link.href}"${newTabAttributes(item.link.href)} aria-label="${item.link.label}">${item.title}</a>` : item.title}</h3>
              ${item.organization || item.date ? `<p>${[item.organization, item.date].filter(Boolean).join(' · ')}</p>` : ''}
            </li>
          `;
        }).join('')}
      </ul>
      </div>
    </section>
  `;
}

function skillsSection(section) {
  return `
    <section id="skills" class="section skills-section">
      <div class="container">
        ${sectionHeading('', section.headline)}
        <div class="skills-grid">
          ${section.groups.map(function (group, index) {
            const id = `skill-group-${index}`;
            return `
              <section class="skill-group" aria-labelledby="${id}">
                <h3 id="${id}">${group.title}</h3>
                <ul class="skill-list">
                  ${group.items.map((item, itemIndex) => `<li>${item}${itemIndex < group.items.length - 1 ? '<span aria-hidden="true"> ·</span>' : ''}</li>`).join('')}
                </ul>
              </section>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function contactSection(data) {
  const contactLinks = [
    {label:data.person.email,href:`mailto:${data.person.email}`},
    {label:'LinkedIn',href:data.links.linkedin},
    {label:'Resume',href:data.person.resume}
  ].filter((link) => isUsableLink(link.href));

  return `
    <section id="contact" class="section contact-section" aria-labelledby="contact-heading">
      <div class="container">
        <h2 id="contact-heading">${data.contact.headline}</h2>
        <p>${data.contact.text}</p>
        <ul class="contact-links" aria-label="Contact and resume">
          ${contactLinks.map((link) => `<li><a href="${link.href}"${newTabAttributes(link.href)}>${link.label}</a></li>`).join('')}
        </ul>
      </div>
    </section>
  `;
}

function sectionHeading(eyebrow, headline, id) {
  return `
    <div class="section-heading">
      ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
      <h2${id ? ` id="${id}"` : ''}>${headline}</h2>
    </div>
  `;
}

function newTabAttributes(href, relationship = '') {
  const opensInNewTab = /^https?:\/\//i.test(href) || /\.pdf(?:[?#]|$)/i.test(href);
  const rel = [relationship, opensInNewTab ? 'noopener noreferrer' : ''].filter(Boolean).join(' ');

  return `${opensInNewTab ? ' target="_blank"' : ''}${rel ? ` rel="${rel}"` : ''}`;
}

function isUsableLink(value) {
  return typeof value === 'string' && value.trim() !== '' && value.trim() !== '#';
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
