import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderDocument } from './render-site.mjs';
import { validateContent } from './validate-content.mjs';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const template = fs.readFileSync(path.join(root, 'templates/index.html'), 'utf8');

test('portfolio content, credentials, case studies, and contact ship as HTML', () => {
  const html = renderDocument(data, template, 2026);
  for (const value of [data.hero.subheadline, ...data.selectedWork.items.map((item) => item.title), data.contact.text,
    ...data.experience.development.items.map((item) => item.title)]) {
    assert.ok(html.includes(value.replaceAll('&', '&amp;')), `Missing content: ${value}`);
  }
  assert.ok(html.includes('data-next-url value="https://ryanscott.org/?sent=true#contact"'));
  assert.ok(!html.includes('{{'));
});

test('content is escaped in text, attributes, and structured data', () => {
  const copy = structuredClone(data);
  copy.person.name = 'Ryan <script>alert("x")</script>';
  copy.selectedWork.items[0].title = '" onclick="alert(1)';
  copy.contact.formSubject = '"><script>alert(1)</script>';
  const html = renderDocument(copy, template, 2026);
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('Ryan &lt;script&gt;alert(&quot;x&quot;)'));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema.name, copy.person.name);
});

test('invalid case studies fail validation without crashing', () => {
  for (const value of [null, {}, {items: 'incorrect'}, {items: [null]}]) {
    const copy = structuredClone(data);
    copy.selectedWork = value;
    assert.ok(validateContent(copy, root).some((error) => error.includes('selectedWork')));
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

test('work precedes experience and renders all case-study stages without JavaScript', () => {
  const html = renderDocument(data, template, 2026);
  const order = ['home', 'impact', 'work', 'experience', 'education', 'skills', 'resume', 'contact'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(html.indexOf(`id="${order[i - 1]}"`) < html.indexOf(`id="${order[i]}"`));
  }
  for (const item of data.selectedWork.items) {
    assert.ok(html.includes(`id="work-${item.id}"`));
    for (const field of ['challenge', 'investigation', 'solution', 'impact']) {
      if (item[field]) assert.ok(html.includes(item[field].replaceAll('&', '&amp;')));
    }
  }
  assert.ok(html.includes('<dt>Problem</dt>'));
  assert.ok(html.includes('aria-label="Audit process"'));
  assert.ok(!/\bdata\s+(?:(?:and|&)\s+operations\s+)?analyst\b/i.test(html));
});

test('minimal case studies and an omitted proof band remain valid', () => {
  const copy = structuredClone(data);
  delete copy.impact;
  copy.selectedWork.items = [{id:'small-investigation',title:'Investigation',summary:'A concise example.',skills:['SQL']}];
  assert.deepEqual(validateContent(copy, root), []);
  const html = renderDocument(copy, template, 2026);
  assert.ok(html.includes('A concise example.'));
  assert.ok(!html.includes('id="impact"'));
  assert.ok(!html.includes('Featured work'));
});

test('metric controls update every rendered reference and identify approximate figures', () => {
  const copy = structuredClone(data);
  const metric = copy.impact.items.find((item) => item.id === 'reachability');
  metric.value = '472';
  let html = renderDocument(copy, template, 2026);
  assert.equal((html.match(/<strong>472<\/strong>/g) || []).length, 2);
  assert.ok(html.includes('Approximately'));
  metric.enabled = false;
  html = renderDocument(copy, template, 2026);
  assert.ok(!html.includes('<strong>472</strong>'));
  copy.impact.items.forEach((item) => { item.enabled = false; });
  assert.ok(!renderDocument(copy, template, 2026).includes('id="impact"'));
});

test('invalid metric and case-study schemas fail with actionable errors', () => {
  const edits = [
    (copy) => { copy.impact.items[0].approximate = 'yes'; },
    (copy) => { copy.impact.items[0].enabled = 'no'; },
    (copy) => { copy.impact.items.push(copy.impact.items[0]); },
    (copy) => { copy.impact.items[0].caseStudyId = 'unknown'; },
    (copy) => { copy.selectedWork.items[0].metric = 'missing'; },
    (copy) => { copy.selectedWork.items[0].id = '" onclick="alert(1)'; },
    (copy) => { copy.selectedWork.items[1].id = copy.selectedWork.items[0].id; },
    (copy) => { copy.selectedWork.items[0].process = 'invalid'; },
    (copy) => { copy.selectedWork.items[0].featured = 'yes'; },
    (copy) => { copy.selectedWork.items[0].solution = {}; }
  ];
  for (const edit of edits) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});

test('public identity stays aligned with the actual role and avoids the direct analyst label', () => {
  assert.equal(data.seo.jobTitle, data.person.currentRole);
  for (const edit of [
    (copy) => { copy.person.title = 'Data Analyst'; },
    (copy) => { copy.seo.description = 'Ryan is a data and operations analyst.'; },
    (copy) => { copy.seo.jobTitle = 'Business Systems Analyst'; }
  ]) {
    const copy = structuredClone(data);
    edit(copy);
    assert.ok(validateContent(copy, root).length > 0);
  }
});

test('case-study and Person structured data stay linked and escape untrusted text', () => {
  const copy = structuredClone(data);
  copy.selectedWork.items[0].summary = 'Example </script><script>alert(1)</script>';
  copy.selectedWork.items[0].challenge = '<img src=x onerror=alert(1)>';
  copy.impact.items[0].context = '<script>bad()</script>';
  const html = renderDocument(copy, template, 2026);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0]['@type'], 'Person');
  const work = blocks[1].itemListElement;
  assert.equal(work.length, copy.selectedWork.items.length);
  assert.equal(work[0].item.author['@id'], blocks[0]['@id']);
  assert.equal(work[0].item.abstract, copy.selectedWork.items[0].summary);
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
