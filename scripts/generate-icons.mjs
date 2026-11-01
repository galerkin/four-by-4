import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

await mkdir('public/icons', { recursive: true })
// The OS applies the icon mask. Keep all image corners opaque for maskable icons.
const svg = (await readFile('public/favicon.svg', 'utf8')).replace('rx="116"', '')
for (const [size, path] of [[192, 'public/icons/icon-192.png'], [512, 'public/icons/icon-512.png'], [180, 'public/apple-touch-icon.png']]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path)
}
console.log('Generated PWA and Apple touch icons.')
