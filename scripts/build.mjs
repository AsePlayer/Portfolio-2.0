import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDocument } from './render-site.mjs';
import { validateContent } from './validate-content.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function buildSite() {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
  const errors = validateContent(data, root);
  if (errors.length) throw new Error(`Invalid content:\n${errors.join('\n')}`);
  const template = fs.readFileSync(path.join(root, 'templates/index.html'), 'utf8');
  const html = renderDocument(data, template);
  // Keep the root page readable for direct file previews as well as deployments.
  fs.writeFileSync(path.join(root, 'index.html'), html);
  const output = path.join(root, 'dist');
  if (path.dirname(output) !== root) throw new Error('Build output must stay inside the repository.');
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), html);
  // Publish only public assets and the configured general résumé, never other variants.
  const assets = ['css/styles.css', 'js/script.js', 'data/site.json', 'favicon.svg', 'CNAME', '.nojekyll'];
  if (data.person.resume) assets.push(data.person.resume);
  for (const asset of new Set(assets)) {
    const destination = path.join(output, asset);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, asset), destination);
  }
  console.log('Prerendered index.html and public GitHub Pages artifact in dist/.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildSite();
