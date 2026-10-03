const finderQs = [
  {id:"age",q:"Your age group?",opts:["Below 18","18–21","21–35","35–60","60+"]},
  {id:"gender",q:"Your gender?",opts:["Male","Female","Other"]},
  {id:"occupation",q:"Your occupation?",opts:["Student","Farmer","Worker","Homemaker","Business","Unemployed"]},
  {id:"income",q:"Annual income range?",opts:["Below 1 Lakh","1–3 Lakh","3–6 Lakh","Above 6 Lakh"]},
  {id:"location",q:"Your state?",opts:["Maharashtra","Delhi","Karnataka","Other"]},
  {id:"category",q:"Your category?",opts:['General', 'SC/ST', 'OBC', 'Minority', 'Women']},
];

/* ============ STATE ============ */
let currentLang = 'en';
let currentUser = null;
let isDark = false;
let docStep = 1;
let selectedDocType = null;
let docContent = '';
let selectedRating = 0;
let selectedSignupRole = null;
let databaseRightsCategories = [];

/* ============ STORAGE HELPERS ============ */
function gs(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } }
function ss(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }

/* ============ TOAST ============ */
function toast(msg, type) {
  const el = document.getElementById('appToast');
  const ml = document.getElementById('appToastMsg');
  ml.textContent = msg;
  el.className = 'toast align-items-center border-0 text-white ' + (type === 'error' ? 'bg-danger' : type === 'warn' ? 'bg-warning' : 'bg-success');
  bootstrap.Toast.getOrCreateInstance(el, { delay: 3200 }).show();
}

/* ============ LOGIN PROMPT ============ */
function showLoginPrompt(msg) {
  const m = document.getElementById('loginPromptMsg');
  if (m && msg) m.textContent = msg;
  new bootstrap.Modal(document.getElementById('loginPromptModal')).show();
}
function dismissLoginPrompt() {
  const inst = bootstrap.Modal.getInstance(document.getElementById('loginPromptModal'));
  if (inst) inst.hide();
}

/* ============ AUTH GUARD ============ */
function requireAuth(msg) {
  if (!currentUser) {
    showLoginPrompt(msg || 'Please login or create an account to continue.');
    return false;
  }
  return true;
}
function requireRole(role, msg) {
  if (!currentUser) { showLoginPrompt(msg); return false; }
  if (currentUser.role !== role && currentUser.role !== 'admin') {
    toast(msg || 'This action is not available for your account type.', 'warn');
    return false;
  }
  return true;
}

/* ============ NAVIGATION ============ */
function showSection(id) {

  // Guard admin section
  if (id === 'admin' && (!currentUser || currentUser.role !== 'admin')) {

    if (currentUser) {
      toast('Admin access only.', 'warn');
      return;
    }

    showLoginPrompt('Admin login required.');
    showSection('login');
    return;
  }

  // Guard dashboard
  if (id === 'dashboard' && !currentUser) {

    showLoginPrompt('Please login to view your dashboard.');
    showSection('login');
    return;
  }

  document.querySelectorAll('.page-section').forEach(
    s => s.classList.add('d-none')
  );

  const el = document.getElementById(id);

  if (el) {
    el.classList.remove('d-none');
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  document.querySelectorAll('[data-nav]').forEach(
    n => n.classList.toggle(
      'active',
      n.dataset.nav === id
    )
  );

  if (id === 'dashboard') {
    renderDashboard();
  }

  if (id === 'admin') {
    renderAdminOverview();
  }

  if (id === 'jobs') {
    showJobAssistant();
  }

  // Refresh database-backed scheme data
  if (id === 'schemes') {
    loadMainGovernmentSchemes();
    loadWomenSchemes();
  }

  trackRecent(id);
}
function trackRecent(id) {
  const labels = { home:'Home', jobs:'Job Assistant', schemes:'Government Schemes', women:'Women & Rights', about:'About' };
  if (!labels[id]) return;
  const r = gs('recentViews', []);
  const lbl = labels[id];
  const i = r.indexOf(lbl); if (i >= 0) r.splice(i, 1);
  r.unshift(lbl); if (r.length > 6) r.pop();
  ss('recentViews', r);
}
function showLegalDocs() {
  showSection('women');

  const tab = document.querySelector('[data-bs-target="#twLegal"]');

  if (tab) {
    const t = new bootstrap.Tab(tab);
    t.show();
  }

  renderSavedDocs();
}

/* ============ THEME ============ */
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('dark-mode', isDark);
  document.getElementById('themeIcon').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
  ss('theme', isDark ? 'dark' : 'light');
}
function loadTheme() {
  isDark = gs('theme', 'light') === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  document.getElementById('themeIcon').className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

/* ============ NAVBAR ROLE UPDATE ============ */
function updateNavForRole() {
  const publicNav = document.getElementById('publicNav');
  const adminNav = document.getElementById('adminNav');
  const mPub = document.getElementById('mobilePublicNav');
  const mAdm = document.getElementById('mobileAdminNav');
  const navMyJobs = document.getElementById('navMyJobs');
  const loginBtn = document.getElementById('navLoginBtn');
  const signupBtn = document.getElementById('navSignupBtn');
  const dashBtn = document.getElementById('navDashboardBtn');
  const logoutBtn = document.getElementById('navLogoutBtn');
  const dashLabel = document.getElementById('navDashboardLabel');
  const roleBadge = document.getElementById('navRoleBadge');

  if (!currentUser) {
    // Show public nav, hide admin
    if (publicNav) publicNav.classList.remove('d-none');
    if (adminNav) adminNav.classList.add('d-none');
    if (mPub) mPub.classList.remove('d-none');
    if (mAdm) mAdm.classList.add('d-none');
    if (navMyJobs) navMyJobs.classList.add('d-none');
    if (loginBtn) loginBtn.classList.remove('d-none');
    if (signupBtn) signupBtn.classList.remove('d-none');
    if (dashBtn) dashBtn.classList.add('d-none');
    if (logoutBtn) logoutBtn.classList.add('d-none');
  } else if (currentUser.role === 'admin') {
    // Show admin nav, hide public
    if (publicNav) publicNav.classList.add('d-none');
    if (adminNav) adminNav.classList.remove('d-none');
    if (mPub) mPub.classList.add('d-none');
    if (mAdm) mAdm.classList.remove('d-none');
    if (navMyJobs) navMyJobs.classList.add('d-none');
    if (loginBtn) loginBtn.classList.add('d-none');
    if (signupBtn) signupBtn.classList.add('d-none');
    if (dashBtn) dashBtn.classList.add('d-none');
    if (logoutBtn) logoutBtn.classList.remove('d-none');
  } else {
    // Citizen or Worker — show public nav + dashboard + logout
    if (publicNav) publicNav.classList.remove('d-none');
    if (adminNav) adminNav.classList.add('d-none');
    if (mPub) mPub.classList.remove('d-none');
    if (mAdm) mAdm.classList.add('d-none');
    if (loginBtn) loginBtn.classList.add('d-none');
    if (signupBtn) signupBtn.classList.add('d-none');
    if (dashBtn) dashBtn.classList.remove('d-none');
    if (logoutBtn) logoutBtn.classList.remove('d-none');
    // Worker gets "My Jobs" nav
    if (navMyJobs) navMyJobs.classList.toggle('d-none', currentUser.role !== 'worker');
    // Update labels
    if (dashLabel) dashLabel.textContent = currentUser.role === 'worker' ? 'Worker Dashboard' : 'Dashboard';
    if (roleBadge) {
      roleBadge.textContent = currentUser.role === 'worker' ? 'Skilled Worker' : 'Citizen';
      roleBadge.className = 'role-badge ' + currentUser.role;
    }
  }
}

/* ============ HOME PAGE ============ */
function renderHome() {
  const svcs = [
  { cls: 'jobs', icon: 'bi-briefcase-fill', title: 'Job Assistant', desc: 'Find local jobs and trusted skilled workers near you.', features: ['Find jobs & workers near you', 'Register as skilled worker', 'Track applications'], nav: 'jobs' },
  { cls: 'women', icon: 'bi-shield-check', title: 'Women & Rights + Legal Docs', desc: 'Know your rights, build your career, generate legal documents.', features: ['Know your rights', 'Career guidance & skill hub', 'Legal document generator'], nav: 'women' },
  { cls: 'scheme', icon: 'bi-bank2', title: 'Government Scheme Finder', desc: 'Discover schemes you may be eligible for.', features: ['Personalized eligibility finder', 'Document checklist', 'Application tracking'], nav: 'schemes' },
];
  document.getElementById('serviceCards').innerHTML = svcs.map(s => `
    <div class="col-md-4">
      <div class="svc-card ${s.cls}">
        <div class="svc-icon ${s.cls}"><i class="bi ${s.icon}"></i></div>
        <h5 class="mb-2">${s.title}</h5>
        <p class="mb-2">${s.desc}</p>
        <ul class="svc-feat list-unstyled mb-3">${s.features.map(f=>`<li><i class="bi bi-check-circle-fill text-success me-1"></i>${f}</li>`).join('')}</ul>
        <button class="btn-grad-blue" onclick="showSection('${s.nav}')">Explore <i class="bi bi-arrow-right ms-1"></i></button>
      </div>
    </div>`).join('');

  const whys = [
    { icon:'bi-hand-index-thumb',color:'#4f46e5',t:'Easy Access',d:'Find services quickly without searching many websites.' },
    { icon:'bi-chat-square-text',color:'#f59e0b',t:'Simple Guidance',d:'Step-by-step help for every service.' },
    { icon:'bi-collection',color:'#db2777',t:'All-in-One',d:'Jobs, schemes, rights and legal documents together.' },
    { icon:'bi-people',color:'#7c3aed',t:'Citizen-Friendly',d:'Designed for ordinary citizens, not experts.' },
    { icon:'bi-diagram-2',color:'#06b6d4',t:'One Platform',d:'Three major modules serving multiple citizen needs.' },
  ];
  document.getElementById('whyCards').innerHTML = whys.map(w => `
    <div class="col-md-6 col-lg-4">
      <div class="why-card">
        <div class="wc-icon" style="background:${w.color}"><i class="bi ${w.icon}"></i></div>
        <div><h6 class="fw-bold mb-1" style="color:${w.color}">${w.t}</h6><p class="small mb-0" style="color:#64748b">${w.d}</p></div>
      </div>
    </div>`).join('');

  const hows = [
    { n:1, t:'Choose a Service', d:'Pick from Job Assistant, Schemes, or Women & Rights.', i:'bi-grid-3x3-gap' },
    { n:2, t:'Enter Your Details', d:'Provide basic information for personalized help.', i:'bi-pencil-square' },
    { n:3, t:'Get Personalized Guidance', d:'Receive recommendations and step-by-step guidance.', i:'bi-lightbulb-fill' },
    { n:4, t:'Take Action', d:'Apply, save, generate documents or contact support.', i:'bi-rocket-takeoff-fill' },
  ];
  document.getElementById('howSteps').innerHTML = hows.map(h => `
    <div class="col-md-6 col-lg-3">
      <div class="how-step">
        <div class="how-num">${h.n}</div>
        <i class="bi ${h.i} fs-2 mb-2 d-block" style="color:#4f46e5"></i>
        <h6>${h.t}</h6><p>${h.d}</p>
      </div>
    </div>`).join('');

  const qb = [
    { t:'Find a Job', i:'bi-briefcase-fill', cls:'q-jobs', a:"showSection('jobs')" },
    { t:'Women & Rights / Legal Docs', i:'bi-shield-check', cls:'q-women', a:"showSection('women')" },
    { t:'Find a Scheme', i:'bi-bank2', cls:'q-scheme', a:"showSection('schemes')" },
  ];
  document.getElementById('quickBtns').innerHTML = qb.map(b => `
    <button class="qbtn ${b.cls}" onclick="${b.a}"><i class="bi ${b.i} me-2"></i>${b.t}</button>`).join('');
}

/* ============ JOB ASSISTANT ============ */
// saved workers - yellow mark 
let savedWorkerIds = [];
async function loadSavedWorkerIds() {

  savedWorkerIds = [];

  if (!currentUser || !currentUser.id || currentUser.role !== 'citizen') {
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/saved-workers/${currentUser.id}`
    );

    const data = await response.json();

    if (data.success) {
      savedWorkerIds = data.workers.map(w => Number(w.id));
    }

  } catch (error) {
    console.error('Error loading saved worker IDs:', error);
  }
}
let selectedWorkerForRequest = null;
let workerSkills = [];
let workerLocations = [];

function fillJobFilters() {

  const skills = [...new Set(
    (databaseWorkers || [])
      .map(w => w.skill)
      .filter(Boolean)
      .map(s => String(s).trim())
  )];

  const locations = [...new Set(
    (databaseWorkers || [])
      .map(w => w.location)
      .filter(Boolean)
      .map(l => String(l).trim())
  )];

  const skillOptions = [
    '<option value="">All Skills</option>',
    ...skills.map(skill =>
      `<option value="${skill}">${skill}</option>`
    )
  ].join('');

  const locationOptions = [
    '<option value="">All Locations</option>',
    ...locations.map(location =>
      `<option value="${location}">${location}</option>`
    )
  ].join('');

  const workerLocFilter =
    document.getElementById('workerLocFilter');

  if (workerLocFilter) {
    workerLocFilter.innerHTML = locationOptions;
  }

  const workerSkillFilter =
    document.getElementById('workerSkillFilter');

  if (workerSkillFilter) {
    workerSkillFilter.innerHTML = skillOptions;
  }

  const wsSkill =
    document.getElementById('wsSkill');

  if (wsSkill) {
    wsSkill.innerHTML = skills.map(skill =>
      `<option value="${skill}">${skill}</option>`
    ).join('');
  }
}


async function renderWorkers() {

  const skillFilter =
    document.getElementById('workerSkillFilter');

  const locationFilter =
    document.getElementById('workerLocFilter');

  const ratingFilter =
    document.getElementById('workerRatingFilter');

  const searchInput =
    document.getElementById('workerSearch');

  const selectedSkill =
    String(skillFilter?.value || '').trim().toLowerCase();

  const selectedLocation =
    String(locationFilter?.value || '').trim().toLowerCase();

  const minimumRating =
    parseFloat(ratingFilter?.value || '0') || 0;

  const searchText =
    String(searchInput?.value || '').trim().toLowerCase();


  const list = (databaseWorkers || []).filter(worker => {

    const workerSkill =
      String(worker.skill || '').trim().toLowerCase();

    const workerLocation =
      String(worker.location || '').trim().toLowerCase();

    const workerName =
      String(worker.name || '').trim().toLowerCase();

    const workerRating =
      Number(worker.rating || 0);


    /* ---------- SKILL ---------- */

    const skillMatch =
      !selectedSkill ||
      workerSkill === selectedSkill;


    /* ---------- LOCATION ---------- */

    const locationMatch =
      !selectedLocation ||
      workerLocation === selectedLocation;


    /* ---------- RATING ---------- */

    const ratingMatch =
      workerRating >= minimumRating;


    /* ---------- SEARCH ---------- */

    const workerSkills =
      Array.isArray(worker.workerSkills)
        ? worker.workerSkills
        : Array.isArray(worker.skills)
          ? worker.skills
          : [];

    const skillsText =
      workerSkills
        .map(skill => String(skill).toLowerCase())
        .join(' ');

    const searchMatch =
      !searchText ||
      workerName.includes(searchText) ||
      workerSkill.includes(searchText) ||
      skillsText.includes(searchText) ||
      workerLocation.includes(searchText);


    return (
      skillMatch &&
      locationMatch &&
      ratingMatch &&
      searchMatch
    );

  });


  const workerList =
    document.getElementById('workerList');

  if (!workerList) return;


  workerList.innerHTML = list.length
    ? list.map(worker => `

      <div class="col-md-6 col-lg-4">

        <div class="worker-card">

          <div class="d-flex gap-3 align-items-center mb-2">

            <div class="worker-av">
              <i class="bi bi-person-fill"></i>
            </div>

            <div>

              <h6 class="fw-bold mb-0">
                ${worker.name || 'Worker'}
              </h6>

              <small style="color:#64748b">
                ${worker.skill || 'Service'}
              </small>

              <br>

              ${
                worker.verified
                  ? `
                    <span class="verified">
                      <i class="bi bi-patch-check-fill me-1"></i>
                      Verified
                    </span>
                  `
                  : `
                    <span style="color:#94a3b8;font-size:.78rem">
                      Not Verified
                    </span>
                  `
              }

            </div>

          </div>


          <p class="small mb-1" style="color:#64748b">

            <i class="bi bi-geo-alt me-1"></i>

            ${worker.location || ''}
            ${
              worker.area
                ? ', ' + worker.area
                : ''
            }

          </p>


          <p class="small mb-1">

            <span class="stars">
              ${
                '★'.repeat(
                  Math.round(Number(worker.rating || 0))
                )
              }
            </span>

            <strong>
              ${Number(worker.rating || 0).toFixed(1)}
            </strong>

            <span style="color:#94a3b8">
              (${worker.reviews || 0} reviews)
            </span>

          </p>


          <p class="small mb-1">

            <i class="bi bi-clock me-1"></i>

            ${worker.availability || ''}

            ${
              worker.experience !== undefined
                ? ` &bull; ${worker.experience} yrs exp`
                : ''
            }

          </p>


          <p class="small mb-2">

            <strong>Charges:</strong>
            ${worker.charges || ''}

          </p>


          <div class="mb-2">

            ${
              (
                Array.isArray(worker.workerSkills)
                  ? worker.workerSkills
                  : Array.isArray(worker.skills)
                    ? worker.skills
                    : []
              )
              .slice(0, 3)
              .map(skill => `
                <span
                  class="badge me-1"
                  style="
                    background:#f1f5f9;
                    color:#475569;
                  "
                >
                  ${skill}
                </span>
              `)
              .join('')
            }

          </div>


          <div class="d-flex flex-wrap gap-1">

            <button
              class="btn-grad-blue btn-sm"
              onclick="showWorkerDetail(${worker.id})"
            >
              View Profile
            </button>


            <button
              class="btn-grad-green btn-sm"
              onclick="openServiceRequest(${worker.id})"
            >
              <i class="bi bi-calendar-check me-1"></i>
              Request
            </button>


            <button
              class="btn btn-outline-warning btn-sm"
              onclick="saveWorkerAction(${worker.id},this)"
            >
              <i class="bi ${
                savedWorkerIds.includes(Number(worker.id))
                  ? 'bi-bookmark-fill'
                  : 'bi-bookmark'
              }"></i>
            </button>


            <button
              class="btn btn-outline-secondary btn-sm"
              onclick="openReviewModal(${worker.id})"
            >
              <i class="bi bi-star"></i>
            </button>

          </div>

        </div>

      </div>

    `).join('')

    : `
      <div class="col-12 ja-empty">

        <i class="bi bi-people"></i>

        <p class="mb-0">
          No workers found. Try different filters.
        </p>

      </div>
    `;
}
/* Show role-based tabs when Job Assistant opens */
function showJobAssistant() {
  const citizenTabs = document.getElementById('jaCitizenTabs');
  const citizenContent = document.getElementById('jaCitizenContent');
  const workerTabs = document.getElementById('jaWorkerTabs');
  const workerContent = document.getElementById('jaWorkerContent');
  const notice = document.getElementById('jaRoleNotice');
  if (!citizenTabs) return;
  if (currentUser && currentUser.role === 'worker') {
    citizenTabs.classList.add('d-none'); citizenContent.classList.add('d-none');
    workerTabs.classList.remove('d-none'); workerContent.classList.remove('d-none');
    notice.innerHTML = '<div class="ja-role-notice"><i class="bi bi-tools"></i><div><strong>Skilled Worker Mode</strong> — Manage your profile, portfolio, work requests, career roadmap, certifications, schemes and skill development.</div></div>';
    renderWorkerProfile(); renderWorkerPortfolio(); renderWorkerRequests();
    renderWorkerRoadmap(); renderWorkerCerts(); renderWorkerSchemes(); renderWorkerSkillDev(); renderWorkerHistory();
  } else {
    citizenTabs.classList.remove('d-none'); citizenContent.classList.remove('d-none');
    workerTabs.classList.add('d-none'); workerContent.classList.add('d-none');
    if (currentUser && currentUser.role === 'citizen') {
      notice.innerHTML = '<div class="ja-role-notice"><i class="bi bi-people-fill"></i><div><strong>Citizen Mode</strong> — Find trusted local workers, request services, track bookings and save your favourite workers.</div></div>';
    } else {
      notice.innerHTML = '<div class="ja-role-notice"><i class="bi bi-info-circle"></i><div>Browsing as a guest. <a href="#" onclick="showSection(\'login\');return false;">Login</a> to request services and save workers.</div></div>';
    }
    renderWorkers(); renderCitizenRequests(); renderSavedWorkers();
  }
}

/* ---- CITIZEN: Find Workers ---- */
// Workers loaded from MySQL database
let databaseWorkers = [];
async function loadWorkersFromDatabase() {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/workers');
    const data = await response.json();

    if (!data.success) {
      console.error('Failed to load workers:', data.message);
      return;
    }

    databaseWorkers = data.workers.map(w => ({
  ...w,
  isDemo: w.is_demo === 1,

      // Convert database text into arrays
      skills: w.skills
  ? w.skills.split(',').map(s => s.trim())
  : [],

workerSkills: w.skills
  ? w.skills.split(',').map(s => s.trim())
  : [],
      languages: w.languages ? w.languages.split(',').map(s => s.trim()) : [],
      services: w.services ? w.services.split(',').map(s => s.trim()) : [],
      certs: w.certifications
        ? w.certifications.split(',').map(s => s.trim())
        : [],

      portfolio: w.portfolio
  ? String(w.portfolio)
      .split('|')
      .map(p => p.trim())
      .filter(Boolean)
  : [],

      // History is currently stored as text
      history: w.history
  ? [w.history]
  : []
    }));
    /* Create filters from database workers */
    workerSkills = [...new Set(
  databaseWorkers
    .map(w => w.skill)
    .filter(Boolean)
)];

workerLocations = [...new Set(
  databaseWorkers
    .map(w => w.location)
    .filter(Boolean)
)];
fillJobFilters();
await loadSavedWorkerIds();
  } catch (error) {
    console.error('Error loading workers:', error);
  }
}

async function showWorkerDetail(id) {
  const w = databaseWorkers.find(x => x.id === id); if (!w) return;
  let workerReviewsHTML = '';

if (w.isDemo) {

  workerReviewsHTML = `
    <blockquote class="blockquote">
      <p class="fs-6">
        "${w.name} did excellent work. Very professional and on time."
      </p>
      <footer class="blockquote-footer">
        Demo Review User
      </footer>
    </blockquote>
  `;

} else {

  try {

    const reviewResponse = await fetch(
      `http://127.0.0.1:5000/api/reviews/${w.id}`
    );

    const reviewData = await reviewResponse.json();

    if (reviewData.success && reviewData.reviews.length > 0) {

      workerReviewsHTML = reviewData.reviews.map(review => {

        const rating = Number(review.rating || 0);

        const stars =
          '★'.repeat(rating) +
          '☆'.repeat(5 - rating);

        return `
          <div class="border-bottom pb-2 mb-2">

            <div class="mb-1">
              <span class="stars">
                ${stars}
              </span>

              <strong class="ms-1">
                ${rating}/5
              </strong>
            </div>

            ${
              review.review_text
                ? `
                  <p class="mb-2 ">
                    "${review.review_text}"
                  </p>
                `
                : ''
            }

            <footer class="blockquote-footer mt-1">
              ${review.citizen_name || 'Citizen'}
            </footer>

          </div>
        `;

      }).join('');

    } else {

      workerReviewsHTML = `
        <p class="text-muted">
          No reviews yet.
        </p>
      `;

    }

  } catch (error) {

    console.error('Worker reviews error:', error);

    workerReviewsHTML = `
      <p class="text-muted">
        Unable to load reviews.
      </p>
    `;
  }
}
  document.getElementById('detailModalTitle').textContent = w.name + ' — Worker Profile';
  document.getElementById('detailModalBody').innerHTML = `
    <div class="d-flex gap-3 align-items-center mb-3">
      <div class="worker-av" style="width:72px;height:72px;font-size:2rem"><i class="bi bi-person-fill"></i></div>
      <div>
        <h5 class="fw-bold mb-1">${w.name}</h5>
        <p class="mb-1" style="color:#64748b">${w.skill} &bull; ${w.location}, ${w.area}</p>
        ${w.verified ? '<span class="verified"><i class="bi bi-patch-check-fill me-1"></i>Verified Skill</span>' : '<span style="color:#94a3b8;font-size:.85rem">Not Verified</span>'}
      </div>
    </div>
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#wdAbout">About</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#wdServices">Services</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#wdPortfolio">Portfolio</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#wdCerts">Certificates</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#wdHistory">History</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#wdReviews">Reviews</button></li>
    </ul>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="wdAbout">
        <p>${w.about}</p>
        <p><strong>Experience:</strong> ${w.experience} years &bull; <strong>Availability:</strong> ${w.availability}</p>
        <p><strong>Languages:</strong> ${w.languages.join(', ')} &bull; <strong>Charges:</strong> ${w.charges}</p>
        <p><strong>Rating:</strong> <span class="stars">${'★'.repeat(Math.round(w.rating))}</span> ${w.rating} (${w.reviews} reviews)</p>
        <p><strong>Skills:</strong> ${w.workerSkills.map(s=>`<span class="badge me-1" style="background:#eef2ff;color:#4f46e5">${s}</span>`).join('')}</p>
      </div>
      <div class="tab-pane fade" id="wdServices"><ul>${w.services.map(s=>`<li>${s}</li>`).join('')}</ul></div>
      <div class="tab-pane fade" id="wdPortfolio">

  ${
    w.portfolio && w.portfolio.length > 0

    ?

    `
    <div class="portfolio-grid">

      ${w.portfolio.map((p, index) => {

        const cleanPath = String(p)
          .replace(/\\/g, '/')
          .replace(/^\/+/, '');

        const imageUrl =
          `http://127.0.0.1:5000/${cleanPath}`;

        return `
          <div class="portfolio-item">

            <img
              src="${imageUrl}"
              alt="Work Photo ${index + 1}"
              style="
                width:100%;
                height:180px;
                object-fit:cover;
                border-radius:10px;
                display:block;
              "
            >

          </div>
        `;

      }).join('')}

    </div>
    `

    :

    `
    <p class="text-muted">
      No portfolio items added yet.
    </p>
    `
  }

</div>
      <div class="tab-pane fade" id="wdCerts">
        ${w.certs.length ? `<ul>${w.certs.map(c=>`<li><i class="bi bi-patch-check text-success me-1"></i>${c}</li>`).join('')}</ul>` : '<p class="text-muted">No certificates added yet.</p>'}
      </div>
      <div class="tab-pane fade" id="wdHistory">
  <ul>
    ${w.history.flatMap(h => String(h).split('|')).map(h => `<li>${h.trim()}</li>`).join('')}
  </ul>
</div>


<div class="tab-pane fade" id="wdReviews">

  <p class="mb-2">
    <span class="stars fs-4">
      ${'★'.repeat(Math.round(w.rating || 0))}
    </span>

    <strong>
      ${w.rating || 0}
    </strong>

    average from
    ${w.reviews || 0}
    reviews
  </p>

  ${workerReviewsHTML}

  <button
    class="btn-grad-orange"
    onclick="openReviewModal(${w.id})"
  >
    <i class="bi bi-star me-1"></i>
    Write a Review
  </button>

</div>

    </div>
    <div class="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
      <button class="btn-grad-green" onclick="openServiceRequest(${w.id})"><i class="bi bi-calendar-check me-1"></i>Request Service</button>
      <button class="btn btn-outline-secondary" onclick="saveWorkerAction(${w.id});toast('Saved!')"><i class="bi bi-bookmark me-1"></i>Save</button>
      <button
  class="btn btn-outline-info"
  onclick="shareWorkerProfile(${w.id})">
  <i class="bi bi-share me-1"></i>Share
</button>
    </div>`;
  new bootstrap.Modal(document.getElementById('detailModal')).show();
}
/* Track recently viewed workers */
const originalShowWorkerDetail = showWorkerDetail;

showWorkerDetail = async function(id) {

  let recent = gs('recentViewedWorkers', []);

  recent = recent.filter(x => Number(x) !== Number(id));

  recent.unshift(Number(id));

  recent = recent.slice(0, 3);

  ss('recentViewedWorkers', recent);

  return originalShowWorkerDetail(id);
};
// share 
async function shareWorkerProfile(workerId) {

  try {

    const profileUrl =
      window.location.origin +
      window.location.pathname +
      '?worker=' + workerId;

    await navigator.clipboard.writeText(profileUrl);

    toast('Profile link copied successfully!');

  } catch (error) {

    console.error('Share error:', error);

    toast('Unable to copy profile link', 'error');
  }
}
async function openSharedWorkerProfile() {

  const params = new URLSearchParams(window.location.search);
  const workerId = params.get('worker');

  if (!workerId) return;

  const id = parseInt(workerId, 10);

  if (!id) return;

  try {

    // Make sure workers are loaded from MySQL
    if (!databaseWorkers || databaseWorkers.length === 0) {
      await loadWorkersFromDatabase();
    }

    // Check whether the worker exists
    const worker = databaseWorkers.find(
      w => Number(w.id) === Number(id)
    );

    if (!worker) {
      console.error('Shared worker not found:', id);
      return;
    }

    // Open the worker profile
    showWorkerDetail(id);

  } catch (error) {

    console.error(
      'Unable to open shared worker profile:',
      error
    );
  }
}
async function loadWorkerVerificationStatus() {
  const body = document.getElementById('workerVerificationStatus');

  if (!body || !currentUser || !currentUser.id) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/verification-status/${currentUser.id}`
    );

    const data = await response.json();

    if (!data.success) return;

    const status = data.verification_status;

    if (status === 'approved') {
      body.innerHTML = `
        <div class="alert alert-success mb-0">
          <strong>
            <i class="bi bi-patch-check-fill me-2"></i>
            Profile Approved
          </strong>

          <div class="small mt-1">
            Your profile is approved and visible to citizens.
            You can now receive service requests.
          </div>
        </div>
      `;
    }

    else if (status === 'rejected') {
      body.innerHTML = `
        <div class="alert alert-danger mb-0">
          <strong>
            <i class="bi bi-x-circle-fill me-2"></i>
            Profile Verification Rejected
          </strong>

          <div class="small mt-1">
            Your profile has not been approved by the administrator.
            Please review your profile details before requesting verification again.
          </div>

          <button
            type="button"
            class="btn btn-outline-danger btn-sm mt-3"
            onclick="requestVerificationAgain()"
          >
            <i class="bi bi-arrow-repeat me-1"></i>
            Request Verification Again
          </button>
        </div>
      `;
    }

    else {
      body.innerHTML = `
        <div class="alert alert-warning mb-0">
          <strong>
            <i class="bi bi-hourglass-split me-2"></i>
            Profile Verification Pending
          </strong>

          <div class="small mt-1">
            Your profile is currently under review by the administrator.
            You will become visible to citizens and receive service requests
            once your profile is approved.
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error('Verification status error:', error);
  }
}
async function requestVerificationAgain() {
  if (!currentUser || !currentUser.id) {
    toast('Please login again.', 'warn');
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/request-verification/${currentUser.id}`,
      {
        method: 'PUT'
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to submit verification request'
      );
    }

    toast('Verification request submitted successfully!');

    // Refresh the status message
    await loadWorkerVerificationStatus();

  } catch (error) {
    console.error('Request verification error:', error);

    toast(
      error.message || 'Unable to submit verification request',
      'error'
    );
  }
}
/* ---- CITIZEN: Service Request flow ---- */
function openServiceRequest(workerId) {
  if (!requireAuth('Please login to request services from workers.')) return;
  const w = databaseWorkers.find(x => x.id === workerId); if (!w) return;
  selectedWorkerForRequest = workerId;
  document.getElementById('srModalTitle').textContent = 'Request Service';
  document.getElementById('srWorkerInfo').innerHTML = `
    <div class="d-flex gap-2 align-items-center">
      <div class="worker-av" style="width:48px;height:48px;font-size:1.4rem"><i class="bi bi-person-fill"></i></div>
      <div><strong>${w.name}</strong><br><small style="color:#64748b">${w.skill} &bull; ${w.location} &bull; ${w.charges}</small></div>
    </div>`;
  document.getElementById('serviceReqForm').reset();
  new bootstrap.Modal(document.getElementById('serviceReqModal')).show();
}
// user - submit request(form filling)
async function submitServiceRequest(e) {
  e.preventDefault();

  if (!selectedWorkerForRequest) {
    toast('Please select a worker first.', 'warn');
    return;
  }

  if (!currentUser || !currentUser.id) {
    toast('Please login to request a service.', 'warn');
    return;
  }

  const worker = databaseWorkers.find(
    w => Number(w.id) === Number(selectedWorkerForRequest)
  );

  if (!worker) {
    toast('Worker not found.', 'error');
    return;
  }

  const requestDate = document.getElementById('srDate').value;
  const requestTime = document.getElementById('srTime').value;
  const location = document.getElementById('srLocation').value;
  const description = document.getElementById('srDetails').value;

  if (!requestDate || !requestTime || !location) {
    toast('Please fill date, time and location.', 'warn');
    return;
  }

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/service-requests',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          citizen_id: currentUser.id,
          worker_id: selectedWorkerForRequest,
          request_date: requestDate,
          request_time: requestTime,
          location: location,
          description: description
        })
      }
    );

    const result = await response.json();

    if (result.success) {

      const modalElement =
        document.getElementById('serviceReqModal');

      const modal =
        bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      toast(
        'Service request sent to ' + worker.name + '!'
      );

      // Refresh citizen request list
      renderCitizenRequests();

    } else {

      toast(
        result.message || 'Unable to send service request.',
        'error'
      );
    }

  } catch (error) {

    console.error('Service request error:', error);

    toast(
      'Unable to connect to the server.',
      'error'
    );
  }
}
//  CITIZEN - Service Requests (displaying for citizen)
async function renderCitizenRequests() {

  const el = document.getElementById('citizenReqList');

  if (!el) return;

  if (!currentUser || !currentUser.id) {
    el.innerHTML = `
      <div class="ja-empty">
        <i class="bi bi-person-lock"></i>
        <p class="mb-0">
          Please login to view your service requests.
        </p>
      </div>
    `;
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/service-requests/citizen/${currentUser.id}`
    );

    const data = await response.json();

    if (!data.success) {

      console.error(
        'Failed to load requests:',
        data.message
      );

      el.innerHTML = `
        <div class="ja-empty">
          <i class="bi bi-exclamation-circle"></i>
          <p class="mb-0">
            Unable to load service requests.
          </p>
        </div>
      `;

      return;
    }

    let requests = data.requests || [];

    // Status filter
    const filter =
      (document.getElementById('reqStatusFilter') || {}).value || '';

    if (filter) {
  requests = requests.filter(
    r => String(r.status).toLowerCase() === String(filter).toLowerCase()
  );
}
    if (!requests.length) {

      el.innerHTML = `
        <div class="ja-empty">
          <i class="bi bi-inbox"></i>
          <p class="mb-0">
            No service requests yet.
            Find a worker and click "Request Service".
          </p>
        </div>
      `;

      return;
    }

    el.innerHTML = requests.map(r => {

      const statusClass =
        'st-' + String(r.status).toLowerCase();

      return `
        <div class="req-card mb-3">

          <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">

            <div>
              <h6 class="fw-bold mb-0">
                ${r.worker_name}
              </h6>

              <small style="color:#64748b">
                ${r.service_type || ''}
                &bull;
                ${r.worker_location || ''}
              </small>
            </div>

            <span class="st-badge ${statusClass}">
              ${r.status}
            </span>

          </div>

          <div class="row g-2 small">

            <div class="col-md-4">
              <i class="bi bi-calendar me-1 text-primary"></i>
              <strong>Date:</strong>
              ${r.request_date}
            </div>

            <div class="col-md-4">
              <i class="bi bi-clock me-1 text-primary"></i>
              <strong>Time:</strong>
              ${r.request_time}
            </div>

            <div class="col-md-4">
              <i class="bi bi-geo-alt me-1 text-primary"></i>
              <strong>Location:</strong>
              ${r.location}
            </div>

            <div class="col-12">
              <i class="bi bi-chat-text me-1 text-primary"></i>
              <strong>Requirement:</strong>
              ${r.description || 'No additional details'}
            </div>

          </div>

          ${
  ['pending', 'accepted'].includes(
    String(r.status).toLowerCase()
  )
            ? `
              <div class="mt-2">

                <button
                  class="btn btn-outline-danger btn-sm"
                  onclick="cancelRequest(${r.id})">

                  <i class="bi bi-x-circle me-1"></i>
                  Cancel Request

                </button>

              </div>
            `
            : ''
          }

        </div>
      `;

    }).join('');

  } catch (error) {

    console.error(
      'Error loading service requests:',
      error
    );

    el.innerHTML = `
      <div class="ja-empty">
        <i class="bi bi-exclamation-circle"></i>
        <p class="mb-0">
          Unable to connect to the server.
        </p>
      </div>
    `;
  }
}
// citizen - cancel request
async function cancelRequest(id) {

  if (!currentUser || !currentUser.id) {
    toast('Please login again.', 'warn');
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/service-requests/${id}/cancel`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          citizen_id: currentUser.id
        })
      }
    );

    const result = await response.json();

    if (result.success) {

      toast('Request cancelled successfully');

      // Reload requests from MySQL
      renderCitizenRequests();

    } else {

      toast(
        result.message || 'Unable to cancel request.',
        'error'
      );
    }

  } catch (error) {

    console.error('Cancel request error:', error);

    toast(
      'Unable to connect to the server.',
      'error'
    );
  }
}
/* ---- CITIZEN: Saved Workers ---- */
async function renderSavedWorkers() {

  const el = document.getElementById('savedWorkersList');
  if (!el) return;

  if (!currentUser || !currentUser.id) {
    el.innerHTML = `
      <div class="col-12 ja-empty">
        <i class="bi bi-person-lock"></i>
        <p class="mb-0">Please login to view your saved workers.</p>
      </div>
    `;
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/saved-workers/${currentUser.id}`
    );

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to load saved workers:', data.message);

      el.innerHTML = `
        <div class="col-12 ja-empty">
          <i class="bi bi-exclamation-circle"></i>
          <p class="mb-0">Unable to load saved workers.</p>
        </div>
      `;

      return;
    }

    const list = data.workers.map(w => ({
      ...w,

      skills: w.skills
        ? w.skills.split(',').map(s => s.trim())
        : [],

      workerSkills: w.skills
        ? w.skills.split(',').map(s => s.trim())
        : [],

      languages: w.languages
        ? w.languages.split(',').map(s => s.trim())
        : [],

      services: w.services
        ? w.services.split(',').map(s => s.trim())
        : [],

      certs: w.certifications
        ? w.certifications.split(',').map(s => s.trim())
        : [],

      history: w.history
        ? [w.history]
        : [],

      portfolio: w.portfolio
  ? String(w.portfolio)
      .split('|')
      .map(p => p.trim())
      .filter(Boolean)
  : []
    }));

    el.innerHTML = list.length ? list.map(w => `
      <div class="col-md-6 col-lg-4">
        <div class="worker-card">

          <div class="d-flex gap-3 align-items-center mb-2">

            <div class="worker-av">
              <i class="bi bi-person-fill"></i>
            </div>

            <div>
              <h6 class="fw-bold mb-0">${w.name}</h6>

              <small style="color:#64748b">
                ${w.skill}
              </small><br>

              ${
                w.verified
                ? '<span class="verified"><i class="bi bi-patch-check-fill me-1"></i>Verified</span>'
                : ''
              }

            </div>

          </div>

          <p class="small mb-1">
            <i class="bi bi-geo-alt me-1"></i>
            ${w.location}
          </p>

          <p class="small mb-2">
            <span class="stars">
              ${'★'.repeat(Math.round(w.rating || 0))}
            </span>

            ${w.rating || 0}

            (${w.reviews || 0})
          </p>

          <div class="d-flex gap-1">

            <button
              class="btn-grad-blue btn-sm"
              onclick="showWorkerDetail(${w.id})">
              View Profile
            </button>

            <button
              class="btn-grad-green btn-sm"
              onclick="openServiceRequest(${w.id})">
              Request
            </button>

            <button
              class="btn btn-outline-danger btn-sm"
              onclick="saveWorkerAction(${w.id}, this)">
              <i class="bi bi-bookmark-fill"></i>
            </button>

          </div>

        </div>
      </div>
    `).join('') : `
      <div class="col-12 ja-empty">
        <i class="bi bi-bookmark"></i>
        <p class="mb-0">
          No saved workers yet. Browse workers and click the bookmark icon to save them.
        </p>
      </div>
    `;

  } catch (error) {

    console.error('Error loading saved workers:', error);

    el.innerHTML = `
      <div class="col-12 ja-empty">
        <i class="bi bi-exclamation-circle"></i>
        <p class="mb-0">Unable to connect to the server.</p>
      </div>
    `;
  }
}
/* ---- GATED ACTIONS ---- */
async function saveWorkerAction(id, btn) {

  if (!requireAuth('Please login to save workers.')) return;

  // Make sure a logged-in citizen is available
  if (!currentUser || !currentUser.id) {
    toast('Please login again.', 'warn');
    return;
  }

  try {

    // Check whether this worker is already saved
    const savedResponse = await fetch(
      `http://127.0.0.1:5000/api/saved-workers/${currentUser.id}`
    );

    const savedData = await savedResponse.json();

    if (!savedData.success) {
      toast('Unable to check saved workers.', 'error');
      return;
    }

    const alreadySaved = savedData.workers.some(
      worker => worker.id === id
    );

    if (alreadySaved) {

      // Remove worker from saved workers
      const response = await fetch(
        `http://127.0.0.1:5000/api/saved-workers/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: currentUser.id
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast('Worker removed from saved workers.');
        savedWorkerIds = savedWorkerIds.filter(
    workerId => workerId !== Number(id)
  );

        // Change bookmark icon
        if (btn) {
          btn.innerHTML = '<i class="bi bi-bookmark"></i>';
        }

        renderSavedWorkers();
        renderWorkers();
      } else {
        toast(result.message || 'Unable to remove worker.', 'error');
      }

    } else {

      // Save worker
      const response = await fetch(
        'http://127.0.0.1:5000/api/saved-workers',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            worker_id: id
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast('Worker saved successfully!');
        savedWorkerIds.push(Number(id));

        // Change bookmark icon
        if (btn) {
          btn.innerHTML = '<i class="bi bi-bookmark-fill"></i>';
        }

        renderSavedWorkers();
        renderWorkers();
      } else {
        toast(result.message || 'Unable to save worker.', 'error');
      }
    }

  } catch (error) {

    console.error('Save worker error:', error);

    toast('Unable to connect to the server.', 'error');
  }
}
function previewPhoto(input, previewId) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => { const p = document.getElementById(previewId); if(p) p.innerHTML = `<img src="${e.target.result}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #4f46e5">`; };
  r.readAsDataURL(f);
}

async function getMyWorkerId() {
  if (!currentUser || !currentUser.id) return 0;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/profile/${currentUser.id}`
    );

    const data = await response.json();

    if (!data.success || !data.worker) {
      return 0;
    }

    return data.worker.id;

  } catch (error) {
    console.error('Get worker ID error:', error);
    return 0;
  }
}
/* ============ WORKER: Profile ============ */

function renderWorkerProfile() {

  const el = document.getElementById('workerProfileBody');

  if (!el) return;

  const skill = currentUser.skill || 'Skilled Worker';

  el.innerHTML = `
    <div class="card-box mx-auto" style="max-width:820px">

      <h5 class="fw-bold mb-3">
        <i class="bi bi-person-gear text-success me-2"></i>
        My Professional Profile
      </h5>

      <div class="row g-3">

        <div class="col-md-6">
          <label class="form-label fw-semibold">Name</label>
          <input
            id="editWorkerName"
            class="form-control"
            value="${currentUser.name || ''}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">Email</label>
          <input
            id="editWorkerEmail"
            class="form-control"
            value="${currentUser.email || ''}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">Primary Skill</label>
          <input
            id="editWorkerSkill"
            class="form-control"
            value="${skill}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">Mobile</label>
          <input
            id="editWorkerMobile"
            class="form-control"
            value="${currentUser.mobile || ''}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">Location</label>
          <input
            id="editWorkerLocation"
            class="form-control"
            value="${currentUser.location || ''}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">
            Experience (years)
          </label>
          <input
            id="editWorkerExperience"
            class="form-control"
            type="number"
            min="0"
            value="${currentUser.experience || ''}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">Charges</label>
          <input
            id="editWorkerCharges"
            class="form-control"
            value="${currentUser.charges || ''}"
            readonly
          >
        </div>

        <div class="col-md-6">
          <label class="form-label fw-semibold">Availability</label>
          <input
            id="editWorkerAvailability"
            class="form-control"
            value="${currentUser.availability || ''}"
            readonly
          >
        </div>

        <div class="col-12">
          <label class="form-label fw-semibold">
            Other Skills
          </label>
          <input
            id="editWorkerSkills"
            class="form-control"
            value="${currentUser.skills || ''}"
            readonly
          >
        </div>

        <div class="col-12">
          <label class="form-label fw-semibold">
            Services
          </label>
          <input
            id="editWorkerServices"
            class="form-control"
            value="${currentUser.services || ''}"
            readonly
          >
        </div>

        <div class="col-12">
          <label class="form-label fw-semibold">
            Languages
          </label>
          <input
            id="editWorkerLanguages"
            class="form-control"
            value="${currentUser.languages || ''}"
            readonly
          >
        </div>

        <div class="col-12">
          <label class="form-label fw-semibold">
            About
          </label>
          <textarea
            id="editWorkerAbout"
            class="form-control"
            rows="2"
            readonly
          >${currentUser.about || ''}</textarea>
        </div>

      </div>

      <div class="mt-3">

        <button
          type="button"
          id="editWorkerProfileBtn"
          class="btn-grad-blue"
          onclick="enableWorkerProfileEdit()"
        >
          <i class="bi bi-pencil me-1"></i>
          Edit Profile
        </button>

      </div>

    </div>
  `;
}
function enableWorkerProfileEdit() {

  const fields = [
    'editWorkerName',
    'editWorkerEmail',
    'editWorkerMobile',
    'editWorkerLocation',
    'editWorkerExperience',
    'editWorkerCharges',
    'editWorkerAvailability',
    'editWorkerSkills',
    'editWorkerServices',
    'editWorkerLanguages',
    'editWorkerAbout'
  ];

  fields.forEach(id => {

    const field = document.getElementById(id);

    if (field) {
      field.removeAttribute('readonly');
    }

  });

  const skillField =
    document.getElementById('editWorkerSkill');

  if (skillField) {
    skillField.removeAttribute('readonly');
  }

  const button =
    document.getElementById('editWorkerProfileBtn');

  if (button) {

    button.innerHTML = `
      <i class="bi bi-check-lg me-1"></i>
      Save Changes
    `;

    button.onclick = saveWorkerProfile;

  }

}
async function saveWorkerProfile() {

  if (!currentUser || !currentUser.id) {
    toast('Please login again.', 'warn');
    return;
  }

  const data = {
    full_name: document.getElementById('editWorkerName').value.trim(),
    email: document.getElementById('editWorkerEmail').value.trim(),
    phone: document.getElementById('editWorkerMobile').value.trim(),
    location: document.getElementById('editWorkerLocation').value.trim(),
    experience_years: document.getElementById('editWorkerExperience').value,
    charges: document.getElementById('editWorkerCharges').value.trim(),
    availability: document.getElementById('editWorkerAvailability').value.trim(),
    other_skills: document.getElementById('editWorkerSkills').value.trim(),
    services_offered: document.getElementById('editWorkerServices').value.trim(),
    languages: document.getElementById('editWorkerLanguages').value.trim(),
    about: document.getElementById('editWorkerAbout').value.trim()
  };

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/profile/${currentUser.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Unable to update profile'
      );
    }

    currentUser.name = data.full_name;
    currentUser.email = data.email;
    currentUser.mobile = data.phone;
    currentUser.location = data.location;
    currentUser.experience = data.experience_years;
    currentUser.charges = data.charges;
    currentUser.availability = data.availability;
    currentUser.skills = data.other_skills;
    currentUser.services = data.services_offered;
    currentUser.languages = data.languages;
    currentUser.about = data.about;

    ss('currentUser', currentUser);
    toast('Profile updated successfully!');
    renderWorkerProfile();
    await loadWorkersFromDatabase();
  } catch (error) {
    console.error(
      'Worker profile update error:',
      error
    );

    toast(
      error.message || 'Unable to update profile',
      'error'
    );
  }
}

/* ============ WORKER: Portfolio ============ */
/* ============ WORKER: Portfolio ============ */
async function renderWorkerPortfolio() {
  const el = document.getElementById('workerPortfolioBody');
  if (!el || !currentUser || !currentUser.id) return;

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/profile/${currentUser.id}`
    );

    const data = await response.json();

    if (!response.ok || !data.success || !data.worker) {
      el.innerHTML = `
        <div class="alert alert-warning">
          Worker profile not found.
        </div>
      `;
      return;
    }

    const worker = data.worker;

    const portfolio = worker.portfolio
      ? String(worker.portfolio)
          .split('|')
          .map(p => p.trim())
          .filter(Boolean)
      : [];

    el.innerHTML = `
      <div class="card-box">
        <h5 class="fw-bold mb-3">
          <i class="bi bi-images text-primary me-2"></i>
          Digital Portfolio
        </h5>

        <p class="text-muted small mb-3">
          Showcase your best work photos and certificates.
          Clients can view these when deciding to hire you.
        </p>

        ${
          portfolio.length
          ?
          `
          <div
            class="row g-3 mb-3"
            id="workerPortfolioGrid">

            ${portfolio.map((path, index) => {

              const cleanPath = String(path)
                .replace(/\\/g, '/')
                .replace(/^\/+/, '');

              const imageUrl =
                `http://127.0.0.1:5000/${cleanPath}`;

              return `
                <div class="col-12 col-sm-6 col-md-4 col-lg-3">

                  <div
                    style="
                      border:1px solid #e2e8f0;
                      border-radius:12px;
                      background:#fff;
                      padding:10px;
                      width:100%;
                      box-sizing:border-box;
                      display:flex;
                      flex-direction:column;
                    "
                  >

                    <img
                      src="${imageUrl}"
                      alt="Work Photo ${index + 1}"
                      style="
                        width:100%;
                        height:180px;
                        object-fit:cover;
                        border-radius:8px;
                        display:block;
                      "
                    >

                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm w-100 mt-2"
                      onclick="showDeletePortfolioConfirm(${index})"
                    >
                      <i class="bi bi-trash me-1"></i>
                      Delete
                    </button>

                  </div>

                </div>
              `;
            }).join('')}

          </div>
          `
          :
          `
          <p class="text-muted mb-3">
            No work photos uploaded yet.
          </p>
          `
        }

        <input
          type="file"
          id="workerPortfolioUpload"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          multiple
          hidden
        >

        <button
          type="button"
          class="btn-grad-green"
          id="workerUploadPhotoButton"
        >
          <i class="bi bi-upload me-1"></i>
          Upload Work Photo
        </button>
      </div>
    `;

    const uploadButton =
      document.getElementById('workerUploadPhotoButton');

    const fileInput =
      document.getElementById('workerPortfolioUpload');

    if (!uploadButton || !fileInput) return;

    uploadButton.addEventListener(
      'click',
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      }
    );

    fileInput.addEventListener(
      'change',
      async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(
          fileInput.files || []
        );

        if (!files.length) return;

        await uploadWorkerPortfolio(files);

        fileInput.value = '';
      }
    );

  } catch (error) {

    console.error(
      'Worker portfolio loading error:',
      error
    );

    el.innerHTML = `
      <div class="alert alert-warning">
        Unable to load worker portfolio.
      </div>
    `;
  }
}
async function uploadWorkerPortfolio(files) {

  if (!files || files.length === 0) {
    return;
  }

  if (!currentUser || !currentUser.id) {
    toast('Please login again.', 'warn');
    return;
  }

  const formData = new FormData();

  files.forEach(file => {

    if (!file.type.startsWith('image/')) {
      return;
    }

    formData.append(
      'portfolio',
      file
    );

  });

  formData.append(
    'user_id',
    currentUser.id
  );


  try {

    toast('Uploading work photo...', 'info');


    const response = await fetch(
      'http://127.0.0.1:5000/api/worker/portfolio',
      {
        method: 'POST',
        body: formData
      }
    );


    const data = await response.json();


    if (!response.ok || !data.success) {

      throw new Error(
        data.message ||
        'Unable to upload work photo'
      );

    }


    toast(
      'Work photo uploaded successfully!'
    );
    await renderWorkerPortfolio();

  } catch (error) {

    console.error(
      'Portfolio upload error:',
      error
    );

    toast(
      error.message ||
      'Unable to upload work photo',
      'error'
    );

  }

}
async function deleteWorkerPortfolioPhoto(index) {

  if (!currentUser || !currentUser.id) {
    toast('Please login first', 'error');
    return;
  }

 let worker;

try {
  const response = await fetch(
    `http://127.0.0.1:5000/api/worker/profile/${currentUser.id}`
  );

  const data = await response.json();

  if (!data.success || !data.worker) {
    toast('Worker profile not found', 'error');
    return;
  }

  worker = data.worker;

} catch (error) {
  console.error('Worker profile error:', error);
  toast('Unable to load worker profile', 'error');
  return;
}

const portfolio = worker.portfolio
  ? String(worker.portfolio)
      .split('|')
      .map(p => p.trim())
      .filter(Boolean)
  : [];

if (!portfolio[index]) {
  toast('Portfolio photo not found', 'error');
  return;
}

const photoPath = portfolio[index];

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/worker/portfolio/delete',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          photo_path: photoPath
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to delete photo'
      );
    }

    toast('Work photo deleted successfully!');
    const modalElement =
  document.getElementById('deletePortfolioModal');

if (modalElement) {

  const modalInstance =
    bootstrap.Modal.getInstance(modalElement);

  if (modalInstance) {
    modalInstance.hide();
  }

  setTimeout(() => {
    modalElement.remove();
  }, 300);
}

  await renderWorkerPortfolio();

  } catch (error) {

    console.error(
      'Delete portfolio photo error:',
      error
    );

    toast(
      error.message || 'Unable to delete photo',
      'error'
    );
  }
}
function showDeletePortfolioConfirm(index) {

  const box = document.getElementById('portfolioDeleteConfirm');

  if (box) {
    box.remove();
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div
      id="portfolioDeleteConfirm"
      style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:9999;
      "
    >
      <div
        style="
          background:white;
          width:90%;
          max-width:420px;
          border-radius:14px;
          padding:24px;
          box-shadow:0 10px 30px rgba(0,0,0,.2);
        "
      >

        <h5 class="fw-bold mb-2">
          <i class="bi bi-trash text-danger me-2"></i>
          Delete Work Photo
        </h5>

        <p class="text-muted mb-4">
          Are you sure you want to delete this work photo?
        </p>

        <div class="d-flex justify-content-end gap-2">

          <button
            type="button"
            class="btn btn-secondary"
            onclick="document.getElementById('portfolioDeleteConfirm').remove()"
          >
            Cancel
          </button>

          <button
            type="button"
            class="btn btn-danger"
            onclick="deleteWorkerPortfolioPhoto(${index}); document.getElementById('portfolioDeleteConfirm').remove();"
          >
            <i class="bi bi-trash me-1"></i>
            Delete
          </button>

        </div>

      </div>
    </div>
  `);
}
/* ============ WORKER: Work Requests ============ */
async function renderWorkerRequests() {

  const el = document.getElementById('workerReqBody');

  if (!el) return;

  // currentUser.id is the ID from the users table
  const userId = currentUser ? currentUser.id : 0;

  if (!userId || !currentUser || currentUser.role !== 'worker') {
    el.innerHTML = `
      <div class="ja-empty">
        <i class="bi bi-person-x"></i>
        <p class="mb-0">Worker profile not found.</p>
      </div>`;
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/service-requests/worker/${userId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load service requests');
    }

    const reqs = data.requests;
    console.log('Worker requests:', reqs);
    if (!reqs.length) {

      el.innerHTML = `
        <div class="ja-empty">
          <i class="bi bi-inbox"></i>
          <p class="mb-0">
            No service requests received yet.
            Citizens who find your profile will send you requests here.
          </p>
        </div>`;

      return;
    }

    el.innerHTML = reqs.map(r => {

      const stCls = 'st-' + r.status.toLowerCase();

      let actions = '';

if (r.status.toLowerCase() === 'pending') {

  actions = `
    <button
      class="btn-grad-green btn-sm me-1"
      onclick="workerAcceptRequest(${r.id})">
      <i class="bi bi-check-circle me-1"></i>
      Accept
    </button>

    <button
      class="btn btn-outline-danger btn-sm"
      onclick="workerRejectRequest(${r.id})">
      <i class="bi bi-x-circle me-1"></i>
      Reject
    </button>
  `;

} else if (r.status.toLowerCase() === 'accepted') {

  actions = `
    <button
      class="btn-grad-blue btn-sm"
      onclick="workerScheduleRequest(${r.id})">
      <i class="bi bi-calendar-check me-1"></i>
      Mark Scheduled
    </button>
  `;

} else if (r.status.toLowerCase() === 'scheduled') {

  actions = `
    <button
      class="btn-grad-green btn-sm"
      onclick="workerCompleteRequest(${r.id})">
      <i class="bi bi-check2-all me-1"></i>
      Mark Completed
    </button>
  `;
}
      return `
        <div class="req-card mb-3">

          <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">

            <div>
              <h6 class="fw-bold mb-0">
                ${r.citizen_name}
              </h6>

              <small style="color:#64748b">
                Request #${r.id}
              </small>
            </div>

            <span class="st-badge ${stCls}">
              ${r.status}
            </span>

          </div>

          <div class="row g-2 small">

            <div class="col-md-4">
              <i class="bi bi-tools me-1 text-primary"></i>
              <strong>Service:</strong>
              ${r.service_type}
            </div>

            <div class="col-md-4">
              <i class="bi bi-calendar me-1 text-primary"></i>
              <strong>Date:</strong>
              ${r.request_date}
            </div>

            <div class="col-md-4">
              <i class="bi bi-clock me-1 text-primary"></i>
              <strong>Time:</strong>
              ${r.request_time}
            </div>

            <div class="col-md-6">
              <i class="bi bi-geo-alt me-1 text-primary"></i>
              <strong>Location:</strong>
              ${r.location}
            </div>

            <div class="col-md-6">
              <i class="bi bi-telephone me-1 text-primary"></i>
              <strong>Phone:</strong>
              ${r.citizen_phone || 'Not provided'}
            </div>

            <div class="col-12">
              <i class="bi bi-chat-text me-1 text-primary"></i>
              <strong>Requirement:</strong>
              ${r.description || 'No additional details'}
            </div>

          </div>

          ${actions ? `
            <div class="mt-2">
              ${actions}
            </div>
          ` : ''}

        </div>
      `;

    }).join('');

  } catch (error) {

    console.error('Worker requests error:', error);

    el.innerHTML = `
      <div class="ja-empty">
        <i class="bi bi-exclamation-circle"></i>
        <p class="mb-0">
          Unable to load service requests.
        </p>
      </div>`;
  }
}

async function updateWorkerRequestStatus(id, status) {

  const workerId = getMyWorkerId();

  if (!workerId) {
    toast('Worker profile not found', 'error');
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/service-requests/${id}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          worker_id: workerId,
          status: status
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to update request', 'error');
      return;
    }

    toast(`Request ${status.toLowerCase()} successfully!`);

    await renderWorkerRequests();
    renderWorkerDashboard();

  } catch (error) {

    console.error('Status update error:', error);

    toast('Unable to connect to the server', 'error');
  }
}


function workerAcceptRequest(id) {
  updateWorkerRequestStatus(id, 'Accepted');
}


function workerRejectRequest(id) {
  updateWorkerRequestStatus(id, 'Rejected');
}


function workerScheduleRequest(id) {
  updateWorkerRequestStatus(id, 'Scheduled');
}


function workerCompleteRequest(id) {
  updateWorkerRequestStatus(id, 'Completed');
}
/* ============ WORKER: Get Category ID ============ */
async function getWorkerCategoryId() {
  const skill = currentUser.skill;

  try {
    const response = await fetch('http://127.0.0.1:5000/api/job-categories');

    if (!response.ok) {
      throw new Error('Failed to load job categories');
    }

    const data = await response.json();

    const categories = data.categories || data;

    const category = categories.find(c =>
      c.category_name === skill ||
      c.name === skill
    );

    if (!category) {
      console.error('Category not found:', skill);
      return null;
    }

    return category.id || category.category_id;

  } catch (error) {
    console.error('Error getting category ID:', error);
    return null;
  }
}
/* ============ WORKER: Career Roadmap ============ */

async function renderWorkerRoadmap() {
  const el = document.getElementById('workerRoadmapBody');
  if (!el) return;

  const skill = currentUser.skill;

if (!skill) {
  el.innerHTML = `
    <div class="alert alert-info">
      Please select an occupation to view your career roadmap.
    </div>
  `;
  return;
}

  el.innerHTML = `
    <div class="card-box mb-3">
      <h5 class="fw-bold mb-2">
        <i class="bi bi-signpost-split text-primary me-2"></i>
        Personalized Career Roadmap
      </h5>

      <p class="text-muted small mb-2">
        Your occupation-specific career progression from beginner to self-employment.
        Follow these steps to grow your career.
      </p>

      <label class="form-label fw-semibold small">
        Select Occupation:
      </label>

      <select class="rm-skill-select" id="roadmapOccupationSelect">
        <option>Loading occupations...</option>
      </select>
    </div>

    <div id="roadmapStepsContainer">
      <p class="text-muted">Loading career roadmap...</p>
    </div>
  `;

  try {
    const categoryResponse = await fetch(
      'http://127.0.0.1:5000/api/job-categories'
    );

    const categoryData = await categoryResponse.json();

    if (!categoryData.success) {
      throw new Error('Unable to load job categories');
    }

    const categories = categoryData.categories;

    const select = document.getElementById('roadmapOccupationSelect');

    select.innerHTML = categories.map(category => `
      <option
        value="${category.id}"
        ${category.category_name === skill ? 'selected' : ''}
      >
        ${category.category_name}
      </option>
    `).join('');

    select.onchange = function () {
      renderWorkerRoadmapFor(this.value);
    };

    const selectedCategory = categories.find(
      category => category.category_name === skill
    );

    const categoryId = selectedCategory
      ? selectedCategory.id
      : categories[0]?.id;

    if (categoryId) {
      await renderWorkerRoadmapFor(categoryId);
    }

  } catch (error) {

    console.error('Career roadmap error:', error);

    document.getElementById('roadmapStepsContainer').innerHTML = `
      <div class="alert alert-danger">
        Unable to load career roadmap.
      </div>
    `;
  }
}


async function renderWorkerRoadmapFor(categoryId) {

  const container = document.getElementById('roadmapStepsContainer');

  if (!container) return;

  container.innerHTML = `
    <p class="text-muted">Loading roadmap...</p>
  `;

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/career-roadmap/${categoryId}`
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error('Unable to load roadmap');
    }

    const steps = data.roadmap;

    if (!steps || steps.length === 0) {

      container.innerHTML = `
        <div class="alert alert-info">
          No career roadmap is currently available for this occupation.
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="occ-rm-wrap">

        ${steps.map((s, i) => `

          <div class="occ-rm-step">

            <span class="rm-num">
              ${i + 1}
            </span>

            <div class="occ-rm-card">

              <h6>
                Step ${i + 1}: ${s.stage_title}
              </h6>

              <p class="small text-muted mb-2">
                ${s.description || ''}
              </p>

              <div class="prog-bar mt-2">
                <div
                  class="prog-fill"
                  style="
                    width:${Math.round((i + 1) / steps.length * 100)}%;
                    background:linear-gradient(90deg,#4f46e5,#10b981)
                  ">
                </div>
              </div>

              <small style="color:#94a3b8">
                ${Math.round((i + 1) / steps.length * 100)}% progress
              </small>

            </div>

          </div>

        `).join('')}

      </div>
    `;

  } catch (error) {

    console.error('Career roadmap error:', error);

    container.innerHTML = `
      <div class="alert alert-danger">
        Unable to load career roadmap.
      </div>
    `;
  }
}
/* ============ WORKER: Certifications ============ */

async function renderWorkerCerts() {

  const el = document.getElementById('workerCertsBody');

  if (!el) return;
const skill = currentUser.skill;

if (!skill) {
  el.innerHTML = `
    <div class="alert alert-info">
      Please select an occupation to view certification recommendations.
    </div>
  `;
  return;
}

  el.innerHTML = `
    <h5 class="fw-bold mb-3">
      <i class="bi bi-patch-check text-success me-2"></i>
      Government Certification &amp; Training Recommendations
    </h5>

    <p class="text-muted small mb-3">
      Recommended certifications and training programs for your occupation.
      These can help you get better jobs and higher income.
    </p>

    <div id="workerCertsContainer">
      <p class="text-muted">Loading certifications...</p>
    </div>
  `;

  try {

    const categoryResponse = await fetch(
      'http://127.0.0.1:5000/api/job-categories'
    );

    const categoryData = await categoryResponse.json();

    const categories = categoryData.categories || [];

    const category = categories.find(
      c => c.category_name === skill
    );

    if (!category) {
      throw new Error('Category not found');
    }

    const response = await fetch(
      `http://127.0.0.1:5000/api/certifications/${category.id}`
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error('Unable to load certifications');
    }

    const certs = data.certifications;

    const container = document.getElementById(
      'workerCertsContainer'
    );

    if (!certs || certs.length === 0) {

      container.innerHTML = `
        <div class="alert alert-info">
          No certifications are currently available for this occupation.
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="row g-3">

        ${certs.map(c => `

          <div class="col-md-6 col-lg-4">

            <div class="reco-card cert h-100">

              <h6 class="fw-bold mb-2">
                ${c.certification_name}
              </h6>

              <p class="small mb-1">
                <strong>Issuing Authority:</strong>
                ${c.issuing_authority || 'Not specified'}
              </p>

              <p class="small mb-1">
                <strong>Type:</strong>
                ${c.certification_type || 'Not specified'}
              </p>

              <p class="small mb-1">
                <strong>Description:</strong>
                ${c.description || 'Not available'}
              </p>

              <p class="small mb-1">
                <strong>Eligibility:</strong>
                ${c.eligibility || 'Not specified'}
              </p>

              <p class="small mb-2">
                <strong>Duration:</strong>
                ${c.duration || 'Not specified'}
              </p>

              ${
                c.official_link
                  ? `
                    <a
                      href="${c.official_link}"
                      target="_blank"
                      class="btn btn-outline-success btn-sm"
                    >
                      <i class="bi bi-box-arrow-up-right me-1"></i>
                      Official Details
                    </a>
                  `
                  : ''
              }

            </div>

          </div>

        `).join('')}

      </div>
    `;

  } catch (error) {

    console.error('Certification error:', error);

    document.getElementById(
      'workerCertsContainer'
    ).innerHTML = `
      <div class="alert alert-danger">
        Unable to load certifications.
      </div>
    `;
  }
}
/* ============ WORKER: Government Schemes ============ */

async function renderWorkerSchemes() {

  const el = document.getElementById('workerSchemesBody');

  if (!el) return;

  const skill = currentUser.skill;

if (!skill) {
  el.innerHTML = `
    <div class="alert alert-info">
      Please select an occupation to view government schemes.
    </div>
  `;
  return;
}

  el.innerHTML = `
    <h5 class="fw-bold mb-3">
      <i class="bi bi-bank2 text-warning me-2"></i>
      Government Scheme Recommendations
    </h5>

    <p class="text-muted small mb-3">
      Government schemes and programs relevant to your occupation.
      These can provide financial support, training and tools.
    </p>

    <div id="workerSchemesContainer">
      <p class="text-muted">Loading government schemes...</p>
    </div>
  `;

  try {

    const categoryResponse = await fetch(
      'http://127.0.0.1:5000/api/job-categories'
    );

    const categoryData = await categoryResponse.json();

    const categories = categoryData.categories || [];

    const category = categories.find(
      c => c.category_name === skill
    );

    if (!category) {
      throw new Error('Category not found');
    }

    const response = await fetch(
      `http://127.0.0.1:5000/api/government-schemes/${category.id}`
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error('Unable to load schemes');
    }

    const schemes = data.schemes;

    const container = document.getElementById(
      'workerSchemesContainer'
    );

    if (!schemes || schemes.length === 0) {

      container.innerHTML = `
        <div class="alert alert-info">
          No government schemes are currently available for this occupation.
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="row g-3">

        ${schemes.map(s => `

          <div class="col-md-6 col-lg-4">

            <div class="reco-card scheme h-100">

              <h6 class="fw-bold mb-2">
                ${s.scheme_name}
              </h6>

              <p class="small mb-1">
                <strong>Ministry:</strong>
                ${s.ministry || 'Not specified'}
              </p>

              <p class="small mb-1">
                <strong>Type:</strong>
                ${s.scheme_type || 'Not specified'}
              </p>

              <p class="small mb-1">
                <strong>Why recommended:</strong>
                ${s.recommendation_reason || 'Relevant to this occupation'}
              </p>

              <p class="small mb-1">
                <strong>Description:</strong>
                ${s.description || 'Not available'}
              </p>

              <p class="small mb-1">
                <strong>Eligibility:</strong>
                ${s.eligibility || 'Not specified'}
              </p>

              <p class="small mb-1">
                <strong>Benefits:</strong>
                ${s.benefits || 'Not specified'}
              </p>

              <p class="small mb-2">
                <strong>Application:</strong>
                ${s.application_method || 'Not specified'}
              </p>

              ${
                s.official_link
                  ? `
                    <a
                      href="${s.official_link}"
                      target="_blank"
                      class="btn btn-outline-primary btn-sm"
                    >
                      <i class="bi bi-box-arrow-up-right me-1"></i>
                      Official Details
                    </a>
                  `
                  : ''
              }

            </div>

          </div>

        `).join('')}

      </div>
    `;

  } catch (error) {

    console.error('Government schemes error:', error);

    document.getElementById(
      'workerSchemesContainer'
    ).innerHTML = `
      <div class="alert alert-danger">
        Unable to load government schemes.
      </div>
    `;
  }
}

/* ============ WORKER: Skill Development ============ */

async function renderWorkerSkillDev() {

  const el = document.getElementById('workerSkillDevBody');

  if (!el) return;

  const skill = currentUser.skill;

  if (!skill) {
    el.innerHTML = `
      <div class="alert alert-warning">
        Please add your primary occupation to your worker profile.
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">
        Loading skill development...
      </p>
    </div>
  `;

  try {

    /* -----------------------------------------
       STEP 1: Get all job categories
    ----------------------------------------- */

    const categoryResponse = await fetch(
      'http://127.0.0.1:5000/api/job-categories'
    );

    if (!categoryResponse.ok) {
      throw new Error('Job categories API failed');
    }

    const categoryData = await categoryResponse.json();

    if (!categoryData.success) {
      throw new Error('Unable to get categories');
    }

    /* -----------------------------------------
       STEP 2: Find worker's category
    ----------------------------------------- */

    const category = categoryData.categories.find(
      c => c.category_name.trim().toLowerCase() ===
           skill.trim().toLowerCase()
    );

    if (!category) {
      throw new Error(
        'No category found for occupation: ' + skill
      );
    }

    /* -----------------------------------------
       STEP 3: Get Skill Development from MySQL
    ----------------------------------------- */

    const response = await fetch(
      `http://127.0.0.1:5000/api/skill-development/${category.id}`
    );

    if (!response.ok) {
      throw new Error('Skill development API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Skill development request failed');
    }

    const skills = data.skills || [];

    if (skills.length === 0) {

      el.innerHTML = `
        <div class="alert alert-info">
          No skill development information is available
          for ${skill}.
        </div>
      `;

      return;
    }

    /* -----------------------------------------
       STEP 4: Display the 3 learning stages
    ----------------------------------------- */

    el.innerHTML = `

      <h5 class="fw-bold mb-3">
        <i class="bi bi-mortarboard text-primary me-2"></i>
        Skill Development
      </h5>

      <p class="text-muted small mb-4">
        Develop your ${skill} skills step by step,
        from beginner to advanced level.
      </p>

      <div class="row g-3">

        ${skills.map((s, index) => `

          <div class="col-md-4">

            <div class="skill-card h-100">

              <div class="d-flex justify-content-between
                          align-items-center mb-2">

                <span class="badge bg-primary">
                  Step ${index + 1}
                </span>

                <span class="lv-tag lv-${s.skill_level.toLowerCase()}">
                  ${s.skill_level}
                </span>

              </div>

              <h6 class="fw-bold mb-2">
                ${s.skill_name}
              </h6>

              <p class="small mb-2">
                ${s.description}
              </p>

              <p class="small mb-2">
                <strong>Why important:</strong>
                ${s.why_important}
              </p>

              <p class="small mb-3">
                <strong>Learning path:</strong>
                ${s.learning_path}
              </p>

              ${
                s.youtube_link
                ?
                `
                <a
                  href="${s.youtube_link}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-grad-green
                         text-decoration-none
                         d-inline-block"
                  style="font-size:.78rem;
                         padding:.4rem .8rem"
                >
                  <i class="bi bi-youtube me-1"></i>
                  Start Learning
                </a>
                `
                :
                `
                <button
                  class="btn btn-secondary btn-sm"
                  disabled
                >
                  Resource unavailable
                </button>
                `
              }

            </div>

          </div>

        `).join('')}

      </div>
    `;

  } catch (error) {

    console.error(
      'Skill Development Error:',
      error
    );

    el.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Unable to load skill development information.
      </div>
    `;
  }
}
/* ============ WORKER: Employment History ============ */

async function renderWorkerHistory() {

  const el = document.getElementById('workerHistoryBody');

  if (!el) return;

  if (!currentUser || !currentUser.id) {
    el.innerHTML = `
      <div class="alert alert-warning">
        Please login to view your employment history.
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">
        Loading employment history...
      </p>
    </div>
  `;

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/employment-history/${currentUser.id}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to load employment history'
      );
    }

    const experience = data.experience || '';

    /*
      The database stores multiple experiences
      in the same column separated by |
    */
    const history = experience
      ? experience
          .split('|')
          .map(item => item.trim())
          .filter(item => item.length > 0)
      : [];

    el.innerHTML = `
      <h5 class="fw-bold mb-3">
        <i class="bi bi-clock-history text-primary me-2"></i>
        Employment History
      </h5>

      <div class="card-box">

        ${
          history.length
          ?
          `
            <ul class="mb-0">
              ${history.map(item => `
                <li class="mb-2">
                  ${item}
                </li>
              `).join('')}
            </ul>
          `
          :
          `
            <p class="text-muted mb-0">
              No employment history added yet.
            </p>
          `
        }

      </div>

      <div class="mt-3">

        <button
  class="btn-grad-blue"
  onclick="openAddExperienceModal()">

          <i class="bi bi-plus-circle me-1"></i>
          Add Experience

        </button>

      </div>
    `;

  } catch (error) {

    console.error(
      'Employment History Error:',
      error
    );

    el.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Unable to load employment history.
      </div>
    `;
  }
}
function openAddExperienceModal() {

  document.getElementById('experienceRole').value = '';
  document.getElementById('experienceCompany').value = '';
  document.getElementById('experienceStart').value = '';
  document.getElementById('experienceEnd').value = '';
  document.getElementById('experienceCurrent').checked = false;
  document.getElementById('experienceLocation').value = '';

  new bootstrap.Modal(
    document.getElementById('addExperienceModal')
  ).show();
}
async function saveWorkerExperience() {

  if (!currentUser || !currentUser.id) {
    toast('Please login first', 'error');
    return;
  }

  const role =
    document.getElementById('experienceRole').value.trim();

  const company =
    document.getElementById('experienceCompany').value.trim();

  const startYear =
    document.getElementById('experienceStart').value.trim();

  const endYear =
    document.getElementById('experienceEnd').value.trim();

  const current =
    document.getElementById('experienceCurrent').checked;

  const location =
    document.getElementById('experienceLocation').value.trim();


  // Basic validation

  if (!role) {
    toast('Please enter your job role', 'warn');
    return;
  }

  if (!company) {
    toast('Please enter company or organization', 'warn');
    return;
  }

  if (!startYear) {
    toast('Please enter the start year', 'warn');
    return;
  }


  /*
    Create one complete employment
    experience as a single history item.
  */

  const period =
    current
      ? `${startYear}–present`
      : `${startYear}–${endYear || 'present'}`;


  let experience =
    `${role} - ${company} (${period})`;


  if (location) {
    experience += ` - ${location}`;
  }


  try {

    // Get existing experience

    const getResponse = await fetch(
      `http://127.0.0.1:5000/api/worker/employment-history/${currentUser.id}`
    );

    const getData = await getResponse.json();

    if (!getResponse.ok || !getData.success) {
      throw new Error(
        getData.message || 'Unable to get existing experience'
      );
    }


    const oldExperience =
      (getData.experience || '').trim();


    /*
      Keep each employment experience
      as a separate item using | temporarily.
    */

    const updatedExperience =
      oldExperience
        ? `${oldExperience} | ${experience}`
        : experience;


    // Save to MySQL

    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/employment-history/${currentUser.id}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          previous_work_experience:
            updatedExperience
        })
      }
    );


    const data = await response.json();


    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to save experience'
      );
    }


    // Close modal

    const modal =
      bootstrap.Modal.getInstance(
        document.getElementById('addExperienceModal')
      );

    if (modal) {
      modal.hide();
    }


    toast(
      'Employment experience added successfully!'
    );


    // Refresh employment history

    await renderWorkerHistory();


    // Refresh worker database data

    if (typeof loadWorkersFromDatabase === 'function') {
      await loadWorkersFromDatabase();
    }


  } catch (error) {

    console.error(
      'Save Employment Experience Error:',
      error
    );

    toast(
      'Unable to save employment experience',
      'error'
    );
  }
}
/* ============ SCHEMES ============ */
let databaseMainSchemes = [];
let savedSchemeIds = [];
async function loadMainGovernmentSchemes() {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/government-schemes?t=${Date.now()}`
    );

    if (!response.ok) {
      throw new Error('Government schemes API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load government schemes'
      );
    }

    databaseMainSchemes = (data.schemes || []).map(s => ({
      id: s.id,
      name: s.scheme_name,
      dept: s.department || '',
      schemeCategory: s.scheme_category || 'General',
      category: s.category || '',
      state: s.state || 'All',
      gender: s.gender || 'Male,Female,Other',
      occupation: s.occupation || '',
      ageGroup: s.age_group || '',
      income: s.income_range || '',
      desc: s.description || '',
      eligibility: s.eligibility
        ? s.eligibility.split('|')
        : [],
      benefits: s.benefits
        ? s.benefits.split('|')
        : [],
      docs: s.documents
        ? s.documents.split('|')
        : [],
      method: s.application_method || '',
      officialLink: s.official_link || '',
      deadline: s.deadline || '',
      status: s.status || 'Active'
    }));

    fillSchemeFilters();
    renderSchemes();

  } catch (error) {
    console.error('Government schemes error:', error);

    const list = document.getElementById('schemeList');

    if (list) {
      list.innerHTML = `
        <div class="col-12 text-center py-5 text-danger">
          Unable to load government schemes.
        </div>
      `;
    }
  }
}
async function loadSavedSchemes() {
  if (!currentUser) {
    savedSchemeIds = [];
    renderSavedSchemes();
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/saved-schemes/${currentUser.id}`
    );

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to load saved schemes:', data.message);
      return;
    }

    savedSchemeIds = (data.saved_schemes || []).map(item => item.scheme_id);

    renderSavedSchemes();
    renderSchemes();

  } catch (error) {
    console.error('Saved schemes error:', error);
  }
}
function fillSchemeFilters() {
  const cats = [
    ...new Set(
      databaseMainSchemes.map(s => s.schemeCategory)
    )
  ];

  document.getElementById('schCatFilter').innerHTML =
    '<option value="">All Categories</option>' +
    cats.map(c => `<option>${c}</option>`).join('');
}
function renderSchemes() {
  const q   = ((document.getElementById('schSearch')||{}).value||'').toLowerCase();
  const cat = (document.getElementById('schCatFilter')||{}).value||'';
  const gen = (document.getElementById('schGenderFilter')||{}).value||'';
  const list = databaseMainSchemes.filter(s =>
    (!cat || s.schemeCategory === cat) &&
    (!gen || s.gender === 'All' || s.gender === gen) &&
    (!q   || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
  );
  document.getElementById('schemeList').innerHTML = list.length ? list.map(s => schemeCardHTML(s)).join('') : '<div class="col-12 text-center py-5" style="color:#94a3b8">No schemes found.</div>';
}
function schemeCardHTML(s) {
  const fav = savedSchemeIds.includes(s.id);
  const catColors = {
  Housing:'#4f46e5',
  Financial:'#10b981',
  Women:'#db2777',
  Farmer:'#f59e0b',
  Health:'#ef4444',
  Education:'#7c3aed',
  Business:'#8b5cf6',
 'Skill & Employment':'#0ea5e9',
  'Social Welfare':'#14b8a6',
  Insurance:'#f97316',
  Energy:'#eab308',
  Employment:'#6366f1',
  Livelihood:'#22c55e',
  General:'#64748b'
};

const c = catColors[s.schemeCategory] || '#4f46e5';
  return `<div class="col-md-6 col-lg-4">
    <div class="scheme-card" style="border-top-color:${c}">
      <div class="d-flex justify-content-between mb-2">
        <span class="badge rounded-pill" style="background:${c};color:#fff">${s.schemeCategory}</span>
        <button class="btn btn-link p-0" style="color:${fav?'#f59e0b':'#94a3b8'}" onclick="toggleSchemeFav(${s.id},this)"><i class="bi ${fav?'bi-bookmark-fill':'bi-bookmark'} fs-5"></i></button>
      </div>
      <h6 class="fw-bold mb-1">${s.name}</h6>
      <p class="small mb-1" style="color:#94a3b8">${s.dept}</p>
      <p class="small mb-1">${s.desc}</p>
      <p class="small mb-1"><strong>Benefits:</strong> ${s.benefits.join(', ')}</p>
      <p class="small mb-1"><strong>Income:</strong> ${s.income}</p>
      ${s.deadline ? `<p class="small mb-2" style="color:#ef4444"><i class="bi bi-calendar-event me-1"></i>Deadline: ${s.deadline}</p>` : ''}
      <div class="d-flex gap-2 mt-2">
        <button class="btn-grad-blue" style="font-size:.8rem;padding:.35rem .8rem" onclick="showSchemeDetail(${s.id})">View Details</button>
        <button class="btn btn-outline-success btn-sm" onclick="applyScheme(${s.id})">
  Apply
</button>
      </div>
    </div>
  </div>`;
}
function applyScheme(id) {
  const s = databaseMainSchemes.find(x => x.id === id);

  if (!s) {
    toast('Scheme details not found.');
    return;
  }

  if (!s.officialLink) {
    toast('Official application link is not available.');
    return;
  }

  window.open(s.officialLink, '_blank');
}
function showSchemeDetail(id) {
  const s = databaseMainSchemes.find(x => x.id === id);
  if (!s) return;
  const stored = gs('docCheck_'+id, {});
  document.getElementById('detailModalTitle').textContent = s.name;
  document.getElementById('detailModalBody').innerHTML = `
    <ul class="nav nav-tabs mb-3">
      <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#sd1">Overview</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#sd2">Eligibility</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#sd3">Documents</button></li>
      <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#sd4">How to Apply</button></li>
    </ul>
    <div class="tab-content">
      <div class="tab-pane fade show active" id="sd1">
        <p>${s.desc}</p><p><strong>Department:</strong> ${s.dept}</p>
        <p><strong>Category:</strong> ${s.schemeCategory}</p>
        <p><strong>Benefits:</strong></p><ul>${s.benefits.map(b=>`<li>${b}</li>`).join('')}</ul>
        ${s.deadline ? `<p style="color:#ef4444"><i class="bi bi-calendar-event me-1"></i><strong>Deadline:</strong> ${s.deadline}</p>` : ''}
      </div>
      <div class="tab-pane fade" id="sd2"><ul>${s.eligibility.map(e=>`<li>${e}</li>`).join('')}</ul></div>
      <div class="tab-pane fade" id="sd3">
        <p class="fw-semibold mb-2">Required Documents:</p>
        ${s.docs.map((d,i)=>`<div class="doc-check-item"><input class="form-check-input me-1" type="checkbox" id="dc_${id}_${i}" ${stored[i]?'checked':''} onchange="updateDocCheck(${id},${i},this.checked)"><label for="dc_${id}_${i}" class="small">${d}</label></div>`).join('')}
        <div class="mt-2 small"><strong>Completion:</strong> <span id="dcp_${id}"></span></div>
        <div class="prog-bar mt-1"><div class="prog-fill" id="dcb_${id}" style="width:0%"></div></div>
      </div>
      <div class="tab-pane fade" id="sd4">
        <p>${s.method}</p>
        <button class="btn-grad-green" onclick="applyScheme(${s.id})"><i class="bi bi-box-arrow-up-right me-1"></i>Official Website</button>
      </div>
    </div>`;
  new bootstrap.Modal(document.getElementById('detailModal')).show();
  setTimeout(() => { updateDocCheck(id, -1, false); }, 200);
}
function updateDocCheck(sid, idx, checked) {
  const st = gs('docCheck_'+sid, {});
  if (idx >= 0) { st[idx] = checked; ss('docCheck_'+sid, st); }
  const total = databaseMainSchemes.find(s => s.id === sid)?.docs.length || 1;
  const done  = Object.values(st).filter(Boolean).length;
  const pct   = Math.round(done/total*100);
  const p = document.getElementById('dcp_'+sid); const b = document.getElementById('dcb_'+sid);
  if (p) p.textContent = pct + '%'; if (b) b.style.width = pct + '%';
}
async function toggleSchemeFav(id, btn) {
  if (!requireAuth('Please login to save schemes.')) return;

  const isSaved = savedSchemeIds.includes(id);

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/saved-schemes',
      {
        method: isSaved ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          scheme_id: id
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to update saved scheme');
      return;
    }

    if (isSaved) {
      savedSchemeIds = savedSchemeIds.filter(x => x !== id);
      toast('Removed from saved');
    } else {
      savedSchemeIds.push(id);
      toast('Scheme saved!');
    }

    renderSchemes();
    renderSavedSchemes();

  } catch (error) {
    console.error('Save scheme error:', error);
    toast('Unable to update saved scheme');
  }
}
function renderSavedSchemes() {
  const list = databaseMainSchemes.filter(s =>
    savedSchemeIds.includes(s.id)
  );

  document.getElementById('savedSchemeList').innerHTML =
    list.length
      ? list.map(s => schemeCardHTML(s)).join('')
      : `
        <div class="col-12 text-center py-5" style="color:#94a3b8">
          No saved schemes yet. Browse schemes and click
          <i class="bi bi-bookmark"></i> to save.
        </div>
      `;
}
function renderFinderQ() {
  document.getElementById('finderQ').innerHTML = finderQs.map(q => `
    <div class="mb-3">
      <label class="form-label fw-semibold">${q.q}</label>
      <select class="form-select" id="fq_${q.id}"><option value="">Select...</option>${q.opts.map(o=>`<option>${o}</option>`).join('')}</select>
    </div>`).join('');
}
function runFinder() {
  const age = document.getElementById('fq_age')?.value || '';
  const gender = document.getElementById('fq_gender')?.value || '';
  const occupation = document.getElementById('fq_occupation')?.value || '';
  const income = document.getElementById('fq_income')?.value || '';
  const state = document.getElementById('fq_location')?.value || '';
  const category = document.getElementById('fq_category')?.value || '';

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fieldMatches(dbValue, selectedValue) {
    if (!selectedValue) return true;

    const selected = normalize(selectedValue);

    const values = normalize(dbValue)
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    // "All" means this field has no restriction
    if (values.includes('all')) {
      return true;
    }

    return values.includes(selected);
  }

  const matched = databaseMainSchemes.filter(s => {

    if (!fieldMatches(s.ageGroup, age)) return false;

    if (!fieldMatches(s.gender, gender)) return false;

    if (!fieldMatches(s.occupation, occupation)) return false;

    if (!fieldMatches(s.income, income)) return false;

    if (!fieldMatches(s.state, state)) return false;

    if (!fieldMatches(s.category, category)) return false;

    return true;
  });

  const resultBox = document.getElementById('finderResults');

  if (!matched.length) {
    resultBox.innerHTML = `
      <div class="text-center py-5" style="color:#94a3b8">
        <i class="bi bi-search fs-1 d-block mb-3"></i>
        <h6>No matching schemes found</h6>
        <p class="small">
          No schemes match the selected details.
        </p>
      </div>
    `;

    toast('No matching schemes found');
    return;
  }

  resultBox.innerHTML = `
    <h6 class="fw-bold mb-3">
      Found ${matched.length} matching schemes
    </h6>

    <div class="row g-3">
      ${matched.map(s => {
        const fav = savedSchemeIds.includes(s.id);

        return `
          <div class="col-md-6 col-lg-4">
            <div class="scheme-card">

              <div class="d-flex justify-content-between mb-2">
                <span class="badge rounded-pill"
                      style="background:#4f46e5;color:#fff">
                  ${s.schemeCategory}
                </span>

                <button
                  class="btn btn-link p-0"
                  style="color:${fav ? '#f59e0b' : '#94a3b8'}"
                  onclick="toggleSchemeFav(${s.id},this)">
                  <i class="bi ${
                    fav ? 'bi-bookmark-fill' : 'bi-bookmark'
                  } fs-5"></i>
                </button>
              </div>

              <h6 class="fw-bold mb-1">${s.name}</h6>

              <p class="small mb-1" style="color:#94a3b8">
                ${s.dept}
              </p>

              <p class="small mb-1">
                ${s.desc}
              </p>

              <p class="small mb-2">
                <strong>Benefits:</strong>
                ${s.benefits.join(', ')}
              </p>

              <div class="d-flex gap-2 mt-2">

                <button
                  class="btn-grad-blue"
                  style="font-size:.8rem;padding:.35rem .8rem"
                  onclick="showSchemeDetail(${s.id})">
                  View Details
                </button>

                <button
                  class="btn btn-outline-success btn-sm"
                  onclick="applyScheme(${s.id})">
                  Apply
                </button>

              </div>

            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  toast(`Found ${matched.length} matching schemes`);
}
/* ============ WOMEN & RIGHTS ============ */
async function renderRights() {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/legal-rights'
    );
    const data = await response.json();
    if (!data.success) {
      console.error('Failed to load legal rights:', data.message);
      return;
    }
    /* Group MySQL rights into categories */
    const groupedCategories = {};
    data.rights.forEach(r => {
      if (!groupedCategories[r.category_id]) {
        groupedCategories[r.category_id] = {
          id: r.category_id,
          icon: r.category_icon,
          color: r.category_color,
          title: r.category_title,
          desc: r.category_description,
          rights: []
        };
      }
      groupedCategories[r.category_id].rights.push({
        title: r.right_title,
        desc: r.right_description,
        points: r.key_points
          ? r.key_points.split('|')
          : [],
        law: r.law,
        action: r.action
      });
    });
    databaseRightsCategories = Object.values(groupedCategories);
    /* Create category filter buttons */
    const filterEl = document.getElementById(
      'rightsCategoryFilter'
    );
    if (filterEl) {
      filterEl.innerHTML =
        '<div class="col-12">' +
        '<div class="d-flex flex-wrap gap-2" id="rightsCatPills">' +
        '<button class="btn btn-sm rounded-pill" ' +
        'style="background:#db2777;color:#fff" ' +
        'onclick="filterRights(\'all\',this)">' +
        'All Categories' +
        '</button>' +
        databaseRightsCategories.map(c =>
          `<button class="btn btn-sm btn-outline-secondary rounded-pill" ` +
          `onclick="filterRights('${c.id}',this)">${c.title}</button>`
        ).join('') +
        '</div></div>';
    }
    renderRightsList('all');
  } catch (error) {
    console.error(
      'Error loading women legal rights:',
      error
    );
  }
}
function filterRights(catId, btn) {
  document
    .querySelectorAll('#rightsCatPills button')
    .forEach(b => {
      b.className =
        'btn btn-sm btn-outline-secondary rounded-pill';
      b.style.background = '';
      b.style.color = '';
    });
  btn.className =
    'btn btn-sm rounded-pill';
  if (catId === 'all') {
    btn.style.background = '#db2777';
    btn.style.color = '#fff';
  } else {
    btn.style.background = '#e5e7eb';
    btn.style.color = '#111827';
  }
  renderRightsList(catId);
}
function renderRightsList(catId) {
  const cats =
    catId === 'all'
      ? databaseRightsCategories
      : databaseRightsCategories.filter(
          c => c.id === catId
        );
  let html = '';
  cats.forEach(cat => {
    html += `
      <div class="col-12">
        <h5 class="fw-bold mb-3" style="color:${cat.color}">
          <i class="bi ${cat.icon} me-2"></i>
          ${cat.title}
        </h5>
      </div>
    `;
    cat.rights.forEach(r => {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="rights-card"
               style="border-left-color:${cat.color}">
            <h6 class="fw-bold mb-1">
              ${r.title}
            </h6>

            <p class="small mb-2"
               style="color:#64748b">
              ${r.desc}
            </p>
            ${
              r.points && r.points.length
                ? `
                  <p class="small fw-semibold mb-1">
                    Key Points:
                  </p>
                  <ul class="small ps-3 mb-2">
                    ${r.points.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                `
                : ''
            }
            ${
              r.law
                ? `
                  <p class="small mb-2">
                    <span
                      class="badge rounded-pill"
                      style="
                        background:${cat.color}20;
                        color:${cat.color}
                      ">
                      ${r.law}
                    </span>
                  </p>
                `
                : ''
            }
            <div class="small fw-semibold mb-1">
              If Violated:
            </div>

            <p class="small mb-0"
               style="color:#64748b">
              ${r.action}
            </p>
          </div>
        </div>
      `;
    });
  });
  const rightsList =
    document.getElementById('rightsList'); 
  if (rightsList) {
    rightsList.innerHTML =
      html ||
      '<div class="col-12 text-center text-muted">No legal rights found.</div>';
  }
}
/* ============ WOMEN GOVERNMENT SCHEMES ============ */

let databaseWomenSchemes = [];

async function loadWomenSchemes() {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/government-schemes'
    );

    if (!response.ok) {
      throw new Error('Women schemes API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Unable to load women schemes');
    }

    databaseWomenSchemes = (data.schemes || []).map(s => ({
      id: s.id,
      name: s.scheme_name,
      level: s.scheme_level,
      status: s.status,
      category: s.category,
      desc: s.description || '',
      eligibility: s.eligibility
        ? s.eligibility.split('|')
        : [],
      benefits: s.benefits
        ? s.benefits.split('|')
        : [],
      docs: s.documents
        ? s.documents.split('|')
        : [],
      applyInfo: s.application_method || '',
      officialLink: s.official_link || '',
      eligibilityTags: s.eligibility_tags
        ? s.eligibility_tags.split(';')
        : []
    }));

    fillWomenSchemeFilters();
    renderWomenSchemes();

  } catch (error) {
    console.error('Women schemes error:', error);

    const list = document.getElementById('womenSchemeList');

    if (list) {
      list.innerHTML = `
        <div class="col-12 text-center py-5 text-danger">
          Unable to load government schemes.
        </div>
      `;
    }
  }
}

function fillWomenSchemeFilters() {

  const cats = [
    ...new Set(
      databaseWomenSchemes.map(s => s.category)
    )
  ];

  const el = document.getElementById('womenSchCatFilter');

  if (el) {
    el.innerHTML =
      '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

function renderWomenSchemes() {

  const q =
    ((document.getElementById('womenSchSearch') || {}).value || '')
      .trim()
      .toLowerCase();

  const cat =
    (document.getElementById('womenSchCatFilter') || {}).value || '';

  const elig =
    (document.getElementById('womenSchEligFilter') || {}).value || '';

  const list = databaseWomenSchemes.filter(s => {

    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q);

    const matchesCategory =
      !cat || s.category === cat;

    const matchesEligibility =
      !elig || s.eligibilityTags.includes(elig);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesEligibility
    );
  });

  const catColors = {
    Education: '#4f46e5',
    'Financial Assistance': '#10b981',
    Entrepreneurship: '#f59e0b',
    'Health & Maternity': '#ef4444',
    'Safety & Protection': '#db2777',
    'Social Welfare': '#06b6d4',
    Housing: '#7c3aed'
  };

  const container = document.getElementById('womenSchemeList');

  if (!container) return;

  container.innerHTML = list.length
    ? list.map(s => {

        const c =
          catColors[s.category] || '#db2777';

        return `
          <div class="col-md-6 col-lg-4">
            <div class="scheme-card"
                 style="border-top-color:${c}">

              <div class="d-flex justify-content-between mb-2">
                <span class="badge rounded-pill"
                      style="background:${c};color:#fff">
                  ${s.category}
                </span>
              </div>

              <h6 class="fw-bold mb-1">
                ${s.name}
              </h6>

              <p class="small mb-3"
                 style="color:#64748b">
                ${s.desc}
              </p>

              <div class="d-flex gap-2 mt-2">

                <button
                  class="btn-grad-blue"
                  style="font-size:.78rem;padding:.3rem .75rem"
                  onclick="showWomenSchemeDetail(${s.id})">
                  View Details
                </button>

                ${
                  s.officialLink
                    ? `
                      <a
                        href="${s.officialLink}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-outline-success btn-sm">
                        Apply
                      </a>
                    `
                    : ''
                }

              </div>

            </div>
          </div>
        `;

      }).join('')

    : `
      <div class="col-12 text-center py-5"
           style="color:#94a3b8">
        No schemes found. Try different filters.
      </div>
    `;
}
function showWomenSchemeDetail(id) {

  const s =
    databaseWomenSchemes.find(
      x => x.id === id
    );

  if (!s) return;

  const catColors = {
    Education: '#4f46e5',
    'Financial Assistance': '#10b981',
    Entrepreneurship: '#f59e0b',
    'Health & Maternity': '#ef4444',
    'Safety & Protection': '#db2777',
    'Social Welfare': '#06b6d4',
    Housing: '#7c3aed'
  };

  const c =
    catColors[s.category] || '#db2777';

  document.getElementById(
    'detailModalTitle'
  ).textContent = s.name;

  document.getElementById(
    'detailModalBody'
  ).innerHTML = `

    <ul class="nav nav-tabs mb-3">

      <li class="nav-item">
        <button
          class="nav-link active"
          data-bs-toggle="tab"
          data-bs-target="#wsd1">
          Overview
        </button>
      </li>

      <li class="nav-item">
        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#wsd2">
          Eligibility
        </button>
      </li>

      <li class="nav-item">
        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#wsd3">
          Documents
        </button>
      </li>

      <li class="nav-item">
        <button
          class="nav-link"
          data-bs-toggle="tab"
          data-bs-target="#wsd4">
          How to Apply
        </button>
      </li>

    </ul>

    <div class="tab-content">

      <div
        class="tab-pane fade show active"
        id="wsd1">

        <span
          class="badge rounded-pill mb-2"
          style="background:${c};color:#fff">
          ${s.category}
        </span>

        <p>${s.desc}</p>

        <p class="fw-semibold mb-1">
          Benefits:
        </p>

        <ul>
          ${s.benefits
            .map(b => `<li>${b}</li>`)
            .join('')}
        </ul>

      </div>

      <div
        class="tab-pane fade"
        id="wsd2">

        <ul>
          ${s.eligibility
            .map(e => `<li>${e}</li>`)
            .join('')}
        </ul>

      </div>

      <div
        class="tab-pane fade"
        id="wsd3">

        <p class="fw-semibold mb-2">
          Required Documents:
        </p>

        <ul>
          ${s.docs
            .map(d => `<li>${d}</li>`)
            .join('')}
        </ul>

      </div>

      <div
        class="tab-pane fade"
        id="wsd4">

        <p>${s.applyInfo}</p>

        ${
          s.officialLink
            ? `
              <a
                href="${s.officialLink}"
                target="_blank"
                class="btn-grad-green">
                <i class="bi bi-box-arrow-up-right me-1"></i>
                Official Website
              </a>
            `
            : ''
        }

      </div>

    </div>
  `;

  new bootstrap.Modal(
    document.getElementById('detailModal')
  ).show();
}
let databaseEvidenceChecklists = [];
async function loadEvidenceChecklists() {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/evidence-checklists'
    );

    if (!response.ok) {
      throw new Error('Evidence checklist API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load evidence checklists'
      );
    }

    databaseEvidenceChecklists = data.checklists || [];

    renderEvidenceSituations();

  } catch (error) {
    console.error('Evidence checklist error:', error);

    const list = document.getElementById('evidenceSituationList');

    if (list) {
      list.innerHTML = `
        <div class="col-12 text-center py-4 text-danger">
          Unable to load evidence checklist.
        </div>
      `;
    }
  }
}
function renderEvidenceSituations() {
  const container = document.getElementById('evidenceSituationList');

  if (!container) return;

  const situations = [];

  databaseEvidenceChecklists.forEach(item => {
    if (!situations.some(s => s.situation_id === item.situation_id)) {
      situations.push({
        situation_id: item.situation_id,
        situation_title: item.situation_title,
        situation_icon: item.situation_icon,
        situation_color: item.situation_color
      });
    }
  });

  container.innerHTML = situations.map(s => `
    <div class="col-md-4 col-6">
      <div
        class="action-card"
        style="border-color:${s.situation_color}20;cursor:pointer"
        onclick="selectEvidenceSituation('${s.situation_id}')"
      >
        <div
          class="ac-icon"
          style="background:${s.situation_color}"
        >
          <i class="bi ${s.situation_icon}"></i>
        </div>

        <small class="fw-semibold">
          ${s.situation_title}
        </small>
      </div>
    </div>
  `).join('');
}
let currentEvidenceSituation = null;
function selectEvidenceSituation(id) {
  const items = databaseEvidenceChecklists.filter(
    item => item.situation_id === id
  );

  if (!items.length) return;

  const situation = items[0];

  currentEvidenceSituation = id;

  document.getElementById('evidenceSituationTitle').innerHTML = `
    <i
      class="bi ${situation.situation_icon} me-2"
      style="color:${situation.situation_color}"
    ></i>
    ${situation.situation_title}
  `;

  document
    .getElementById('evidenceChecklistArea')
    .classList.remove('d-none');

  const stored = gs('evidenceCheck_' + id, {});

  document.getElementById('evidenceItems').innerHTML =
    items.map((item, index) => `
      <div class="doc-check-item">
        <input
          class="form-check-input me-2"
          type="checkbox"
          id="ev_${id}_${index}"
          ${stored[index] ? 'checked' : ''}
          onchange="updateEvidenceCheck('${id}',${index},this.checked)"
        >

        <label
          class="small"
          for="ev_${id}_${index}"
        >
          ${item.evidence_item}
        </label>
      </div>
    `).join('');

  updateEvidenceProgress(id);
}
function updateEvidenceCheck(sitId, idx, checked) {
  const st = gs('evidenceCheck_' + sitId, {});
  st[idx] = checked; ss('evidenceCheck_' + sitId, st);
  updateEvidenceProgress(sitId);
}
function updateEvidenceProgress(sitId) {
  const items = databaseEvidenceChecklists.filter(
    item => item.situation_id === sitId
  );

  if (!items.length) return;

  const st = gs('evidenceCheck_' + sitId, {});

  const total = items.length;
  const done = Object.values(st).filter(Boolean).length;

  const pct = Math.round((done / total) * 100);

  const p = document.getElementById('evidenceProgress');
  const b = document.getElementById('evidenceProgBar');

  if (p) p.textContent = pct + '%';
  if (b) b.style.width = pct + '%';
}
let databaseLegalAid = [];

async function loadLegalAid() {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/legal-aid'
    );

    if (!response.ok) {
      throw new Error('Legal aid API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load legal aid data'
      );
    }

    databaseLegalAid = data.legal_aid || [];

    renderLegalAid();

  } catch (error) {
    console.error('Legal aid error:', error);

    const list = document.getElementById('legalAidList');

    if (list) {
      list.innerHTML = `
        <div class="col-12 text-center py-4 text-danger">
          Unable to load legal aid and helpline information.
        </div>
      `;
    }
  }
}
function renderLegalAid() {
  const container = document.getElementById('legalAidList');

  if (!container) return;

  container.innerHTML = databaseLegalAid.map(a => `
    <div class="col-md-6 col-lg-4">
      <div class="rights-card" style="border-left-color:${a.color}">
        
        <div class="d-flex gap-2 align-items-center mb-2">
          <div
            class="wc-icon"
            style="
              background:${a.color};
              width:44px;
              height:44px;
              font-size:1.2rem
            "
          >
            <i class="bi ${a.icon}"></i>
          </div>

          <h6 class="fw-bold mb-0">
            ${a.name}
          </h6>
        </div>

        <p class="small mb-1" style="color:#64748b">
          ${a.purpose}
        </p>

        <p class="small mb-1">
          <strong>Who can use:</strong>
          ${a.who_can_use}
        </p>

        <p class="small mb-2">
          <strong>Contact:</strong>
          <span style="color:${a.color};font-weight:600">
            ${a.contact}
          </span>
        </p>

        <p class="small mb-2">
          <strong>Website:</strong>
          ${
            a.website
              ? `
                <a
                  href="${a.website}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-decoration-none"
                  style="color:${a.color}"
                >
                  Visit official site
                </a>
              `
              : 'Not available'
          }
        </p>

        <p class="small mb-0" style="color:#64748b">
          ${a.description}
        </p>

      </div>
    </div>
  `).join('');
}
let databaseArticles = [];

async function loadAwarenessArticles() {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/awareness-articles'
    );

    if (!response.ok) {
      throw new Error('Awareness articles API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load awareness articles'
      );
    }

    databaseArticles = data.articles || [];

    fillArticleFilters();
    renderArticles();

  } catch (error) {
    console.error('Awareness articles error:', error);

    const list = document.getElementById('articleList');

    if (list) {
      list.innerHTML = `
        <div class="col-12 text-center py-5 text-danger">
          Unable to load awareness articles.
        </div>
      `;
    }
  }
}
function fillArticleFilters() {
  const cats = [
    ...new Set(
      databaseArticles.map(a => a.category)
    )
  ];

  const el = document.getElementById('articleCatFilter');

  if (el) {
    el.innerHTML =
      '<option value="">All Categories</option>' +
      cats.map(c => `<option>${c}</option>`).join('');
  }
}
function renderArticles() {
  const readerEl = document.getElementById('articleReader');
  if (readerEl) readerEl.classList.add('d-none');
  const q = ((document.getElementById('articleSearch') || {}).value || '').toLowerCase();
  const cat = (document.getElementById('articleCatFilter') || {}).value || '';
  const list = databaseArticles.filter(a =>
    (!cat || a.category === cat) &&
    (!q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.content.toLowerCase().includes(q))
  );
  const catColors = { 'Legal Rights':'#4f46e5', 'Workplace Rights':'#10b981', 'Family Rights':'#f59e0b', 'Cyber Safety':'#7c3aed', 'Women\'s Safety':'#db2777', 'Awareness & Prevention':'#06b6d4' };
  document.getElementById('articleList').innerHTML = list.length ? list.map(a => {
    const c = catColors[a.category] || '#db2777';
    return `<div class="col-md-6 col-lg-4">
      <div class="rights-card" style="border-left-color:${c};cursor:pointer" onclick="openArticle(${a.id})">
        <span class="badge rounded-pill mb-2" style="background:${c};color:#fff">${a.category}</span>
        <h6 class="fw-bold mb-1">${a.title}</h6>
        <p class="small mb-2" style="color:#64748b">${a.excerpt}</p>
        <p class="small mb-0" style="color:#94a3b8"><i class="bi bi-calendar me-1"></i>${a.date} · <i class="bi bi-person me-1"></i>${a.author}</p>
        <button class="btn btn-link btn-sm p-0 mt-1" style="color:${c}">Read more <i class="bi bi-arrow-right"></i></button>
      </div>
    </div>`;
  }).join('') : '<div class="col-12 text-center py-5" style="color:#94a3b8">No articles found.</div>';
}
function openArticle(id) {
  const a = databaseArticles.find(x => x.id === id); if (!a) return;
  const catColors = { 'Legal Rights':'#4f46e5', 'Workplace Rights':'#10b981', 'Family Rights':'#f59e0b', 'Cyber Safety':'#7c3aed', 'Women\'s Safety':'#db2777', 'Awareness & Prevention':'#06b6d4' };
  const c = catColors[a.category] || '#db2777';
  document.getElementById('articleList').classList.add('d-none');
  const readerEl = document.getElementById('articleReader');
  readerEl.classList.remove('d-none');
  document.getElementById('articleReaderContent').innerHTML = `
    <span class="badge rounded-pill mb-3" style="background:${c};color:#fff">${a.category}</span>
    <h4 class="fw-bold mb-2">${a.title}</h4>
    <p class="small mb-3" style="color:#94a3b8"><i class="bi bi-calendar me-1"></i>${a.date} · <i class="bi bi-person me-1"></i>${a.author}</p>
    <div style="line-height:1.8;color:#1e293b">${a.content.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
  readerEl.scrollIntoView({ behavior: 'smooth' });
}
function closeArticleReader() {
  document.getElementById('articleReader').classList.add('d-none');
  document.getElementById('articleList').classList.remove('d-none');
  document.getElementById('articleList').scrollIntoView({ behavior: 'smooth' });
}

/* ============ LEGAL DOC GENERATOR ============ */
let databaseDocTypes = [];
let selectedDocTemplate = null;

async function loadLegalDocumentTemplates() {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/legal-document-templates'
    );

    if (!response.ok) {
      throw new Error('Legal document templates API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load document templates'
      );
    }

    databaseDocTypes = data.templates || [];

    renderDocTypes();

  } catch (error) {
    console.error('Legal document templates error:', error);

    const container = document.getElementById('docTypes');

    if (container) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            Unable to load legal document templates.
          </div>
        </div>
      `;
    }
  }
}
async function loadSelectedDocTemplate() {
  if (!selectedDocType) {
    return false;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/legal-document-templates/${selectedDocType}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to load selected document template'
      );
    }

    selectedDocTemplate = data.template;
    return true;

  } catch (error) {
    console.error('Selected document template error:', error);
    selectedDocTemplate = null;
    toast('Unable to load document template.', 'error');
    return false;
  }
}
function renderDocTypes() {

  const container = document.getElementById('docTypes');

  if (!container) return;

  container.innerHTML = databaseDocTypes.map(d => `
    <div class="col-md-4">
      <div
        class="doc-type-card"
        id="dt_${d.id}"
        onclick="selectDocType('${d.id}')">

        <i
          class="bi ${d.icon} fs-2 mb-2 d-block"
          style="color:${d.color}">
        </i>

        <h6 class="fw-bold small">
          ${d.title}
        </h6>

      </div>
    </div>
  `).join('');

  updateDocStepLabels();
}
function selectDocType(id) {
  selectedDocType = id;
  document.querySelectorAll('.doc-type-card').forEach(c => c.classList.remove('selected'));
  const el = document.getElementById('dt_'+id); if (el) el.classList.add('selected');
}
function updateDocStepLabels() {
  const labels = ['Select Type','Personal Details','Complaint Details','Review','Preview','Download'];
  document.getElementById('docStepLabels').innerHTML = labels.map((l,i) => `
    <div style="color:${i+1===docStep?'#4f46e5':'#94a3b8'};font-weight:${i+1===docStep?700:400}">${i+1}. ${l}</div>`).join('');
  document.getElementById('docProgressBar').style.width = ((docStep/6)*100) + '%';
}
function docNext() {
  if (docStep === 1 && !selectedDocType) { toast('Please select a document type', 'warn'); return; }
  if (docStep < 6) {
    document.getElementById('docStep'+docStep).classList.add('d-none');
    docStep++;
    document.getElementById('docStep'+docStep).classList.remove('d-none');
    updateDocStepLabels();
    if (docStep === 4) renderDocReview();

if (docStep === 5) {
  loadSelectedDocTemplate().then(success => {
    if (success) {
      renderDocPreview();
    }
  });
}

if (docStep === 6) {
  renderSubmitGuide();
}
  }
  const nl = document.getElementById('docNextLabel');
  if (nl) nl.textContent = docStep >= 6 ? 'Restart' : 'Next';
  if (docStep >= 6) document.getElementById('docNextBtn').onclick = resetDocWizard;
} 
function docBack() {
  if (docStep > 1) {
    document.getElementById('docStep'+docStep).classList.add('d-none');
    docStep--;
    document.getElementById('docStep'+docStep).classList.remove('d-none');
    updateDocStepLabels();
    const nl = document.getElementById('docNextLabel'); if (nl) nl.textContent = 'Next';
    document.getElementById('docNextBtn').onclick = docNext;
  }
}
function g(id) { const el = document.getElementById(id); return el ? (el.value || '________________') : '________________'; }
function renderDocReview() {
  const dt = (databaseDocTypes.find(d => d.id === selectedDocType) || {}).title || 'Document';
  document.getElementById('docReview').innerHTML = [
    ['Document Type', dt],['Name', g('docName')],['Address', g('docAddress')],
    ['Contact', g('docContact')],['Email', g('docEmail')],['Date', g('docDate')],
    ['City', g('docCity')],['Subject', g('docSubject')],['Incident Date', g('docIncidentDate')],
    ['Details', g('docDetails')],['Extra Info', g('docExtra')],
  ].map(([k,v]) => `<div class="review-row"><strong>${k}:</strong> ${v}</div>`).join('');
}
function renderDocPreview() {
  if (!selectedDocTemplate) {
    toast('Document template is not loaded.', 'error');
    return;
  }

  const dt = selectedDocTemplate.title || 'Complaint Letter';

  let content = selectedDocTemplate.template_content || '';

  content = content
    .replace(/\{date\}/g, g('docDate'))
    .replace(/\{name\}/g, g('docName'))
    .replace(/\{address\}/g, g('docAddress'))
    .replace(/\{contact\}/g, g('docContact'))
    .replace(/\{email\}/g, g('docEmail'))
    .replace(/\{city\}/g, g('docCity'))
    .replace(/\{subject\}/g, g('docSubject'))
    .replace(/\{incident_date\}/g, g('docIncidentDate'))
    .replace(/\{details\}/g, g('docDetails'))
    .replace(/\{extra\}/g, g('docExtra'));

  docContent = content;

  document.getElementById('docPreview').innerHTML = `
    <div style="white-space:pre-line; line-height:1.8; color:#1e293b;">
      ${content}
    </div>
  `;
}
function renderSubmitGuide() {
  if (!selectedDocTemplate) {
    toast('Document template is not loaded.', 'error');
    return;
  }

  const submissionPlace =
    selectedDocTemplate.submission_place || 'Not specified';

  const requiredDocuments =
    selectedDocTemplate.required_documents
      ? selectedDocTemplate.required_documents
          .split('|')
          .map(item => item.trim())
          .filter(Boolean)
      : [];

  const nextSteps =
    selectedDocTemplate.next_steps
      ? selectedDocTemplate.next_steps
          .split('|')
          .map(item => item.trim())
          .filter(Boolean)
      : [];

  const checklistItems =
    selectedDocTemplate.checklist_items
      ? selectedDocTemplate.checklist_items
          .split('|')
          .map(item => item.trim())
          .filter(Boolean)
      : [];

  document.getElementById('docSubmitGuide').innerHTML = `
    <div class="card-box">

      <h6 class="fw-bold mb-2">
        <i class="bi bi-geo-alt-fill text-primary me-2"></i>
        Where to Submit
      </h6>

      <p class="small">
        ${submissionPlace}
      </p>

      <h6 class="fw-bold mb-2">
        <i class="bi bi-folder-check text-success me-2"></i>
        Required Documents
      </h6>

      ${
        requiredDocuments.length
          ? `
            <ul class="small">
              ${requiredDocuments.map(item => `
                <li>${item}</li>
              `).join('')}
            </ul>
          `
          : '<p class="small text-muted">No specific documents listed.</p>'
      }

      <h6 class="fw-bold mb-2">
        <i class="bi bi-list-check text-warning me-2"></i>
        Next Steps
      </h6>

      ${
        nextSteps.length
          ? `
            <ul class="small">
              ${nextSteps.map(item => `
                <li>${item}</li>
              `).join('')}
            </ul>
          `
          : '<p class="small text-muted">No specific next steps listed.</p>'
      }

      <h6 class="fw-bold mb-2">
        Submission Checklist
      </h6>

      ${
        checklistItems.length
          ? checklistItems.map((item, index) => `
              <div class="doc-check-item">
                <input
                  type="checkbox"
                  class="form-check-input me-2"
                  id="docChecklist_${index}"
                >
                <label
                  class="small"
                  for="docChecklist_${index}"
                >
                  ${item}
                </label>
              </div>
            `).join('')
          : '<p class="small text-muted">No checklist items available.</p>'
      }

    </div>
  `;
}
function downloadDoc() {
  const blob = new Blob([docContent], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'complaint_letter.txt'; a.click();
  toast('Document downloaded!');
}
function printDoc() {
  if (!docContent) {
    toast('Please generate the document first.', 'warn');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=800,height=900');

  if (!printWindow) {
    toast('Please allow pop-ups to print the document.', 'warn');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Legal Document</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          line-height: 1.7;
          color: #000;
          white-space: pre-line;
        }

        h2 {
          text-align: center;
          margin-bottom: 30px;
        }

        .document-content {
          white-space: pre-line;
        }

        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>

    <body>
      <h2>${selectedDocTemplate?.title || 'Legal Document'}</h2>

      <div class="document-content">
        ${docContent}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}
async function saveDoc() {
  if (!requireAuth('Please login to save documents.')) return;

  if (!selectedDocType || !docContent) {
    toast('Please generate the document first.', 'warn');
    return;
  }

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/legal-documents/save',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          document_type: selectedDocType,
          document_content: docContent
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to save document'
      );
    }

    toast('Document saved successfully!');

    await renderSavedDocs();

    if (currentUser) {
      renderDashboard();
    }

  } catch (error) {
    console.error('Save document error:', error);
    toast('Unable to save document.', 'error');
  }
}
async function renderSavedDocs() {
  const container = document.getElementById('savedDocsList');

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="col-12 text-center py-4" style="color:#94a3b8">
        Please login to view your saved documents.
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/legal-documents/${currentUser.id}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load saved documents');
    }

    const docs = data.documents || [];

    container.innerHTML = docs.length
      ? docs.map(d => `
        <div class="col-md-4">
          <div class="card-box text-center">
            <i class="bi bi-file-earmark-text fs-2 mb-2 d-block"
               style="color:#4f46e5"></i>

            <h6 class="fw-bold small">
              ${d.title}
            </h6>

            <small style="color:#94a3b8">
              ${d.saved_at
                ? new Date(d.saved_at).toLocaleDateString('en-IN')
                : ''}
            </small>

            <div class="d-flex justify-content-center gap-2 mt-2">
              <button
                class="btn btn-outline-primary btn-sm"
                onclick="downloadSavedDoc('${d.id}')">
                <i class="bi bi-download"></i>
              </button>

              <button
                class="btn btn-outline-danger btn-sm"
                onclick="deleteSavedDoc('${d.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('')
      : `
        <div class="col-12 text-center py-4" style="color:#94a3b8">
          No saved documents yet.
        </div>
      `;

  } catch (error) {
    console.error('Load saved documents error:', error);

    container.innerHTML = `
      <div class="col-12 text-center py-4 text-danger">
        Unable to load saved documents.
      </div>
    `;
  }
}
async function downloadSavedDoc(documentId) {
  if (!requireAuth('Please login to download saved documents.')) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/legal-documents/${documentId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to download document'
      );
    }

    const savedDoc = data.document;

    const blob = new Blob(
      [savedDoc.document_content],
      { type: 'text/plain' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${savedDoc.title || 'legal_document'}.txt`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    toast('Document downloaded successfully!');

  } catch (error) {
    console.error('Download saved document error:', error);
    toast('Unable to download document.', 'error');
  }
}
async function deleteSavedDoc(documentId) {
  if (!requireAuth('Please login to manage saved documents.')) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/legal-documents/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: currentUser.id
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to delete document'
      );
    }

    toast('Document deleted successfully!');

    await renderSavedDocs();

    if (currentUser) {
      renderDashboard();
    }

  } catch (error) {
    console.error('Delete saved document error:', error);
    toast('Unable to delete document.', 'error');
  }
}
function resetDocWizard() {
  docStep = 1; selectedDocType = null; docContent = '';
  for (let i = 1; i <= 6; i++) document.getElementById('docStep'+i).classList.toggle('d-none', i !== 1);
  updateDocStepLabels();
  const nl = document.getElementById('docNextLabel'); if (nl) nl.textContent = 'Next';
  document.getElementById('docNextBtn').onclick = docNext;
  document.querySelectorAll('.doc-type-card').forEach(c => c.classList.remove('selected'));
}

/* ============ AUTH ============ */
function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.querySelector('i').className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
}
function showForgot() { document.getElementById('forgotBox').classList.toggle('d-none'); }

// forget pasword
async function sendReset() {
  const email = document.getElementById('forgotEmail').value.trim();

  const newPassword =
    document.getElementById('forgotNewPassword').value;

  const confirmPassword =
    document.getElementById('forgotConfirmPassword').value;

  // Check email
  if (!email) {
    toast('Enter your registered email', 'warn');
    return;
  }

  // Check password
  if (!newPassword) {
    toast('Enter a new password', 'warn');
    return;
  }

  // Password length
  if (newPassword.length < 6) {
    toast('Password must be at least 6 characters', 'warn');
    return;
  }

  // Confirm password
  if (newPassword !== confirmPassword) {
    toast('Passwords do not match', 'error');
    return;
  }

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/forgot-password',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          new_password: newPassword
        })
      }
    );

    const data = await response.json();

    console.log('Forgot password response:', data);

    if (data.success) {

      toast('Password reset successfully!');

      // Clear fields
      document.getElementById('forgotEmail').value = '';
      document.getElementById('forgotNewPassword').value = '';
      document.getElementById('forgotConfirmPassword').value = '';

      // Hide reset box
      document.getElementById('forgotBox').classList.add('d-none');

    } else {

      toast(
        data.message || 'Password reset failed',
        'error'
      );
    }

  } catch (error) {

    console.error('Forgot password error:', error);

    toast(
      'Cannot connect to the server. Make sure Flask is running.',
      'error'
    );
  }
}

function fillDemoLogin(email, pwd) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pwd;
}

// citizen - worker login
async function doLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const pwd = document.getElementById('loginPassword').value;

  if (!email || !pwd) {
    toast('Enter email/mobile number and password', 'warn');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_or_mobile: email,
        password: pwd
      })
    });

    const result = await response.json();

    if (result.success) {

      const user = result.user;

      currentUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        type: user.role === 'worker' ? 'Skilled Worker' : 'Citizen',
        location: user.location || '',
        mobile: user.phone || '',
        photo: user.profile_photo || '',
        preferredLanguage: user.preferred_language || ''
      };

      // Add worker-specific information
      if (user.role === 'worker') {
        currentUser.area = user.area || '';
        currentUser.skill = user.skill || '';
        currentUser.skills = user.skills || '';
        currentUser.experience = user.experience || 0;
        currentUser.languages = user.languages || '';
        currentUser.services = user.services || '';
        currentUser.about = user.about || '';
        currentUser.availability = user.availability || '';
        currentUser.charges = user.charges || '';
        currentUser.certifications = user.certifications || '';
        currentUser.history = user.history || '';
      }

      ss('currentUser', currentUser);
      loadSavedSchemes(); 
      updateAuthUI();
      renderNotifications();

      toast('Welcome back, ' + currentUser.name + '!');

      if (currentUser.role === 'admin') {
        showSection('admin');
      } else {
        showSection('dashboard');
      }

    } else {
      toast(result.message || 'Invalid login details', 'error');
    }

  } catch (error) {
    console.error('Login error:', error);
    toast('Unable to connect to the server', 'error');
  }
}

// citizen - signup
async function doCitizenSignup(e) {
  e.preventDefault();

  const pwd = document.getElementById('csPassword').value;
  const conf = document.getElementById('csConfirm').value;

  // Check passwords
  if (pwd !== conf) {
    toast('Passwords do not match', 'error');
    return;
  }

  if (pwd.length < 6) {
    toast('Password must be at least 6 characters', 'warn');
    return;
  }

  // Collect signup data
  const user = {
  full_name: document.getElementById('csName').value.trim(),
  email: document.getElementById('csEmail').value.trim(),
  phone: document.getElementById('csMobile').value.trim(),
  password: pwd,
  profile_photo: document.querySelector('#csPhotoPreview img')?.src || '',
  location: document.getElementById('csLocation').value,
  preferred_language: document.getElementById('csLang').value
};
  try {
    const response = await fetch('http://127.0.0.1:5000/api/citizen/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    });

    const data = await response.json();
if (data.success) {
  toast('Account created successfully!');

  currentUser = {
    name: user.full_name,
    email: user.email,
    role: 'citizen',
    type: 'Citizen',
    location: user.location || '',
    mobile: user.phone || '',
    photo: user.profile_photo || '',
    preferred_language: user.preferred_language || ''
  };

  console.log('Signup currentUser:', currentUser);

  ss('currentUser', currentUser);

  updateAuthUI();

  showSection('dashboard');
} else {
      toast(data.message || 'Signup failed', 'error');
    }

  } catch (error) {
    console.error('Signup error:', error);
    toast('Cannot connect to the server. Make sure Flask is running.', 'error');
  }
}
// worker - signup
async function doWorkerSignup(e) {
  e.preventDefault();

  const pwd = document.getElementById('wsPassword').value;
  const conf = document.getElementById('wsConfirm').value;

  if (pwd !== conf) {
    toast('Passwords do not match', 'error');
    return;
  }

  if (pwd.length < 6) {
    toast('Password must be at least 6 characters', 'warn');
    return;
  }

  const photoPreview = document.getElementById('wsPhotoPreview');
  let profilePhoto = '';

  if (photoPreview && photoPreview.querySelector('img')) {
    profilePhoto = photoPreview.querySelector('img').src;
  }

  // Get selected work images
  const portfolioInput = document.getElementById('wsPortfolio');

  const portfolioFiles =
    portfolioInput ? portfolioInput.files : [];


  // Create FormData
  const formData = new FormData();

  formData.append(
    'full_name',
    document.getElementById('wsName').value.trim()
  );

  formData.append(
    'email',
    document.getElementById('wsEmail').value.trim()
  );

  formData.append(
    'phone',
    document.getElementById('wsMobile').value.trim()
  );

  formData.append('password', pwd);

  formData.append('profile_photo', profilePhoto);

  formData.append(
    'location',
    document.getElementById('wsLocation').value.trim()
  );

  formData.append(
    'area',
    document.getElementById('wsArea').value.trim()
  );

  formData.append(
    'primary_skill',
    document.getElementById('wsSkill').value
  );

  formData.append(
    'other_skills',
    document.getElementById('wsSkills').value.trim()
  );

  formData.append(
    'experience_years',
    document.getElementById('wsExp').value || 0
  );

  formData.append(
    'languages',
    document.getElementById('wsLangs').value.trim()
  );

  formData.append(
    'services_offered',
    document.getElementById('wsServices').value.trim()
  );

  formData.append(
    'about',
    document.getElementById('wsAbout').value.trim()
  );

  formData.append(
    'availability',
    document.getElementById('wsAvail').value
  );

  formData.append(
    'charges',
    document.getElementById('wsCharges').value.trim()
  );

  formData.append(
    'certifications',
    document.getElementById('wsCerts').value.trim()
  );

  formData.append(
    'previous_work_experience',
    document.getElementById('wsHistory').value.trim()
  );


  // Add all selected portfolio images
  for (let i = 0; i < portfolioFiles.length; i++) {

    formData.append(
      'portfolio',
      portfolioFiles[i]
    );

  }


  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/worker/signup',
      {
        method: 'POST',
        body: formData
      }
    );

    const result = await response.json();


    if (result.success) {

      currentUser = {
        id: result.user_id,

        name: formData.get('full_name'),
        email: formData.get('email'),
        role: 'worker',
        type: 'Skilled Worker',
        location: formData.get('location'),
        mobile: formData.get('phone'),
        skill: formData.get('primary_skill'),
        experience: formData.get('experience_years'),
        charges: formData.get('charges'),
        availability: formData.get('availability'),
        photo: profilePhoto
      };

      ss('currentUser', currentUser);

      updateAuthUI();

      toast(
        'Worker account created! Welcome, ' +
        currentUser.name
      );

      showSection('dashboard');

    } else {

      toast(
        result.message ||
        'Worker registration failed',
        'error'
      );

    }

  } catch (error) {

    console.error(
      'Worker signup error:',
      error
    );

    toast(
      'Unable to connect to the server',
      'error'
    );
  }
}
function doLogout() {

  currentUser = null;

  localStorage.removeItem('currentUser');

  const badge = document.getElementById('notifBadge');
  const dropdown = document.getElementById('notifDropdown');

  if (badge) {
  badge.textContent = '';
  badge.style.display = 'none';
}
  if (dropdown) {
    dropdown.innerHTML = `
      <div class="p-3 text-center text-muted small">
        Please login to view notifications.
      </div>
    `;
  }

  updateAuthUI();

  toast('Logged out successfully');

  showSection('home');
}

function updateAuthUI() {
  updateNavForRole();
}

/* ============ SIGNUP CHOICE ============ */
function showSignupChoice() {
  document.getElementById('signupChoice').classList.remove('d-none');
  document.getElementById('citizenSignup').classList.add('d-none');
  document.getElementById('workerSignup').classList.add('d-none');
}
function showCitizenSignup() {
  document.getElementById('signupChoice').classList.add('d-none');
  document.getElementById('citizenSignup').classList.remove('d-none');
  document.getElementById('workerSignup').classList.add('d-none');
}
function showWorkerSignup() {
  document.getElementById('signupChoice').classList.add('d-none');
  document.getElementById('citizenSignup').classList.add('d-none');
  document.getElementById('workerSignup').classList.remove('d-none');
}
// feedback 
function openFeedbackModal() {
  if (!currentUser || !currentUser.id) {
    toast('Please login first', 'warn');
    return;
  }

  document.getElementById('feedbackSubject').value = '';
  document.getElementById('feedbackMessage').value = '';

  const modal = new bootstrap.Modal(
    document.getElementById('feedbackModal')
  );

  modal.show();
}
// save feedback in db
async function submitFeedback() {
  if (!currentUser || !currentUser.id) {
    toast('Please login first', 'warn');
    return;
  }

  const subject = document.getElementById('feedbackSubject').value.trim();
  const message = document.getElementById('feedbackMessage').value.trim();

  if (!subject || !message) {
    toast('Please enter subject and message', 'warn');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        subject: subject,
        message: message
      })
    });

    const data = await response.json();

    if (data.success) {
      const modalElement = document.getElementById('feedbackModal');
      const modal = bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      document.getElementById('feedbackSubject').value = '';
      document.getElementById('feedbackMessage').value = '';

      toast('Feedback submitted successfully');
    } else {
      toast(data.message || 'Unable to submit feedback', 'error');
    }

  } catch (error) {
    console.error('Feedback submission error:', error);
    toast('Unable to connect to the server', 'error');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('submitFeedbackBtn');

  if (submitBtn) {
    submitBtn.addEventListener('click', submitFeedback);
  }
});
/* ============ CITIZEN DASHBOARD ============ */
/* Load citizen's service requests from MySQL */
async function loadCitizenDashboardRequests() {
  if (!currentUser || !currentUser.id) {
    return [];
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/service-requests/citizen/${currentUser.id}`
    );

    if (!response.ok) {
      throw new Error('Citizen service requests API failed');
    }

    const data = await response.json();

    if (!data.success) {
      console.error(
        'Failed to load citizen service requests:',
        data.message
      );
      return [];
    }

    return data.requests || [];

  } catch (error) {
    console.error('Citizen dashboard requests error:', error);
    return [];
  }
}

async function renderCitizenDashboard() {

  const content = document.getElementById('dashboardContent');
  const header = document.getElementById('dashboardHeader');

  if (!content || !currentUser) return;


  /* ---------- Header ---------- */

  header.innerHTML = `
    <div class="sec-header dash-header">
      <div class="container py-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h1 class="fw-bold mb-1 text-white">
            <i class="bi bi-speedometer2 me-2"></i>
            Citizen Dashboard
          </h1>

          <p class="mb-0 text-white" style="opacity:.85">
            Welcome back, ${currentUser.name || 'Citizen'}!
          </p>
        </div>

        <span class="role-badge citizen" style="font-size:.85rem">
          <i class="bi bi-people-fill me-1"></i>
          Citizen
        </span>
      </div>
    </div>
  `;


  /* ---------- Load dashboard data ---------- */

  let requests = [];
let savedWorkers = [];
let reviews = [];
let feedback = [];

try {

  const [
    requestResponse,
    savedResponse,
    reviewResponse,
    feedbackResponse
  ] = await Promise.all([
    fetch(
      `http://127.0.0.1:5000/api/service-requests/citizen/${currentUser.id}`
    ),
    fetch(
      `http://127.0.0.1:5000/api/saved-workers/${currentUser.id}`
    ),
    fetch(
      `http://127.0.0.1:5000/api/reviews/citizen/${currentUser.id}`
    ),
    fetch(
      `http://127.0.0.1:5000/api/feedback/${currentUser.id}`
    )
  ]);

  const requestData = await requestResponse.json();
  const savedData = await savedResponse.json();
  const reviewData = await reviewResponse.json();
  const feedbackData = await feedbackResponse.json();

  if (requestData.success) {
    requests = requestData.requests || [];
  }

  if (savedData.success) {
    savedWorkers = savedData.workers || [];
  }

  if (reviewData.success) {
    reviews = reviewData.reviews || [];
  }

  if (feedbackData.success) {
    feedback = feedbackData.feedback || [];
  }

} catch (error) {
  console.error('Citizen dashboard loading error:', error);
}

  /* ---------- Recent Viewed ---------- */

  const recentIds = gs('recentViewedWorkers', []);

  const recentWorkers = recentIds
    .map(id =>
      databaseWorkers.find(w => Number(w.id) === Number(id))
    )
    .filter(Boolean);


  /* ---------- Bookings ---------- */

  const bookings = requests.filter(r => {

    const status = String(r.status || '').toLowerCase();

    return (
      status === 'accepted' ||
      status === 'scheduled' ||
      status === 'completed'
    );
  });


  /* ---------- Relevant Government Schemes ---------- */

  let schemes = Array.isArray(databaseMainSchemes)
    ? databaseMainSchemes.filter(s =>
        String(s.status || 'Active').toLowerCase() === 'active'
      )
    : [];

  const citizenLocation =
    String(currentUser.location || '').toLowerCase();

  const relevantSchemes = schemes
    .filter(s => {

      const state = String(s.state || '').toLowerCase();

      return (
        state === 'all' ||
        !state ||
        citizenLocation.includes(state) ||
        state.includes(citizenLocation)
      );

    })
    .slice(0, 3);


  /* ---------- Statistics ---------- */

  const stats = [
    {
      n: requests.length,
      l: 'Service Requests',
      c: '#4f46e5',
      i: 'bi-diagram-3'
    },
    {
      n: bookings.length,
      l: 'Bookings',
      c: '#10b981',
      i: 'bi-calendar-check-fill'
    },
    {
      n: savedWorkers.length,
      l: 'Saved Workers',
      c: '#f59e0b',
      i: 'bi-person-badge'
    },
    {
      n: Math.min(recentWorkers.length, 3),
      l: 'Recently Viewed',
      c: '#06b6d4',
      i: 'bi-eye-fill'
    }
  ];


  /* ---------- Dashboard ---------- */

  content.innerHTML = `

    <!-- Profile + Statistics -->

    <div class="row g-3 mb-3">

      <div class="col-md-4">

        <div class="card-box text-center h-100">

          ${
            currentUser.photo
            ? `
              <img
                src="${currentUser.photo}"
                style="
                  width:72px;
                  height:72px;
                  border-radius:50%;
                  object-fit:cover;
                  border:3px solid #4f46e5;
                  margin-bottom:.8rem;
                "
              >
            `
            : `
              <div style="
                width:72px;
                height:72px;
                border-radius:50%;
                background:linear-gradient(135deg,#4f46e5,#06b6d4);
                color:#fff;
                font-size:2rem;
                display:flex;
                align-items:center;
                justify-content:center;
                margin:0 auto .8rem;
              ">
                <i class="bi bi-person-fill"></i>
              </div>
            `
          }

          <h5 class="fw-bold">
            ${currentUser.name || 'Citizen'}
          </h5>

          <p class="text-muted small mb-1">
            ${currentUser.email || ''}
          </p>

          <p class="text-muted small mb-1">
            ${currentUser.location || ''}
          </p>

          <span class="role-badge citizen">
            <i class="bi bi-people-fill me-1"></i>
            Citizen
          </span>

        </div>

      </div>


      <div class="col-md-8">

        <div class="row g-3">

          ${stats.map(s => `
            <div class="col-6 col-md-3">

              <div class="dash-stat">

                <i
                  class="bi ${s.i} fs-4 mb-1 d-block"
                  style="color:${s.c}"
                ></i>

                <div
                  class="ds-num"
                  style="color:${s.c}"
                >
                  ${s.n}
                </div>

                <div class="ds-lbl">
                  ${s.l}
                </div>

              </div>

            </div>
          `).join('')}

        </div>

      </div>

    </div>


    <!-- Quick Actions -->

    <div class="row g-3 mb-3">

      <div class="col-12">

        <div class="card-box">

          <h6 class="fw-bold mb-3">
            <i class="bi bi-lightning-fill text-warning me-2"></i>
            Quick Actions
          </h6>

          <div class="d-flex flex-wrap gap-2">

            <button
              class="btn-grad-blue"
              onclick="showSection('jobs')"
            >
              <i class="bi bi-briefcase-fill me-1"></i>
              Find Workers
            </button>

            <button
              class="btn-grad-green"
              onclick="showSection('schemes')"
            >
              <i class="bi bi-bank2 me-1"></i>
              Find Schemes
            </button>

            <button
              class="btn-grad-orange"
              onclick="showLegalDocs()"
            >
              <i class="bi bi-file-earmark-text me-1"></i>
              Get Guidance
            </button>

            <button
  type="button"
  class="btn"
  onclick="showSection('women')"
  style="background: linear-gradient(135deg, #ec4899, #d946ef); color: white; border: none;"
>
  <i class="bi bi-shield-check me-1"></i>
  Women &amp; Rights
</button>
           <button
  type="button"
  class="btn"
  onclick="openFeedbackModal()"
  style="background: linear-gradient(135deg, #6366f1, #7c3aed); color: white; border: none;"
>
  <i class="bi bi-chat-dots me-1"></i>
  Send Feedback
</button>

          </div>

        </div>

      </div>

    </div>


    <!-- Dashboard Cards -->

    <div class="row g-3">


      <!-- Recent Requests -->

      <div class="col-md-6">

        <div class="card-box h-100">

          <h6 class="fw-bold mb-2">
            <i class="bi bi-diagram-3 text-primary me-2"></i>
            Recent Service Requests
          </h6>

          ${
            requests.length
            ? requests.slice(0, 3).map(r => `
              
              <div class="small mb-2 pb-2 border-bottom">

                <div class="fw-semibold">
                  ${r.worker_name || 'Worker'}
                </div>

                <div>
                  ${r.service_type || 'Service'}
                </div>

                <span class="badge rounded-pill mt-1"
                  style="
                    background:#4f46e5;
                    color:#fff;
                    font-size:.65rem;
                  ">
                  ${r.status || 'Pending'}
                </span>

              </div>

            `).join('')
            : `
              <p class="small text-muted mb-0">
                No service requests yet.
              </p>
            `
          }

        </div>

      </div>


      <!-- Bookings -->

      <div class="col-md-6">

        <div class="card-box h-100">

          <h6 class="fw-bold mb-2">
            <i class="bi bi-calendar-check-fill text-success me-2"></i>
            Bookings
          </h6>

          ${
            bookings.length
            ? bookings.slice(0, 3).map(r => `
              
              <div class="small mb-2 pb-2 border-bottom">

                <div class="fw-semibold">
                  ${r.worker_name || 'Worker'}
                </div>

                <div>
                  ${r.service_type || 'Service'}
                </div>

                <div class="text-muted">
                  ${r.request_date || ''}
                  ${r.request_time || ''}
                </div>

                <span class="badge rounded-pill mt-1"
                  style="
                    background:#10b981;
                    color:#fff;
                    font-size:.65rem;
                  ">
                  ${r.status}
                </span>

              </div>

            `).join('')
            : `
              <p class="small text-muted mb-0">
                No active bookings.
              </p>
            `
          }

        </div>

      </div>


      <!-- Saved Workers -->

      <div class="col-md-6">

        <div class="card-box h-100">

          <h6 class="fw-bold mb-2">
            <i class="bi bi-person-badge text-warning me-2"></i>
            Saved Workers
          </h6>

          ${
            savedWorkers.length
            ? savedWorkers.slice(0, 3).map(w => `
              
              <div class="small mb-2 pb-2 border-bottom">

                <strong>${w.name}</strong>
                <span class="text-muted">
                  (${w.skill || 'Worker'})
                </span>

                <button
                  class="btn btn-link btn-sm p-0 ms-1"
                  onclick="showWorkerDetail(${w.id})"
                >
                  View
                </button>

              </div>

            `).join('')
            : `
              <p class="small text-muted mb-0">
                No saved workers yet.
              </p>
            `
          }

        </div>

      </div>


      <!-- My Reviews -->

      <div class="col-md-6">

        <div class="card-box h-100">

          <h6 class="fw-bold mb-2">
            <i class="bi bi-star-fill text-warning me-2"></i>
            My Reviews
          </h6>

          ${
            reviews.length
            ? reviews.slice(0, 3).map(r => {

                const rating = Number(r.rating || 0);

                return `
                  <div class="small mb-2 pb-2 border-bottom">

                    <strong>
                      ${r.worker_name || 'Worker'}
                    </strong>

                    <div class="stars">
                      ${'★'.repeat(rating)}
                      ${'☆'.repeat(5 - rating)}
                    </div>

                    ${
                      r.review_text
                      ? `<div class="text-muted">
                           ${r.review_text}
                         </div>`
                      : ''
                    }

                  </div>
                `;

              }).join('')
            : `
              <p class="small text-muted mb-0">
                You have not written any reviews yet.
              </p>
            `
          }

        </div>

      </div>
<!-- My Feedback -->

<div class="col-md-6">

  <div class="card-box h-100">

    <h6 class="fw-bold mb-2">
      <i class="bi bi-chat-dots-fill text-primary me-2"></i>
      My Feedback
    </h6>

    ${
      feedback.length
      ? feedback.slice(0, 3).map(f => {

          let history = f.reply_history || [];

          if (typeof history === 'string') {
            try {
              history = JSON.parse(history);
            } catch (error) {
              history = [];
            }
          }

          if (!Array.isArray(history)) {
            history = [];
          }

          const statusClass =
            f.status === 'REPLIED'
              ? 'bg-success'
              : f.status === 'READ'
                ? 'bg-secondary'
                : 'bg-danger';

          return `
            <div class="small mb-3 pb-2 border-bottom">

              <div class="d-flex justify-content-between align-items-start">

                <strong>
                  ${f.subject || 'No Subject'}
                </strong>

                <span
                  class="badge ${statusClass}"
                  style="font-size:.6rem"
                >
                  ${f.status || 'NEW'}
                </span>

              </div>

              <div class="text-muted mt-1">
                ${f.message || ''}
              </div>

              ${
                history.length
                ? `
                  <div
                    class="mt-2 p-2 rounded"
                    style="background:#f0fdf4;"
                  >

                    <div class="fw-semibold text-success mb-2">
                      <i class="bi bi-reply-fill me-1"></i>
                      Admin Replies
                    </div>

                    ${
                      history.map((item, index) => `
                        <div
                          class="${index < history.length - 1 ? 'border-bottom pb-2 mb-2' : ''}"
                        >

                          <div class="small">
                            ${item.reply || ''}
                          </div>

                          ${
                            item.replied_at
                            ? `
                              <div
                                class="text-muted mt-1"
                                style="font-size:.65rem;"
                              >
                                ${new Date(
                                  item.replied_at
                                ).toLocaleString()}
                              </div>
                            `
                            : ''
                          }

                        </div>
                      `).join('')
                    }

                  </div>
                `
                : `
                  <div
                    class="text-muted mt-1"
                    style="font-size:.7rem;"
                  >
                    No admin reply yet.
                  </div>
                `
              }

              ${
                f.created_at
                ? `
                  <div
                    class="text-muted mt-1"
                    style="font-size:.65rem;"
                  >
                    ${new Date(
                      f.created_at
                    ).toLocaleDateString()}
                  </div>
                `
                : ''
              }

            </div>
          `;

        }).join('')
      : `
        <p class="small text-muted mb-0">
          You have not sent any feedback yet.
        </p>
      `
    }

  </div>

</div>

      <!-- Government Schemes -->

      <div class="col-md-6">

        <div class="card-box h-100">

          <h6 class="fw-bold mb-2">
            <i class="bi bi-bank2 text-info me-2"></i>
            Recommended Government Schemes
          </h6>

          ${
            relevantSchemes.length
            ? relevantSchemes.map(s => `
              
              <div class="small mb-2 pb-2 border-bottom">

                <strong>
                  ${s.name}
                </strong>

                <button
                  class="btn btn-link btn-sm p-0 ms-1"
                  onclick="showSection('schemes')"
                >
                  View
                </button>

              </div>

            `).join('')
            : `
              <p class="small text-muted mb-0">
                No recommended schemes available.
              </p>
            `
          }

        </div>

      </div>


      <!-- Recently Viewed -->

      <div class="col-md-6">

        <div class="card-box h-100">

          <h6 class="fw-bold mb-2">
            <i class="bi bi-eye-fill text-primary me-2"></i>
            Recently Viewed Workers
          </h6>

          ${
            recentWorkers.length
            ? recentWorkers.slice(0, 3).map(w => `
              
              <div class="small mb-2 pb-2 border-bottom">

                <strong>${w.name}</strong>

                <span class="text-muted">
                  (${w.skill || 'Worker'})
                </span>

                <button
                  class="btn btn-link btn-sm p-0 ms-1"
                  onclick="showWorkerDetail(${w.id})"
                >
                  View
                </button>

              </div>

            `).join('')
            : `
              <p class="small text-muted mb-0">
                No recently viewed workers.
              </p>
            `
          }

        </div>

      </div>

    </div>
  `;
}
/* ============ WORKER DASHBOARD ============ */
/* ============ WORKER DASHBOARD ============ */
async function renderWorkerDashboard() {
  if (!currentUser) {
    showSection('login');
    toast('Please login first', 'warn');
    return;
  }

  try {
    /* ---------- Get Worker Dashboard Data ---------- */
    const response = await fetch(
      `http://127.0.0.1:5000/api/worker/dashboard/${currentUser.id}`
    );

    const data = await response.json();

    if (!data.success) {
      toast('Failed to load dashboard data', 'error');
      return;
    }

    const stats = data.stats;
    const recentRequests = data.recent_requests || [];
    const reviews = data.reviews || [];

    /* ---------- Get Worker Feedback ---------- */
    let feedback = [];

    try {
      const feedbackResponse = await fetch(
        `http://127.0.0.1:5000/api/feedback/${currentUser.id}`
      );

      const feedbackData = await feedbackResponse.json();

      if (feedbackData.success) {
        feedback = feedbackData.feedback || [];
      }
    } catch (feedbackError) {
      console.error('Worker feedback loading error:', feedbackError);
    }

    /* ---------- Dashboard Header ---------- */
    document.getElementById('dashboardHeader').innerHTML = `
      <div class="sec-header worker-dash-header">
        <div class="container py-4 d-flex flex-wrap
                    justify-content-between align-items-center gap-2">

          <div>
            <h1 class="fw-bold mb-1 text-white">
              <i class="bi bi-tools me-2"></i>
              Worker Dashboard
            </h1>

            <p class="mb-0 text-white" style="opacity:.85">
              Welcome back, ${currentUser.name || 'Worker'}!
            </p>
          </div>

          <span class="role-badge worker"
                style="font-size:.85rem">
            <i class="bi bi-tools me-1"></i>
            Skilled Worker
          </span>

        </div>
      </div>
    `;

    /* ---------- Recent Requests HTML ---------- */
    let recentRequestsHTML = '';

    if (recentRequests.length === 0) {

      recentRequestsHTML = `
        <p class="text-muted mb-0">
          No work requests yet.
        </p>
      `;

    } else {

      recentRequestsHTML = recentRequests.map(req => {

        const requestDate = req.created_at
          ? new Date(req.created_at).toLocaleDateString()
          : '';

        return `
          <div class="small mb-2 pb-2 border-bottom">

            <strong>
              ${req.service_type || 'Service Request'}
            </strong>

            <span class="text-muted">
              — ${req.citizen_name || 'Citizen'}
            </span>

            <span class="dashboard-status-badge status-${(
              req.status || 'Unknown'
            ).toLowerCase()}">
              ${req.status || 'Unknown'}
            </span>

            ${
              requestDate
              ? `
                <div class="text-muted mt-1">
                  <i class="bi bi-calendar3 me-1"></i>
                  ${requestDate}
                </div>
              `
              : ''
            }

          </div>
        `;

      }).join('');
    }

    /* ---------- Reviews HTML ---------- */
    let reviewsHTML = '';

    if (reviews.length === 0) {

      reviewsHTML = `
        <p class="text-muted mb-0">
          No reviews yet.
        </p>
      `;

    } else {

      reviewsHTML = reviews.map(review => {

        const rating = Number(review.rating || 0);

        const stars =
          '★'.repeat(rating) +
          '☆'.repeat(5 - rating);

        return `
          <div class="border-bottom pb-2 mb-2">

            <div class="mb-1">

              <span class="stars fs-6">
                ${stars}
              </span>

              <strong class="ms-1">
                ${rating}/5
              </strong>

            </div>

            ${
              review.review_text
              ? `
                <p class="mb-1">
                  "${review.review_text}"
                </p>
              `
              : ''
            }

            <footer class="text-muted small">

              — ${review.citizen_name || 'Citizen'}

              ${
                review.created_at
                ? `, ${new Date(
                    review.created_at
                  ).toLocaleDateString()}`
                : ''
              }

            </footer>

          </div>
        `;

      }).join('');
    }

    /* ---------- Dashboard Content ---------- */
    document.getElementById('dashboardContent').innerHTML = `

      <!-- PROFILE VERIFICATION STATUS -->
      <div id="workerVerificationStatus" class="mb-3"></div>

      <!-- PROFILE + STATS -->
      <div class="row g-3 mb-3">

        <!-- Profile -->
        <div class="col-lg-4">

          <div class="card-box text-center h-100">

            ${
              currentUser.photo
              ?
              `
                <img
                  src="${currentUser.photo}"
                  style="
                    width:80px;
                    height:80px;
                    border-radius:50%;
                    object-fit:cover;
                    border:3px solid #10b981;
                    margin-bottom:.8rem;
                  "
                >
              `
              :
              `
                <div
                  style="
                    width:80px;
                    height:80px;
                    border-radius:50%;
                    background:linear-gradient(135deg,#10b981,#06b6d4);
                    color:#fff;
                    font-size:2rem;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    margin:0 auto .8rem;
                  "
                >
                  <i class="bi bi-person-fill"></i>
                </div>
              `
            }

            <h4 class="fw-bold mb-1">
              ${currentUser.name || 'Worker'}
            </h4>

            <p class="text-muted mb-1">
              ${currentUser.skill || 'Skilled Worker'}
            </p>

            <p class="text-muted mb-2">
              <i class="bi bi-geo-alt me-1"></i>
              ${currentUser.location || 'Location not added'}
            </p>

            <span class="role-badge worker">
              <i class="bi bi-tools me-1"></i>
              Skilled Worker
            </span>

          </div>

        </div>

        <!-- Statistics -->
        <div class="col-lg-8">

          <div class="row g-3">

            <div class="col-6 col-md-3">

              <div class="dash-stat">

                <i class="bi bi-inbox fs-4 mb-1 d-block"
                   style="color:#f59e0b"></i>

                <div class="ds-num"
                     style="color:#f59e0b">
                  ${stats.pending_requests}
                </div>

                <div class="ds-lbl">
                  Pending Requests
                </div>

              </div>

            </div>


            <div class="col-6 col-md-3">

              <div class="dash-stat">

                <i class="bi bi-list-check fs-4 mb-1 d-block"
                   style="color:#10b981"></i>

                <div class="ds-num"
                     style="color:#10b981">
                  ${stats.total_requests}
                </div>

                <div class="ds-lbl">
                  Total Requests
                </div>

              </div>

            </div>


            <div class="col-6 col-md-3">

              <div class="dash-stat">

                <i class="bi bi-check-circle-fill fs-4 mb-1 d-block"
                   style="color:#06b6d4"></i>

                <div class="ds-num"
                     style="color:#06b6d4">
                  ${stats.completed_jobs}
                </div>

                <div class="ds-lbl">
                  Completed Jobs
                </div>

              </div>

            </div>


            <div class="col-6 col-md-3">

              <div class="dash-stat">

                <i class="bi bi-star-fill fs-4 mb-1 d-block"
                   style="color:#f59e0b"></i>

                <div class="ds-num"
                     style="color:#f59e0b">
                  ${stats.rating}
                </div>

                <div class="ds-lbl">
                  Rating
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>


      <!-- QUICK ACTIONS + RECENT REQUESTS -->
      <div class="row g-3 mb-3">

        <!-- Quick Actions -->
        <div class="col-lg-5">

          <div class="card-box h-100">

            <h5 class="fw-bold mb-3">
              <i class="bi bi-lightning-charge-fill text-warning me-2"></i>
              Quick Actions
            </h5>

            <div class="d-flex flex-wrap gap-2">

              <button
                type="button"
                class="btn-grad-blue"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twWorkReq\\']')?.click();
                "
              >
                <i class="bi bi-inbox me-1"></i>
                View Requests
              </button>


              <button
                type="button"
                class="btn-grad-green"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twProfile\\']')?.click();
                "
              >
                <i class="bi bi-pencil me-1"></i>
                Edit Profile
              </button>


              <button
                type="button"
                class="btn"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twRoadmap\\']')?.click();
                "
                style="
                  background:linear-gradient(135deg,#8b5cf6,#6366f1);
                  color:white;
                  border:none;
                "
              >
                <i class="bi bi-signpost-split me-1"></i>
                Career Roadmap
              </button>


              <button
                type="button"
                class="btn"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twPortfolio\\']')?.click();
                "
                style="
                  background:linear-gradient(135deg,#ff01c4f5,#e90ee9);
                  color:white;
                  border:none;
                "
              >
                <i class="bi bi-images me-1"></i>
                Portfolio
              </button>


              <button
                type="button"
                class="btn-grad-orange"
                onclick="openFeedbackModal()"
              >
                <i class="bi bi-chat-dots me-1"></i>
                Send Feedback
              </button>

            </div>

          </div>

        </div>


        <!-- Recent Requests -->
        <div class="col-lg-7">

          <div class="card-box h-100">

            <div class="d-flex justify-content-between
                        align-items-center mb-3">

              <h5 class="fw-bold mb-0">
                <i class="bi bi-clock-history text-primary me-2"></i>
                Recent Work Requests
              </h5>

              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twWorkReq\\']')?.click();
                "
              >
                View All
              </button>

            </div>

            ${recentRequestsHTML}

          </div>

        </div>

      </div>


      <!-- REVIEWS + CAREER -->
      <div class="row g-3 mb-3">

        <!-- Reviews -->
        <div class="col-lg-6">

          <div class="card-box h-100">

            <h5 class="fw-bold mb-2">
              <i class="bi bi-star-fill text-warning me-2"></i>
              Ratings & Reviews
            </h5>

            <p class="mb-2">

              <span class="stars fs-5">
                ${'★'.repeat(Math.round(stats.rating || 0))}
                ${'☆'.repeat(
                  5 - Math.round(stats.rating || 0)
                )}
              </span>

              <strong class="ms-1">
                ${Number(stats.rating || 0).toFixed(1)}
              </strong>

              average from
              ${stats.review_count || 0}
              reviews

            </p>

            ${reviewsHTML}

          </div>

        </div>


        <!-- Career & Skill Growth -->
        <div class="col-lg-6">

          <div class="card-box h-100">

            <h5 class="fw-bold mb-3">
              <i class="bi bi-graph-up-arrow text-primary me-2"></i>
              Career & Skill Growth
            </h5>

            <div class="d-flex flex-wrap gap-2">

              <button
                type="button"
                class="btn btn-outline-primary"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twRoadmap\\']')?.click();
                "
              >
                <i class="bi bi-signpost-split me-1"></i>
                Career Roadmap
              </button>


              <button
                type="button"
                class="btn btn-outline-primary"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twSkillDev\\']')?.click();
                "
              >
                <i class="bi bi-mortarboard me-1"></i>
                Skill Development
              </button>


              <button
                type="button"
                class="btn btn-outline-primary"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twCerts\\']')?.click();
                "
              >
                <i class="bi bi-patch-check me-1"></i>
                Certifications
              </button>

            </div>

          </div>

        </div>

      </div>


      <!-- MY FEEDBACK -->
      <div class="row g-3 mb-3">

        <div class="col-12">

          <div class="card-box h-100">

            <h5 class="fw-bold mb-2">
              <i class="bi bi-chat-dots-fill text-primary me-2"></i>
              My Feedback
            </h5>

            ${
              feedback.length
              ? feedback.slice(0, 3).map(f => {

                  let history = f.reply_history || [];

                  if (typeof history === 'string') {
                    try {
                      history = JSON.parse(history);
                    } catch (error) {
                      history = [];
                    }
                  }

                  if (!Array.isArray(history)) {
                    history = [];
                  }

                  const statusClass =
                    f.status === 'REPLIED'
                      ? 'bg-success'
                      : f.status === 'READ'
                        ? 'bg-secondary'
                        : 'bg-danger';

                  return `
                    <div class="small mb-3 pb-3 border-bottom">

                      <div class="d-flex justify-content-between align-items-start">

                        <strong>
                          ${f.subject || 'No Subject'}
                        </strong>

                        <span
                          class="badge ${statusClass}"
                          style="font-size:.6rem"
                        >
                          ${f.status || 'NEW'}
                        </span>

                      </div>

                      <div class="text-muted mt-1">
                        ${f.message || ''}
                      </div>

                      ${
                        history.length
                        ? `
                          <div
                            class="mt-2 p-3 rounded"
                            style="background:#f0fdf4;"
                          >

                            <div class="fw-semibold text-success mb-2">
                              <i class="bi bi-reply-fill me-1"></i>
                              Admin Replies
                            </div>

                            ${
                              history.map((item, index) => `
                                <div
                                  class="${
                                    index < history.length - 1
                                      ? 'border-bottom pb-2 mb-2'
                                      : ''
                                  }"
                                >

                                  <div class="small">
                                    ${item.reply || ''}
                                  </div>

                                  ${
                                    item.replied_at
                                    ? `
                                      <div
                                        class="text-muted mt-1"
                                        style="font-size:.65rem;"
                                      >
                                        ${new Date(
                                          item.replied_at
                                        ).toLocaleString()}
                                      </div>
                                    `
                                    : ''
                                  }

                                </div>
                              `).join('')
                            }

                          </div>
                        `
                        : `
                          <div
                            class="text-muted mt-1"
                            style="font-size:.7rem;"
                          >
                            No admin reply yet.
                          </div>
                        `
                      }

                      ${
                        f.created_at
                        ? `
                          <div
                            class="text-muted mt-1"
                            style="font-size:.65rem;"
                          >
                            Submitted:
                            ${new Date(
                              f.created_at
                            ).toLocaleDateString()}
                          </div>
                        `
                        : ''
                      }

                    </div>
                  `;

                }).join('')
              : `
                <p class="text-muted mb-0">
                  You have not sent any feedback yet.
                </p>
              `
            }

          </div>

        </div>

      </div>


      <!-- GOVERNMENT SCHEMES -->
      <div class="row g-3">

        <div class="col-12">

          <div class="card-box">

            <div class="d-flex justify-content-between
                        align-items-center mb-3">

              <h5 class="fw-bold mb-0">
                <i class="bi bi-bank2 text-primary me-2"></i>
                Government Scheme Recommendations
              </h5>

              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                onclick="
                  showSection('jobs');
                  document.querySelector('[data-bs-target=\\'#twWorkerSchemes\\']')?.click();
                "
              >
                View Schemes
              </button>

            </div>

            <p class="mb-1 fw-semibold">
              Schemes recommended for your occupation:
            </p>

            <p class="text-muted mb-0">
              Government schemes and financial support
              relevant to
              <strong>
                ${currentUser.skill || 'your skill'}
              </strong>
              will appear here.
            </p>

          </div>

        </div>

      </div>

    `;

    loadWorkerVerificationStatus();

  } catch (error) {
    console.error('Worker dashboard error:', error);
    toast('Unable to load worker dashboard', 'error');
  }
}
/* ============ DASHBOARD ROUTER ============ */
function renderDashboard() {
  if (!currentUser) { showSection('login'); toast('Please login first', 'warn'); return; }
  if (currentUser.role === 'admin') { showSection('admin'); return; }
  if (currentUser.role === 'worker') renderWorkerDashboard();
  else renderCitizenDashboard();
}

/* ============ ADMIN DASHBOARD ============ */
function showAdminTab(tab) {
  const tabBtn = document.querySelector(
    `[data-bs-target="#ta${tab.charAt(0).toUpperCase() + tab.slice(1)}"]`
  );

  if (tabBtn) {
    const t = new bootstrap.Tab(tabBtn);
    t.show();
  }

  // Render the selected Admin section
  if (tab === 'overview') renderAdminOverview();
  if (tab === 'users') renderAdminUsers();
  if (tab === 'workers') renderAdminWorkers();
  if (tab === 'schemes') renderAdminSchemes();
  if (tab === 'docs') renderAdminDocs();
  if (tab === 'content') renderAdminContent();
  if (tab === 'comm') renderAdminComm();
  if (tab === 'reports') renderAdminReports();
}

async function renderAdminOverview() {

  const content = document.getElementById('adminOverviewBody');

  if (!content) return;

  content.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">Loading dashboard...</p>
    </div>
  `;

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/overview'
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to load overview');
    }

    const s = data.stats;
    const requests = data.recent_requests || [];

    const stats = [
      {
        n: s.citizens,
        l: 'Total Citizens',
        c: '#4f46e5',
        i: 'bi-people-fill'
      },
      {
        n: s.workers,
        l: 'Total Workers',
        c: '#10b981',
        i: 'bi-tools'
      },
      {
        n: s.service_requests,
        l: 'Service Requests',
        c: '#f59e0b',
        i: 'bi-diagram-3'
      },
      {
        n: s.pending_requests,
        l: 'Pending Requests',
        c: '#ef4444',
        i: 'bi-hourglass-split'
      },
      {
        n: s.completed_requests,
        l: 'Completed Services',
        c: '#06b6d4',
        i: 'bi-check-circle-fill'
      },
      {
        n: s.schemes,
        l: 'Government Schemes',
        c: '#7c3aed',
        i: 'bi-bank2'
      }
    ];

    content.innerHTML = `

      <!-- Statistics -->

      <div class="row g-3 mb-4">

        ${stats.map(stat => `
          <div class="col-6 col-md-4 col-xl-2">

            <div class="dash-stat">

              <i
                class="bi ${stat.i} fs-4 mb-1 d-block"
                style="color:${stat.c}"
              ></i>

              <div
                class="ds-num"
                style="color:${stat.c}"
              >
                ${stat.n}
              </div>

              <div class="ds-lbl">
                ${stat.l}
              </div>

            </div>

          </div>
        `).join('')}

      </div>


      <!-- Request Summary + Worker Verification -->

      <div class="row g-3 mb-4">

        <div class="col-md-6">

          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-diagram-3 text-primary me-2"></i>
              Service Request Summary
            </h6>

            <div class="row g-2">

              <div class="col-6">
                <div class="p-2 bg-light rounded">
                  <div class="small text-muted">Pending</div>
                  <strong>${s.pending_requests}</strong>
                </div>
              </div>

              <div class="col-6">
                <div class="p-2 bg-light rounded">
                  <div class="small text-muted">Accepted</div>
                  <strong>${s.accepted_requests}</strong>
                </div>
              </div>

              <div class="col-6">
                <div class="p-2 bg-light rounded">
                  <div class="small text-muted">Scheduled</div>
                  <strong>${s.scheduled_requests}</strong>
                </div>
              </div>

              <div class="col-6">
                <div class="p-2 bg-light rounded">
                  <div class="small text-muted">Completed</div>
                  <strong>${s.completed_requests}</strong>
                </div>
              </div>

              <div class="col-6">
                <div class="p-2 bg-light rounded">
                  <div class="small text-muted">Rejected</div>
                  <strong>${s.rejected_requests}</strong>
                </div>
              </div>

              <div class="col-6">
                <div class="p-2 bg-light rounded">
                  <div class="small text-muted">Cancelled</div>
                  <strong>${s.cancelled_requests}</strong>
                </div>
              </div>

            </div>

          </div>

        </div>


        <div class="col-md-6">

          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-person-check text-success me-2"></i>
              Worker Verification
            </h6>

            <div class="d-flex justify-content-between mb-3">
              <span>Verified Workers</span>
              <strong class="text-success">
                ${s.verified_workers}
              </strong>
            </div>

            <div class="d-flex justify-content-between mb-3">
              <span>Pending Verification</span>
              <strong class="text-warning">
                ${s.pending_workers}
              </strong>
            </div>

            <div class="d-flex justify-content-between">
              <span>Total Workers</span>
              <strong>
                ${s.workers}
              </strong>
            </div>

          </div>

        </div>

      </div>


      <!-- Recent Activity -->

      <div class="card-box">

        <h6 class="fw-bold mb-3">
          <i class="bi bi-clock-history text-primary me-2"></i>
          Recent Service Requests
        </h6>

        ${
          requests.length
          ? requests.map(r => `
              
              <div class="small mb-3 pb-3 border-bottom">

                <div class="d-flex justify-content-between flex-wrap">

                  <strong>
                    ${r.citizen_name || 'Citizen'}
                  </strong>

                  <span class="text-muted">
                    ${r.created_at || ''}
                  </span>

                </div>

                <div class="mt-1">
                  Requested
                  <strong>${r.service_type || 'Service'}</strong>
                  from
                  <strong>${r.worker_name || 'Worker'}</strong>
                </div>

                <span
                  class="badge rounded-pill mt-1"
                  style="
                    background:#4f46e5;
                    color:#fff;
                    font-size:.65rem;
                  "
                >
                  ${r.status || 'Pending'}
                </span>

              </div>

          `).join('')
          : `
            <p class="text-muted small mb-0">
              No service requests yet.
            </p>
          `
        }

      </div>

    `;

  } catch (error) {

    console.error('Admin overview error:', error);

    content.innerHTML = `
      <div class="alert alert-danger">
        Unable to load admin dashboard data.
      </div>
    `;
  }
}
async function renderAdminUsers() {

  const body = document.getElementById('adminUsersBody');

  if (!body) return;

  body.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">Loading users...</p>
    </div>
  `;

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/users'
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    const users = data.users || [];

    window.adminUsersData = users;

    body.innerHTML = `

      <div class="d-flex gap-2 mb-3 flex-wrap">

        <input
          class="form-control form-control-sm"
          style="max-width:250px"
          placeholder="Search users..."
          oninput="filterAdminUsers()"
          id="adminUserSearch"
        />

        <select
          class="form-select form-select-sm"
          style="max-width:170px"
          id="adminRoleFilter"
          onchange="filterAdminUsers()"
        >
          <option value="">All Roles</option>
          <option value="citizen">Citizen</option>
          <option value="worker">Worker</option>
        </select>

        <select
          class="form-select form-select-sm"
          style="max-width:170px"
          id="adminStatusFilter"
          onchange="filterAdminUsers()"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>

      </div>

      <div class="table-responsive">

        <table class="table table-hover align-middle">

          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Location</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="adminUserRows"></tbody>

        </table>

      </div>
    `;

    filterAdminUsers();

  } catch (error) {

    console.error('Admin users error:', error);

    body.innerHTML = `
      <div class="alert alert-danger">
        Unable to load users.
      </div>
    `;
  }
}
function filterAdminUsers() {

  const search =
    (document.getElementById('adminUserSearch')?.value || '')
      .toLowerCase()
      .trim();

  const role =
    document.getElementById('adminRoleFilter')?.value || '';

  const status =
    document.getElementById('adminStatusFilter')?.value || '';

  const users = window.adminUsersData || [];

  const filtered = users.filter(u => {

    const matchesSearch =
      !search ||
      String(u.full_name || '').toLowerCase().includes(search) ||
      String(u.email || '').toLowerCase().includes(search) ||
      String(u.location || '').toLowerCase().includes(search);

    const matchesRole =
      !role || u.role === role;

    const matchesStatus =
      !status || u.status === status;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const rows = document.getElementById('adminUserRows');

  if (!rows) return;

  rows.innerHTML = filtered.length
    ? filtered.map(u => {

        const isBlocked = u.status === 'blocked';

        return `
          <tr>

            <td>
              <strong>${u.full_name || '-'}</strong>
            </td>

            <td>${u.email || '-'}</td>

            <td>
              <span class="badge ${
                u.role === 'worker'
                  ? 'bg-success'
                  : 'bg-primary'
              }">
                ${
                  u.role === 'worker'
                    ? 'Worker'
                    : 'Citizen'
                }
              </span>
            </td>

            <td>${u.location || '-'}</td>

            <td>
              <span class="badge ${
                isBlocked
                  ? 'bg-danger'
                  : 'bg-success'
              }">
                ${isBlocked ? 'Blocked' : 'Active'}
              </span>
            </td>

            <td>
              ${
                u.created_at
                  ? new Date(u.created_at)
                      .toLocaleDateString()
                  : '-'
              }
            </td>

            <td>

              <button
                class="btn btn-sm btn-outline-primary me-1"
                onclick="viewAdminUser(${u.id})"
                title="View"
              >
                <i class="bi bi-eye"></i>
              </button>

              <button
                class="btn btn-sm ${
                  isBlocked
                    ? 'btn-outline-success'
                    : 'btn-outline-danger'
                }"
                onclick="toggleAdminUserStatus(
                  ${u.id},
                  '${isBlocked ? 'active' : 'blocked'}'
                )"
                title="${isBlocked ? 'Unblock' : 'Block'}"
              >
                <i class="bi ${
                  isBlocked
                    ? 'bi-unlock'
                    : 'bi-lock'
                }"></i>
              </button>

            </td>

          </tr>
        `;

      }).join('')
    : `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          No users found.
        </td>
      </tr>
    `;
}
function viewAdminUser(id) {
  const user = window.adminUsersData.find(u => u.id === id);

  if (!user) return;

  document.getElementById('adminUserDetailsBody').innerHTML = `
  <div class="row g-3">

    <div class="col-md-6">
      <small class="text-muted">Full Name</small>
      <div class="fw-semibold">${user.full_name || '—'}</div>
    </div>

    <div class="col-md-6">
      <small class="text-muted">Role</small>
      <div class="fw-semibold">
        ${user.role === 'citizen' ? 'Citizen' : 'Skilled Worker'}
      </div>
    </div>

    <!-- Email gets full width -->
    <div class="col-12">
      <small class="text-muted">Email</small>
      <div class="text-break">${user.email || '—'}</div>
    </div>

    <div class="col-md-6">
      <small class="text-muted">Phone</small>
      <div>${user.phone || '—'}</div>
    </div>

    <div class="col-md-6">
      <small class="text-muted">Location</small>
      <div>${user.location || '—'}</div>
    </div>

    <div class="col-md-6">
      <small class="text-muted">
  ${user.role === 'worker' ? 'Languages' : 'Preferred Language'}
</small>
      <div>${user.preferred_language || '—'}</div>
    </div>

    <div class="col-md-6">
      <small class="text-muted">Status</small>
      <div>
        ${user.status === 'active'
          ? '<span class="badge bg-success">Active</span>'
          : '<span class="badge bg-danger">Blocked</span>'}
      </div>
    </div>

    <div class="col-md-6">
      <small class="text-muted">Joined</small>
      <div>
        ${user.created_at
          ? new Date(user.created_at).toLocaleDateString()
          : '—'}
      </div>
    </div>

  </div>
`;
  new bootstrap.Modal(
    document.getElementById('adminUserDetailsModal')
  ).show();
}
 function toggleAdminUserStatus(id, newStatus) {
  const user = window.adminUsersData.find(u => u.id === id);

  if (!user) return;

  window.pendingUserStatusChange = {
    id: id,
    status: newStatus,
    name: user.full_name
  };

  document.getElementById('adminStatusModalTitle').textContent =
    newStatus === 'blocked' ? 'Block User' : 'Unblock User';

  document.getElementById('adminStatusModalBody').innerHTML =
    newStatus === 'blocked'
      ? `Are you sure you want to block <strong>${user.full_name}</strong>?<br>
         <small class="text-muted">This user will no longer be able to log in.</small>`
      : `Are you sure you want to unblock <strong>${user.full_name}</strong>?<br>
         <small class="text-muted">This user will be able to log in again.</small>`;

  document.getElementById('adminStatusConfirmBtn').textContent =
    newStatus === 'blocked' ? 'Block User' : 'Unblock User';

  document.getElementById('adminStatusConfirmBtn').className =
    newStatus === 'blocked'
      ? 'btn btn-danger'
      : 'btn btn-success';

  new bootstrap.Modal(
    document.getElementById('adminStatusModal')
  ).show();
}
async function confirmAdminUserStatusChange() {
  const action = window.pendingUserStatusChange;

  if (!action) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/users/${action.id}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: action.status
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Failed to update user status');
      return;
    }

    bootstrap.Modal.getInstance(
      document.getElementById('adminStatusModal')
    ).hide();

    toast(
      action.status === 'blocked'
        ? `${action.name} has been blocked`
        : `${action.name} has been unblocked`
    );

    window.pendingUserStatusChange = null;

    renderAdminUsers();
  } catch (error) {
    console.error('User status error:', error);
    toast('Unable to update user status');
  }
}

async function renderAdminWorkers() {
  const body = document.getElementById('adminWorkersBody');

  body.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="mt-2 text-muted">Loading workers...</p>
    </div>
  `;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/workers'
    );

    const data = await response.json();

    if (!data.success) {
      body.innerHTML = `
        <div class="alert alert-danger">
          ${data.message || 'Failed to load workers'}
        </div>
      `;
      return;
    }

    window.adminWorkersData = data.workers;

    const workers = data.workers;

    const approved = workers.filter(
      w => w.verification_status === 'approved'
    ).length;

    const pending = workers.filter(
      w => w.verification_status === 'pending'
    ).length;

    const rejected = workers.filter(
      w => w.verification_status === 'rejected'
    ).length;

    body.innerHTML = `
      <!-- Worker Statistics -->
      <div class="row g-3 mb-3">

        <div class="col-md-4">
          <div class="card-box text-center">
            <div class="fw-bold fs-3 text-success">${approved}</div>
            <div class="small text-muted">Approved Workers</div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card-box text-center">
            <div class="fw-bold fs-3 text-warning">${pending}</div>
            <div class="small text-muted">Pending Verification</div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card-box text-center">
            <div class="fw-bold fs-3 text-danger">${rejected}</div>
            <div class="small text-muted">Rejected Workers</div>
          </div>
        </div>

      </div>

      <!-- Worker Table -->
      <div class="table-responsive">

        <table class="table table-hover align-middle">

          <thead>
            <tr>
              <th>Name</th>
              <th>Skill</th>
              <th>Location</th>
              <th>Rating</th>
              <th>Experience</th>
              <th>Verification</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${workers.map(w => {

              let verificationBadge = '';

              if (w.verification_status === 'approved') {
                verificationBadge =
                  '<span class="badge bg-success">Approved</span>';
              } else if (w.verification_status === 'pending') {
                verificationBadge =
                  '<span class="badge bg-warning text-dark">Pending</span>';
              } else {
                verificationBadge =
                  '<span class="badge bg-danger">Rejected</span>';
              }

              return `
                <tr>

                  <td class="fw-semibold">
                    ${w.full_name || '—'}
                  </td>

                  <td>
                    <span class="badge rounded-pill bg-primary">
                      ${w.primary_skill || '—'}
                    </span>
                  </td>

                  <td class="small">
                    ${w.location || '—'}
                  </td>

                  <td>
                    ${
                      Number(w.rating) > 0
                        ? `<span class="stars">★</span> ${w.rating}`
                        : '—'
                    }
                  </td>

                  <td class="small">
                    ${w.experience_years || 0} yrs
                  </td>

                  <td>
                    ${verificationBadge}
                  </td>

                  <td>

                    <button
                      class="btn btn-sm btn-outline-info"
                      onclick="viewAdminWorker(${w.id})"
                      title="View">
                      <i class="bi bi-eye"></i>
                    </button>

                    ${
  w.verification_status === 'pending'
    ? `
      <button
        class="btn btn-sm btn-outline-success"
        onclick="updateAdminWorkerVerification(${w.id}, 'approved')"
        title="Approve">
        <i class="bi bi-check-lg"></i>
      </button>

      <button
        class="btn btn-sm btn-outline-danger"
        onclick="updateAdminWorkerVerification(${w.id}, 'rejected')"
        title="Reject">
        <i class="bi bi-x-lg"></i>
      </button>
    `
    : w.verification_status === 'approved'
      ? `
        <button
          class="btn btn-sm btn-outline-danger"
          onclick="updateAdminWorkerVerification(${w.id}, 'rejected')"
          title="Reject">
          <i class="bi bi-x-lg"></i>
        </button>
      `
      : `
        <button
          class="btn btn-sm btn-outline-success"
          onclick="updateAdminWorkerVerification(${w.id}, 'approved')"
          title="Approve">
          <i class="bi bi-check-lg"></i>
        </button>
      `
}

                  </td>

                </tr>
              `;
            }).join('')}
          </tbody>

        </table>

      </div>
    `;

  } catch (error) {
    console.error('Admin workers error:', error);

    body.innerHTML = `
      <div class="alert alert-danger">
        Unable to load workers. Please try again.
      </div>
    `;
  }
}
function viewAdminWorker(id) {
  const worker = window.adminWorkersData.find(
    w => Number(w.id) === Number(id)
  );

  if (!worker) {
    toast('Worker details not found', 'error');
    return;
  }

  const status = worker.verification_status;

  let statusBadge = '';

  if (status === 'approved') {
    statusBadge = '<span class="badge bg-success">Approved</span>';
  } else if (status === 'pending') {
    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
  } else {
    statusBadge = '<span class="badge bg-danger">Rejected</span>';
  }

  document.getElementById('adminWorkerDetailsBody').innerHTML = `
    <div class="row g-3">

      <div class="col-md-6">
        <small class="text-muted">Full Name</small>
        <div class="fw-semibold">${worker.full_name || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Primary Skill</small>
        <div>
          <span class="badge rounded-pill bg-primary">
            ${worker.primary_skill || '—'}
          </span>
        </div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Email</small>
        <div class="text-break">${worker.email || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Phone</small>
        <div>${worker.phone || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Location</small>
        <div>${worker.location || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Area</small>
        <div>${worker.area || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Experience</small>
        <div>${worker.experience_years || 0} years</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Languages</small>
        <div>${worker.languages || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Rating</small>
        <div>
          ${
            Number(worker.rating) > 0
              ? `<span class="stars">★</span> ${worker.rating}
                 (${worker.review_count || 0} reviews)`
              : 'No reviews yet'
          }
        </div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Charges</small>
        <div>${worker.charges || '—'}</div>
      </div>

      <div class="col-12">
        <small class="text-muted">Services Offered</small>
        <div>${worker.services_offered || '—'}</div>
      </div>

      <div class="col-12">
        <small class="text-muted">Other Skills</small>
        <div>${worker.other_skills || '—'}</div>
      </div>

      <div class="col-12">
        <small class="text-muted">About</small>
        <div>${worker.about || '—'}</div>
      </div>

      <div class="col-12">
        <small class="text-muted">Certifications</small>
        <div>${worker.certifications || '—'}</div>
      </div>

      <div class="col-12">
        <small class="text-muted">Previous Work Experience</small>
        <div>${worker.previous_work_experience || '—'}</div>
      </div>

      <div class="col-md-6">
        <small class="text-muted">Verification Status</small>
        <div>${statusBadge}</div>
      </div>

    </div>
  `;

  new bootstrap.Modal(
    document.getElementById('adminWorkerDetailsModal')
  ).show();
}
async function updateAdminWorkerVerification(workerId, status) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/workers/${workerId}/verification`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: status
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Failed to update worker');
      return;
    }

    toast(
      status === 'approved'
        ? 'Worker approved successfully'
        : 'Worker rejected successfully'
    );

    renderAdminWorkers();

  } catch (error) {
    console.error('Worker verification error:', error);
    toast('Unable to update worker verification');
  }
}

async function renderAdminSchemes() {
  const container = document.getElementById('adminSchemesBody');

  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-4">
      <div class="spinner-border text-primary"></div>
      <p class="mt-2 text-muted">Loading government schemes...</p>
    </div>
  `;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/schemes'
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to load government schemes'
      );
    }

    const jobSchemes = data.job_assistant || [];
    const womenSchemes = data.women_rights || [];
    const governmentSchemes = data.government_finder || [];

    container.innerHTML = `

      <!-- SCHEMES HEADER -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="fw-bold mb-1">
            Government Schemes
          </h4>
          <p class="text-muted mb-0">
            Manage schemes available across all portal domains.
          </p>
        </div>

        <button
          type="button"
          class="btn-grad-blue"
          onclick="openAddAdminSchemeModal()">
          <i class="bi bi-plus-circle me-1"></i>
          Add New Scheme
        </button>
      </div>


      <!-- JOB ASSISTANT -->
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-tools text-primary me-2"></i>
            Job Assistant
          </h5>

          <span class="badge bg-primary">
            ${jobSchemes.length} Schemes
          </span>
        </div>

        ${renderAdminSchemeTable(
          jobSchemes,
          'job_assistant'
        )}
      </div>


      <!-- WOMEN'S PROTECTION & RIGHTS -->
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-gender-female text-danger me-2"></i>
            Women's Protection & Rights
          </h5>

          <span class="badge bg-danger">
            ${womenSchemes.length} Schemes
          </span>
        </div>

        ${renderAdminSchemeTable(
          womenSchemes,
          'women_rights'
        )}
      </div>


      <!-- GOVERNMENT SCHEME FINDER -->
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="fw-bold mb-0">
            <i class="bi bi-bank2 text-success me-2"></i>
            Government Scheme Finder
          </h5>

          <span class="badge bg-success">
            ${governmentSchemes.length} Schemes
          </span>
        </div>

        ${renderAdminSchemeTable(
          governmentSchemes,
          'government_finder'
        )}
      </div>

    `;

  } catch (error) {
    console.error('Admin schemes error:', error);

    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Unable to load government schemes.
      </div>
    `;
  }
}
function renderAdminSchemeTable(schemes, domain) {

  if (!schemes.length) {
    return `
      <div class="alert alert-light border">
        No schemes available in this section.
      </div>
    `;
  }

  return `
    <div class="table-responsive">
      <table class="table table-hover align-middle">

        <thead>
          <tr>
            <th>Scheme Name</th>
            <th>Category</th>
            <th>State / Coverage</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          ${schemes.map(scheme => {

            let category = '—';

            if (domain === 'job_assistant') {
              category = scheme.categories || '—';
            }

            if (domain === 'women_rights') {
              category = scheme.category || '—';
            }

            if (domain === 'government_finder') {
              category = scheme.scheme_category || '—';
            }

            return `
              <tr>

                <td class="fw-semibold">
                  ${scheme.scheme_name || '—'}
                </td>

                <td style="max-width: 300px;">
  ${
    domain === 'job_assistant' && category !== '—'
      ? `
        <span class="badge rounded-pill bg-secondary">
          ${category.split(',').length} Categories
        </span>
      `
      : `
        <span class="badge rounded-pill bg-secondary">
          ${category}
        </span>
      `
  }
</td>

                <td>
                  ${scheme.coverage || 'Not specified'}
                </td>

                <td>
  <span class="badge ${
    (scheme.status || 'Active').toLowerCase() === 'active'
      ? 'bg-success'
      : 'bg-danger'
  }">
    ${scheme.status || 'Active'}
  </span>
</td>

                <td>
                  <button
                    class="btn btn-sm btn-outline-info me-1"
                    onclick="viewAdminScheme(${scheme.id}, '${domain}')"
                    title="View">
                    <i class="bi bi-eye"></i>
                  </button>

                  <button
                    class="btn btn-sm btn-outline-warning me-1"
                    onclick="editAdminScheme(${scheme.id}, '${domain}')"
                    title="Edit">
                    <i class="bi bi-pencil"></i>
                  </button>

                 <button
  class="btn btn-sm btn-outline-danger"
  onclick="deleteAdminScheme(${scheme.id}, '${domain}')"
  title="Delete">
  <i class="bi bi-trash"></i>
</button>
                </td>

              </tr>
            `;
          }).join('')}

        </tbody>

      </table>
    </div>
  `;
}
async function viewAdminScheme(schemeId, domain) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/schemes/${domain}/${schemeId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load scheme');
    }

    const scheme = data.scheme;

    let details = '';

    // JOB ASSISTANT
    if (domain === 'job_assistant') {
      details = `
        <div class="row g-3">

          <div class="col-12">
            <small class="text-muted">Scheme Name</small>
            <div class="fw-semibold">${scheme.scheme_name || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Ministry</small>
            <div>${scheme.ministry || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Scheme Type</small>
            <div>${scheme.scheme_type || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Applicable Job Categories</small>
            <div>
              ${
                scheme.categories && scheme.categories.length
                  ? scheme.categories.map(c =>
                      `<span class="badge bg-secondary me-1 mb-1">${c}</span>`
                    ).join('')
                  : '—'
              }
            </div>
          </div>

          <div class="col-12">
            <small class="text-muted">Description</small>
            <div>${scheme.description || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Eligibility</small>
            <div>${scheme.eligibility || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Benefits</small>
            <div>${scheme.benefits || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Documents</small>
            <div>${scheme.documents || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Application Method</small>
            <div>${scheme.application_method || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Official Link</small>
            <div>
              ${
                scheme.official_link
                  ? `<a href="${scheme.official_link}" target="_blank">
                      Visit Official Website
                    </a>`
                  : '—'
              }
            </div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Status</small>
            <div>${scheme.status || 'Active'}</div>
          </div>

        </div>
      `;
    }

    // WOMEN'S PROTECTION & RIGHTS
    else if (domain === 'women_rights') {
      details = `
        <div class="row g-3">

          <div class="col-12">
            <small class="text-muted">Scheme Name</small>
            <div class="fw-semibold">${scheme.scheme_name || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Scheme Level</small>
            <div>${scheme.scheme_level || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Category</small>
            <div>${scheme.category || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Description</small>
            <div>${scheme.description || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Eligibility</small>
            <div>${scheme.eligibility || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Benefits</small>
            <div>${scheme.benefits || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Documents</small>
            <div>${scheme.documents || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Application Method</small>
            <div>${scheme.application_method || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Official Link</small>
            <div>
              ${
                scheme.official_link
                  ? `<a href="${scheme.official_link}" target="_blank">
                      Visit Official Website
                    </a>`
                  : '—'
              }
            </div>
          </div>

          <div class="col-12">
            <small class="text-muted">Eligibility Tags</small>
            <div>${scheme.eligibility_tags || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Status</small>
            <div>${scheme.status || 'Active'}</div>
          </div>

        </div>
      `;
    }

    // GOVERNMENT SCHEME FINDER
    else if (domain === 'government_finder') {
      details = `
        <div class="row g-3">

          <div class="col-12">
            <small class="text-muted">Scheme Name</small>
            <div class="fw-semibold">${scheme.scheme_name || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Department</small>
            <div>${scheme.department || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Scheme Category</small>
            <div>${scheme.scheme_category || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Category</small>
            <div>${scheme.category || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">State</small>
            <div>${scheme.state || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Gender</small>
            <div>${scheme.gender || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Occupation</small>
            <div>${scheme.occupation || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Age Group</small>
            <div>${scheme.age_group || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Income Range</small>
            <div>${scheme.income_range || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Description</small>
            <div>${scheme.description || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Eligibility</small>
            <div>${scheme.eligibility || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Benefits</small>
            <div>${scheme.benefits || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Documents</small>
            <div>${scheme.documents || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Application Method</small>
            <div>${scheme.application_method || '—'}</div>
          </div>

          <div class="col-12">
            <small class="text-muted">Official Link</small>
            <div>
              ${
                scheme.official_link
                  ? `<a href="${scheme.official_link}" target="_blank">
                      Visit Official Website
                    </a>`
                  : '—'
              }
            </div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Deadline</small>
            <div>${scheme.deadline || '—'}</div>
          </div>

          <div class="col-md-6">
            <small class="text-muted">Status</small>
            <div>${scheme.status || 'Active'}</div>
          </div>

        </div>
      `;
    }

    document.getElementById('adminSchemeDetailsBody').innerHTML = details;

    const modal = new bootstrap.Modal(
      document.getElementById('adminSchemeDetailsModal')
    );

    modal.show();

  } catch (error) {
    console.error('View scheme error:', error);

    toast(
      error.message || 'Unable to load scheme details',
      'error'
    );
  }
}
async function editAdminScheme(schemeId, domain) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/schemes/${domain}/${schemeId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load scheme');
    }

    const scheme = data.scheme;

    let form = '';

    // -----------------------------------------
    // JOB ASSISTANT
    // -----------------------------------------
    if (domain === 'job_assistant') {
      form = `
        <form id="adminEditSchemeForm">

          <div class="mb-3">
            <label class="form-label">Scheme Name</label>
            <input
              type="text"
              class="form-control"
              id="editSchemeName"
              value="${scheme.scheme_name || ''}"
              required>
          </div>

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Ministry</label>
              <input
                type="text"
                class="form-control"
                id="editMinistry"
                value="${scheme.ministry || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Scheme Type</label>
              <input
                type="text"
                class="form-control"
                id="editSchemeType"
                value="${scheme.scheme_type || ''}">
            </div>

            <div class="col-12">
              <label class="form-label">Applicable Job Categories</label>
              <select
                class="form-select"
                id="editCategoryIds"
                multiple>
                <option>Loading categories...</option>
              </select>
              <small class="text-muted">
                Hold Ctrl and select multiple categories.
              </small>
            </div>

            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea
                class="form-control"
                id="editDescription">${scheme.description || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Eligibility</label>
              <textarea
                class="form-control"
                id="editEligibility">${scheme.eligibility || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Benefits</label>
              <textarea
                class="form-control"
                id="editBenefits">${scheme.benefits || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Application Method</label>
              <textarea
                class="form-control"
                id="editApplicationMethod">${scheme.application_method || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Official Link</label>
              <input
                type="url"
                class="form-control"
                id="editOfficialLink"
                value="${scheme.official_link || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Status</label>
              <select
                class="form-select"
                id="editStatus">
                <option value="Active" ${scheme.status === 'Active' ? 'selected' : ''}>
                  Active
                </option>
                <option value="Inactive" ${scheme.status === 'Inactive' ? 'selected' : ''}>
                  Inactive
                </option>
              </select>
            </div>

          </div>

        </form>
      `;
    }

    // -----------------------------------------
    // WOMEN'S PROTECTION & RIGHTS
    // -----------------------------------------
    else if (domain === 'women_rights') {
      form = `
        <form id="adminEditSchemeForm">

          <div class="mb-3">
            <label class="form-label">Scheme Name</label>
            <input
              type="text"
              class="form-control"
              id="editSchemeName"
              value="${scheme.scheme_name || ''}"
              required>
          </div>

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Scheme Level</label>
              <input
                type="text"
                class="form-control"
                id="editSchemeLevel"
                value="${scheme.scheme_level || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Category</label>
              <input
                type="text"
                class="form-control"
                id="editCategory"
                value="${scheme.category || ''}">
            </div>

            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea
                class="form-control"
                id="editDescription">${scheme.description || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Eligibility</label>
              <textarea
                class="form-control"
                id="editEligibility">${scheme.eligibility || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Benefits</label>
              <textarea
                class="form-control"
                id="editBenefits">${scheme.benefits || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Documents</label>
              <textarea
                class="form-control"
                id="editDocuments">${scheme.documents || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Application Method</label>
              <textarea
                class="form-control"
                id="editApplicationMethod">${scheme.application_method || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Official Link</label>
              <input
                type="url"
                class="form-control"
                id="editOfficialLink"
                value="${scheme.official_link || ''}">
            </div>

            <div class="col-12">
              <label class="form-label">Eligibility Tags</label>
              <input
                type="text"
                class="form-control"
                id="editEligibilityTags"
                value="${scheme.eligibility_tags || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Status</label>
              <select
                class="form-select"
                id="editStatus">
                <option value="Active" ${scheme.status === 'Active' ? 'selected' : ''}>
                  Active
                </option>
                <option value="Inactive" ${scheme.status === 'Inactive' ? 'selected' : ''}>
                  Inactive
                </option>
              </select>
            </div>

          </div>

        </form>
      `;
    }

    // -----------------------------------------
    // GOVERNMENT SCHEME FINDER
    // -----------------------------------------
    else if (domain === 'government_finder') {
      form = `
        <form id="adminEditSchemeForm">

          <div class="mb-3">
            <label class="form-label">Scheme Name</label>
            <input
              type="text"
              class="form-control"
              id="editSchemeName"
              value="${scheme.scheme_name || ''}"
              required>
          </div>

          <div class="row g-3">

            <div class="col-md-6">
              <label class="form-label">Department</label>
              <input
                type="text"
                class="form-control"
                id="editDepartment"
                value="${scheme.department || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Scheme Category</label>
              <input
                type="text"
                class="form-control"
                id="editSchemeCategory"
                value="${scheme.scheme_category || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Category</label>
              <input
                type="text"
                class="form-control"
                id="editCategory"
                value="${scheme.category || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">State</label>
              <input
                type="text"
                class="form-control"
                id="editState"
                value="${scheme.state || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Gender</label>
              <input
                type="text"
                class="form-control"
                id="editGender"
                value="${scheme.gender || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Occupation</label>
              <input
                type="text"
                class="form-control"
                id="editOccupation"
                value="${scheme.occupation || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Age Group</label>
              <input
                type="text"
                class="form-control"
                id="editAgeGroup"
                value="${scheme.age_group || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Income Range</label>
              <input
                type="text"
                class="form-control"
                id="editIncomeRange"
                value="${scheme.income_range || ''}">
            </div>

            <div class="col-12">
              <label class="form-label">Description</label>
              <textarea
                class="form-control"
                id="editDescription">${scheme.description || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Eligibility</label>
              <textarea
                class="form-control"
                id="editEligibility">${scheme.eligibility || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Benefits</label>
              <textarea
                class="form-control"
                id="editBenefits">${scheme.benefits || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Documents</label>
              <textarea
                class="form-control"
                id="editDocuments">${scheme.documents || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Application Method</label>
              <textarea
                class="form-control"
                id="editApplicationMethod">${scheme.application_method || ''}</textarea>
            </div>

            <div class="col-12">
              <label class="form-label">Official Link</label>
              <input
                type="url"
                class="form-control"
                id="editOfficialLink"
                value="${scheme.official_link || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Deadline</label>
              <input
                type="date"
                class="form-control"
                id="editDeadline"
                value="${scheme.deadline || ''}">
            </div>

            <div class="col-md-6">
              <label class="form-label">Status</label>
              <select
                class="form-select"
                id="editStatus">
                <option value="Active" ${scheme.status === 'Active' ? 'selected' : ''}>
                  Active
                </option>
                <option value="Inactive" ${scheme.status === 'Inactive' ? 'selected' : ''}>
                  Inactive
                </option>
              </select>
            </div>

          </div>

        </form>
      `;
    }

    document.getElementById('adminEditSchemeBody').innerHTML = form;

    // Store the currently edited scheme
    window.currentAdminSchemeId = schemeId;
    window.currentAdminSchemeDomain = domain;

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById('adminEditSchemeModal')
    );

    modal.show();
    if (domain === 'job_assistant') {
  await loadEditJobCategories(scheme.categories || []);
}

  } catch (error) {
    console.error('Edit scheme error:', error);

    toast(
      error.message || 'Unable to load scheme for editing',
      'error'
    );
  }
}
async function loadEditJobCategories(selectedCategories = []) {
  const select = document.getElementById('editCategoryIds');

  if (!select) return;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/job-categories'
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error('Unable to load job categories');
    }

    const categories = data.categories || [];

    select.innerHTML = categories.map(category => `
      <option
        value="${category.id}"
        ${selectedCategories.includes(category.category_name) ? 'selected' : ''}
      >
        ${category.category_name}
      </option>
    `).join('');

  } catch (error) {
    console.error('Load edit categories error:', error);

    select.innerHTML = `
      <option value="">Unable to load categories</option>
    `;
  }
}
async function saveAdminScheme() {
  const schemeId = window.currentAdminSchemeId;
  const domain = window.currentAdminSchemeDomain;

  if (!schemeId || !domain) {
    toast('No scheme selected', 'error');
    return;
  }

  const form = document.getElementById('adminEditSchemeForm');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    scheme_name: document.getElementById('editSchemeName')?.value.trim() || '',
    status: document.getElementById('editStatus')?.value || 'Active'
  };

  // -----------------------------------------
  // JOB ASSISTANT
  // -----------------------------------------
  if (domain === 'job_assistant') {

    data.ministry =
      document.getElementById('editMinistry')?.value.trim() || '';

    data.scheme_type =
      document.getElementById('editSchemeType')?.value.trim() || '';

    data.description =
      document.getElementById('editDescription')?.value.trim() || '';

    data.eligibility =
      document.getElementById('editEligibility')?.value.trim() || '';

    data.benefits =
      document.getElementById('editBenefits')?.value.trim() || '';

    data.application_method =
      document.getElementById('editApplicationMethod')?.value.trim() || '';

    data.official_link =
      document.getElementById('editOfficialLink')?.value.trim() || '';

    data.category_ids = Array.from(
      document.getElementById('editCategoryIds')?.selectedOptions || []
    ).map(option => Number(option.value));

  }

  // -----------------------------------------
  // WOMEN'S PROTECTION & RIGHTS
  // -----------------------------------------
  else if (domain === 'women_rights') {

    data.scheme_level =
      document.getElementById('editSchemeLevel')?.value.trim() || '';

    data.category =
      document.getElementById('editCategory')?.value.trim() || '';

    data.description =
      document.getElementById('editDescription')?.value.trim() || '';

    data.eligibility =
      document.getElementById('editEligibility')?.value.trim() || '';

    data.benefits =
      document.getElementById('editBenefits')?.value.trim() || '';

    data.documents =
      document.getElementById('editDocuments')?.value.trim() || '';

    data.application_method =
      document.getElementById('editApplicationMethod')?.value.trim() || '';

    data.official_link =
      document.getElementById('editOfficialLink')?.value.trim() || '';

    data.eligibility_tags =
      document.getElementById('editEligibilityTags')?.value.trim() || '';

  }

  // -----------------------------------------
  // GOVERNMENT SCHEME FINDER
  // -----------------------------------------
  else if (domain === 'government_finder') {

    data.department =
      document.getElementById('editDepartment')?.value.trim() || '';

    data.scheme_category =
      document.getElementById('editSchemeCategory')?.value.trim() || '';

    data.category =
      document.getElementById('editCategory')?.value.trim() || '';

    data.state =
      document.getElementById('editState')?.value.trim() || '';

    data.gender =
      document.getElementById('editGender')?.value.trim() || '';

    data.occupation =
      document.getElementById('editOccupation')?.value.trim() || '';

    data.age_group =
      document.getElementById('editAgeGroup')?.value.trim() || '';

    data.income_range =
      document.getElementById('editIncomeRange')?.value.trim() || '';

    data.description =
      document.getElementById('editDescription')?.value.trim() || '';

    data.eligibility =
      document.getElementById('editEligibility')?.value.trim() || '';

    data.benefits =
      document.getElementById('editBenefits')?.value.trim() || '';

    data.documents =
      document.getElementById('editDocuments')?.value.trim() || '';

    data.application_method =
      document.getElementById('editApplicationMethod')?.value.trim() || '';

    data.official_link =
      document.getElementById('editOfficialLink')?.value.trim() || '';

    data.deadline =
      document.getElementById('editDeadline')?.value || null;
  }

  try {

    const saveButton = document.getElementById('adminSaveSchemeBtn');

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-1"></span>
        Saving...
      `;
    }

    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/schemes/${domain}/${schemeId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Unable to update scheme'
      );
    }

    // Close modal
    const modalElement =
      document.getElementById('adminEditSchemeModal');

    const modal =
      bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    toast('Scheme updated successfully!');

    // Refresh Admin Schemes table
    await renderAdminSchemes();

  } catch (error) {

    console.error('Save scheme error:', error);

    toast(
      error.message || 'Unable to update scheme',
      'error'
    );

  } finally {

    const saveButton =
      document.getElementById('adminSaveSchemeBtn');

    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = `
        <i class="bi bi-check-circle me-1"></i>
        Save Changes
      `;
    }
  }
}
// delete-admin scheme
let adminSchemeToDelete = null;

async function deleteAdminScheme(schemeId, domain) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/schemes/${domain}/${schemeId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load scheme');
    }

    adminSchemeToDelete = {
      id: schemeId,
      domain: domain,
      name: data.scheme.scheme_name || 'This scheme'
    };

    document.getElementById('adminDeleteSchemeName').textContent =
      adminSchemeToDelete.name;

    const modalElement =
      document.getElementById('adminDeleteSchemeModal');

    const modal =
      new bootstrap.Modal(modalElement);

    modal.show();

  } catch (error) {
    console.error('Delete scheme modal error:', error);

    toast(
      error.message || 'Unable to prepare scheme deletion',
      'error'
    );
  }
}

async function confirmDeleteAdminScheme() {

  if (
    !adminSchemeToDelete ||
    !adminSchemeToDelete.id ||
    !adminSchemeToDelete.domain
  ) {
    toast('No scheme selected for deletion', 'error');
    return;
  }

  const {
    id,
    domain
  } = adminSchemeToDelete;

  const deleteButton =
    document.getElementById('adminConfirmDeleteSchemeBtn');

  try {

    // Prevent double-click deletion
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-1"></span>
        Deleting...
      `;
    }

    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/schemes/${domain}/${id}`,
      {
        method: 'DELETE'
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Unable to delete scheme'
      );
    }

    // Close confirmation modal
    const modalElement =
      document.getElementById('adminDeleteSchemeModal');

    const modal =
      bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    // Clear selected scheme
    adminSchemeToDelete = null;

    toast('Scheme deleted successfully!');

    // Refresh schemes table
    await renderAdminSchemes();

  } catch (error) {

    console.error(
      'Delete scheme error:',
      error
    );

    toast(
      error.message ||
      'Unable to delete scheme',
      'error'
    );

  } finally {

    // Restore button
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.innerHTML = `
        <i class="bi bi-trash me-1"></i>
        Delete
      `;
    }
  }
}
// admin-add new scheme
function openAddAdminSchemeModal() {
  const body = document.getElementById('adminAddSchemeBody');

  body.innerHTML = `
    <div class="mb-3">
      <label class="form-label fw-semibold">
        Scheme Domain
      </label>

      <select
        class="form-select"
        id="adminAddSchemeDomain"
        onchange="renderAddSchemeFields()">

        <option value="">Select Scheme Domain</option>
        <option value="job_assistant">Job Assistant</option>
        <option value="women_rights">
          Women's Protection & Rights
        </option>
        <option value="government_finder">
          Government Scheme Finder
        </option>
      </select>
    </div>

    <div id="adminAddSchemeFields">
      <div class="text-muted text-center py-3">
        Select a scheme domain to continue.
      </div>
    </div>
  `;

  const modalElement =
    document.getElementById('adminAddSchemeModal');

  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}
function renderAddSchemeFields() {
  const domain =
    document.getElementById('adminAddSchemeDomain').value;

  const container =
    document.getElementById('adminAddSchemeFields');

  if (!domain) {
    container.innerHTML = `
      <div class="text-muted text-center py-3">
        Select a scheme domain to continue.
      </div>
    `;
    return;
  }

  if (domain === 'job_assistant') {
    container.innerHTML = `
      <div class="mb-3">
        <label class="form-label fw-semibold">Scheme Name</label>
        <input type="text" class="form-control" id="addSchemeName">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Ministry</label>
        <input type="text" class="form-control" id="addSchemeMinistry">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Scheme Type</label>
        <input type="text" class="form-control" id="addSchemeType">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Job Categories</label>
        <div id="addSchemeCategories">
          <div class="text-muted">Loading categories...</div>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Description</label>
        <textarea class="form-control" id="addSchemeDescription"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Eligibility</label>
        <textarea class="form-control" id="addSchemeEligibility"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Benefits</label>
        <textarea class="form-control" id="addSchemeBenefits"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Application Method</label>
        <textarea class="form-control" id="addSchemeApplication"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Official Link</label>
        <input type="url" class="form-control" id="addSchemeOfficialLink">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Status</label>
        <select class="form-select" id="addSchemeStatus">
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    `;

    loadAddJobCategories();
  }

  else if (domain === 'women_rights') {
    container.innerHTML = `
      <div class="mb-3">
        <label class="form-label fw-semibold">Scheme Name</label>
        <input type="text" class="form-control" id="addSchemeName">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Scheme Level</label>
        <input type="text" class="form-control" id="addSchemeLevel">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Category</label>
        <input type="text" class="form-control" id="addSchemeCategory">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Description</label>
        <textarea class="form-control" id="addSchemeDescription"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Eligibility</label>
        <textarea class="form-control" id="addSchemeEligibility"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Benefits</label>
        <textarea class="form-control" id="addSchemeBenefits"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Documents</label>
        <textarea class="form-control" id="addSchemeDocuments"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Application Method</label>
        <textarea class="form-control" id="addSchemeApplication"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Official Link</label>
        <input type="url" class="form-control" id="addSchemeOfficialLink">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Status</label>
        <select class="form-select" id="addSchemeStatus">
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Eligibility Tags</label>
        <input type="text" class="form-control" id="addSchemeEligibilityTags">
      </div>
    `;
  }

  else if (domain === 'government_finder') {
    container.innerHTML = `
      <div class="mb-3">
        <label class="form-label fw-semibold">Scheme Name</label>
        <input type="text" class="form-control" id="addSchemeName">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Department</label>
        <input type="text" class="form-control" id="addSchemeDepartment">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Scheme Category</label>
        <input type="text" class="form-control" id="addSchemeSchemeCategory">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Category</label>
        <input type="text" class="form-control" id="addSchemeCategory">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">State</label>
        <input type="text" class="form-control" id="addSchemeState">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Gender</label>
        <input type="text" class="form-control" id="addSchemeGender">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Occupation</label>
        <input type="text" class="form-control" id="addSchemeOccupation">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Age Group</label>
        <input type="text" class="form-control" id="addSchemeAgeGroup">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Income Range</label>
        <input type="text" class="form-control" id="addSchemeIncomeRange">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Description</label>
        <textarea class="form-control" id="addSchemeDescription"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Eligibility</label>
        <textarea class="form-control" id="addSchemeEligibility"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Benefits</label>
        <textarea class="form-control" id="addSchemeBenefits"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Documents</label>
        <textarea class="form-control" id="addSchemeDocuments"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Application Method</label>
        <textarea class="form-control" id="addSchemeApplication"></textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Official Link</label>
        <input type="url" class="form-control" id="addSchemeOfficialLink">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Deadline</label>
        <input type="date" class="form-control" id="addSchemeDeadline">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Status</label>
        <select class="form-select" id="addSchemeStatus">
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>
    `;
  }
}
async function loadAddJobCategories() {
  const container =
    document.getElementById('addSchemeCategories');

  if (!container) return;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/job-categories'
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error('Unable to load categories');
    }

    container.innerHTML = data.categories.map(category => `
      <div class="form-check mb-2">
        <input
          class="form-check-input add-scheme-category"
          type="checkbox"
          value="${category.id}"
          id="addCategory${category.id}">

        <label
          class="form-check-label"
          for="addCategory${category.id}">
          ${category.category_name}
        </label>
      </div>
    `).join('');

  } catch (error) {
    console.error('Load add scheme categories error:', error);

    container.innerHTML = `
      <div class="text-danger">
        Unable to load job categories.
      </div>
    `;
  }
}
async function saveNewAdminScheme() {
  const domain =
    document.getElementById('adminAddSchemeDomain').value;

  if (!domain) {
    toast('Please select a scheme domain', 'error');
    return;
  }

  const data = {
    domain: domain,
    scheme_name: document.getElementById('addSchemeName')?.value.trim()
  };

  if (!data.scheme_name) {
    toast('Scheme name is required', 'error');
    return;
  }

  if (domain === 'job_assistant') {
    data.ministry =
      document.getElementById('addSchemeMinistry')?.value.trim();

    data.scheme_type =
      document.getElementById('addSchemeType')?.value.trim();

    data.description =
      document.getElementById('addSchemeDescription')?.value.trim();

    data.eligibility =
      document.getElementById('addSchemeEligibility')?.value.trim();

    data.benefits =
      document.getElementById('addSchemeBenefits')?.value.trim();

    data.application_method =
      document.getElementById('addSchemeApplication')?.value.trim();

    data.official_link =
      document.getElementById('addSchemeOfficialLink')?.value.trim();

    data.status =
      document.getElementById('addSchemeStatus')?.value || 'Active';

    data.category_ids =
      Array.from(
        document.querySelectorAll('.add-scheme-category:checked')
      ).map(input => Number(input.value));
  }

  else if (domain === 'women_rights') {
    data.scheme_level =
      document.getElementById('addSchemeLevel')?.value.trim();

    data.category =
      document.getElementById('addSchemeCategory')?.value.trim();

    data.description =
      document.getElementById('addSchemeDescription')?.value.trim();

    data.eligibility =
      document.getElementById('addSchemeEligibility')?.value.trim();

    data.benefits =
      document.getElementById('addSchemeBenefits')?.value.trim();

    data.documents =
      document.getElementById('addSchemeDocuments')?.value.trim();

    data.application_method =
      document.getElementById('addSchemeApplication')?.value.trim();

    data.official_link =
      document.getElementById('addSchemeOfficialLink')?.value.trim();

    data.status =
      document.getElementById('addSchemeStatus')?.value || 'Active';

    data.eligibility_tags =
      document.getElementById('addSchemeEligibilityTags')?.value.trim();
  }

  else if (domain === 'government_finder') {
    data.department =
      document.getElementById('addSchemeDepartment')?.value.trim();

    data.scheme_category =
      document.getElementById('addSchemeSchemeCategory')?.value.trim();

    data.category =
      document.getElementById('addSchemeCategory')?.value.trim();

    data.state =
      document.getElementById('addSchemeState')?.value.trim();

    data.gender =
      document.getElementById('addSchemeGender')?.value.trim();

    data.occupation =
      document.getElementById('addSchemeOccupation')?.value.trim();

    data.age_group =
      document.getElementById('addSchemeAgeGroup')?.value.trim();

    data.income_range =
      document.getElementById('addSchemeIncomeRange')?.value.trim();

    data.description =
      document.getElementById('addSchemeDescription')?.value.trim();

    data.eligibility =
      document.getElementById('addSchemeEligibility')?.value.trim();

    data.benefits =
      document.getElementById('addSchemeBenefits')?.value.trim();

    data.documents =
      document.getElementById('addSchemeDocuments')?.value.trim();

    data.application_method =
      document.getElementById('addSchemeApplication')?.value.trim();

    data.official_link =
      document.getElementById('addSchemeOfficialLink')?.value.trim();

    data.deadline =
      document.getElementById('addSchemeDeadline')?.value || null;

    data.status =
      document.getElementById('addSchemeStatus')?.value || 'Active';
  }

  const button =
    document.getElementById('adminAddSchemeBtn');

  try {
    button.disabled = true;
    button.innerHTML = `
      <span class="spinner-border spinner-border-sm me-1"></span>
      Adding...
    `;

    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/schemes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Unable to add scheme'
      );
    }

    const modalElement =
      document.getElementById('adminAddSchemeModal');

    const modal =
      bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    toast('Scheme added successfully', 'success');

    await renderAdminSchemes();

  } catch (error) {
    console.error('Add scheme error:', error);

    toast(
      error.message || 'Unable to add scheme',
      'error'
    );

  } finally {
    button.disabled = false;
    button.innerHTML = `
      <i class="bi bi-plus-circle me-1"></i>
      Add Scheme
    `;
  }
}
let adminGeneratedDocuments = [];
async function loadAdminGeneratedDocuments() {

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/legal-documents'
    );

    if (!response.ok) {
      throw new Error('Admin legal documents API failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load generated documents'
      );
    }

    adminGeneratedDocuments = data.documents || [];

  } catch (error) {

    console.error(
      'Admin generated documents error:',
      error
    );

    adminGeneratedDocuments = [];

  }
}
async function renderAdminDocs() {

  const container = document.getElementById('adminDocsBody');

  if (!container) return;
  await loadAdminGeneratedDocuments();

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/legal-document-templates'
    );

    if (!response.ok) {
      throw new Error('Unable to load document templates');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load document templates'
      );
    }

    const templates = data.templates || [];

    container.innerHTML = `

      <div class="d-flex justify-content-between align-items-center mb-3">

        <h6 class="fw-bold mb-0">
          <i class="bi bi-file-earmark-text text-primary me-2"></i>
          Document Templates
        </h6>

        <button
          class="btn-grad-blue"
          onclick="openAddAdminDocumentModal()"
          <i class="bi bi-plus-circle me-1"></i>
          Add Template
        </button>

      </div>

      <div class="row g-3">

        ${
          templates.length
            ? templates.map(d => `

                <div class="col-md-4">

                  <div class="card-box text-center">

                    <i
                      class="bi ${d.icon || 'bi-file-earmark-text'} fs-2 mb-2 d-block"
                      style="color:${d.color || '#0d6efd'}">
                    </i>

                    <h6 class="fw-bold">
                      ${d.title || 'Untitled Template'}
                    </h6>

                    <p class="small text-muted mb-3">
  Legal Document Template
</p>

                    <div class="d-flex justify-content-center gap-2">

                      <button
                        class="btn btn-sm btn-outline-warning"
                        onclick="openEditAdminDocumentModal('${d.id}')">
                        <i class="bi bi-pencil"></i>
                      </button>

                    <button
  class="btn btn-sm btn-outline-danger"
  onclick="deleteAdminDocumentTemplate('${d.id}')">
  <i class="bi bi-trash"></i>
</button>

                    </div>

                  </div>

                </div>

              `).join('')

            : `

                <div class="col-12">

                  <div class="alert alert-info">
                    No document templates found.
                  </div>

                </div>

              `
        }

      </div>

      <hr class="my-4"/>

      <h6 class="fw-bold mb-3">
        <i class="bi bi-file-earmark-bar-fill text-success me-2"></i>
        Generated Documents
      </h6>

      <div class="table-responsive">

        <table class="table table-hover">

          <thead>

            <tr>
              <th>Document Type</th>
              <th>User</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            ${
  adminGeneratedDocuments && adminGeneratedDocuments.length
    ? adminGeneratedDocuments.map(d => `

        <tr>

          <td>
            ${d.title || 'Document'}
          </td>

          <td>
            ${d.user_name || 'Unknown User'}
          </td>

          <td class="small">
            ${d.saved_at || '-'}
          </td>

          <td>

            <button
              class="btn btn-sm btn-outline-info"
              onclick="viewAdminGeneratedDocument('${d.id}')">

              <i class="bi bi-eye"></i>

            </button>

          </td>

        </tr>

      `).join('')

    : `

        <tr>

          <td
            colspan="4"
            class="text-center text-muted py-3">

            No documents generated yet.

          </td>

        </tr>

      `
}

          </tbody>

        </table>

      </div>
    `;

  } catch (error) {

    console.error('Admin document templates error:', error);

    container.innerHTML = `

      <div class="alert alert-danger">

        Unable to load document templates.

      </div>

    `;

  }
}
function openAddAdminDocumentModal() {

  const body = document.getElementById('adminAddDocumentBody');

  if (!body) return;

  body.innerHTML = `
    <div class="mb-3">
      <label class="form-label fw-semibold">Template ID</label>
      <input
        type="text"
        class="form-control"
        id="addDocumentTemplateId"
        placeholder="Example: birth_certificate">
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Title</label>
      <input
        type="text"
        class="form-control"
        id="addDocumentTitle"
        placeholder="Example: Birth Certificate Request">
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Icon</label>
      <input
        type="text"
        class="form-control"
        id="addDocumentIcon"
        placeholder="Example: bi-file-earmark-text">
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Color</label>
      <input
        type="text"
        class="form-control"
        id="addDocumentColor"
        placeholder="Example: #0d6efd">
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Template Content</label>
      <textarea
        class="form-control"
        id="addDocumentTemplateContent"></textarea>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Submission Place</label>
      <textarea
        class="form-control"
        id="addDocumentSubmissionPlace"></textarea>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Required Documents</label>
      <textarea
        class="form-control"
        id="addDocumentRequiredDocuments"
        placeholder="Separate multiple documents with |"></textarea>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Next Steps</label>
      <textarea
        class="form-control"
        id="addDocumentNextSteps"
        placeholder="Separate multiple steps with |"></textarea>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Checklist Items</label>
      <textarea
        class="form-control"
        id="addDocumentChecklistItems"
        placeholder="Separate multiple items with |"></textarea>
    </div>
  `;

  const modalElement =
    document.getElementById('adminAddDocumentModal');

  const modal =
    bootstrap.Modal.getOrCreateInstance(modalElement);

  modal.show();
}
async function saveNewAdminDocumentTemplate() {

  const templateId = document.getElementById('addDocumentTemplateId').value.trim();
  const title = document.getElementById('addDocumentTitle').value.trim();
  const icon = document.getElementById('addDocumentIcon').value.trim();
  const color = document.getElementById('addDocumentColor').value.trim();
  const templateContent = document.getElementById('addDocumentTemplateContent').value.trim();
  const submissionPlace = document.getElementById('addDocumentSubmissionPlace').value.trim();
  const requiredDocuments = document.getElementById('addDocumentRequiredDocuments').value.trim();
  const nextSteps = document.getElementById('addDocumentNextSteps').value.trim();
  const checklistItems = document.getElementById('addDocumentChecklistItems').value.trim();

  if (!templateId || !title || !templateContent) {
    toast('Please fill Template ID, Title and Template Content');
    return;
  }

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/legal-document-templates',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: templateId,
          title: title,
          icon: icon,
          color: color,
          template_content: templateContent,
          submission_place: submissionPlace,
          required_documents: requiredDocuments,
          next_steps: nextSteps,
          checklist_items: checklistItems
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      toast(data.message || 'Failed to add document template');
      return;
    }

    toast('Document template added successfully');

    const modalElement =
      document.getElementById('adminAddDocumentModal');

    const modal =
      bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    await renderAdminDocs();

  } catch (error) {

    console.error('Add document template error:', error);

    toast('Unable to add document template');

  }
}
async function openEditAdminDocumentModal(templateId) {

  const body = document.getElementById('adminEditDocumentBody');

  if (!body) return;

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/legal-document-templates/${templateId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      toast(data.message || 'Unable to load template');
      return;
    }

    const d = data.template;

    body.innerHTML = `
      <div class="mb-3">
        <label class="form-label fw-semibold">Template ID</label>
        <input
          type="text"
          class="form-control"
          value="${d.id || ''}"
          disabled>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Title</label>
        <input
          type="text"
          class="form-control"
          id="editDocumentTitle"
          value="${d.title || ''}">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Icon</label>
        <input
          type="text"
          class="form-control"
          id="editDocumentIcon"
          value="${d.icon || ''}">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Color</label>
        <input
          type="text"
          class="form-control"
          id="editDocumentColor"
          value="${d.color || ''}">
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Template Content</label>
        <textarea
          class="form-control"
          id="editDocumentTemplateContent">${d.template_content || ''}</textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Submission Place</label>
        <textarea
          class="form-control"
          id="editDocumentSubmissionPlace">${d.submission_place || ''}</textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Required Documents</label>
        <textarea
          class="form-control"
          id="editDocumentRequiredDocuments">${d.required_documents || ''}</textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Next Steps</label>
        <textarea
          class="form-control"
          id="editDocumentNextSteps">${d.next_steps || ''}</textarea>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold">Checklist Items</label>
        <textarea
          class="form-control"
          id="editDocumentChecklistItems">${d.checklist_items || ''}</textarea>
      </div>

      <input
        type="hidden"
        id="editDocumentTemplateId"
        value="${d.id || ''}">
    `;

    const modalElement =
      document.getElementById('adminEditDocumentModal');

    const modal =
      bootstrap.Modal.getOrCreateInstance(modalElement);

    modal.show();

  } catch (error) {

    console.error('Edit document template error:', error);

    toast('Unable to load document template');

  }
}
async function updateAdminDocumentTemplate() {

  const templateId =
    document.getElementById('editDocumentTemplateId').value;

  const title =
    document.getElementById('editDocumentTitle').value.trim();

  const icon =
    document.getElementById('editDocumentIcon').value.trim();

  const color =
    document.getElementById('editDocumentColor').value.trim();

  const templateContent =
    document.getElementById('editDocumentTemplateContent').value.trim();

  const submissionPlace =
    document.getElementById('editDocumentSubmissionPlace').value.trim();

  const requiredDocuments =
    document.getElementById('editDocumentRequiredDocuments').value.trim();

  const nextSteps =
    document.getElementById('editDocumentNextSteps').value.trim();

  const checklistItems =
    document.getElementById('editDocumentChecklistItems').value.trim();

  if (!title || !templateContent) {
    toast('Please fill Title and Template Content');
    return;
  }

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/legal-document-templates/${templateId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          icon: icon,
          color: color,
          template_content: templateContent,
          submission_place: submissionPlace,
          required_documents: requiredDocuments,
          next_steps: nextSteps,
          checklist_items: checklistItems
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      toast(data.message || 'Failed to update template');
      return;
    }

    toast('Document template updated successfully');

    const modalElement =
      document.getElementById('adminEditDocumentModal');

    const modal =
      bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    await renderAdminDocs();

  } catch (error) {

    console.error('Update document template error:', error);

    toast('Unable to update document template');

  }
}
async function deleteAdminDocumentTemplate(templateId) {

  const modalElement =
    document.getElementById('adminDeleteDocumentModal');

  const confirmButton =
    document.getElementById('confirmDeleteDocumentBtn');

  if (!modalElement || !confirmButton) return;

  confirmButton.onclick = async function () {

    try {

      const response = await fetch(
        `http://127.0.0.1:5000/api/admin/legal-document-templates/${templateId}`,
        {
          method: 'DELETE'
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast(data.message || 'Failed to delete template');
        return;
      }

      const modal =
        bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      toast('Document template deleted successfully');

      await renderAdminDocs();

    } catch (error) {

      console.error('Delete document template error:', error);

      toast('Unable to delete document template');

    }
  };

  const modal =
    bootstrap.Modal.getOrCreateInstance(modalElement);

  modal.show();
}
async function viewAdminGeneratedDocument(documentId) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/legal-documents/${documentId}`
    );

    const data = await response.json();

    if (!data.success) {
      alert(data.message || 'Unable to load document');
      return;
    }

    const doc = data.document;

    document.getElementById('adminViewDocumentBody').innerHTML = `
      <h5 class="fw-bold mb-3">${doc.title || 'Generated Document'}</h5>

      <p class="text-muted small mb-3">
        Saved on: ${doc.saved_at || '-'}
      </p>

      <div class="document-content">
        ${doc.document_content || 'No document content available.'}
      </div>
    `;

    const modal = new bootstrap.Modal(
      document.getElementById('adminViewDocumentModal')
    );

    modal.show();

  } catch (error) {
    console.error('View generated document error:', error);
    alert('Unable to load generated document.');
  }
}
async function renderAdminContent() {
  const container = document.getElementById('adminContentBody');
  if (!container) return;

  try {
    // ================= LEGAL RIGHTS =================

    const rightsResponse = await fetch(
      'http://127.0.0.1:5000/api/women/legal-rights'
    );

    const rightsData = await rightsResponse.json();

    if (!rightsData.success) {
      throw new Error(rightsData.message);
    }

    const rights = rightsData.rights || [];

    // ================= EVIDENCE CHECKLISTS =================

    const evidenceResponse = await fetch(
      'http://127.0.0.1:5000/api/women/evidence-checklists'
    );

    const evidenceData = await evidenceResponse.json();

    if (!evidenceData.success) {
      throw new Error(evidenceData.message);
    }

    const checklists = evidenceData.checklists || [];

    // ================= LEGAL AID =================

    const aidResponse = await fetch(
      'http://127.0.0.1:5000/api/women/legal-aid'
    );

    const aidData = await aidResponse.json();

    if (!aidData.success) {
      throw new Error(aidData.message);
    }

    const legalAid = aidData.legal_aid || [];

    // ================= AWARENESS ARTICLES =================

    const articlesResponse = await fetch(
      'http://127.0.0.1:5000/api/women/awareness-articles'
    );

    const articlesData = await articlesResponse.json();

    if (!articlesData.success) {
      throw new Error(articlesData.message);
    }

    const articles = articlesData.articles || [];

    // ================= ADMIN CONTENT =================

    container.innerHTML = `

      <!-- ================= LEGAL RIGHTS ================= -->

      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 class="fw-bold mb-1">
            <i class="bi bi-shield-check text-primary me-2"></i>
            Legal Rights
          </h6>

          <p class="small text-muted mb-0">
            ${rights.length} legal rights records
          </p>
        </div>

        <button class="btn-grad-blue"
                onclick="openAddWomenRightModal()">
          <i class="bi bi-plus-circle me-1"></i>
          Add Right
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Category</th>
              <th>Right</th>
              <th>Law</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              rights.length
                ? rights.map(r => `
                    <tr>
                      <td>${r.category_title || '-'}</td>
                      <td>${r.right_title || '-'}</td>
                      <td>${r.law || '-'}</td>

                      <td>
                        <button
                          class="btn btn-sm btn-outline-warning"
                          onclick="openEditWomenRightModal(${r.id})">
                          <i class="bi bi-pencil"></i>
                        </button>

                        <button
                          class="btn btn-sm btn-outline-danger"
                          onclick="deleteWomenRight(${r.id})">
                          <i class="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')
                : `
                    <tr>
                      <td colspan="4"
                          class="text-center text-muted py-3">
                        No legal rights found.
                      </td>
                    </tr>
                  `
            }
          </tbody>
        </table>
      </div>


      <!-- ================= EVIDENCE CHECKLISTS ================= -->

      <hr class="my-4">

      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 class="fw-bold mb-1">
            <i class="bi bi-check2-square text-success me-2"></i>
            Evidence Checklists
          </h6>

          <p class="small text-muted mb-0">
            ${checklists.length} evidence checklist records
          </p>
        </div>

        <button class="btn btn-outline-success"
                onclick="openAddEvidenceChecklistModal()">
          <i class="bi bi-plus-circle me-1"></i>
          Add Checklist
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Situation</th>
              <th>Evidence Item</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              checklists.length
                ? checklists.map(c => `
                    <tr>
                      <td>${c.situation_title || '-'}</td>
                      <td>${c.evidence_item || '-'}</td>

                      <td>
                        <button
                          class="btn btn-sm btn-outline-warning"
                          onclick="openEditEvidenceChecklistModal(${c.id})">
                          <i class="bi bi-pencil"></i>
                        </button>

                        <button
                          class="btn btn-sm btn-outline-danger"
                          onclick="deleteEvidenceChecklist(${c.id})">
                          <i class="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')
                : `
                    <tr>
                      <td colspan="3"
                          class="text-center text-muted py-3">
                        No evidence checklists found.
                      </td>
                    </tr>
                  `
            }
          </tbody>
        </table>
      </div>


      <!-- ================= LEGAL AID & HELPLINES ================= -->

      <hr class="my-4">

      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 class="fw-bold mb-1">
            <i class="bi bi-telephone text-danger me-2"></i>
            Legal Aid & Helplines
          </h6>

          <p class="small text-muted mb-0">
            ${legalAid.length} legal aid and helpline records
          </p>
        </div>

        <button class="btn btn-outline-danger"
                onclick="openAddLegalAidModal()">
          <i class="bi bi-plus-circle me-1"></i>
          Add Helpline
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              legalAid.length
                ? legalAid.map(a => `
                    <tr>
                      <td>${a.name || '-'}</td>
                      <td>${a.purpose || '-'}</td>
                      <td>${a.contact || '-'}</td>

                      <td>
                        <button
                          class="btn btn-sm btn-outline-warning"
                          onclick="openEditLegalAidModal(${a.id})">
                          <i class="bi bi-pencil"></i>
                        </button>

                        <button
                          class="btn btn-sm btn-outline-danger"
                          onclick="deleteLegalAid(${a.id})">
                          <i class="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')
                : `
                    <tr>
                      <td colspan="4"
                          class="text-center text-muted py-3">
                        No legal aid and helpline records found.
                      </td>
                    </tr>
                  `
            }
          </tbody>
        </table>
      </div>


      <!-- ================= AWARENESS ARTICLES ================= -->

      <hr class="my-4">

      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 class="fw-bold mb-1">
            <i class="bi bi-newspaper text-info me-2"></i>
            Awareness Articles
          </h6>

          <p class="small text-muted mb-0">
            ${articles.length} awareness article records
          </p>
        </div>

        <button class="btn btn-outline-info"
                onclick="openAddAwarenessArticleModal()">
          <i class="bi bi-plus-circle me-1"></i>
          Add Article
        </button>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Author</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${
              articles.length
                ? articles.map(a => `
                    <tr>
                      <td>${a.title || '-'}</td>
                      <td>${a.category || '-'}</td>
                      <td>${a.author || '-'}</td>
                      <td>${a.article_date || '-'}</td>

                      <td>
                        <button
                          class="btn btn-sm btn-outline-warning"
                          onclick="openEditAwarenessArticleModal(${a.id})">
                          <i class="bi bi-pencil"></i>
                        </button>

                        <button
                          class="btn btn-sm btn-outline-danger"
                          onclick="deleteAwarenessArticle(${a.id})">
                          <i class="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')
                : `
                    <tr>
                      <td colspan="5"
                          class="text-center text-muted py-3">
                        No awareness articles found.
                      </td>
                    </tr>
                  `
            }
          </tbody>
        </table>
      </div>

    `;

  } catch (error) {
    console.error('Admin content error:', error);

    container.innerHTML = `
      <div class="alert alert-danger">
        Unable to load admin content.
      </div>
    `;
  }
}
async function openAddWomenRightModal() {
  document.getElementById('womenRightModalTitle').textContent = 'Add Legal Right';
  document.getElementById('womenRightId').value = '';

  [
    'womenRightCategoryId',
    'womenRightCategoryTitle',
    'womenRightCategoryIcon',
    'womenRightCategoryColor',
    'womenRightCategoryDescription',
    'womenRightTitle',
    'womenRightDescription',
    'womenRightKeyPoints',
    'womenRightLaw',
    'womenRightAction'
  ].forEach(id => document.getElementById(id).value = '');

  new bootstrap.Modal(document.getElementById('womenRightModal')).show();
}


async function openEditWomenRightModal(id) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/women/legal-rights`
    );
    const data = await response.json();
    const right = data.rights.find(r => r.id == id);

    if (!right) return alert('Legal right not found.');

    document.getElementById('womenRightModalTitle').textContent = 'Edit Legal Right';
    document.getElementById('womenRightId').value = right.id;

    document.getElementById('womenRightCategoryId').value = right.category_id || '';
    document.getElementById('womenRightCategoryTitle').value = right.category_title || '';
    document.getElementById('womenRightCategoryIcon').value = right.category_icon || '';
    document.getElementById('womenRightCategoryColor').value = right.category_color || '';
    document.getElementById('womenRightCategoryDescription').value = right.category_description || '';
    document.getElementById('womenRightTitle').value = right.right_title || '';
    document.getElementById('womenRightDescription').value = right.right_description || '';
    document.getElementById('womenRightKeyPoints').value = right.key_points || '';
    document.getElementById('womenRightLaw').value = right.law || '';
    document.getElementById('womenRightAction').value = right.action || '';

    new bootstrap.Modal(document.getElementById('womenRightModal')).show();

  } catch (error) {
    console.error(error);
    alert('Unable to load legal right.');
  }
}


async function saveWomenRight() {
  const id = document.getElementById('womenRightId').value;

  const data = {
    category_id: document.getElementById('womenRightCategoryId').value,
    category_title: document.getElementById('womenRightCategoryTitle').value,
    category_icon: document.getElementById('womenRightCategoryIcon').value,
    category_color: document.getElementById('womenRightCategoryColor').value,
    category_description: document.getElementById('womenRightCategoryDescription').value,
    right_title: document.getElementById('womenRightTitle').value,
    right_description: document.getElementById('womenRightDescription').value,
    key_points: document.getElementById('womenRightKeyPoints').value,
    law: document.getElementById('womenRightLaw').value,
    action: document.getElementById('womenRightAction').value
  };

  try {
    const url = id
      ? `http://127.0.0.1:5000/api/admin/women/legal-rights/${id}`
      : 'http://127.0.0.1:5000/api/admin/women/legal-rights';

    const response = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to save legal right.');
      return;
    }

    bootstrap.Modal.getInstance(
      document.getElementById('womenRightModal')
    ).hide();

    await renderAdminContent();
    await renderRights();

    toast(
      id
        ? 'Legal right updated successfully.'
        : 'Legal right added successfully.'
    );

  } catch (error) {
    console.error('Save legal right error:', error);
    toast('Unable to save legal right.');
  }
}
let womenRightToDelete = null;

function deleteWomenRight(id) {
  womenRightToDelete = id;

  const modal = new bootstrap.Modal(
    document.getElementById('deleteWomenRightModal')
  );

  modal.show();
}

async function confirmDeleteWomenRight() {
  if (!womenRightToDelete) return;

  const id = womenRightToDelete;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/women/legal-rights/${id}`,
      {
        method: 'DELETE'
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to delete legal right.');
      return;
    }

    bootstrap.Modal.getInstance(
      document.getElementById('deleteWomenRightModal')
    ).hide();

    womenRightToDelete = null;

    await renderAdminContent();
    await renderRights();

    toast('Legal right deleted successfully.');

  } catch (error) {
    console.error('Delete legal right error:', error);
    toast('Unable to delete legal right.');
  }
}
function openAddEvidenceChecklistModal() {
  document.getElementById('evidenceChecklistModalTitle').textContent =
    'Add Evidence Checklist';

  document.getElementById('evidenceChecklistId').value = '';

  [
    'evidenceSituationId',
    'evidenceSituationTitle',
    'evidenceSituationIcon',
    'evidenceSituationColor',
    'evidenceItem'
  ].forEach(id => {
    document.getElementById(id).value = '';
  });

  new bootstrap.Modal(
    document.getElementById('evidenceChecklistModal')
  ).show();
}
async function saveEvidenceChecklist() {
  const modal = document.getElementById('evidenceChecklistModal');

  const id = modal.querySelector('#evidenceChecklistId').value.trim();
  const situationId = modal.querySelector('#evidenceSituationId').value.trim();
  const situationTitle = modal.querySelector('#evidenceSituationTitle').value.trim();
  const situationIcon = modal.querySelector('#evidenceSituationIcon').value.trim();
  const situationColor = modal.querySelector('#evidenceSituationColor').value.trim();
  const evidenceItem = modal.querySelector('#evidenceItem').value.trim();

  if (!situationId || !situationTitle || !evidenceItem) {
    toast('Please fill Situation ID, Situation Title and Evidence Item.');
    return;
  }

  const data = {
    situation_id: situationId,
    situation_title: situationTitle,
    situation_icon: situationIcon || 'bi-check2-square',
    situation_color: situationColor || '#198754',
    evidence_item: evidenceItem
  };

  try {
    const url = id
      ? `http://127.0.0.1:5000/api/admin/women/evidence-checklists/${id}`
      : 'http://127.0.0.1:5000/api/admin/women/evidence-checklists';

    const response = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to save evidence checklist.');
      return;
    }

    const modalInstance = bootstrap.Modal.getInstance(modal);

    if (modalInstance) {
      modalInstance.hide();
    }

    await renderAdminContent();
    await loadEvidenceChecklists();

    toast(
      id
        ? 'Evidence checklist updated successfully.'
        : 'Evidence checklist added successfully.'
    );

  } catch (error) {
    console.error('Save evidence checklist error:', error);
    toast('Unable to save evidence checklist.');
  }
}
async function openEditEvidenceChecklistModal(id) {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/evidence-checklists'
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to load checklist.');
      return;
    }

    const checklist = data.checklists.find(c => c.id == id);

    if (!checklist) {
      toast('Evidence checklist not found.');
      return;
    }

    document.getElementById('evidenceChecklistModalTitle').textContent =
      'Edit Evidence Checklist';

    document.getElementById('evidenceChecklistId').value = checklist.id;
    document.getElementById('evidenceSituationId').value =
      checklist.situation_id || '';
    document.getElementById('evidenceSituationTitle').value =
      checklist.situation_title || '';
    document.getElementById('evidenceSituationIcon').value =
      checklist.situation_icon || '';
    document.getElementById('evidenceSituationColor').value =
      checklist.situation_color || '';
    document.getElementById('evidenceItem').value =
      checklist.evidence_item || '';

    new bootstrap.Modal(
      document.getElementById('evidenceChecklistModal')
    ).show();

  } catch (error) {
    console.error('Edit evidence checklist error:', error);
    toast('Unable to load evidence checklist.');
  }
}
let evidenceChecklistToDelete = null;


function deleteEvidenceChecklist(id) {
  evidenceChecklistToDelete = id;

  const modal = new bootstrap.Modal(
    document.getElementById('deleteEvidenceChecklistModal')
  );

  modal.show();
}


async function confirmDeleteEvidenceChecklist() {
  if (!evidenceChecklistToDelete) return;

  const id = evidenceChecklistToDelete;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/women/evidence-checklists/${id}`,
      {
        method: 'DELETE'
      }
    );

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to delete evidence checklist.');
      return;
    }

    const modalElement =
      document.getElementById('deleteEvidenceChecklistModal');

    const modalInstance =
      bootstrap.Modal.getInstance(modalElement);

    if (modalInstance) {
      modalInstance.hide();
    }

    evidenceChecklistToDelete = null;

    await renderAdminContent();
   await loadEvidenceChecklists();

    toast('Evidence checklist deleted successfully.');

  } catch (error) {
    console.error('Delete evidence checklist error:', error);
    toast('Unable to delete evidence checklist.');
  }
}
function openAddLegalAidModal() {
  document.getElementById('legalAidModalTitle').textContent =
    'Add Legal Aid / Helpline';

  document.getElementById('legalAidId').value = '';

  [
    'legalAidName',
    'legalAidContact',
    'legalAidIcon',
    'legalAidColor',
    'legalAidPurpose',
    'legalAidWhoCanUse',
    'legalAidWebsite',
    'legalAidDescription'
  ].forEach(id => {
    document.getElementById(id).value = '';
  });

  new bootstrap.Modal(
    document.getElementById('legalAidModal')
  ).show();
}
async function saveLegalAid() {
  const id = document.getElementById('legalAidId').value.trim();

  const data = {
    name: document.getElementById('legalAidName').value.trim(),
    contact: document.getElementById('legalAidContact').value.trim(),
    icon: document.getElementById('legalAidIcon').value.trim(),
    color: document.getElementById('legalAidColor').value.trim(),
    purpose: document.getElementById('legalAidPurpose').value.trim(),
    who_can_use: document.getElementById('legalAidWhoCanUse').value.trim(),
    website: document.getElementById('legalAidWebsite').value.trim(),
    description: document.getElementById('legalAidDescription').value.trim()
  };

  if (!data.name) {
    toast('Please enter the name.');
    return;
  }

  try {
    const url = id
      ? `http://127.0.0.1:5000/api/admin/women/legal-aid/${id}`
      : 'http://127.0.0.1:5000/api/admin/women/legal-aid';

    const response = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to save legal aid.');
      return;
    }

    bootstrap.Modal.getInstance(
      document.getElementById('legalAidModal')
    ).hide();

    await renderAdminContent();
    await loadLegalAid();

    toast(
      id
        ? 'Legal aid / helpline updated successfully.'
        : 'Legal aid / helpline added successfully.'
    );

  } catch (error) {
    console.error('Save legal aid error:', error);
    toast('Unable to save legal aid.');
  }
}
async function openEditLegalAidModal(id) {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/legal-aid'
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to load legal aid.');
      return;
    }

    const aid = data.legal_aid.find(a => a.id == id);

    if (!aid) {
      toast('Legal aid record not found.');
      return;
    }

    document.getElementById('legalAidModalTitle').textContent =
      'Edit Legal Aid / Helpline';

    document.getElementById('legalAidId').value = aid.id;

    document.getElementById('legalAidName').value =
      aid.name || '';

    document.getElementById('legalAidContact').value =
      aid.contact || '';

    document.getElementById('legalAidIcon').value =
      aid.icon || '';

    document.getElementById('legalAidColor').value =
      aid.color || '';

    document.getElementById('legalAidPurpose').value =
      aid.purpose || '';

    document.getElementById('legalAidWhoCanUse').value =
      aid.who_can_use || '';

    document.getElementById('legalAidWebsite').value =
      aid.website || '';

    document.getElementById('legalAidDescription').value =
      aid.description || '';

    new bootstrap.Modal(
      document.getElementById('legalAidModal')
    ).show();

  } catch (error) {
    console.error('Edit legal aid error:', error);
    toast('Unable to load legal aid.');
  }
}
let legalAidToDelete = null;

function deleteLegalAid(id) {
  legalAidToDelete = id;

  const modal = new bootstrap.Modal(
    document.getElementById('deleteLegalAidModal')
  );

  modal.show();
}

async function confirmDeleteLegalAid() {
  if (!legalAidToDelete) return;

  const id = legalAidToDelete;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/women/legal-aid/${id}`,
      {
        method: 'DELETE'
      }
    );

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to delete legal aid.');
      return;
    }

    const modalElement =
      document.getElementById('deleteLegalAidModal');

    const modalInstance =
      bootstrap.Modal.getInstance(modalElement);

    if (modalInstance) {
      modalInstance.hide();
    }

    legalAidToDelete = null;

    await renderAdminContent();
    await loadLegalAid();

    toast('Legal aid / helpline deleted successfully.');

  } catch (error) {
    console.error('Delete legal aid error:', error);
    toast('Unable to delete legal aid.');
  }
}
function openAddAwarenessArticleModal() {
  document.getElementById('awarenessArticleModalTitle').textContent =
    'Add Awareness Article';

  document.getElementById('awarenessArticleId').value = '';

  [
    'awarenessArticleTitle',
    'awarenessArticleCategory',
    'awarenessArticleExcerpt',
    'awarenessArticleContent',
    'awarenessArticleDate',
    'awarenessArticleAuthor'
  ].forEach(id => {
    document.getElementById(id).value = '';
  });

  new bootstrap.Modal(
    document.getElementById('awarenessArticleModal')
  ).show();
}
async function saveAwarenessArticle() {
  const id = document.getElementById('awarenessArticleId').value.trim();

  const data = {
    title: document.getElementById('awarenessArticleTitle').value.trim(),
    category: document.getElementById('awarenessArticleCategory').value.trim(),
    excerpt: document.getElementById('awarenessArticleExcerpt').value.trim(),
    content: document.getElementById('awarenessArticleContent').value.trim(),
    article_date: document.getElementById('awarenessArticleDate').value,
    author: document.getElementById('awarenessArticleAuthor').value.trim()
  };

  if (!data.title || !data.category || !data.content) {
    toast('Please fill Title, Category and Content.');
    return;
  }

  try {
    const url = id
      ? `http://127.0.0.1:5000/api/admin/women/awareness-articles/${id}`
      : 'http://127.0.0.1:5000/api/admin/women/awareness-articles';

    const response = await fetch(url, {
      method: id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to save awareness article.');
      return;
    }

    bootstrap.Modal.getInstance(
      document.getElementById('awarenessArticleModal')
    ).hide();

    await renderAdminContent();
    await loadAwarenessArticles();

    toast(
      id
        ? 'Awareness article updated successfully.'
        : 'Awareness article added successfully.'
    );

  } catch (error) {
    console.error('Save awareness article error:', error);
    toast('Unable to save awareness article.');
  }
}
async function openEditAwarenessArticleModal(id) {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/women/awareness-articles'
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to load awareness articles.');
      return;
    }

    const article = data.articles.find(a => a.id == id);

    if (!article) {
      toast('Awareness article not found.');
      return;
    }

    document.getElementById('awarenessArticleModalTitle').textContent =
      'Edit Awareness Article';

    document.getElementById('awarenessArticleId').value =
      article.id;

    document.getElementById('awarenessArticleTitle').value =
      article.title || '';

    document.getElementById('awarenessArticleCategory').value =
      article.category || '';

    document.getElementById('awarenessArticleExcerpt').value =
      article.excerpt || '';

    document.getElementById('awarenessArticleContent').value =
      article.content || '';

    document.getElementById('awarenessArticleDate').value =
      article.article_date
        ? String(article.article_date).substring(0, 10)
        : '';

    document.getElementById('awarenessArticleAuthor').value =
      article.author || '';

    new bootstrap.Modal(
      document.getElementById('awarenessArticleModal')
    ).show();

  } catch (error) {
    console.error('Edit awareness article error:', error);
    toast('Unable to load awareness article.');
  }
}
let awarenessArticleToDelete = null;

function deleteAwarenessArticle(id) {
  awarenessArticleToDelete = id;

  const modal = new bootstrap.Modal(
    document.getElementById('deleteAwarenessArticleModal')
  );

  modal.show();
}

async function confirmDeleteAwarenessArticle() {
  if (!awarenessArticleToDelete) return;

  const id = awarenessArticleToDelete;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/women/awareness-articles/${id}`,
      {
        method: 'DELETE'
      }
    );

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to delete awareness article.');
      return;
    }

    const modalElement =
      document.getElementById('deleteAwarenessArticleModal');

    const modalInstance =
      bootstrap.Modal.getInstance(modalElement);

    if (modalInstance) {
      modalInstance.hide();
    }

    awarenessArticleToDelete = null;

    await renderAdminContent();
    await loadAwarenessArticles();

    toast('Awareness article deleted successfully.');

  } catch (error) {
    console.error('Delete awareness article error:', error);
    toast('Unable to delete awareness article.');
  }
}
async function renderAdminComm() {
  const container = document.getElementById('adminCommBody');
  if (!container) return;

  container.innerHTML = `
    <div class="row g-3">

      <div class="col-md-7">
        <div class="card-box">

          <h6 class="fw-bold mb-3">
            <i class="bi bi-chat-dots text-primary me-2"></i>
            Feedback &amp; Messages
          </h6>

          <div id="adminFeedbackList">
            <div class="text-center text-muted py-3">
              <div class="spinner-border spinner-border-sm me-2"></div>
              Loading feedback...
            </div>
          </div>

        </div>
      </div>

      <!-- SEND NOTIFICATION -->

      <div class="col-md-5">
        <div class="card-box">

          <h6 class="fw-bold mb-3">
            <i class="bi bi-megaphone-fill text-success me-2"></i>
            Send Notification
          </h6>

          <div class="mb-3">

            <label class="form-label fw-semibold small">
              Target Audience
            </label>

            <select
              class="form-select form-select-sm"
              id="adminNotificationAudience">

              <option value="ALL">
                All Users
              </option>

              <option value="CITIZENS">
                Citizens Only
              </option>

              <option value="WORKERS">
                Workers Only
              </option>

            </select>

          </div>

          <div class="mb-3">

            <label class="form-label fw-semibold small">
              Title
            </label>

            <input
              class="form-control form-control-sm"
              id="adminNotificationTitle"
              placeholder="Notification title">

          </div>

          <div class="mb-3">

            <label class="form-label fw-semibold small">
              Message
            </label>

            <textarea
              class="form-control form-control-sm"
              id="adminNotificationMessage"
              rows="3"
              placeholder="Type your message..."></textarea>

          </div>

          <button
            class="btn-grad-green w-100"
            onclick="sendAdminNotification()">

            <i class="bi bi-send-fill me-1"></i>
            Send Notification

          </button>

        </div>
      </div>

    </div>
  `;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/feedback'
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Unable to load feedback');
    }

    const feedback = data.feedback || [];
    const feedbackList = document.getElementById('adminFeedbackList');

    if (!feedback.length) {
      feedbackList.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-chat-square-text fs-3 d-block mb-2"></i>
          No feedback messages yet.
        </div>
      `;
      return;
    }

    feedbackList.innerHTML = feedback.map(f => `
      <div class="admin-fb-item">

        <div class="d-flex justify-content-between align-items-start">

          <div>
            <strong class="small">
              ${f.user_name || 'Unknown User'}
            </strong>

            <span
              class="badge ${
                f.status === 'NEW'
                  ? 'bg-danger'
                  : 'bg-secondary'
              } ms-1"
              style="font-size:.65rem">
              ${f.status || 'NEW'}
            </span>
          </div>

          <small class="text-muted">
            ${
              f.created_at
                ? new Date(f.created_at).toLocaleDateString()
                : '-'
            }
          </small>

        </div>

        <p class="small fw-semibold mb-1 mt-1">
          ${f.subject || 'No Subject'}
        </p>

        <p class="small text-muted mb-2">
          ${f.message || ''}
        </p>

        <div class="d-flex gap-1">

          <button
            class="btn btn-sm btn-outline-primary"
            onclick="markFeedbackAsRead(${f.id})"
            title="Mark as Read">
            <i class="bi bi-check2"></i>
          </button>

          <button
            class="btn btn-sm btn-outline-info"
            onclick="replyToFeedback(${f.id})"
            title="Reply">
            <i class="bi bi-reply"></i>
          </button>

          <button
            class="btn btn-sm btn-outline-danger"
            onclick="deleteFeedback(${f.id})"
            title="Delete">
            <i class="bi bi-trash"></i>
          </button>

        </div>

      </div>
    `).join('');

  } catch (error) {
    console.error('Admin feedback loading error:', error);

    const feedbackList = document.getElementById('adminFeedbackList');

    if (feedbackList) {
      feedbackList.innerHTML = `
        <div class="alert alert-danger small mb-0">
          Unable to load feedback messages.
        </div>
      `;
    }
  }
}
// Admin read feedback
async function markFeedbackAsRead(feedbackId) {
  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/feedback/${feedbackId}/read`,
      {
        method: 'PUT'
      }
    );

    const data = await response.json();

    if (data.success) {
      toast('Feedback marked as read');
      await renderAdminComm();
    } else {
      toast(data.message || 'Unable to mark feedback as read', 'error');
    }

  } catch (error) {
    console.error('Mark feedback as read error:', error);
    toast('Unable to connect to the server', 'error');
  }
}
// admin feedback reply
let currentFeedbackId = null;

async function replyToFeedback(feedbackId) {
  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/feedback'
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to load feedback', 'error');
      return;
    }

    const feedback = (data.feedback || []).find(
      f => Number(f.id) === Number(feedbackId)
    );

    if (!feedback) {
      toast('Feedback not found', 'error');
      return;
    }

    currentFeedbackId = feedback.id;

    document.getElementById('adminReplyUser').textContent =
      feedback.user_name || 'Unknown User';

    document.getElementById('adminReplySubject').textContent =
      feedback.subject || 'No Subject';

    document.getElementById('adminReplyOriginalMessage').textContent =
      feedback.message || '';

    const historyContainer =
      document.getElementById('adminReplyHistory');

    let history = feedback.reply_history || [];

    if (typeof history === 'string') {
      try {
        history = JSON.parse(history);
      } catch (error) {
        history = [];
      }
    }

    if (!Array.isArray(history) || history.length === 0) {
      historyContainer.innerHTML = `
        <div class="text-muted small">
          No replies yet.
        </div>
      `;
    } else {
      historyContainer.innerHTML = history.map(item => `
        <div class="border-bottom pb-2 mb-2">
          <div class="small fw-semibold text-primary">
            <i class="bi bi-person-badge me-1"></i>
            Admin
          </div>

          <div class="small mt-1">
            ${item.reply || ''}
          </div>

          <div class="small text-muted mt-1">
            ${
              item.replied_at
                ? new Date(item.replied_at).toLocaleString()
                : '-'
            }
          </div>
        </div>
      `).join('');
    }

    document.getElementById('adminReplyText').value = '';

    const modal = new bootstrap.Modal(
      document.getElementById('adminReplyModal')
    );

    modal.show();

  } catch (error) {
    console.error('Reply modal error:', error);
    toast('Unable to load feedback', 'error');
  }
}
async function sendAdminReply() {
  if (!currentFeedbackId) {
    toast('Feedback not selected', 'warn');
    return;
  }

  const replyText =
    document.getElementById('adminReplyText').value.trim();

  if (!replyText) {
    toast('Please enter a reply', 'warn');
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/feedback/${currentFeedbackId}/reply`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_reply: replyText
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      const modalElement =
        document.getElementById('adminReplyModal');

      const modal =
        bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      document.getElementById('adminReplyText').value = '';
      currentFeedbackId = null;

      toast('Reply sent successfully');

      await renderAdminComm();

    } else {
      toast(
        data.message || 'Unable to send reply',
        'error'
      );
    }

  } catch (error) {
    console.error('Send admin reply error:', error);
    toast('Unable to connect to the server', 'error');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const sendReplyBtn =
    document.getElementById('sendAdminReplyBtn');

  if (sendReplyBtn) {
    sendReplyBtn.addEventListener(
      'click',
      sendAdminReply
    );
  }
});
// admin - to see new feedback without refreshing the website
async function refreshAdminFeedbackList() {
  const feedbackList = document.getElementById('adminFeedbackList');

  if (!feedbackList) return;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/feedback'
    );

    const data = await response.json();

    if (!data.success) return;

    const feedback = data.feedback || [];

    if (!feedback.length) {
      feedbackList.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-chat-square-text fs-3 d-block mb-2"></i>
          No feedback messages yet.
        </div>
      `;
      return;
    }

    feedbackList.innerHTML = feedback.map(f => `
      <div class="admin-fb-item">

        <div class="d-flex justify-content-between align-items-start">

          <div>
            <strong class="small">
              ${f.user_name || 'Unknown User'}
            </strong>

            <span
              class="badge ${
                f.status === 'NEW'
                  ? 'bg-danger'
                  : f.status === 'REPLIED'
                    ? 'bg-success'
                    : 'bg-secondary'
              } ms-1"
              style="font-size:.65rem">
              ${f.status || 'NEW'}
            </span>
          </div>

          <small class="text-muted">
            ${
              f.created_at
                ? new Date(f.created_at).toLocaleDateString()
                : '-'
            }
          </small>

        </div>

        <p class="small fw-semibold mb-1 mt-1">
          ${f.subject || 'No Subject'}
        </p>

        <p class="small text-muted mb-2">
          ${f.message || ''}
        </p>

        <div class="d-flex gap-1">

          <button
            class="btn btn-sm btn-outline-primary"
            onclick="markFeedbackAsRead(${f.id})"
            title="Mark as Read">
            <i class="bi bi-check2"></i>
          </button>

          <button
            class="btn btn-sm btn-outline-info"
            onclick="replyToFeedback(${f.id})"
            title="Reply">
            <i class="bi bi-reply"></i>
          </button>

          <button
            class="btn btn-sm btn-outline-danger"
            onclick="deleteFeedback(${f.id})"
            title="Delete">
            <i class="bi bi-trash"></i>
          </button>

        </div>

      </div>
    `).join('');

  } catch (error) {
    console.error('Admin feedback refresh error:', error);
  }
}
let adminFeedbackRefreshInterval = null;

document.addEventListener('DOMContentLoaded', () => {

  const commTab = document.querySelector(
    '[data-bs-target="#taComm"]'
  );

  if (commTab) {
    commTab.addEventListener('shown.bs.tab', () => {

      refreshAdminFeedbackList();

      if (adminFeedbackRefreshInterval) {
        clearInterval(adminFeedbackRefreshInterval);
      }

      adminFeedbackRefreshInterval = setInterval(() => {
        refreshAdminFeedbackList();
      }, 5000);

    });
  }

});
// delete admin feedback
let feedbackToDelete = null;

function deleteFeedback(feedbackId) {
  feedbackToDelete = feedbackId;

  const modal = new bootstrap.Modal(
    document.getElementById('deleteFeedbackModal')
  );

  modal.show();
}
async function confirmDeleteFeedback() {
  if (!feedbackToDelete) {
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/feedback/${feedbackToDelete}`,
      {
        method: 'DELETE'
      }
    );

    const data = await response.json();

    if (data.success) {
      const modalElement =
        document.getElementById('deleteFeedbackModal');

      const modal =
        bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      feedbackToDelete = null;

      toast('Feedback deleted successfully');

      await refreshAdminFeedbackList();

    } else {
      toast(
        data.message || 'Unable to delete feedback',
        'error'
      );
    }

  } catch (error) {
    console.error('Delete feedback error:', error);
    toast('Unable to connect to the server', 'error');
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const confirmDeleteBtn =
    document.getElementById('confirmDeleteFeedbackBtn');

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener(
      'click',
      confirmDeleteFeedback
    );
  }
});
async function sendAdminNotification() {
  const audience =
    document.getElementById('adminNotificationAudience').value;

  const title =
    document.getElementById('adminNotificationTitle').value.trim();

  const message =
    document.getElementById('adminNotificationMessage').value.trim();

  if (!title || !message) {
    toast('Please enter notification title and message.');
    return;
  }

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/notifications',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          message: message,
          target_audience: audience
        })
      }
    );

    const result = await response.json();

    if (!result.success) {
      toast(result.message || 'Unable to send notification.');
      return;
    }

    document.getElementById('adminNotificationTitle').value = '';
    document.getElementById('adminNotificationMessage').value = '';

    toast('Notification sent successfully.');

  } catch (error) {
    console.error('Send admin notification error:', error);
    toast('Unable to send notification.');
  }
}
/* ============ ADMIN REPORTS ============ */
let adminReportCharts = {};
async function renderAdminReports() {
  const container = document.getElementById('adminReportsBody');

  if (!container) return;

  container.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">Loading reports...</p>
    </div>
  `;

  try {
    const response = await fetch(
      'http://127.0.0.1:5000/api/admin/reports'
    );

    if (!response.ok) {
      throw new Error('Unable to load reports');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Unable to load reports');
    }

    const requestsByStatus = data.requests_by_status || [];
    const popularCategories = data.popular_categories || [];
    const topWorkers = data.top_workers || [];
    const documentsByType = data.documents_by_type || [];
    const feedbackByStatus = data.feedback_by_status || [];
    const userGrowth = data.user_growth || [];
    const requestGrowth = data.request_growth || [];

    const ratingSummary = data.rating_summary || {};

    /* ---------- Calculations ---------- */

    const totalRequests = requestsByStatus.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );

    const completedRequests = requestsByStatus
      .filter(item =>
        String(item.status).toLowerCase() === 'completed'
      )
      .reduce(
        (sum, item) => sum + Number(item.count || 0),
        0
      );

    const completionRate = totalRequests
      ? Math.round((completedRequests / totalRequests) * 100)
      : 0;

    const totalFeedback = feedbackByStatus.reduce(
      (sum, item) => sum + Number(item.count || 0),
      0
    );

    const repliedFeedback = feedbackByStatus
      .filter(item =>
        String(item.status).toUpperCase() === 'REPLIED'
      )
      .reduce(
        (sum, item) => sum + Number(item.count || 0),
        0
      );

    const feedbackReplyRate = totalFeedback
      ? Math.round((repliedFeedback / totalFeedback) * 100)
      : 0;


    /* ---------- Top Workers ---------- */

    const topWorkersHTML = topWorkers.length
      ? `
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Rating</th>
                <th>Reviews</th>
              </tr>
            </thead>

            <tbody>
              ${topWorkers.map((worker, index) => `
                <tr>
                  <td>
                    <span class="badge bg-light text-dark">
                      #${index + 1}
                    </span>
                  </td>

                  <td>
                    <strong>
                      ${worker.worker_name || 'Unknown'}
                    </strong>
                  </td>

                  <td>
                    <span class="text-warning">
                      <i class="bi bi-star-fill"></i>
                    </span>
                    ${Number(worker.average_rating || 0).toFixed(2)}
                  </td>

                  <td>
                    ${worker.review_count || 0}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
      : `
        <p class="text-muted mb-0">
          No worker review data available.
        </p>
      `;


    /* ---------- Feedback Analysis ---------- */

    const feedbackHTML = feedbackByStatus.length
      ? feedbackByStatus.map(item => `
          <div class="d-flex justify-content-between
                      align-items-center border-bottom py-2">

            <span class="small fw-semibold">
              ${String(item.status || 'Unknown').toUpperCase()}
            </span>

            <span class="badge ${
              String(item.status).toUpperCase() === 'REPLIED'
                ? 'bg-success'
                : String(item.status).toUpperCase() === 'READ'
                  ? 'bg-secondary'
                  : 'bg-danger'
            }">
              ${item.count || 0}
            </span>

          </div>
        `).join('')
      : `
        <p class="text-muted mb-0">
          No feedback data available.
        </p>
      `;


    /* ---------- Legal Documents ---------- */

    const documentsHTML = documentsByType.length
      ? documentsByType.map(document => `
          <div class="d-flex justify-content-between
                      align-items-center border-bottom py-2">

            <span class="small fw-semibold">
              ${document.document_type || 'Unknown'}
            </span>

            <span class="badge bg-primary">
              ${document.generated_count || 0}
            </span>

          </div>
        `).join('')
      : `
        <p class="text-muted mb-0">
          No legal documents generated yet.
        </p>
      `;


    /* ---------- User Registration Trend ---------- */

    const userGrowthHTML = userGrowth.length
      ? `
        <div class="table-responsive">
          <table class="table table-sm table-hover mb-0">

            <thead>
              <tr>
                <th>Month</th>
                <th>Citizens</th>
                <th>Workers</th>
              </tr>
            </thead>

            <tbody>
              ${userGrowth.map(row => `
                <tr>
                  <td>${row.month}</td>
                  <td>${row.citizens || 0}</td>
                  <td>${row.workers || 0}</td>
                </tr>
              `).join('')}
            </tbody>

          </table>
        </div>
      `
      : `
        <p class="text-muted mb-0">
          No registration trend data available.
        </p>
      `;


    /* ---------- Clear Previous Charts ---------- */

    Object.values(adminReportCharts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });

    adminReportCharts = {};


    /* =========================================================
       REPORT PAGE
       ========================================================= */

    container.innerHTML = `

      <!-- ANALYTICAL SUMMARY -->
      <div class="row g-3 mb-4">

        <div class="col-6 col-md-3">
          <div class="dash-stat">
            <div class="ds-num" style="color:#f59e0b">
              ${Number(
                ratingSummary.average_rating || 0
              ).toFixed(1)}
            </div>
            <div class="ds-lbl">
              Average Rating
            </div>
          </div>
        </div>


        <div class="col-6 col-md-3">
          <div class="dash-stat">
            <div class="ds-num" style="color:#10b981">
              ${completionRate}%
            </div>
            <div class="ds-lbl">
              Service Completion Rate
            </div>
          </div>
        </div>


        <div class="col-6 col-md-3">
          <div class="dash-stat">
            <div class="ds-num" style="color:#7c3aed">
              ${ratingSummary.total_reviews || 0}
            </div>
            <div class="ds-lbl">
              Total Reviews
            </div>
          </div>
        </div>


        <div class="col-6 col-md-3">
          <div class="dash-stat">
            <div class="ds-num" style="color:#db2777">
              ${feedbackReplyRate}%
            </div>
            <div class="ds-lbl">
              Feedback Reply Rate
            </div>
          </div>
        </div>

      </div>


      <!-- SERVICE REQUEST ANALYSIS + CATEGORY GRAPH -->
      <div class="row g-3 mb-4">

        <!-- DONUT CHART -->
        <div class="col-md-6">
          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-pie-chart-fill text-primary me-2"></i>
              Service Request Analysis
            </h6>

            ${
              requestsByStatus.length
              ? `
                <div style="height:300px;">
                  <canvas id="serviceRequestChart"></canvas>
                </div>
              `
              : `
                <p class="text-muted mb-0">
                  No service request data available.
                </p>
              `
            }

          </div>
        </div>


        <!-- BAR CHART -->
        <div class="col-md-6">
          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-bar-chart-fill text-warning me-2"></i>
              Most Requested Worker Categories
            </h6>

            ${
              popularCategories.length
              ? `
                <div style="height:300px;">
                  <canvas id="workerCategoryChart"></canvas>
                </div>
              `
              : `
                <p class="text-muted mb-0">
                  No category request data available.
                </p>
              `
            }

          </div>
        </div>

      </div>


      <!-- WORKER + FEEDBACK -->
      <div class="row g-3 mb-4">

        <div class="col-md-7">
          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-trophy-fill text-warning me-2"></i>
              Top Rated Workers
            </h6>

            ${topWorkersHTML}

          </div>
        </div>


        <div class="col-md-5">
          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-chat-square-heart-fill text-danger me-2"></i>
              Feedback Analysis
            </h6>

            ${feedbackHTML}

            <div class="mt-3 p-3 rounded bg-light">

              <div class="small text-muted">
                Feedback Reply Rate
              </div>

              <div class="fw-bold fs-4 text-success">
                ${feedbackReplyRate}%
              </div>

            </div>

          </div>
        </div>

      </div>


      <!-- LEGAL DOCUMENT ANALYSIS -->
      <div class="row g-3 mb-4">

        <div class="col-12">
          <div class="card-box">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-file-earmark-text-fill
                         text-primary me-2"></i>
              Legal Document Analysis
            </h6>

            ${documentsHTML}

          </div>
        </div>

      </div>


      <!-- USER REGISTRATION + SERVICE REQUEST TREND -->
      <div class="row g-3">

        <!-- KEEP USER REGISTRATION AS TABLE -->
        <div class="col-md-6">
          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-people-fill text-success me-2"></i>
              User Registration Trend
            </h6>

            ${userGrowthHTML}

          </div>
        </div>


        <!-- LINE CHART -->
        <div class="col-md-6">
          <div class="card-box h-100">

            <h6 class="fw-bold mb-3">
              <i class="bi bi-graph-up-arrow text-primary me-2"></i>
              Service Request Trend
            </h6>

            ${
              requestGrowth.length
              ? `
                <div style="height:300px;">
                  <canvas id="requestTrendChart"></canvas>
                </div>
              `
              : `
                <p class="text-muted mb-0">
                  No service request trend data available.
                </p>
              `
            }

          </div>
        </div>

      </div>

    `;


    /* =========================================================
       1. SERVICE REQUEST DONUT CHART
       ========================================================= */

    if (
      requestsByStatus.length &&
      document.getElementById('serviceRequestChart')
    ) {

      adminReportCharts.serviceRequest =
        new Chart(
          document.getElementById('serviceRequestChart'),
          {
            type: 'doughnut',

            data: {
              labels: requestsByStatus.map(
                item => String(item.status || 'Unknown')
                  .charAt(0).toUpperCase() +
                  String(item.status || 'Unknown').slice(1)
              ),

              datasets: [
                {
                  data: requestsByStatus.map(
                    item => Number(item.count || 0)
                  )
                }
              ]
            },

            options: {
              responsive: true,
              maintainAspectRatio: false,

              plugins: {
                legend: {
                  position: 'right'
                },

                tooltip: {
                  callbacks: {
                    label: function(context) {

                      const value = context.raw;
                      const total =
                        context.dataset.data.reduce(
                          (sum, number) =>
                            sum + Number(number),
                          0
                        );

                      const percentage = total
                        ? Math.round(
                            (value / total) * 100
                          )
                        : 0;

                      return `${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          }
        );
    }


    /* =========================================================
       2. WORKER CATEGORY BAR CHART
       ========================================================= */

    if (
      popularCategories.length &&
      document.getElementById('workerCategoryChart')
    ) {

      adminReportCharts.workerCategory =
        new Chart(
          document.getElementById('workerCategoryChart'),
          {
            type: 'bar',

            data: {
              labels: popularCategories.map(
                item => item.category || 'Unknown'
              ),

              datasets: [
                {
                  label: 'Requests',

                  data: popularCategories.map(
                    item => Number(
                      item.request_count || 0
                    )
                  )
                }
              ]
            },

            options: {
              responsive: true,
              maintainAspectRatio: false,

              scales: {
                y: {
                  beginAtZero: true,

                  ticks: {
                    precision: 0
                  },

                  title: {
                    display: true,
                    text: 'Number of Requests'
                  }
                },

                x: {
                  ticks: {
                    autoSkip: false
                  }
                }
              },

              plugins: {
                legend: {
                  display: false
                }
              }
            }
          }
        );
    }


    /* =========================================================
       3. SERVICE REQUEST TREND LINE CHART
       ========================================================= */

    if (
      requestGrowth.length &&
      document.getElementById('requestTrendChart')
    ) {

      adminReportCharts.requestTrend =
        new Chart(
          document.getElementById('requestTrendChart'),
          {
            type: 'line',

            data: {
              labels: requestGrowth.map(
                row => {

                  const parts =
                    String(row.month).split('-');

                  if (parts.length === 2) {
                    const date =
                      new Date(
                        Number(parts[0]),
                        Number(parts[1]) - 1
                      );

                    return date.toLocaleDateString(
                      'en-US',
                      {
                        month: 'short',
                        year: 'numeric'
                      }
                    );
                  }

                  return row.month;
                }
              ),

              datasets: [
                {
                  label: 'Requests',

                  data: requestGrowth.map(
                    row => Number(
                      row.request_count || 0
                    )
                  ),

                  tension: 0.3,

                  fill: false
                }
              ]
            },

            options: {
              responsive: true,
              maintainAspectRatio: false,

              scales: {
                y: {
                  beginAtZero: true,

                  ticks: {
                    precision: 0
                  },

                  title: {
                    display: true,
                    text: 'Requests'
                  }
                },

                x: {
                  title: {
                    display: true,
                    text: 'Month'
                  }
                }
              }
            }
          }
        );
    }

  } catch (error) {

    console.error(
      'Admin reports error:',
      error
    );

    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        Unable to load reports. Please try again.
      </div>
    `;
  }
}
/* ============ NOTIFICATIONS ============ */
async function renderNotifications() {
  const dd = document.getElementById('notifDropdown');
  const badge = document.getElementById('notifBadge');

  if (!dd || !badge) return;

  const user = currentUser || gs('currentUser', null);

 if (!user || !user.id) {
  dd.innerHTML = `
    <div class="p-3 text-center text-muted small">
      Please login to view notifications.
    </div>
  `;

  badge.textContent = '';
  badge.style.display = 'none';
  return;
}

  try {
    const isAdmin = user.role === 'admin';

    const apiUrl = isAdmin
      ? 'http://127.0.0.1:5000/api/admin/notifications'
      : `http://127.0.0.1:5000/api/notifications/${user.id}`;

    const response = await fetch(apiUrl);

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || 'Unable to load notifications'
      );
    }

    const notifications = data.notifications || [];

    const unreadCount = isAdmin
      ? 0
      : notifications.filter(
          n => Number(n.unread) === 1
        ).length;

    const header = `
      <div class="p-2 border-bottom d-flex justify-content-between align-items-center">
        <strong class="small">Notifications</strong>

        ${
          !isAdmin && unreadCount > 0
            ? `
              <button
                class="btn btn-link btn-sm p-0 small"
                onclick="markAllRead()">
                Mark all read
              </button>
            `
            : ''
        }
      </div>
    `;

    if (!notifications.length) {
      dd.innerHTML = header + `
        <div class="p-3 text-center text-muted small">
          No notifications yet.
        </div>
      `;

      badge.textContent = '0';
      return;
    }

    dd.innerHTML = header + notifications.map(n => `
      <div class="notif-item">

        <div
          class="ni-icon"
          style="background:${n.color || '#4f46e4'}">
          <i class="bi ${n.icon || 'bi-bell-fill'}"></i>
        </div>

        <div class="flex-grow-1">

  <div class="ni-title">
    ${n.title || 'Notification'}
  </div>

  <div class="ni-text">
    ${n.message || ''}
  </div>

  <div class="ni-time">
    ${n.created_at || ''}
  </div>

  ${
    isAdmin
      ? `
        <div class="small text-muted mt-1">
          Target:
          ${
            n.target_audience === 'ALL'
              ? 'All Users'
              : n.target_audience === 'CITIZENS'
                ? 'Citizens Only'
                : 'Workers Only'
          }
        </div>

        <button
          class="btn btn-sm btn-outline-danger mt-2"
          onclick="deleteAdminNotification(${n.id})">
          <i class="bi bi-trash"></i>
        </button>
      `
      : ''
  }

</div>

        ${
          !isAdmin && Number(n.unread) === 1
            ? `
              <span
                class="badge rounded-pill bg-danger align-self-start"
                style="font-size:.65rem">
                New
              </span>
            `
            : ''
        }

      </div>
    `).join('');

    badge.textContent = unreadCount > 0 ? unreadCount : '';
badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';

  } catch (error) {
    console.error('Notification loading error:', error);

    dd.innerHTML = `
      <div class="p-3 text-center text-danger small">
        Unable to load notifications.
      </div>
    `;

    badge.textContent = '';
badge.style.display = 'none';
  }
}
let notificationToDelete = null;

function deleteAdminNotification(notificationId) {

  notificationToDelete = notificationId;

  const modal = new bootstrap.Modal(
    document.getElementById('deleteNotificationModal')
  );

  modal.show();
}
async function confirmDeleteAdminNotification() {

  if (!notificationToDelete) return;

  try {

    const response = await fetch(
      `http://127.0.0.1:5000/api/admin/notifications/${notificationToDelete}`,
      {
        method: 'DELETE'
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(data.message || 'Unable to delete notification.');
      return;
    }

    const modalElement =
      document.getElementById('deleteNotificationModal');

    const modal =
      bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    notificationToDelete = null;

    toast('Notification deleted successfully.');

    await renderNotifications();

  } catch (error) {

    console.error('Delete notification error:', error);

    toast('Unable to delete notification.');
  }
}
async function markAllRead() {
  const user = currentUser || gs('currentUser', null);

  if (!user || !user.id) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:5000/api/notifications/${user.id}/read-all`,
      {
        method: 'PUT'
      }
    );

    const data = await response.json();

    if (!data.success) {
      toast(
        data.message || 'Unable to mark notifications as read.'
      );
      return;
    }

    await renderNotifications();

  } catch (error) {
    console.error('Mark notifications read error:', error);
    toast('Unable to mark notifications as read.');
  }
}
/* ============ GLOBAL SEARCH ============ */

function runGlobalSearch() {

  const input = document.getElementById('globalSearch');
  const ov = document.getElementById('searchResults');

  if (!input || !ov) return;

  const q = input.value.toLowerCase().trim();

  if (q.length < 2) {
    ov.classList.remove('show');
    return;
  }

  const results = [];

  /* ---------- WORKERS ---------- */

  (databaseWorkers || []).forEach(worker => {

    const name = String(worker.name || '').toLowerCase();
    const skill = String(worker.skill || '').toLowerCase();
    const location = String(worker.location || '').toLowerCase();

    if (
      name.includes(q) ||
      skill.includes(q) ||
      location.includes(q)
    ) {
      results.push({
        type: 'Worker',
        title: worker.name || 'Worker',
        sub: `${worker.skill || 'Service'} • ${worker.location || ''}`,
        icon: 'bi-person-badge',
        color: '#10b981',
        action: "showSection('jobs')"
      });
    }

  });


  /* ---------- GOVERNMENT SCHEMES ---------- */

  (databaseMainSchemes || []).forEach(scheme => {

    const name = String(scheme.name || '').toLowerCase();
    const desc = String(scheme.desc || '').toLowerCase();
    const category = String(scheme.category || '').toLowerCase();
    const department = String(scheme.dept || '').toLowerCase();

    if (
      name.includes(q) ||
      desc.includes(q) ||
      category.includes(q) ||
      department.includes(q)
    ) {
      results.push({
        type: 'Government Scheme',
        title: scheme.name || 'Government Scheme',
        sub: scheme.category || scheme.dept || 'Government Scheme',
        icon: 'bi-bank2',
        color: '#f59e0b',
        action: "showSection('schemes')"
      });
    }

  });


  /* ---------- WOMEN GOVERNMENT SCHEMES ---------- */

  (databaseWomenSchemes || []).forEach(scheme => {

    const name = String(scheme.name || '').toLowerCase();
    const desc = String(scheme.desc || '').toLowerCase();
    const category = String(scheme.category || '').toLowerCase();

    if (
      name.includes(q) ||
      desc.includes(q) ||
      category.includes(q)
    ) {
      results.push({
        type: 'Women Scheme',
        title: scheme.name || 'Women Scheme',
        sub: scheme.category || 'Women & Rights',
        icon: 'bi-bank2',
        color: '#db2777',
        action: "showSection('women')"
      });
    }

  });


  /* ---------- LEGAL RIGHTS ---------- */

  (databaseRightsCategories || []).forEach(category => {

    const categoryTitle =
      String(category.title || '').toLowerCase();

    const categoryDesc =
      String(category.desc || '').toLowerCase();

    (category.rights || []).forEach(right => {

      const title =
        String(right.title || '').toLowerCase();

      const desc =
        String(right.desc || '').toLowerCase();

      const law =
        String(right.law || '').toLowerCase();

      if (
        title.includes(q) ||
        desc.includes(q) ||
        law.includes(q) ||
        categoryTitle.includes(q) ||
        categoryDesc.includes(q)
      ) {
        results.push({
          type: 'Legal Right',
          title: right.title || 'Legal Right',
          sub: category.title || 'Women & Rights',
          icon: 'bi-shield-check',
          color: '#db2777',
          action: "showSection('women')"
        });
      }

    });

  });


  /* ---------- AWARENESS ARTICLES ---------- */

  (databaseArticles || []).forEach(article => {

    const title =
      String(article.title || '').toLowerCase();

    const excerpt =
      String(article.excerpt || '').toLowerCase();

    const category =
      String(article.category || '').toLowerCase();

    if (
      title.includes(q) ||
      excerpt.includes(q) ||
      category.includes(q)
    ) {
      results.push({
        type: 'Article',
        title: article.title || 'Article',
        sub: article.category || 'Women & Rights',
        icon: 'bi-newspaper',
        color: '#7c3aed',
        action: "showSection('women')"
      });
    }

  });


  /* ---------- DISPLAY RESULTS ---------- */

  if (!results.length) {

    ov.innerHTML = `
      <div class="container">
        <p class="text-muted small py-2 mb-0">
          No results for "${input.value.trim()}"
        </p>
      </div>
    `;

  } else {

    ov.innerHTML = `
      <div class="container">

        <p class="small fw-semibold mb-2">
          ${results.length}
          result(s) for "${input.value.trim()}"
        </p>

        ${
          results.slice(0, 8).map(result => `
            <div
              class="sr-item"
              onclick="
                document.getElementById('searchResults').classList.remove('show');
                ${result.action}
              "
            >

              <div
                class="ni-icon"
                style="
                  background:${result.color};
                  width:36px;
                  height:36px;
                  border-radius:8px;
                  flex-shrink:0;
                "
              >
                <i class="bi ${result.icon}"></i>
              </div>

              <div>

                <div class="small fw-semibold">
                  ${result.title}
                </div>

                <small style="color:#94a3b8">
                  ${result.type} • ${result.sub}
                </small>

              </div>

            </div>
          `).join('')
        }

      </div>
    `;

  }

  ov.classList.add('show');
}


/* ============ FAVORITES ============ */
function toggleFavItem(key, id, btn) {
  const favs = gs(key, []); const i = favs.indexOf(id);
  if (i >= 0) favs.splice(i, 1); else favs.push(id);
  ss(key, favs);
  if (btn) btn.querySelector('i').className = favs.includes(id) ? 'bi bi-bookmark-fill' : 'bi bi-bookmark';
  toast(favs.includes(id) ? 'Saved!' : 'Removed');
}

/* ============ REVIEWS ============ */

let reviewTarget = null;

function openReviewModal(id) {
  if (!requireAuth('Please login to write a review.')) return;

  reviewTarget = id;
  selectedRating = 0;

  document.querySelectorAll('#starInput i').forEach(star => {
    star.style.color = '#d1d5db';
  });

  document.getElementById('reviewText').value = '';

  new bootstrap.Modal(
    document.getElementById('reviewModal')
  ).show();
}


/* Star Rating Selection */
document.querySelectorAll('#starInput i').forEach(star => {

  star.addEventListener('click', function () {

    selectedRating = Number(this.dataset.v);

    document.querySelectorAll('#starInput i').forEach(s => {
      const value = Number(s.dataset.v);

      if (value <= selectedRating) {
        s.style.color = '#f59e0b';
      } else {
        s.style.color = '#d1d5db';
      }
    });

  });

});


async function submitReview() {

  if (!selectedRating) {
    toast('Please select a rating', 'warn');
    return;
  }

  if (!reviewTarget) {
    toast('Worker not found', 'error');
    return;
  }

  const txt = document.getElementById('reviewText').value.trim();

  try {

    const response = await fetch(
      'http://127.0.0.1:5000/api/reviews',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          worker_id: reviewTarget,
          user_id: currentUser.id,
          rating: selectedRating,
          review_text: txt
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      toast(
        data.message || 'Unable to submit review',
        'error'
      );
      return;
    }

    toast('Review submitted successfully!');

    bootstrap.Modal
      .getInstance(
        document.getElementById('reviewModal')
      )
      .hide();

  } catch (error) {

    console.error('Review submission error:', error);

    toast(
      'Unable to connect to the server',
      'error'
    );
  }
}
/* ============ ACCESSIBILITY ============ */
function toggleA11y() { document.getElementById('a11yPanel').classList.toggle('d-none'); }
function toggleLargeText()  { document.body.classList.toggle('large-text'); }
function toggleContrast()   { document.body.classList.toggle('high-contrast'); }
function toggleMotion()     { document.body.classList.toggle('reduce-motion'); }


/* ============ INIT ============ */
let legalTemplateRefreshTimer = null;
async function init() {

  loadTheme();

  renderHome();

  fillJobFilters();

  renderWorkers();

  renderSavedWorkers();

  renderCitizenRequests();

  loadMainGovernmentSchemes();

  renderSavedSchemes();

  renderFinderQ();

  renderRights();

  loadWomenSchemes();

  loadEvidenceChecklists();

  loadLegalAid();

  loadAwarenessArticles();

  loadLegalDocumentTemplates();

  const legalTab =
    document.querySelector('[data-bs-target="#twLegal"]');

  if (legalTab) {

    legalTab.addEventListener('shown.bs.tab', async function () {

      await loadLegalDocumentTemplates();

      renderSavedDocs();

      if (legalTemplateRefreshTimer) {
        clearInterval(legalTemplateRefreshTimer);
      }

      legalTemplateRefreshTimer = setInterval(async () => {

        await loadLegalDocumentTemplates();

      }, 5000);

    });

    legalTab.addEventListener('hidden.bs.tab', function () {

      if (legalTemplateRefreshTimer) {

        clearInterval(legalTemplateRefreshTimer);

        legalTemplateRefreshTimer = null;

      }

    });

  }

  renderNotifications();

  // Restore user session

  const stored = gs('currentUser', null);

  if (stored) {

    currentUser = stored;

    updateAuthUI();

  }

  // Load language after everything is rendered

  loadLang();

  // Close search on outside click

  document.addEventListener('click', e => {

    if (
      !e.target.closest('.search-wrap') &&
      !e.target.closest('#searchResults')
    ) {

      document
        .getElementById('searchResults')
        .classList.remove('show');

    }

  });

  // Star rating in review modal

  document
    .querySelectorAll('#starInput i')
    .forEach(star => {

      star.addEventListener('click', () => {

        selectedRating =
          parseInt(star.dataset.v);

        document
          .querySelectorAll('#starInput i')
          .forEach(s => {

            s.style.color =
              parseInt(s.dataset.v) <= selectedRating
                ? '#f59e0b'
                : '#d1d5db';

          });

      });

      star.addEventListener('mouseenter', () => {

        document
          .querySelectorAll('#starInput i')
          .forEach(s => {

            s.style.color =
              parseInt(s.dataset.v) <=
              parseInt(star.dataset.v)
                ? '#f59e0b'
                : '#d1d5db';

          });

      });

      star.addEventListener('mouseleave', () => {

        document
          .querySelectorAll('#starInput i')
          .forEach(s => {

            s.style.color =
              parseInt(s.dataset.v) <= selectedRating
                ? '#f59e0b'
                : '#d1d5db';

          });

      });

    });
}
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', () => {
  openSharedWorkerProfile();
});
loadWorkersFromDatabase();           
document.addEventListener('DOMContentLoaded', () => {
  const schemeTab = document.querySelector(
    '[data-bs-target="#tsAll"]'
  );

  if (schemeTab) {
    schemeTab.addEventListener('shown.bs.tab', async () => {
      await loadMainGovernmentSchemes();

      if (currentUser && currentUser.id) {
        await loadSavedSchemes();
      }
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const womenSchemeTab = document.querySelector(
    '[data-bs-target="#twSchemes"]'
  );

  if (womenSchemeTab) {
    womenSchemeTab.addEventListener('shown.bs.tab', async () => {
      await loadWomenSchemes();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const workerSchemeTab = document.querySelector(
    '[data-bs-target="#wsSchemes"]'
  );

  if (workerSchemeTab) {
    workerSchemeTab.addEventListener('shown.bs.tab', async () => {
      await renderWorkerSchemes();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const rightsTab = document.querySelector('[data-bs-target="#twRights"]');

  if (rightsTab) {
    rightsTab.addEventListener('shown.bs.tab', () => {
      renderRights();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const evidenceTab = document.querySelector(
    '[data-bs-target="#twEvidence"]'
  );

  if (evidenceTab) {
    evidenceTab.addEventListener('shown.bs.tab', () => {
      loadEvidenceChecklists();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const legalAidTab = document.querySelector(
    '[data-bs-target="#twAid"]'
  );

  if (legalAidTab) {
    legalAidTab.addEventListener('shown.bs.tab', () => {
      loadLegalAid();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const notifBtn = document.getElementById('notifBtn');

  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      renderNotifications();
    });
  }
});
document.addEventListener('DOMContentLoaded', () => {

  const btn =
    document.getElementById('confirmDeleteNotificationBtn');

  if (btn) {
    btn.addEventListener(
      'click',
      confirmDeleteAdminNotification
    );
  }

});