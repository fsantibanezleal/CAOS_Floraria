#!/usr/bin/env python3
"""FLORARIA: standard-library-only artifact pipeline, invoked by path."""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import shutil
import struct
import sys
import urllib.parse
import urllib.request

MAX_ASSET_BYTES = 5_000_000
PIPELINE_VERSION = 1
SPECIMEN_IDS = {"phalaenopsis", "encyclia", "lycaste", "phragmipedium", "vanda"}
MODELS = {"general", "orchid"}
STAGES = ("all", "acquire", "validate-source", "inspect", "normalize", "export", "verify")


class PipelineError(ValueError):
    """A deterministic source, rights, integrity, or content-contract failure."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise PipelineError(message)


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise PipelineError(f"Cannot read JSON {path}: {exc}") from exc


def encoded(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Write bytes: text-mode newline translation would make Windows exports differ from Git/CI.
    path.write_bytes(encoded(value))


def canonicalize_source_text(root: Path) -> None:
    """Normalize approved source text only during export; verification remains byte-strict."""
    for name in ("catalog-source.json", "assets.lock.json"):
        path = root / "data/sources" / name
        original = path.read_bytes()
        canonical = original.decode("utf-8-sig").replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
        if canonical != original:
            path.write_bytes(canonical)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_relative(value: str) -> PurePosixPath:
    require(isinstance(value, str) and bool(value), "Asset path must be a nonempty string")
    path = PurePosixPath(value)
    require(not path.is_absolute() and ".." not in path.parts and "\\" not in value
            and ":" not in value, f"Unsafe relative asset path: {value}")
    return path


def localized(value: object, context: str) -> None:
    require(isinstance(value, dict), f"{context} needs bilingual text")
    for lang in ("en", "es"):
        require(isinstance(value.get(lang), str) and value[lang].strip(), f"{context}.{lang} is empty")
        require("TODO" not in value[lang] and "Lorem ipsum" not in value[lang], f"Placeholder in {context}")


def load_inputs(root: Path) -> tuple[dict, dict]:
    return (read_json(root / "data/sources/catalog-source.json"),
            read_json(root / "data/sources/assets.lock.json"))


def validate_locks(locks: dict) -> None:
    require(locks.get("schemaVersion") == 1, "Unsupported asset lock schema")
    entries = locks.get("assets", [])
    require(len(entries) == 10, "Five specimens require exactly ten locked GLBs")
    keys, paths = set(), set()
    for asset in entries:
        key = (asset.get("specimenId"), asset.get("variant"))
        require(key[0] in SPECIMEN_IDS and key[1] in {"preview", "detail"}, "Invalid locked specimen/variant")
        require(key not in keys, f"Duplicate locked variant: {key}")
        keys.add(key)
        path = str(safe_relative(asset.get("path", "")))
        require(path.startswith("assets/") and path.endswith(".glb"), "GLBs must be under assets/")
        require(path not in paths, "Duplicate artifact path")
        paths.add(path)
        parsed = urllib.parse.urlparse(asset.get("url", ""))
        require(parsed.scheme == "https" and parsed.netloc == "3d-api.si.edu"
                and parsed.path.startswith("/content/document/3d_package:"), "Unapproved asset origin")
        require(asset.get("license") == "CC0-1.0", "Asset lacks approved CC0 license")
        require(asset.get("rightsEvidenceUrl", "").startswith("https://3d.si.edu/")
                and asset.get("policyUrl") == "https://www.si.edu/openaccess/faq"
                and asset.get("apiDocumentationUrl") == "https://3d-api.si.edu/api-docs/",
                "Asset rights evidence is incomplete")
        require(isinstance(asset.get("bytes"), int) and 0 < asset["bytes"] <= MAX_ASSET_BYTES,
                "Asset exceeds the five-megabyte cap")
        digest = asset.get("sha256", "")
        require(len(digest) == 64 and all(c in "0123456789abcdef" for c in digest), "Invalid SHA256")
        require(asset.get("triangles") == (20_000 if key[1] == "preview" else 150_000),
                "Unexpected declared mesh budget")


def validate_source(catalog: dict, locks: dict) -> None:
    validate_locks(locks)
    require(catalog.get("schemaVersion") == 1, "Unsupported catalog schema")
    source_ids = set()
    for source in catalog.get("sources", []):
        require(source.get("id") and source["id"] not in source_ids, "Duplicate or empty source ID")
        source_ids.add(source["id"])
        require(all(isinstance(source.get(k), str) and source[k].strip() for k in ("label", "citation", "url")),
                "Incomplete source citation")
        require(source["url"].startswith("https://"), "Sources must use HTTPS")
    require(source_ids, "Catalog has no sources")

    def citations(item: dict, context: str) -> None:
        refs = item.get("sourceIds", [])
        require(refs and all(ref in source_ids for ref in refs), f"Unknown/missing source in {context}")

    specimen_ids = set()
    for specimen in catalog.get("specimens", []):
        require(specimen.get("id") not in specimen_ids, "Duplicate specimen ID")
        specimen_ids.add(specimen.get("id"))
        require(specimen.get("scientificName") and specimen.get("credit"), "Specimen needs scientific name/credit")
        for field in ("commonName", "description"):
            localized(specimen.get(field), f"{specimen['id']}.{field}")
        require(len(specimen.get("facts", [])) >= 3, "Each specimen needs three meaningful facts")
        for fact in specimen["facts"]:
            localized(fact.get("label"), "fact.label")
            localized(fact.get("value"), "fact.value")
        citations(specimen, specimen["id"])
    require(specimen_ids == SPECIMEN_IDS, "The five canonical specimens are required")
    structures = {}
    for item in catalog.get("structures", []):
        require(item.get("id") and item["id"] not in structures, "Duplicate/empty structure")
        structures[item["id"]] = item
        require(item.get("models") and set(item["models"]) <= MODELS, "Unknown teaching model")
        require(item.get("group"), "Structure needs a group")
        for field in ("label", "summary", "detail"):
            localized(item.get(field), f"{item['id']}.{field}")
        citations(item, item["id"])
    require(len(structures) == 15, "Catalog requires fifteen teaching structures")
    require("orchid" not in structures["seed"]["models"], "Generic seed cannot represent orchid germination")
    journeys = catalog.get("journeys", [])
    require(len(journeys) == 12, "Catalog requires twelve investigations")
    journey_ids = set()
    for journey in journeys:
        require(journey.get("id") and journey["id"] not in journey_ids, "Duplicate investigation ID")
        journey_ids.add(journey["id"])
        for field in ("title", "question", "summary"):
            localized(journey.get(field), f"{journey['id']}.{field}")
        citations(journey, journey["id"])
        require(3 <= len(journey.get("steps", [])) <= 5, "Investigations need three to five steps")
        for step in journey["steps"]:
            localized(step.get("title"), "step.title")
            localized(step.get("body"), "step.body")
            view = step.get("view", {})
            require(view.get("mode") in {"specimen", "anatomy", "lifecycle"}, "Invalid view mode")
            model = view.get("model", "general")
            require(model in MODELS, "Unknown view model")
            require(not (view["mode"] == "lifecycle" and model == "orchid"), "Orchid lifecycle is unsupported")
            for field in ("specimen", "compare"):
                if field in view:
                    require(view[field] in specimen_ids, f"Unknown specimen in {field}")
            if "selected" in view:
                selected = view["selected"]
                require(selected in structures and model in structures[selected]["models"],
                        f"Structure {selected} does not belong to {model}")
            for field, minimum, maximum in (("explode", 0, 1), ("stage", 0, 1), ("cut", -1, 1)):
                if field in view:
                    value = view[field]
                    require(isinstance(value, (int, float)) and not isinstance(value, bool)
                            and minimum <= value <= maximum, f"Out-of-range {field}")


def checked_asset(path: Path, asset: dict) -> None:
    require(path.is_file(), f"Missing asset: {path}")
    require(path.stat().st_size == asset["bytes"], f"Byte size mismatch: {path.name}")
    require(sha256(path) == asset["sha256"], f"SHA256 mismatch: {path.name}")


def acquire(root: Path, locks: dict, offline: bool) -> None:
    validate_locks(locks)
    for asset in locks["assets"]:
        target = root / "data/raw" / safe_relative(asset["path"])
        if target.exists():
            checked_asset(target, asset)
            continue
        require(not offline, f"Offline cache miss: {asset['path']}; run acquire with network access")
        target.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(asset["url"], headers={"User-Agent": "FLORARIA/1.0 (educational asset acquisition)"})
        part = target.with_suffix(".glb.part")
        try:
            with urllib.request.urlopen(request, timeout=45) as response, part.open("wb") as output:
                require(response.status == 200, "Asset server returned an unexpected status")
                final = urllib.parse.urlparse(response.url)
                require(final.scheme == "https" and final.netloc == "3d-api.si.edu", "Unexpected download redirect")
                total = 0
                while chunk := response.read(65_536):
                    total += len(chunk)
                    require(total <= asset["bytes"] and total <= MAX_ASSET_BYTES, "Download exceeded locked size")
                    output.write(chunk)
            checked_asset(part, asset)
            part.replace(target)
        except OSError as exc:
            raise PipelineError(f"Acquisition failed for {asset['path']}: {exc}") from exc


def inspect_glb(path: Path) -> dict:
    payload = path.read_bytes()
    require(len(payload) >= 20, "Truncated GLB header")
    magic, version, length = struct.unpack_from("<4sII", payload)
    require(magic == b"glTF" and version == 2 and length == len(payload), "Invalid GLB header")
    json_length, chunk_type = struct.unpack_from("<II", payload, 12)
    require(chunk_type == 0x4E4F534A and 20 + json_length <= length, "Invalid GLB JSON chunk")
    try:
        model = json.loads(payload[20:20 + json_length])
    except (ValueError, UnicodeError) as exc:
        raise PipelineError("Malformed GLB JSON") from exc
    require(model.get("asset", {}).get("version") == "2.0", "Unsupported glTF version")
    for image in model.get("images", []):
        require("uri" not in image and "bufferView" in image, "External image reference is forbidden")
    for buffer in model.get("buffers", []):
        require("uri" not in buffer, "External buffer reference is forbidden")
    triangles = 0
    for mesh in model.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            require(primitive.get("mode", 4) == 4 and "indices" in primitive, "Expected indexed triangle mesh")
            count = model["accessors"][primitive["indices"]]["count"]
            require(count % 3 == 0, "Index count is not divisible by three")
            triangles += count // 3
    require("KHR_draco_mesh_compression" in model.get("extensionsRequired", []), "Expected Draco-compressed asset")
    return {"nodes": len(model.get("nodes", [])), "meshes": len(model.get("meshes", [])),
            "materials": len(model.get("materials", [])), "animations": len(model.get("animations", [])),
            "triangles": triangles, "embeddedImages": len(model.get("images", [])),
            "extensionsRequired": model.get("extensionsRequired", [])}


def inspect_assets(root: Path, locks: dict, artifact: bool = False) -> dict:
    base = root / ("data/artifacts" if artifact else "data/raw")
    report = {}
    for asset in locks["assets"]:
        path = base / safe_relative(asset["path"])
        checked_asset(path, asset)
        info = inspect_glb(path)
        require(info["triangles"] == asset["triangles"], f"Triangle count mismatch: {asset['path']}")
        require(info["nodes"] == 1 and info["meshes"] == 1 and info["animations"] == 0,
                f"Specimen structure changed: {asset['path']}")
        report[asset["path"]] = info
    return report


def normalize(source: dict, locks: dict) -> dict:
    validate_source(source, locks)
    catalog = copy.deepcopy(source)
    by_key = {(a["specimenId"], a["variant"]): a for a in locks["assets"]}
    for specimen in catalog["specimens"]:
        for variant in ("preview", "detail"):
            asset = by_key[(specimen["id"], variant)]
            specimen[variant] = {key: asset[key] for key in ("path", "sha256", "bytes", "triangles")}
    return catalog


def export(root: Path, source: dict, locks: dict) -> dict:
    report = inspect_assets(root, locks)
    catalog = normalize(source, locks)
    canonicalize_source_text(root)
    base = root / "data/artifacts"
    write_json(base / "catalog.json", catalog)
    files = [{"path": "catalog.json", "sha256": sha256(base / "catalog.json"),
              "bytes": (base / "catalog.json").stat().st_size}]
    for asset in locks["assets"]:
        relative = safe_relative(asset["path"])
        target = base / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / "data/raw" / relative, target)
        files.append({key: asset[key] for key in ("path", "sha256", "bytes")})
    manifest = {"schemaVersion": 1, "pipelineVersion": PIPELINE_VERSION,
                "catalogSourceSha256": sha256(root / "data/sources/catalog-source.json"),
                "assetLockSha256": sha256(root / "data/sources/assets.lock.json"),
                "license": "CC0-1.0 for Smithsonian GLBs; original authored catalog content is separate",
                "counts": {"specimens": len(catalog["specimens"]), "structures": len(catalog["structures"]),
                           "journeys": len(catalog["journeys"]), "assets": len(locks["assets"])},
                "files": sorted(files, key=lambda item: item["path"]), "inspection": report}
    write_json(root / "manifests/catalog.json", manifest)
    return manifest


def verify(root: Path, source: dict, locks: dict) -> dict:
    validate_source(source, locks)
    manifest = read_json(root / "manifests/catalog.json")
    require(manifest.get("schemaVersion") == 1 and manifest.get("pipelineVersion") == PIPELINE_VERSION,
            "Unsupported manifest")
    require(manifest.get("catalogSourceSha256") == sha256(root / "data/sources/catalog-source.json"),
            "Source changed since export")
    require(manifest.get("assetLockSha256") == sha256(root / "data/sources/assets.lock.json"),
            "Asset lock changed since export")
    base = root / "data/artifacts"
    require((base / "catalog.json").read_bytes() == encoded(normalize(source, locks)), "Catalog export is stale")
    expected = {"catalog.json"} | {asset["path"] for asset in locks["assets"]}
    require({item["path"] for item in manifest.get("files", [])} == expected, "Manifest artifact set mismatch")
    actual = {str(path.relative_to(base).as_posix()) for path in base.rglob("*")
              if path.is_file() and path.name != ".gitkeep"}
    micro_files = {"micro-atlas.json", "micro-atlas.integrity.json"}
    # Legacy processing sandboxes can omit the independent micro atlas. The actual
    # checkout requires it, and partial extensions never bypass verification.
    with_micro = (root.resolve() == Path(__file__).resolve().parents[1]
                  or (root / "data/sources/micro-atlas.json").exists()
                  or bool(actual & micro_files))
    living_files = {"living-content.json", "living-content.integrity.json"}
    with_living = (root.resolve() == Path(__file__).resolve().parents[1]
                   or (root / "data/sources/living-content.json").exists()
                   or bool(actual & living_files))
    allowed = expected | (micro_files if with_micro else set()) | (living_files if with_living else set())
    require(actual == allowed, f"Unexpected or missing artifact files: {actual ^ allowed}")
    if with_micro:
        spec = importlib.util.spec_from_file_location("floraria_micro_verify", Path(__file__).with_name("micro.py"))
        micro = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(micro)
        try:
            micro.run(root, "verify")
        except (ValueError, OSError, KeyError, TypeError, IndexError) as exc:
            raise PipelineError(f"Microscopic atlas verification failed: {exc}") from exc
    if with_living:
        spec = importlib.util.spec_from_file_location("floraria_living_verify", Path(__file__).with_name("living.py"))
        living = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(living)
        try:
            living.run(root, "verify")
        except (ValueError, OSError, KeyError, TypeError, IndexError) as exc:
            raise PipelineError(f"Living content verification failed: {exc}") from exc
    for item in manifest["files"]:
        checked_asset(base / safe_relative(item["path"]), item)
    require(inspect_assets(root, locks, artifact=True) == manifest.get("inspection"), "Inspection manifest mismatch")
    return manifest["counts"]


def run(root: Path, stage: str, offline: bool = False) -> dict:
    root = root.resolve()
    source, locks = load_inputs(root)
    validate_source(source, locks)
    if stage == "validate-source":
        return {"validated": True}
    if stage in {"all", "acquire"}:
        acquire(root, locks, offline)
        if stage == "acquire":
            return {"acquired": len(locks["assets"])}
    if stage == "inspect":
        return inspect_assets(root, locks)
    if stage == "normalize":
        inspect_assets(root, locks)
        normalized = normalize(source, locks)
        write_json(root / "data/raw/catalog.normalized.json", normalized)
        return {"normalized": True}
    if stage in {"all", "export"}:
        export(root, source, locks)
        for module_name, filename in (("micro", "micro-atlas.json"), ("living", "living-content.json")):
            if (root / "data/sources" / filename).exists():
                spec = importlib.util.spec_from_file_location("floraria_content_export_" + module_name, Path(__file__).with_name(module_name + ".py"))
                content = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(content)
                content.run(root, "export")
    if stage in {"all", "export", "verify"}:
        return verify(root, source, locks)
    raise PipelineError(f"Unknown stage: {stage}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("stage", nargs="?", default="all", choices=STAGES)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--offline", action="store_true", help="Reject missing cached inputs; never fetch")
    args = parser.parse_args()
    try:
        result = run(args.root, args.stage, args.offline)
    except (PipelineError, OSError, KeyError, TypeError, IndexError) as exc:
        print(f"FLORARIA pipeline failed: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({"stage": args.stage, "result": result}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
