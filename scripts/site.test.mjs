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
const examples = (content) => content.capabilities.categories.flatMap((category) => category.examples);
const structuredData = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));

test('capabilities, compact examples, credentials, and contact ship as HTML', () => {
  assert.deepEqual(validateContent(data, root), []);
  const html = renderDocument(data, template, 2026);
  for (const value of [data.hero.subheadline, ...data.capabilities.categories.flatMap((item) => [item.title, item.intro]),
    ...data.capabilities.categories.flatMap((item) => item.technologies),
    ...examples(data).flatMap((item) => [item.title, item.summary]), data.contact.text,
    ...data.experience.development.items.map((item) => item.title)]) {
    assert.ok(html.includes(escapeHtml(value)), `Missing content: ${value}`);
  }
  assert.ok(html.includes(`href="mailto:${data.person.email}"`));
  assert.ok(!html.includes('<form'));
  assert.ok(!html.includes('{{'));
});

test('content is escaped in text, attributes, and structured data', () => {
  const copy = structuredClone(data);
  copy.person.name = 'Ryan <script>alert("x")</script>';
  copy.capabilities.categories[0].title = '" onclick="alert(1)';
  const example = examples(copy)[0];
  example.title = '" onclick="alert(1)';
  example.summary = '<img src=x onerror=alert(1)>';
  copy.capabilities.categories[0].technologies[0] = '<script>bad()</script>';
  copy.contact.headline = '"><script>alert(1)</script>';
  const html = renderDocument(copy, template, 2026);
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('Ryan &lt;script&gt;alert(&quot;x&quot;)'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.name, copy.person.name);
});

test('invalid capability and nested example structures fail without crashing', () => {
  for (const value of [null, {}, {categories: 'incorrect'}, {categories: [null]},
    {categories: [{examples: [null]}, {examples: {}}, null]}]) {
    const copy = structuredClone(data);
    copy.capabilities = value;
    assert.ok(validateContent(copy, root).some((error) => error.includes('capabilities')));
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

test('three capability areas precede experience with compact, accessible proof', () => {
  const html = renderDocument(data, template, 2026);
  const order = ['home', 'work', 'experience', 'projects', 'education', 'skills', 'contact'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(html.indexOf(`id="${order[i - 1]}"`) < html.indexOf(`id="${order[i]}"`));
  }
  assert.equal((html.match(/class="capability-area"/g) || []).length, 3);
  assert.equal((html.match(/class="work-example"/g) || []).length, 9);
  assert.ok(!html.includes('id="impact"'));
  assert.ok(!html.includes('id="resume"'));
  for (const category of data.capabilities.categories) {
    assert.ok(html.includes(`aria-labelledby="capability-${category.id}-heading"`));
    assert.ok(html.includes(`<h3 id="capability-${category.id}-heading">`));
  }
  for (const item of examples(data)) {
    assert.ok(html.includes(`id="work-${item.id}"`));
    assert.ok(html.includes(`<h4 id="example-${item.id}-heading">`));
  }
  assert.ok(!html.includes('<dt>Problem</dt>'));
  assert.ok(!html.includes('Skills demonstrated'));
  assert.ok(!html.includes('class="work-card'));
  assert.ok(!html.includes('capability-nav'));
  assert.ok(!html.includes('class="example-label"'));
  assert.equal((html.match(/class="capability-tools"/g) || []).length, 3);
});

test('minimal one-sentence proof examples remain valid', () => {
  const copy = structuredClone(data);
  copy.capabilities.categories.forEach((category, i) => {
    category.examples = [0, 1, 2].map((j) => ({id:`example-${i}-${j}`,title:'A workflow',summary:'A concise example.'}));
  });
  assert.deepEqual(validateContent(copy, root), []);
  const html = renderDocument(copy, template, 2026);
  assert.ok(html.includes('A concise example.'));
  assert.ok(!html.includes('id="impact"'));
  assert.ok(!html.includes('<details'));
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

test('three capability areas, short proof lists, and shared toolkits are enforced', () => {
  const edits = [
    (copy) => { copy.capabilities.categories.pop(); },
    (copy) => { copy.capabilities.categories.push(copy.capabilities.categories[0]); },
    (copy) => { copy.capabilities.categories[1].id = copy.capabilities.categories[0].id; },
    (copy) => { copy.capabilities.categories[0].id = 'Invalid ID'; },
    (copy) => { examples(copy)[0].id = '" onclick="alert(1)'; },
    (copy) => { copy.capabilities.categories[1].examples[0].id = examples(copy)[0].id; },
    (copy) => { copy.capabilities.categories[0].examples = [examples(copy)[0]]; },
    (copy) => { copy.capabilities.categories[0].examples = examples(copy).slice(0, 2); },
    (copy) => { copy.capabilities.categories[0].examples.push(examples(copy)[0]); },
    (copy) => { examples(copy)[0].impact = 'A string'; },
    (copy) => { examples(copy)[0].impact = ['One', 'Two', 'Three', 'Four']; },
    (copy) => { examples(copy)[0].technologies = []; },
    (copy) => { examples(copy)[0].technologies = Array(7).fill('SQL'); },
    (copy) => { copy.capabilities.categories[0].technologies = []; },
    (copy) => { copy.capabilities.categories[0].technologies = 'SQL'; },
    (copy) => { copy.capabilities.categories[0].technologies = Array(7).fill('SQL'); },
    (copy) => { examples(copy)[0].summary = 'A short sentence. Another sentence.'; },
    (copy) => { examples(copy)[0].summary = 'A'.repeat(241); },
    (copy) => { copy.capabilities.categories[0].intro = 'A'.repeat(181); },
    (copy) => { examples(copy)[0].details = null; },
    (copy) => { examples(copy)[0].details = {steps:['Unused deep dive.']}; },
    (copy) => { examples(copy)[0].solution = 'Old full case study'; },
    (copy) => { copy.selectedWork = {items:[]}; }
  ];
  for (const edit of edits) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});

test('nine proof examples contain only a heading and one contextual sentence', () => {
  const html = renderDocument(data, template, 2026);
  assert.ok(!html.includes('<details'));
  assert.ok(!html.includes('How it worked'));
  assert.ok(!html.includes('class="tool-list"'));
  const proofs = [...html.matchAll(/<li id="work-[^"]+" class="work-example"[^>]*>([\s\S]*?)<\/li>/g)];
  assert.equal(proofs.length, 9);
  for (const [,markup] of proofs) {
    assert.equal((markup.match(/<h4\b/g) || []).length, 1);
    assert.equal((markup.match(/<p\b/g) || []).length, 1);
    assert.ok(!/<(?:ul|article|details)\b/.test(markup));
  }
  for (const category of data.capabilities.categories) {
    assert.ok(html.includes(`aria-label="Technology for ${escapeHtml(category.title)}">${category.technologies.map(escapeHtml).join(' · ')}</p>`));
  }
});

test('scale supports the business result inside the relevant proof, without badges', () => {
  const proof = Object.fromEntries(examples(data).map((example) => [example.id,example.summary]));
  assert.match(proof['council-affiliations'], /matching logic.*approximately 4,000.*affiliation records/);
  assert.match(proof['historical-exhibitors'], /when organizations first exhibited.*roughly 8,000.*first-time and returning/);
  assert.match(proof['operational-monitoring'], /473 organizations missing primary contacts.*configuration problems/);
  for (const removed of ['audience-segmentation','membership-flowdown','reporting-modernization']) assert.equal(proof[removed], undefined);
  const html = renderDocument(data, template, 2026);
  assert.ok(!html.includes('class="example-scale"'));
  assert.ok(!html.includes('Selected impact'));
  assert.ok(!html.includes('8,000+'));
  assert.ok(!html.includes('4,000+'));
  assert.ok(!html.includes('400+'));
});

test('How I Work stays a four-word sequence, with the QA foundation in experience', () => {
  assert.deepEqual(data.hero.approach, ['Understand', 'Trace', 'Build', 'Validate']);
  const html = renderDocument(data, template, 2026);
  assert.ok(html.includes('<ol class="approach-sequence" aria-label="How I work">'));
  assert.ok(html.includes('From QA and software to data operations.'));
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
  assert.equal(data.skills.groups.flatMap((item) => item.items).length, 24);
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

test('category and example anchors can be used by navigation and hero actions', () => {
  const copy = structuredClone(data);
  copy.nav[0].href = '#capability-crm-data-quality';
  copy.hero.actions[0].href = '#work-council-affiliations';
  assert.deepEqual(validateContent(copy, root), []);
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

test('nested capability and example structured data stay linked to Person and escape text', () => {
  const copy = structuredClone(data);
  examples(copy)[0].summary = 'Example </script><script>alert(1)</script>';
  copy.capabilities.categories[0].intro = '<img src=x onerror=alert(1)>';
  const html = renderDocument(copy, template, 2026);
  const blocks = structuredData(html);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0]['@type'], 'Person');
  const work = blocks[1].itemListElement;
  assert.equal(work.length, copy.capabilities.categories.length);
  work.forEach((entry, i) => {
    const category = copy.capabilities.categories[i];
    assert.equal(entry.item.name, category.title);
    assert.equal(entry.item.description, category.intro);
    assert.equal(entry.item.itemListElement.length, category.examples.length);
    entry.item.itemListElement.forEach(({item}, j) => {
      assert.equal(item.author['@id'], blocks[0]['@id']);
      assert.equal(item.abstract, category.examples[j].summary);
      assert.equal(item.url, `${data.seo.url}#work-${category.examples[j].id}`);
    });
  });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
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
