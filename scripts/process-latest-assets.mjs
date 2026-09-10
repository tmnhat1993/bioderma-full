import path from 'node:path';
import sharp from 'sharp';

const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Usage: node scripts/process-latest-assets.mjs <Latest folder>');

const source = path.join(sourceRoot, 'ELEMENT');
const output = path.resolve('public/assets/event');

async function exportAsset(input, filename, width, options = {}) {
  let pipeline = sharp(path.join(source, input));
  if (options.trim !== false) pipeline = pipeline.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } });
  await pipeline
    .resize({ width, withoutEnlargement: true })
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(output, filename));
}

await exportAsset('LED EVENT.png', 'background.webp', 1080, { trim: false });
await exportAsset('LED EVENT-09.png', 'home-bg.webp', 1200);
await exportAsset('LED EVENT-16.png', 'checked-illu.webp', 480);
await exportAsset('LED EVENT-17.png', 'lightning.webp', 240);
await exportAsset('LED EVENT-18.png', 'bubble-img.webp', 1200);

const buttons = [
  { source: 'LED EVENT-10.png', output: 'button-join.webp', crop: { left: 64, top: 229, width: 2377, height: 325 }, width: 800 },
  { source: 'LED EVENT-11.png', output: 'button-understood.webp', crop: { left: 64, top: 229, width: 1422, height: 326 }, width: 520 },
  { source: 'LED EVENT-12.png', output: 'button-anonymous.webp', crop: { left: 86, top: 235, width: 2739, height: 300 }, width: 900 },
  { source: 'LED EVENT-13.png', output: 'button-back.webp', crop: { left: 49, top: 224, width: 1606, height: 348 }, width: 520 },
  { source: 'LED EVENT-14.png', output: 'button-next.webp', crop: { left: 49, top: 224, width: 1606, height: 348 }, width: 520 },
  { source: 'LED EVENT-15.png', output: 'button-start.webp', crop: { left: 4, top: 203, width: 2054, height: 446 }, width: 720 },
];

for (const button of buttons) {
  const cropped = sharp(path.join(source, button.source)).extract(button.crop);
  const { data, info } = await cropped
    .resize({ width: button.width })
    .webp({ lossless: true, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  const mask = Buffer.from(`<svg width="${info.width}" height="${info.height}"><rect width="${info.width}" height="${info.height}" rx="${info.height / 2}" fill="white"/></svg>`);
  await sharp(data)
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ lossless: true, effort: 6 })
    .toFile(path.join(output, button.output));
}

console.log('Latest event assets processed successfully.');
