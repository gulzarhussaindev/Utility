/* ======================
   PWA INSTALL BUTTON
====================== */
let deferredInstallPrompt = null;
const installBtn = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
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
   SEARCH CLEAR BUTTON
====================== */
function setupSearchClear() {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";

  searchInput.parentNode.insertBefore(wrapper, searchInput);
  wrapper.appendChild(searchInput);

  const clearBtn = document.createElement("button");
  clearBtn.innerHTML = "&times;";
  clearBtn.setAttribute("aria-label", "Clear search");

  clearBtn.style.position = "absolute";
  clearBtn.style.right = "14px";
  clearBtn.style.top = "50%";
  clearBtn.style.transform = "translateY(-50%)";
  clearBtn.style.fontSize = "18px";
  clearBtn.style.color = "#64748b";
  clearBtn.style.cursor = "pointer";
  clearBtn.style.display = "none";

  clearBtn.onclick = () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    searchInput.focus();
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

    tab.className =
      "px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition " +
      (i === 0
        ? "bg-uol-accent text-white shadow-md"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200");

    tab.textContent = campus;

    tab.onclick = () => {
      activeCampus = campus;

      // 🔑 CRITICAL FIX — reset department
      activeDepartment = "All";

      document.querySelectorAll("#campusTabs button").forEach(b => {
        b.className =
          "px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition bg-slate-100 text-slate-600 hover:bg-slate-200";
      });

      tab.className =
        "px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition bg-uol-accent text-white shadow-md";

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
  // 🔒 HARD RESET (prevents stale filters)
  activeDepartment = "All";

  const pills = document.getElementById("departmentPills");
  pills.innerHTML = "";

  const staff = allStaff.filter(p => p.campus === activeCampus);
  const departments = ["All", ...new Set(staff.map(p => p.department))];

  departments.forEach((dept, i) => {
    const pill = document.createElement("button");

    pill.className =
      "px-4 py-1.5 rounded-full text-xs font-medium transition " +
      (i === 0
        ? "bg-uol-primary text-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200");

    pill.textContent = dept;

    pill.onclick = () => {
      activeDepartment = dept;

      document.querySelectorAll("#departmentPills button").forEach(b => {
        b.className =
          "px-4 py-1.5 rounded-full text-xs font-medium transition bg-slate-100 text-slate-600 hover:bg-slate-200";
      });

      pill.className =
        "px-4 py-1.5 rounded-full text-xs font-medium transition bg-uol-primary text-white";

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

  filtered.sort((a, b) => a.name.localeCompare(b.name));
  render(filtered);
}

/* ======================
   CARDS
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

        <div class="flex justify-between gap-2">
          <span>
            <span class="text-gray-400 text-xs mr-1">Official:</span>
            ${p.official_email}
          </span>
          <button class="copy-btn" onclick="copyText('${p.official_email}', this)">Copy</button>
        </div>

        ${
          p.personal_email
            ? `<div class="flex justify-between gap-2 text-xs text-gray-500">
                 <span>
                   <span class="text-gray-400 mr-1">Personal:</span>
                   ${p.personal_email}
                 </span>
                 <button class="copy-btn" onclick="copyText('${p.personal_email}', this)">Copy</button>
               </div>`
            : ""
        }

        <div class="flex justify-between gap-2">
          <span>
            <span class="text-gray-400 text-xs mr-1">Phone:</span>
            ${p.phone}
          </span>
          <button class="copy-btn" onclick="copyText('${p.phone}', this)">Copy</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

/* ======================
   COPY
====================== */
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1200);
  });
}

/* ======================
   PWA UPDATE LISTENER
====================== */
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data && event.data.type === "DATA_UPDATED") {
      if (localStorage.getItem("uol_update_ack") === "true") return;
      const banner = document.getElementById("updateBanner");
      if (banner) {
        banner.style.display = "flex";
        localStorage.setItem("uol_update_ack", "true");
      }
    }
  });
}

function handleUpdateRefresh() {
  localStorage.removeItem("uol_update_ack");
  const banner = document.getElementById("updateBanner");
  if (banner) banner.style.display = "none";
  location.reload();
}
