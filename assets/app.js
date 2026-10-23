(function () {
  "use strict";

  const { ICONS, h, normalize, digits, formatDate, shareButton, renderContact, mapsButton, focusHash, centerChip, loadJSON } = window.Vihara;
  const $ = (sel) => document.querySelector(sel);

  const els = {
    list: $("#list"),
    search: $("#search"),
    chips: $("#chips"),
    count: $("#count"),
    empty: $("#empty"),
    stats: $("#stats"),
    source: $("#source"),
  };

  const state = { region: "all", query: "", cards: [], sections: [], events: {} };

  function renderEventLink(event) {
    const link = h("a", { class: "event-link", href: "jadwal.html#" + event.id, html: ICONS.calendar });
    link.append(h("span", {}, [
      h("b", { text: "Sanghadana" }),
      document.createTextNode(" " + formatDate(event.date, "short") + " · " + event.time + " WIB"),
    ]));
    return link;
  }

  function renderCard(item, region) {
    const contacts = item.contacts.length
      ? h("ul", { class: "contacts" }, item.contacts.map(renderContact))
      : h("p", { class: "contacts no-contact", text: "Kontak belum tersedia" });

    const card = h("article", { class: "card", id: item.id }, [
      h("div", { class: "card-head" }, [
        h("span", { class: "num", text: String(item.no) }),
        h("h3", { class: "name", text: item.name }),
        shareButton(item.name, item.name, item.name + " — " + item.address, item.id),
      ]),
      h("p", { class: "address", text: item.address }),
      ...(state.events[item.id] || []).map(renderEventLink),
      contacts,
      item.maps ? mapsButton(item.maps) : null,
    ]);

    const haystack = [item.name, item.address, region.name]
      .concat(item.contacts.map((c) => c.name + " " + c.phone + " " + digits(c.phone)))
      .join(" ");
    state.cards.push({ el: card, region: region.id, text: normalize(haystack) });
    return card;
  }

  function renderChips(regions, total) {
    const options = [{ id: "all", name: "Semua", count: total }].concat(
      regions.map((r) => ({ id: r.id, name: r.name, count: r.items.length }))
    );
    for (const option of options) {
      const chip = h("button", { class: "chip", type: "button", "data-region": option.id, "aria-pressed": "false" }, [
        document.createTextNode(option.name),
        h("small", { text: String(option.count) }),
      ]);
      chip.addEventListener("click", () => setRegion(option.id, true));
      els.chips.append(chip);
    }
  }

  function render(data) {
    const total = data.regions.reduce((sum, r) => sum + r.items.length, 0);
    els.source.textContent = data.source.replace(/\.docx$/i, "");
    els.stats.append(
      h("span", { text: total + " vihara & cetiya" }),
      h("span", { text: data.regions.length + " wilayah PC" })
    );
    els.stats.hidden = false;

    renderChips(data.regions, total);

    for (const region of data.regions) {
      const countEl = h("small");
      const section = h("section", { class: "region", "data-region": region.id, "aria-labelledby": "h-" + region.id }, [
        h("h2", { id: "h-" + region.id }, [document.createTextNode(region.pc), countEl]),
        h("div", { class: "grid" }, region.items.map((item) => renderCard(item, region))),
      ]);
      state.sections.push({ el: section, id: region.id, countEl });
      els.list.append(section);
    }
    state.total = total;
  }

  function applyFilter() {
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    let shown = 0;
    const perRegion = {};
    for (const card of state.cards) {
      const visible =
        (state.region === "all" || card.region === state.region) &&
        terms.every((t) => card.text.includes(t));
      card.el.hidden = !visible;
      if (visible) {
        shown++;
        perRegion[card.region] = (perRegion[card.region] || 0) + 1;
      }
    }
    for (const section of state.sections) {
      const n = perRegion[section.id] || 0;
      section.el.hidden = n === 0;
      section.countEl.textContent = n;
    }
    for (const chip of els.chips.children) {
      const active = chip.dataset.region === state.region;
      chip.setAttribute("aria-pressed", String(active));
      if (active) centerChip(els.chips, chip);
    }
    els.empty.hidden = shown > 0;
    els.count.textContent = shown === state.total
      ? "Menampilkan semua " + shown + " vihara & cetiya"
      : "Menampilkan " + shown + " dari " + state.total;
  }

  function setRegion(id, updateUrl) {
    state.region = id;
    applyFilter();
    if (updateUrl) {
      const url = new URL(location.href);
      url.hash = "";
      if (id === "all") url.searchParams.delete("pc");
      else url.searchParams.set("pc", id);
      history.replaceState(null, "", url);
    }
  }

  function revealAll() {
    state.query = "";
    els.search.value = "";
    setRegion("all", false);
  }

  async function init() {
    // The schedule only adds a date link to cards, so the directory still renders without it.
    const [directory, schedule] = await Promise.allSettled([
      loadJSON("data/vihara.json"),
      loadJSON("data/sanghadana-2026.json"),
    ]);
    if (directory.status === "rejected") {
      els.count.textContent = "Gagal memuat data. Jika membuka file secara lokal, jalankan server lokal (mis. python3 -m http.server).";
      return;
    }
    if (schedule.status === "fulfilled") {
      for (const event of schedule.value.events) {
        if (event.vihara) (state.events[event.vihara] ||= []).push(event);
      }
    }
    render(directory.value);

    const pc = new URLSearchParams(location.search).get("pc");
    if (pc && state.sections.some((s) => s.id === pc)) state.region = pc;
    applyFilter();

    els.search.addEventListener("input", () => {
      state.query = els.search.value;
      applyFilter();
    });
    window.addEventListener("hashchange", (event) => focusHash(event, revealAll));
    focusHash(null, revealAll);
  }

  init();
})();
