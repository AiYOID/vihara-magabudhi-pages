#!/usr/bin/env python3
"""Extract vihara/cetiya data from the source .docx into data/vihara.json.

Usage: python3 scripts/extract.py ["Alamat Vihara Cetiya se Banten.docx"]
"""
import json
import re
import sys
from pathlib import Path

import docx
from docx.table import Table
from docx.text.paragraph import Paragraph

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = ROOT / "Alamat Vihara Cetiya se Banten.docx"
OUTPUT = ROOT / "data" / "vihara.json"

REGION_RE = re.compile(r"Magabudhi\s+(PC\s+.+)$", re.I)
PHONE_RE = re.compile(r"\+?\d[\d\- ]{5,}\d")
URL_RE = re.compile(r"https?://\S+")


def clean(text):
    return re.sub(r"\s+", " ", text).strip()


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse_contacts(cell_text):
    contacts = []
    for line in cell_text.splitlines():
        line = clean(line)
        match = PHONE_RE.search(line)
        if not match:
            continue
        name = line[: match.start()]
        name = re.sub(r"^Telp\.?", "", name, flags=re.I)
        name = name.strip(" -–—:")
        contacts.append({"name": name, "phone": match.group().strip()})
    return contacts


def iter_blocks(document):
    for child in document.element.body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            yield Paragraph(child, document)
        elif tag == "tbl":
            yield Table(child, document)


def extract(source):
    document = docx.Document(source)
    regions = []
    current = None
    used_ids = set()

    for block in iter_blocks(document):
        if isinstance(block, Paragraph):
            match = REGION_RE.search(clean(block.text))
            if match:
                pc = match.group(1)
                current = {
                    "id": slugify(pc.removeprefix("PC ")),
                    "name": pc.removeprefix("PC "),
                    "pc": pc,
                    "items": [],
                }
                regions.append(current)
            continue

        if current is None:
            continue

        for row in block.rows[1:]:
            cells = [c.text for c in row.cells]
            name = clean(cells[1])
            if not name:
                continue
            item_id = slugify(name)
            while item_id in used_ids:
                item_id += "-2"
            used_ids.add(item_id)
            maps = URL_RE.search(cells[4]) if len(cells) > 4 else None
            current["items"].append(
                {
                    "id": item_id,
                    "no": int(re.sub(r"\D", "", cells[0]) or 0),
                    "name": name,
                    "address": clean(cells[2]),
                    "contacts": parse_contacts(cells[3]),
                    "maps": maps.group() if maps else "",
                }
            )

    return {
        "title": "Vihara Binaan Magabudhi Banten",
        "source": Path(source).name,
        "regions": regions,
    }


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    data = extract(source)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(r["items"]) for r in data["regions"])
    print(f"Wrote {OUTPUT.relative_to(ROOT)}: {total} entries in {len(data['regions'])} regions")
    for region in data["regions"]:
        missing = [i["name"] for i in region["items"] if not i["maps"]]
        print(f"  {region['pc']}: {len(region['items'])}" + (f" (no map: {', '.join(missing)})" if missing else ""))


if __name__ == "__main__":
    main()
