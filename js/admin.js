/* =========================================================
   UOL Staff Directory – Admin Import Panel (SMART DIFF v2)
   Author: Gulzar Hussain
========================================================= */

const REQUIRED_FILENAME = "UOL_Staff_Master.csv";

/* =========================
   STATE
========================= */
let db = [];
let diffItems = [];
let unlocked = false;

/* =========================
   DOM
========================= */
const csvInput = document.getElementById("csvInput");
const submitBtn = document.getElementById("submitBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const activateAllBtn = document.getElementById("activateAllBtn");
const deactivateAllBtn = document.getElementById("deactivateAllBtn");

csvInput.addEventListener("change", handleUpload);
submitBtn.addEventListener("click", handleSubmit);
exportJsonBtn.addEventListener("click", exportJSON);
exportCsvBtn.addEventListener("click", exportCSV);
activateAllBtn.addEventListener("click", () => bulkStatus(true));
deactivateAllBtn.addEventListener("click", () => bulkStatus(false));

/* =========================
   NORMALIZATION (FOR COMPARE ONLY)
========================= */
function norm(str = "") {
  return str
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   LOAD DB
========================= */
async function loadDB() {
  try {
    const res = await fetch("data/staff.json");
    const data = await res.json();
    db = Array.isArray(data) ? data : [];
  } catch {
    db = [];
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
    activateAllBtn.classList.remove("hidden");
    deactivateAllBtn.classList.remove("hidden");

    document.getElementById("uploadGate").classList.add("hidden");
    document.getElementById("adminApp").classList.remove("hidden");

    renderDiff();
  } catch (e) {
    console.error(e);
    triggerInternalError();
  }
}

/* =========================
   BUILD DIFF
========================= */
function buildDiff(rows) {
  diffItems = [];

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

  const seen = new Set();

  rows.slice(1).forEach(r => {
    if (!r || r.length < headers.length) return;

    const csvRec = {
      campus: r[idx("campus")]?.trim() || "",
      department: r[idx("department")]?.trim() || "",
      name: r[idx("full name")]?.trim() || "",
      designation: r[idx("designation")]?.trim() || "",
      official_email: r[idx("official email")]?.trim() || "",
      phone: r[idx("phone")]?.trim() || "",
      personal_email: r[idx("personal email")]?.trim() || ""
    };

    if (!csvRec.name || !csvRec.phone) return;

    const signature = [
      norm(csvRec.name),
      norm(csvRec.designation),
      norm(csvRec.personal_email),
      norm(csvRec.phone)
    ].join("|");

    if (seen.has(signature)) return;
    seen.add(signature);

    const dbMatch = db.find(d =>
      norm(d.name) === norm(csvRec.name) &&
      norm(d.designation) === norm(csvRec.designation) &&
      norm(d.personal_email || "") === norm(csvRec.personal_email) &&
      norm(d.phone) === norm(csvRec.phone)
    );

    if (!dbMatch) {
      diffItems.push({
        type: "NEW",
        data: {
          ...csvRec,
          active: true
        }
      });
      return;
    }

    const changes = {};
    ["campus", "department", "official_email"].forEach(k => {
      if (norm(dbMatch[k] || "") !== norm(csvRec[k] || "")) {
        changes[k] = {
          from: dbMatch[k] || "",
          to: csvRec[k] || ""
        };
      }
    });

    if (Object.keys(changes).length) {
      diffItems.push({
        type: "UPDATE",
        dbRef: dbMatch,
        data: { ...dbMatch, ...csvRec },
        changes,
        apply: true
      });
    }
  });
}

/* =========================
   RENDER
========================= */
function renderDiff() {
  const el = document.getElementById("directory");
  el.innerHTML = "";

  if (!diffItems.length) {
    el.innerHTML =
      "<p style='text-align:center'>No new or updated records</p>";
    return;
  }

  diffItems.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "card";

    const statusSelect = `
      <select data-status="${i}">
        <option value="true" ${item.data.active ? "selected" : ""}>Active</option>
        <option value="false" ${!item.data.active ? "selected" : ""}>Inactive</option>
      </select>
    `;

    if (item.type === "NEW") {
      card.innerHTML = `
        <div class="badge new">NEW</div>
        <strong>${item.data.name}</strong>
        <div>${item.data.designation}</div>
        <div>${item.data.department} • ${item.data.campus}</div>
        <div>Status: ${statusSelect}</div>
      `;
    }

    if (item.type === "UPDATE") {
      const diffs = Object.entries(item.changes)
        .map(
          ([k, v]) =>
            `<div class="diff">${k}: ${v.from} → <strong>${v.to}</strong></div>`
        )
        .join("");

      card.innerHTML = `
        <label>
          <input type="checkbox" checked data-apply="${i}">
          <span class="badge update">UPDATE</span>
        </label>
        <strong>${item.data.name}</strong>
        <div>${item.data.designation}</div>
        ${diffs}
        <div>Status: ${statusSelect}</div>
      `;

      card.querySelector(`[data-apply="${i}"]`).onchange = e => {
        item.apply = e.target.checked;
      };
    }

    card.querySelector(`[data-status="${i}"]`).onchange = e => {
      item.data.active = e.target.value === "true";
    };

    el.appendChild(card);
  });
}

/* =========================
   BULK STATUS
========================= */
function bulkStatus(value) {
  diffItems.forEach(i => (i.data.active = value));
  renderDiff();
}

/* =========================
   APPLY
========================= */
function handleSubmit() {
  if (!unlocked) return;
  if (!confirm("Apply selected changes?")) return;

  diffItems.forEach(item => {
    if (item.type === "NEW") {
      db.push({
        ...item.data,
        id: `UOL-${crypto.randomUUID()}`
      });
    }

    if (item.type === "UPDATE" && item.apply) {
      Object.assign(item.dbRef, item.data);
    }
  });

  alert("Changes applied. Export to save.");
}

/* =========================
   EXPORT
========================= */
function exportJSON() {
  download("staff.json", JSON.stringify(db, null, 2));
}

function exportCSV() {
  const headers = Object.keys(db[0]);
  const rows = db.map(r =>
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
