// docs/diagrams/*.mmd (Mermaid) を Pele (https://pele.run) で docs/diagrams/*.svg に変換する。
// 使い方: npm install --no-save pele && node scripts/render-diagrams.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from 'pele';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'diagrams');
const fontFamily = '"Yu Gothic UI","Hiragino Sans","Noto Sans JP",sans-serif';

// Node には canvas がないため、日本語（全角）を幅1em・半角を約0.6emとして測る
const measurer = {
  width: (text, size, style) => [...text].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 1 : 0.6) * size * (style & 1 ? 1.05 : 1), 0)
};

for (const file of readdirSync(dir).filter(f => f.endsWith('.mmd')).sort()) {
  const { svg, width, height } = render(readFileSync(join(dir, file), 'utf8'), { fontFamily, measurer, maxWidth: 1000, padding: 12 });
  // ダークテーマの画面でも読めるよう、背景を白で固定する
  const out = svg.replace('style="max-width:100%', 'style="background:#fff;max-width:100%');
  writeFileSync(join(dir, file.replace(/\.mmd$/, '.svg')), out);
  console.log(`${file} -> ${width}x${height}`);
}
