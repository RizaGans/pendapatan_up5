export async function startApp() {
  const root = document.querySelector(".app");
  if (!root || root.dataset.on) return;
  root.dataset.on = "1";
  const sidebarToggle = document.querySelector("#sidebarToggle");
  const syncSidebarToggle = () => {
    const isMobile = window.matchMedia("(max-width: 980px)").matches;
    const isOpen = isMobile
      ? root.classList.contains("sidebar-open")
      : !root.classList.contains("sidebar-collapsed");
    sidebarToggle?.setAttribute("aria-expanded", String(isOpen));
    sidebarToggle?.setAttribute("aria-label", isOpen ? "Tutup sidebar" : "Buka sidebar");
  };
  sidebarToggle?.addEventListener("click", () => {
    const isMobile = window.matchMedia("(max-width: 980px)").matches;
    if (isMobile) {
      root.classList.toggle("sidebar-open");
    } else {
      root.classList.toggle("sidebar-collapsed");
    }
    syncSidebarToggle();
    const logo = sidebarToggle.querySelector("img");
    const isOpen = sidebarToggle.getAttribute("aria-expanded") === "true";
    if (logo && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      logo.animate(
        [
          { transform: "perspective(500px) rotateY(0deg) rotateX(0deg) scale(1)" },
          { transform: `perspective(500px) rotateY(${isOpen ? 90 : -90}deg) rotateX(${isOpen ? -18 : 18}deg) scale(1.16)`, offset: 0.48 },
          { transform: "perspective(500px) rotateY(0deg) rotateX(0deg) scale(1)" },
        ],
        { duration: 620, easing: "cubic-bezier(.22,1,.36,1)" },
      );
    }
  });
  window.addEventListener("resize", syncSidebarToggle);
  syncSidebarToggle();
  document.querySelector("#logoutButton")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sesi gagal diakhiri");
      window.location.assign("/login");
    } catch (error) {
      button.disabled = false;
      toast(error.message || "Sesi gagal diakhiri");
    }
  });
  const manualSaveButton = document.createElement("button");
  manualSaveButton.type = "button";
  manualSaveButton.id = "saveManual";
  manualSaveButton.className = "btn primary";
  manualSaveButton.textContent = "Simpan input";
  manualSaveButton.disabled = true;
  const manualRowToolbar = document.createElement("div");
  manualRowToolbar.className = "manual-row-toolbar";
  const manualRowSelectLabel = document.createElement("label");
  manualRowSelectLabel.textContent = "Uraian project";
  const manualRowSelect = document.createElement("select");
  manualRowSelect.id = "manualRowSelect";
  manualRowSelect.setAttribute("aria-label", "Pilih uraian project untuk diedit atau dihapus");
  manualRowSelectLabel.append(manualRowSelect);
  const addManualRowButton = document.createElement("button");
  addManualRowButton.type = "button";
  addManualRowButton.id = "addManualRow";
  addManualRowButton.className = "btn o";
  addManualRowButton.textContent = "+ Tambah uraian";
  const editManualRowButton = document.createElement("button");
  editManualRowButton.type = "button";
  editManualRowButton.className = "btn o";
  editManualRowButton.textContent = "Edit uraian";
  editManualRowButton.disabled = true;
  const deleteManualRowButton = document.createElement("button");
  deleteManualRowButton.type = "button";
  deleteManualRowButton.className = "btn o manual-delete-row";
  deleteManualRowButton.textContent = "Hapus uraian";
  deleteManualRowButton.disabled = true;
  const manualRowActions = document.createElement("div");
  manualRowActions.className = "manual-row-actions";
  manualRowActions.append(addManualRowButton, editManualRowButton, deleteManualRowButton);
  const manualSaveActions = document.createElement("div");
  manualSaveActions.className = "manual-save-actions";
  const manualSaveNotice = document.createElement("p");
  manualSaveNotice.id = "manualSaveNotice";
  manualSaveNotice.className = "note";
  manualSaveNotice.setAttribute("role", "status");
  manualSaveNotice.textContent = "Belum ada perubahan yang menunggu disimpan.";
  const manualGrid = root.querySelector(".manual-grid-card");
  manualSaveActions.append(manualSaveButton);
  manualRowToolbar.append(manualRowSelectLabel, manualRowActions, manualSaveActions);
  manualGrid?.before(manualRowToolbar, manualSaveNotice);
  root.querySelectorAll("#dash .gr > .cd").forEach((card) => {
    card.classList.add("interactive-card");
    const metricStyle = {
      k0: "metric-contract",
      k1: "metric-realization",
      k2: "metric-unabsorbed",
      k3: "metric-fine",
    }[card.id];
    if (metricStyle) card.classList.add(metricStyle);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    const label = card.querySelector("h3")?.textContent || "Ringkasan";
    card.setAttribute("aria-label", `${label}. Perbesar tampilan kartu.`);
  });
  const cardModal = document.createElement("div");
  cardModal.className = "dashboard-card-modal";
  cardModal.hidden = true;
  cardModal.innerHTML =
    '<div class="dashboard-card-modal__panel" role="dialog" aria-modal="true" aria-label="Tampilan grafik diperbesar"><button type="button" class="dashboard-card-modal__close" aria-label="Tutup tampilan grafik">×</button><div class="dashboard-card-modal__content"></div></div>';
  root.append(cardModal);
  const closeCardModal = () => {
    cardModal.hidden = true;
    cardModal.querySelector(".dashboard-card-modal__content").replaceChildren();
    cardModalReturnFocus?.focus();
  };
  let cardModalReturnFocus = null;
  cardModal.addEventListener("click", (event) => {
    if (
      event.target === cardModal ||
      event.target.closest(".dashboard-card-modal__close")
    )
      closeCardModal();
  });
  document.addEventListener("keydown", (event) => {
    if (!cardModal.hidden && event.key === "Escape") closeCardModal();
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest(
      ".manual-grid-card button[data-scroll-table]",
    );
    if (button) {
      const scroller = button
        .closest(".manual-grid-card")
        ?.querySelector(".sc");
      if (scroller)
        scroller.scrollBy({
          left: Number(button.dataset.scrollTable) * scroller.clientWidth * 0.8,
          behavior: "smooth",
        });
      return;
    }
    const card = event.target.closest("#dash .gr > .cd.interactive-card");
    if (
      !card ||
      event.target.closest("[data-p], select, button, input, textarea, a")
    )
      return;
    openDashboardDetails(card);
  });
  root.addEventListener("keydown", (event) => {
    const card = event.target.closest("#dash .gr > .cd.interactive-card");
    if (
      !card ||
      event.target.closest("select, button, input, textarea, a") ||
      !["Enter", " "].includes(event.key)
    )
      return;
    event.preventDefault();
    openDashboardDetails(card);
  });
  const load = async () => {
    const r = await fetch("/api/data", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    if (!Object.keys(j).length) j[new Date().getFullYear()] = [];
    return j;
  };
  let D;
  try {
    D = await load();
  } catch (e) {
    document
      .querySelector("main")
      .insertAdjacentHTML(
        "afterbegin",
        '<div class="cd" style="margin-bottom:16px;border-color:var(--dn)"><b>Tidak bisa terhubung ke database.</b><br>Pastikan MySQL di XAMPP menyala dan perintah npm run seed sudah dijalankan. Pesan: ' +
          e.message +
          "</div>",
      );
    return;
  }
  const reload = async () => {
    const n = await load();
    Object.keys(D).forEach((y) => delete D[y]);
    Object.assign(D, n);
    years();
    fill();
    renderData();
  };
  const pendingManual = new Map();
  const updateManualSaveNotice = () => {
    const count = pendingManual.size;
    manualSaveButton.disabled = count === 0;
    manualSaveNotice.textContent = count
      ? `${count} perubahan belum tersimpan. Tekan tombol Simpan input untuk melanjutkan.`
      : "Semua perubahan input manual sudah tersimpan.";
  };
  const api = (pn, y, mi, k, v) => {
    const key = `${pn}:${y}:${mi}:${k}`;
    pendingManual.set(key, { project: pn, year: y, month: +mi, k, value: v });
    updateManualSaveNotice();
  };

  const MO = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ],
    NOW = 9;
  const ST = {
    b: ["Terbayar", "#3aa76d"],
    f: ["Terbit FP", "#e3b93c"],
    u: ["Verifikasi PLN UIT/UID", "#d9772f"],
    p: ["Verifikasi PLN UPT/UP2D", "#8b5fc0"],
    l: ["Verifikasi PLN ULTG/ULP", "#3b82c4"],
    h: ["Verifikasi HP Region", "#d4524a"],
  };
  const PAL = [
    "#17365d",
    "#315f91",
    "#83b9f5",
    "#6d8bab",
    "#a9d4ff",
    "#58708c",
    "#c6e3ff",
  ];
  const YEAR_COLORS = ["#858b91", "#526d82", "#83b9f5"];
  const $ = (s) => document.querySelector(s),
    S = {
      p: "ALL",
      a: 0,
      b: 11,
      ip: null,
      iy: Math.max(...Object.keys(D).map(Number)),
      ys: [Math.max(...Object.keys(D).map(Number))],
    };
  const unabsorbedFilters = { project: "ALL", year: null, month: "ALL" };
  const hasValues = (p) =>
    p?.m?.some(
      (m) => m.slice(0, 8).some((v) => Number(v) !== 0) || m[8] != null,
    );
  const nf = (n, d = 2) =>
    n.toLocaleString("id-ID", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  const fm = (n) =>
      Math.abs(n) >= 1e9 ? nf(n / 1e9) + " M" : nf(n / 1e6, 1) + " jt",
    fp = (n) => (n == null ? "-" : nf(n * 100, 1) + "%"),
    fr = (n) => "Rp " + nf(n, 0);
  const full = (n) => nf(n, 0),
    pct = (n) => (n == null ? "-" : nf(n * 100, 2) + "%");
  function years() {
    const ys = Object.keys(D)
      .map(Number)
      .sort((a, b) => b - a);
    ["#iy", "#yy"].forEach((id) => {
      const el = $(id),
        current = +(id === "#iy" ? S.iy : el.value || S.iy || 2026);
      el.innerHTML = ys
        .map((y) => `<option value="${y}">${y}</option>`)
        .join("");
      el.value = ys.includes(current) ? current : ys[0];
    });
    S.iy = +$("#iy").value;
    S.ys = S.ys.filter((y) => ys.includes(y));
    if (!S.ys.length) S.ys = [ys[0]];
    $("#yearFilters").innerHTML = ys
      .map(
        (y) =>
          `<label class="year-chip"><input type="checkbox" value="${y}" ${S.ys.includes(y) ? "checked" : ""}><span>${y}</span></label>`,
      )
      .join("");
  }
  const sel = (y) => D[y].filter((p) => S.p == "ALL" || p.n == S.p),
    rl = (m) => m[0] + m[1] + m[2] + m[6] + m[4] - m[5] - m[3],
    customEffect = (p, month) => (p.customRows || []).reduce((sum, row) => {
      const value = Number(row.values?.[month]) || 0;
      return sum + (row.operation === "subtract" ? -value : value);
    }, 0),
    realization = (p, month) => rl(p.m[month]) + customEffect(p, month),
    rg = () => {
      const r = [];
      for (let i = S.a; i <= S.b; i++) r.push(i);
      return r;
    };
  function agg(y, ps) {
    const o = { t1: 0, t2: 0, ln: 0, dn: 0, rw: 0, kk: 0, sp: 0, kt: 0, customAdd: 0, customSub: 0 };
    (ps || sel(y)).forEach((p) =>
      rg().forEach((i) => {
        const m = p.m[i];
        (p.customRows || []).forEach((row) => {
          const value = Number(row.values?.[i]) || 0;
          if (row.operation === "subtract") o.customSub += value;
          else o.customAdd += value;
        });
        o.t1 += m[0];
        o.t2 += m[1];
        o.ln += m[2];
        o.dn += m[3];
        o.rw += m[4];
        o.kk += m[5];
        o.sp += m[6];
        o.kt += m[7];
      }),
    );
    o.br = o.t1 + o.t2 + o.ln;
    o.re = o.br + o.rw + o.sp - o.kk - o.dn + o.customAdd - o.customSub;
    o.un = o.kt - o.re;
    o.pc = o.kt ? o.re / o.kt : null;
    o.sla = o.br ? (o.br - o.dn + o.rw) / o.br : null;
    return o;
  }
  const ser = (y, f) =>
    rg().map((i) => sel(y).reduce((a, p) => a + f(p.m[i], p, i), 0));
  const slaS = (y) =>
    rg().map((i) => {
      let b = 0,
        d = 0,
        r = 0;
      sel(y).forEach((p) => {
        const m = p.m[i];
        b += m[0] + m[1] + m[2];
        d += m[3];
        r += m[4];
      });
      return b ? (b - d + r) / b : null;
    });
  function renderUnabsorbedChart() {
    const availableYears = Object.keys(D)
      .map(Number)
      .sort((a, b) => b - a);
    if (!availableYears.includes(Number(unabsorbedFilters.year))) {
      unabsorbedFilters.year = String(
        availableYears.includes(S.iy) ? S.iy : availableYears[0],
      );
    }
    const availableProjects = (D[Number(unabsorbedFilters.year)] || [])
      .map((project) => project.n)
      .sort((a, b) => a.localeCompare(b, "id"));
    if (
      unabsorbedFilters.project !== "ALL" &&
      !availableProjects.includes(unabsorbedFilters.project)
    ) {
      unabsorbedFilters.project = "ALL";
    }

    $("#unabsorbedProjectFilter").innerHTML =
      `<option value="ALL">Semua project</option>${availableProjects.map((project) => `<option value="${html(project)}">${html(project)}</option>`).join("")}`;
    $("#unabsorbedYearFilter").innerHTML = availableYears
      .map((year) => `<option value="${year}">${year}</option>`)
      .join("");
    $("#unabsorbedMonthFilter").innerHTML =
      `<option value="ALL">Semua bulan</option>${MO.map((month, index) => `<option value="${index}">${month}</option>`).join("")}`;
    $("#unabsorbedProjectFilter").value = unabsorbedFilters.project;
    $("#unabsorbedYearFilter").value = unabsorbedFilters.year;
    $("#unabsorbedMonthFilter").value = unabsorbedFilters.month;

    const year = Number(unabsorbedFilters.year);
    const projects = (D[year] || []).filter(
      (project) =>
        unabsorbedFilters.project === "ALL" ||
        project.n === unabsorbedFilters.project,
    );
    const months =
      unabsorbedFilters.month === "ALL"
        ? Array.from({ length: 12 }, (_, index) => index)
        : [Number(unabsorbedFilters.month)];
    const values = months.map((index) =>
      projects.reduce(
        (sum, project) => sum + project.m[index][7] - realization(project, index),
        0,
      ),
    );
    const formatSigned = (value) => `${value < 0 ? "-" : ""}${fm(value)}`;

    $("#c9").innerHTML = cht({
      L: months.map((index) => MO[index]),
      H: 210,
      f: (value) => `${value < 0 ? "-" : ""}${nf(Math.abs(value) / 1e6, 0)} jt`,
      t: formatSigned,
      S: [{ n: String(year), c: "#657f9e", t: "b", v: values }],
    });
  }
  function chip(b, a, up, pp) {
    if (a == null || b == null || (!pp && !a))
      return '<i class="ch">tanpa pembanding</i>';
    const d = pp ? (b - a) * 100 : ((b - a) / Math.abs(a)) * 100,
      g = d >= 0 == !!up;
    return `<i class="ch ${Math.abs(d) < 0.05 ? "" : g ? "g" : "r"}">${d >= 0 ? "naik" : "turun"} ${nf(Math.abs(d), 1)}${pp ? " poin" : "%"}</i>`;
  }
  const sm = (p) =>
    p
      .map((q, i) =>
        i
          ? `C${(p[i - 1][0] + q[0]) / 2},${p[i - 1][1]} ${(p[i - 1][0] + q[0]) / 2},${q[1]} ${q[0]},${q[1]}`
          : `M${q[0]},${q[1]}`,
      )
      .join("");
  function cht(o) {
    const W = 560,
      H = o.H || 230,
      P = { l: 50, r: 10, t: 12, b: 26 },
      n = o.L.length;
    let al = [];
    o.S.forEach((s) => s.v.forEach((v) => v != null && al.push(v)));
    if (o.ref != null) al.push(o.ref);
    let mx = Math.max(...al, 1e-9),
      mn = o.z ? Math.min(...al) * 0.998 : Math.min(0, ...al);
    if (o.z) mx *= 1.002;
    if (o.stack)
      mx = Math.max(
        ...o.L.map((_, i) => o.S.reduce((a, s) => a + Math.max(s.v[i], 0), 0)),
        1,
      );
    const gw = (W - P.l - P.r) / n,
      X = (i) => P.l + gw * (i + 0.5),
      Y = (v) => P.t + ((mx - v) / (mx - mn || 1)) * (H - P.t - P.b);
    let s = "";
    for (let k = 0; k <= 4; k++) {
      const v = mn + ((mx - mn) * k) / 4,
        y = Y(v);
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" stroke="var(--ln)"/><text x="${P.l - 7}" y="${y + 4}" text-anchor="end">${o.f(v)}</text>`;
    }
    o.L.forEach(
      (l, i) =>
        (s += `<text x="${X(i)}" y="${H - 7}" text-anchor="middle">${l}</text>`),
    );
    const bs = o.S.filter((s) => s.t == "b"),
      bw = Math.min((gw * 0.75) / (o.stack ? 1 : bs.length || 1), 30),
      base = Array(n).fill(0);
    bs.forEach((sr, j) =>
      sr.v.forEach((v, i) => {
        const x = o.stack
            ? X(i) - bw / 2
            : X(i) - (bw * bs.length) / 2 + j * bw,
          a = o.stack ? base[i] : 0,
          b = a + v;
        if (o.stack) base[i] = b;
        s += `<rect x="${x}" y="${Y(Math.max(a, b))}" width="${bw - 1.5}" height="${Math.abs(Y(a) - Y(b))}" rx="5" fill="${sr.c}"/>`;
      }),
    );
    o.S.filter((s) => s.t == "l").forEach((sr) => {
      const pt = sr.v
        .map((v, i) => (v == null ? null : [X(i), Y(v)]))
        .filter(Boolean);
      if (!pt.length) return;
      if (sr.a)
        s += `<path d="${sm(pt)}L${pt[pt.length - 1][0]},${Y(mn)}L${pt[0][0]},${Y(mn)}Z" fill="${sr.c}" opacity=".15"/>`;
      s += `<path d="${sm(pt)}" fill="none" stroke="${sr.c}" stroke-width="2.6" stroke-linecap="round"/>`;
    });
    if (o.ref != null)
      s += `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" stroke="var(--dn)" stroke-dasharray="5 4"/>`;
    o.L.forEach(
      (l, i) =>
        (s += `<rect x="${P.l + gw * i}" y="${P.t}" width="${gw}" height="${H - P.t - P.b}" fill="transparent" data-t="<b>${l}</b>${o.S.map((r) => `<br>${r.n}: ${r.v[i] == null ? "-" : o.t(r.v[i])}`).join("")}"/>`),
    );
    return `<svg viewBox="0 0 ${W} ${H}">${s}</svg><div class="lc">${o.S.map((r) => `<i style="background:${r.c};color:${r.c == "var(--A)" ? "#18191c" : "#fff"}">${r.n}</i>`).join("")}</div>`;
  }
  function donut(it) {
    const T = it.reduce((a, x) => a + x.v, 0);
    if (T <= 0) return '<p class="note">Belum ada realisasi.</p>';
    let c = 0,
      s = "";
    const R = 62,
      C = 2 * Math.PI * R;
    it.forEach((x) => {
      const l = (x.v / T) * C;
      s += `<circle r="${R}" cx="85" cy="85" fill="none" stroke="${x.c}" stroke-width="24" stroke-dasharray="${Math.max(l - 2, 0)} ${C - Math.max(l - 2, 0)}" stroke-dashoffset="${-c}" transform="rotate(-90 85 85)" data-t="<b>${x.n}</b><br>${fm(x.v)}"/>`;
      c += l;
    });
    return `<div class="dn"><svg viewBox="0 0 170 170">${s}<text x="85" y="82" text-anchor="middle">Total</text><text class="vl" x="85" y="100" text-anchor="middle" style="font-size:14px">${fm(T)}</text></svg><ul class="lgd">${it.map((x) => `<li><s style="background:${x.c}"></s>${x.n}<b>${fm(x.v)}</b><em>${nf((x.v / T) * 100, 0)}%</em></li>`).join("")}</ul></div>`;
  }
  function wf(o) {
    if (!o.br && !o.customAdd && !o.customSub) return '<p class="note">Belum ada data.</p>';
    const it = [
        ["Tagihan", o.br, "t"],
        ["Reward", o.rw],
        ["Suplisi", o.sp],
        ["Kerja kurang", -o.kk],
        ["Denda", -o.dn],
      ["Uraian tambah", o.customAdd],
      ["Uraian kurang", -o.customSub],
        ["Realisasi", o.re, "t"],
        ["Kontrak", o.kt, "k"],
      ],
      lo = Math.min(o.br, o.re, o.kt) * 0.8,
      hi = Math.max(o.br, o.re, o.kt) * 1.05,
      W = 560,
      H = 220,
      g = W / it.length,
      bw = g * 0.62,
      Y = (v) => H - 30 - ((v - lo) / (hi - lo)) * (H - 58);
    let run = 0,
      s = "";
    it.forEach(([n, v, k], i) => {
      let a, b;
      if (k) {
        a = lo;
        b = v;
        if (k == "t") run = v;
      } else {
        a = run;
        b = run + v;
        run = b;
      }
      const y = Y(Math.max(a, b)),
        h = Math.max(Math.abs(Y(a) - Y(b)), 2),
        c =
          k == "t"
            ? "var(--f)"
            : k == "k"
              ? "var(--A)"
              : v >= 0
                ? "var(--up)"
                : "var(--dn)",
        x = i * g + (g - bw) / 2;
      s += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="${c}"/><text class="vl" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${fm(v)}</text><text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle">${n}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}">${s}</svg>`;
  }
  function dash() {
    const selected = [...S.ys].sort((a, b) => a - b),
      focus = selected[selected.length - 1],
      yearColor = (year) =>
        YEAR_COLORS[
          Math.max(
            0,
            YEAR_COLORS.length -
              1 -
              (selected.length - 1 - selected.indexOf(year)),
          )
        ],
      previous =
        selected.length > 1 ? agg(selected[selected.length - 2]) : null,
      B = agg(focus),
      L = rg().map((i) => MO[i]);
    $("#c2title").textContent = `Komposisi tagihan ${focus}`;
    $("#c5title").textContent = `Porsi realisasi per project ${focus}`;
    $("#c6title").textContent = `Serapan project ${focus}`;
    $("#c7title").textContent = `Dari tagihan ke realisasi ${focus}`;
    $("#c8title").textContent = `Posisi tagihan menurut status ${focus}`;
    $("#hmtitle").textContent = `Peta status penagihan ${focus}`;
    $("#sub").textContent =
      `${MO[S.a]} sampai ${MO[S.b]} · ${selected.join(" dibanding ")} · ${S.p == "ALL" ? "semua project" : S.p}`;
    [
      ["Nilai kontrak", B.kt, previous?.kt, 1],
      ["Realisasi", B.re, previous?.re, 1],
      ["Pendapatan tidak terserap", B.un, previous?.un, 0],
      ["Denda", B.dn, previous?.dn, 0],
    ].forEach(
      ([t, b, a, u], i) =>
        ($("#k" + i).innerHTML =
          `<div class="t"><span class="ic ${i % 2 ? "l" : ""}"></span>${t}</div><b>${fm(b)}</b><div class="r">${previous ? chip(b, a, u) + `<span>${selected[selected.length - 2]}: ${fm(a)}</span>` : `<i class="ch">${focus}</i>`}</div>`),
    );
    const lab =
        B.sla == null
          ? "Belum ada data"
          : B.sla >= 1
            ? "Sangat baik"
            : B.sla >= 0.98
              ? "Baik"
              : "Perlu perhatian",
      w = Math.min(B.sla || 0, 1) * 100;
    $("#sla").innerHTML =
      `<h3>% SLA ${focus}</h3><small>Kualitas kinerja</small><div class="big"><b>${lab}</b><span>${fp(B.sla)}</span></div><div class="pb"><u style="width:${w}%"></u><u style="flex:1"></u></div><p class="note">Sangat baik: 100% atau lebih. Baik: 98 sampai 100%. Perlu perhatian: di bawah 98%.</p><div class="r" style="display:flex;gap:8px;align-items:center;margin-top:10px"><span>% pendapatan terhadap kontrak ${fp(B.pc)}</span>${previous ? chip(B.pc, previous.pc, 1, 1) : ""}</div>`;
    const f = (v) => nf(v / 1e9, 1) + " M";
    $("#c1").innerHTML = cht({
      L,
      f,
      t: fm,
      S: selected.map((y) => ({
        n: String(y),
        c: yearColor(y),
        t: "l",
        a: 1,
        v: ser(y, (m, p, i) => realization(p, i)),
      })),
    });
    $("#c2").innerHTML = cht({
      L,
      f,
      t: fm,
      H: 210,
      S: selected.flatMap((y, yi) => [
        { n: `Tahap 1 ${y}`, c: yearColor(y), t: "b", v: ser(y, (m) => m[0]) },
        { n: `Tahap 2 ${y}`, c: yearColor(y), t: "b", v: ser(y, (m) => m[1]) },
        { n: `Lainnya ${y}`, c: yearColor(y), t: "b", v: ser(y, (m) => m[2]) },
      ]),
    });
    $("#c3").innerHTML = cht({
      L,
      z: 1,
      ref: 1,
      H: 210,
      f: (v) => nf(v * 100, 1) + "%",
      t: fp,
      S: selected.map((y) => ({
        n: String(y),
        c: yearColor(y),
        t: "l",
        v: slaS(y),
      })),
    });
    $("#c4").innerHTML = cht({
      L,
      H: 210,
      f: (v) => nf(v / 1e6, 0) + " jt",
      t: fm,
      S: selected.map((y) => ({
        n: String(y),
        c: "#a43b45",
        t: "b",
        v: ser(y, (m) => m[3]),
      })),
    });
    renderUnabsorbedChart();
    $("#c5").innerHTML = selected
      .map((y) => {
        const items = sel(y)
          .map((p, i) => ({ n: p.n, a: agg(y, [p]), c: PAL[i % 7] }))
          .filter((x) => x.a.re > 0);
        return `<b>${y}</b>${donut(items.map((x) => ({ n: x.n, v: x.a.re, c: x.c })))}`;
      })
      .join("");
    $("#c6").innerHTML = sel(focus)
      .map((p) => {
        const values = selected.map((y) => {
          const matchingProject = sel(y).find((project) => project.n === p.n);
          if (!matchingProject) return `${y}: —`;
          const a = agg(y, [matchingProject]);
          return `${y}: ${fp(a.pc)} (${fm(a.re)} / ${fm(a.kt)})`;
        });
        return `<div class="pr"><div><b>${p.n}</b><span>${values.join(" · ")}</span></div></div>`;
      })
      .join("");
    $("#c7").innerHTML = selected
      .map((y) => `<div><b>${y}</b>${wf(agg(y))}</div>`)
      .join("");
    const ks = [...Object.keys(ST), "x"],
      cl = (k) => (k == "x" ? "var(--A)" : ST[k][1]);
    $("#c8").innerHTML = selected
      .map((y) => {
        const t = {},
          ps = sel(y);
        let tot = 0;
        ps.forEach((p) =>
          rg().forEach((i) => {
            const m = p.m[i],
              v = m[0] + m[1] + m[2],
              k = m[8] || "x";
            t[k] = (t[k] || 0) + v;
            tot += v;
          }),
        );
        return (
          `<b>${y}</b>` +
          (tot
            ? `<div class="pb" style="height:20px">${ks.map((k) => (t[k] ? `<u style="flex:${t[k]};background:${cl(k)}"></u>` : "")).join("")}</div><ul class="lgd">${ks.map((k) => (t[k] ? `<li><s style="background:${cl(k)}"></s>${k == "x" ? "Status belum diisi" : ST[k][0]}<b>${fm(t[k])}</b><em>${nf((t[k] / tot) * 100, 0)}%</em></li>` : "")).join("")}</ul>`
            : '<p class="note">Belum ada tagihan pada periode ini.</p>')
        );
      })
      .join("");
    let h =
      "<tr><th></th>" +
      rg()
        .map((month) => `<th>${MO[month]}</th>`)
        .join("") +
      "</tr>";
    sel(focus).forEach((p) => {
      h +=
        `<tr class="${S.p == p.n ? "cur" : ""}"><th>${p.n}</th>` +
        rg()
          .map((i) => {
            const m = p.m[i];
            const v = m[0] + m[1] + m[2],
              s = ST[m[8]];
            return v
              ? `<td><b data-p="${p.n}" class="${""}" style="background:${s ? s[1] : "var(--A)"};color:${!m[8] || m[8] == "f" ? "#12392f" : "#fff"}" data-t="<b>${p.n}, ${MO[i]}</b><br>${fr(v)}<br>${s ? s[0] : "Status belum diisi"}">${nf(v / 1e9, 1)}</b></td>`
              : '<td><b class="em"></b></td>';
          })
          .join("") +
        "</tr>";
    });
    $("#hm").innerHTML = h;
    $("#lc").innerHTML = Object.values(ST)
      .map((s) => `<i style="background:${s[1]}">${s[0]}</i>`)
      .join("");
    renderRecentProjectUpdates();
  }
  const ROWS = [
    ["Tagihan Tahap 1", 0],
    ["Tagihan Tahap 2", 1],
    ["Lembur / Sweeping / Lainnya", 2],
    ["Suplisi", 6],
    ["Reward", 4],
    ["Kerja Kurang", 5],
    ["Denda", 3],
    ["Nilai Kontrak", 7],
  ];
  const dataMonths = ["Semua bulan", ...MO];
  const html = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  function renderData() {
    const ys = Object.keys(D)
      .map(Number)
      .sort((a, b) => b - a);
    const yearEl = $("#dataYear"),
      projectEl = $("#dataProject"),
      monthEl = $("#dataMonth");
    const oldYear = yearEl.value,
      oldProject = projectEl.value,
      oldMonth = monthEl.value;
    yearEl.innerHTML = `<option value="ALL">Semua tahun</option>${ys.map((y) => `<option value="${y}">${y}</option>`).join("")}`;
    yearEl.value =
      oldYear === "ALL" || ys.includes(+oldYear) ? oldYear : String(ys[0]);
    const names = [
      ...new Set(Object.values(D).flatMap((ps) => ps.map((p) => p.n))),
    ].sort((a, b) => a.localeCompare(b, "id"));
    projectEl.innerHTML = `<option value="ALL">Semua project</option>${names.map((n) => `<option value="${n}">${n}</option>`).join("")}`;
    const latestProject =
      (D[yearEl.value === "ALL" ? ys[0] : yearEl.value] || []).find(hasValues)
        ?.n ||
      names[0] ||
      "ALL";
    projectEl.value =
      names.includes(oldProject) || oldProject === "ALL"
        ? oldProject
        : latestProject;
    monthEl.innerHTML = dataMonths
      .map((m, i) => `<option value="${i - 1}">${m}</option>`)
      .join("");
    monthEl.value = oldMonth || "-1";
    const year = yearEl.value,
      selectedYears = year === "ALL" ? ys.slice().reverse() : [+year],
      month = +monthEl.value;
    const yearData = selectedYears.flatMap((y) =>
      (D[y] || [])
        .filter((p) => projectEl.value === "ALL" || p.n === projectEl.value)
        .map((p) => ({ y, p })),
    );
    const months =
      month < 0 ? Array.from({ length: 12 }, (_, i) => i) : [month];
    const rows = yearData.flatMap(({ y, p }) =>
      months.map((i) => ({ y, p, i, m: p.m[i] })),
    );
    $("#dataCount").textContent =
      `${rows.length} baris · ${year === "ALL" ? "Semua tahun" : year} · ${projectEl.value === "ALL" ? "Semua project" : projectEl.value} · ${month < 0 ? "Semua bulan" : MO[month]}`;
    const headers = ROWS.map(([name]) => `<th>${name}</th>`).join("");
    const statusColors = {
      b: "#00B050",
      f: "#FFFF00",
      u: "#C65911",
      p: "#7030A0",
      l: "#0070C0",
      h: "#FF0000",
    };
    $("#dataTable").innerHTML = rows.length
      ? `<div class="cd"><div class="table-scroll-tools"><span>Geser untuk melihat kolom lainnya</span><div><button type="button" data-scroll-table="-1" aria-label="Geser tabel ke kiri">←</button><button type="button" data-scroll-table="1" aria-label="Geser tabel ke kanan">→</button></div></div><div class="sc"><table class="t data-table"><thead><tr><th>Tahun</th><th>Bulan</th><th>Project</th>${headers}<th>Status bulanan</th><th>Realisasi</th></tr></thead><tbody>${rows
          .map(({ y, p, i, m }) => {
            const monthlyColor = statusColors[m[8]] || "transparent";
            return `<tr class="data-row ${m[8] ? `status-${m[8]}` : "status-none"}"><td>${y}</td><td>${MO[i]}</td><td>${html(p.n)}</td>${ROWS.map(
              ([label, k]) => {
                const cellStatus = m[9]?.[k] ?? m[8],
                  color = statusColors[cellStatus],
                  filled = !!m[k] && !!color;
                return `<td><button type="button" class="data-cell-value ${filled ? `colored-value cell-status-${cellStatus}` : ""}" data-status-edit data-project="${html(p.n)}" data-year="${y}" data-month="${i}" data-field="${k}" aria-label="Ubah status warna ${html(label)} ${MO[i]} ${html(p.n)}" title="Klik untuk mengubah status warna" ${filled ? `style="--cell-status:${color}"` : ""}>${m[k] ? nf(m[k], 0) : "—"}</button></td>`;
              },
            ).join(
              "",
            )}<td><span class="status-label" style="--row-status:${monthlyColor}">${m[8] ? ST[m[8]]?.[0] || "—" : "Belum diisi"}</span></td><td class="${m[8] && realization(p, i) ? "colored-value" : ""}" ${m[8] && realization(p, i) ? `style="--cell-status:${monthlyColor}"` : ""}>${nf(realization(p, i), 0)}</td></tr>`;
          })
          .join("")}</tbody></table></div></div>`
      : '<div class="cd"><p>Data tidak ditemukan untuk filter ini.</p></div>';
  }
  ["#dataYear", "#dataProject", "#dataMonth"].forEach(
    (id) =>
      ($(id).onchange = () =>
        runLoading(() => renderData(), "Memfilter data…")),
  );
  $("#dataAll").onclick = () =>
    runLoading(() => {
      $("#dataYear").value = "ALL";
      $("#dataProject").value = "ALL";
      $("#dataMonth").value = "-1";
      renderData();
    }, "Menampilkan semua data…");
  $("#dataTable").addEventListener("click", async (event) => {
    const scrollButton = event.target.closest("button[data-scroll-table]");
    if (scrollButton) {
      const scroller = scrollButton.closest(".cd")?.querySelector(".sc");
      if (scroller)
        scroller.scrollBy({
          left:
            Number(scrollButton.dataset.scrollTable) *
            scroller.clientWidth *
            0.8,
          behavior: "smooth",
        });
      return;
    }
    const button = event.target.closest("button[data-status-edit]");
    if (!button) return;
    const { project, year, month, field } = button.dataset;
    const monthData = D[year]?.find((item) => item.n === project)?.m[+month];
    if (!monthData) return;
    const inherited = monthData[8] ? ST[monthData[8]]?.[0] : "Belum diisi";
    const options = [
      ["", `Ikuti status bulanan (${inherited})`],
      ...Object.entries(ST).map(([key, [label]]) => [key, label]),
    ];
    const selected = await askUser({
      title: "Warna status field",
      message: `${project} · ${MO[+month]} ${year} · ${ROWS.find(([, k]) => k === +field)?.[0] || "Field"}`,
      selectOptions: options,
      value: monthData[9]?.[field] ?? "",
      danger: false,
      confirmText: "Simpan warna",
    });
    if (selected === null) return;
    try {
      const response = await fetch("/api/cell-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          year: +year,
          month: +month,
          field: +field,
          status: selected || null,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Status warna gagal disimpan");
      monthData[9] ||= {};
      if (selected) monthData[9][field] = selected;
      else delete monthData[9][field];
      renderData();
      toast(
        result.snapshotSynced === false
          ? "Warna tersimpan, JSON gagal disinkronkan"
          : "Warna status diperbarui",
      );
    } catch (error) {
      toast(error.message);
    }
  });
  function fill() {
    const latest = Math.max(...Object.keys(D).map(Number));
    const q = $("#dq").value.trim().toLowerCase(),
      ps = (D[latest] || []).filter((p) => p.n.toLowerCase().includes(q));
    if (S.p != "ALL" && !ps.some((p) => p.n == S.p)) S.p = "ALL";
    $("#fp").innerHTML =
      '<option value="ALL">Semua project</option>' +
      ps.map((p) => `<option>${p.n}</option>`).join("");
    $("#fp").value = S.p;
  }
  function inp() {
    const Y = S.iy,
      all = D[Y],
      q = $("#iq").value.trim().toLowerCase(),
      ps = all.filter((x) => x.n.toLowerCase().includes(q));
    let p =
      all.find((x) => x.n == S.ip) ||
      ps.find(hasValues) ||
      ps[0] ||
      all.find(hasValues) ||
      all[0];
    if (!p) {
      $("#grid").innerHTML =
        "<tr><td>Belum ada project. Tambahkan project terlebih dahulu.</td></tr>";
      addManualRowButton.disabled = true;
      editManualRowButton.disabled = true;
      deleteManualRowButton.disabled = true;
      return;
    }
    addManualRowButton.disabled = false;
    S.ip = p.n;
    $("#iy").value = Y;
    const selectedRowKey = manualRowSelect.value;
    const rowOptions = [
      ...(p.baseRows || []).filter((row) => row.active).map((row) => [`base:${row.field}`, `Bawaan: ${row.label}`]),
      ...(p.customRows || []).map((row) => [`custom:${row.id}`, `Tambahan: ${row.label}`]),
    ];
    manualRowSelect.innerHTML = rowOptions.map(([value, label]) => `<option value="${html(value)}">${html(label)}</option>`).join("");
    manualRowSelect.disabled = rowOptions.length === 0;
    if (rowOptions.some(([value]) => value === selectedRowKey)) manualRowSelect.value = selectedRowKey;
    else if (rowOptions.length) manualRowSelect.value = rowOptions[0][0];
    editManualRowButton.disabled = rowOptions.length === 0;
    deleteManualRowButton.disabled = rowOptions.length === 0;
    $("#ip").innerHTML = ps
      .map((x) => `<option ${x.n == p.n ? "selected" : ""}>${x.n}</option>`)
      .join("");
    let h =
      "<tr><th></th>" +
      MO.map(
        (m, i) => `<th>${m}${Y == 2026 && i > NOW ? " (proyeksi)" : ""}</th>`,
      ).join("") +
      "</tr><tr><th>Status Tahap 1</th>" +
      p.m
        .map(
          (m, i) =>
            `<td><select data-k="s,${i}" aria-label="Status ${MO[i]}" style="border-left-color:${m[8] ? ST[m[8]][1] : "var(--ln)"}"><option value="">Belum diisi</option>${Object.entries(
              ST,
            )
              .map(
                ([k, v]) =>
                  `<option value="${k}" ${m[8] == k ? "selected" : ""}>${v[0]}</option>`,
              )
              .join("")}</select></td>`,
        )
        .join("") +
      "</tr>";
    const visibleBaseRows = Array.isArray(p.baseRows)
      ? p.baseRows.filter((row) => row.active).map((row) => [row.label, row.field])
      : ROWS;
    visibleBaseRows.forEach(([n, k]) =>
      (h +=
        `<tr class="base-input-row"><th>${html(n)}</th>` +
        p.m
          .map(
            (m, i) =>
              `<td><input type="text" inputmode="numeric" value="${m[k] ? nf(m[k], 0) : ""}" data-k="${k},${i}" aria-label="${html(n)} ${MO[i]}"></td>`,
          )
          .join("") +
        "</tr>"),
    );
    (p.customRows || []).forEach((row) => {
      h += `<tr class="custom-input-row"><th>${html(row.label)} <small class="custom-operation">${row.operation === "subtract" ? "− Kurangi Realisasi" : "+ Tambah ke Realisasi"}</small></th>` +
        row.values.map((value, i) => `<td><input type="text" inputmode="numeric" value="${value ? nf(value, 0) : ""}" data-custom-row="${row.id}" data-month="${i}" aria-label="${html(row.label)} ${MO[i]}"></td>`).join("") +
        "</tr>";
    });
    h += ["Realisasi", "% pendapatan", "% SLA", "Tidak terserap"]
      .map(
        (n, j) =>
          `<tr class="calc"><th>${n}</th>` +
          MO.map((_, i) => `<td id="c${j}_${i}"></td>`).join("") +
          "</tr>",
      )
      .join("");
    $("#grid").innerHTML = h;
    calc(p);
    if (!$(`#data`).hidden) renderData();
  }
  function calc(p) {
    p.m.forEach((m, i) => {
      const re = realization(p, i),
        pc = m[7] ? re / m[7] : null,
        v = [full(re), pct(pc), pct(pc), full(m[7] - re)];
      v.forEach((x, j) => {
        const c = $(`#c${j}_${i}`);
        c.textContent = x;
        c.className = j == 0 && re > (m[7] || 0) * 1.25 && re > 0 ? "wn" : "";
      });
    });
  }
  let tm;
  const loader = $("#appLoader");
  let busyCount = 0;
  let audioContext = null;
  let loaderTimer;
  const setBusy = (active, label = "Memproses…") => {
    if (active) {
      busyCount += 1;
      clearTimeout(loaderTimer);
      loader.querySelector(".app-loader__label").textContent = label;
      loader.classList.add("on");
      loader.setAttribute("aria-hidden", "false");
    } else {
      busyCount = Math.max(0, busyCount - 1);
      if (!busyCount)
        loaderTimer = setTimeout(() => {
          loader.classList.remove("on");
          loader.setAttribute("aria-hidden", "true");
        }, 180);
    }
  };
  const runLoading = async (action, label = "Memuat tampilan…") => {
    setBusy(true, label);
    await new Promise(requestAnimationFrame);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  };
  const unlockAudio = () => {
    if (!audioContext) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioContext = new AudioContextClass();
    }
    if (audioContext?.state === "suspended") void audioContext.resume();
  };
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  const playNotice = () => {
    if (!audioContext || audioContext.state !== "running") return;
    const start = audioContext.currentTime;
    const grit = audioContext.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i += 1) {
      const value = (i * 2) / (curve.length - 1) - 1;
      curve[i] = Math.tanh(value * 2.8);
    }
    grit.curve = curve;
    grit.oversample = "2x";
    grit.connect(audioContext.destination);

    [
      ["sawtooth", 0.095],
      ["square", 0.028],
    ].forEach(([type, volume]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(260, start);
      oscillator.frequency.exponentialRampToValueAtTime(1480, start + 0.13);
      oscillator.frequency.exponentialRampToValueAtTime(360, start + 0.58);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
      gain.gain.setValueAtTime(volume, start + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.62);
      oscillator.connect(gain);
      gain.connect(grit);
      oscillator.start(start);
      oscillator.stop(start + 0.64);
    });
    setTimeout(() => grit.disconnect(), 800);
  };
  const manualNoticeAudio = new Audio("/sounds/yoo.mp3");
  manualNoticeAudio.preload = "auto";
  const playManualNotice = () => {
    manualNoticeAudio.currentTime = 0;
    void manualNoticeAudio.play().catch((error) => {
      console.warn("Audio notifikasi input manual tidak dapat diputar:", error);
    });
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const method = (
      init.method ||
      (typeof input !== "string" && input.method) ||
      "GET"
    ).toUpperCase();
    const isWrite =
      url.startsWith("/api/") && method !== "GET" && method !== "HEAD";
    if (isWrite)
      setBusy(
        true,
        method === "POST" && url.includes("/api/import")
          ? "Mengimpor data…"
          : "Menyimpan perubahan…",
      );
    const request = nativeFetch(input, init);
    return isWrite ? request.finally(() => setBusy(false)) : request;
  };
  const toast = (t, { manual = false } = {}) => {
    $("#toast").textContent = t || "Tersimpan di sesi ini";
    $("#toast").classList.add("on");
    if (manual) playManualNotice();
    else playNotice();
    clearTimeout(tm);
    tm = setTimeout(() => $("#toast").classList.remove("on"), 1600);
  };
  function askUser({
    title = "Konfirmasi",
    message,
    input = false,
    selectOptions = null,
    value = "",
    danger = true,
    confirmText = "Lanjutkan",
  }) {
    return new Promise((resolve) => {
      const modal = $("#dialog"),
        field = $("#dialogInput"),
        select = $("#dialogSelect"),
        ok = $("#dialogOK"),
        cancel = $("#dialogCancel");
      $("#dialogTitle").textContent = title;
      $("#dialogMessage").textContent = message;
      field.hidden = !input;
      field.value = value;
      select.hidden = !selectOptions;
      if (selectOptions) {
        select.innerHTML = selectOptions
          .map(
            ([key, label]) =>
              `<option value="${html(key)}">${html(label)}</option>`,
          )
          .join("");
        select.value = value;
      }
      ok.textContent = confirmText;
      ok.classList.toggle("danger", danger);
      ok.classList.toggle("primary", !danger);
      modal.hidden = false;
      if (input) {
        field.focus();
        field.select();
      } else if (selectOptions) select.focus();
      else ok.focus();
      const finish = (result) => {
        modal.hidden = true;
        ok.removeEventListener("click", accept);
        cancel.removeEventListener("click", decline);
        modal.removeEventListener("click", outside);
        document.removeEventListener("keydown", keys);
        resolve(result);
      };
      const accept = () =>
        finish(input ? field.value : selectOptions ? select.value : true);
      const decline = () => finish(null);
      const outside = (e) => {
        if (e.target === modal) decline();
      };
      const keys = (e) => {
        if (e.key === "Escape") decline();
        if (e.key === "Enter" && (input || selectOptions)) accept();
      };
      ok.addEventListener("click", accept);
      cancel.addEventListener("click", decline);
      modal.addEventListener("click", outside);
      document.addEventListener("keydown", keys);
    });
  }
  const askConfirm = (message, title = "Konfirmasi tindakan") =>
    askUser({ title, message, confirmText: "Ya, lanjutkan" });
  const askInput = (message, value = "", title = "Masukkan data") =>
    askUser({
      title,
      message,
      input: true,
      value,
      danger: false,
      confirmText: "Simpan",
    });
  manualSaveButton.addEventListener("click", async () => {
    if (!pendingManual.size) return;
    const accepted = await askUser({
      title: "Simpan input manual?",
      message: `Anda akan menyimpan ${pendingManual.size} perubahan ke database. Pastikan project, bulan, dan nominal sudah benar.`,
      danger: false,
      confirmText: "Ya, simpan",
    });
    if (!accepted) return;

    manualSaveButton.disabled = true;
    manualSaveButton.textContent = "Menyimpan...";
    let failed = 0;
    let lastSaveError = "";
    let yearBecameEmpty = false;
    for (const [key, change] of [...pendingManual]) {
      try {
        const isCustomRow = typeof change.k === "string" && change.k.startsWith("custom:");
        const response = await fetch(isCustomRow ? "/api/project-row-values" : "/api/entry", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isCustomRow
            ? { project: change.project, year: change.year, month: change.month, rowId: Number(change.k.slice(7)), value: change.value }
            : change),
        });
        const saved = await response.json();
        if (!response.ok) throw new Error(saved.error || "Gagal menyimpan");
        if (pendingManual.get(key) === change) pendingManual.delete(key);
        yearBecameEmpty ||= Boolean(saved.yearEmpty);
      } catch (error) {
        failed += 1;
        lastSaveError =
          error.message || "Periksa koneksi database lalu coba lagi.";
      }
    }
    manualSaveButton.textContent = "Simpan input";
    updateManualSaveNotice();
    if (failed) {
      toast(`${failed} perubahan gagal disimpan. ${lastSaveError}`, {
        manual: true,
      });
    } else {
      toast("Semua perubahan tersimpan ke database", { manual: true });
      dash();
      renderData();
      loadHistory();
    }
    if (yearBecameEmpty) {
      await reload();
      inp();
      dash();
    }
  });
  addManualRowButton.addEventListener("click", async () => {
    const label = await askInput("Nama uraian baru:", "", "Tambah uraian project");
    if (!label?.trim()) return;
    const operation = await askUser({
      title: "Pengaruh ke Realisasi",
      message: "Pilih cara nominal uraian ini dihitung.",
      selectOptions: [["add", "Tambah ke Realisasi"], ["subtract", "Kurangi dari Realisasi"]],
      value: "add",
      danger: false,
      confirmText: "Simpan uraian",
    });
    if (operation === null) return;
    try {
      const response = await fetch("/api/project-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: S.ip, label, operation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Uraian gagal ditambahkan");
      manualRowSelect.value = `custom:${result.row.id}`;
      await reload();
      inp();
      dash();
      toast("Uraian ditambahkan ke project", { manual: true });
    } catch (error) {
      toast(error.message, { manual: true });
    }
  });
  const lg = () => loadHistory();
  let historyRows = [];
  async function loadHistory() {
    try {
      const r = await fetch("/api/history", { cache: "no-store" });
      historyRows = await r.json();
      renderHistory();
      renderRecentProjectUpdates();
    } catch {}
  }
  function renderRecentProjectUpdates() {
    const latestByProject = new Map();
    historyRows.forEach((item) => {
      if (
        (S.p === "ALL" || item.project === S.p) &&
        !latestByProject.has(item.project)
      ) {
        latestByProject.set(item.project, item);
      }
    });
    const items = [...latestByProject.values()].slice(0, 6);
    $("#projectSummary").innerHTML = items.length
      ? `<thead><tr><th>Project</th><th>Terakhir diperbarui</th><th>Periode data</th><th>Sumber</th></tr></thead><tbody>${items
          .map((item) => {
            const period = item.month
              ? `${MO[Number(item.month) - 1] || "-"} ${item.year || ""}`
              : item.year || "-";
            const source =
              item.source === "impor" ? "Impor file" : "Input manual";
            return `<tr><td>${html(item.project || "-")}</td><td>${new Date(item.at).toLocaleString("id-ID")}</td><td>${period}</td><td>${source}</td></tr>`;
          })
          .join("")}</tbody>`
      : '<tbody><tr><td colspan="4">Belum ada riwayat pembaruan untuk filter ini.</td></tr></tbody>';
  }
  function renderHistory() {
    ["manual", "impor"].forEach((source) => {
      const rows = historyRows.filter((x) => x.source === source),
        target =
          source === "manual"
            ? ["#historyManual", "#historyManualInput"]
            : ["#historyImport"];
      target.forEach(
        (id) =>
          ($(id).innerHTML = rows.length
            ? `<div class="sc"><table class="t"><tr><th>Waktu</th><th>Project</th><th>Tahun/bulan</th><th>Perubahan</th><th>Nilai baru</th></tr>${rows.map((x) => `<tr><td>${new Date(x.at).toLocaleString("id-ID")}</td><td>${x.project}</td><td>${x.year || "-"}${x.month ? ` / ${MO[x.month - 1]}` : ""}</td><td>${x.field || "-"}</td><td>${x.new_value || "-"}</td></tr>`).join("")}</table></div>`
            : '<p class="note">Belum ada riwayat.</p>'),
      );
    });
  }
  async function clearHistory(source) {
    if (
      !(await askConfirm(
        `Hapus seluruh riwayat ${source === "manual" ? "manual" : "impor"}? Data project tidak dihapus.`,
      ))
    )
      return;
    const r = await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j.error || "Gagal menghapus riwayat");
    await loadHistory();
    toast("Riwayat dihapus");
  }
  $("#grid").addEventListener("input", (e) => {
    const t = e.target,
      p = D[S.iy].find((x) => x.n == S.ip);
    if (t.matches("[data-custom-row]")) {
      const rowId = Number(t.dataset.customRow), i = Number(t.dataset.month);
      const raw = t.value.replace(/[^0-9]/g, "");
      const value = Number(raw) || 0;
      t.value = raw ? nf(value, 0) : "";
      const row = p.customRows?.find((item) => item.id === rowId);
      if (row) row.values[i] = value;
      calc(p);
      const key = `${S.ip}:${S.iy}:${i}:custom:${rowId}`;
      pendingManual.set(key, { project: S.ip, year: S.iy, month: i, k: `custom:${rowId}`, value });
      updateManualSaveNotice();
      return;
    }
    const [k, i] = t.dataset.k.split(",");
    if (k == "s") {
      p.m[i][8] = t.value || null;
      t.style.borderLeftColor = t.value ? ST[t.value][1] : "var(--ln)";
    } else {
      const raw = t.value.replace(/[^0-9]/g, "");
      let v = Number(raw) || 0;
      t.value = raw ? nf(v, 0) : "";
      p.m[i][+k] = v;
    }
    calc(p);
    api(
      S.ip,
      S.iy,
      i,
      k == "s" ? 8 : +k,
      k == "s" ? t.value || null : p.m[i][+k],
    );
  });
  $("#grid").addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches("[data-custom-row]")) {
      lg(`Ubah ${S.ip}, ${MO[Number(t.dataset.month)]} ${S.iy}: ${t.closest("tr").querySelector("th > span")?.textContent || "Uraian"}`);
      return;
    }
    const [k, i] = t.dataset.k.split(",");
    lg(
      `Ubah ${S.ip}, ${MO[i]} ${S.iy}: ${k == "s" ? "status" : ROWS.find((r) => r[1] == k)[0]}`,
    );
  });
  manualRowSelect.addEventListener("change", () => {
    const enabled = Boolean(manualRowSelect.value);
    editManualRowButton.disabled = !enabled;
    deleteManualRowButton.disabled = !enabled;
  });
  manualRowToolbar.addEventListener("click", async (event) => {
    const [rowType, selectedRowId] = manualRowSelect.value.split(":");
    const isEdit = event.target.closest("button") === editManualRowButton;
    const isDelete = event.target.closest("button") === deleteManualRowButton;
    if (!isEdit && !isDelete) return;
    const editButton = isEdit && rowType === "custom" ? { dataset: { rowEdit: selectedRowId } } : null;
    const deleteButton = isDelete && rowType === "custom" ? { dataset: { rowDelete: selectedRowId } } : null;
    const baseEditButton = isEdit && rowType === "base" ? { dataset: { baseEdit: selectedRowId } } : null;
    const baseDeleteButton = isDelete && rowType === "base" ? { dataset: { baseDelete: selectedRowId } } : null;
    if (!editButton && !deleteButton && !baseEditButton && !baseDeleteButton) return;
    if (baseEditButton || baseDeleteButton) {
      const button = baseEditButton || baseDeleteButton;
      const field = Number(button.dataset.baseEdit ?? button.dataset.baseDelete);
      const project = D[S.iy].find((item) => item.n === S.ip);
      const row = project?.baseRows?.find((item) => item.field === field);
      if (!row) return;
      if (baseEditButton) {
        const label = await askInput("Nama uraian:", row.label, "Ubah uraian project");
        if (!label?.trim() || label.trim() === row.label) return;
        try {
          const response = await fetch("/api/project-base-rows", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, project: S.ip, label }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Uraian gagal diubah");
          await reload(); inp(); dash();
          toast("Nama uraian diperbarui", { manual: true });
        } catch (error) { toast(error.message, { manual: true }); }
        return;
      }
      if (!await askConfirm(`Hapus uraian “${row.label}” beserta seluruh nominalnya dari semua bulan dan tahun project ${S.ip}?`, "Hapus uraian project")) return;
      try {
        const response = await fetch("/api/project-base-rows", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, project: S.ip }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Uraian gagal dihapus");
        for (const [key, change] of pendingManual) {
          if (change.project === S.ip && Number(change.k) === field) pendingManual.delete(key);
        }
        await reload(); inp(); dash(); updateManualSaveNotice();
        toast("Uraian dan seluruh nominal project dihapus", { manual: true });
      } catch (error) { toast(error.message, { manual: true }); }
      return;
    }
    const rowId = Number((editButton || deleteButton).dataset.rowEdit || (editButton || deleteButton).dataset.rowDelete);
    const project = D[S.iy].find((item) => item.n === S.ip);
    const row = project?.customRows?.find((item) => item.id === rowId);
    if (!row) return;
    if (editButton) {
      const label = await askInput("Nama uraian:", row.label, "Ubah uraian project");
      if (!label?.trim()) return;
      const operation = await askUser({
        title: "Pengaruh ke Realisasi",
        message: "Pilih cara nominal uraian ini dihitung.",
        selectOptions: [["add", "Tambah ke Realisasi"], ["subtract", "Kurangi dari Realisasi"]],
        value: row.operation || "add",
        danger: false,
        confirmText: "Simpan perubahan",
      });
      if (operation === null || (label.trim() === row.label && operation === row.operation)) return;
      try {
        const response = await fetch("/api/project-rows", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rowId, project: S.ip, label, operation }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Uraian gagal diubah");
        await reload(); inp(); dash();
        toast("Nama uraian diperbarui", { manual: true });
      } catch (error) { toast(error.message, { manual: true }); }
      return;
    }
    if (!await askConfirm(`Hapus uraian “${row.label}” beserta semua nominal bulan dan tahunnya?`, "Hapus uraian project")) return;
    try {
      const response = await fetch("/api/project-rows", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rowId, project: S.ip }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Uraian gagal dihapus");
      for (const [key, change] of pendingManual) {
        if (change.k === `custom:${rowId}`) pendingManual.delete(key);
      }
      await reload(); inp(); updateManualSaveNotice();
      toast("Uraian dan nilai tersimpannya dihapus", { manual: true });
    } catch (error) { toast(error.message, { manual: true }); }
  });
  const short = (a) => {
    const u = a.toUpperCase();
    for (const [k, v] of [
      ["OP JAR", "OP Jar GI Trans"],
      ["ZONA A", "Ophar GI Zona A"],
      ["ZONA B", "Ophar GI Zona B"],
      ["TIMUR", "Ophar GI Timur"],
      ["BARAT", "Ophar GI Barat"],
      ["LW", "LW UIT JBB"],
      ["PGP", "LW UIT JBB"],
      ["SCADA", "SCADA"],
    ])
      if (u.includes(k)) return v;
    return a.trim();
  };
  const num = (v) => {
    if (typeof v == "number") return Math.round(v);
    if (v == null) return 0;
    const s = String(v).trim();
    return Math.round(
      /^-?\d+(\.\d+)?$/.test(s)
        ? +s
        : parseFloat(s.replace(/[^\d,-]/g, "").replace(",", ".")) || 0,
    );
  };
  function parse(rows) {
    const out = [];
    let cur = null;
    rows.forEach((r) => {
      const a = r[0],
        b = r[1];
      if (typeof a == "string" && a.trim() && a.trim() != "Project") {
        if (/TOTAL REG|WARNA STATUS/i.test(a)) {
          cur = null;
          return;
        }
        cur = {
          n: short(a),
          m: Array.from({ length: 12 }, () => [0, 0, 0, 0, 0, 0, 0, 0, null]),
        };
        out.push(cur);
      }
      if (!cur || typeof b != "string") return;
      const l = b.toLowerCase();
      let k;
      if (l.includes("kerja kurang")) k = 5;
      else if (l.includes("denda")) k = 3;
      else if (l.includes("reward")) k = 4;
      else if (l.includes("suplisi")) k = 6;
      else if (l.includes("nilai kontrak")) k = 7;
      else if (/total|%|tdk|keuntungan/.test(l)) return;
      else if (l.includes("tahap 1")) k = 0;
      else if (l.includes("tahap 2")) k = 1;
      else if (/tahap 3|tahap 4|sweeping|lembur/.test(l)) k = 2;
      else return;
      for (let i = 0; i < 12; i++) cur.m[i][k] += num(r[2 + i]);
    });
    return out;
  }
  let lastImport = null;
  function renderImport() {
    if (!lastImport) return;
    const q = $("#rq").value.trim().toLowerCase(),
      ps = lastImport.projects.filter((p) => p.n.toLowerCase().includes(q));
    $("#res").innerHTML =
      `<h3 style="margin-top:18px">Hasil impor dari sheet "${lastImport.sheet}"</h3><table class="t"><tr><th>Project</th><th>Hasil</th></tr>${ps.map((p) => `<tr><td>${p.n}</td><td>${p.state}</td></tr>`).join("")}</table><p class="note">Menampilkan ${ps.length} dari ${lastImport.projects.length} project. Status warna lama dipertahankan.</p>`;
  }
  async function imp(f) {
    const y = +$("#yy").value,
      R = $("#res");
    R.innerHTML = '<p class="note">Mengunggah...</p>';
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("year", y);
      const r = await fetch("/api/import", { method: "POST", body: fd }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error || "gagal");
      await reload();
      $("#dataYear").value = String(y);
      $("#dataProject").value = "ALL";
      renderData();
      lastImport = j;
      renderImport();
      lg(`Impor ${f.name} ke ${y}: ${j.projects.length} project`);
      toast(
        j.snapshotSynced === false
          ? "Impor tersimpan, JSON gagal disinkronkan"
          : "Impor berhasil",
      );
    } catch (e) {
      R.innerHTML = `<p class="note">Impor gagal: ${e.message}</p>`;
      toast(`Impor gagal: ${e.message}`);
    }
  }
  $("#fi").onchange = (e) => e.target.files[0] && imp(e.target.files[0]);
  const dz = $("#dz");
  ["dragover", "dragenter"].forEach((v) =>
    dz.addEventListener(v, (e) => {
      e.preventDefault();
      dz.classList.add("ov");
    }),
  );
  ["dragleave", "drop"].forEach((v) =>
    dz.addEventListener(v, (e) => {
      e.preventDefault();
      dz.classList.remove("ov");
    }),
  );
  dz.addEventListener(
    "drop",
    (e) => e.dataTransfer.files[0] && imp(e.dataTransfer.files[0]),
  );
  dz.addEventListener("keydown", (e) => {
    if (e.key == "Enter" || e.key == " ") {
      e.preventDefault();
      $("#fi").click();
    }
  });
  $("#rs").onclick = async () => {
    await reload();
    $("#res").innerHTML = "";
    toast("Data dimuat ulang dari database");
  };
  $("#unabsorbedProjectFilter").addEventListener("change", (event) => {
    unabsorbedFilters.project = event.target.value;
    return runLoading(() => renderUnabsorbedChart(), "Memfilter grafik…");
  });
  $("#unabsorbedYearFilter").addEventListener("change", (event) => {
    unabsorbedFilters.year = event.target.value;
    return runLoading(() => renderUnabsorbedChart(), "Memfilter grafik…");
  });
  $("#unabsorbedMonthFilter").addEventListener("change", (event) => {
    unabsorbedFilters.month = event.target.value;
    return runLoading(() => renderUnabsorbedChart(), "Memfilter grafik…");
  });
  function view(v) {
    return runLoading(() => {
      ["dash", "data", "inp", "imp"].forEach(
        (x) => ($("#" + x).hidden = x != v),
      );
      if (v === "inp" && S.p !== "ALL") S.ip = S.p;
      document
        .querySelectorAll("nav button")
        .forEach((b) => b.classList.toggle("on", b.dataset.v == v));
      v == "dash"
        ? dash()
        : v == "inp"
          ? inp()
          : v == "data"
            ? renderData()
            : 0;
      window.dispatchEvent(new CustomEvent("app:page-change", { detail: v }));
    }, "Membuka halaman…");
  }
  function openDashboardDetails(card) {
    const copy = card.cloneNode(true);
    copy.querySelector(".unabsorbed-filters")?.remove();
    copy.removeAttribute("tabindex");
    copy.removeAttribute("role");
    copy.classList.remove("interactive-card");
    copy.removeAttribute("aria-label");
    [copy, ...copy.querySelectorAll("[id]")].forEach((element) =>
      element.removeAttribute("id"),
    );
    cardModal
      .querySelector(".dashboard-card-modal__content")
      .replaceChildren(copy);
    cardModalReturnFocus = card;
    cardModal.hidden = false;
    cardModal.querySelector(".dashboard-card-modal__close").focus();
  }
  document
    .querySelectorAll("nav button")
    .forEach((b) => (b.onclick = () => view(b.dataset.v)));
  $("#hm").onclick = (e) => {
    const b = e.target.closest("b[data-p]");
    if (b) {
      S.ip = b.dataset.p;
      S.iy = Math.max(...S.ys);
      $("#iy").value = S.iy;
      view("inp");
    }
  };
  $("#ip").onchange = (e) => {
    S.ip = e.target.value;
    return runLoading(() => inp(), "Memuat input project…");
  };
  $("#iy").onchange = (e) => {
    S.iy = +e.target.value;
    return runLoading(() => inp(), "Memuat data tahun…");
  };
  $("#addYear").onclick = async () => {
    const value = await askInput(
      "Tahun baru:",
      String(new Date().getFullYear()),
    );
    if (value == null) return;
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1990 || year > 9999)
      return toast("Tahun tidak valid", { manual: true });
    try {
      const response = await fetch("/api/years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menambahkan tahun");
      await reload();
      S.iy = year;
      years();
      $("#iy").value = year;
      inp();
      toast(`Tahun ${year} disimpan`, { manual: true });
    } catch (error) {
      toast(error.message || "Gagal menyimpan tahun", { manual: true });
    }
  };
  $("#fa").innerHTML = $("#fb").innerHTML = MO.map(
    (m, i) => `<option value="${i}">${m}</option>`,
  ).join("");
  $("#fb").value = S.b;
  $("#yearFilters").onchange = (e) => {
    if (e.target.type !== "checkbox") return;
    return runLoading(() => {
      if (!$("#compareYears").checked) {
        S.ys = [Number(e.target.value)];
        S.iy = S.ys[0];
        $("#iy").value = S.iy;
        years();
        dash();
        return;
      }
      const picked = [
        ...$("#yearFilters").querySelectorAll('input[type="checkbox"]:checked'),
      ].map((x) => Number(x.value));
      if (!picked.length) {
        e.target.checked = true;
        return;
      }
      S.ys = picked;
      S.iy = Math.max(...picked);
      $("#iy").value = S.iy;
      dash();
    }, "Memperbarui ringkasan…");
  };
  $("#compareYears").onchange = () =>
    runLoading(() => {
      if (!$("#compareYears").checked && S.ys.length > 1)
        S.ys = [Math.max(...S.ys)];
      S.iy = Math.max(...S.ys);
      $("#iy").value = S.iy;
      years();
      dash();
    }, "Membandingkan tahun…");
  fill();
  $("#fp").onchange = (e) => {
    S.p = e.target.value;
    return runLoading(() => dash(), "Memfilter ringkasan…");
  };
  $("#fa").onchange = (e) => {
    S.a = +e.target.value;
    if (S.b < S.a) {
      S.b = S.a;
      $("#fb").value = S.b;
    }
    return runLoading(() => dash(), "Memfilter ringkasan…");
  };
  $("#fb").onchange = (e) => {
    S.b = +e.target.value;
    if (S.a > S.b) {
      S.a = S.b;
      $("#fa").value = S.a;
    }
    return runLoading(() => dash(), "Memfilter ringkasan…");
  };
  const projectRequest = async (method, body) => {
    const r = await fetch("/api/projects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      j = await r.json();
    if (!r.ok) throw new Error(j.error || "Permintaan gagal");
    return j;
  };
  $("#newp").onclick = async () => {
    const name = await askInput("Nama project baru:");
    if (!name) return;
    try {
      const j = await projectRequest("POST", { name });
      S.ip = j.name;
      await reload();
      inp();
      dash();
      lg(`Tambah project ${j.name}`);
      toast(
        j.snapshotSynced === false
          ? "Project tersimpan, JSON gagal disinkronkan"
          : "Project ditambahkan",
        { manual: true },
      );
    } catch (e) {
      toast(e.message, { manual: true });
    }
  };
  $("#renamep").onclick = async () => {
    if (!S.ip) return;
    const name = await askInput("Nama project baru:", S.ip);
    if (!name || name === S.ip) return;
    const old = S.ip;
    try {
      const j = await projectRequest("PATCH", { oldName: old, name });
      S.ip = j.name;
      if (S.p === old) S.p = j.name;
      await reload();
      inp();
      dash();
      lg(`Ubah project ${old} menjadi ${j.name}`);
      toast(
        j.snapshotSynced === false
          ? "Project diperbarui, JSON gagal disinkronkan"
          : "Nama project diperbarui",
        { manual: true },
      );
    } catch (e) {
      toast(e.message, { manual: true });
    }
  };
  $("#deletep").onclick = async () => {
    if (
      !S.ip ||
      !(await askConfirm(
        `Hapus project "${S.ip}" beserta seluruh data bulanan?`,
      ))
    )
      return;
    const old = S.ip;
    try {
      const result = await projectRequest("DELETE", { name: old });
      S.ip = null;
      if (S.p === old) S.p = "ALL";
      await reload();
      inp();
      dash();
      lg(`Hapus project ${old}`);
      toast(
        result.snapshotSynced === false
          ? "Project dihapus, JSON gagal disinkronkan"
          : "Project dihapus",
        { manual: true },
      );
    } catch (e) {
      toast(e.message, { manual: true });
    }
  };
  $("#deletem").onclick = async () => {
    if (!S.ip) return;
    const month = await askInput(
      "Masukkan nomor bulan (1–12), atau ketik SEMUA untuk menghapus data 12 bulan pada tahun yang dipilih:",
    );
    if (month == null) return;
    const all = month.trim().toLowerCase() === "semua";
    if (all) {
      if (
        !(await askConfirm(
          `Hapus seluruh data 12 bulan untuk project ${S.ip} tahun ${S.iy}?`,
        ))
      )
        return;
      try {
        const r = await fetch("/api/entry", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: S.ip, year: S.iy, all: true }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        await reload();
        inp();
        dash();
        lg(`Hapus data 12 bulan ${S.ip}, ${S.iy}`);
        toast(
          j.snapshotSynced === false
            ? "Data dihapus, JSON gagal disinkronkan"
            : `${j.deleted} bulan dihapus`,
          { manual: true },
        );
      } catch (e) {
        toast(e.message, { manual: true });
      }
      return;
    }
    const n = Number(month);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      toast("Masukkan nomor bulan 1 sampai 12", { manual: true });
      return;
    }
    if (!(await askConfirm(`Hapus data ${S.ip}, ${MO[n - 1]} ${S.iy}?`)))
      return;
    try {
      const r = await fetch("/api/entry", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: S.ip, year: S.iy, month: n - 1 }),
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await reload();
      inp();
      dash();
      lg(`Hapus data ${S.ip}, ${MO[n - 1]} ${S.iy}`);
      toast(
        j.snapshotSynced === false
          ? "Data dihapus, JSON gagal disinkronkan"
          : "Data bulanan dihapus",
        { manual: true },
      );
    } catch (e) {
      toast(e.message, { manual: true });
    }
  };
  $("#deleteYear").onclick = async () => {
    const year = S.iy;
    if (
      !(await askConfirm(
        `Hapus seluruh data bulanan tahun ${year} dari semua project? Project tetap tersimpan.`,
      ))
    )
      return;
    try {
      const r = await fetch("/api/entry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, allProjects: true }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await reload();
      inp();
      dash();
      lg(`Hapus seluruh data tahun ${year}`);
      toast(
        j.snapshotSynced === false
          ? "Data dihapus, JSON gagal disinkronkan"
          : `${j.deleted} bulan dihapus dari ${year}`,
        { manual: true },
      );
    } catch (e) {
      toast(e.message, { manual: true });
    }
  };
  $("#dq").oninput = () => {
    return runLoading(() => {
      fill();
      dash();
    }, "Memfilter ringkasan…");
  };
  $("#iq").oninput = () => runLoading(() => inp(), "Memfilter project…");
  $("#rq").oninput = () =>
    runLoading(() => renderImport(), "Memfilter hasil impor…");
  $("#clearManualHistory").onclick = () => clearHistory("manual");
  $("#clearManualHistoryInput").onclick = () => clearHistory("manual");
  $("#clearImportHistory").onclick = () => clearHistory("impor");
  document.addEventListener("mousemove", (e) => {
    const t = e.target.closest && e.target.closest("[data-t]"),
      p = $("#tip");
    if (t) {
      p.innerHTML = t.dataset.t;
      p.style.cssText = `opacity:1;left:${Math.min(e.clientX + 14, innerWidth - 190)}px;top:${e.clientY + 14}px`;
    } else p.style.opacity = 0;
  });
  loadHistory();
  years();
  $("#excel").onclick = async () => {
    const XLSX = await import("xlsx"),
      table = $("#grid"),
      rows = [...table.rows].map((row) =>
        [...row.cells].map((cell) => {
          const field = cell.querySelector("input,select");
          return field
            ? field.tagName === "SELECT"
              ? field.selectedOptions[0]?.text || ""
              : field.value
            : cell.innerText;
        }),
      ),
      wb = XLSX.utils.book_new(),
      ws = XLSX.utils.aoa_to_sheet([
        [`Project: ${S.ip || ""}`, `Tahun: ${S.iy}`],
        ...rows,
      ]),
      sheetName = `${S.ip || "Project"} ${S.iy}`
        .replace(/[\\/?*\[\]:]/g, " ")
        .slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || "Input");
    XLSX.writeFile(
      wb,
      `input-manual-${(S.ip || "project").replace(/[^a-z0-9_-]/gi, "-")}-${S.iy}.xlsx`,
    );
  };
  $("#pdf").onclick = () => {
    const w = window.open("", "_blank");
    if (!w) return toast("Izinkan jendela cetak untuk mengekspor PDF");
    w.document.write(
      `<html><head><title>Input manual ${S.ip} ${S.iy}</title><style>body{font:12px Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:5px}input,select{border:0;background:transparent;width:100%}</style></head><body><h2>${S.ip} — ${S.iy}</h2>${$("#grid").outerHTML}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };
  dash();
  window.dispatchEvent(new CustomEvent("app:page-change", { detail: "dash" }));
}
