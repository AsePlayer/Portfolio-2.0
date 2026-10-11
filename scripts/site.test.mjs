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
  assert.ok(html.includes('data-next-url value="https://ryanscott.org/?sent=true#contact"'));
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
  copy.contact.formSubject = '"><script>alert(1)</script>';
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
  copy.nav = copy.nav.filter((item) => item.href !== '#resume');
  copy.hero.actions = copy.hero.actions.filter((item) => item.href.startsWith('#'));
  assert.deepEqual(validateContent(copy, root), []);
  const html = renderDocument(copy, template, 2026);
  assert.ok(html.includes('role-progression'));
  assert.ok(!html.includes('id="resume"'));
});

test('three capability areas precede experience with compact, accessible proof', () => {
  const html = renderDocument(data, template, 2026);
  const order = ['home', 'impact', 'work', 'experience', 'education', 'skills', 'resume', 'contact'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(html.indexOf(`id="${order[i - 1]}"`) < html.indexOf(`id="${order[i]}"`));
  }
  assert.equal((html.match(/class="capability-area"/g) || []).length, 3);
  assert.equal((html.match(/class="work-example"/g) || []).length, 12);
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

test('minimal compact examples and an omitted proof band remain valid', () => {
  const copy = structuredClone(data);
  delete copy.impact;
  copy.capabilities.categories.forEach((category, i) => {
    category.examples = [0, 1, 2].map((j) => ({id:`example-${i}-${j}`,title:'A workflow',summary:'A concise example.'}));
  });
  assert.deepEqual(validateContent(copy, root), []);
  const html = renderDocument(copy, template, 2026);
  assert.ok(html.includes('A concise example.'));
  assert.ok(!html.includes('id="impact"'));
  assert.ok(!html.includes('<details'));
});

test('metric controls update every rendered reference and identify approximate figures', () => {
  const copy = structuredClone(data);
  const metric = copy.impact.items.find((item) => item.id === 'reachability');
  metric.value = '472';
  metric.approximate = true;
  let html = renderDocument(copy, template, 2026);
  assert.equal((html.match(/Approximately <\/span>472<\/strong>/g) || []).length, 2);
  assert.ok(html.includes('<span aria-hidden="true">~</span><span class="visually-hidden">Approximately </span>472'));
  metric.enabled = false;
  html = renderDocument(copy, template, 2026);
  assert.ok(!html.includes('472</strong>'));
  copy.impact.items.forEach((item) => { item.enabled = false; });
  assert.ok(!renderDocument(copy, template, 2026).includes('id="impact"'));
  metric.enabled = true;
  copy.impact.enabled = false;
  html = renderDocument(copy, template, 2026);
  assert.ok(!html.includes('id="impact"'));
  assert.equal((html.match(/Approximately <\/span>472<\/strong>/g) || []).length, 1);
});

test('invalid metrics and references fail with actionable errors', () => {
  const edits = [
    (copy) => { copy.impact = null; },
    (copy) => { copy.impact.items = {find:'incorrect'}; },
    (copy) => { copy.impact.items = [null]; },
    (copy) => { copy.impact.items[0].approximate = 'yes'; },
    (copy) => { copy.impact.items[0].enabled = 'no'; },
    (copy) => { copy.impact.items.push(copy.impact.items[0]); },
    (copy) => { copy.impact.items[0].exampleId = 'unknown'; },
    (copy) => { copy.impact.items[0].caseStudyId = 'historical-exhibitors'; },
    (copy) => { copy.impact.items[0].value = '8,000+'; },
    (copy) => { copy.impact.items[0].value = '~8,000'; },
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

test('examples contain only a heading, one sentence, and optional scale with no disclosures', () => {
  const html = renderDocument(data, template, 2026);
  assert.ok(!html.includes('<details'));
  assert.ok(!html.includes('How it worked'));
  assert.ok(!html.includes('class="tool-list"'));
  const proofs = [...html.matchAll(/<li id="work-[^"]+" class="work-example"[^>]*>([\s\S]*?)<\/li>/g)];
  assert.equal(proofs.length, 12);
  for (const [,markup] of proofs) {
    assert.equal((markup.match(/<h4\b/g) || []).length, 1);
    assert.equal((markup.match(/<p\b/g) || []).length, 1);
    assert.ok(!/<(?:ul|article|details)\b/.test(markup));
  }
  for (const category of data.capabilities.categories) {
    assert.ok(html.includes(`aria-label="Technology for ${escapeHtml(category.title)}">${category.technologies.map(escapeHtml).join(' · ')}</p>`));
  }
});

test('verified counts and business context stay accurate without lower-bound inflation', () => {
  assert.deepEqual(data.impact.items.map(({value, approximate}) => ({value, approximate})), [
    {value:'8,000',approximate:true}, {value:'4,000',approximate:true}, {value:'473',approximate:false}
  ]);
  assert.equal(data.impact.items[0].label, 'Historical exhibitor records analyzed');
  assert.ok(data.impact.items[2].context.includes('primary contacts'));
  const html = renderDocument(data, template, 2026);
  assert.equal((html.match(/<strong>473<\/strong>/g) || []).length, 2);
  const band = html.match(/<section id="impact"[\s\S]*?<\/section>/)[0];
  assert.ok(!band.includes('<a '));
  assert.equal((html.match(/class="example-scale"/g) || []).length, 3);
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

test('skills and credentials use compact text groups without explanatory cards', () => {
  const html = renderDocument(data, template, 2026);
  assert.deepEqual(data.skills.groups.map((item) => item.title), ['Data','Business Systems','Automation','Data Operations']);
  assert.equal(data.skills.groups.flatMap((item) => item.items).length, 24);
  assert.equal(data.experience.development.items.length, 4);
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
  copy.impact.items[0].context = '<script>bad()</script>';
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
  // Small image fixture; no production share image is configured yet.
  fs.writeFileSync(path.join(fixtureRoot, asset), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII=', 'base64'));
  try {
    const copy = structuredClone(data);
    copy.person.resume = '';
    copy.nav = copy.nav.filter((item) => item.href !== '#resume');
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
    assert.ok(!renderDocument(data, template, 2026).includes('property="og:image"'));
  } finally {
    fs.unlinkSync(path.join(fixtureRoot, asset));
    fs.rmdirSync(fixtureRoot);
  }
});
