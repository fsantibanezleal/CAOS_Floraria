"""Spatial atlas source graph, provenance, and deterministic release contract."""
from __future__ import annotations

import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('spatial_pipeline', ROOT / 'data-pipeline/spatial.py')
assert SPEC and SPEC.loader
spatial = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(spatial)


def source() -> dict:
    return json.loads((ROOT / 'data/sources/spatial-atlas.json').read_text(encoding='utf-8'))


class SpatialAtlasTests(unittest.TestCase):
    def test_all_regions_have_distinct_sourced_primary_and_alternative_paths(self):
        graph = spatial.validate(source())
        self.assertEqual(len(graph['nodes']), 57)
        self.assertEqual(len(graph['regions']), 8)
        self.assertGreaterEqual(len(set(graph['alternateTriggers'].values())), 6)
        self.assertGreaterEqual(len(graph['parts']), 24)
        nodes = {node['id']: node for node in graph['nodes']}
        for region in graph['regions']:
            self.assertEqual([nodes[f'{region}-{i}']['depth'] for i in range(4)], list(range(4)))
            self.assertEqual([nodes[f'{region}-alt-{i}']['depth'] for i in range(1, 4)], [1, 2, 3])
            self.assertNotEqual(nodes[f'{region}-2']['body'], nodes[f'{region}-alt-2']['body'])
            self.assertNotEqual(nodes[f'{region}-3']['label'], nodes[f'{region}-alt-3']['label'])

    def test_artifacts_are_exact_and_tampering_or_missing_sources_fail(self):
        self.assertEqual(spatial.run('verify', ROOT / 'data/sources/spatial-atlas.json', ROOT / 'data/artifacts')['nodes'], 57)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            spatial.run('build', ROOT / 'data/sources/spatial-atlas.json', output)
            spatial.run('verify', ROOT / 'data/sources/spatial-atlas.json', output)
            (output / 'spatial-atlas.json').write_bytes((output / 'spatial-atlas.json').read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'artifact mismatch'):
                spatial.run('verify', ROOT / 'data/sources/spatial-atlas.json', output)
        bad = copy.deepcopy(source())
        bad['regions'][3]['sourceIds'] = ['unknown']
        with self.assertRaisesRegex(ValueError, 'region references'):
            spatial.validate(bad)

    def test_root_hair_and_root_vessel_are_not_the_same_cell(self):
        nodes = {node['id']: node for node in spatial.validate(source())['nodes']}
        self.assertIn('Root-hair', nodes['root-2']['label']['en'])
        self.assertIn('xylem vessel', nodes['root-alt-2']['label']['en'])
        self.assertIn('not a seed', nodes['pistil-3']['body']['en'].lower())


if __name__ == '__main__':
    unittest.main()
