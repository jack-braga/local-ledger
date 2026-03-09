import sharp from 'sharp';

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
];

for (const { name, size } of sizes) {
  await sharp('public/localLedgerLogo.png')
    .resize(size, size)
    .toFile(`public/${name}`);
  console.log(`Generated public/${name}`);
}
