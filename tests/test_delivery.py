"""Delivery safety tests use isolated files and never contact a server."""
from __future__ import annotations
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    specification = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / (name + '.py'))
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


release = load('release')
check_release = load('check_release')
project = load('project')


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='floraria-delivery-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.dist = self.root / 'frontend/dist'
        self.dist.mkdir(parents=True)
        (self.dist / 'index.html').write_text('<html><title>Floraria</title></html>')
        (self.dist / 'app.js').write_text('export const revision = 1;')
        (self.root / 'VERSION').write_text('0.01.000\n')
        self.revision = 'a' * 40
        self.receipt = self.root / 'build/build-receipt.json'
        for attribute, value in [('ROOT', self.root), ('DIST', self.dist), ('RECEIPT', self.receipt)]:
            patch = mock.patch.object(release, attribute, value); patch.start(); self.addCleanup(patch.stop)

    def git(self, *arguments):
        if arguments[:2] == ('rev-parse', 'HEAD'): return self.revision
        if arguments[:2] == ('show', '-s'): return '2026-09-06T00:00:00+00:00'
        if arguments[:2] == ('status', '--porcelain'): return ''
        raise AssertionError('Unexpected Git operation in offline test: '+repr(arguments))

    def package(self):
        with mock.patch.object(release, 'git', side_effect=self.git):
            release.write_build_receipt()
            return release.package(self.revision)

    def test_display_and_semantic_versions_are_distinct_but_consistent(self):
        self.assertTrue(check_release.validate_version('0.01.000', '0.1.0'))
        self.assertFalse(check_release.validate_version('0.1.0', '0.1.0'))
        self.assertFalse(check_release.validate_version('0.01.000', '0.1.1'))

    def test_packaging_is_deterministic_and_contains_public_identity(self):
        first = self.package()
        before = first.read_bytes()
        second = self.package()
        self.assertEqual(before, second.read_bytes())
        with tarfile.open(first) as archive:
            metadata = json.load(archive.extractfile('release.json'))
            self.assertEqual(metadata['revision'], self.revision)
            self.assertEqual(set(metadata['files']), {'index.html', 'app.js'})
            self.assertEqual(metadata['product'], 'FLORARIA')

    def test_changed_built_bytes_are_rejected_after_receipt(self):
        with mock.patch.object(release, 'git', side_effect=self.git):
            release.write_build_receipt()
            (self.dist / 'app.js').write_text('changed after verification')
            with self.assertRaisesRegex(RuntimeError, 'immutable built-file digest'):
                release.package(self.revision)

    def test_ignored_environment_file_cannot_enter_artifact(self):
        (self.dist / '.env').write_text('not-a-real-secret')
        with self.assertRaisesRegex(RuntimeError, 'Private or development path'):
            release.tree_manifest(self.dist)

    def test_release_requires_exact_revision_and_clean_source(self):
        with mock.patch.object(release, 'git', side_effect=self.git):
            with self.assertRaisesRegex(RuntimeError, 'exact current'):
                release.trusted_revision('b'*40, None)
            with mock.patch.object(release, 'clean', return_value=False):
                with self.assertRaisesRegex(RuntimeError, 'clean Git'):
                    release.trusted_revision(self.revision, self.revision)

    def test_operator_inputs_do_not_accept_shell_fragments(self):
        key = self.root / 'test-identity'; key.write_text('test fixture, not a key')
        with mock.patch.dict(os.environ, {'FLORARIA_SSH_KEY':str(key), 'FLORARIA_SSH_TARGET':'operator@host;false', 'FLORARIA_DOMAIN':'floraria.example.test'}):
            with self.assertRaisesRegex(RuntimeError, 'user@host'):
                release.config()
        with mock.patch.dict(os.environ, {'FLORARIA_SSH_KEY':str(key), 'FLORARIA_SSH_TARGET':'operator@host', 'FLORARIA_DOMAIN':'floraria.example.test/../../'}):
            with self.assertRaisesRegex(RuntimeError, 'hostname'):
                release.config()

    def test_remote_script_uses_lf_utf8_binary_stdin_with_strict_ssh(self):
        script = self.root / 'preflight.sh'
        normalized = "#!/usr/bin/env bash\nset -Eeuo pipefail\n# UTF-8 fixture: \u03bb\nprintf '%s\\n' 'read-only probe'\n"
        for newline in ('\n', '\r\n'):
            with self.subTest(source_newline=repr(newline)):
                script.write_bytes(normalized.replace('\n', newline).encode('utf-8'))
                with mock.patch.object(release.subprocess, 'run') as execute:
                    release.remote(['preflight', 'argument with spaces'], script, 'operator-key', 'root@example.test')
                command = execute.call_args.args[0]
                options = execute.call_args.kwargs
                self.assertEqual(command, ['ssh', '-i', 'operator-key', '-o', 'BatchMode=yes', '-o',
                                          'StrictHostKeyChecking=yes', 'root@example.test',
                                          "bash -s -- preflight 'argument with spaces'"])
                self.assertIsInstance(options['input'], bytes)
                self.assertEqual(options['input'], normalized.encode('utf-8'))
                self.assertNotIn(b'\r', options['input'])
                self.assertNotIn('text', options)
                self.assertNotIn('encoding', options)
                self.assertTrue(options['check'])

    def test_upload_allocation_accepts_only_private_mktemp_shape(self):
        completed = subprocess.CompletedProcess([], 0, stdout='/tmp/floraria-upload.ABC123def4\n', stderr='')
        with mock.patch.object(release.subprocess, 'run', return_value=completed) as execute:
            self.assertEqual(release.allocate_upload('operator-key', 'root@example.test'), '/tmp/floraria-upload.ABC123def4')
            self.assertIn('umask 077; mktemp -d', execute.call_args.args[0][-1])
        completed.stdout = '/tmp/floraria-upload.ABC123def4/../target\n'
        with mock.patch.object(release.subprocess, 'run', return_value=completed):
            with self.assertRaisesRegex(RuntimeError, 'private mktemp'):
                release.allocate_upload('operator-key', 'root@example.test')

    def test_browser_qa_does_not_install_or_launch_a_server_implicitly(self):
        with mock.patch.object(project, 'node_check', return_value='npm'), mock.patch.object(project, 'run') as execute:
            project.verify_ui('http://127.0.0.1:4902', str(self.root/'browser-cache'), False)
            self.assertEqual(execute.call_count, 1)
            self.assertEqual(execute.call_args.args[0][-2:], ['run', 'test:browser'])
            environment = execute.call_args.kwargs['env']
            self.assertEqual(environment['FLORARIA_QA_URL'], 'http://127.0.0.1:4902')
            self.assertEqual(environment['PLAYWRIGHT_BROWSERS_PATH'], str(self.root/'browser-cache'))
        with mock.patch.object(project, 'node_check', return_value='npm'), mock.patch.object(project, 'run') as execute:
            with self.assertRaisesRegex(RuntimeError, 'without credentials'):
                project.verify_ui('https://user:password@example.test', None, False)
            execute.assert_not_called()

    def test_browser_download_requires_explicit_flag(self):
        with mock.patch.object(project, 'node_check', return_value='npm'), mock.patch.object(project.shutil, 'which', return_value='node'), mock.patch.object(project, 'run') as execute:
            project.verify_ui('http://127.0.0.1:5902', '0', True)
            self.assertEqual(execute.call_count, 2)
            self.assertEqual(execute.call_args_list[0].args[0][-2:], ['install', 'chromium'])
            self.assertEqual(execute.call_args_list[0].kwargs['env']['PLAYWRIGHT_BROWSERS_PATH'], '0')

    def verifier(self):
        source = (ROOT / 'deploy/install-release.sh').read_text(encoding='utf-8')
        return source.split("<<'PY'\n",1)[1].split('\nPY\n',1)[0]

    def test_server_verifier_accepts_package_then_rejects_modified_file(self):
        archive = self.package()
        release_id = archive.name.removesuffix('.tar.gz')
        target = self.root / 'remote/releases' / release_id
        target.parent.mkdir(parents=True)
        command = [sys.executable, '-c', self.verifier(), 'install', str(target), release_id, str(archive)]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        (target / 'app.js').write_text('tampered')
        result = subprocess.run([sys.executable,'-c',self.verifier(),'rollback',str(target),release_id,''],capture_output=True,text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('byte/hash mismatch', result.stderr)

    def test_server_verifier_rejects_tar_traversal_before_extraction(self):
        archive = self.root / 'malicious.tar.gz'
        with tarfile.open(archive,'w:gz') as output:
            entry=tarfile.TarInfo('../escape'); entry.size=4
            output.addfile(entry,io.BytesIO(b'test'))
        target = self.root / 'remote/releases' / ('v0.01.000-'+self.revision[:12]+'-'+'b'*12)
        target.parent.mkdir(parents=True)
        result=subprocess.run([sys.executable,'-c',self.verifier(),'install',str(target),target.name,str(archive)],capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Invalid path',result.stderr)
        self.assertFalse((target.parent/'escape').exists())

    def test_all_shell_launchers_parse_without_execution(self):
        bash = shutil.which('bash')
        if os.name == 'nt':
            candidate = Path(os.environ.get('ProgramFiles','')) / 'Git/bin/bash.exe'
            if candidate.is_file(): bash = str(candidate)
        if not bash: self.skipTest('Bash unavailable for syntax-only check.')
        files = sorted((ROOT/'scripts').rglob('*.sh')) + sorted((ROOT/'deploy').rglob('*.sh'))
        for path in files:
            with self.subTest(script=path.name):
                result=subprocess.run([bash,'-n',str(path)],capture_output=True,text=True)
                self.assertEqual(result.returncode,0,result.stderr)


if __name__ == '__main__': unittest.main()
