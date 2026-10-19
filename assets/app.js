(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const els = {
    list: $("#list"),
    search: $("#search"),
    chips: $("#chips"),
    count: $("#count"),
    empty: $("#empty"),
    stats: $("#stats"),
    source: $("#source"),
    toast: $("#toast"),
  };

  const ICONS = {
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  };

  const state = { region: "all", query: "", cards: [], sections: [] };

  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === "html") node.innerHTML = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of [].concat(children || [])) {
      if (child) node.append(child);
    }
    return node;
  }

  function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function digits(phone) {
    return phone.replace(/\D/g, "");
  }

  function isMobile(phone) {
    const d = digits(phone);
    return d.startsWith("08") || d.startsWith("628");
  }

  function waLink(phone) {
    const d = digits(phone);
    return "https://wa.me/" + (d.startsWith("0") ? "62" + d.slice(1) : d);
  }

  function itemUrl(id) {
    return location.origin + location.pathname + "#" + id;
  }

  let toastTimer;
  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  async function share(item) {
    const url = itemUrl(item.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: item.name, text: item.name + " — " + item.address, url });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Tautan disalin");
    } catch (err) {
      prompt("Salin tautan ini:", url);
    }
  }

  function renderContact(contact) {
    const label = contact.name || "Telp.";
    const actions = [
      h("a", { class: "icon-btn", href: "tel:" + digits(contact.phone), "aria-label": "Telepon " + label, html: ICONS.phone }),
    ];
    if (isMobile(contact.phone)) {
      actions.push(h("a", {
        class: "icon-btn wa",
        href: waLink(contact.phone),
        target: "_blank",
        rel: "noopener",
        "aria-label": "WhatsApp " + label,
        html: ICONS.chat,
      }));
    }
    return h("li", { class: "contact" }, [
      h("div", { class: "contact-text" }, [
        h("b", { text: label }),
        document.createTextNode(" "),
        h("span", { text: contact.phone }),
      ]),
      ...actions,
    ]);
  }

  function renderCard(item, region) {
    const shareBtn = h("button", {
      class: "icon-btn",
      type: "button",
      "aria-label": "Bagikan tautan " + item.name,
      title: "Bagikan tautan",
      html: ICONS.share,
    });
    shareBtn.addEventListener("click", () => share(item));

    const contacts = item.contacts.length
      ? h("ul", { class: "contacts" }, item.contacts.map(renderContact))
      : h("p", { class: "contacts no-contact", text: "Kontak belum tersedia" });

    const maps = item.maps
      ? h("a", { class: "maps-btn", href: item.maps, target: "_blank", rel: "noopener", html: ICONS.map + "<span>Buka di Google Maps</span>" })
      : null;

    const card = h("article", { class: "card", id: item.id }, [
      h("div", { class: "card-head" }, [
        h("span", { class: "num", text: String(item.no) }),
        h("h3", { class: "name", text: item.name }),
        shareBtn,
      ]),
      h("p", { class: "address", text: item.address }),
      contacts,
      maps,
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
      if (active) {
        els.chips.scrollLeft = chip.offsetLeft - (els.chips.clientWidth - chip.offsetWidth) / 2;
      }
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

  function focusHash(event) {
    const id = decodeURIComponent(location.hash.slice(1));
    const card = id && document.getElementById(id);
    if (!card || !card.classList.contains("card")) return;
    if (card.hidden) {
      state.query = "";
      els.search.value = "";
      setRegion("all", false);
    }
    card.scrollIntoView({ behavior: event ? "smooth" : "auto", block: "center" });
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 2400);
  }

  async function init() {
    try {
      const res = await fetch("data/vihara.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      render(await res.json());
    } catch (err) {
      els.count.textContent = "Gagal memuat data. Jika membuka file secara lokal, jalankan server lokal (mis. python3 -m http.server).";
      return;
    }

    const pc = new URLSearchParams(location.search).get("pc");
    if (pc && state.sections.some((s) => s.id === pc)) state.region = pc;
    applyFilter();

    els.search.addEventListener("input", () => {
      state.query = els.search.value;
      applyFilter();
    });
    window.addEventListener("hashchange", focusHash);
    focusHash();
  }

  init();
})();
