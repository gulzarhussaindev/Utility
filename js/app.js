/* ======================
   UOL Staff Directory – Frontend App
   Author: Gulzar Hussain
====================== */

/* ======================
   PWA INSTALL BUTTON
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

window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.classList.add("hidden");
});

/* ======================
   DATA & STATE
====================== */
let allStaff = [];
let activeCampus = null;
let activeDepartment = "All";

const searchInput = document.getElementById("searchInput");

/* ======================
   LOAD DATA (ALWAYS FRESH)
====================== */
fetch(`data/staff.json?v=${Date.now()}`)
  .then(res => res.json())
  .then(data => {
    allStaff = data.filter(p => p.active !== false);
    initCampuses();
    setupSearchClear();
  })
  .catch(() => {
    document.getElementById("directory").innerHTML =
      '<p class="col-span-full text-center text-red-500">Unable to load data</p>';
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
   DEPARTMENT PILLS
====================== */
function initDepartments() {
  activeDepartment = "All";
  const pills = document.getElementById("departmentPills");
  pills.innerHTML = "";

  const staff = allStaff.filter(p => p.campus === activeCampus);
  const departments = ["All", ...new Set(staff.map(p => p.department))];

  departments.forEach((dept, i) => {
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
        .forEach(b => b.classList.remove("bg-uol-primary", "text-white"));
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

  let filtered = q
    ? allStaff // 🔑 GLOBAL SEARCH (ALL CAMPUSES)
    : allStaff.filter(p => p.campus === activeCampus);

  if (!q && activeDepartment !== "All") {
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
        ${renderRow("Official", p.official_email)}
        ${p.personal_email ? renderRow("Personal", p.personal_email) : ""}
        ${renderRow("Phone", p.phone)}
      </div>
    `;

    container.appendChild(card);
  });
}

/* ======================
   CONTACT ROW
====================== */
function renderRow(label, value) {
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
