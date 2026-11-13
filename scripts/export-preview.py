"""Bundle the existing game and responsive shell into a portable solo preview."""
import base64
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
asset_root = root / 'public/assets/table-v2'
assets = {}
for p in asset_root.rglob('*'):
    if p.is_file() and p.suffix in ('.webp', '.ttf', '.svg'):
        mime = {'.webp':'image/webp', '.ttf':'font/ttf', '.svg':'image/svg+xml'}[p.suffix]
        assets['/assets/table-v2/'+p.relative_to(asset_root).as_posix()] = [mime,base64.b64encode(p.read_bytes()).decode()]
game = (root/'index.html').read_text()
for name in ('ui-v2.css', 'court-dealers.css', 'room-chat.css'):
    game = game.replace(f'<link rel="stylesheet" href="/{name}">','<style>'+(root/name).read_text()+'</style>')
for name in ('ui-v2.js', 'court-dealers.js', 'poker-ai.js', 'chat-policy.js'):
    game = game.replace(f'<script src="/{name}"></script>','<script>'+(root/name).read_text()+'</script>')
game = game.replace("const asset = name => '/assets/table-v2/' + name;", "const asset = name => parent.__HOLDM_ASSETS['/assets/table-v2/' + name];")
shell = (root/'play.html').read_text()
code = (root/'orientation-shell.js').read_text().replace("frame.src = '/game.html' + location.search + location.hash;", 'frame.srcdoc = window.__HOLDM_DOCUMENT;')
boot = 'const raw='+json.dumps(assets)+';window.__HOLDM_ASSETS={};for(const [path,[mime,b64]] of Object.entries(raw)){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));window.__HOLDM_ASSETS[path]=URL.createObjectURL(new Blob([bytes],{type:mime}));}\n'
boot += 'let game='+json.dumps(game,ensure_ascii=False).replace('</','<\\/')+';for(const [path,url] of Object.entries(__HOLDM_ASSETS)){game=game.split(path).join(url);}window.__HOLDM_DOCUMENT=game;\n'
shell = shell.replace('<script src="/orientation-shell.js"></script>', '<script>'+boot+code+'</script>')
out=root/'artifacts/holdm-preview.html'
out.write_text(shell)
print(f'{out}: {out.stat().st_size:,} bytes')
