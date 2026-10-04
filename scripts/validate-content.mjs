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
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Content must be an object.'];
  fields(data.person, 'person', ['name', 'initials', 'title', 'currentRole', 'email']);
  if (!/^[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+$/.test(data.person?.email || '')) fail('person.email is invalid.');
  if (!data.links || typeof data.links !== 'object' || Array.isArray(data.links)) fail('links must be an object.');
  Object.entries(data.links || {}).forEach(([key, value]) => {
    if (value !== '') https(value, `links.${key}`);
  });
  fields(data.hero, 'hero', ['eyebrow', 'subheadline']);
  fields(data.hero?.panel, 'hero.panel', ['label', 'headline']);
  array(data.hero?.panel?.facts, 'hero.panel.facts').forEach((item, i) => fields(item, `hero.panel.facts[${i}]`, ['value', 'label', 'detail']));
  fields(data.experience, 'experience', ['eyebrow', 'headline', 'intro']);
  array(data.experience?.items, 'experience.items').forEach((item, i) => {
    fields(item, `experience.items[${i}]`, ['date', 'organization']);
    if (item?.roles !== undefined) {
      array(item.roles, `experience.items[${i}].roles`).forEach((role, j) => fields(role, `experience.items[${i}].roles[${j}]`, ['date', 'role', 'text']));
    } else fields(item, `experience.items[${i}]`, ['role', 'text']);
  });
  fields(data.experience?.development, 'experience.development', ['eyebrow', 'headline']);
  array(data.experience?.development?.items, 'experience.development.items').forEach((item, i) => {
    fields(item, `experience.development.items[${i}]`, ['label', 'title', 'organization', 'text']);
    if (item?.link) {
      text(item.link.label, `credential[${i}].link.label`);
      if (item.link.href !== '') https(item.link.href, `credential[${i}].link.href`);
    }
  });
  fields(data.selectedWork, 'selectedWork', ['eyebrow', 'headline', 'intro']);
  array(data.selectedWork?.items, 'selectedWork.items').forEach((item, i) => {
    fields(item, `selectedWork.items[${i}]`, ['title', 'text']);
    strings(item?.skills, `selectedWork.items[${i}].skills`);
    if (item?.evidence !== undefined) strings(item.evidence, `selectedWork.items[${i}].evidence`);
    if (item?.outcome !== undefined) text(item.outcome, `selectedWork.items[${i}].outcome`);
    if (!item?.outcome && !item?.evidence?.length) fail(`selectedWork.items[${i}] needs evidence or an outcome.`);
  });
  fields(data.skills, 'skills', ['eyebrow', 'headline']);
  array(data.skills?.groups, 'skills.groups').forEach((item, i) => {
    text(item?.title, `skills.groups[${i}].title`);
    strings(item?.items, `skills.groups[${i}].items`);
  });
  if (data.skills?.note !== undefined) text(data.skills.note, 'skills.note');
  fields(data.contact, 'contact', ['eyebrow', 'headline', 'text', 'formIntro', 'formSubject']);
  fields(data.seo, 'seo', ['title', 'description', 'socialDescription', 'url', 'jobTitle']);
  https(data.seo?.url, 'seo.url');
  if (data.seo?.url !== 'https://ryanscott.org/') fail('seo.url must remain https://ryanscott.org/.');
  strings(data.seo?.knowsAbout, 'seo.knowsAbout');
  text(data.footer, 'footer');
  const targets = new Set(['#home', '#experience', '#work', '#education', '#skills', '#contact']);
  if (data.person?.resume) {
    targets.add('#resume');
    fields(data.resume, 'resume', ['eyebrow', 'headline', 'text', 'button']);
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
    if (!targets.has(item?.href)) fail(`Navigation target ${item?.href} does not match a rendered section.`);
  });
  array(data.hero?.actions, 'hero.actions').forEach((item, i) => {
    fields(item, `hero.actions[${i}]`, ['label', 'href', 'style']);
    if (!['primary', 'default', 'subtle'].includes(item?.style)) fail(`hero.actions[${i}].style is invalid.`);
    if (!targets.has(item?.href) && item?.href !== data.person?.resume) fail(`Hero action ${item?.href} must target a section or the configured résumé.`);
  });
  const publicCopy = JSON.stringify(data);
  if (/tel:|"(?:phone|telephone|mobile)"\s*:|(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/i.test(publicCopy)) fail('Public content must not contain a phone number. Keep it only in the résumé PDF.');
  if (/Salesforce\s*(?:&|and)\s*Data Operations Analyst/i.test(`${data.person?.title} ${data.seo?.title} ${data.seo?.jobTitle} ${data.footer}`)) fail('Primary identity must use the data / operations analytics positioning.');
  return errors;
}
