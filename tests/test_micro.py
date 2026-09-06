"""Meaningful microscopic-content topology, integrity and biological-boundary regressions."""
import copy
import importlib.util
import json
import os
import re
import shutil
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('floraria_micro', ROOT / 'data-pipeline/micro.py')
MICRO = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MICRO)


class MicroTests(unittest.TestCase):
    def setUp(self):
        self.atlas = json.loads((ROOT / 'data/sources/micro-atlas.json').read_text(encoding='utf-8'))

    def test_all_branches_have_distinct_depths_and_only_illustrated_evidence(self):
        MICRO.validate(self.atlas)
        self.assertEqual(len(self.atlas['nodes']), 34)
        self.assertEqual({n['evidence'] for n in self.atlas['nodes']}, {'illustrated'})

    def test_gametophytes_are_not_misclassified_as_single_cells(self):
        nodes = {n['id']: n for n in self.atlas['nodes']}
        self.assertEqual(nodes['anther-pollen']['kind'], 'gametophyte')
        self.assertEqual(nodes['ovary-embryo-sac']['kind'], 'gametophyte')
        self.assertEqual(nodes['anther-exine']['kind'], 'wall')
        self.assertEqual(nodes['stem-lumen']['kind'], 'space')
        self.assertIn('dead', nodes['stem-vessel']['summary']['en'])

    def test_spanish_utf8_survives_without_replacement_characters(self):
        payload = json.dumps(self.atlas, ensure_ascii=False)
        self.assertIn('Núcleos polares', payload)
        self.assertIn('célula', payload)
        self.assertNotIn('\ufffd', payload)
        self.assertIsNone(re.search(r'[A-Za-z]\?[A-Za-z]', payload))

    def test_unhashable_taxonomy_references_and_wrong_structure_mapping_fail_cleanly(self):
        for key in ('sourceIds', 'branch', 'depth', 'kind'):
            bad = copy.deepcopy(self.atlas)
            bad['nodes'][1][key] = [{}] if key == 'sourceIds' else {}
            with self.assertRaises(ValueError): MICRO.validate(bad)
        self.atlas['branches'][0]['structureIds'] = ['stem']
        with self.assertRaises(ValueError): MICRO.validate(self.atlas)

    def test_canonical_verifier_checks_micro_without_changing_legacy_manifest(self):
        spec = importlib.util.spec_from_file_location('micro_pipeline_integration', ROOT / 'data-pipeline/run.py')
        pipeline = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pipeline)
        base = 'E:/_Temp' if os.name == 'nt' and Path('E:/_Temp').is_dir() else None
        with tempfile.TemporaryDirectory(prefix='floraria-micro-integration-', dir=base) as directory:
            sandbox = Path(directory)
            for folder in ('data/sources', 'data/artifacts', 'manifests'):
                shutil.copytree(ROOT / folder, sandbox / folder)
            manifest = (sandbox / 'manifests/catalog.json').read_bytes()
            pipeline.run(sandbox, 'verify', offline=True)
            self.assertEqual(manifest, (sandbox / 'manifests/catalog.json').read_bytes())
            artifact = sandbox / 'data/artifacts/micro-atlas.json'
            payload = artifact.read_bytes()
            artifact.write_bytes(payload + b' ')
            with self.assertRaisesRegex(pipeline.PipelineError, 'Microscopic'):
                pipeline.run(sandbox, 'verify', offline=True)
            artifact.write_bytes(payload)
            unexpected = sandbox / 'data/artifacts/micro-unapproved.json'
            unexpected.write_text('{}')
            with self.assertRaisesRegex(pipeline.PipelineError, 'Unexpected'):
                pipeline.run(sandbox, 'verify', offline=True)
            unexpected.unlink()
            (sandbox / 'data/artifacts/micro-atlas.integrity.json').unlink()
            with self.assertRaisesRegex(pipeline.PipelineError, 'missing'):
                pipeline.run(sandbox, 'verify', offline=True)

    def test_missing_translation_fails(self):
        del self.atlas['nodes'][2]['detail']['es']
        with self.assertRaises(ValueError): MICRO.validate(self.atlas)

    def test_source_reference_and_url_fail(self):
        for change in ('source', 'url'):
            bad = copy.deepcopy(self.atlas)
            if change == 'source': bad['nodes'][1]['sourceIds'] = ['unknown']
            else: bad['sources'][0]['url'] = 'javascript:alert(1)'
            with self.assertRaises(ValueError): MICRO.validate(bad)

    def test_scan_evidence_cannot_be_assigned_to_authored_tissue(self):
        self.atlas['nodes'][1]['evidence'] = 'observed'
        with self.assertRaises(ValueError): MICRO.validate(self.atlas)

    def test_duplicate_nodes_fail(self):
        self.atlas['nodes'][1]['id'] = self.atlas['nodes'][0]['id']
        with self.assertRaises(ValueError): MICRO.validate(self.atlas)

    def test_cross_branch_links_and_orphans_fail(self):
        for parent in ('stem', 'unknown', None):
            bad = copy.deepcopy(self.atlas)
            bad['nodes'][1]['parentId'] = parent
            with self.assertRaises(ValueError): MICRO.validate(bad)

    def test_detached_reciprocal_cycle_fails(self):
        nodes = {n['id']: n for n in self.atlas['nodes']}
        a, b = nodes['petal-nucleus'], nodes['petal-wall']
        nodes['petal-papilla']['children'].remove(a['id'])
        nodes['petal-papilla']['children'].remove(b['id'])
        a['parentId'], a['children'] = b['id'], [b['id']]
        b['parentId'], b['children'] = a['id'], [a['id']]
        with self.assertRaisesRegex(ValueError, 'unreachable'): MICRO.validate(self.atlas)

    def test_export_is_deterministic_and_verify_detects_source_and_artifact_changes(self):
        base = 'E:/_Temp' if os.name == 'nt' and Path('E:/_Temp').is_dir() else None
        with tempfile.TemporaryDirectory(prefix='floraria-micro-', dir=base) as directory:
            sandbox = Path(directory)
            source = sandbox / 'data/sources/micro-atlas.json'
            source.parent.mkdir(parents=True)
            source.write_bytes(MICRO.encoded(self.atlas))
            first = MICRO.run(sandbox, 'export')
            source.write_bytes(source.read_bytes().replace(b'\n', b'\r\n'))
            self.assertEqual(first, MICRO.run(sandbox, 'export'))
            self.assertEqual(first, MICRO.run(sandbox, 'verify'))
            artifact = sandbox / 'data/artifacts/micro-atlas.json'
            artifact.write_bytes(artifact.read_bytes() + b' ')
            with self.assertRaisesRegex(ValueError, 'corrupted'): MICRO.run(sandbox, 'verify')
            MICRO.run(sandbox, 'export')
            changed = copy.deepcopy(self.atlas)
            changed['nodes'][1]['summary']['en'] += ' Updated.'
            source.write_bytes(MICRO.encoded(changed))
            with self.assertRaisesRegex(ValueError, 'stale'): MICRO.run(sandbox, 'verify')

    def test_oversized_source_read_is_bounded(self):
        base = 'E:/_Temp' if os.name == 'nt' and Path('E:/_Temp').is_dir() else None
        with tempfile.TemporaryDirectory(prefix='floraria-micro-size-', dir=base) as directory:
            path = Path(directory) / 'large.json'
            path.write_bytes(b' ' * (MICRO.MAX_BYTES + 1))
            with self.assertRaisesRegex(ValueError, 'size'): MICRO.read(path)


if __name__ == '__main__': unittest.main()
