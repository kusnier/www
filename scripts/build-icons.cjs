// Run with `node scripts/build-icons.cjs` when sharp is installed locally,
// or set SHARP_MODULE to the absolute path of an existing sharp installation.
// The SVG is the editable source; the ICO embeds PNGs for modern browsers.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const directory = path.resolve(__dirname, '../public');

async function build() {
  const source = path.join(directory, 'favicon.svg');
  const sizes = [16, 32, 48, 64];
  const images = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header[entry] = sizes[index];
    header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  await fs.writeFile(path.join(directory, 'favicon.ico'), Buffer.concat([header, ...images]));
  await fs.writeFile(path.join(directory, 'favicon-32.png'), images[1]);
  await sharp(source).resize(180, 180).png().toFile(path.join(directory, 'apple-touch-icon.png'));
  console.log('Built 16/32/48/64px ICO, 32px PNG and 180px Apple touch icon.');
}
build().catch(error => { console.error(error); process.exitCode = 1; });
