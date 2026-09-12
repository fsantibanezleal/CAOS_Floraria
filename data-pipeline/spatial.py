#!/usr/bin/env python3
"""Validate the sourced spatial plant graph and export deterministic browser artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
REGIONS = ('root', 'stem', 'branch', 'leaf', 'sepal', 'petal', 'stamen', 'pistil')


def require(ok: bool, message: str) -> None:
    if not ok:
        raise ValueError('Spatial atlas: ' + message)


def export_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode('utf-8')


def validate(value: object) -> dict:
    require(isinstance(value, dict), 'source must be an object')
    require(value.get('schemaVersion') == 1 and value.get('representation') == 'authored-schematic', 'schema/representation')
    sources = value.get('sources')
    require(isinstance(sources, list) and 5 <= len(sources) <= 20, 'source count')
    source_ids = set()
    for source in sources:
        require(isinstance(source, dict), 'source record')
        sid = source.get('id')
        require(isinstance(sid, str) and sid and sid not in source_ids, 'source id')
        source_ids.add(sid)
        require(isinstance(source.get('label'), str) and source['label'].strip(), 'source label')
        url = urlsplit(source.get('url', ''))
        require(url.scheme == 'https' and url.hostname and not url.username and not url.password, 'source URL')
    regions = value.get('regions')
    require(isinstance(regions, list) and len(regions) == len(REGIONS), 'region count')
    require(tuple(item.get('id') for item in regions) == REGIONS, 'region identity/order')
    alternates = value.get('alternateRoutes')
    require(isinstance(alternates, list) and len(alternates) == len(REGIONS), 'alternate route count')
    require(tuple(item.get('region') for item in alternates) == REGIONS, 'alternate route identity/order')
    part_notes = value.get('partNotes')
    require(isinstance(part_notes, list) and len(part_notes) >= 3 * len(REGIONS), 'part note coverage')
    part_keys = set()
    for note in part_notes:
        require(isinstance(note, dict) and note.get('region') in REGIONS, 'part region')
        key = (note['region'], note.get('id'))
        require(isinstance(key[1], str) and key[1].replace('-', '').isalpha() and key not in part_keys, 'part identity')
        part_keys.add(key)
        for field in ('en', 'es', 'bodyEn', 'bodyEs'):
            text = note.get(field)
            require(isinstance(text, str) and len(text.strip()) >= (8 if field.startswith('body') else 2), 'part text')
    require(all(sum(item['region'] == region for item in part_notes) >= 3 for region in REGIONS), 'per-region part notes')
    nodes = []
    for region in regions:
        refs = region.get('sourceIds')
        require(isinstance(refs, list) and refs and len(set(refs)) == len(refs) and set(refs) <= source_ids, 'region references')
        levels = region.get('levels')
        require(isinstance(levels, list) and len(levels) == 4, 'four scales per region')
        for depth, level in enumerate(levels):
            require(isinstance(level, dict), 'level record')
            for field in ('en', 'es', 'bodyEn', 'bodyEs'):
                text = level.get(field)
                minimum = 8 if field.startswith('body') else 2
                require(isinstance(text, str) and minimum <= len(text.strip()) <= 900 and 'TODO' not in text, f'{region["id"]}.{depth}.{field}')
            nodes.append({'id': f'{region["id"]}-{depth}', 'region': region['id'], 'depth': depth,
                          'parentId': f'{region["id"]}-{depth-1}' if depth else 'plant',
                          'childId': f'{region["id"]}-{depth+1}' if depth < 3 else None,
                          'label': {'en': level['en'], 'es': level['es']},
                          'body': {'en': level['bodyEn'], 'es': level['bodyEs']},
                          'sourceIds': refs})
    for route in alternates:
        region = route['region']
        trigger = route.get('trigger')
        require(isinstance(trigger, str) and trigger.replace('-', '').isalpha(), 'alternate trigger')
        levels = route.get('levels')
        require(isinstance(levels, list) and len(levels) == 3, 'alternate levels')
        refs = next(item['sourceIds'] for item in regions if item['id'] == region)
        for index, level in enumerate(levels, 1):
            for field in ('en', 'es', 'bodyEn', 'bodyEs'):
                item = level.get(field)
                require(isinstance(item, str) and len(item.strip()) >= (8 if field.startswith('body') else 2), 'alternate text')
            nodes.append({'id': f'{region}-alt-{index}', 'region': region, 'depth': index, 'route': 'alternate',
                          'parentId': f'{region}-alt-{index-1}' if index > 1 else f'{region}-0',
                          'childId': f'{region}-alt-{index+1}' if index < 3 else None,
                          'label': {'en': level['en'], 'es': level['es']},
                          'body': {'en': level['bodyEn'], 'es': level['bodyEs']}, 'sourceIds': refs})
    return {'schemaVersion': 1, 'representation': 'authored-schematic',
            'sources': sources, 'regions': list(REGIONS),
            'alternateTriggers': {item['region']: item['trigger'] for item in alternates},
            'parts': [{'region': note['region'], 'id': note['id'],
                       'label': {'en': note['en'], 'es': note['es']},
                       'body': {'en': note['bodyEn'], 'es': note['bodyEs']},
                       'sourceIds': next(item['sourceIds'] for item in regions if item['id'] == note['region'])}
                      for note in part_notes],
            'nodes': [{'id': 'plant', 'region': None, 'depth': -1, 'parentId': None,
                       'childId': None, 'label': {'en': 'A flowering plant', 'es': 'Una planta con flor'},
                       'body': {'en': 'Move through a connected, schematic plant. Aim at any organ and scroll inward to reveal its own anatomy.',
                                'es': 'Explora una planta esquemática conectada. Apunta a cualquier órgano y acércate para revelar su anatomía.'},
                       'sourceIds': ['plant-body']}] + nodes}


def run(command: str, source: Path, output: Path) -> dict:
    graph = validate(json.loads(source.read_text(encoding='utf-8-sig')))
    payload = export_bytes(graph)
    integrity = export_bytes({'schemaVersion': 1, 'artifact': 'spatial-atlas.json',
                              'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
                              'counts': {'regions': len(REGIONS), 'nodes': len(graph['nodes'])}})
    files = {'spatial-atlas.json': payload, 'spatial-atlas.integrity.json': integrity}
    if command == 'build':
        output.mkdir(parents=True, exist_ok=True)
        for name, data in files.items():
            (output / name).write_bytes(data)
    else:
        for name, data in files.items():
            require((output / name).read_bytes() == data, 'artifact mismatch: ' + name)
    return {'regions': len(REGIONS), 'nodes': len(graph['nodes'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('build', 'verify'))
    parser.add_argument('--source', type=Path, default=ROOT / 'data/sources/spatial-atlas.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'data/artifacts')
    args = parser.parse_args()
    print(json.dumps(run(args.command, args.source, args.output)))
