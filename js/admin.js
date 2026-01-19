/* =========================================================
   UOL Staff Directory – Admin Import Panel (FLAT MODE)
   Author: Gulzar Hussain
========================================================= */

const REQUIRED_FILENAME = "UOL_Staff_Master.csv";

let mergedDB = [];
let unlocked = false;
let firstCleanImport = false;

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
   NORMALIZE (IMPORT ONLY)
========================= */
function toTitleCase(str = "") {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
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

    if (mergedDB.length === 0) {
      firstCleanImport = true;
      mergedDB = [];
    }

    mergeCSV(rows);

    unlocked = true;
    submitBtn.disabled = false;
    exportJsonBtn.classList.remove("hidden");
    exportCsvBtn.classList.remove("hidden");
    activateAllBtn.classList.remove("hidden");
    deactivateAllBtn.classList.remove("hidden");

    document.getElementById("uploadGate").classList.add("hidden");
    document.getElementById("adminApp").classList.remove("hidden");

    renderAllCards();
  } catch (e) {
    console.error(e);
    triggerInternalError();
  }
}

/* =========================
   LOAD DB
========================= */
async function loadDB() {
  try {
    const res = await fetch("data/staff.json");
    const data = await res.json();
    mergedDB = Array.isArray(data) ? data : [];
  } catch {
    mergedDB = [];
  }
}

/* =========================
   MERGE CSV
   - normalize here
   - ignore duplicates completely
========================= */
function mergeCSV(rows) {
  if (!rows || rows.length < 2) triggerInternalError();

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

    // Minimum required
    if (!rec.name || !rec.phone) return;

    // 🔑 STRICT DUPLICATE CHECK
    const duplicate = mergedDB.some(x =>
      x.name === rec.name &&
      x.designation === rec.designation &&
      (x.personal_email || "") === (rec.personal_email || "") &&
      x.phone === rec.phone
    );

    if (duplicate) return; // ❌ ignore completely

    mergedDB.push({
      ...rec,
      id: firstCleanImport
        ? `UOL-${crypto.randomUUID()}`
        : `UOL-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    });
  });
}

/* =========================
   RENDER – FLAT
========================= */
function renderAllCards() {
  const el = document.getElementById("directory");
  el.innerHTML = "";

  mergedDB.forEach((r, i) => {
    el.appendChild(createCard(r, i));
  });
}

function createCard(r, index) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <div class="field text-xs text-gray-500">
      ${r.campus} • ${r.department}
    </div>

    ${editable("Name", r, "name", index)}
    ${editable("Designation", r, "designation", index)}
    ${editable("Official Email", r, "official_email", index)}
    ${editable("Phone", r, "phone", index)}
    ${editable("Personal Email", r, "personal_email", index)}

    <div class="field">
      Status:
      <select data-index="${index}">
        <option value="true" ${r.active ? "selected" : ""}>Active</option>
        <option value="false" ${!r.active ? "selected" : ""}>Inactive</option>
      </select>
    </div>
  `;

  card.querySelector("select").onchange = e => {
    mergedDB[index].active = e.target.value === "true";
  };

  return card;
}

function editable(label, obj, key, index) {
  return `
    <div class="field">
      ${label}:
      <span onclick="editField(this,'${key}',${index})">${obj[key] || ""}</span>
    </div>
  `;
}

window.editField = (el, key, index) => {
  const input = document.createElement("input");
  input.value = el.textContent;

  input.onblur = () => {
    mergedDB[index][key] = input.value.trim();
    el.textContent = mergedDB[index][key];
    input.replaceWith(el);
  };

  el.replaceWith(input);
  input.focus();
};

/* =========================
   BULK STATUS
========================= */
function bulkStatus(value) {
  if (!confirm(`Set all users to ${value ? "Active" : "Inactive"}?`)) return;
  mergedDB.forEach(r => (r.active = value));
  renderAllCards();
}

/* =========================
   SUBMIT
========================= */
function handleSubmit() {
  if (!unlocked) return;
  if (!confirm("Finalize all changes?")) return;
  alert("Changes finalized. Export and commit the updated file.");
}

/* =========================
   EXPORT
========================= */
function exportJSON() {
  download("staff.json", JSON.stringify(mergedDB, null, 2));
}

function exportCSV() {
  const headers = Object.keys(mergedDB[0]);
  const rows = mergedDB.map(r =>
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
