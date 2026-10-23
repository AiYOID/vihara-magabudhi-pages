// Helpers shared by the directory (app.js) and the schedule (jadwal.js).
(function () {
  "use strict";

  const ICONS = {
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
  };

  const TZ = "Asia/Jakarta";
  const DATE_FORMATS = {
    long: new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ }),
    short: new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }),
    day: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: TZ }),
    month: new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: TZ }),
  };

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

  // "2026-10-31" -> "Sabtu, 31 Oktober 2026" (long), "Sab, 31 Okt" (short), "31 Okt" (day), "Oktober" (month).
  function formatDate(iso, style) {
    return DATE_FORMATS[style].format(new Date(iso + "T12:00:00+07:00"));
  }

  // Today's date in WIB as "YYYY-MM-DD", comparable with the dates in the data.
  function today() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  }

  let toastTimer;
  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  async function share(title, text, id) {
    const url = location.origin + location.pathname + "#" + id;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
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

  function shareButton(name, title, text, id) {
    const button = h("button", {
      class: "icon-btn",
      type: "button",
      "aria-label": "Bagikan tautan " + name,
      title: "Bagikan tautan",
      html: ICONS.share,
    });
    button.addEventListener("click", () => share(title, text, id));
    return button;
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

  function mapsButton(href) {
    return h("a", { class: "maps-btn", href, target: "_blank", rel: "noopener", html: ICONS.map + "<span>Buka di Google Maps</span>" });
  }

  // Scrolls to the card named in the URL hash; reveal() must unhide it first if filters hid it.
  function focusHash(event, reveal) {
    const id = decodeURIComponent(location.hash.slice(1));
    const card = id && document.getElementById(id);
    if (!card || !card.classList.contains("card")) return;
    if (card.hidden) reveal();
    card.scrollIntoView({ behavior: event ? "smooth" : "auto", block: "center" });
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 2400);
  }

  function centerChip(chips, chip) {
    chips.scrollLeft = chip.offsetLeft - (chips.clientWidth - chip.offsetWidth) / 2;
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }

  window.Vihara = {
    ICONS, h, normalize, digits, formatDate, today, share, shareButton,
    renderContact, mapsButton, focusHash, centerChip, loadJSON,
  };
})();
