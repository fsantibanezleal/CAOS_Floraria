#!/usr/bin/env python3
"""Validate and deterministically export authored microscopic teaching content."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

MAX_BYTES = 1_000_000
BRANCHES = {'petal', 'stem', 'anther', 'ovary'}
STRUCTURES = {'petal': {'petal'}, 'stem': {'stem'}, 'anther': {'anther', 'pollen'},
              'ovary': {'ovary', 'ovule', 'seed'}}
DEPTHS = {'organ': 0, 'tissue': 1, 'cell': 2, 'organelle': 3}
KINDS = {'organ', 'tissue', 'structure', 'cell', 'cell-group', 'gametophyte',
         'organelle', 'organelle-group', 'membrane', 'wall', 'space'}


def require(condition, message):
    if not condition:
        raise ValueError('Invalid micro atlas: ' + message)


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode('utf-8')


def read(path):
    with path.open('rb') as stream:
        data = stream.read(MAX_BYTES + 1)
    require(len(data) <= MAX_BYTES, 'size ceiling')
    return json.loads(data.decode('utf-8-sig'))


def text(value):
    require(isinstance(value, str) and 0 < len(value.strip()) <= 3000, 'nonempty bounded text')
    return value


def local(value):
    require(isinstance(value, dict) and set(value) == {'en', 'es'}, 'English and Spanish required')
    for item in value.values():
        text(item)


def identifier(value):
    require(isinstance(value, str) and re.fullmatch(r'[a-z][a-z0-9-]{0,63}', value), 'identifier')
    return value


def records(value, minimum, maximum):
    require(isinstance(value, list) and minimum <= len(value) <= maximum, 'record count')
    require(all(isinstance(item, dict) for item in value), 'record shape')
    ids = [identifier(item.get('id')) for item in value]
    require(len(ids) == len(set(ids)), 'duplicate identifier')
    return {item['id']: item for item in value}


def validate(value):
    require(isinstance(value, dict) and value.get('schemaVersion') == 1
            and value.get('evidence') == 'illustrated', 'schema and illustration boundary')
    sources = records(value.get('sources'), 1, 40)
    for source in sources.values():
        text(source.get('label')); text(source.get('citation'))
        url = urlsplit(text(source.get('url')))
        require(url.scheme in {'https', 'http'} and url.hostname and not url.username
                and not url.password, 'source URL')
    branches = records(value.get('branches'), 4, 4)
    require(set(branches) == BRANCHES, 'known branches')
    for branch in branches.values():
        for key in ('label', 'question', 'process'):
            local(branch.get(key))
        require(branch.get('rootId') == branch['id'], 'branch root')
        require(isinstance(branch.get('structureIds'), list) and 1 <= len(branch['structureIds']) <= 4
                and all(isinstance(x, str) and x in STRUCTURES[branch['id']]
                        for x in branch['structureIds'])
                and len(set(branch['structureIds'])) == len(branch['structureIds']), 'structure mapping')
        for key, count in (('assumptions', 2), ('stages', 4)):
            require(isinstance(branch.get(key), list) and len(branch[key]) == count, key)
        for assumption in branch['assumptions']:
            local(assumption)
        for stage in branch['stages']:
            require(isinstance(stage, dict), 'stage object')
            local(stage.get('title')); local(stage.get('body'))
    nodes = records(value.get('nodes'), 24, 64)
    for node in nodes.values():
        require(isinstance(node.get('branch'), str) and node['branch'] in BRANCHES
                and isinstance(node.get('depth'), str) and node['depth'] in DEPTHS
                and isinstance(node.get('kind'), str) and node['kind'] in KINDS
                and node.get('evidence') == 'illustrated', 'node taxonomy')
        for key in ('label', 'summary', 'detail', 'scaleLabel'):
            local(node.get(key))
        source_ids = node.get('sourceIds')
        require(isinstance(source_ids, list) and 1 <= len(source_ids) <= 8
                and all(isinstance(x, str) and x in sources for x in source_ids)
                and len(set(source_ids)) == len(source_ids), 'source references')
        children = node.get('children')
        require(isinstance(children, list) and len(children) <= 16
                and all(isinstance(x, str) and x in nodes for x in children)
                and len(set(children)) == len(children), 'children')
        parent = node.get('parentId')
        if node['id'] == node['branch']:
            require(parent is None and node['depth'] == 'organ', 'root node')
        else:
            require(isinstance(parent, str) and parent in nodes, 'parent')
            require(nodes[parent]['branch'] == node['branch'] and node['id'] in nodes[parent]['children'], 'reciprocal parent')
            require(DEPTHS[node['depth']] >= DEPTHS[nodes[parent]['depth']], 'depth order')
        for child in children:
            require(nodes[child]['parentId'] == node['id'] and nodes[child]['branch'] == node['branch'], 'reciprocal child')
    seen, active = set(), set()

    def visit(node_id):
        require(node_id not in active, 'cycle')
        require(node_id not in seen, 'multiple ancestry')
        active.add(node_id); seen.add(node_id)
        for child in nodes[node_id]['children']:
            visit(child)
        active.remove(node_id)

    for branch in BRANCHES:
        require(branch in nodes, 'missing root')
        visit(branch)
        require({n['depth'] for n in nodes.values() if n['branch'] == branch} == set(DEPTHS), 'all depths required')
    require(seen == set(nodes), 'unreachable node')
    return value


def run(root, action):
    source = root / 'data/sources/micro-atlas.json'
    value = validate(read(source))
    payload = encoded(value)
    digest = hashlib.sha256(payload).hexdigest()
    integrity = {'schemaVersion': 1, 'artifact': 'micro-atlas.json', 'bytes': len(payload),
                 'sha256': digest, 'source': {'path': 'data/sources/micro-atlas.json', 'sha256': digest},
                 'counts': {key: len(value[key]) for key in ('nodes', 'branches', 'sources')}}
    artifact = root / 'data/artifacts/micro-atlas.json'
    receipt = root / 'data/artifacts/micro-atlas.integrity.json'
    if action == 'export':
        artifact.parent.mkdir(parents=True, exist_ok=True)
        artifact.write_bytes(payload)
        receipt.write_bytes(encoded(integrity))
    elif action == 'verify':
        for path, expected in ((artifact, payload), (receipt, encoded(integrity))):
            with path.open('rb') as stream:
                actual = stream.read(MAX_BYTES + 1)
            require(actual == expected, 'stale or corrupted artifact: ' + path.name)
    else:
        raise ValueError('Unknown micro action')
    return integrity


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['export', 'verify'])
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    print(json.dumps(run(args.root.resolve(), args.action), sort_keys=True))
