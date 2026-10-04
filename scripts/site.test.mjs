import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderDocument } from './render-site.mjs';
import { validateContent } from './validate-content.mjs';

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
