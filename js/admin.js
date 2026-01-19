/* =========================================================
   UOL Staff Directory – Admin Import Panel (SMART DIFF MODE)
   Author: Gulzar Hussain
========================================================= */

const REQUIRED_FILENAME = "UOL_Staff_Master.csv";

/* =========================
   STATE
========================= */
let existingDB = [];
let diffView = []; // NEW + UPDATE only
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
   IMPORT NORMALIZATION ONLY
========================= */
function normalize(str = "") {
  return str.trim();
}

/* =========================
   LOAD DB
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
   UPLOAD
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
    buildDiff(rows);

    unlocked = true;
    submitBtn.disabled = false;
    exportJsonBtn.classList.remove("hidden");
    exportCsvBtn.classList.remove("hidden");

    document.getElementById("uploadGate").classList.add("hidden");
    document.getElementById("adminApp").classList.remove("hidden");

    renderDiff();
  } catch (e) {
    console.error(e);
    triggerInternalError();
  }
}

/* =========================
   DIFF ENGINE
========================= */
function buildDiff(rows) {
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
    "personal email"
  ];

  REQUIRED.forEach(c => {
    if (idx(c) === -1) triggerInternalError();
  });

  const seenCSV = new Set();

  rows.slice(1).forEach(r => {
    if (!r || r.length < headers.length) return;

    const rec = {
      campus: normalize(r[idx("campus")]),
      department: normalize(r[idx("department")]),
      name: normalize(r[idx("full name")]),
      designation: normalize(r[idx("designation")]),
      official_email: normalize(r[idx("official email")]),
      phone: normalize(r[idx("phone")]),
      personal_email: normalize(r[idx("personal email")])
    };

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

    if (!dbMatch) {
      diffView.push({
        type: "NEW",
        newData: rec
      });
      return;
    }

    const changes = {};
    ["campus", "department", "official_email"].forEach(k => {
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
        changes,
        apply: true // ✅ checkbox default
      });
    }
  });
}

/* =========================
   RENDER DIFF
========================= */
function renderDiff() {
  const el = document.getElementById("directory");
  el.innerHTML = "";

  if (!diffView.length) {
    el.innerHTML =
      "<p style='text-align:center'>No new or updated records found</p>";
    return;
  }

  diffView.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "card";

    if (item.type === "NEW") {
      card.innerHTML = `
        <div class="badge new">NEW</div>
        <strong>${item.newData.name}</strong>
        <div>${item.newData.designation}</div>
        <div>${item.newData.department} • ${item.newData.campus}</div>
      `;
    }

    if (item.type === "UPDATE") {
      const diffs = Object.entries(item.changes)
        .map(
          ([k, v]) =>
            `<div class="diff">${k}: <span>${v.from}</span> → <strong>${v.to}</strong></div>`
        )
        .join("");

      card.innerHTML = `
        <label style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" checked data-index="${i}">
          <span class="badge update">UPDATE</span>
        </label>

        <strong>${item.newData.name}</strong>
        <div>${item.newData.designation}</div>
        ${diffs}
      `;

      card.querySelector("input").onchange = e => {
        diffView[i].apply = e.target.checked;
      };
    }

    el.appendChild(card);
  });
}

/* =========================
   APPLY
========================= */
function handleSubmit() {
  if (!unlocked) return;
  if (!confirm("Apply selected changes?")) return;

  diffView.forEach(item => {
    if (item.type === "NEW") {
      existingDB.push({
        ...item.newData,
        active: true,
        id: `UOL-${crypto.randomUUID()}`
      });
    }

    if (item.type === "UPDATE" && item.apply) {
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
