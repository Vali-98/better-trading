/* eslint-env node */

const fs = require('fs');
const path = require('path');
const [target] = process.argv.slice(2);
const isFirefox = true;
const outputDir = {
  dev: './dist/dev',
  production: './dist/staged',
}[target];

const packageJson = JSON.parse(fs.readFileSync('./package.json'));

const assetsPathFor = (assetsRelativePath) => {
  const path = `assets/${assetsRelativePath}`;

  if (target === 'production') return path;
  return `ember-build/${path}`;
};

const host_permissions = isFirefox
      ? {}
      : { host_permissions: ['*://poe.ninja/*'] }

const browser_specific_settings = isFirefox ? {
      browser_specific_settings: {
        gecko: {
          id: 'better-trading@example.com',
          strict_min_version: '109.0',
        },
      },
    } : {}
const merged = {...host_permissions, ...browser_specific_settings}

const manifest = Object.assign(
  {
    version: packageJson.version,
    manifest_version: 2,
    content_scripts: [
      {
        matches: ['*://www.pathofexile.com/trade*', '*://pathofexile.com/trade*'],
        js: [assetsPathFor('vendor.js'), assetsPathFor('better-trading.js')],
        css: [assetsPathFor('vendor.css'), assetsPathFor('better-trading.css')],
      },
    ],
    // 🔄 Use MV2-style background for Firefox
    background: isFirefox
      ? {
          scripts: ['background.js'], // classic background page for Firefox
        }
      : {
          service_worker: 'background.js', // MV3 for Chrome
        },
    permissions: [
      'storage',
      ...(isFirefox ? ['*://poe.ninja/*'] : []),  
      ],
    web_accessible_resources: [assetsPathFor('images/*')],
    icons: {
      16: 'icon16.png',
      48: 'icon48.png',
      64: 'icon64.png',
      128: 'icon128.png',
    },
    ...merged,
  },
  packageJson.manifest
);

fs.mkdirSync(outputDir, {recursive: true});
for (const file of fs.readdirSync('./extension')) {
  fs.copyFileSync(path.join('./extension', file), path.join(outputDir, file));
}
fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

