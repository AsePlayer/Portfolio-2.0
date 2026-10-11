import fs from 'node:fs';
import path from 'node:path';
import { root } from './build.mjs';
import { escapeHtml, renderDocument } from './render-site.mjs';
import { validateContent } from './validate-content.mjs';

const errors = [];
const fail = (message) => errors.push(message);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let data;
try { data = JSON.parse(read('data/site.json')); }
catch (error) { fail(`data/site.json could not be parsed: ${error.message}`); }
if (data) errors.push(...validateContent(data, root));
const html = read('index.html');
const template = read('templates/index.html');
if (!errors.length && html.replace(/\r\n/g, '\n') !== renderDocument(data, template)) fail('index.html is stale. Run node scripts/build.mjs after editing content or templates.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
if (new Set(ids).size !== ids.length) fail('Rendered HTML contains duplicate IDs.');
for (const match of html.matchAll(/\bhref="#([^"]*)"/g)) {
  if (!ids.includes(match[1])) fail(`Rendered anchor #${match[1]} has no destination.`);
}
for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const href = match[1];
  if (/^(?:https:|mailto:|#)/.test(href)) continue;
  const file = decodeURIComponent(href.split(/[?#]/)[0]).replaceAll('&amp;', '&');
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(`${root}${path.sep}`) || !fs.existsSync(resolved)) fail(`Rendered local asset is missing or outside the site: ${file}`);
}
for (const id of ['home', 'experience', 'work', 'education', 'skills', 'contact']) {
  if (!ids.includes(id)) fail(`Prerendered HTML is missing section ${id}.`);
}
for (const marker of ['class="skip-link"', 'id="theme-toggle"', 'id="main"', 'id="nav-toggle"', 'aria-controls="primary-nav"']) {
  if (!html.includes(marker)) fail(`index.html is missing required accessibility marker: ${marker}`);
}
const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
try {
  const schema = JSON.parse(schemaMatch?.[1]);
  if (schema.jobTitle !== data?.seo?.jobTitle || schema.url !== data?.seo?.url) fail('JSON-LD identity or canonical URL differs from content.');
  if (JSON.stringify(schema.knowsAbout) !== JSON.stringify(data?.seo?.knowsAbout)) fail('JSON-LD knowsAbout differs from content.');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
  const work = blocks.find((block) => block['@type'] === 'ItemList');
  const categories = data?.capabilities?.categories || [];
  if (work?.itemListElement?.length !== categories.length) fail('Capability structured data differs from content.');
  categories.forEach((category, i) => {
    const list = work?.itemListElement?.[i]?.item;
    if (list?.name !== category.title || list?.url !== `${data.seo.url}#capability-${category.id}`) fail(`Structured capability ${category.id} is missing or stale.`);
    if (list?.itemListElement?.length !== category.examples.length) fail(`Structured examples for ${category.id} differ from content.`);
    category.examples.forEach((example, j) => {
      const item = list?.itemListElement?.[j]?.item;
      if (item?.name !== example.title || item?.abstract !== example.summary || item?.url !== `${data.seo.url}#work-${example.id}` || item?.author?.['@id'] !== schema['@id']) fail(`Structured example ${example.id} is missing, stale, or not linked to Ryan.`);
    });
  });
} catch { fail('JSON-LD metadata could not be parsed.'); }
if (data?.seo) {
  for (const marker of [
    `<title>${escapeHtml(data.seo.title)}</title>`,
    `name="description" content="${escapeHtml(data.seo.description)}"`,
    `rel="canonical" href="${escapeHtml(data.seo.url)}"`,
    `property="og:title" content="${escapeHtml(data.seo.title)}"`,
    `property="og:description" content="${escapeHtml(data.seo.socialDescription)}"`,
    `name="twitter:title" content="${escapeHtml(data.seo.title)}"`,
    `name="twitter:description" content="${escapeHtml(data.seo.socialDescription)}"`
  ]) if (!html.includes(marker)) fail(`SEO metadata is missing or stale: ${marker}`);
  if (data.seo.image) {
    const imageUrl = escapeHtml(new URL(data.seo.image.path, data.seo.url).href);
    if (!html.includes(`property="og:image" content="${imageUrl}"`) || !html.includes(`name="twitter:image" content="${imageUrl}"`)) fail('Configured social image metadata is missing.');
  } else if (/\b(?:property="og:image"|name="twitter:image")/.test(html)) fail('Share image metadata must be omitted until an asset is configured.');
}
if (data?.person) {
  if (!html.includes(`action="https://formsubmit.co/${escapeHtml(data.person.email)}" method="POST"`)) fail('Contact form action or method differs from configuration.');
  if (!html.includes(`data-next-url value="${escapeHtml(data.seo?.url)}?sent=true#contact"`)) fail('Contact form needs a static success return URL.');
  if (data.person.resume && !html.includes(`href="${escapeHtml(data.person.resume)}"`)) fail('Configured résumé is not linked in HTML.');
}
if (/tel:|(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/i.test(html)) fail('Public HTML contains a phone number.');
if (/\b(?:data\s+(?:(?:and|&amp;)\s+operations\s+)?analyst|(?:solutions?|data|salesforce)\s+architect|business\s+systems\s+analyst)\b/i.test(html)) fail('Public HTML contains an inflated role title.');
if (html.indexOf('id="work"') > html.indexOf('id="experience"')) fail('Capabilities must appear before Experience.');
if ((html.match(/class="capability-area"/g) || []).length !== 3) fail('Rendered portfolio must have three capability areas.');
if (/<details\b/.test(html)) fail('The main portfolio must not render deep-dive disclosures.');
if (/class="(?:work-card|case-details|audit-process|example-label|example-impact|tool-list|capability-nav|hero-panel|development-card)|<dt>(?:Problem|Investigation|Solution)<\/dt>/.test(html)) fail('Retired heavy portfolio markup remains.');
const impactBand = html.match(/<section id="impact"[\s\S]*?<\/section>/)?.[0];
if (impactBand?.includes('<a ')) fail('The impact band must not contain example navigation.');
if ((html.match(/class="capability-tools"/g) || []).length !== 3) fail('Each capability must render exactly one shared technology line.');
for (const category of data?.capabilities?.categories || []) {
  if (!ids.includes(`capability-${category.id}`)) fail(`Capability ${category.id} is missing from prerendered HTML.`);
  for (const example of category.examples || []) {
    if (!ids.includes(`work-${example.id}`) || !html.includes(escapeHtml(example.title))) fail(`Example ${example.id} is missing from prerendered HTML.`);
  }
}
if (/<noscript>|loading-section|Salesforce\s*(?:&amp;|&)\s*Data Operations Analyst/.test(html)) fail('Old JavaScript fallback content or Salesforce-first identity remains.');
if (/\bfetch\(/.test(read('js/script.js'))) fail('Browser content must not depend on fetching JSON.');
if (read('CNAME').trim() !== 'ryanscott.org') fail('CNAME must contain only ryanscott.org.');
const styles = read('css/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
if ((styles.match(/{/g) || []).length !== (styles.match(/}/g) || []).length) fail('CSS has unbalanced braces.');
const publicFiles = ['index.html', 'css/styles.css', 'js/script.js', 'data/site.json', 'favicon.svg', 'CNAME', '.nojekyll'];
if (data?.person?.resume) publicFiles.push(data.person.resume);
if (data?.seo?.image) publicFiles.push(data.seo.image.path);
for (const file of publicFiles) {
  const artifact = path.join(root, 'dist', file);
  if (!fs.existsSync(artifact)) fail(`Build artifact is missing ${file}. Run node scripts/build.mjs.`);
  else if (!fs.readFileSync(artifact).equals(fs.readFileSync(path.join(root, file)))) fail(`Build artifact differs from ${file}. Rebuild before deployment.`);
}
const workflow = read('.github/workflows/pages.yml');
if (!workflow.includes('node scripts/build.mjs') || !workflow.includes('node scripts/validate-site.mjs') || !workflow.includes('path: ./dist')) fail('Pages workflow must build, validate, and publish dist/.');
if (errors.length) {
  console.error(`Portfolio validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}
console.log('Portfolio validation passed: content schema, prerendered sections, anchors, metadata, privacy, form, résumé, and deployment assets.');
