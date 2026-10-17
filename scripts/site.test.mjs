import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { escapeHtml, renderDocument } from './render-site.mjs';
import { validateContent } from './validate-content.mjs';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const template = fs.readFileSync(path.join(root, 'templates/index.html'), 'utf8');
const examples = (content) => content.selectedWork.items.filter(item => item.featured);
const structuredData = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));

test('professional case studies, credentials, and contact ship as HTML', () => {
  assert.deepEqual(validateContent(data, root), []);
  const html = renderDocument(data, template, 2026);
  for (const value of [data.hero.subheadline, data.selectedWork.headline, data.selectedWork.intro,
    ...examples(data).flatMap(item => [item.title, item.summary, item.challenge, item.role, item.approach, item.outcome, ...item.technologies]),
    data.contact.text, ...data.experience.development.items.map(item => item.title)]) {
    assert.ok(html.includes(escapeHtml(value)), 'Missing content: ' + value);
  }
  assert.ok(html.includes('href="mailto:' + data.person.email + '"'));
  assert.ok(!html.includes('<form') && !html.includes('{{'));
});

test('content is escaped in text, attributes, and structured data', () => {
  const copy = structuredClone(data);
  copy.person.name = 'Ryan <script>alert("x")</script>';
  const example = examples(copy)[0];
  example.title = '" onclick="alert(1)';
  example.summary = '<img src=x onerror=alert(1)>';
  examples(copy)[0].technologies[0] = '<script>bad()</script>';
  copy.contact.headline = '"><script>alert(1)</script>';
  const html = renderDocument(copy, template, 2026);
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('Ryan &lt;script&gt;alert(&quot;x&quot;)'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.name, copy.person.name);
});

test('invalid selected-work and nested case-study structures fail without crashing', () => {
  for (const value of [null, {}, {items: 'incorrect'}, {items: [null]}, {items: [{featured: true}, null]}]) {
    const copy = structuredClone(data);
    copy.selectedWork = value;
    assert.ok(validateContent(copy, root).some(error => error.includes('selectedWork')));
  }
});

test('broken anchors, unsafe URLs, public phone numbers, and résumé traversal fail validation', () => {
  const edits = [
    (copy) => { copy.nav[0].href = '#missing'; },
    (copy) => { copy.links.github = 'javascript:alert(1)'; },
    (copy) => { copy.contact.text += ' Call 555-123-4567'; },
    (copy) => { copy.person.resume = '../private.pdf'; }
  ];
  for (const edit of edits) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});

test('grouped roles and optional résumé continue to work', () => {
  const copy = structuredClone(data);
  copy.experience.items[2].roles = [{date: '2015 - 2022', role: 'QA', text: 'Reproduced defects.'}];
  copy.person.resume = '';
  copy.nav = copy.nav.filter((item) => item.href.startsWith('#'));
  copy.hero.actions = copy.hero.actions.filter((item) => item.href.startsWith('#'));
  assert.deepEqual(validateContent(copy, root), []);
  const html = renderDocument(copy, template, 2026);
  assert.ok(html.includes('role-progression'));
  assert.ok(!html.includes('id="resume"'));
});

test('six case studies precede compact experience with native, accessible disclosures', () => {
  const html = renderDocument(data, template, 2026);
  const order = ['home', 'work', 'experience', 'projects', 'education', 'skills', 'contact'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(html.indexOf('id="' + order[i - 1] + '"') < html.indexOf('id="' + order[i] + '"'));
  }
  assert.equal((html.match(/class="work-card"/g) || []).length, 6);
  assert.equal((html.match(/<details class="case-study">/g) || []).length, 6);
  assert.ok(!html.includes('<details open') && !html.includes('id="impact"') && !html.includes('id="resume"'));
  for (const item of examples(data)) {
    assert.ok(html.includes('aria-labelledby="work-' + item.id + '-heading"'));
    assert.ok(html.includes('<h3 id="work-' + item.id + '-heading">'));
    assert.ok(html.includes('Read case study<span class="visually-hidden">: ' + escapeHtml(item.title)));
  }
  for (const label of ['Challenge', 'My contribution', 'Approach', 'Result']) {
    assert.equal(html.split('<dt>' + label + '</dt>').length - 1, 6);
  }
});



test('resume PDF opens directly from navigation, hero, and compact contact links', () => {
  const html = renderDocument(data, template, 2026);
  assert.equal(data.nav.find((item) => item.label === 'Resume').href, data.person.resume);
  assert.ok(html.includes(`<a href="${data.person.resume}" target="_blank" rel="noopener noreferrer">Resume</a>`));
  const links = [...html.matchAll(/<a\b[^>]*>/g)].filter(([tag]) => tag.includes(`href="${data.person.resume}"`));
  assert.equal(links.length, 3);
  for (const [tag] of links) assert.ok(tag.includes('target="_blank"') && tag.includes('noopener noreferrer'));
  const contact = html.match(/<section id="contact"[\s\S]*?<\/section>/)[0];
  assert.equal((contact.match(/<a\b/g) || []).length, 3);
  assert.ok(contact.includes('LinkedIn') && contact.includes(data.person.email));
  assert.ok(!html.includes('<form') && !contact.includes('YouTube'));
  assert.deepEqual(Object.keys(data.links), ['linkedin','github']);
});

test('retired metrics, resume panels, and unrelated social links fail validation', () => {
  const edits = [
    (copy) => { copy.impact = null; },
    (copy) => { copy.impact = {items:[]}; },
    (copy) => { copy.resume = {headline:'Want the full picture?'}; },
    (copy) => { copy.links.youtube = 'https://www.youtube.com/@AsePlayer'; },
    (copy) => { copy.nav.find((item) => item.label === 'Resume').href = '#resume'; },
    (copy) => { copy.nav.find((item) => item.label === 'Resume').href = 'data/other.pdf'; },
    (copy) => { examples(copy)[0].metric = 'missing'; },
    (copy) => { examples(copy)[0].metric = {}; }
  ];
  for (const edit of edits) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});

test('case-study fields, featured selection, compact copy, and toolkits are validated', () => {
  const edits = [
    copy => { examples(copy)[0].featured = false; },
    copy => { copy.selectedWork.items.at(-1).featured = true; },
    copy => { examples(copy)[1].id = examples(copy)[0].id; },
    copy => { examples(copy)[0].id = 'Invalid ID'; },
    copy => { examples(copy)[0].featured = 'true'; },
    copy => { delete examples(copy)[0].challenge; },
    copy => { examples(copy)[0].outcome = []; },
    copy => { examples(copy)[0].technologies = []; },
    copy => { examples(copy)[0].technologies = 'SQL'; },
    copy => { examples(copy)[0].technologies = Array(7).fill('SQL'); },
    copy => { examples(copy)[0].summary = 'A'.repeat(401); },
    copy => { examples(copy)[0].approach = 'A'.repeat(601); },
    copy => { examples(copy)[0].title = 'Magazine Circulation Automation'; },
    copy => { copy.capabilities = {categories: []}; }
  ];
  for (const edit of edits) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});



test('alternate studies stay in the content model and out of rendered proof and structured data', () => {
  const hidden = data.selectedWork.items.filter(item => !item.featured);
  assert.deepEqual(hidden.map(item => item.id), ['historical-exhibitors', 'council-affiliations', 'operational-monitoring']);
  const html = renderDocument(data, template, 2026);
  for (const item of hidden) {
    assert.ok(!html.includes('id="work-' + item.id + '"'));
    assert.ok(!JSON.stringify(structuredData(html)).includes(item.title));
  }
  assert.ok(!/magazine circulation/i.test(JSON.stringify(data)));
  assert.ok(!html.includes('class="example-scale"') && !html.includes('Selected impact'));
});

test('How I Work stays a four-word sequence, with the QA foundation in experience', () => {
  assert.deepEqual(data.hero.approach, ['Understand', 'Trace', 'Build', 'Validate']);
  const html = renderDocument(data, template, 2026);
  assert.ok(html.includes('<ol class="approach-sequence" aria-label="How I work">'));
  assert.ok(html.includes(escapeHtml(data.experience.headline)));
  assert.ok(!html.includes('hero-panel'));
  assert.ok(!html.includes('process-steps'));
  const copy = structuredClone(data);
  copy.hero.approach.pop();
  assert.ok(validateContent(copy, root).some((error) => error.includes('How I Work')));
});

test('the simplified hero shows employer context while preserving the actual structured title', () => {
  const html = renderDocument(data,template,2026);
  const hero = html.match(/<section id="home"[\s\S]*?<\/section>/)[0];
  assert.ok(hero.includes('Data Operations Coordinator · SEMA'));
  assert.ok(hero.includes('Salesforce Certified Data 360 Consultant · B.S. Computer Science, Cum Laude'));
  assert.ok(html.includes('class="credential-list"'));
  assert.ok(!hero.includes('class="eyebrow"'));
  assert.equal(structuredData(html)[0].jobTitle, 'Data Operations Coordinator');
  const copy = structuredClone(data);
  copy.person.currentEmployer = '<script>alert(1)</script>';
  assert.ok(!renderDocument(copy,template,2026).includes('<script>alert(1)'));
  delete copy.person.currentEmployer;
  assert.ok(validateContent(copy,root).some((error) => error.includes('currentEmployer')));
});

test('skills and credentials use compact text groups without explanatory cards', () => {
  const html = renderDocument(data, template, 2026);
  assert.deepEqual(data.skills.groups.map((item) => item.title), ['Data','Business Systems','Automation','Data Operations']);
  assert.ok(data.skills.groups.every(group => group.items.length <= 7));
  assert.equal(data.experience.development.items.length, 4);
  assert.deepEqual(data.experience.development.items.map((item) => item.title), [
    'Salesforce Certified Data 360 Consultant','B.S. Computer Science, Cum Laude','Certified ScrumMaster (CSM)','Self-directed Salesforce learning'
  ]);
  assert.equal(data.experience.development.items[3].secondary, true);
  assert.ok(html.includes('class="credential-secondary"'));
  assert.ok(data.skills.groups[1].items.includes('Salesforce Data 360 — Certified'));
  assert.ok(html.includes('September 2026'));
  assert.ok(html.includes('Salesforce Certified Data 360 Consultant'));
  assert.ok(html.includes('class="credential-list"'));
  assert.ok(!html.includes('development-card'));
  for (const item of data.experience.development.items) assert.equal(item.text, undefined);
  const copy = structuredClone(data);
  copy.skills.groups.push(copy.skills.groups[0]);
  assert.ok(validateContent(copy, root).some((error) => error.includes('four compact groups')));
});

test('only featured case-study anchors can be navigation and hero destinations', () => {
  const copy = structuredClone(data);
  copy.nav[0].href = '#work-' + examples(copy)[0].id;
  copy.hero.actions[0].href = '#work-' + examples(copy)[1].id;
  assert.deepEqual(validateContent(copy, root), []);
  copy.nav[0].href = '#work-' + copy.selectedWork.items.find(item => !item.featured).id;
  assert.ok(validateContent(copy, root).some(error => error.includes('Navigation target')));
});

test('public identity stays aligned with Data Operations Coordinator and avoids title inflation', () => {
  assert.equal(data.person.currentRole, 'Data Operations Coordinator');
  assert.equal(data.experience.items[0].role, data.person.currentRole);
  assert.equal(data.seo.jobTitle, data.person.currentRole);
  for (const edit of [
    (copy) => { copy.person.title = 'Data Analyst'; },
    (copy) => { copy.seo.description = 'Ryan is a data and operations analyst.'; },
    ...['Solutions Architect', 'Data Architect', 'Salesforce Architect', 'Business Systems Analyst', 'expert', 'thought leader', 'enterprise leader'].map((title) =>
      (copy) => { copy.hero.subheadline = `Ryan is a ${title}.`; }),
    (copy) => { copy.person.currentRole = copy.seo.jobTitle = 'Data Architect'; },
    (copy) => { copy.experience.items[0].role = 'Platform Manager'; },
    (copy) => { copy.seo.jobTitle = 'Business Systems Analyst'; }
  ]) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});

test('featured case-study structured data stay linked to Person and escape text', () => {
  const copy = structuredClone(data);
  examples(copy)[0].summary = 'Example </script><script>alert(1)</script>';
  examples(copy)[0].challenge = '<img src=x onerror=alert(1)>';
  const html = renderDocument(copy, template, 2026);
  const blocks = structuredData(html);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0]['@type'], 'Person');
  const work = blocks[1].itemListElement;
  assert.equal(work.length, examples(copy).length);
  work.forEach(({item, position}, i) => {
    const study = examples(copy)[i];
    assert.equal(position, i + 1);
    assert.equal(item['@type'], 'CreativeWork');
    assert.equal(item.name, study.title);
    assert.equal(item.author['@id'], blocks[0]['@id']);
    assert.equal(item.abstract, study.summary);
    assert.equal(item.url, data.seo.url + '#work-' + study.id);
  });
  assert.ok(!html.includes('<script>alert(1)') && !html.includes('<img src=x'));
});

test('optional share image validates its asset and renders absolute social metadata', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-share-'));
  const asset = 'share.png';
  // Small fixture exercises optional images independently of the production share asset.
  fs.writeFileSync(path.join(fixtureRoot, asset), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=', 'base64'));
  try {
    const copy = structuredClone(data);
    copy.person.resume = '';
    copy.nav = copy.nav.filter((item) => item.href.startsWith('#'));
    copy.hero.actions = copy.hero.actions.filter((item) => item.href.startsWith('#'));
    copy.seo.image = {path:asset,alt:'Ryan & his work'};
    assert.deepEqual(validateContent(copy, fixtureRoot), []);
    const html = renderDocument(copy, template, 2026);
    assert.ok(html.includes('property="og:image" content="https://ryanscott.org/share.png"'));
    assert.ok(html.includes('name="twitter:image" content="https://ryanscott.org/share.png"'));
    assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
    assert.ok(html.includes('Ryan &amp; his work'));
    for (const unsafe of ['missing.png', '../private.png', 'https://other.example/share.png', 'share.svg']) {
      copy.seo.image.path = unsafe;
      assert.ok(validateContent(copy, fixtureRoot).some((error) => /image|Share image/.test(error)));
    }
    const withoutImage = structuredClone(data);
    delete withoutImage.seo.image;
    assert.ok(!renderDocument(withoutImage, template, 2026).includes('property="og:image"'));
  } finally {
    fs.unlinkSync(path.join(fixtureRoot, asset));
    fs.rmdirSync(fixtureRoot);
  }
});

test('the production share PNG exists, matches its dimensions, and ships correct metadata', () => {
  const asset = fs.readFileSync(path.join(root,data.seo.image.path));
  assert.equal(asset.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(asset.readUInt32BE(16), 1200);
  assert.equal(asset.readUInt32BE(20), 630);
  const html = renderDocument(data,template,2026);
  assert.ok(html.includes('property="og:image" content="https://ryanscott.org/assets/social-preview.png"'));
  assert.ok(html.includes('property="og:image:width" content="1200"'));
  assert.ok(html.includes('property="og:image:height" content="630"'));
  assert.ok(html.includes('name="twitter:image" content="https://ryanscott.org/assets/social-preview.png"'));
  const copy = structuredClone(data);
  copy.seo.image.width = 1100;
  assert.ok(validateContent(copy,root).some((error) => error.includes('dimensions')));
  copy.seo.image.width = '1200';
  assert.ok(validateContent(copy,root).some((error) => error.includes('positive integers')));
});

test('Selected Work and Independent Projects preserve distinct framing, optional types, safe copy, and useful links', () => {
  const html = renderDocument(data, template, 2026);
  const work = html.match(/<section id="work"[\s\S]*?(?=<section id="experience")/)[0];
  const projects = html.match(/<section id="projects"[\s\S]*?(?=<section id="education")/)[0];
  assert.ok(work.includes('Selected Professional Work') && work.includes(data.selectedWork.intro));
  assert.ok(projects.includes('Independent Projects') && projects.includes(data.projects.intro));
  assert.equal((projects.match(/class="project-card"/g) || []).length, 3);
  assert.ok(projects.includes('Creator Project') && projects.includes('Web App'));
  assert.ok(projects.includes('59.9K subscribers') && projects.includes('31.6M+ views'));
  assert.ok(!/fictional|open-now|project-portfolio-heading/.test(projects));
  assert.ok(!work.includes('Back-Fixer-Upper') && !work.includes('So What We Eating?'));
  const copy = structuredClone(data);
  delete copy.projects.items[0].type;
  delete copy.projects.items[2].highlight;
  assert.deepEqual(validateContent(copy, root), []);
  copy.projects.items[0].summary = '<script>untrusted()</script>';
  copy.projects.items[2].highlight = '<img src=x onerror=bad()>';
  const escaped = renderDocument(copy, template, 2026);
  assert.ok(!escaped.includes('<script>untrusted()') && !escaped.includes('<img src=x'));
  copy.projects.items[0].type = 'Invalid category';
  assert.ok(validateContent(copy, root).some(message => message.includes('.type')));
});
