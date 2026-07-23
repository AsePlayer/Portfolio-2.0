import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    fail(`${relativePath} could not be parsed: ${error.message}`);
    return null;
  }
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty string.`);
}

function requireTextFields(value, label, fields) {
  fields.forEach((field) => requireText(value?.[field], `${label}.${field}`));
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array.`);
    return;
  }

  value.forEach((item, index) => requireText(item, `${label}[${index}]`));
}

const data = readJson('data/site.json');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const customDomain = fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim();

if (data) {
  requireText(data.person?.name, 'person.name');
  requireText(data.person?.title, 'person.title');
  requireText(data.person?.currentRole, 'person.currentRole');
  requireText(data.person?.email, 'person.email');

  if (!/^\S+@\S+\.\S+$/.test(data.person?.email || '')) fail('person.email is not a valid email address.');

  Object.entries(data.links || {}).forEach(([name, value]) => {
    if (value === '#') fail(`links.${name} is a placeholder. Use a complete URL or an empty string.`);
    if (value && !/^https:\/\//.test(value)) fail(`links.${name} must use an https URL.`);
  });

  const requiredArrays = {
    nav: data.nav,
    'hero.actions': data.hero?.actions,
    'hero.panel.facts': data.hero?.panel?.facts,
    'experience.items': data.experience?.items,
    'experience.development.items': data.experience?.development?.items,
    'skills.groups': data.skills?.groups
  };

  Object.entries(requiredArrays).forEach(([label, value]) => {
    if (!Array.isArray(value) || value.length === 0) fail(`${label} must be a non-empty array.`);
  });

  requireTextFields(data.hero, 'hero', ['eyebrow', 'subheadline']);
  requireTextFields(data.hero?.panel, 'hero.panel', ['label', 'headline']);
  requireTextFields(data.experience, 'experience', ['eyebrow', 'headline']);
  requireTextFields(data.experience?.development, 'experience.development', ['eyebrow', 'headline']);
  requireTextFields(data.skills, 'skills', ['eyebrow', 'headline']);
  requireTextFields(data.contact, 'contact', ['eyebrow', 'headline', 'text', 'formIntro', 'formSubject']);

  (data.nav || []).forEach((item, index) => requireTextFields(item, `nav[${index}]`, ['label', 'href']));
  (data.hero?.actions || []).forEach((item, index) => requireTextFields(item, `hero.actions[${index}]`, ['label', 'href', 'style']));
  (data.hero?.panel?.facts || []).forEach((item, index) => requireTextFields(item, `hero.panel.facts[${index}]`, ['value', 'label', 'detail']));

  (data.experience?.items || []).forEach((item, index) => {
    requireText(item?.date, `experience.items[${index}].date`);

    if (Array.isArray(item?.roles)) {
      requireText(item?.organization, `experience.items[${index}].organization`);
      if (item.roles.length === 0) fail(`experience.items[${index}].roles must not be empty.`);
      item.roles.forEach((role, roleIndex) => {
        requireTextFields(role, `experience.items[${index}].roles[${roleIndex}]`, ['date', 'role', 'text']);
      });
    } else {
      requireTextFields(item, `experience.items[${index}]`, ['role', 'text']);
    }
  });
  (data.experience?.development?.items || []).forEach((item, index) => {
    requireTextFields(item, `experience.development.items[${index}]`, ['label', 'title', 'text']);
    if (item?.link) {
      requireText(item.link.label, `experience.development.items[${index}].link.label`);
      if (typeof item.link.href !== 'string') {
        fail(`experience.development.items[${index}].link.href must be a string.`);
      } else if (item.link.href && !/^https:\/\//.test(item.link.href)) {
        fail(`experience.development.items[${index}].link.href must use an https URL.`);
      }
    }
  });
  (data.skills?.groups || []).forEach((item, index) => {
    requireText(item?.title, `skills.groups[${index}].title`);
    requireStringArray(item?.items, `skills.groups[${index}].items`);
  });

  const pageTargets = new Set(['#home', '#experience', '#education', '#skills', '#contact']);
  if (data.person?.resume) pageTargets.add('#resume');

  (data.nav || []).forEach((item) => {
    if (!pageTargets.has(item.href)) fail(`Navigation target ${item.href} does not match a rendered section.`);
  });

  (data.hero?.actions || []).forEach((action) => {
    if (action.href?.startsWith('#') && !pageTargets.has(action.href)) {
      fail(`Hero action target ${action.href} does not match a rendered section.`);
    }
  });

  if (data.person?.resume) {
    const resumePath = path.join(root, data.person.resume);
    if (!fs.existsSync(resumePath)) {
      fail(`Configured resume file does not exist: ${data.person.resume}`);
    } else {
      const signature = fs.readFileSync(resumePath).subarray(0, 5).toString('ascii');
      if (signature !== '%PDF-') fail(`Configured resume is not a valid PDF: ${data.person.resume}`);
    }
  }
}

['css/styles.css', 'js/script.js', 'data/site.json', 'favicon.svg', 'CNAME'].forEach((relativePath) => {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`Required asset is missing: ${relativePath}`);
});

[
  'rel="canonical"',
  'https://ryanscott.org/',
  'property="og:title"',
  'application/ld+json',
  'class="skip-link"',
  'id="theme-toggle"',
  'id="main"'
].forEach((marker) => {
  if (!index.includes(marker)) fail(`index.html is missing required marker: ${marker}`);
});

if (customDomain !== 'ryanscott.org') fail('CNAME must contain only ryanscott.org.');

const structuredData = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!structuredData) {
  fail('index.html is missing its JSON-LD block.');
} else {
  try {
    JSON.parse(structuredData[1]);
  } catch (error) {
    fail(`JSON-LD metadata could not be parsed: ${error.message}`);
  }
}

const stylesWithoutComments = styles.replace(/\/\*[\s\S]*?\*\//g, '');
const openingBraces = (stylesWithoutComments.match(/{/g) || []).length;
const closingBraces = (stylesWithoutComments.match(/}/g) || []).length;
if (openingBraces !== closingBraces) fail('css/styles.css has unbalanced braces.');

if (/href=["']#["']/.test(index)) fail('index.html contains a placeholder hash link.');

if (errors.length) {
  console.error('Portfolio validation failed:\n');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Portfolio validation passed. Content, links, navigation, metadata, and configured assets look valid.');
