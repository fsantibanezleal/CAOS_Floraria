"""Pages preparation tests run only against isolated fixture directories."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('prepare_pages', ROOT / 'scripts/prepare_pages.py')
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
spec_dispatch = importlib.util.spec_from_file_location('deploy_pages', ROOT / 'scripts/deploy_pages.py')
dispatch = importlib.util.module_from_spec(spec_dispatch)
spec_dispatch.loader.exec_module(dispatch)


class PagesTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='floraria-pages-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.dist = self.root / 'frontend/dist'
        self.dist.mkdir(parents=True)
        (self.dist / 'assets').mkdir()
        (self.dist / 'assets/app.js').write_text('export const hello = 1;')
        (self.dist / 'assets/app.css').write_text('body { color: black }')
        self.html = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/app.css"></head><body><script type="module" src="/assets/app.js"></script></body></html>'
        (self.dist / 'index.html').write_text(self.html)
        (self.root / 'deploy').mkdir()
        (self.root / 'deploy/pages-routes.json').write_text('["/explore", "/methodology"]')
        (self.root / 'VERSION').write_text('0.01.000\n')
        self.revision = 'a' * 40
        (self.dist / 'release.json').write_text(json.dumps({'product': 'FLORARIA', 'revision': self.revision, 'version': '0.01.000'}))
        for module, attribute, value in [(pages, 'ROOT', self.root), (pages.release, 'ROOT', self.root)]:
            patch = mock.patch.object(module, attribute, value)
            patch.start()
            self.addCleanup(patch.stop)
        patch = mock.patch.object(pages.release, 'git', side_effect=self.git)
        patch.start()
        self.addCleanup(patch.stop)

    def git(self, *arguments):
        if arguments[:2] == ('rev-parse', 'HEAD'):
            return self.revision
        if arguments[:2] == ('status', '--porcelain'):
            return ''
        if arguments[:2] == ('show', '-s'):
            return '2026-09-06T00:00:00+00:00'
        raise AssertionError('Unexpected Git operation in isolated Pages test.')

    def test_direct_routes_early_csp_and_every_final_file_are_in_identity(self):
        receipt = pages.prepare(revision=self.revision, require_clean=True)
        output = self.root / 'build/pages'
        html = (output / 'index.html').read_text()
        self.assertLess(html.index('Content-Security-Policy'), html.index('rel="stylesheet"'))
        self.assertIn('wasm-unsafe-eval', html)
        self.assertIn('blob:', html)
        self.assertNotIn('frame-ancestors', html)
        for name in ['404.html', 'explore/index.html', 'methodology/index.html']:
            self.assertEqual((output / name).read_text(), html)
        metadata = json.loads((output / 'release.json').read_text())
        self.assertEqual(metadata['files'], pages.release.tree_manifest(output))
        self.assertEqual(metadata['artifact_tree_sha256'], pages.release.tree_digest(metadata['files']))
        self.assertEqual(metadata['hosting']['provider'], 'github-pages')
        self.assertTrue(receipt['source_clean'])
        self.assertEqual((self.dist / 'index.html').read_text(), self.html)

    def test_dirty_source_can_preview_but_cannot_publish(self):
        with mock.patch.object(pages.release, 'clean', return_value=False):
            with self.assertRaisesRegex(RuntimeError, 'clean source tree'):
                pages.prepare(revision=self.revision, require_clean=True)
            pages.prepare()
        metadata = json.loads((self.root / 'build/pages/release.json').read_text())
        self.assertFalse(metadata['source_clean'])
        self.assertEqual(metadata['schema'], 'floraria-local-build/v1')

    def test_mismatched_revision_or_missing_explicit_revision_cannot_publish(self):
        with self.assertRaisesRegex(RuntimeError, 'exact current HEAD'):
            pages.prepare(revision='b' * 40, require_clean=True)
        with self.assertRaisesRegex(RuntimeError, 'explicit exact revision'):
            pages.prepare(require_clean=True)

    def test_forbidden_entry_resources_fail_before_prior_output_is_removed(self):
        output = self.root / 'build/pages'
        output.mkdir(parents=True)
        marker = output / 'preserve.txt'
        marker.write_text('prior output')
        for substitution in ['https://example.test/app.js', '//example.test/app.js', 'assets/app.js', '/missing.js']:
            with self.subTest(resource=substitution):
                (self.dist / 'index.html').write_text(self.html.replace('/assets/app.js', substitution))
                with self.assertRaises(RuntimeError):
                    pages.prepare()
                self.assertEqual(marker.read_text(), 'prior output')

    def test_hidden_or_key_files_and_external_css_cannot_publish(self):
        for name in ['assets/.env', 'assets/operator.pem', 'assets/.git/config']:
            path = self.dist / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('not a real credential')
            with self.assertRaises(RuntimeError):
                pages.prepare()
            path.unlink()
        (self.dist / 'assets/app.css').write_text('body { background: url(https://example.test/image.png) }')
        with self.assertRaisesRegex(RuntimeError, 'foreign runtime resource'):
            pages.prepare()

    def test_invalid_routes_and_duplicate_csp_are_rejected(self):
        for routes in [['/../escape'], ['/explore', '/explore'], ['https://example.test']]:
            (self.root / 'deploy/pages-routes.json').write_text(json.dumps(routes))
            with self.assertRaises(RuntimeError):
                pages.prepare()
        (self.root / 'deploy/pages-routes.json').write_text('["/explore"]')
        (self.dist / 'index.html').write_text(self.html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src *">'))
        with self.assertRaisesRegex(RuntimeError, 'already contains a CSP'):
            pages.prepare()

    def test_changed_built_file_produces_a_different_release_identity(self):
        first = pages.prepare(revision=self.revision, require_clean=True)
        (self.dist / 'assets/app.js').write_text('export const hello = 2;')
        second = pages.prepare(revision=self.revision, require_clean=True)
        self.assertNotEqual(first['release_id'], second['release_id'])

    def test_stale_built_identity_is_rejected(self):
        (self.dist / 'release.json').write_text(json.dumps({'product': 'FLORARIA', 'revision': 'b' * 40, 'version': '0.01.000'}))
        with self.assertRaisesRegex(RuntimeError, 'Build identity is stale'):
            pages.prepare(revision=self.revision, require_clean=True)

    def test_linked_output_parent_is_rejected_without_cleanup(self):
        with mock.patch.object(Path, 'is_symlink', lambda path: path == self.root / 'build'):
            with self.assertRaisesRegex(RuntimeError, 'inside the real repository'):
                pages.prepare()

    def test_dispatch_requires_clean_exact_remote_main_before_request(self):
        completed = subprocess.CompletedProcess([], 0, stdout=self.revision + '\n')
        with mock.patch.object(dispatch.shutil, 'which', return_value='gh'), mock.patch.object(dispatch.subprocess, 'run', return_value=completed) as execute:
            dispatch.dispatch(self.revision)
            self.assertEqual(execute.call_count, 2)
            self.assertEqual(execute.call_args.args[0][-2:], ['--field', 'revision=' + self.revision])
            self.assertEqual(execute.call_args.kwargs['timeout'], 45)
        completed.stdout = 'b' * 40 + '\n'
        with mock.patch.object(dispatch.shutil, 'which', return_value='gh'), mock.patch.object(dispatch.subprocess, 'run', return_value=completed) as execute:
            with self.assertRaisesRegex(RuntimeError, 'current remote main'):
                dispatch.dispatch(self.revision)
            self.assertEqual(execute.call_count, 1)
        with mock.patch.object(dispatch.release, 'clean', return_value=False), mock.patch.object(dispatch.subprocess, 'run') as execute:
            with self.assertRaisesRegex(RuntimeError, 'reviewed clean source'):
                dispatch.dispatch(self.revision)
            execute.assert_not_called()


if __name__ == '__main__':
    unittest.main()
