#!/usr/bin/env python3
"""Deterministic living-scene content export; historical microscopic atlas stays intact."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.parse import urlsplit

_spec = importlib.util.spec_from_file_location('floraria_living_validation', Path(__file__).with_name('micro.py'))
_micro = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_micro)
encoded, read, local, text, records, require = (_micro.encoded, _micro.read, _micro.local, _micro.text, _micro.records, _micro.require)

ROOT = Path(__file__).resolve().parents[1]
CHAIN = ['sunflower-ray', 'sunflower-ray-mesophyll', 'sunflower-ray-cell', 'sunflower-chromoplast']
DEPTHS = ['organ', 'tissue', 'cell', 'organelle']


def validate(value):
    require(isinstance(value, dict) and value.get('schemaVersion') == 1 and value.get('evidence') == 'illustrated', 'living schema')
    sources = records(value.get('sources'), 1, 20)
    for source in sources.values():
        text(source.get('label')); text(source.get('citation'))
        url = urlsplit(text(source.get('url')))
        require(url.scheme == 'https' and url.hostname and not url.username and not url.password, 'living source URL')
    nodes = records(value.get('nodes'), 4, 4)
    require(set(nodes) == set(CHAIN), 'complete sunflower path')
    for index, identifier in enumerate(CHAIN):
        node = nodes[identifier]
        require(node.get('depth') == DEPTHS[index], 'ordered depth')
        require(node.get('parentId') == (CHAIN[index-1] if index else None), 'parent identity')
        require(node.get('children') == (CHAIN[index+1:index+2]), 'child identity')
        for key in ('label', 'summary', 'detail'): local(node.get(key))
        ids = node.get('sourceIds')
        require(isinstance(ids, list) and ids and all(isinstance(i, str) for i in ids) and len(set(ids)) == len(ids) and all(i in sources for i in ids), 'source references')
    return value


def build(source: Path, output: Path):
    value = validate(read(source))
    payload = encoded(value)
    integrity = {'schemaVersion': 1, 'artifact': 'living-content.json', 'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(), 'counts': {'nodes': len(value['nodes']), 'sources': len(value['sources'])}}
    return payload, encoded(integrity)


def run(root: Path, action: str):
    payload, integrity = build(root/'data/sources/living-content.json', root/'data/artifacts')
    for name, data in {'living-content.json': payload, 'living-content.integrity.json': integrity}.items():
        path = root/'data/artifacts'/name
        if action == 'export':
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        elif action == 'verify':
            require(path.read_bytes() == data, 'living artifact mismatch: '+name)
        else:
            raise ValueError('Unknown living action')
    return json.loads(integrity)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['build', 'verify'])
    parser.add_argument('--source', type=Path, default=ROOT/'data/sources/living-content.json')
    parser.add_argument('--output', type=Path, default=ROOT/'data/artifacts')
    options = parser.parse_args()
    payload, integrity = build(options.source, options.output)
    files = {'living-content.json': payload, 'living-content.integrity.json': integrity}
    if options.command == 'build':
        options.output.mkdir(parents=True, exist_ok=True)
        for name, data in files.items(): (options.output/name).write_bytes(data)
    else:
        for name, data in files.items():
            require((options.output/name).read_bytes() == data, 'living artifact mismatch: '+name)
    print(json.dumps({'livingContent': 'verified', **json.loads(integrity)['counts']}))


if __name__ == '__main__': main()
