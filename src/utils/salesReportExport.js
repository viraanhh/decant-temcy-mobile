import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
// Expo SDK 53 atau lebih lama: ganti menjadi "expo-file-system"
import * as FileSystem from "expo-file-system/legacy";
import * as XLSX from "xlsx";

export function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount || 0);
}

const RUPIAH_FMT = '"Rp"#,##0';
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const shortDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const printDate = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const fileStamp = () => new Date().toISOString().slice(0, 10);

// Hitung ringkasan, HPP, laba, margin, produk terlaris (rumus sama dengan website)
export function buildReport(orders = []) {
  let totalRevenue = 0;
  let totalHPP = 0;
  let totalUnits = 0;
  const map = {};

  orders.forEach((order) => {
    totalRevenue += parseFloat(order.total_price) || 0;
    (order.items || []).forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.product?.cost_price_per_ml) || 0;
      const hpp = cost * (Number(item.size_ml) || 0) * qty;
      totalUnits += qty;
      totalHPP += hpp;

      const key = item.product_name;
      if (!map[key]) map[key] = { name: item.product_name, brand: item.brand, qty: 0, revenue: 0, hpp: 0 };
      map[key].qty += qty;
      map[key].revenue += (Number(item.price) || 0) * qty;
      map[key].hpp += hpp;
    });
  });

  const totalOrders = orders.length;
  const laba = totalRevenue - totalHPP;
  const marginPct = totalRevenue > 0 ? ((laba / totalRevenue) * 100).toFixed(1) : "0";
  const avg = totalOrders > 0 ? Math.floor(totalRevenue / totalOrders) : 0;
  const topProducts = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  return { orders, totalOrders, totalRevenue, totalHPP, totalUnits, laba, marginPct, avg, topProducts };
}

async function shareFile(uri, mimeType, dialogTitle, UTI) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Fitur berbagi file tidak tersedia di perangkat ini.");
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI });
}

// ───────────────────────── PDF ─────────────────────────
function buildHtml(r, periodLabel) {
  const labaClass = r.laba >= 0 ? "green" : "red";

  const summaryRows = [
    ["Total Revenue (Pendapatan)", formatRupiah(r.totalRevenue)],
    ["Total HPP (Harga Pokok Penjualan)", formatRupiah(r.totalHPP)],
    ["Laba Kotor", `<span class="${labaClass} b">${formatRupiah(r.laba)}</span>`],
    ["Margin Keuntungan", `${r.marginPct}%`],
    ["Jumlah Pesanan Selesai", `${r.totalOrders} pesanan`],
    ["Rata-rata Nilai per Pesanan", formatRupiah(r.avg)],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td class="r b">${v}</td></tr>`)
    .join("");

  const topRows = r.topProducts
    .map((p, i) => {
      const l = p.revenue - p.hpp;
      return `<tr><td class="c">${i + 1}</td><td>${esc(p.brand)}</td><td>${esc(p.name)}</td><td class="c">${p.qty}</td>
        <td class="r">${formatRupiah(p.revenue)}</td><td class="r">${formatRupiah(p.hpp)}</td>
        <td class="r b ${l >= 0 ? "green" : "red"}">${formatRupiah(l)}</td></tr>`;
    })
    .join("");

  const sum = (fn) => r.topProducts.reduce((s, p) => s + fn(p), 0);

  const orderRows = r.orders
    .map((o, i) => {
      const disc = Number(o.discount_amount) || 0;
      return `<tr><td class="c">${i + 1}</td><td class="b">${esc(o.order_code)}</td><td class="c">${shortDate(o.createdAt)}</td>
        <td class="r">${formatRupiah((Number(o.total_price) || 0) + disc)}</td>
        <td class="r ${disc > 0 ? "green" : ""}">${disc > 0 ? "-" + formatRupiah(disc) : "-"}</td>
        <td class="r b">${formatRupiah(o.total_price)}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  *{box-sizing:border-box}
  body{font-family:Helvetica,Arial,sans-serif;color:#111827;margin:0;padding:24px;font-size:11px}
  .top{border-top:4px solid #b91c1c;padding-top:12px;padding-bottom:10px;margin-bottom:14px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end}
  h1{margin:0;font-size:20px}
  .sub{color:#6b7280;font-size:10px;letter-spacing:1px;margin-top:3px}
  .meta{text-align:right;color:#6b7280;font-size:10px;line-height:1.6}
  h2{font-size:12px;color:#b91c1c;border-left:3px solid #b91c1c;padding-left:8px;margin:18px 0 8px}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  th{background:#111827;color:#fff;text-align:left;padding:6px 8px;font-size:10px}
  td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
  tbody tr:nth-child(even) td{background:#f9f9fb}
  tfoot td{background:#b91c1c;color:#fff;font-weight:700;border:none}
  .r{text-align:right}.c{text-align:center}.b{font-weight:700}
  .green{color:#16a34a}.red{color:#b91c1c}
  .box{border:1px solid ${r.laba >= 0 ? "#16a34a" : "#b91c1c"};background:${r.laba >= 0 ? "#f0fdf4" : "#fff5f5"};border-radius:6px;padding:10px 14px;margin:10px 0;display:flex;justify-content:space-between;align-items:center}
  .box small{color:#6b7280;font-size:9px;letter-spacing:.5px}
  .box strong{display:block;font-size:16px;margin-top:2px}
  .pb{page-break-before:always}
</style></head><body>
  <div class="top">
    <div><h1>DECANT TEMCY</h1><div class="sub">LAPORAN PENJUALAN</div></div>
    <div class="meta">Periode : ${esc(periodLabel)}<br/>Dicetak : ${printDate()}</div>
  </div>

  <h2>Ringkasan Keuangan</h2>
  <table><thead><tr><th>Keterangan</th><th class="r">Nilai</th></tr></thead><tbody>${summaryRows}</tbody></table>
  <div class="box">
    <div><small>LABA KOTOR PERIODE INI</small><strong class="${labaClass}">${formatRupiah(r.laba)}</strong></div>
    <div style="color:#6b7280">Margin ${r.marginPct}% dari total revenue</div>
  </div>

  <h2>Produk Terlaris</h2>
  <table>
    <thead><tr><th class="c">No</th><th>Brand</th><th>Produk</th><th class="c">Qty</th><th class="r">Revenue</th><th class="r">HPP</th><th class="r">Laba</th></tr></thead>
    <tbody>${topRows || '<tr><td colspan="7" class="c">Belum ada data</td></tr>'}</tbody>
    <tfoot><tr><td></td><td></td><td>TOTAL</td><td class="c">${sum((p) => p.qty)}</td>
      <td class="r">${formatRupiah(sum((p) => p.revenue))}</td><td class="r">${formatRupiah(sum((p) => p.hpp))}</td>
      <td class="r">${formatRupiah(sum((p) => p.revenue - p.hpp))}</td></tr></tfoot>
  </table>

  ${r.orders.length > 0 ? `
  <div class="pb"></div>
  <h2>Detail Transaksi Selesai</h2>
  <table>
    <thead><tr><th class="c">No</th><th>Kode Order</th><th class="c">Tanggal</th><th class="r">Subtotal</th><th class="r">Diskon</th><th class="r">Total Bayar</th></tr></thead>
    <tbody>${orderRows}</tbody>
    <tfoot><tr><td></td><td>GRAND TOTAL</td><td></td><td></td><td></td><td class="r">${formatRupiah(r.totalRevenue)}</td></tr></tfoot>
  </table>` : ""}
</body></html>`;
}

export async function exportSalesReportPdf(report, periodLabel) {
  const { uri } = await Print.printToFileAsync({ html: buildHtml(report, periodLabel) });

  // Beri nama file yang rapi, kalau gagal pakai file bawaan
  let finalUri = uri;
  try {
    const dest = `${FileSystem.cacheDirectory}Laporan_Decant_Temcy_${fileStamp()}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    finalUri = dest;
  } catch {}

  await shareFile(finalUri, "application/pdf", "Bagikan Laporan PDF", "com.adobe.pdf");
}

// ───────────────────────── EXCEL ─────────────────────────
function formatRupiahCells(ws, cols, fromRow, toRow) {
  for (let row = fromRow; row <= toRow; row++) {
    cols.forEach((col) => {
      const cell = ws[`${col}${row}`];
      if (cell && cell.t === "n") cell.z = RUPIAH_FMT;
    });
  }
}

export async function exportSalesReportExcel(report, periodLabel) {
  const r = report;
  const wb = XLSX.utils.book_new();
  const head = (title) => [["DECANT TEMCY"], [title], [`Periode: ${periodLabel}  |  Dicetak: ${printDate()}`], []];

  // Sheet 1: Ringkasan
  const s1 = [
    ...head("LAPORAN PENJUALAN"),
    ["Keterangan", "Nilai"],
    ["Total Revenue (Pendapatan)", r.totalRevenue],
    ["Total HPP (Harga Pokok Penjualan)", r.totalHPP],
    ["Laba Kotor", r.laba],
    ["Margin Keuntungan", `${r.marginPct}%`],
    ["Total Pesanan Selesai", `${r.totalOrders} pesanan`],
    ["Rata-rata per Pesanan", r.avg],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1["!cols"] = [{ wch: 38 }, { wch: 24 }];
  formatRupiahCells(ws1, ["B"], 6, 11);
  XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

  // Sheet 2: Produk Terlaris
  const top = r.topProducts;
  const s2 = [
    ...head("PRODUK TERLARIS"),
    ["No", "Brand", "Nama Produk", "Qty", "Revenue", "HPP", "Laba Kotor", "Margin"],
    ...top.map((p, i) => [
      i + 1, p.brand, p.name, p.qty, p.revenue, p.hpp, p.revenue - p.hpp,
      `${p.revenue > 0 ? (((p.revenue - p.hpp) / p.revenue) * 100).toFixed(1) : "0"}%`,
    ]),
    [
      "", "TOTAL", "",
      top.reduce((s, p) => s + p.qty, 0),
      top.reduce((s, p) => s + p.revenue, 0),
      top.reduce((s, p) => s + p.hpp, 0),
      top.reduce((s, p) => s + (p.revenue - p.hpp), 0),
      "",
    ],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2["!cols"] = [{ wch: 5 }, { wch: 18 }, { wch: 32 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
  formatRupiahCells(ws2, ["E", "F", "G"], 6, 5 + top.length + 1);
  XLSX.utils.book_append_sheet(wb, ws2, "Produk Terlaris");

  // Sheet 3: Transaksi
  const s3 = [
    ...head("DETAIL TRANSAKSI (STATUS SELESAI)"),
    ["No", "Kode Order", "Tanggal", "Subtotal", "Diskon", "Total Bayar"],
    ...r.orders.map((o, i) => {
      const disc = Number(o.discount_amount) || 0;
      return [i + 1, o.order_code, shortDate(o.createdAt), (Number(o.total_price) || 0) + disc, disc, Number(o.total_price) || 0];
    }),
    [
      "", "GRAND TOTAL", "",
      r.orders.reduce((s, o) => s + (Number(o.total_price) || 0) + (Number(o.discount_amount) || 0), 0),
      r.orders.reduce((s, o) => s + (Number(o.discount_amount) || 0), 0),
      r.totalRevenue,
    ],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(s3);
  ws3["!cols"] = [{ wch: 5 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }];
  formatRupiahCells(ws3, ["D", "E", "F"], 6, 5 + r.orders.length + 1);
  XLSX.utils.book_append_sheet(wb, ws3, "Transaksi");

  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const uri = `${FileSystem.cacheDirectory}Laporan_Decant_Temcy_${fileStamp()}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: "base64" });

  await shareFile(
    uri,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Bagikan Laporan Excel",
    "org.openxmlformats.spreadsheetml.sheet"
  );
}