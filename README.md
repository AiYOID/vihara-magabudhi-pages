# Vihara Binaan Magabudhi Banten

Static GitHub Pages site listing the vihara & cetiya under Magabudhi Banten, with address, contacts (call / WhatsApp) and a Google Maps link for each one.

## Links

- Whole list: `https://<user>.github.io/<repo>/`
- One region: `…/?pc=kota-tangerang` (also `kota-tangerang-selatan`, `kabupaten-tangerang`, `kota-serang`, `kabupaten-pandeglang`)
- One vihara: `…/#vihara-dharma-ratna` (the share button on each card copies this link)

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
