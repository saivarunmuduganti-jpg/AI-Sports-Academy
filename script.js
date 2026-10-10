/* =========================================================
   AI SPORTS ACADEMY - POSTGRESQL FRONTEND
   ========================================================= */

const API = "https://ai-sports-academy.onrender.com/api";
const SPORTS = [
  "All Sports",
  "Cricket",
  "Football",
  "Basketball",
  "Badminton",
  "Swimming",
  "Tennis",
  "Volleyball",
  "Athletics",
  "Hockey",
  "Table Tennis",
  "Kabaddi",
  "Boxing",
  "Wrestling",
  "Archery",
  "Cycling",
  "Gymnastics",
  "Chess"
];

let players = [];
let coaches = [];
let schedules = [];
let fees = [];
let notifications = JSON.parse(
  localStorage.getItem("sportsAcademyNotifications") || "[]"

);
console.log("Loaded saved notifications:", notifications);

let performanceChart = null;
let sportChart = null;
let metricsChart = null;


/* =========================================================
   API
   ========================================================= */

async function api(path, options = {}) {

  const response = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let data = {};

  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Request failed: ${response.status}`
    );
  }

  return data;
}


/* =========================================================
   LOGIN / REGISTER
   ========================================================= */

async function createAccount() {

  const username =
    document.getElementById("newUsername").value.trim();

  const password =
    document.getElementById("newPassword").value;

  const confirmPassword =
    document.getElementById("confirmPassword").value;

  const role =
    document.getElementById("newRole").value;

  const message =
    document.getElementById("registerMessage");


  if (!username) {
    message.style.color = "red";
    message.textContent =
      "Please enter a username.";
    return;
  }


  if (password.length < 4) {
    message.style.color = "red";
    message.textContent =
      "Password must contain at least 4 characters.";
    return;
  }


  if (password !== confirmPassword) {
    message.style.color = "red";
    message.textContent =
      "Passwords do not match.";
    return;
  }


  try {

    const result = await api("/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        role
      })
    });


    message.style.color = "green";

    message.textContent =
      result.message ||
      "Account created successfully.";


    setTimeout(() => {

      showLogin();

      document.getElementById(
        "username"
      ).value = username;

    }, 700);


  } catch (error) {

    message.style.color = "red";

    message.textContent =
      error.message;

  }
}


async function login() {

  const username =
    document.getElementById(
      "username"
    ).value.trim();

  const password =
    document.getElementById(
      "password"
    ).value;

  const selectedRole =
    document.getElementById(
      "role"
    ).value;

  const error =
    document.getElementById(
      "loginError"
    );


  error.textContent = "";


  if (!username || !password) {

    error.textContent =
      "Please enter username and password.";

    return;
  }


  try {

    const result = await api("/login", {

      method: "POST",

      body: JSON.stringify({
        username,
        password,
        role: selectedRole
      })

    });


    sessionStorage.setItem(
      "loggedInUser",
      JSON.stringify(result.user)
    );


    if (
      document.getElementById(
        "rememberUsername"
      )?.checked
    ) {

      localStorage.setItem(
        "rememberedUsername",
        username
      );

    } else {

      localStorage.removeItem(
        "rememberedUsername"
      );

    }


    document.getElementById(
      "loginPage"
    ).classList.add("hidden");


    document.getElementById(
      "app"
    ).classList.remove("hidden");


    document.getElementById(
      "headerRole"
    ).textContent =
      result.user.role;


    await initApp();


  } catch (err) {

    error.textContent =
      err.message;

  }
}


function showRegister() {

  document.getElementById(
    "loginForm"
  ).classList.add("hidden");


  document.getElementById(
    "registerForm"
  ).classList.remove("hidden");

}


function showLogin() {

  document.getElementById(
    "registerForm"
  ).classList.add("hidden");


  document.getElementById(
    "loginForm"
  ).classList.remove("hidden");

}


function logout() {

  sessionStorage.removeItem(
    "loggedInUser"
  );


  document.getElementById(
    "app"
  ).classList.add("hidden");


  document.getElementById(
    "loginPage"
  ).classList.remove("hidden");


  document.getElementById(
    "password"
  ).value = "";

}


function loadRememberedUsername() {

  const username =
    localStorage.getItem(
      "rememberedUsername"
    );

  const input =
    document.getElementById(
      "username"
    );


  if (username && input) {

    input.value = username;

    const remember =
      document.getElementById(
        "rememberUsername"
      );

    if (remember) {
      remember.checked = true;
    }

  }

}


/* =========================================================
   LOAD POSTGRESQL DATA
   ========================================================= */

async function loadAcademyData() {

  const [
    playersData,
    coachesData,
    feesData,
    trainingData
  ] = await Promise.all([

    api("/players"),

    api("/coaches"),

    api("/fees"),

    api("/training")

  ]);


  players =
    Array.isArray(playersData)
      ? playersData
      : [];


  coaches =
    Array.isArray(coachesData)
      ? coachesData
      : [];


  fees =
    Array.isArray(feesData)
      ? feesData
      : [];


  schedules =
    Array.isArray(trainingData)
      ? trainingData
      : [];




}


async function initApp() {

  try {
await loadAcademyData();

fillSportSelects();

fillFeePlayers();

await loadPerformancePlayers();

loadSettings();

    renderAll();

    createCharts();


    const dateEl =
      document.getElementById(
        "attendanceDate"
      );


    if (dateEl) {

      dateEl.value =
        new Date()
          .toISOString()
          .slice(0, 10);

    }


  } catch (error) {

    console.error(error);

    alert(
      "Could not load PostgreSQL data: " +
      error.message
    );

  }

}


/* =========================================================
   SPORT SELECTS
   ========================================================= */

function fillSportSelects() {

  const ids = [

    "playerSportFilter",
    "coachSportFilter",
    "attendanceSport",
    "scheduleSportFilter",
    "mPlayerSport",
    "mCoachSport",
    "mScheduleSport",
    "performancePlayer",
    "injuryPlayer",
    "defaultSport"

  ];


  ids.forEach(id => {

    const el =
      document.getElementById(id);


    if (!el) return;


    const current =
      el.value;


    el.innerHTML = "";


    if (
      [
        "playerSportFilter",
        "coachSportFilter",
        "attendanceSport",
        "scheduleSportFilter"
      ].includes(id)
    ) {

      el.innerHTML =
        `<option>All Sports</option>`;

    }


    if (
      [
        "performancePlayer",
        "injuryPlayer"
      ].includes(id)
    ) {

      players.forEach(p => {

        el.innerHTML += `
          <option value="${p.id}">
            ${escapeHtml(p.name)}
          </option>
        `;

      });


    } else {

      SPORTS
        .filter(
          s => s !== "All Sports"
        )
        .forEach(s => {

          el.innerHTML += `
            <option>
              ${escapeHtml(s)}
            </option>
          `;

        });

    }


    if (
      current &&
      [...el.options].some(
        option =>
          option.value === current
      )
    ) {

      el.value = current;

    }

  });

}


/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {

  renderPlayers();

  renderCoaches();

  renderAttendance();

  renderSchedule();

  renderFees();

  renderPerformance();

  renderNotifications();

  renderReports();

  updateDashboard();

  updateFeeStats();

  fillFeePlayers();

}


/* =========================================================
   NAVIGATION
   ========================================================= */

function showPage(id, btn) {

  document
    .querySelectorAll(".page")
    .forEach(page =>
      page.classList.remove("active")
    );


  const page =
    document.getElementById(id);


  if (page) {
    page.classList.add("active");
  }


  document
    .querySelectorAll(".nav-btn")
    .forEach(b =>
      b.classList.remove("active")
    );


  if (btn) {
    btn.classList.add("active");
  }


  if (id === "performance") {
    createMetricsChart();
  }

}


async function refreshDashboard() {

  try {

    await loadAcademyData();

    fillSportSelects();

    renderAll();

    createCharts();

    alert(
      "Dashboard refreshed from PostgreSQL."
    );


  } catch (error) {

    alert(error.message);

  }

}


/* =========================================================
   PLAYERS
   ========================================================= */

function openPlayerModal(id = null) {

  document.getElementById(
    "editPlayerId"
  ).value = id || "";


  document.getElementById(
    "playerModalTitle"
  ).textContent =
    id
      ? "Edit Player"
      : "Add Player";


  if (id) {

    const p =
      players.find(
        x =>
          Number(x.id) ===
          Number(id)
      );


    if (!p) return;


    document.getElementById(
      "mPlayerName"
    ).value =
      p.name || "";


    document.getElementById(
      "mPlayerAge"
    ).value =
      p.age || "";


    document.getElementById(
      "mPlayerSport"
    ).value =
      p.sport || "Cricket";


    document.getElementById(
      "mPlayerBatch"
    ).value =
      p.batch || "U-14";


  } else {

    document.getElementById(
      "mPlayerName"
    ).value = "";


    document.getElementById(
      "mPlayerAge"
    ).value = "";


    document.getElementById(
      "mPlayerSport"
    ).selectedIndex = 0;


    document.getElementById(
      "mPlayerBatch"
    ).value = "U-14";

  }


  document.getElementById(
    "playerModal"
  ).classList.remove("hidden");

}


async function savePlayer() {

  const id =
    Number(
      document.getElementById(
        "editPlayerId"
      ).value
    );


  const name =
    document.getElementById(
      "mPlayerName"
    ).value.trim();


  const age =
    Number(
      document.getElementById(
        "mPlayerAge"
      ).value
    );


  const sport =
    document.getElementById(
      "mPlayerSport"
    ).value;


  const batch =
    document.getElementById(
      "mPlayerBatch"
    ).value;


  if (!name || !age || !sport) {

    alert(
      "Fill all player details."
    );

    return;

  }


  try {

    if (id) {

      await api(
        `/players/${id}`,
        {
          method: "PUT",

          body: JSON.stringify({
            name,
            age,
            sport,
            batch
          })

        }
      );


    } else {

      await api(
        "/players",
        {

          method: "POST",

          body: JSON.stringify({

            name,
            age,

            gender:
              "Not specified",

            sport,

            batch,

            attendance: 85,

            performance: 75,

            status: "Active"

          })

        }
      );

    }


    closeModal(
      "playerModal"
    );


    await loadAcademyData();

    fillSportSelects();

    renderAll();

    createCharts();


  } catch (error) {

    alert(
      "Player error: " +
      error.message
    );

  }

}


async function deletePlayer(id) {

  if (
    !confirm(
      "Delete this player?"
    )
  ) {
    return;
  }


  try {

    await api(
      `/players/${id}`,
      {
        method: "DELETE"
      }
    );


    await loadAcademyData();

    fillSportSelects();

    renderAll();

    createCharts();


  } catch (error) {

    alert(error.message);

  }

}


function renderPlayers() {

  const table =
    document.getElementById(
      "playerTable"
    );


  if (!table) return;


  const search =
    (
      document.getElementById(
        "playerSearch"
      )?.value || ""
    ).toLowerCase();


  const sport =
    document.getElementById(
      "playerSportFilter"
    )?.value ||
    "All Sports";


  const batch =
    document.getElementById(
      "playerBatchFilter"
    )?.value ||
    "All Batches";


  const status =
    document.getElementById(
      "playerStatusFilter"
    )?.value ||
    "All Status";


  const list =
    players.filter(p =>

      String(
        p.name || ""
      )
        .toLowerCase()
        .includes(search) &&

      (
        sport === "All Sports" ||
        p.sport === sport
      ) &&

      (
        batch === "All Batches" ||
        p.batch === batch
      ) &&

      (
        status === "All Status" ||
        p.status === status
      )

    );


  table.innerHTML =
    list.map(p => `

      <tr>

        <td>${p.id}</td>

        <td>
          <b>${escapeHtml(p.name)}</b>
        </td>

        <td>${p.age ?? ""}</td>

        <td>
          ${escapeHtml(p.sport)}
        </td>

        <td>
          ${escapeHtml(
            p.batch || "U-14"
          )}
        </td>

        <td>
          ${Number(
            p.attendance || 0
          )}%
        </td>

        <td>
          ${Number(
            p.performance || 0
          )}
        </td>

        <td>

          <span class="badge ${
            p.status === "Active"
              ? "present"
              : "absent"
          }">

            ${escapeHtml(
              p.status || "Active"
            )}

          </span>

        </td>

        <td>

          <button
            class="small-btn"
            onclick="openPlayerModal(${p.id})"
          >
            ✏️
          </button>

          <button
            class="small-btn"
            onclick="deletePlayer(${p.id})"
          >
            🗑
          </button>

        </td>

      </tr>

    `).join("");

}


/* =========================================================
   COACHES
   ========================================================= */

function openCoachModal() {

  document.getElementById(
    "mCoachName"
  ).value = "";


  document.getElementById(
    "mCoachExperience"
  ).value = "";


  document.getElementById(
    "coachModal"
  ).classList.remove("hidden");

}


async function saveCoach() {

  const name =
    document.getElementById(
      "mCoachName"
    ).value.trim();


  const experience =
    Number(
      document.getElementById(
        "mCoachExperience"
      ).value
    );


  const sport =
    document.getElementById(
      "mCoachSport"
    ).value;


  const batch =
    document.getElementById(
      "mCoachBatch"
    ).value;


  if (
    !name ||
    experience < 0 ||
    !sport
  ) {

    alert(
      "Fill all coach details."
    );

    return;

  }


  try {

    await api(
      "/coaches",
      {

        method: "POST",

        body: JSON.stringify({
          name,
          experience,
          sport,
          batch
        })

      }
    );


    closeModal(
      "coachModal"
    );


    await loadAcademyData();

    renderAll();


  } catch (error) {

    alert(error.message);

  }

}


async function deleteCoach(id) {

  if (
    !confirm(
      "Delete this coach?"
    )
  ) {
    return;
  }


  try {

    await api(
      `/coaches/${id}`,
      {
        method: "DELETE"
      }
    );


    await loadAcademyData();

    renderAll();


  } catch (error) {

    alert(error.message);

  }

}


function renderCoaches() {

  const grid =
    document.getElementById(
      "coachGrid"
    );


  if (!grid) return;


  const search =
    (
      document.getElementById(
        "coachSearch"
      )?.value || ""
    ).toLowerCase();


  const sport =
    document.getElementById(
      "coachSportFilter"
    )?.value ||
    "All Sports";


  const list =
    coaches.filter(c =>

      String(
        c.name || ""
      )
        .toLowerCase()
        .includes(search) &&

      (
        sport === "All Sports" ||
        c.sport === sport
      )

    );


  grid.innerHTML =
    list.map(c => {

      const playerCount =
        players.filter(
          p =>
            p.sport === c.sport
        ).length;


      return `

        <div class="coach-card">

          <div class="coach-icon">
            🧑‍🏫
          </div>

          <h2>
            ${escapeHtml(c.name)}
          </h2>

          <p>
            ${escapeHtml(c.sport)}
            Coach
          </p>

          <ul>

            <li>
              Experience:
              ${Number(
                c.experience || 0
              )} years
            </li>

            <li>
              Players:
              ${playerCount}
            </li>

          </ul>

          <div class="coach-actions">

            <button
              onclick="viewCoach(${c.id})"
            >
              View
            </button>

            <button
              class="outline"
              onclick="deleteCoach(${c.id})"
            >
              Delete
            </button>

          </div>

        </div>

      `;

    }).join("");

}


function viewCoach(id) {

  const c =
    coaches.find(
      x =>
        Number(x.id) ===
        Number(id)
    );


  if (!c) return;


  alert(
    `Coach: ${c.name}\n` +
    `Sport: ${c.sport}\n` +
    `Experience: ${c.experience} years`
  );

}


/* =========================================================
   ATTENDANCE
   ========================================================= */

function renderAttendance() {

  const table =
    document.getElementById(
      "attendanceTable"
    );


  if (!table) return;


  const sport =
    document.getElementById(
      "attendanceSport"
    )?.value ||
    "All Sports";


  const batch =
    document.getElementById(
      "attendanceBatch"
    )?.value ||
    "All Batches";


  const list =
    players.filter(p =>

      (
        sport === "All Sports" ||
        p.sport === sport
      ) &&

      (
        batch === "All Batches" ||
        p.batch === batch
      )

    );


  table.innerHTML =
    list.map(p => `

      <tr>

        <td>

          <input
            type="checkbox"
            class="attendance-check"
            data-id="${p.id}"
            ${
              Number(
                p.attendance || 0
              ) >= 80
                ? "checked"
                : ""
            }
          >

        </td>

        <td>
          ${escapeHtml(p.name)}
        </td>

        <td>
          ${escapeHtml(p.sport)}
        </td>

        <td>
          ${escapeHtml(
            p.batch || "U-14"
          )}
        </td>

        <td>

          <span class="badge ${
            Number(
              p.attendance || 0
            ) >= 75
              ? "present"
              : "absent"
          }">

            ${
              Number(
                p.attendance || 0
              ) >= 75
                ? "Present"
                : "Absent"
            }

          </span>

        </td>

      </tr>

    `).join("");

}


async function saveAttendance() {

  const attendanceDate =
    document.getElementById(
      "attendanceDate"
    )?.value ||

    new Date()
      .toISOString()
      .slice(0, 10);


  const checks =
    [
      ...document.querySelectorAll(
        ".attendance-check"
      )
    ];


  try {

    for (
      const check of checks
    ) {

      await api(
        "/attendance",
        {

          method: "POST",

          body: JSON.stringify({

            player_id:
              Number(
                check.dataset.id
              ),

            attendance_date:
              attendanceDate,

            status:
              check.checked
                ? "Present"
                : "Absent"

          })

        }
      );

    }


    await loadAcademyData();

    renderAll();

    createCharts();


    alert(
      "Attendance saved to PostgreSQL."
    );


  } catch (error) {

    alert(
      "Attendance error: " +
      error.message
    );

  }

}


/* =========================================================
   TRAINING / SCHEDULE
   ========================================================= */

function openScheduleModal() {

  document.getElementById(
    "mTime"
  ).value = "";


  document.getElementById(
    "mVenue"
  ).value = "";


  document.getElementById(
    "scheduleModal"
  ).classList.remove("hidden");

}


async function saveSchedule() {
  const day = document.getElementById("mDay").value;
  const time = document.getElementById("mTime").value.trim();
  const sport = document.getElementById("mScheduleSport").value;
  const batch = document.getElementById("mScheduleBatch").value;
  const venue =
    document.getElementById("mVenue").value.trim() || "Main Ground";

  if (!time) {
    alert("Enter training time.");
    return;
  }

  // Find coach for selected sport
  const coach = coaches.find(
    c => c.sport === sport
  );

  // Training description
  const description =
    `${sport} training session for ${batch} batch`;

  try {
    await api("/training", {
      method: "POST",

      body: JSON.stringify({
        day: day,
        time: time,
        sport: sport,
        batch: batch,
        venue: venue,

        coach_id: coach ? Number(coach.id) : null,

        session_date: new Date()
          .toISOString()
          .slice(0, 10),

        description: description
      })
    });

    closeModal("scheduleModal");

    await loadAcademyData();

    renderSchedule();

    alert("Training session saved to PostgreSQL.");

  } catch (error) {
    alert(
      "Schedule error: " +
      error.message
    );
  }
}

async function deleteSchedule(id) {

  if (
    !confirm(
      "Delete this training session?"
    )
  ) {
    return;
  }


  try {

    await api(
      `/training/${id}`,
      {
        method: "DELETE"
      }
    );


    await loadAcademyData();

    renderSchedule();


  } catch (error) {

    alert(error.message);

  }

}


function renderSchedule() {

  const table =
    document.getElementById(
      "scheduleTable"
    );


  if (!table) return;


  const sport =
    document.getElementById(
      "scheduleSportFilter"
    )?.value ||
    "All Sports";


  const day =
    document.getElementById(
      "scheduleDayFilter"
    )?.value ||
    "All Days";


  const list =
    schedules.filter(s =>

      (
        sport === "All Sports" ||
        s.sport === sport
      ) &&

      (
        day === "All Days" ||
        s.day === day
      )

    );


  table.innerHTML =
    list.map(s => `

      <tr>

        <td>
          ${escapeHtml(
            s.day || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            s.time || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            s.sport || ""
          )}
        </td>

        <td>
          ${escapeHtml(
            s.batch || "U-14"
          )}
        </td>

        <td>
          ${escapeHtml(
            s.coach ||
            "Unassigned"
          )}
        </td>

        <td>
          ${escapeHtml(
            s.venue ||
            "Main Ground"
          )}
        </td>

        <td>

          <button
            class="small-btn"
            onclick="deleteSchedule(${s.id})"
          >
            🗑
          </button>

        </td>

      </tr>

    `).join("");

}


/* =========================================================
   FEES
   ========================================================= */

function fillFeePlayers() {

  const el =
    document.getElementById(
      "mFeePlayer"
    );


  if (!el) return;


  el.innerHTML =
    players.map(p => `

      <option value="${p.id}">
        ${escapeHtml(p.name)}
      </option>

    `).join("");

}


function openFeeModal() {

  fillFeePlayers();


  document.getElementById(
    "mFeeAmount"
  ).value = "";


  document.getElementById(
    "mFeeDue"
  ).value = "";


  document.getElementById(
    "feeModal"
  ).classList.remove("hidden");

}


async function saveFee() {

  const playerId =
    Number(
      document.getElementById(
        "mFeePlayer"
      ).value
    );


  const amount =
    Number(
      document.getElementById(
        "mFeeAmount"
      ).value
    );


  const due =
    document.getElementById(
      "mFeeDue"
    ).value;


  const status =
    document.getElementById(
      "mFeeStatus"
    ).value;


  if (
    !playerId ||
    amount <= 0 ||
    !due
  ) {

    alert(
      "Fill all fee details."
    );

    return;

  }


  try {

    await api(
      "/fees",
      {

        method: "POST",

        body: JSON.stringify({

          player_id:
            playerId,

          amount,

          paid_amount:
            status === "Paid"
              ? amount
              : 0,

          due_date:
            due,

          status

        })

      }
    );


    closeModal(
      "feeModal"
    );


    await loadAcademyData();

    renderFees();

    updateFeeStats();

    updateDashboard();


  } catch (error) {

    alert(
      "Fee error: " +
      error.message
    );

  }

}


async function markFeePaid(id) {

  try {

    await api(
      `/fees/${id}/paid`,
      {
        method: "PUT"
      }
    );


    await loadAcademyData();

    renderFees();

    updateFeeStats();

    updateDashboard();


  } catch (error) {

    alert(error.message);

  }

}


function renderFees() {

  const table =
    document.getElementById(
      "feeTable"
    );


  if (!table) return;


  const search =
    (
      document.getElementById(
        "feeSearch"
      )?.value || ""
    ).toLowerCase();


  const status =
    document.getElementById(
      "feeStatusFilter"
    )?.value ||
    "All";


  const list =
    fees.filter(f =>

      String(
        f.player || ""
      )
        .toLowerCase()
        .includes(search) &&

      (
        status === "All" ||
        f.status === status
      )

    );


  table.innerHTML =
    list.map(f => `

      <tr>

        <td>
          ${escapeHtml(f.player)}
        </td>

        <td>
          ${escapeHtml(f.sport)}
        </td>

        <td>
          ₹${Number(
            f.amount || 0
          ).toLocaleString("en-IN")}
        </td>

        <td>
          ${escapeHtml(
            f.due || ""
          )}
        </td>

        <td>

          <span class="badge ${
            String(
              f.status || ""
            ).toLowerCase()
          }">

            ${escapeHtml(
              f.status || ""
            )}

          </span>

        </td>

        <td>

          ${
            f.status !== "Paid"

              ? `
                <button
                  class="small-btn"
                  onclick="markFeePaid(${f.id})"
                >
                  Mark Paid
                </button>
              `

              : "✓"
          }

        </td>

      </tr>

    `).join("");

}


function feeTotals() {

  const total =
    fees.reduce(
      (sum, f) =>
        sum +
        Number(
          f.amount || 0
        ),
      0
    );


  const paid =
    fees.reduce(
      (sum, f) =>
        sum +
        Number(
          f.paid_amount || 0
        ),
      0
    );


  const unpaid =
    Math.max(
      0,
      total - paid
    );


  return {
    total,
    paid,
    unpaid
  };

}


function updateFeeStats() {

  const {
    total,
    paid,
    unpaid
  } = feeTotals();


  const totalEl =
    document.getElementById(
      "feeTotal"
    );


  const paidEl =
    document.getElementById(
      "feePaid"
    );


  const pendingEl =
    document.getElementById(
      "feePending"
    );


  if (totalEl) {

    totalEl.textContent =
      "₹" +
      total.toLocaleString(
        "en-IN"
      );

  }


  if (paidEl) {

    paidEl.textContent =
      "₹" +
      paid.toLocaleString(
        "en-IN"
      );

  }


  if (pendingEl) {

    pendingEl.textContent =
      "₹" +
      unpaid.toLocaleString(
        "en-IN"
      );

  }

}


/* =========================================================
   PERFORMANCE
   ========================================================= */

function renderPerformance() {

  const result =
    document.getElementById(
      "performanceResult"
    );


  if (!result) return;


  const id =
    Number(
      document.getElementById(
        "performancePlayer"
      )?.value
    );


  const p =
    players.find(
      x =>
        Number(x.id) === id
    ) ||
    players[0];


  if (!p) return;


  const attendance =
    Number(
      p.attendance || 0
    );


  const performance =
    Number(
      p.performance || 0
    );


  const status =

    attendance >= 85 &&
    performance >= 75

      ? "On-Track"

      : attendance >= 75 &&
        performance >= 60

      ? "Moderate"

      : "At-Risk";


  const cls =
    status === "On-Track"
      ? "ai-good"
      : "ai-warn";


  result.className =
    "ai-panel " +
    cls;


  result.innerHTML = `

    <h2>

      ${
        status === "On-Track"
          ? "🟢"
          : status === "Moderate"
          ? "🟡"
          : "🔴"
      }

      ${status}

    </h2>

    <p>
      <b>Player:</b>
      ${escapeHtml(p.name)}
    </p>

    <p>
      <b>Attendance:</b>
      ${attendance}%
    </p>

    <p>
      <b>Performance:</b>
      ${performance}
    </p>

    <p>
      <b>Predicted improvement:</b>
      ${
        status === "On-Track"
          ? 12
          : status === "Moderate"
          ? 6
          : 2
      }%
    </p>

  `;


  const recommendations = [];


  if (attendance < 85) {

    recommendations.push([
      "Attendance",
      "Attend at least 85–90% of sessions."
    ]);

  }


  if (performance < 75) {

    recommendations.push([
      "Skill Practice",
      "Increase sport-specific practice."
    ]);

  }


  recommendations.push([
    "Fitness",
    "Add endurance and strength sessions."
  ]);


  const recommendationBox =
    document.getElementById(
      "recommendations"
    );


  if (recommendationBox) {

    recommendationBox.innerHTML =
      recommendations.map(
        item => `

          <div class="recommendation">

            <b>
              🎯 ${item[0]}
            </b>

            <span>
              ${item[1]}
            </span>

          </div>

        `
      ).join("");

  }

}


function runPerformanceAI() {

  renderPerformance();

  addNotification(
    "AI performance analysis completed.",
    "success"
  );

  alert(
    "AI performance analysis completed."
  );

}


/* =========================================================
   ADD PERFORMANCE TEST
   ========================================================= */

async function loadPerformancePlayers() {

  try {

    const data =
      await api("/players");


    const addSelect =
      document.getElementById(
        "addPerformancePlayer"
      );


    const analyticsSelect =
      document.getElementById(
        "performancePlayer"
      );


    if (!addSelect) return;


    addSelect.innerHTML = "";

    if (analyticsSelect) {
      analyticsSelect.innerHTML = "";
    }


    data.forEach(player => {

      const option1 =
        document.createElement(
          "option"
        );


      option1.value =
        player.id;


      option1.textContent =
        player.name;


      addSelect.appendChild(
        option1
      );


      if (analyticsSelect) {

        const option2 =
          document.createElement(
            "option"
          );


        option2.value =
          player.id;


        option2.textContent =
          player.name;


        analyticsSelect.appendChild(
          option2
        );

      }

    });


  } catch (error) {

    console.error(
      "Error loading performance players:",
      error
    );

  }

}


async function addPerformance() {

  const playerId =
    document.getElementById(
      "addPerformancePlayer"
    ).value;


  const testName =
    document.getElementById(
      "performanceTestName"
    ).value.trim();


  const score =
    document.getElementById(
      "performanceScore"
    ).value;


  const testDate =
    document.getElementById(
      "performanceTestDate"
    ).value;


  const message =
    document.getElementById(
      "performanceMessage"
    );


  if (
    !playerId ||
    !testName ||
    !score ||
    !testDate
  ) {

    message.textContent =
      "⚠️ Please fill all fields.";

    return;

  }


  if (
    Number(score) < 0 ||
    Number(score) > 100
  ) {

    message.textContent =
      "⚠️ Score must be between 0 and 100.";

    return;

  }


  try {

    await api(
      "/performance",
      {

        method: "POST",

        body: JSON.stringify({

          player_id:
            Number(playerId),

          test_name:
            testName,

          score:
            Number(score),

          test_date:
            testDate

        })

      }
    );


    message.textContent =
      "✅ Performance saved successfully.";


    document.getElementById(
      "performanceTestName"
    ).value = "";


    document.getElementById(
      "performanceScore"
    ).value = "";


    document.getElementById(
      "performanceTestDate"
    ).value = "";


    addNotification(
      "Performance test saved successfully.",
      "success"
    );


  } catch (error) {

    console.error(error);

    message.textContent =
      "❌ Failed to save performance.";

  }

}


/* =========================================================
   INJURY RISK
   ========================================================= */

function runInjuryAI() {

  const id =
    Number(
      document.getElementById(
        "injuryPlayer"
      ).value
    );


  const p =
    players.find(
      x =>
        Number(x.id) === id
    );


  if (!p) return;


  let risk =
    Number(
      p.attendance || 0
    ) < 75
      ? 55
      : 25;


  if (
    Number(
      p.performance || 0
    ) < 70
  ) {

    risk += 15;

  }


  if (
    Number(
      p.attendance || 0
    ) > 90 &&

    Number(
      p.performance || 0
    ) > 80
  ) {

    risk =
      Math.max(
        15,
        risk - 10
      );

  }


  risk =
    Math.min(
      100,
      risk
    );


  const label =
    risk >= 70
      ? "High Risk"
      : risk >= 40
      ? "Medium Risk"
      : "Low Risk";


  const cls =
    risk >= 70
      ? "risk-high"
      : risk >= 40
      ? ""
      : "risk-low";


  const circle =
    document.getElementById(
      "riskCircle"
    );


  if (circle) {

    circle.className =
      "risk-circle " +
      cls;

    circle.textContent =
      risk + "%";

  }


  const labelEl =
    document.getElementById(
      "riskLabel"
    );


  if (labelEl) {

    labelEl.textContent =
      label;

  }


  const text =
    document.getElementById(
      "riskText"
    );


  if (text) {

    text.textContent =
      `Prototype estimate for ${p.name} based on current attendance and performance indicators.`;

  }


  const factors = [];


  if (
    Number(
      p.attendance || 0
    ) < 80
  ) {

    factors.push(
      "Low attendance consistency"
    );

  }


  if (
    Number(
      p.performance || 0
    ) < 75
  ) {

    factors.push(
      "Performance below target"
    );

  }


  if (
    Number(
      p.attendance || 0
    ) > 90
  ) {

    factors.push(
      "High training participation"
    );

  }


  if (!factors.length) {

    factors.push(
      "No major risk factor detected"
    );

  }


  const factorsEl =
    document.getElementById(
      "riskFactors"
    );


  if (factorsEl) {

    factorsEl.innerHTML =
      factors
        .map(
          x =>
            `<li>${escapeHtml(x)}</li>`
        )
        .join("");

  }


  const recEl =
    document.getElementById(
      "riskRecommendations"
    );


  if (recEl) {

    recEl.innerHTML = [

      "Balance workload and recovery",

      "Track performance weekly",

      "Report persistent pain to a qualified professional"

    ]
      .map(
        x =>
          `<li>${escapeHtml(x)}</li>`
      )
      .join("");

  }

}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function addNotification(text, type = "info") {
  notifications.unshift({
    id: Date.now(),
    text,
    time: new Date().toLocaleString(),
    type,
    read: false
  });

  notifications = notifications.slice(0, 100);

  localStorage.setItem(
    "sportsAcademyNotifications",
    JSON.stringify(notifications)
  );

  renderNotifications();
}


function renderNotifications() {

  const list =
    document.getElementById(
      "notificationList"
    );


  const recent =
    document.getElementById(
      "recentNotifications"
    );


  if (list) {

    list.innerHTML =
      notifications
        .map(
          n => `

            <div
              class="notification-item
              ${n.type}
              ${n.read ? "read" : ""}"
            >

              <div>

                <b>

                  ${
                    n.type === "warning"
                      ? "⚠️"
                      : n.type === "success"
                      ? "✅"
                      : "ℹ️"
                  }

                  ${escapeHtml(n.text)}

                </b>

                <small>
                  ${escapeHtml(n.time)}
                </small>

              </div>


              <button
                class="small-btn"
                onclick="toggleRead(${n.id})"
              >

                ${
                  n.read
                    ? "Unread"
                    : "Read"
                }

              </button>

            </div>

          `
        )
        .join("");

  }


  if (recent) {

    recent.innerHTML =
      notifications
        .slice(0, 4)
        .map(
          n => `

            <div
              class="notification-item ${n.type}"
              style="margin-bottom:8px"
            >

              <div>

                <b>
                  ${escapeHtml(n.text)}
                </b>

                <small>
                  ${escapeHtml(n.time)}
                </small>

              </div>

            </div>

          `
        )
        .join("");

  }

}


function toggleRead(id) {
  const notification = notifications.find(n => n.id === id);

  if (notification) {
    notification.read = !notification.read;
  }

  localStorage.setItem(
    "sportsAcademyNotifications",
    JSON.stringify(notifications)
  );

  renderNotifications();
}

function markAllRead() {
  notifications.forEach(notification => {
    notification.read = true;
  });

  localStorage.setItem(
    "sportsAcademyNotifications",
    JSON.stringify(notifications)
  );

  renderNotifications();
}


function markAllRead() {

  notifications.forEach(
    n =>
      n.read = true
  );


  renderNotifications();

}


/* =========================================================
   DASHBOARD
   ========================================================= */

async function updateDashboard() {

  try {

    const data =
      await api(
        "/dashboard"
      );


    const dashPlayers =
      document.getElementById(
        "dashPlayers"
      );


    const dashCoaches =
      document.getElementById(
        "dashCoaches"
      );


    const dashAttendance =
      document.getElementById(
        "dashAttendance"
      );


    const dashFees =
      document.getElementById(
        "dashFees"
      );


    if (dashPlayers) {

      dashPlayers.textContent =
        data.players;

    }


    if (dashCoaches) {

      dashCoaches.textContent =
        data.coaches;

    }


    if (dashAttendance) {

      dashAttendance.textContent =
        Math.round(
          data.attendance
        ) + "%";

    }


    if (dashFees) {

      dashFees.textContent =
        "₹" +
        Number(
          data.fees || 0
        ).toLocaleString(
          "en-IN"
        );

    }


    const reportPlayers =
      document.getElementById(
        "reportPlayers"
      );


    const reportAttendance =
      document.getElementById(
        "reportAttendance"
      );


    const reportPerformance =
      document.getElementById(
        "reportPerformance"
      );


    const reportPending =
      document.getElementById(
        "reportPending"
      );


    if (reportPlayers) {

      reportPlayers.textContent =
        data.players;

    }


    if (reportAttendance) {

      reportAttendance.textContent =
        Math.round(
          data.attendance
        ) + "%";

    }


    if (reportPerformance) {

      reportPerformance.textContent =
        Math.round(
          data.performance
        );

    }


    if (reportPending) {

      reportPending.textContent =
        "₹" +
        Number(
          data.fees || 0
        ).toLocaleString(
          "en-IN"
        );

    }


  } catch (error) {

    console.error(
      "Dashboard:",
      error
    );

  }

}


function renderReports() {

  updateDashboard();

}


function runDashboardAI() {

  const avg =
    Number(

      document
        .getElementById(
          "dashAttendance"
        )
        ?.textContent
        .replace(
          "%",
          ""
        ) || 0

    );


  const box =
    document.getElementById(
      "dashboardAI"
    );


  if (!box) return;


  box.className =
    "ai-panel " +
    (
      avg >= 85
        ? "ai-good"
        : "ai-warn"
    );


  box.innerHTML =
    avg >= 85

      ? `
        <b>
          🟢 Academy is on-track.
        </b>

        <br>

        Attendance is healthy.
        Continue monitoring performance
        trends and training consistency.
      `

      : `

        <b>
          ⚠️ Attention required.
        </b>

        <br>

        Average attendance is below 85%.
        Review low-attendance players and
        adjust training follow-up.

      `;

}


/* =========================================================
   CHARTS
   ========================================================= */

function createCharts() {

  if (
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  const performanceCanvas =
    document.getElementById(
      "performanceChart"
    );


  const sportCanvas =
    document.getElementById(
      "sportChart"
    );


  if (
    !performanceCanvas ||
    !sportCanvas
  ) {
    return;
  }


  if (performanceChart) {

    performanceChart.destroy();

  }


  if (sportChart) {

    sportChart.destroy();

  }


  const avgPerf =
    players.length

      ? Math.round(

          players.reduce(
            (s, p) =>
              s +
              Number(
                p.performance || 0
              ),
            0
          ) /
          players.length

        )

      : 0;


  const avgAtt =
    players.length

      ? Math.round(

          players.reduce(
            (s, p) =>
              s +
              Number(
                p.attendance || 0
              ),
            0
          ) /
          players.length

        )

      : 0;


  performanceChart =
    new Chart(
      performanceCanvas,
      {

        type:
          "bar",

        data: {

          labels: [
            "Average Performance",
            "Average Attendance"
          ],

          datasets: [{

            label:
              "Academy Metrics",

            data: [
              avgPerf,
              avgAtt
            ],

            borderWidth:
              1

          }]

        },

        options: {

          responsive:
            true,

          scales: {

            y: {

              beginAtZero:
                true,

              max:
                100

            }

          }

        }

      }
    );


  const counts = {};


  players.forEach(
    p => {

      counts[p.sport] =
        (
          counts[p.sport] ||
          0
        ) + 1;

    }
  );


  sportChart =
    new Chart(
      sportCanvas,
      {

        type:
          "doughnut",

        data: {

          labels:
            Object.keys(
              counts
            ),

          datasets: [{

            data:
              Object.values(
                counts
              )

          }]

        },

        options: {

          responsive:
            true

        }

      }
    );

}



function createMetricsChart() {
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("metricsChart");
  if (!canvas) return;

  if (metricsChart) {
    metricsChart.destroy();
    metricsChart = null;
  }

  // Include every player in the chart
  if (!players || players.length === 0) {
    return;
  }

  const selectedId = document.getElementById("performancePlayer")?.value;

  // "All Players" shows everyone; a specific ID shows one player.
  const selectedPlayers =
    !selectedId || selectedId === "all"
      ? players
      : players.filter(p => String(p.id) === String(selectedId));

  if (selectedPlayers.length === 0) return;

  metricsChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: selectedPlayers.map(p => p.name),
      datasets: [
        {
          label: "Performance",
          data: selectedPlayers.map(p =>
            Number(p.performance ?? 0)
          ),
          borderWidth: 1
        },
        {
          label: "Attendance",
          data: selectedPlayers.map(p =>
            Number(p.attendance ?? 0)
          ),
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "Score (%)"
          }
        },
        x: {
          title: {
            display: true,
            text: "Players"
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: "top"
        }
      }
    }
  });
}


/* =========================================================
   REPORTS / CSV
   ========================================================= */

function printReport() {

  window.print();

}


function downloadCSV(type) {

  let rows = [];


  if (
    type === "players"
  ) {

    rows = [

      [
        "ID",
        "Name",
        "Age",
        "Sport",
        "Batch",
        "Attendance",
        "Performance",
        "Status"
      ],

      ...players.map(
        p => [

          p.id,

          p.name,

          p.age,

          p.sport,

          p.batch,

          p.attendance,

          p.performance,

          p.status

        ]
      )

    ];

  }


  if (
    type === "fees"
  ) {

    rows = [

      [
        "Player",
        "Sport",
        "Amount",
        "Paid Amount",
        "Due",
        "Status"
      ],

      ...fees.map(
        f => [

          f.player,

          f.sport,

          f.amount,

          f.paid_amount,

          f.due,

          f.status

        ]
      )

    ];

  }


  if (
    type === "schedule"
  ) {

    rows = [

      [
        "Day",
        "Time",
        "Sport",
        "Batch",
        "Coach",
        "Venue"
      ],

      ...schedules.map(
        s => [

          s.day,

          s.time,

          s.sport,

          s.batch,

          s.coach,

          s.venue

        ]
      )

    ];

  }


  const csv =
    rows
      .map(
        row =>

          row
            .map(
              value =>
                `"${String(
                  value ?? ""
                ).replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(",")

      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const a =
    document.createElement(
      "a"
    );


  a.href =
    url;


  a.download =
    `${type}-report.csv`;


  document.body.appendChild(
    a
  );


  a.click();


  a.remove();


  URL.revokeObjectURL(
    url
  );

}


/* =========================================================
   GLOBAL SEARCH
   ========================================================= */

function globalSearch() {

  const q = (

    document.getElementById(
      "globalSearch"
    )?.value || ""

  )
    .toLowerCase()
    .trim();


  if (!q) return;


  const p =
    players.find(
      x =>
        String(
          x.name || ""
        )
          .toLowerCase()
          .includes(q)
    );


  const c =
    coaches.find(
      x =>
        String(
          x.name || ""
        )
          .toLowerCase()
          .includes(q)
    );


  if (p) {

    showPage(
      "players"
    );


    const search =
      document.getElementById(
        "playerSearch"
      );


    if (search) {

      search.value =
        p.name;

    }


    renderPlayers();


  } else if (c) {

    showPage(
      "coaches"
    );


    const search =
      document.getElementById(
        "coachSearch"
      );


    if (search) {

      search.value =
        c.name;

    }


    renderCoaches();


  } else {

    alert(
      "No player or coach found."
    );

  }

}


/* =========================================================
   SETTINGS - FIXED
   ========================================================= */

function changeTheme() {

  const select =
    document.getElementById(
      "themeSelect"
    );


  if (!select) return;


  document.body.classList.toggle(
    "dark",
    select.value === "dark"
  );

}


function saveSettings() {

  const name =
    document.getElementById(
      "academyName"
    )?.value.trim() ||
    "AI Sports Academy";


  const sport =
    document.getElementById(
      "defaultSport"
    )?.value ||
    "Cricket";


  const theme =
    document.getElementById(
      "themeSelect"
    )?.value ||
    "light";


  /* Save settings permanently */
  localStorage.setItem(

    "sportsAcademySettings",

    JSON.stringify({

      academyName:
        name,

      defaultSport:
        sport,

      theme:
        theme

    })

  );


  /* Apply academy name */
  document.title =
    name;


  const brand =
    document.querySelector(
      ".brand span"
    );


  if (brand) {

    brand.innerHTML =
      escapeHtml(
        name
      ).replace(
        " ",
        "<br>"
      );

  }


  /* Apply theme */
  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );


  alert(
    "Settings saved successfully."
  );

}


function loadSettings() {

  try {

    const saved =
      JSON.parse(

        localStorage.getItem(
          "sportsAcademySettings"
        ) ||
        "null"

      );


    if (!saved) return;


    const nameInput =
      document.getElementById(
        "academyName"
      );


    const sportSelect =
      document.getElementById(
        "defaultSport"
      );


    const themeSelect =
      document.getElementById(
        "themeSelect"
      );


    if (
      nameInput &&
      saved.academyName
    ) {

      nameInput.value =
        saved.academyName;

    }


    if (
      sportSelect &&
      saved.defaultSport
    ) {

      sportSelect.value =
        saved.defaultSport;

    }


    if (
      themeSelect &&
      saved.theme
    ) {

      themeSelect.value =
        saved.theme;

    }


    /* Restore theme */
    document.body.classList.toggle(
      "dark",
      saved.theme === "dark"
    );


    /* Restore academy name */
    if (saved.academyName) {

      document.title =
        saved.academyName;


      const brand =
        document.querySelector(
          ".brand span"
        );


      if (brand) {

        brand.innerHTML =
          escapeHtml(
            saved.academyName
          ).replace(
            " ",
            "<br>"
          );

      }

    }


  } catch (error) {

    console.error(
      "Could not load settings:",
      error
    );

  }

}


/* =========================================================
   MODALS
   ========================================================= */

function closeModal(id) {

  const modal =
    document.getElementById(
      id
    );


  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

}


/* =========================================================
   SAFETY
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    fillSportSelects();

    loadRememberedUsername();


    const loggedIn =
      sessionStorage.getItem(
        "loggedInUser"
      );


    if (loggedIn) {

      try {

        const user =
          JSON.parse(
            loggedIn
          );


        document
          .getElementById(
            "loginPage"
          )
          ?.classList.add(
            "hidden"
          );


        document
          .getElementById(
            "app"
          )
          ?.classList.remove(
            "hidden"
          );


        const role =
          document.getElementById(
            "headerRole"
          );


        if (role) {

          role.textContent =
            user.role;

        }


        initApp();


      } catch (_) {}

    }

  }
);