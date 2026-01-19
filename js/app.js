/* ======================
   UOL Staff Directory – Frontend App
   Author: Gulzar Hussain
====================== */

/* ======================
   TEXT NORMALIZATION (IT SAFE)
====================== */
function normalizeText(str = "") {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => (w === "it" ? "IT" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .trim();
}

/* ======================
   PWA INSTALL
====================== */
let deferredInstallPrompt = null;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.classList.remove("hidden");
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") installBtn.classList.add("hidden");
    deferredInstallPrompt = null;
  });
}

/* ======================
   DATA
====================== */
let allStaff = [];
let activeCampus = null;
let activeDepartment = "All";
const searchInput = document.getElementById("searchInput");

fetch("data/staff.json")
  .then(res => res.json())
  .then(data => {
    allStaff = data
      .filter(p => p.active !== false)
      .map(p => ({
        ...p,
        name: normalizeText(p.name),
        designation: normalizeText(p.designation),
        campus: normalizeText(p.campus),
        department: normalizeText(p.department)
      }));

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
  Object.assign(clearBtn.style, {
    position: "absolute",
    right: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "18px",
    color: "#64748b",
    cursor: "pointer",
    display: "none"
  });

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
   CAMPUS / DEPARTMENT
====================== */
function initCampuses() {
  const campuses = [...new Set(allStaff.map(p => p.campus))];
  const tabs = document.getElementById("campusTabs");
  tabs.innerHTML = "";

  campuses.forEach((campus, i) => {
    const tab = document.createElement("button");
    tab.textContent = campus;
    tab.className =
      "px-5 py-2.5 rounded-full text-sm font-medium transition " +
      (i === 0
        ? "bg-uol-accent text-white"
        : "bg-slate-100 text-slate-600");

    tab.onclick = () => {
      activeCampus = campus;
      activeDepartment = "All";
      initDepartments();
    };

    if (i === 0) activeCampus = campus;
    tabs.appendChild(tab);
  });

  initDepartments();
}

function initDepartments() {
  const pills = document.getElementById("departmentPills");
  pills.innerHTML = "";

  const staff = allStaff.filter(p => p.campus === activeCampus);
  const depts = ["All", ...new Set(staff.map(p => p.department))];

  depts.forEach((d, i) => {
    const pill = document.createElement("button");
    pill.textContent = d;
    pill.className =
      "px-4 py-1.5 rounded-full text-xs font-medium " +
      (i === 0 ? "bg-uol-primary text-white" : "bg-slate-100");

    pill.onclick = () => {
      activeDepartment = d;
      applyFilters();
    };

    pills.appendChild(pill);
  });

  applyFilters();
}

/* ======================
   FILTER & RENDER
====================== */
searchInput.addEventListener("input", applyFilters);

function applyFilters() {
  const q = searchInput.value.toLowerCase();

  let filtered = allStaff.filter(p => p.campus === activeCampus);

  if (activeDepartment !== "All") {
    filtered = filtered.filter(p => p.department === activeDepartment);
  }

  if (q) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.official_email.toLowerCase().includes(q) ||
      (p.personal_email || "").toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }

  render(filtered);
}

function render(list) {
  const el = document.getElementById("directory");
  el.innerHTML = "";

  if (!list.length) {
    el.innerHTML = "<p>No records found</p>";
    return;
  }

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${p.name}</h3>
      <p>${p.designation}</p>
      <p>${p.department} • ${p.campus}</p>
      <p>${p.official_email}</p>
      ${p.personal_email ? `<p>${p.personal_email}</p>` : ""}
      <p>${p.phone}</p>
    `;
    el.appendChild(card);
  });
}
