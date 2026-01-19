/* =========================================================
   UOL Staff Directory – Admin Import Panel (DIFF MODE)
   Author: Gulzar Hussain
========================================================= */

const REQUIRED_FILENAME = "UOL_Staff_Master.csv";

/* =========================
   STATE
========================= */
let existingDB = [];
let diffView = []; // only NEW + UPDATED records
let unlocked = false;

/* =========================
   DOM
========================= */
const csvInput = document.getElementById("csvInput");
const submitBtn = document.getElementById("submitBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

csvInput.addEventListener("change", handleUpload);
submitBtn.addEventListener("click", handleSubmit);
exportJsonBtn.addEventListener("click", exportJSON);
exportCsvBtn.addEventListener("click", exportCSV);

/* =========================
   NORMALIZATION (IMPORT ONLY)
========================= */
function toTitleCase(str = "") {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/* =========================
   LOAD EXISTING DB
========================= */
async function loadDB() {
  try {
    const res = await fetch("data/staff.json");
    const data = await res.json();
    existingDB = Array.isArray(data) ? data : [];
  } catch {
    existingDB = [];
  }
}

/* =========================
   UPLOAD HANDLER
========================= */
async function handleUpload() {
  const file = csvInput.files[0];
  if (!file || file.name !== REQUIRED_FILENAME) {
    triggerInternalError();
    return;
  }

  try {
    const text = await file.text();
    const rows = text.trim().split("\n").map(r => r.split(","));

    await loadDB();
    processCSV(rows);

    unlocked = true;
    submitBtn.disabled = false;
    exportJsonBtn.classList.remove("hidden");
    exportCsvBtn.classList.remove("hidden");

    document.getElementById("uploadGate").classList.add("hidden");
    document.getElementById("adminApp").classList.remove("hidden");

    renderDiffCards();
  } catch (e) {
    console.error(e);
    triggerInternalError();
  }
}

/* =========================
   PROCESS CSV (DIFF ENGINE)
========================= */
function processCSV(rows) {
  if (rows.length < 2) triggerInternalError();

  diffView = [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = n => headers.indexOf(n);

  const REQUIRED = [
    "campus",
    "department",
    "full name",
    "designation",
    "official email",
    "phone",
    "personal email",
    "status"
  ];

  REQUIRED.forEach(c => {
    if (idx(c) === -1) triggerInternalError();
  });

  const seenCSV = new Set(); // avoid duplicate rows in CSV

  rows.slice(1).forEach(r => {
    if (!r || r.length < headers.length) return;

    const rec = {
      campus: toTitleCase(r[idx("campus")] || ""),
      department: toTitleCase(r[idx("department")] || ""),
      name: toTitleCase(r[idx("full name")] || ""),
      designation: toTitleCase(r[idx("designation")] || ""),
      official_email: (r[idx("official email")] || "").trim(),
      phone: (r[idx("phone")] || "").trim(),
      personal_email: (r[idx("personal email")] || "").trim(),
      active: (r[idx("status")] || "active").toLowerCase() === "active"
    };

    // minimum sanity
    if (!rec.name || !rec.phone) return;

    const signature = [
      rec.name,
      rec.designation,
      rec.personal_email,
      rec.phone
    ].join("|");

    if (seenCSV.has(signature)) return;
    seenCSV.add(signature);

    const dbMatch = existingDB.find(x =>
      x.name === rec.name &&
      x.designation === rec.designation &&
      (x.personal_email || "") === rec.personal_email &&
      x.phone === rec.phone
    );

    // 🔹 CASE 1: COMPLETELY NEW
    if (!dbMatch) {
      diffView.push({
        type: "NEW",
        newData: rec
      });
      return;
    }

    // 🔹 CASE 2: POSSIBLE UPDATE (compare fields)
    const changes = {};

    ["campus", "department", "official_email", "active"].forEach(k => {
      if ((dbMatch[k] || "") !== (rec[k] || "")) {
        changes[k] = {
          from: dbMatch[k] || "",
          to: rec[k] || ""
        };
      }
    });

    if (Object.keys(changes).length) {
      diffView.push({
        type: "UPDATE",
        oldData: dbMatch,
        newData: rec,
        changes
      });
    }
  });
}

/* =========================
   RENDER DIFF VIEW
========================= */
function renderDiffCards() {
  const el = document.getElementById("directory");
  el.innerHTML = "";

  if (!diffView.length) {
    el.innerHTML =
      "<p style='text-align:center'>No new or updated records found</p>";
    return;
  }

  diffView.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    if (item.type === "NEW") {
      card.innerHTML = `
        <div class="badge new">NEW</div>
        <div><strong>${item.newData.name}</strong></div>
        <div>${item.newData.designation}</div>
        <div>${item.newData.department} • ${item.newData.campus}</div>
        <div>${item.newData.official_email}</div>
        <div>${item.newData.phone}</div>
      `;
    }

    if (item.type === "UPDATE") {
      const diffHtml = Object.entries(item.changes)
        .map(
          ([k, v]) =>
            `<div class="diff">${k}: <span>${v.from}</span> → <strong>${v.to}</strong></div>`
        )
        .join("");

      card.innerHTML = `
        <div class="badge update">UPDATE</div>
        <div><strong>${item.newData.name}</strong></div>
        <div>${item.newData.designation}</div>
        ${diffHtml}
      `;
    }

    el.appendChild(card);
  });
}

/* =========================
   APPLY & EXPORT
========================= */
function handleSubmit() {
  if (!unlocked) return;
  if (!confirm("Apply all NEW and UPDATED records?")) return;

  diffView.forEach(item => {
    if (item.type === "NEW") {
      existingDB.push({
        ...item.newData,
        id: `UOL-${crypto.randomUUID()}`
      });
    }

    if (item.type === "UPDATE") {
      Object.assign(item.oldData, item.newData);
    }
  });

  alert("Changes applied. Export to save.");
}

/* =========================
   EXPORT
========================= */
function exportJSON() {
  download("staff.json", JSON.stringify(existingDB, null, 2));
}

function exportCSV() {
  const headers = Object.keys(existingDB[0]);
  const rows = existingDB.map(r =>
    headers.map(h => r[h] ?? "").join(",")
  );
  download("UOL_Staff_Export.csv", [headers.join(","), ...rows].join("\n"));
}

function download(name, content) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content]));
  a.download = name;
  a.click();
}

/* =========================
   ERROR
========================= */
function triggerInternalError() {
  document.body.innerHTML =
    "<h2 style='text-align:center'>Internal Server Error</h2>";
}
