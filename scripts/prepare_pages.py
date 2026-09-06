#!/usr/bin/env python3
"""Stage a self-contained Pages artifact with direct routes and exact file identity."""
from __future__ import annotations

import argparse
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import unquote, urlsplit

import release

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = 'floraria.fasl-work.com'
CSP = ("default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; "
       "worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; "
       "object-src 'none'; base-uri 'self'; form-action 'none'")


class ResourceCheck(HTMLParser):
    def __init__(self, directory: Path):
        super().__init__()
        self.directory = directory

    def handle_starttag(self, tag, pairs):
        attributes = dict(pairs)
        if tag == 'base' or any(name.lower().startswith('on') for name in attributes):
            raise RuntimeError('Base elements and inline event handlers are forbidden in the Pages entry.')
        if tag == 'meta' and attributes.get('http-equiv', '').lower() == 'content-security-policy':
            raise RuntimeError('Entry already contains a CSP; consolidate it in prepare_pages.py.')
        field = 'src' if tag in {'script', 'img', 'iframe', 'audio', 'video', 'source'} else 'href' if tag == 'link' else None
        if tag == 'script' and not attributes.get('src'):
            raise RuntimeError('Inline scripts are forbidden in the Pages entry.')
        if field and attributes.get(field):
            value = attributes[field]
            parsed = urlsplit(value)
            if parsed.scheme or parsed.netloc or not value.startswith('/') or value.startswith('//'):
                raise RuntimeError('Entry resources must be same-origin, root-relative built files.')
            parts = Path(unquote(parsed.path).lstrip('/')).parts
            if '..' in parts or '\\' in value:
                raise RuntimeError('Invalid resource path in Pages entry.')
            target = self.directory.joinpath(*parts)
            if not target.is_file() or target.is_symlink():
                raise RuntimeError('Entry references a missing or linked built resource.')


def route_list(path: Path) -> list[str]:
    routes = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(routes, list) or not all(isinstance(route, str) for route in routes) or len(routes) != len(set(routes)):
        raise RuntimeError('Pages routes must be a unique list.')
    if any(not isinstance(route, str) or not re.fullmatch(r'/[a-z][a-z0-9-]*', route) for route in routes):
        raise RuntimeError('Pages routes must be simple lowercase absolute paths.')
    return routes


def public_files(directory: Path) -> None:
    release.tree_manifest(directory)
    for path in directory.rglob('*'):
        if not path.is_file():
            continue
        if any(part.startswith('.') for part in path.relative_to(directory).parts) or path.suffix.lower() in {'.pem', '.key', '.p12'}:
            raise RuntimeError('Private or hidden path in the Pages artifact.')
        if path.suffix == '.css':
            css = path.read_text(encoding='utf-8')
            for value in re.findall(r'url\(\s*[\"\']?([^\s\"\')]+)', css):
                if value.startswith('//') or urlsplit(value).scheme not in {'', 'data'}:
                    raise RuntimeError('Stylesheet contains a foreign runtime resource.')
            if re.search(r'@import\s+[\"\']', css):
                raise RuntimeError('Unbundled stylesheet imports are forbidden.')


def prepare(*, revision: str | None = None, require_clean: bool = False) -> dict:
    source = ROOT / 'frontend/dist'
    output = ROOT / 'build/pages'
    # Check the literal destination and all existing parents before any recursive cleanup.
    if output.is_symlink() or (ROOT / 'build').is_symlink() or output.resolve() != ROOT.resolve() / 'build/pages':
        raise RuntimeError('Pages output must remain inside the real repository build/pages directory.')
    if source.is_symlink() or source.resolve() != ROOT.resolve() / 'frontend/dist':
        raise RuntimeError('Pages input must be the real frontend/dist directory.')
    public_files(source)
    routes = route_list(ROOT / 'deploy/pages-routes.json')
    head = release.git('rev-parse', 'HEAD')
    source_clean = release.clean()
    if revision is not None and (not release.SHA.fullmatch(revision) or revision != head):
        raise RuntimeError('Requested revision must match exact current HEAD.')
    if require_clean and (revision is None or not source_clean):
        raise RuntimeError('Publishing requires an explicit exact revision and a clean source tree.')
    build_identity = json.loads((source / 'release.json').read_text(encoding='utf-8'))
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    if any(build_identity.get(key) != expected for key, expected in
           [('product', 'FLORARIA'), ('revision', head), ('version', version)]):
        raise RuntimeError('Build identity is stale or unrelated. Rebuild this source revision before staging Pages.')
    html = (source / 'index.html').read_text(encoding='utf-8')
    ResourceCheck(source).feed(html)
    head_tag = re.search(r'<head\b[^>]*>', html, re.I)
    if not head_tag:
        raise RuntimeError('Built HTML is missing its head element.')
    policy = f'\n    <meta http-equiv="Content-Security-Policy" content="{escape(CSP, quote=True)}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />'
    html = html[:head_tag.end()] + policy + html[head_tag.end():]
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(source, output)
    (output / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    for route in routes:
        directory = output / route.lstrip('/')
        directory.mkdir(parents=True, exist_ok=True)
        (directory / 'index.html').write_text(html, encoding='utf-8', newline='\n')
    # Unknown routes can display the application, while retaining a truthful HTTP 404.
    (output / '404.html').write_text(html, encoding='utf-8', newline='\n')
    public_files(output)
    files = release.tree_manifest(output)
    metadata = release.release_metadata(head, files, source_clean)
    metadata['hosting'] = {'provider': 'github-pages', 'domain': DOMAIN, 'routes': ['/', *routes], 'csp_delivery': 'html-meta'}
    (output / 'release.json').write_text(json.dumps(metadata, indent=2, sort_keys=True) + '\n', encoding='utf-8', newline='\n')
    receipt = {key: metadata[key] for key in ('revision', 'source_clean', 'release_id', 'artifact_tree_sha256', 'hosting')}
    (ROOT / 'build/pages-build-receipt.json').write_text(json.dumps(receipt, indent=2, sort_keys=True) + '\n', encoding='utf-8', newline='\n')
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', help='Exact current 40-character Git HEAD; required for publishing.')
    parser.add_argument('--require-clean', action='store_true', help='Reject local preview/dirty source before staging.')
    options = parser.parse_args()
    print(json.dumps(prepare(revision=options.revision, require_clean=options.require_clean), indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, ValueError) as error:
        print(f'Pages preparation failed: {error}', file=sys.stderr)
        raise SystemExit(1)
