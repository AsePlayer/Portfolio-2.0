import fs from 'node:fs';
import path from 'node:path';

export function validateContent(data, root) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const text = (value, label) => {
    if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string.`);
  };
  const fields = (value, label, names) => names.forEach((name) => text(value?.[name], `${label}.${name}`));
  const array = (value, label) => {
    if (!Array.isArray(value) || !value.length) {
      fail(`${label} must be a non-empty array.`);
      return [];
    }
    return value;
  };
  const strings = (value, label) => array(value, label).forEach((item, i) => text(item, `${label}[${i}]`));
  const https = (value, label) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { fail(`${label} must be a complete https URL.`); }
  };
  const identifier = (value, label) => {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value)) fail(`${label} must be a lowercase, hyphenated identifier.`);
  };
  const optionalBoolean = (value, label) => {
    if (value !== undefined && typeof value !== 'boolean') fail(`${label} must be a boolean when supplied.`);
  };
  const localImage = (value) => {
    fields(value, 'seo.image', ['path', 'alt']);
    const asset = value?.path;
    if (typeof asset !== 'string' || !/\.(png|jpe?g|webp)$/i.test(asset) || asset.includes('\\') || asset.split('/').includes('..') || !/^[a-zA-Z0-9][a-zA-Z0-9 /_.-]*$/.test(asset)) {
      fail('seo.image.path must be a relative PNG, JPEG, or WebP asset inside the repository.');
    } else if (!fs.existsSync(path.join(root, asset))) fail(`Share image does not exist: ${asset}`);
    else if (value.width !== undefined || value.height !== undefined) {
      if (!Number.isInteger(value.width) || !Number.isInteger(value.height) || value.width <= 0 || value.height <= 0) fail('seo.image.width and height must both be positive integers.');
      else if (/\.png$/i.test(asset)) {
        const png = fs.readFileSync(path.join(root, asset));
        if (png.length < 24 || png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== value.width || png.readUInt32BE(20) !== value.height) fail('Share PNG dimensions must match seo.image.width and height.');
      }
    }
  };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Content must be an object.'];
  fields(data.person, 'person', ['name', 'initials', 'title', 'currentRole', 'currentEmployer', 'email']);
  if (!/^[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+$/.test(data.person?.email || '')) fail('person.email is invalid.');
  if (!data.links || typeof data.links !== 'object' || Array.isArray(data.links)) fail('links must be an object.');
  Object.entries(data.links || {}).forEach(([key, value]) => {
    if (value !== '') https(value, `links.${key}`);
  });
  if (data.links?.youtube !== undefined) fail('The professional links must not include YouTube.');
  if (data.impact !== undefined) fail('The standalone impact section is retired; keep scale inside relevant example summaries.');
  if (data.resume !== undefined) fail('The standalone resume section is retired; link the configured PDF directly.');
  fields(data.hero, 'hero', ['subheadline']);
  if (data.hero?.panel !== undefined) fail('hero.panel is retired; use the compact hero.approach sequence.');
  strings(data.hero?.approach, 'hero.approach');
  if (JSON.stringify(data.hero?.approach) !== JSON.stringify(['Understand', 'Trace', 'Build', 'Validate'])) fail('hero.approach must contain the four-word How I Work sequence: Understand, Trace, Build, Validate.');
  fields(data.experience, 'experience', ['eyebrow', 'headline']);
  if (data.experience?.intro !== undefined) text(data.experience.intro, 'experience.intro');
  array(data.experience?.items, 'experience.items').forEach((item, i) => {
    fields(item, `experience.items[${i}]`, ['date', 'organization']);
    if (item?.roles !== undefined) {
      array(item.roles, `experience.items[${i}].roles`).forEach((role, j) => fields(role, `experience.items[${i}].roles[${j}]`, ['date', 'role', 'text']));
    } else fields(item, `experience.items[${i}]`, ['role', 'text']);
  });
  if (data.experience?.items?.[0]?.role !== data.person?.currentRole) fail('The current experience role must match person.currentRole.');
  fields(data.experience?.development, 'experience.development', ['headline']);
  array(data.experience?.development?.items, 'experience.development.items').forEach((item, i) => {
    text(item?.title, `experience.development.items[${i}].title`);
    for (const field of ['organization', 'date']) {
      if (item?.[field] !== undefined) text(item[field], `experience.development.items[${i}].${field}`);
    }
    if (item?.label !== undefined || item?.text !== undefined) fail(`experience.development.items[${i}] must use a title and optional organization/date without explanatory paragraphs.`);
    optionalBoolean(item?.secondary, `experience.development.items[${i}].secondary`);
    optionalBoolean(item?.featured, `experience.development.items[${i}].featured`);
    if (item?.link) {
      text(item.link.label, `credential[${i}].link.label`);
      if (item.link.href !== '') https(item.link.href, `credential[${i}].link.href`);
    }
  });
  if (data.capabilities !== undefined) fail('capabilities is retired; use selectedWork.items for professional case studies.');
  fields(data.selectedWork, 'selectedWork', ['eyebrow', 'headline', 'intro']);
  const workIds = new Set();
  const featuredIds = new Set();
  const work = array(data.selectedWork?.items, 'selectedWork.items');
  if (work.filter(item => item?.featured === true).length !== 6) fail('selectedWork.items must contain exactly six featured professional case studies.');
  work.forEach((item, i) => {
    const label = `selectedWork.items[${i}]`;
    fields(item, label, ['id', 'title', 'organization', 'category', 'summary']);
    identifier(item?.id, `${label}.id`);
    if (workIds.has(item?.id)) fail(`Duplicate professional work identifier: ${item?.id}`);
    workIds.add(item?.id);
    if (typeof item?.featured !== 'boolean') fail(`${label}.featured must be a boolean.`);
    if (item?.featured) {
      featuredIds.add(item.id);
      fields(item, label, ['challenge', 'role', 'approach', 'outcome']);
      if (/magazine|circulation/i.test(`${item.id} ${item.title}`)) fail('Magazine Circulation must not be a featured professional case study.');
    }
    for (const field of ['summary', 'challenge', 'role', 'approach', 'outcome']) {
      if (item?.[field] !== undefined && typeof item[field] !== 'string') fail(`${label}.${field} must be a string.`);
      if (typeof item?.[field] === 'string' && item[field].length > (field === 'summary' ? 400 : 600)) fail(`${label}.${field} must stay concise.`);
    }
    strings(item?.technologies, `${label}.technologies`);
    if (Array.isArray(item?.technologies) && item.technologies.length > 6) fail(`${label}.technologies must contain at most six tools or methods.`);
    for (const field of ['metric', 'impact', 'details']) {
      if (item?.[field] !== undefined) fail(`${label}.${field} is unsupported; use the case-study fields without standalone metrics.`);
    }
  });
  const projectIds = new Set();
  if (data.projects !== undefined) {
    fields(data.projects, 'projects', ['headline']);
    for (const field of ['eyebrow', 'intro']) if (data.projects?.[field] !== undefined) text(data.projects[field], `projects.${field}`);
    array(data.projects?.items, 'projects.items').forEach((item, i) => {
      const label = `projects.items[${i}]`;
      fields(item, label, ['id', 'title', 'summary', 'href']);
      identifier(item?.id, `${label}.id`);
      if (projectIds.has(item?.id)) fail(`Duplicate project identifier: ${item?.id}`);
      projectIds.add(item?.id);
      text(item?.summary, `${label}.summary`);
      if (typeof item?.summary === 'string' && item.summary.length > 400) fail(`${label}.summary must stay compact (at most 400 characters).`);
      if (item?.type !== undefined && !['Web App', 'Desktop App', 'Game', 'Creator Project', 'Developer Tool', 'Website'].includes(item.type)) fail(`${label}.type must be a supported project category.`);
      if (item?.highlight !== undefined) {
        text(item.highlight, `${label}.highlight`);
        if (typeof item.highlight === 'string' && item.highlight.length > 160) fail(`${label}.highlight must stay compact (at most 160 characters).`);
      }
      strings(item?.technologies, `${label}.technologies`);
      if (typeof item?.href === 'string' && item.href.startsWith('https://')) https(item.href, `${label}.href`);
      else if (typeof item?.href !== 'string' || !/^\/projects\/[a-z][a-z0-9-]*\/$/.test(item.href)) {
        fail(`${label}.href must be a local /projects/project-name/ URL or a complete https URL.`);
      }
      if (item?.actionLabel !== undefined) text(item.actionLabel, `${label}.actionLabel`);
    });
  }
  fields(data.skills, 'skills', ['headline']);
  if (data.skills?.groups?.length !== 4) fail('skills.groups must contain four compact groups.');
  array(data.skills?.groups, 'skills.groups').forEach((item, i) => {
    text(item?.title, `skills.groups[${i}].title`);
    strings(item?.items, `skills.groups[${i}].items`);
    if (Array.isArray(item?.items) && item.items.length > 7) fail(`skills.groups[${i}].items must contain at most seven skills.`);
  });
  if (data.skills?.note !== undefined) text(data.skills.note, 'skills.note');
  fields(data.contact, 'contact', ['headline', 'text']);
  fields(data.seo, 'seo', ['title', 'description', 'socialDescription', 'url', 'jobTitle']);
  https(data.seo?.url, 'seo.url');
  if (data.seo?.url !== 'https://ryanscott.org/') fail('seo.url must remain https://ryanscott.org/.');
  strings(data.seo?.knowsAbout, 'seo.knowsAbout');
  if (data.seo?.image !== undefined) localImage(data.seo.image);
  text(data.footer, 'footer');
  const targets = new Set(['#home', '#experience', '#work', '#education', '#skills', '#contact']);
  if (data.projects) targets.add('#projects');
  featuredIds.forEach((id) => targets.add(`#work-${id}`));
  if (data.person?.resume) {
    const resume = data.person.resume;
    if (typeof resume !== 'string' || !/\.pdf$/i.test(resume) || path.isAbsolute(resume) || resume.includes('\\') || resume.split('/').includes('..')) {
      fail('person.resume must be a relative PDF path inside the repository.');
    } else {
      const file = path.resolve(root, resume);
      if (!fs.existsSync(file)) fail(`Configured résumé does not exist: ${resume}`);
      else {
        const pdf = fs.readFileSync(file);
        if (pdf.subarray(0, 5).toString() !== '%PDF-' || !pdf.subarray(-1024).toString().includes('%%EOF')) fail('Configured résumé has an invalid PDF signature or trailer.');
      }
    }
  } else if (data.person?.resume !== '') fail('person.resume must be a PDF path or an empty string.');
  array(data.nav, 'nav').forEach((item, i) => {
    fields(item, `nav[${i}]`, ['label', 'href']);
    if (!targets.has(item?.href) && !(data.person?.resume && item?.href === data.person.resume)) fail(`Navigation target ${item?.href} must match a rendered section or the configured resume PDF.`);
  });
  array(data.hero?.actions, 'hero.actions').forEach((item, i) => {
    fields(item, `hero.actions[${i}]`, ['label', 'href', 'style']);
    if (!['primary', 'default', 'subtle'].includes(item?.style)) fail(`hero.actions[${i}].style is invalid.`);
    if (!targets.has(item?.href) && item?.href !== data.person?.resume) fail(`Hero action ${item?.href} must target a section or the configured résumé.`);
  });
  const publicCopy = JSON.stringify(data);
  if (/tel:|"(?:phone|telephone|mobile)"\s*:|(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/i.test(publicCopy)) fail('Public content must not contain a phone number. The public résumé PDF must also omit it.');
  if (/\b(?:data\s+(?:(?:and|&)\s+operations\s+)?analyst|(?:solutions?|data|salesforce)\s+architect|business\s+systems\s+analyst|expert|thought[ -]leader|enterprise\s+leader|owner\s+of\s+enterprise\s+architecture)\b/i.test(publicCopy)) fail('Public content must avoid inflated titles and unsupported seniority claims.');
  if (data.person?.currentRole !== 'Data Operations Coordinator') fail('person.currentRole must remain Data Operations Coordinator.');
  if (data.seo?.jobTitle !== data.person?.currentRole) fail('seo.jobTitle must match the actual current role.');
  return errors;
}
