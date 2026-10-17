import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

// All raster icons derive from the same SVG as the header and favicon.
const svg = await readFile('public/icons/icon.svg', 'utf8');
const chrome = process.env.CHROME_PATH ?? (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined);
const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
try {
    const page = await browser.newPage();
    for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['icon-maskable', 512], ['apple-touch-icon', 180]]) {
        const data = await page.evaluate(async ({ svg, size }) => {
            const image = new Image();
            image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const context = canvas.getContext('2d');
            context.fillStyle = '#f4f0e6';
            context.fillRect(0, 0, size, size);
            context.drawImage(image, 0, 0, size, size);
            URL.revokeObjectURL(image.src);
            return canvas.toDataURL('image/png').split(',')[1];
        }, { svg, size });
        await writeFile(`public/icons/${name}.png`, Buffer.from(data, 'base64'));
    }
} finally { await browser.close(); }
console.log('Generated install and Apple icons from the plate/question SVG.');
