// Angular writes extracted notices beside browser/, while Pages publishes browser/.
// Keep the notices in both the public source tree and every published build.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'dist/www/3rdpartylicenses.txt');
if (!fs.existsSync(source)) throw new Error('Angular third-party license output is missing.');
for (const directory of ['public/licenses', 'dist/www/browser/licenses']) {
  fs.mkdirSync(path.join(root, directory), { recursive: true });
  fs.copyFileSync(source, path.join(root, directory, 'npm-licenses.txt'));
}
console.log('Third-party license notices included in the Pages build.');
