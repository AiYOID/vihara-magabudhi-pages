# Vihara Binaan Magabudhi Banten

Static GitHub Pages site listing the vihara & cetiya under Magabudhi Banten, with address, contacts (call / WhatsApp) and a Google Maps link for each one, plus the Kathinadana – Sanghadana 2026 schedule of Padesanayaka Provinsi Banten.

## Links

- Whole list: `https://<user>.github.io/<repo>/`
- One region: `…/?pc=kota-tangerang` (also `kota-tangerang-selatan`, `kabupaten-tangerang`, `kota-serang`, `kabupaten-pandeglang`)
- One vihara: `…/#vihara-dharma-ratna` (the share button on each card copies this link)
- Sanghadana schedule: `…/jadwal.html` (opens on upcoming events; `?f=semua`, `?f=2026-10` or `?f=2026-11` for all events or one month)
- One event: `…/jadwal.html#vihara-dharma-ratna`

## Sanghadana schedule

`data/sanghadana-2026.json` was typed in from `INFORMASI SANGHADANA BANTEN 2026.pdf` (an image, so there is nothing to extract automatically; the PDF is kept out of the repository like the .docx). Edit the JSON directly when the schedule changes. Each event has `date` (YYYY-MM-DD), `time` (WIB), `venue`, `address`, `dhammadesana` (`null` when the PDF shows "-"), one pengurus `contact`, and `vihara`: the id of the matching card in `data/vihara.json`, or `null` if the venue is not in the directory. Linked events borrow that card's Google Maps pin and show up as a date link on the card; an optional `maps` URL overrides the pin (used where the event is held elsewhere), and unlinked events fall back to a Google Maps search of the address.

## Updating the data

The list comes from `Alamat Vihara Cetiya se Banten.docx`, which is kept out of the repository (`*.docx` is gitignored). Put the document in the project root, edit it, then regenerate `data/vihara.json`:

```sh
pip install python-docx
python3 scripts/extract.py
```

The script expects one heading paragraph per region ("… Magabudhi PC <region>") followed by a table with the columns No, Nama, Alamat, CP & No HP, Map. Small fixes can also be made directly in `data/vihara.json`.

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish

Push to GitHub, then go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
