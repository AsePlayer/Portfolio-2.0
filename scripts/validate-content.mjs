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
  const workIds = new Set();
  array(data.selectedWork?.items, 'selectedWork.items').forEach((item, i) => {
    fields(item, `selectedWork.items[${i}]`, ['title', 'summary']);
    identifier(item?.id, `selectedWork.items[${i}].id`);
    if (workIds.has(item?.id)) fail(`Duplicate case-study identifier: ${item?.id}`);
    workIds.add(item?.id);
    strings(item?.skills, `selectedWork.items[${i}].skills`);
    for (const field of ['challenge', 'investigation', 'solution', 'impact']) {
      if (item?.[field] !== undefined) text(item[field], `selectedWork.items[${i}].${field}`);
    }
    if (item?.evidence !== undefined) strings(item.evidence, `selectedWork.items[${i}].evidence`);
    if (item?.process !== undefined) strings(item.process, `selectedWork.items[${i}].process`);
    optionalBoolean(item?.featured, `selectedWork.items[${i}].featured`);
    if (item?.metric !== undefined) identifier(item.metric, `selectedWork.items[${i}].metric`);
  });
  const metricIds = new Set();
  if (data.impact !== undefined) {
    text(data.impact?.eyebrow, 'impact.eyebrow');
    optionalBoolean(data.impact?.enabled, 'impact.enabled');
    if (!Array.isArray(data.impact?.items)) fail('impact.items must be an array (it can be empty).');
    (Array.isArray(data.impact?.items) ? data.impact.items : []).forEach((item, i) => {
      fields(item, `impact.items[${i}]`, ['value', 'label', 'context']);
      identifier(item?.id, `impact.items[${i}].id`);
      if (metricIds.has(item?.id)) fail(`Duplicate metric identifier: ${item?.id}`);
      metricIds.add(item?.id);
      if (typeof item?.approximate !== 'boolean') fail(`impact.items[${i}].approximate must be a boolean.`);
      optionalBoolean(item?.enabled, `impact.items[${i}].enabled`);
      if (item?.caseStudyId !== undefined && !workIds.has(item.caseStudyId)) fail(`Metric ${item.id} links to an unknown case study.`);
    });
  }
  (Array.isArray(data.selectedWork?.items) ? data.selectedWork.items : []).forEach((item, i) => {
    if (item?.metric !== undefined && !metricIds.has(item.metric)) fail(`selectedWork.items[${i}].metric references an unknown metric.`);
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
  if (data.seo?.image !== undefined) localImage(data.seo.image);
  text(data.footer, 'footer');
  const targets = new Set(['#home', '#experience', '#work', '#education', '#skills', '#contact']);
  workIds.forEach((id) => targets.add(`#work-${id}`));
  if (Array.isArray(data.impact?.items) && data.impact.enabled !== false && data.impact.items.some((item) => item?.enabled !== false)) targets.add('#impact');
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
  if (/\bdata\s+(?:(?:and|&)\s+operations\s+)?analyst\b/i.test(publicCopy)) fail('Public content must avoid the direct Data Analyst identity.');
  if (data.seo?.jobTitle !== data.person?.currentRole) fail('seo.jobTitle must match the actual current role.');
  return errors;
}
