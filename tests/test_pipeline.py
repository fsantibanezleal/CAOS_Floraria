"""Artifact and botanical-contract tests; processing stays in temporary sandboxes."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("floraria_pipeline_test", ROOT / "data-pipeline/run.py")
PIPELINE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PIPELINE)


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source, cls.locks = PIPELINE.load_inputs(ROOT)

    def setUp(self):
        temp_base = os.environ.get("FLORARIA_TEST_TEMP")
        if temp_base is None and os.name == "nt" and Path("E:/_Temp").is_dir():
            temp_base = "E:/_Temp"
        self.temp = tempfile.TemporaryDirectory(prefix="floraria-tests-", dir=temp_base)
        self.sandbox = Path(self.temp.name)
        self.assertNotEqual(self.sandbox.resolve(), ROOT.resolve())
        for name in ("catalog-source.json", "assets.lock.json"):
            target = self.sandbox / "data/sources" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / "data/sources" / name, target)
        for asset in self.locks["assets"]:
            target = self.sandbox / "data/raw" / asset["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / "data/artifacts" / asset["path"], target)

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_sandbox_processing_is_reproducible(self):
        counts = PIPELINE.run(self.sandbox, "all", offline=True)
        self.assertEqual(counts, {"specimens": 5, "structures": 15, "journeys": 12, "assets": 10})
        first = (self.sandbox / "manifests/catalog.json").read_bytes()
        PIPELINE.run(self.sandbox, "all", offline=True)
        self.assertEqual(first, (self.sandbox / "manifests/catalog.json").read_bytes())

    def test_export_canonicalizes_crlf_sources_and_emits_lf_json(self):
        originals = {}
        for name in ("catalog-source.json", "assets.lock.json"):
            path = self.sandbox / "data/sources" / name
            originals[name] = path.read_bytes().replace(b"\r\n", b"\n")
            path.write_bytes(originals[name].replace(b"\n", b"\r\n"))
        PIPELINE.run(self.sandbox, "all", offline=True)
        manifest = PIPELINE.read_json(self.sandbox / "manifests/catalog.json")
        for name, field in (("catalog-source.json", "catalogSourceSha256"),
                            ("assets.lock.json", "assetLockSha256")):
            path = self.sandbox / "data/sources" / name
            self.assertEqual(path.read_bytes(), originals[name])
            self.assertEqual(manifest[field], PIPELINE.sha256(path))
        for relative in ("data/artifacts/catalog.json", "manifests/catalog.json"):
            payload = (self.sandbox / relative).read_bytes()
            self.assertNotIn(b"\r", payload)
            self.assertTrue(payload.endswith(b"\n"))

    def test_exported_text_bytes_survive_git_clean_filter_unchanged(self):
        PIPELINE.run(self.sandbox, "all", offline=True)
        for relative in ("data/sources/catalog-source.json", "data/sources/assets.lock.json",
                         "data/artifacts/catalog.json", "manifests/catalog.json"):
            path = str(self.sandbox / relative)
            raw = subprocess.check_output(["git", "hash-object", "--no-filters", path], cwd=ROOT)
            filtered = subprocess.check_output(["git", "hash-object", "--path=" + relative, path], cwd=ROOT)
            self.assertEqual(raw, filtered, relative + " would change bytes when committed")

    def test_verify_rejects_newline_changes_without_rewriting_source(self):
        PIPELINE.run(self.sandbox, "all", offline=True)
        for name in ("catalog-source.json", "assets.lock.json"):
            with self.subTest(source=name):
                path = self.sandbox / "data/sources" / name
                original = path.read_bytes()
                changed = original.replace(b"\n", b"\r\n")
                path.write_bytes(changed)
                with self.assertRaisesRegex(PIPELINE.PipelineError, "changed since export"):
                    PIPELINE.run(self.sandbox, "verify", offline=True)
                self.assertEqual(path.read_bytes(), changed)
                path.write_bytes(original)

    def test_canonical_verification_is_read_only(self):
        before = PIPELINE.sha256(ROOT / "manifests/catalog.json")
        PIPELINE.run(ROOT, "verify", offline=True)
        self.assertEqual(before, PIPELINE.sha256(ROOT / "manifests/catalog.json"))

    def test_corrupt_cached_bytes_fail_before_export(self):
        asset = self.locks["assets"][0]
        path = self.sandbox / "data/raw" / asset["path"]
        payload = bytearray(path.read_bytes())
        payload[-1] ^= 1
        path.write_bytes(payload)
        with self.assertRaisesRegex(PIPELINE.PipelineError, "SHA256 mismatch"):
            PIPELINE.run(self.sandbox, "all", offline=True)
        self.assertFalse((self.sandbox / "data/artifacts/catalog.json").exists())

    def test_offline_missing_cache_fails_without_download(self):
        (self.sandbox / "data/raw" / self.locks["assets"][0]["path"]).unlink()
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Offline cache miss"):
            PIPELINE.run(self.sandbox, "acquire", offline=True)

    def test_path_traversal_is_rejected(self):
        locks = copy.deepcopy(self.locks)
        locks["assets"][0]["path"] = "../outside.glb"
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Unsafe relative"):
            PIPELINE.validate_locks(locks)

    def test_non_cc0_asset_is_rejected(self):
        locks = copy.deepcopy(self.locks)
        locks["assets"][0]["license"] = "CC-BY-NC-4.0"
        with self.assertRaisesRegex(PIPELINE.PipelineError, "approved CC0"):
            PIPELINE.validate_locks(locks)

    def test_unapproved_download_origin_is_rejected(self):
        locks = copy.deepcopy(self.locks)
        locks["assets"][0]["url"] = "https://example.com/model.glb"
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Unapproved asset origin"):
            PIPELINE.validate_locks(locks)

    def test_unknown_scientific_source_is_rejected(self):
        source = copy.deepcopy(self.source)
        source["structures"][0]["sourceIds"] = ["invented-source"]
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Unknown/missing source"):
            PIPELINE.validate_source(source, self.locks)

    def test_orchid_cannot_use_generic_seed_or_lifecycle(self):
        source = copy.deepcopy(self.source)
        source["journeys"][0]["steps"][0]["view"] = {"mode": "lifecycle", "model": "orchid"}
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Orchid lifecycle"):
            PIPELINE.validate_source(source, self.locks)
        source["journeys"][0]["steps"][0]["view"] = {"mode": "anatomy", "model": "orchid", "selected": "seed"}
        with self.assertRaisesRegex(PIPELINE.PipelineError, "does not belong"):
            PIPELINE.validate_source(source, self.locks)

    def test_missing_translation_is_rejected(self):
        source = copy.deepcopy(self.source)
        source["journeys"][0]["steps"][0]["body"]["es"] = ""
        with self.assertRaisesRegex(PIPELINE.PipelineError, "body.es is empty"):
            PIPELINE.validate_source(source, self.locks)

    def test_triangle_count_comes_from_file_not_filename(self):
        asset = next(a for a in self.locks["assets"] if a["variant"] == "detail")
        self.assertIn("100k", asset["url"])
        info = PIPELINE.inspect_glb(self.sandbox / "data/raw" / asset["path"])
        self.assertEqual(info["triangles"], 150_000)
        self.assertEqual((info["nodes"], info["meshes"], info["animations"]), (1, 1, 0))

    def test_external_texture_reference_is_rejected(self):
        asset = self.locks["assets"][0]
        path = self.sandbox / "data/raw" / asset["path"]
        original = path.read_bytes()
        length = struct.unpack_from("<I", original, 12)[0]
        doc = json.loads(original[20:20 + length])
        doc["images"][0]["uri"] = "https://example.com/private.jpg"
        replacement = json.dumps(doc).encode("utf-8")
        replacement += b" " * (-len(replacement) % 4)
        tail = original[20 + length:]
        path.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20 + len(replacement) + len(tail),
                                     len(replacement), 0x4E4F534A) + replacement + tail)
        with self.assertRaisesRegex(PIPELINE.PipelineError, "External image"):
            PIPELINE.inspect_glb(path)

    def test_stale_source_and_extra_artifacts_are_detected(self):
        PIPELINE.run(self.sandbox, "all", offline=True)
        extra = self.sandbox / "data/artifacts/untracked.json"
        extra.write_text("{}", encoding="utf-8")
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Unexpected or missing artifact"):
            PIPELINE.run(self.sandbox, "verify", offline=True)
        extra.unlink()
        source = copy.deepcopy(self.source)
        source["specimens"][0]["description"]["en"] += " Extra explanation."
        PIPELINE.write_json(self.sandbox / "data/sources/catalog-source.json", source)
        with self.assertRaisesRegex(PIPELINE.PipelineError, "Source changed"):
            PIPELINE.run(self.sandbox, "verify", offline=True)


if __name__ == "__main__":
    unittest.main()
