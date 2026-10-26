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
  if (typeof v == "number") return Number.isFinite(v) ? Math.round(v) : 0;
  if (v == null) return 0;
  let s = String(v)
    .trim()
    .replace(/[^\d.,+-]/g, "");
  if (!s) return 0;
  const sign = s.startsWith("-") ? -1 : 1;
  s = s.replace(/[+-]/g, "");
  const comma = s.lastIndexOf(","),
    dot = s.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = Math.max(comma, dot),
      fraction = s.length - decimal - 1;
    s =
      fraction > 0 && fraction <= 2
        ? s.slice(0, decimal).replace(/[.,]/g, "") + "." + s.slice(decimal + 1)
        : s.replace(/[.,]/g, "");
  } else if (comma >= 0 || dot >= 0) {
    const sep = comma >= 0 ? "," : ".",
      parts = s.split(sep);
    if (parts.length > 2 || parts.slice(1).every((x) => x.length === 3))
      s = parts.join("");
    else if (parts.length === 2 && parts[1].length <= 2)
      s = parts[0] + "." + parts[1];
    else s = parts.join("");
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(sign * n) : 0;
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

export { parse };
