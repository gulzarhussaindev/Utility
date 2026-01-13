const REQUIRED_FILENAME = "UOL_Staff_Master.csv";

let mergedDB = [];
let activeCampus = null;
let activeDepartment = "All";
let unlocked = false;

const csvInput = document.getElementById("csvInput");
const submitBtn = document.getElementById("submitBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

csvInput.addEventListener("change", handleUpload);
submitBtn.addEventListener("click", handleSubmit);
exportJsonBtn.addEventListener("click", exportJSON);
exportCsvBtn.addEventListener("click", exportCSV);

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
    const rows = text
      .trim()
      .split("\n")
      .map(r => r.split(","));

    await loadDB();
    mergeCSV(rows);

    unlocked = true;
    submitBtn.disabled = false;
    exportJsonBtn.classList.remove("hidden");
    exportCsvBtn.classList.remove("hidden");

    document.getElementById("uploadGate").classList.add("hidden");
    document.getElementById("adminApp").classList.remove("hidden");

    initUI();
  } catch (e) {
    console.error(e);
    triggerInternalError();
  }
}

/* =========================
   LOAD EXISTING DATABASE
========================= */
async function loadDB() {
  const res = await fetch("data/staff.json");
  mergedDB = await res.json();
}

/* =========================
   CSV MERGE (ROBUST)
========================= */
function mergeCSV(rows) {
  if (!rows || rows.length < 2) triggerInternalError();

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = name => headers.indexOf(name);

  const REQUIRED_COLUMNS = [
    "campus",
    "department",
    "full name",
    "designation",
    "official email",
    "phone",
    "personal email",
    "status"
  ];

  for (const col of REQUIRED_COLUMNS) {
    if (idx(col) === -1) triggerInternalError();
  }

  rows.slice(1).forEach(r => {
    if (!r || r.length < headers.length) return;

    const email = (r[idx("official email")] || "").trim();
    if (!email) return;

    const statusRaw = (r[idx("status")] || "active")
      .toString()
      .trim()
      .toLowerCase();

    const rec = {
      campus: (r[idx("campus")] || "").trim(),
      department: (r[idx("department")] || "").trim(),
      name: (r[idx("full name")] || "").trim(),
      designation: (r[idx("designation")] || "").trim(),
      official_email: email,
      phone: (r[idx("phone")] || "").trim(),
      personal_email: (r[idx("personal email")] || "").trim(),
      active: statusRaw === "active"
    };

    const existing = mergedDB.find(
      x => x.official_email.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      Object.assign(existing, rec);
    } else {
      mergedDB.push({
        ...rec,
        id: `UOL-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      });
    }
  });
}

/* =========================
   UI INITIALIZATION
========================= */
function initUI() {
  const campuses = [...new Set(mergedDB.map(r => r.campus))];
  activeCampus = campuses[0];
  renderCampuses(campuses);
  renderDepartments();
}

function renderCampuses(list) {
  const el = document.getElementById("campusTabs");
  el.innerHTML = "";

  list.forEach(c => {
    const t = document.createElement("div");
    t.className = "tab" + (c === activeCampus ? " active" : "");
    t.textContent = c;
    t.onclick = () => {
      activeCampus = c;
      activeDepartment = "All";
      renderCampuses(list);
      renderDepartments();
    };
    el.appendChild(t);
  });
}

function renderDepartments() {
  const staff = mergedDB.filter(r => r.campus === activeCampus);
  const depts = ["All", ...new Set(staff.map(r => r.department))];

  const el = document.getElementById("departmentPills");
  el.innerHTML = "";

  depts.forEach(d => {
    const p = document.createElement("div");
    p.className = "pill" + (d === activeDepartment ? " active" : "");
    p.textContent = d;
    p.onclick = () => {
      activeDepartment = d;
      renderDepartments();
      renderCards();
    };
    el.appendChild(p);
  });

  renderCards();
}

function renderCards() {
  const el = document.getElementById("directory");
  el.innerHTML = "";

  mergedDB
    .filter(r => r.campus === activeCampus)
    .filter(r => activeDepartment === "All" || r.department === activeDepartment)
    .forEach(r => el.appendChild(createCard(r)));
}

function createCard(r) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    ${editable("Name", r, "name")}
    ${editable("Designation", r, "designation")}
    ${editable("Email", r, "official_email")}
    ${editable("Phone", r, "phone")}
    ${editable("Personal Email", r, "personal_email")}
    <div class="field">
      Status:
      <select>
        <option value="true" ${r.active ? "selected" : ""}>Active</option>
        <option value="false" ${!r.active ? "selected" : ""}>Inactive</option>
      </select>
    </div>
  `;

  card.querySelector("select").onchange = e => {
    r.active = e.target.value === "true";
  };

  return card;
}

function editable(label, obj, key) {
  return `
    <div class="field">
      ${label}:
      <span onclick="editField(this,'${key}')">${obj[key] || ""}</span>
    </div>
  `;
}

/* =========================
   SAFE INLINE EDIT
========================= */
window.editField = (el, key) => {
  const card = el.closest(".card");
  const index = [...card.parentNode.children].indexOf(card);

  const input = document.createElement("input");
  input.value = el.textContent;

  input.onblur = () => {
    mergedDB[index][key] = input.value;
    el.textContent = input.value;
    input.replaceWith(el);
  };

  el.replaceWith(input);
  input.focus();
};

/* =========================
   SUBMIT
========================= */
function handleSubmit() {
  if (!unlocked) return;
  if (!confirm("Are you sure you want to apply these changes?")) return;
  alert("Changes finalized. Please export and commit the file.");
}

/* =========================
   EXPORT
========================= */
function exportJSON() {
  download("staff.json", JSON.stringify(mergedDB, null, 2));
}

function exportCSV() {
  const headers = Object.keys(mergedDB[0]);
  const rows = mergedDB.map(r => headers.map(h => r[h] ?? "").join(","));
  download("UOL_Staff_Export.csv", [headers.join(","), ...rows].join("\n"));
}

function download(name, content) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content]));
  a.download = name;
  a.click();
}

/* =========================
   ERROR (DETERRENCE)
========================= */
function triggerInternalError() {
  document.body.innerHTML =
    "<h2 style='text-align:center;font-family:Inter'>Internal Server Error</h2>";
}
