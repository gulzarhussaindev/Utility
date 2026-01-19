/* ======================================================
   UOL Staff Directory – Frontend App
   Author: Gulzar Hussain
====================================================== */

/* ======================
   STATE
====================== */
let allStaff = [];
let activeCampus = null;
let activeDepartment = "All";

const searchInput = document.getElementById("searchInput");

/* ======================
   DEPARTMENT PRIORITY (CAMPUS-WISE)
====================== */
const DEPT_PRIORITY = {
  "Leh Campus": [
    "Vice Chancellor Office",
    "Registrar Office",
    "Dean Offices",
    "Finance & Accounts",
    "Deputy Controller of Examination Office",
    "IT Admission Cell",
    "IT Examination Cell",
    "Faculties",
    "Media Cell",
    "Works Department"
  ],

  "Kargil Campus": [
    "Incharge Administration Office",
    "Deputy Controller of Examination Office",
    "Faculties"
  ],

  "SAS&T Leh": [
    "Directors SAS&T Leh Office",
    "Faculties"
  ],

  "SAS&T Kargil": [
    "Directors SAS&T Kargil Office",
    "Faculties"
  ],

  "Director College Development Council": [
    "Director College Development Council Office",
    "Eliezer Joldan Memorial College Leh Principal Office",
    "Govt Degree College Kargil Principal Office",
    "Govt Degree College Khaltsi Principal Office",
    "Govt Degree College Nubra Principal Office",
    "Govt Degree College Zanskar Principal Office",
    "Govt Degree College Drass Principal Office"
  ]
};

/* ======================
   UTIL – NORMALIZE (COMPARE ONLY)
====================== */
function normalizeKey(str = "") {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

/* ======================
   LOAD DATA
====================== */
fetch("data/staff.json")
  .then(res => res.json())
  .then(data => {
    allStaff = data.filter(p => p.active !== false);
    initCampuses();
    setupSearchClear();
  });

/* ======================
   SEARCH CLEAR
====================== */
function setupSearchClear() {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  searchInput.parentNode.insertBefore(wrapper, searchInput);
  wrapper.appendChild(searchInput);

  const clearBtn = document.createElement("button");
  clearBtn.innerHTML = "&times;";
  clearBtn.style.cssText =
    "position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;color:#64748b;cursor:pointer;display:none";

  clearBtn.onclick = () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    applyFilters();
  };

  wrapper.appendChild(clearBtn);
  searchInput.addEventListener("input", () => {
    clearBtn.style.display = searchInput.value ? "block" : "none";
  });
}

/* ======================
   CAMPUS TABS
====================== */
function initCampuses() {
  const campuses = [...new Set(allStaff.map(p => p.campus))];
  const tabs = document.getElementById("campusTabs");
  tabs.innerHTML = "";

  campuses.forEach((campus, i) => {
    const tab = document.createElement("button");
    tab.textContent = campus;
    tab.className =
      "px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition " +
      (i === 0
        ? "bg-uol-accent text-white shadow-md"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200");

    tab.onclick = () => {
      activeCampus = campus;
      activeDepartment = "All";

      document.querySelectorAll("#campusTabs button").forEach(b =>
        b.classList.remove("bg-uol-accent", "text-white", "shadow-md")
      );

      tab.classList.add("bg-uol-accent", "text-white", "shadow-md");
      initDepartments();
    };

    if (i === 0) activeCampus = campus;
    tabs.appendChild(tab);
  });

  initDepartments();
}

/* ======================
   DEPARTMENT PILLS (PRIORITY-AWARE)
====================== */
function initDepartments() {
  activeDepartment = "All";
  const pills = document.getElementById("departmentPills");
  pills.innerHTML = "";

  const staff = allStaff.filter(p => p.campus === activeCampus);

  // Unique departments (normalized)
  const deptMap = new Map();
  staff.forEach(p => {
    const key = normalizeKey(p.department);
    if (!deptMap.has(key)) deptMap.set(key, p.department);
  });

  const available = [...deptMap.values()];
  const priority = DEPT_PRIORITY[activeCampus] || [];

  const ordered = [];
  const used = new Set();

  priority.forEach(p => {
    const match = available.find(
      d => normalizeKey(d) === normalizeKey(p)
    );
    if (match) {
      ordered.push(match);
      used.add(normalizeKey(match));
    }
  });

  const others = available.filter(
    d => !used.has(normalizeKey(d))
  );

  const finalList = ["All", ...ordered, ...others];

  finalList.forEach((dept, i) => {
    const pill = document.createElement("button");
    pill.textContent = dept;
    pill.className =
      "px-4 py-1.5 rounded-full text-xs font-medium transition " +
      (i === 0
        ? "bg-uol-primary text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200");

    pill.onclick = () => {
      activeDepartment = dept;
      document
        .querySelectorAll("#departmentPills button")
        .forEach(b =>
          b.classList.remove("bg-uol-primary", "text-white")
        );
      pill.classList.add("bg-uol-primary", "text-white");
      applyFilters();
    };

    pills.appendChild(pill);
  });

  applyFilters();
}

/* ======================
   FILTERING
====================== */
searchInput.addEventListener("input", applyFilters);

function applyFilters() {
  const q = searchInput.value.toLowerCase().trim();

  let filtered;

  if (q) {
    // 🔍 SEARCH IS GLOBAL (ALL CAMPUSES)
    filtered = allStaff.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.official_email.toLowerCase().includes(q) ||
      (p.personal_email || "").toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  } else {
    // 📍 NORMAL MODE (CAMPUS + DEPT)
    filtered = allStaff.filter(p => p.campus === activeCampus);
    if (activeDepartment !== "All") {
      filtered = filtered.filter(p => p.department === activeDepartment);
    }
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));
  render(filtered);
}

/* ======================
   RENDER
====================== */
function render(list) {
  const container = document.getElementById("directory");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML =
      '<p class="col-span-full text-center text-slate-500">No records found</p>';
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className =
      "group bg-white rounded-xl border border-gray-200 p-5 transition hover:-translate-y-1 hover:shadow-xl";

    card.innerHTML = `
      <h3 class="text-lg font-semibold text-gray-900">${p.name}</h3>
      <p class="text-sm font-medium text-uol-accent">${p.designation}</p>

      <p class="mt-1 text-xs text-gray-500">
        ${p.department} &bull; ${p.campus}
      </p>

      <div class="mt-4 space-y-2 text-sm text-gray-600">
        ${row("Official", p.official_email)}
        ${p.personal_email ? row("Personal", p.personal_email) : ""}
        ${row("Phone", p.phone)}
      </div>
    `;

    container.appendChild(card);
  });
}

function row(label, value) {
  return `
    <div class="flex justify-between gap-2">
      <span>
        <span class="text-gray-400 text-xs mr-1">${label}:</span>
        ${value}
      </span>
      <button class="copy-btn" data-copy="${value}">Copy</button>
    </div>
  `;
}

/* ======================
   COPY (GREEN STATE)
====================== */
document.addEventListener("click", e => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;

  navigator.clipboard.writeText(btn.dataset.copy).then(() => {
    btn.textContent = "Copied";
    btn.classList.add("copied");

    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1200);
  });
});
