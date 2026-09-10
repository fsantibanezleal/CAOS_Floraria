"""New source paths retain topology, deterministic bytes and legacy evidence."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('floraria_living_test', ROOT/'data-pipeline/living.py')
LIVING = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LIVING)


class LivingContentTests(unittest.TestCase):
    def setUp(self):
        self.source = json.loads((ROOT/'data/sources/living-content.json').read_text(encoding='utf-8'))

    def test_sunflower_path_is_sourced_chromoplast_content_not_the_old_vacuole_path(self):
        value = LIVING.validate(self.source)
        self.assertEqual([n['id'] for n in value['nodes']], LIVING.CHAIN)
        self.assertIn('xanthophyll', value['nodes'][-1]['summary']['en'])
        self.assertIn('10.1038/s41598-026-53788-7', value['sources'][0]['citation'])
        old = json.loads((ROOT/'data/sources/micro-atlas.json').read_text(encoding='utf-8'))
        self.assertEqual(len(old['nodes']), 34)
        self.assertIn('petal-vacuole', {n['id'] for n in old['nodes']})

    def test_broken_parent_missing_translation_and_unresolved_sources_are_rejected(self):
        for defect in ('parent', 'translation', 'source', 'unhashable'):
            value = copy.deepcopy(self.source)
            if defect == 'parent': value['nodes'][2]['parentId'] = 'sunflower-ray'
            if defect == 'translation': del value['nodes'][1]['detail']['es']
            if defect == 'source': value['nodes'][3]['sourceIds'] = ['invented-paper']
            if defect == 'unhashable': value['nodes'][3]['sourceIds'] = [{}]
            with self.subTest(defect=defect), self.assertRaises(ValueError): LIVING.validate(value)

    def test_export_is_reproducible_and_verification_never_repairs_corruption(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'data/sources').mkdir(parents=True)
            (root/'data/sources/living-content.json').write_text(json.dumps(self.source), encoding='utf-8')
            LIVING.run(root, 'export')
            output = root/'data/artifacts/living-content.json'
            original = output.read_bytes()
            LIVING.run(root, 'export')
            self.assertEqual(output.read_bytes(), original)
            LIVING.run(root, 'verify')
            output.write_bytes(original+b' ')
            with self.assertRaises(ValueError): LIVING.run(root, 'verify')
            self.assertEqual(output.read_bytes(), original+b' ')

    def test_credential_bearing_source_links_are_rejected(self):
        self.source['sources'][0]['url'] = 'https://operator:secret@example.org/paper'
        with self.assertRaises(ValueError): LIVING.validate(self.source)


if __name__ == '__main__': unittest.main()
