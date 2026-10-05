"""Rebuild reviewed NW scans. Requires Python Pillow and official Poppler pdftoppm.
Usage: python scripts/nw-import/import.py --pdf-dir /path/to/official-pdfs
Missing PDFs are downloaded from the recorded IPA URL. SHA256 must match.
"""
import argparse,hashlib,json,subprocess,tempfile,urllib.request
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
p=argparse.ArgumentParser();p.add_argument('--pdf-dir',type=Path,required=True);p.add_argument('--pdftoppm',default='pdftoppm');args=p.parse_args()
args.pdf_dir.mkdir(parents=True,exist_ok=True)
sources=json.loads((HERE/'sources.json').read_text(encoding='utf-8'))
records=json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
assets=ROOT/'public/nw-assets';assets.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='nw-render-') as scratch:
 pages=Path(scratch)
 for s in sources:
  file=args.pdf_dir/s['url'].split('/')[-1]
  if not file.exists():urllib.request.urlretrieve(s['url'],file)
  if hashlib.sha256(file.read_bytes()).hexdigest()!=s['sha256']:raise ValueError(f'Official PDF changed; review before import: {file.name}')
  subprocess.run([args.pdftoppm,'-scale-to','1800','-png',str(file),str(pages/file.stem)],check=True)
 for q in records:
  for i,url in enumerate(q['images']):
   crop=q.get('crop');im=Image.open(pages/(crop['file'] if crop else q['pageFiles'][i]))
   if crop:im=im.crop((95,crop['top'],im.width-90,crop['bottom']))
   im.save(assets/Path(url).name,'WEBP',lossless=True)
  if q.get('answerImages'):
   source=next(s for s in sources if s['year']==q['year'] and s['part']==q['part'] and s['kind']=='answer')
   stem=Path(source['url']).stem
   for page,url in zip(q['answerPages'],q['answerImages']):Image.open(pages/f'{stem}-{page}.png').save(assets/Path(url).name,'WEBP',lossless=True)
  q['assetSha256']=[hashlib.sha256((assets/Path(a).name).read_bytes()).hexdigest() for a in q['images']]
  if q.get('answerImages'):q['answerSha256']=[hashlib.sha256((assets/Path(a).name).read_bytes()).hexdigest() for a in q['answerImages']]
  q.pop('crop',None);q.pop('pageFiles',None)
(ROOT/'lib/content/nw-content.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Rebuilt {len(records)} reviewed questions; run npm test and visual QA.')
