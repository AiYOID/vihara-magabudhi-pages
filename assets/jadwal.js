(function () {
  "use strict";

  const { h, normalize, digits, formatDate, today, shareButton, renderContact, mapsButton, focusHash, centerChip, loadJSON } = window.Vihara;
  const $ = (sel) => document.querySelector(sel);

  const els = {
    list: $("#list"),
    search: $("#search"),
    chips: $("#chips"),
    count: $("#count"),
    empty: $("#empty"),
    stats: $("#stats"),
  };

  const state = { filter: "semua", query: "", cards: [], sections: [], filters: [] };

  function mapsUrl(event, vihara) {
    if (event.maps) return event.maps;
    if (vihara && vihara.maps) return vihara.maps;
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(event.venue + ", " + event.address);
  }

  function renderCard(event, vihara, now) {
    const when = formatDate(event.date, "long") + ", " + event.time + " WIB";
    const card = h("article", { class: "card" + (event.date < now ? " past" : ""), id: event.id }, [
      h("div", { class: "card-head" }, [
        h("span", { class: "time", text: event.time, title: event.time + " WIB" }),
        h("h3", { class: "name", text: event.venue }),
        shareButton(event.venue, "Sanghadana " + event.venue, "Sanghadana " + event.venue + " — " + when, event.id),
      ]),
      h("p", { class: "address", text: event.address }),
      event.dhammadesana
        ? h("p", { class: "desana" }, [h("span", { text: "Dhammadesana" }), document.createTextNode(event.dhammadesana)])
        : null,
      h("ul", { class: "contacts" }, [renderContact(event.contact)]),
      mapsButton(mapsUrl(event, vihara)),
    ]);

    const haystack = [
      event.venue, event.address, event.dhammadesana || "", when,
      event.contact.name, event.contact.phone, digits(event.contact.phone),
      vihara ? vihara.name : "",
    ].join(" ");
    state.cards.push({ el: card, date: event.date, text: normalize(haystack) });
    return card;
  }

  function renderChips(events, now) {
    const months = [...new Set(events.map((e) => e.date.slice(0, 7)))];
    state.filters = [
      { id: "mendatang", name: "Mendatang", test: (date) => date >= now },
      { id: "semua", name: "Semua", test: () => true },
    ].concat(months.map((month) => ({
      id: month,
      name: formatDate(month + "-01", "month"),
      test: (date) => date.startsWith(month),
    })));

    for (const filter of state.filters) {
      const count = events.filter((e) => filter.test(e.date)).length;
      const chip = h("button", { class: "chip", type: "button", "data-filter": filter.id, "aria-pressed": "false" }, [
        document.createTextNode(filter.name),
        h("small", { text: String(count) }),
      ]);
      chip.addEventListener("click", () => setFilter(filter.id, true));
      els.chips.append(chip);
    }
  }

  function render(data, directory) {
    const now = today();
    const viharas = {};
    for (const region of directory ? directory.regions : []) {
      for (const item of region.items) viharas[item.id] = item;
    }

    els.stats.append(
      h("span", { text: data.events.length + " acara" }),
      h("span", { text: formatDate(data.start, "day") + " – " + formatDate(data.end, "day") + " " + data.end.slice(0, 4) })
    );
    els.stats.hidden = false;

    renderChips(data.events, now);

    const days = new Map();
    for (const event of data.events) {
      if (!days.has(event.date)) days.set(event.date, []);
      days.get(event.date).push(event);
    }
    for (const [date, events] of days) {
      const countEl = h("small");
      const tag = date === now ? h("span", { class: "tag", text: "Hari ini" })
        : date < now ? h("span", { class: "tag muted", text: "Selesai" })
        : null;
      const section = h("section", { class: "region", "aria-labelledby": "h-" + date }, [
        h("h2", { id: "h-" + date }, [document.createTextNode(formatDate(date, "long")), countEl, tag]),
        h("div", { class: "grid" }, events.map((e) => renderCard(e, viharas[e.vihara], now))),
      ]);
      state.sections.push({ el: section, date, countEl });
      els.list.append(section);
    }
    state.total = data.events.length;
    state.upcoming = data.events.filter((e) => e.date >= now).length;
  }

  function applyFilter() {
    const filter = state.filters.find((f) => f.id === state.filter);
    const terms = normalize(state.query).split(/\s+/).filter(Boolean);
    let shown = 0;
    const perDay = {};
    for (const card of state.cards) {
      const visible = filter.test(card.date) && terms.every((t) => card.text.includes(t));
      card.el.hidden = !visible;
      if (visible) {
        shown++;
        perDay[card.date] = (perDay[card.date] || 0) + 1;
      }
    }
    for (const section of state.sections) {
      const n = perDay[section.date] || 0;
      section.el.hidden = n === 0;
      section.countEl.textContent = n;
    }
    for (const chip of els.chips.children) {
      const active = chip.dataset.filter === state.filter;
      chip.setAttribute("aria-pressed", String(active));
      if (active) centerChip(els.chips, chip);
    }
    els.empty.hidden = shown > 0;
    els.count.textContent = shown === state.total
      ? "Menampilkan semua " + shown + " acara"
      : "Menampilkan " + shown + " dari " + state.total + " acara";
  }

  function setFilter(id, updateUrl) {
    state.filter = id;
    applyFilter();
    if (updateUrl) {
      const url = new URL(location.href);
      url.hash = "";
      url.searchParams.set("f", id);
      history.replaceState(null, "", url);
    }
  }

  function revealAll() {
    state.query = "";
    els.search.value = "";
    setFilter("semua", false);
  }

  async function init() {
    // The directory only supplies Google Maps pins, so the schedule still renders without it.
    const [schedule, directory] = await Promise.allSettled([
      loadJSON("data/sanghadana-2026.json"),
      loadJSON("data/vihara.json"),
    ]);
    if (schedule.status === "rejected") {
      els.count.textContent = "Gagal memuat data. Jika membuka file secara lokal, jalankan server lokal (mis. python3 -m http.server).";
      return;
    }
    render(schedule.value, directory.value);

    const f = new URLSearchParams(location.search).get("f");
    if (f && state.filters.some((filter) => filter.id === f)) state.filter = f;
    else if (state.upcoming > 0) state.filter = "mendatang";
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
