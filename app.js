/* ════════════════════════════════════════════════════════════════
   NESCO Distribution MIS — app.js
   Data model sourced from:
   • Substation_Information_Template.xlsx  (substation structure)
   • Rajshahi-Analysis_03.xlsx             (314 real transformer records)
════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   SECTION 1 — FIREBASE CONFIG
   ★ PASTE YOUR FIREBASE CONFIG HERE ★
══════════════════════════════════════════════════════ */
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDoc, getDocs,
         updateDoc, deleteDoc, query, orderBy, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const IS_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";
let app, auth, db;

if (IS_CONFIGURED) {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
}

/* ══════════════════════════════════════════════════════
   SECTION 2 — APP STATE
══════════════════════════════════════════════════════ */
let currentUser = null;
let currentRole = 'user'; // 'admin' or 'user'
let currentSection = 'dashboard';
let charts = {};           // Chart.js instances (destroy before recreating)
let pendingDeleteId = null;
let pendingDeleteCollection = null;

/* ══════════════════════════════════════════════════════
   SECTION 3 — REAL SAMPLE DATA (from Excel files)
   Talaimary 33/11 kV Substation — Rajshahi
══════════════════════════════════════════════════════ */
const TALAIMARY_SS = {
  id: 'talaimary-rajshahi',
  name: 'Talaimary 33/11 kV',
  sdd_esu: 'S&D-1, Rajshahi',
  capacity_mva: '2 × 20/26.66',
  max_demand_mw: 23,
  gps_lat: 24.360371,
  gps_lng: 88.626315,
  control_room_no: '01782-299771',
  status: 'Online',
  grounding_resistance: null,
  lines_33kv: [
    { name: 'Katakhali–Talaimary', source_ring: 'Source', length_km: 5.5, conductor: 'Grosbeak' },
    { name: 'City Central–Talaimary', source_ring: 'Ring', length_km: 4.5, conductor: 'Grosbeak' },
    { name: 'Meherchandi–Talaimary', source_ring: 'Ring', length_km: 3.3, conductor: 'Grosbeak' },
  ],
  power_transformers: [
    { name: 'T1', capacity_mva: '20/26.66', max_load_mw: 12, impedance_pct: 11.061,
      manufacturer: 'Energypac', year: 2018, status: 'Online',
      cb_manufacturer: 'Energypac', pcm_manufacturer: 'Energypac' },
    { name: 'T2', capacity_mva: '20/26.66', max_load_mw: 11, impedance_pct: 11.056,
      manufacturer: 'Energypac', year: 2018, status: 'Online',
      cb_manufacturer: 'Energypac', pcm_manufacturer: 'Energypac' },
  ],
  feeders_11kv: [
    { name: 'Coupling',    transformer: 'T1', max_load_mw: 2.5, length_km: 6,   switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Sagorpara',   transformer: 'T1', max_load_mw: 2.4, length_km: 5,   switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Tikapara',    transformer: 'T1', max_load_mw: 1.2, length_km: 0.8, switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'RUET',        transformer: 'T1', max_load_mw: 4.0, length_km: 2,   switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Varsity',     transformer: 'T1', max_load_mw: 2.2, length_km: 6,   switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Motihar',     transformer: 'T2', max_load_mw: 2.1, length_km: 5.2, switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Sericulture', transformer: 'T2', max_load_mw: 2.2, length_km: 7.5, switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Raninagar',   transformer: 'T2', max_load_mw: 2.1, length_km: 8,   switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Vodra',       transformer: 'T2', max_load_mw: 2.0, length_km: 11,  switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'CharKazla',   transformer: 'T2', max_load_mw: 2.3, length_km: 10.5,switchgear_mfr: 'Energypac', status: 'Energized' },
    { name: 'Binodpur',    transformer: 'T2', max_load_mw: null, length_km: null,switchgear_mfr: 'Energypac', status: 'Energized' },
  ],
};

// Feeder summary data (from Summary Report sheet of Rajshahi-Analysis_03.xlsx)
const FEEDER_SUMMARY = [
  { name:'Binodpur',    count:36, kva100:9,  kva200:12, kva250:15, total_kva:7050,  cap_mva:7.05,  la:11, la_absent:22, la_good:9,  la_bad:2,  dofc:11, dofc_absent:22, dofc_good:5,  dofc_bad:6,  mccb:12, mccb_absent:21, mccb_good:7,  mccb_bad:5,  gnd:27, gnd_absent:6,  copper:27, aluminium:0  },
  { name:'CharKazla',   count:32, kva100:9,  kva200:13, kva250:10, total_kva:6000,  cap_mva:6.00,  la:13, la_absent:18, la_good:13, la_bad:0,  dofc:11, dofc_absent:20, dofc_good:11, dofc_bad:0,  mccb:14, mccb_absent:17, mccb_good:12, mccb_bad:2,  gnd:31, gnd_absent:0,  copper:26, aluminium:0  },
  { name:'Motihar',     count:34, kva100:5,  kva200:16, kva250:13, total_kva:6950,  cap_mva:6.95,  la:17, la_absent:16, la_good:16, la_bad:1,  dofc:9,  dofc_absent:24, dofc_good:4,  dofc_bad:5,  mccb:17, mccb_absent:16, mccb_good:8,  mccb_bad:9,  gnd:33, gnd_absent:0,  copper:30, aluminium:0  },
  { name:'RUET',        count:29, kva100:0,  kva200:0,  kva250:0,  total_kva:0,     cap_mva:0,     la:0,  la_absent:0,  la_good:0,  la_bad:0,  dofc:0,  dofc_absent:0,  dofc_good:0,  dofc_bad:0,  mccb:0,  mccb_absent:0,  mccb_good:0,  mccb_bad:0,  gnd:0,  gnd_absent:0,  copper:0,  aluminium:0  },
  { name:'Raninagar',   count:28, kva100:3,  kva200:12, kva250:12, total_kva:5750,  cap_mva:5.75,  la:19, la_absent:9,  la_good:12, la_bad:6,  dofc:8,  dofc_absent:20, dofc_good:8,  dofc_bad:0,  mccb:17, mccb_absent:11, mccb_good:16, mccb_bad:1,  gnd:28, gnd_absent:0,  copper:9,  aluminium:19 },
  { name:'Sagorpara',   count:35, kva100:1,  kva200:0,  kva250:0,  total_kva:287968,cap_mva:287.97,la:0,  la_absent:0,  la_good:0,  la_bad:0,  dofc:0,  dofc_absent:0,  dofc_good:0,  dofc_bad:0,  mccb:0,  mccb_absent:0,  mccb_good:0,  mccb_bad:0,  gnd:0,  gnd_absent:0,  copper:0,  aluminium:0  },
  { name:'Tikapara',    count:33, kva100:3,  kva200:9,  kva250:21, total_kva:7350,  cap_mva:7.35,  la:14, la_absent:16, la_good:11, la_bad:3,  dofc:12, dofc_absent:18, dofc_good:12, dofc_bad:0,  mccb:13, mccb_absent:17, mccb_good:13, mccb_bad:0,  gnd:29, gnd_absent:1,  copper:19, aluminium:0  },
  { name:'Sericulture', count:29, kva100:7,  kva200:11, kva250:11, total_kva:5650,  cap_mva:5.65,  la:8,  la_absent:21, la_good:8,  la_bad:0,  dofc:8,  dofc_absent:21, dofc_good:8,  dofc_bad:0,  mccb:10, mccb_absent:19, mccb_good:10, mccb_bad:0,  gnd:29, gnd_absent:0,  copper:11, aluminium:1  },
  { name:'Versity',     count:29, kva100:1,  kva200:0,  kva250:0,  total_kva:100,   cap_mva:0.1,   la:0,  la_absent:0,  la_good:0,  la_bad:0,  dofc:0,  dofc_absent:0,  dofc_good:0,  dofc_bad:0,  mccb:0,  mccb_absent:0,  mccb_good:0,  mccb_bad:0,  gnd:0,  gnd_absent:0,  copper:0,  aluminium:0  },
  { name:'Vodra',       count:29, kva100:4,  kva200:7,  kva250:18, total_kva:6300,  cap_mva:6.30,  la:9,  la_absent:20, la_good:9,  la_bad:0,  dofc:4,  dofc_absent:25, dofc_good:4,  dofc_bad:0,  mccb:6,  mccb_absent:23, mccb_good:6,  mccb_bad:0,  gnd:29, gnd_absent:0,  copper:6,  aluminium:23 },
];

// Individual transformer records (sample from Binodpur feeder – real data)
const SAMPLE_TRANSFORMERS = [
  {feeder:'Binodpur',sl:1,gis_id:'2085135',substation:'Talaimary',capacity_kva:250,ref_no:'4256',local_name:'Hanufar Mor West',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Bad',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',sl:2,gis_id:'2084899',substation:'Talaimary',capacity_kva:250,ref_no:'4780',local_name:'Anis Mor East',la_present:'No',la_condition:'',dofc_present:'No',dofc_condition:'',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',sl:3,gis_id:'2084594',substation:'Talaimary',capacity_kva:200,ref_no:'4087',local_name:'Binodpur Bazar Mosque',la_present:'No',la_condition:'',dofc_present:'No',dofc_condition:'',mccb_present:'Yes',mccb_condition:'Bad',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',sl:4,gis_id:'2084561',substation:'Talaimary',capacity_kva:250,ref_no:'4044',local_name:'Hanufar Mor',la_present:'No',la_condition:'',dofc_present:'No',dofc_condition:'',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',sl:5,gis_id:'2084832',substation:'Talaimary',capacity_kva:100,ref_no:'6250',local_name:'Mirzapur Unique Palace',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',sl:6,gis_id:'2084681',substation:'Talaimary',capacity_kva:250,ref_no:'4263',local_name:'Lebubagan-1',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Bad',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Motihar',sl:1,gis_id:'2084563',substation:'Talaimary',capacity_kva:200,ref_no:'192',local_name:'Amena Tower North',la_present:'No',la_condition:'',dofc_present:'No',dofc_condition:'',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Motihar',sl:2,gis_id:'2084023',substation:'Talaimary',capacity_kva:250,ref_no:'199',local_name:'Alamer Mor West',la_present:'No',la_condition:'',dofc_present:'No',dofc_condition:'',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Motihar',sl:6,gis_id:'3520914',substation:'Talaimary',capacity_kva:200,ref_no:'1102947',local_name:'Fultola West',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'CharKazla',sl:1,gis_id:'2084494',substation:'Talaimary',capacity_kva:200,ref_no:'13013',local_name:'Corridor Mor',la_present:'No',la_condition:'',dofc_present:'No',dofc_condition:'',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'CharKazla',sl:5,gis_id:'2084854',substation:'Talaimary',capacity_kva:200,ref_no:'12528',local_name:'Abdur Rahim Mor North',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Copper',remarks:''},
  {feeder:'Raninagar',sl:1,gis_id:'2084511',substation:'Talaimary',capacity_kva:200,ref_no:'3213',local_name:'Shahid Minar North',la_present:'Yes',la_condition:'Bad',dofc_present:'No',dofc_condition:'',mccb_present:'No',mccb_condition:'',grounding_present:'Yes',grounding_qty:1,lt_material:'Aluminium',remarks:''},
  {feeder:'Raninagar',sl:8,gis_id:'2084007',substation:'Talaimary',capacity_kva:200,ref_no:'3206',local_name:"Women's Hall",la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Aluminium',remarks:''},
  {feeder:'Tikapara',sl:3,gis_id:'2085322',substation:'Talaimary',capacity_kva:200,ref_no:'10252',local_name:'Tikapara School',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Aluminium',remarks:''},
  {feeder:'Sericulture',sl:8,gis_id:'3521221',substation:'Talaimary',capacity_kva:200,ref_no:'42',local_name:'Motpukur Mor (Wall)',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Copper',remarks:''},
  {feeder:'Vodra',sl:2,gis_id:'3521256',substation:'Talaimary',capacity_kva:250,ref_no:'109',local_name:'Vodra Bou Bazar-1',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Aluminium',remarks:''},
];

// Sample Projects
const SAMPLE_PROJECTS = [
  { id:'p1', type:'ongoing', name:'Talaimary 33 kV Bus Extension', location:'Rajshahi', status:'In Progress', progress:65, budget_lac:450, start_date:'2024-06-01', end_date:'2025-09-30', description:'Extension of 33 kV bus at Talaimary substation to accommodate additional transformer bay.', contractor:'Energypac Engineering Ltd.'},
  { id:'p2', type:'ongoing', name:'Binodpur Feeder Reconductoring', location:'Binodpur, Rajshahi', status:'In Progress', progress:40, budget_lac:280, start_date:'2024-09-01', end_date:'2025-12-31', description:'Replacement of old ACSR conductor on the Binodpur 11 kV feeder with new XLPE cable.', contractor:'Bangladesh Electrical Consortium'},
  { id:'p3', type:'ongoing', name:'SCADA Integration – Talaimary', location:'Talaimary, Rajshahi', status:'Pending', progress:15, budget_lac:820, start_date:'2024-11-01', end_date:'2026-03-31', description:'Installation of SCADA system for remote monitoring and control of Talaimary substation.', contractor:'ABB Bangladesh'},
  { id:'p4', type:'upcoming', name:'New 33/11 kV Substation – Paba', location:'Paba, Rajshahi', status:'Design Phase', progress:0, budget_lac:1800, start_date:'2025-07-01', end_date:'2027-06-30', description:'Construction of a new 33/11 kV substation at Paba to reduce load on Talaimary.', contractor:'TBD'},
  { id:'p5', type:'upcoming', name:'Motihar Underground Cable', location:'Motihar, Rajshahi', status:'DPP Approved', progress:0, budget_lac:650, start_date:'2025-10-01', end_date:'2027-03-31', description:'Underground cabling for Motihar feeder through the university campus area.', contractor:'TBD'},
];

// Sample load history (MW, last 12 months)
const LOAD_HISTORY = {
  labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  T1:     [10.2,10.8,11.5,12.1,13.4,14.2,14.8,15.1,13.9,12.4,11.2,10.5],
  T2:     [ 9.8,10.1,10.9,11.4,12.8,13.6,14.1,14.4,13.2,11.8,10.6, 9.9],
  total:  [20.0,20.9,22.4,23.5,26.2,27.8,28.9,29.5,27.1,24.2,21.8,20.4],
};

/* ══════════════════════════════════════════════════════
   SECTION 4 — AUTH
══════════════════════════════════════════════════════ */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pwd   = document.getElementById('login-password').value;
  const btn   = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  const errMsg= document.getElementById('login-err-msg');

  btn.disabled = true;
  btn.textContent = '⏳ Signing in…';
  errEl.style.display = 'none';

  if (!IS_CONFIGURED) {
    // Demo mode: accept any credentials
    currentUser = { email, displayName: email.split('@')[0] };
    currentRole = 'admin'; // demo gets full access
    onLoginSuccess();
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pwd);
    // Fetch role from Firestore
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    currentRole = userDoc.exists() ? (userDoc.data().role || 'user') : 'user';
  } catch (err) {
    errMsg.textContent = err.message.replace('Firebase: ','').replace(/\(.*\)/,'').trim();
    errEl.style.display = 'flex';
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>&nbsp; Sign In';
  }
});

function onLoginSuccess() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  const name  = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const email = currentUser?.email || '—';
  const init  = name.charAt(0).toUpperCase();

  document.getElementById('u-avatar').textContent    = init;
  document.getElementById('u-name').textContent      = name;
  document.getElementById('u-role').textContent      = currentRole.toUpperCase();
  document.getElementById('u-dd-name').textContent   = name;
  document.getElementById('u-dd-email').textContent  = email;

  showSection('dashboard');
}

window.logout = async () => {
  if (IS_CONFIGURED) await signOut(auth);
  location.reload();
};

if (IS_CONFIGURED) {
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      const ud = await getDoc(doc(db, 'users', user.uid));
      currentRole = ud.exists() ? (ud.data().role || 'user') : 'user';
      onLoginSuccess();
    }
  });
}

/* ══════════════════════════════════════════════════════
   SECTION 5 — NAVIGATION
══════════════════════════════════════════════════════ */
// Section → breadcrumb label map
const SECTION_LABELS = {
  'dashboard':             'Dashboard',
  'substation-summary':    '33/11 kV Substation › Substation Summary',
  'line-33kv':             '33/11 kV Substation › 33 kV Line Summary',
  'power-transformer':     '33/11 kV Substation › Power Transformer Summary',
  'switchgear-11kv':       '33/11 kV Substation › 11 kV Switchgear Summary',
  'dt-capacity':           'Distribution Transformer › Capacity & Load',
  'dt-equipment':          'Distribution Transformer › LA / DOFC / MCCB Summary',
  'ongoing-projects':      'Ongoing Projects',
  'upcoming-projects':     'Upcoming Projects',
  'switching-substations': 'Switching Substations',
  'load-history':          'Load History',
  'substation-detail':     '33/11 kV Substation › Detail View',
};

document.addEventListener('click', e => {
  const link = e.target.closest('[data-section]');
  if (!link) return;
  e.preventDefault();
  const sec = link.dataset.section;
  showSection(sec);
  // Close mobile nav
  document.getElementById('nav-menu').classList.remove('open');
});

function showSection(sec, param = null) {
  currentSection = sec;
  document.getElementById('bc-label').textContent = SECTION_LABELS[sec] || sec;

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.nav-link[data-section="${sec}"]`);
  if (active) active.classList.add('active');

  // Destroy any existing charts
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};

  const renderers = {
    'dashboard':             renderDashboard,
    'substation-summary':    renderSubstationSummary,
    'substation-detail':     () => renderSubstationDetail(param || TALAIMARY_SS.id),
    'line-33kv':             renderLine33kv,
    'power-transformer':     renderPowerTransformer,
    'switchgear-11kv':       renderSwitchgear11kv,
    'dt-capacity':           renderDtCapacity,
    'dt-equipment':          renderDtEquipment,
    'ongoing-projects':      () => renderProjects('ongoing'),
    'upcoming-projects':     () => renderProjects('upcoming'),
    'switching-substations': renderSwitchingSubstations,
    'load-history':          renderLoadHistory,
  };

  const fn = renderers[sec];
  if (fn) fn();
  else document.getElementById('content').innerHTML = `<div class="page-loader">Section "${sec}" coming soon.</div>`;
}

window.toggleNav = () => document.getElementById('nav-menu').classList.toggle('open');

/* ══════════════════════════════════════════════════════
   SECTION 6 — DASHBOARD
══════════════════════════════════════════════════════ */
function renderDashboard() {
  const totalTx    = FEEDER_SUMMARY.reduce((s,f) => s + f.count, 0);
  const totalMva   = FEEDER_SUMMARY.filter(f => f.cap_mva < 100).reduce((s,f) => s + f.cap_mva, 0);
  const totalLa    = FEEDER_SUMMARY.reduce((s,f) => s + f.la, 0);
  const totalDofc  = FEEDER_SUMMARY.reduce((s,f) => s + f.dofc, 0);
  const totalMccb  = FEEDER_SUMMARY.reduce((s,f) => s + f.mccb, 0);
  const totalGnd   = FEEDER_SUMMARY.reduce((s,f) => s + f.gnd, 0);
  const laPct      = Math.round(totalLa / totalTx * 100);
  const dofcPct    = Math.round(totalDofc / totalTx * 100);
  const mccbPct    = Math.round(totalMccb / totalTx * 100);
  const gndPct     = Math.round(totalGnd / totalTx * 100);

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>System Dashboard</h2>
      <p>Talaimary 33/11 kV Substation, Rajshahi — Real-time overview</p>
    </div>
    <div class="sec-head-right">
      <span class="badge badge-online"><i class="fas fa-circle"></i> Talaimary Online</span>
      <span style="font-size:.78rem;color:var(--text3)">Last updated: ${new Date().toLocaleDateString()}</span>
    </div>
  </div>

  ${!IS_CONFIGURED ? `<div class="alert alert-warn"><i class="fas fa-exclamation-triangle"></i> <div><strong>Demo Mode:</strong> Firebase not configured. Data is shown from local sample records. Paste your Firebase config in app.js to enable full database functionality.</div></div>` : ''}

  <!-- KPI row -->
  <div class="kpi-row">
    <div class="kpi-card navy">
      <div class="kpi-val">1</div>
      <div class="kpi-sub">Active Substation</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">2 × 20</div>
      <div class="kpi-sub">MVA Installed</div>
    </div>
    <div class="kpi-card amber">
      <div class="kpi-val">23 MW</div>
      <div class="kpi-sub">Max Demand</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalTx}</div>
      <div class="kpi-sub">Dist. Transformers</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalMva.toFixed(1)}</div>
      <div class="kpi-sub">Total DT Capacity (MVA)</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-val">${FEEDER_SUMMARY.filter(f => f.cap_mva < 100).length}</div>
      <div class="kpi-sub">Active Feeders</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${SAMPLE_PROJECTS.filter(p=>p.type==='ongoing').length}</div>
      <div class="kpi-sub">Ongoing Projects</div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-val">${SAMPLE_PROJECTS.filter(p=>p.type==='upcoming').length}</div>
      <div class="kpi-sub">Upcoming Projects</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">

    <!-- Equipment coverage -->
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-shield-alt"></i> Equipment Coverage — 314 Transformers</h3></div>
      <div class="panel-body">
        ${[
          ['11 kV LA',   totalLa,   totalTx, 'var(--red2)'],
          ['11 kV DOFC', totalDofc, totalTx, 'var(--amber2)'],
          ['0.4 kV MCCB',totalMccb, totalTx, 'var(--purple2)'],
          ['Grounding',  totalGnd,  totalTx, 'var(--green2)'],
        ].map(([lbl,val,tot,col]) => {
          const pct = Math.round(val/tot*100);
          return `<div class="cov-bar-row">
            <div class="cov-bar-label">${lbl}</div>
            <div class="cov-bar-wrap"><div class="cov-bar-fill" style="width:${pct}%;background:${col}"></div></div>
            <div class="cov-bar-val">${pct}%</div>
            <div style="font-size:.74rem;color:var(--text3);min-width:60px">${val} / ${tot}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Feeder summary table -->
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-bolt"></i> Feeder Quick Summary</h3></div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Feeder</th><th>Transformers</th><th>Capacity</th><th>LA %</th><th>Grounding %</th></tr></thead>
          <tbody>
            ${FEEDER_SUMMARY.filter(f => f.cap_mva < 100).map(f => {
              const laPct  = f.count ? Math.round(f.la/f.count*100) : 0;
              const gndPct = f.count ? Math.round(f.gnd/f.count*100) : 0;
              return `<tr>
                <td><strong>${f.name}</strong></td>
                <td class="num">${f.count}</td>
                <td class="num">${f.cap_mva.toFixed(2)} MVA</td>
                <td><span class="badge ${laPct>=50?'badge-yes':'badge-no'}">${laPct}%</span></td>
                <td><span class="badge ${gndPct>=80?'badge-yes':'badge-partial'}">${gndPct}%</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Load trend chart -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head">
      <h3><i class="fas fa-chart-area"></i> Monthly Load Trend — Talaimary (2024)</h3>
      <span class="badge badge-blue">T1 + T2</span>
    </div>
    <div class="panel-body"><div class="chart-container"><canvas id="chart-dash-load"></canvas></div></div>
  </div>

  <!-- Projects -->
  <div class="panel">
    <div class="panel-head">
      <h3><i class="fas fa-hard-hat"></i> Active Projects</h3>
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('ongoing-projects')">View All</button>
    </div>
    <div class="panel-body no-pad">
      <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>Project</th><th>Location</th><th>Budget (Lac BDT)</th><th>Progress</th><th>Status</th></tr></thead>
        <tbody>
          ${SAMPLE_PROJECTS.filter(p=>p.type==='ongoing').map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.location}</td>
            <td class="num">${p.budget_lac}</td>
            <td style="min-width:120px">
              <div class="progress-bar"><div class="progress-fill ${p.progress>60?'ok':p.progress>30?'warn':'danger'}" style="width:${p.progress}%"></div></div>
              <div style="font-size:.72rem;color:var(--text3);margin-top:3px">${p.progress}%</div>
            </td>
            <td><span class="badge badge-partial">${p.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>
  </div>
  `;

  // Render load chart
  setTimeout(() => {
    const ctx = document.getElementById('chart-dash-load');
    if (!ctx) return;
    charts['dash-load'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: LOAD_HISTORY.labels,
        datasets: [
          { label: 'T1 Load (MW)', data: LOAD_HISTORY.T1, borderColor: '#1565c0', backgroundColor: 'rgba(21,101,192,.08)', tension: 0.4, fill: true, pointRadius: 4 },
          { label: 'T2 Load (MW)', data: LOAD_HISTORY.T2, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.08)', tension: 0.4, fill: true, pointRadius: 4 },
          { label: 'Total (MW)',   data: LOAD_HISTORY.total, borderColor: '#d97706', backgroundColor: 'transparent', tension: 0.4, borderDash: [5,4], pointRadius: 3 },
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: false, title: { display: true, text: 'Load (MW)' } } } }
    });
  }, 100);
}

/* ══════════════════════════════════════════════════════
   SECTION 7 — SUBSTATION SUMMARY
══════════════════════════════════════════════════════ */
function renderSubstationSummary() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>33/11 kV Substation Summary</h2><p>All substations in NESCO distribution network</p></div>
    <div class="sec-head-right">
      <input class="search-input" id="ss-search" placeholder="🔍 Search substations…" oninput="window.filterSS()" style="max-width:280px">
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddSubstationModal()"><i class="fas fa-plus"></i> Add Substation</button>` : ''}
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">1</div><div class="kpi-sub">Total Substations</div></div>
    <div class="kpi-card green"><div class="kpi-val">1</div><div class="kpi-sub">Online</div></div>
    <div class="kpi-card red"><div class="kpi-val">0</div><div class="kpi-sub">Offline</div></div>
    <div class="kpi-card"><div class="kpi-val">40 MVA</div><div class="kpi-sub">Total Installed Capacity</div></div>
    <div class="kpi-card amber"><div class="kpi-val">23 MW</div><div class="kpi-sub">Peak Demand</div></div>
  </div>

  <div class="ss-grid" id="ss-grid">
    ${renderSSCard(TALAIMARY_SS)}
  </div>

  <div class="alert alert-info" style="margin-top:20px">
    <i class="fas fa-info-circle"></i>
    <div>This dashboard currently shows <strong>Talaimary 33/11 kV</strong> as the pilot substation. Additional substations can be added via the <strong>Add Substation</strong> button (Admin only). The system is designed to scale to all 85 NESCO substations.</div>
  </div>
  `;
}

function renderSSCard(ss) {
  const totalLoad = ss.power_transformers.reduce((s,t) => s + (t.max_load_mw||0), 0);
  const cap = ss.power_transformers.reduce((s,t) => s + parseFloat(t.capacity_mva||0), 0);
  const loadPct = cap ? Math.round(totalLoad / cap * 100) : 0;
  return `
  <div class="ss-card" onclick="window.showSection('substation-detail','${ss.id}')">
    <div class="ss-card-top">
      <div>
        <div class="ss-name">${ss.name}</div>
        <div class="ss-meta"><i class="fas fa-map-marker-alt"></i> ${ss.sdd_esu}</div>
      </div>
      <span class="badge badge-online">${ss.status}</span>
    </div>
    <div style="font-size:.78rem;color:var(--text3);margin-bottom:8px"><i class="fas fa-bolt"></i> ${ss.capacity_mva} MVA &nbsp;|&nbsp; <i class="fas fa-tachometer-alt"></i> ${ss.max_demand_mw} MW Max Demand</div>
    <div class="progress-bar" style="margin-bottom:4px">
      <div class="progress-fill ${loadPct>80?'danger':loadPct>60?'warn':'ok'}" style="width:${loadPct}%"></div>
    </div>
    <div style="font-size:.72rem;color:var(--text3);margin-bottom:8px">Load: ${totalLoad} MW / ${cap} MVA (${loadPct}%)</div>
    <div class="ss-stats">
      <div class="ss-stat"><span class="ss-stat-val">${ss.lines_33kv.length}</span><span class="ss-stat-lbl">33 kV Lines</span></div>
      <div class="ss-stat"><span class="ss-stat-val">${ss.power_transformers.length}</span><span class="ss-stat-lbl">Power TXs</span></div>
      <div class="ss-stat"><span class="ss-stat-val">${ss.feeders_11kv.length}</span><span class="ss-stat-lbl">11 kV Feeders</span></div>
      <div class="ss-stat"><span class="ss-stat-val">314</span><span class="ss-stat-lbl">Dist. TXs</span></div>
    </div>
  </div>`;
}

window.filterSS = () => {
  const q = document.getElementById('ss-search')?.value.toLowerCase() || '';
  // Future: filter from Firestore
};

/* ══════════════════════════════════════════════════════
   SECTION 8 — SUBSTATION DETAIL VIEW
══════════════════════════════════════════════════════ */
function renderSubstationDetail(id) {
  const ss = TALAIMARY_SS; // In production: fetch from Firestore by id

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>${ss.name}</h2>
      <p>${ss.sdd_esu} &nbsp;·&nbsp; GPS: ${ss.gps_lat}, ${ss.gps_lng}</p>
    </div>
    <div class="sec-head-right">
      <span class="badge badge-online">${ss.status}</span>
      <a href="https://maps.google.com/?q=${ss.gps_lat},${ss.gps_lng}" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-map-marker-alt"></i> View on Map</a>
      ${currentRole==='admin' ? `<button class="btn btn-sm btn-primary" onclick="window.openEditSubstationModal()"><i class="fas fa-edit"></i> Edit</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('substation-summary')"><i class="fas fa-arrow-left"></i> Back</button>
    </div>
  </div>

  <!-- Info cards -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Installed Capacity', ss.capacity_mva + ' MVA', 'navy'],
      ['Max Demand',         ss.max_demand_mw + ' MW', 'amber'],
      ['33 kV Lines',        ss.lines_33kv.length,     ''],
      ['Power Transformers', ss.power_transformers.length, 'green'],
      ['11 kV Feeders',      ss.feeders_11kv.length,   ''],
      ['Control Room',       ss.control_room_no,       ''],
    ].map(([lbl,val,cls]) => `
    <div class="kpi-card ${cls}">
      <div class="kpi-val" style="font-size:1.3rem">${val}</div>
      <div class="kpi-sub">${lbl}</div>
    </div>`).join('')}
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab-btn active" onclick="window.switchTab(this,'tab-33kv')"><i class="fas fa-route"></i> 33 kV Lines</button>
    <button class="tab-btn" onclick="window.switchTab(this,'tab-pt')"><i class="fas fa-circle-nodes"></i> Power Transformers</button>
    <button class="tab-btn" onclick="window.switchTab(this,'tab-feeders')"><i class="fas fa-sitemap"></i> 11 kV Feeders</button>
    <button class="tab-btn" onclick="window.switchTab(this,'tab-dt')"><i class="fas fa-circle-half-stroke"></i> Dist. Transformers</button>
  </div>

  <!-- Tab: 33 kV Lines -->
  <div class="tab-content active" id="tab-33kv">
    <div class="panel">
      <div class="panel-head"><h3>33 kV Source &amp; Ring Lines</h3>
        ${currentRole==='admin' ? `<button class="btn btn-xs btn-primary" onclick="window.openAddLineModal()"><i class="fas fa-plus"></i> Add Line</button>` : ''}
      </div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Line Name</th><th>Type</th><th>Length (km)</th><th>Conductor</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
          <tbody>
            ${ss.lines_33kv.map((l,i) => `<tr>
              <td><strong>${l.name}</strong></td>
              <td><span class="badge ${l.source_ring==='Source'?'badge-blue':'badge-gray'}">${l.source_ring}</span></td>
              <td class="num">${l.length_km}</td>
              <td>${l.conductor}</td>
              ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.editLine(${i})"><i class="fas fa-edit"></i></button></td>` : ''}
            </tr>`).join('')}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Tab: Power Transformers -->
  <div class="tab-content" id="tab-pt">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      ${ss.power_transformers.map(t => `
      <div class="panel">
        <div class="panel-head">
          <h3><i class="fas fa-circle-nodes"></i> Power Transformer ${t.name}</h3>
          <span class="badge badge-online">${t.status}</span>
        </div>
        <div class="panel-body">
          ${[
            ['Capacity','cap_mva','MVA'],['Max Load','max_load_mw','MW'],['% Impedance','impedance_pct','%'],
            ['Manufacturer','manufacturer',''],['Year of Mfg.','year',''],['CB Manufacturer','cb_manufacturer',''],
          ].map(([lbl,key,unit]) => `
          <div class="info-row">
            <span class="info-lbl">${lbl}</span>
            <span class="info-val">${t[key]||'—'} ${unit}</span>
          </div>`).join('')}
          <div class="info-row">
            <span class="info-lbl">Loading</span>
            <span class="info-val">
              ${t.max_load_mw} MW / ${t.capacity_mva} MVA
              (${Math.round(t.max_load_mw/parseFloat(t.capacity_mva)*100)}%)
            </span>
          </div>
          <div style="margin-top:10px">
            <div class="progress-bar">
              <div class="progress-fill ${Math.round(t.max_load_mw/parseFloat(t.capacity_mva)*100)>80?'danger':'ok'}" style="width:${Math.round(t.max_load_mw/parseFloat(t.capacity_mva)*100)}%"></div>
            </div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Tab: 11 kV Feeders -->
  <div class="tab-content" id="tab-feeders">
    <div class="panel">
      <div class="panel-head"><h3>11 kV Feeder Information</h3></div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Feeder Name</th><th>From TX</th><th>Max Load (MW)</th><th>Length (km)</th><th>Switchgear Mfr.</th><th>Status</th><th>DT Count</th></tr></thead>
          <tbody>
            ${ss.feeders_11kv.map(f => {
              const dtData = FEEDER_SUMMARY.find(d => d.name.toLowerCase() === f.name.toLowerCase());
              return `<tr>
                <td><strong>${f.name}</strong></td>
                <td><span class="badge badge-blue">${f.transformer}</span></td>
                <td class="num">${f.max_load_mw || '—'}</td>
                <td class="num">${f.length_km || '—'}</td>
                <td>${f.switchgear_mfr}</td>
                <td><span class="badge badge-energized">${f.status}</span></td>
                <td class="num">${dtData ? dtData.count : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Tab: Dist. Transformers (summary) -->
  <div class="tab-content" id="tab-dt">
    <div class="alert alert-info">
      <i class="fas fa-info-circle"></i>
      Showing feeder-level summary. Go to <strong>Distribution Transformer → Capacity & Load Summary</strong> for full records.
    </div>
    ${renderFeederSummaryTable()}
  </div>
  `;
}

function renderFeederSummaryTable() {
  return `
  <div class="panel">
    <div class="panel-head"><h3>Distribution Transformer Summary by Feeder</h3></div>
    <div class="panel-body no-pad">
    <div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Feeder</th><th>Count</th><th>100 kVA</th><th>200 kVA</th><th>250 kVA</th>
          <th>Total kVA</th><th>Capacity (MVA)</th><th>LA %</th><th>DOFC %</th><th>MCCB %</th><th>Grounding %</th>
        </tr>
      </thead>
      <tbody>
        ${FEEDER_SUMMARY.map(f => {
          const laPct = f.count ? Math.round(f.la/f.count*100) : 0;
          const dofcPct = f.count ? Math.round(f.dofc/f.count*100) : 0;
          const mccbPct = f.count ? Math.round(f.mccb/f.count*100) : 0;
          const gndPct = f.count ? Math.round(f.gnd/f.count*100) : 0;
          const capDisplay = f.cap_mva < 100 ? f.cap_mva.toFixed(2) + ' MVA' : f.total_kva.toLocaleString() + ' kVA*';
          return `<tr>
            <td><strong>${f.name}</strong></td>
            <td class="num">${f.count}</td>
            <td class="num">${f.kva100}</td><td class="num">${f.kva200}</td><td class="num">${f.kva250}</td>
            <td class="num">${f.total_kva.toLocaleString()}</td>
            <td class="num">${capDisplay}</td>
            <td><span class="badge ${laPct>=50?'badge-yes':'badge-no'}">${laPct}%</span></td>
            <td><span class="badge ${dofcPct>=50?'badge-yes':'badge-no'}">${dofcPct}%</span></td>
            <td><span class="badge ${mccbPct>=50?'badge-yes':'badge-no'}">${mccbPct}%</span></td>
            <td><span class="badge ${gndPct>=80?'badge-yes':'badge-partial'}">${gndPct}%</span></td>
          </tr>`;
        }).join('')}
        <tr style="background:#f0f5fb;font-weight:700">
          <td>TOTAL</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.count,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva100,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva200,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva250,0)}</td>
          <td class="num">${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f)=>s+f.total_kva,0).toLocaleString()}</td>
          <td class="num">${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f)=>s+f.cap_mva,0).toFixed(2)} MVA</td>
          <td colspan="4" style="font-size:.76rem;color:var(--text3)">*Sagorpara/RUET/Versity data pending</td>
        </tr>
      </tbody>
    </table>
    </div>
    </div>
  </div>`;
}

window.switchTab = (btn, tabId) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
};

/* ══════════════════════════════════════════════════════
   SECTION 9 — 33 kV LINE SUMMARY
══════════════════════════════════════════════════════ */
function renderLine33kv() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>33 kV Line Summary</h2><p>Source &amp; ring line information for all substations</p></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Talaimary 33/11 kV — 33 kV Incoming Lines</h3></div>
    <div class="panel-body no-pad">
    <div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Substation</th><th>Line Name</th><th>Type</th><th>Length (km)</th><th>Conductor</th></tr></thead>
      <tbody>
        ${TALAIMARY_SS.lines_33kv.map(l => `<tr>
          <td>Talaimary 33/11 kV</td>
          <td><strong>${l.name}</strong></td>
          <td><span class="badge ${l.source_ring==='Source'?'badge-blue':'badge-gray'}">${l.source_ring}</span></td>
          <td class="num">${l.length_km} km</td>
          <td>${l.conductor}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 10 — POWER TRANSFORMER SUMMARY
══════════════════════════════════════════════════════ */
function renderPowerTransformer() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Power Transformer Summary</h2><p>33/11 kV power transformers across all substations</p></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Talaimary 33/11 kV — Power Transformers</h3></div>
    <div class="panel-body no-pad">
    <div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr><th>Substation</th><th>Name</th><th>Capacity (MVA)</th><th>Max Load (MW)</th><th>Loading %</th><th>% Impedance</th><th>Manufacturer</th><th>Year</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${TALAIMARY_SS.power_transformers.map(t => {
          const loadPct = Math.round(t.max_load_mw / parseFloat(t.capacity_mva) * 100);
          return `<tr>
            <td>Talaimary</td>
            <td><strong>${t.name}</strong></td>
            <td class="num">${t.capacity_mva}</td>
            <td class="num">${t.max_load_mw} MW</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="progress-bar" style="width:80px">
                  <div class="progress-fill ${loadPct>80?'danger':'ok'}" style="width:${loadPct}%"></div>
                </div>
                <span style="font-size:.78rem;font-weight:600">${loadPct}%</span>
              </div>
            </td>
            <td class="num">${t.impedance_pct}%</td>
            <td>${t.manufacturer}</td>
            <td>${t.year}</td>
            <td><span class="badge badge-online">${t.status}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 11 — 11 kV SWITCHGEAR SUMMARY
══════════════════════════════════════════════════════ */
function renderSwitchgear11kv() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>11 kV Switchgear Summary</h2><p>Feeder panels and switchgear details</p></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Talaimary 33/11 kV — 11 kV Feeder Panels</h3></div>
    <div class="panel-body no-pad">
    <div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Feeder</th><th>From Transformer</th><th>Max Load (MW)</th><th>Length (km)</th><th>Panel Manufacturer</th><th>Status</th></tr></thead>
      <tbody>
        ${TALAIMARY_SS.feeders_11kv.map(f => `<tr>
          <td><strong>${f.name}</strong></td>
          <td><span class="badge badge-blue">${f.transformer}</span></td>
          <td class="num">${f.max_load_mw || '—'}</td>
          <td class="num">${f.length_km || '—'}</td>
          <td>${f.switchgear_mfr}</td>
          <td><span class="badge badge-energized">${f.status}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 12 — DISTRIBUTION TRANSFORMER: CAPACITY & LOAD
══════════════════════════════════════════════════════ */
function renderDtCapacity() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Distribution Transformer — Capacity &amp; Load Summary</h2>
      <p>Feeder-wise breakdown of 314 distribution transformers under Talaimary SS</p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel" id="feeder-filter" onchange="window.filterDtCapacity()">
        <option value="">All Feeders</option>
        ${FEEDER_SUMMARY.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
      </select>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddTransformerModal()"><i class="fas fa-plus"></i> Add Transformer</button>` : ''}
    </div>
  </div>

  <!-- Summary KPIs -->
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-val">314</div><div class="kpi-sub">Total DTs</div></div>
    <div class="kpi-card navy"><div class="kpi-val">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva100,0)}</div><div class="kpi-sub">× 100 kVA</div></div>
    <div class="kpi-card"><div class="kpi-val">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva200,0)}</div><div class="kpi-sub">× 200 kVA</div></div>
    <div class="kpi-card blue"><div class="kpi-val">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva250,0)}</div><div class="kpi-sub">× 250 kVA</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f)=>s+f.cap_mva,0).toFixed(1)}</div><div class="kpi-sub">Total MVA</div></div>
  </div>

  <!-- Bar chart -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3><i class="fas fa-chart-bar"></i> Transformer Count by Feeder &amp; Rating</h3></div>
    <div class="panel-body"><div class="chart-container"><canvas id="chart-dt-cap"></canvas></div></div>
  </div>

  <!-- Summary table -->
  ${renderFeederSummaryTable()}
  `;

  setTimeout(() => {
    const ctx = document.getElementById('chart-dt-cap');
    if (!ctx) return;
    const validFeeders = FEEDER_SUMMARY.filter(f => f.cap_mva < 100);
    charts['dt-cap'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: validFeeders.map(f => f.name),
        datasets: [
          { label: '100 kVA', data: validFeeders.map(f => f.kva100), backgroundColor: '#93c5fd' },
          { label: '200 kVA', data: validFeeders.map(f => f.kva200), backgroundColor: '#1565c0' },
          { label: '250 kVA', data: validFeeders.map(f => f.kva250), backgroundColor: '#0b2545' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'No. of Transformers' } } },
        plugins: { legend: { position: 'top' } }
      }
    });
  }, 100);
}

window.filterDtCapacity = () => {
  const feeder = document.getElementById('feeder-filter')?.value;
  // Filter transformer table in dt-equipment
};

/* ══════════════════════════════════════════════════════
   SECTION 13 — DISTRIBUTION TRANSFORMER: EQUIPMENT (LA/DOFC/MCCB)
══════════════════════════════════════════════════════ */
function renderDtEquipment() {
  let filtered = [...SAMPLE_TRANSFORMERS];

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Distribution Transformer — Equipment Status</h2>
      <p>LA, DOFC, MCCB, Grounding and LT Loop inspection records</p>
    </div>
    <div class="sec-head-right">
      <input class="search-input" id="dt-search" placeholder="🔍 Search transformers…" oninput="window.filterDtTable()" style="max-width:240px">
      <select class="filter-sel" id="dt-feeder-filter" onchange="window.filterDtTable()">
        <option value="">All Feeders</option>
        ${FEEDER_SUMMARY.map(f => `<option value="${f.name}">${f.name}</option>`).join('')}
      </select>
      <select class="filter-sel" id="dt-la-filter" onchange="window.filterDtTable()">
        <option value="">LA: All</option>
        <option value="Yes">LA: Present</option>
        <option value="No">LA: Absent</option>
      </select>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddTransformerModal()"><i class="fas fa-plus"></i> Add</button>` : ''}
    </div>
  </div>

  <!-- Coverage chart -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3><i class="fas fa-chart-bar"></i> Equipment Coverage by Feeder</h3></div>
    <div class="panel-body"><div class="chart-container chart-sm"><canvas id="chart-dt-eq"></canvas></div></div>
  </div>

  <!-- Transformer table -->
  <div class="panel">
    <div class="panel-head">
      <h3>Transformer Records <span style="font-weight:400;color:var(--text3)" id="dt-count">(${SAMPLE_TRANSFORMERS.length} sample records shown)</span></h3>
    </div>
    <div class="panel-body no-pad">
    <div class="tbl-wrap">
    <table class="tbl" id="dt-table">
      <thead>
        <tr>
          <th>Sl.</th><th>Feeder</th><th>GIS ID</th><th>Local Name</th><th>kVA</th>
          <th>11kV LA</th><th>11kV DOFC</th><th>0.4kV MCCB</th>
          <th>Grounding</th><th>LT Loop</th><th>Remarks</th>
          ${currentRole==='admin' ? '<th>Action</th>' : ''}
        </tr>
      </thead>
      <tbody id="dt-tbody">
        ${renderDtRows(SAMPLE_TRANSFORMERS)}
      </tbody>
    </table>
    </div>
    </div>
  </div>

  <div class="alert alert-info" style="margin-top:16px">
    <i class="fas fa-info-circle"></i>
    <div>Showing <strong>${SAMPLE_TRANSFORMERS.length} sample records</strong> from the Rajshahi-Analysis_03.xlsx file. Full 314-record database can be imported via the Firebase Firestore bulk import. Use the <strong>Import CSV/Excel</strong> feature to upload all feeder sheets.</div>
  </div>
  `;

  setTimeout(() => {
    const ctx = document.getElementById('chart-dt-eq');
    if (!ctx) return;
    const validFeeders = FEEDER_SUMMARY.filter(f => f.cap_mva < 100);
    charts['dt-eq'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: validFeeders.map(f => f.name),
        datasets: [
          { label: 'LA Present', data: validFeeders.map(f => Math.round(f.la/f.count*100)), backgroundColor: 'rgba(220,38,38,.75)' },
          { label: 'DOFC Present', data: validFeeders.map(f => Math.round(f.dofc/f.count*100)), backgroundColor: 'rgba(217,119,6,.75)' },
          { label: 'MCCB Present', data: validFeeders.map(f => Math.round(f.mccb/f.count*100)), backgroundColor: 'rgba(124,58,237,.75)' },
          { label: 'Grounding',   data: validFeeders.map(f => Math.round(f.gnd/f.count*100)), backgroundColor: 'rgba(5,150,105,.75)' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { y: { max: 100, title: { display: true, text: '% of Transformers' } } },
        plugins: { legend: { position: 'top' } }
      }
    });
  }, 100);
}

function renderDtRows(rows) {
  if (!rows.length) return `<tr><td colspan="12" class="tbl-empty">No records found.</td></tr>`;
  return rows.map(t => `
  <tr>
    <td>${t.sl}</td>
    <td><strong>${t.feeder}</strong></td>
    <td style="font-size:.76rem;font-family:'Courier New',monospace">${t.gis_id}</td>
    <td title="${t.local_name}">${t.local_name.substring(0,22)}${t.local_name.length>22?'…':''}</td>
    <td class="num"><strong>${t.capacity_kva}</strong></td>
    <td>
      <span class="badge ${t.la_present==='Yes'?'badge-yes':'badge-no'}">${t.la_present}</span>
      ${t.la_condition ? `<span class="badge ${t.la_condition==='Good'?'badge-good':'badge-bad'}" style="margin-left:3px">${t.la_condition}</span>` : ''}
    </td>
    <td>
      <span class="badge ${t.dofc_present==='Yes'?'badge-yes':'badge-no'}">${t.dofc_present}</span>
      ${t.dofc_condition ? `<span class="badge ${t.dofc_condition==='Good'?'badge-good':'badge-bad'}" style="margin-left:3px">${t.dofc_condition}</span>` : ''}
    </td>
    <td>
      <span class="badge ${t.mccb_present==='Yes'?'badge-yes':'badge-no'}">${t.mccb_present}</span>
      ${t.mccb_condition ? `<span class="badge ${t.mccb_condition==='Good'?'badge-good':'badge-bad'}" style="margin-left:3px">${t.mccb_condition}</span>` : ''}
    </td>
    <td>
      <span class="badge ${t.grounding_present==='Yes'?'badge-yes':'badge-no'}">${t.grounding_present}</span>
      ${t.grounding_qty ? `<span style="font-size:.74rem;color:var(--text3);margin-left:4px">(${t.grounding_qty})</span>` : ''}
    </td>
    <td><span class="badge ${t.lt_material==='Copper'?'badge-blue':'badge-gray'}">${t.lt_material||'—'}</span></td>
    <td style="font-size:.78rem;color:var(--text3)">${t.remarks||'—'}</td>
    ${currentRole==='admin' ? `<td>
      <button class="btn btn-xs btn-secondary" onclick="window.openEditTxModal('${t.gis_id}')"><i class="fas fa-edit"></i></button>
      <button class="btn btn-xs btn-danger" onclick="window.confirmDeleteTx('${t.gis_id}')" style="margin-left:4px"><i class="fas fa-trash"></i></button>
    </td>` : ''}
  </tr>`).join('');
}

window.filterDtTable = () => {
  const q      = (document.getElementById('dt-search')?.value || '').toLowerCase();
  const feeder = document.getElementById('dt-feeder-filter')?.value || '';
  const la     = document.getElementById('dt-la-filter')?.value || '';
  const filtered = SAMPLE_TRANSFORMERS.filter(t =>
    (!feeder || t.feeder === feeder) &&
    (!la || t.la_present === la) &&
    (!q || JSON.stringify(t).toLowerCase().includes(q))
  );
  document.getElementById('dt-tbody').innerHTML = renderDtRows(filtered);
  document.getElementById('dt-count').textContent = `(${filtered.length} records)`;
};

/* ══════════════════════════════════════════════════════
   SECTION 14 — PROJECTS
══════════════════════════════════════════════════════ */
function renderProjects(type) {
  const projects = SAMPLE_PROJECTS.filter(p => p.type === type);
  const title    = type === 'ongoing' ? 'Ongoing Projects' : 'Upcoming Projects';

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>${title}</h2><p>NESCO infrastructure &amp; upgrade projects</p></div>
    <div class="sec-head-right">
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddProjectModal('${type}')"><i class="fas fa-plus"></i> Add Project</button>` : ''}
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card"><div class="kpi-val">${projects.length}</div><div class="kpi-sub">Total Projects</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${projects.reduce((s,p)=>s+p.budget_lac,0).toLocaleString()}</div><div class="kpi-sub">Budget (Lac BDT)</div></div>
    <div class="kpi-card green"><div class="kpi-val">${type==='ongoing'?Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length)+'%':'—'}</div><div class="kpi-sub">Avg. Progress</div></div>
    <div class="kpi-card"><div class="kpi-val">${projects.filter(p=>p.status==='In Progress').length}</div><div class="kpi-sub">In Progress</div></div>
  </div>

  <div class="proj-grid">
    ${projects.map(p => `
    <div class="proj-card">
      <div class="proj-card-head">
        <div class="proj-name">${p.name}</div>
        <span class="badge ${p.status==='In Progress'?'badge-partial':p.status==='DPP Approved'?'badge-blue':'badge-gray'}">${p.status}</span>
      </div>
      <div style="font-size:.82rem;color:var(--text2);margin-bottom:8px">${p.description}</div>
      <div class="proj-meta">
        <div class="proj-meta-item"><i class="fas fa-map-marker-alt"></i> ${p.location}</div>
        <div class="proj-meta-item"><i class="fas fa-building"></i> ${p.contractor}</div>
        <div class="proj-meta-item"><i class="fas fa-calendar"></i> ${p.start_date} → ${p.end_date}</div>
        <div class="proj-meta-item"><i class="fas fa-money-bill"></i> ৳${p.budget_lac.toLocaleString()} Lac</div>
      </div>
      ${type==='ongoing' ? `
      <div class="proj-progress">
        <div class="proj-progress-label"><span>Progress</span><span>${p.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill ${p.progress>60?'ok':p.progress>30?'warn':'danger'}" style="width:${p.progress}%"></div></div>
      </div>` : ''}
    </div>`).join('')}
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 15 — SWITCHING SUBSTATIONS
══════════════════════════════════════════════════════ */
function renderSwitchingSubstations() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Switching Substations</h2><p>33 kV and 11 kV switching points in the network</p></div>
  </div>
  <div class="alert alert-info">
    <i class="fas fa-info-circle"></i>
    <div>Switching substation data entry module. Add your switching station records using the form below.</div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Switching Substations</h3>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddSwitchingModal()"><i class="fas fa-plus"></i> Add Switching SS</button>` : ''}
    </div>
    <div class="panel-body">
      <div class="tbl-empty">No switching substations added yet. Click "Add Switching SS" to begin.</div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 16 — LOAD HISTORY
══════════════════════════════════════════════════════ */
function renderLoadHistory() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Previous Load History</h2><p>Monthly load trends for Talaimary 33/11 kV substation</p></div>
    <div class="sec-head-right">
      <select class="filter-sel" id="load-year"><option>2024</option><option>2023</option></select>
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card amber"><div class="kpi-val">${Math.max(...LOAD_HISTORY.total)} MW</div><div class="kpi-sub">Peak Load (2024)</div></div>
    <div class="kpi-card"><div class="kpi-val">${(LOAD_HISTORY.total.reduce((a,b)=>a+b,0)/12).toFixed(1)} MW</div><div class="kpi-sub">Average Load</div></div>
    <div class="kpi-card green"><div class="kpi-val">${Math.min(...LOAD_HISTORY.total)} MW</div><div class="kpi-sub">Min Load</div></div>
    <div class="kpi-card"><div class="kpi-val">${Math.round(Math.max(...LOAD_HISTORY.total)/40*100)}%</div><div class="kpi-sub">Peak Load Factor</div></div>
    <div class="kpi-card navy"><div class="kpi-val">40 MVA</div><div class="kpi-sub">Installed Capacity</div></div>
  </div>

  <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-chart-line"></i> Monthly Load Trend (2024)</h3></div>
      <div class="panel-body"><div class="chart-container"><canvas id="chart-load-line"></canvas></div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-chart-pie"></i> T1 vs T2 Load Share</h3></div>
      <div class="panel-body"><div class="chart-container"><canvas id="chart-load-pie"></canvas></div></div>
    </div>
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="panel-head"><h3><i class="fas fa-table"></i> Monthly Load Data Table</h3>
      <button class="btn btn-sm btn-secondary" onclick="window.exportLoadCSV()"><i class="fas fa-download"></i> Export CSV</button>
    </div>
    <div class="panel-body no-pad">
    <div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Month</th><th>T1 Load (MW)</th><th>T2 Load (MW)</th><th>Total (MW)</th><th>Loading %</th></tr></thead>
      <tbody>
        ${LOAD_HISTORY.labels.map((m,i) => {
          const pct = Math.round(LOAD_HISTORY.total[i]/40*100);
          return `<tr>
            <td><strong>${m} 2024</strong></td>
            <td class="num">${LOAD_HISTORY.T1[i]}</td>
            <td class="num">${LOAD_HISTORY.T2[i]}</td>
            <td class="num"><strong>${LOAD_HISTORY.total[i]}</strong></td>
            <td><span class="badge ${pct>70?'badge-bad':pct>50?'badge-partial':'badge-good'}">${pct}%</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    </div>
  </div>
  `;

  setTimeout(() => {
    const ctx1 = document.getElementById('chart-load-line');
    if (ctx1) {
      charts['load-line'] = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: LOAD_HISTORY.labels,
          datasets: [
            { label:'T1 (MW)', data:LOAD_HISTORY.T1, borderColor:'#1565c0', backgroundColor:'rgba(21,101,192,.1)', tension:0.4, fill:true, pointRadius:5 },
            { label:'T2 (MW)', data:LOAD_HISTORY.T2, borderColor:'#059669', backgroundColor:'rgba(5,150,105,.1)', tension:0.4, fill:true, pointRadius:5 },
            { label:'Total (MW)', data:LOAD_HISTORY.total, borderColor:'#d97706', backgroundColor:'transparent', tension:0.4, borderDash:[5,4], pointRadius:3 },
          ]
        },
        options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:false, title:{display:true,text:'Load (MW)'} } }, plugins:{ legend:{position:'top'} } }
      });
    }
    const ctx2 = document.getElementById('chart-load-pie');
    if (ctx2) {
      const t1Total = LOAD_HISTORY.T1.reduce((a,b)=>a+b,0);
      const t2Total = LOAD_HISTORY.T2.reduce((a,b)=>a+b,0);
      charts['load-pie'] = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['T1 Load','T2 Load'],
          datasets: [{ data:[t1Total,t2Total], backgroundColor:['#1565c0','#059669'], borderWidth:2 }]
        },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{position:'bottom'} } }
      });
    }
  }, 100);
}

window.exportLoadCSV = () => {
  const rows = [['Month','T1 Load (MW)','T2 Load (MW)','Total (MW)','Loading %']];
  LOAD_HISTORY.labels.forEach((m,i) => {
    rows.push([m+' 2024', LOAD_HISTORY.T1[i], LOAD_HISTORY.T2[i], LOAD_HISTORY.total[i], Math.round(LOAD_HISTORY.total[i]/40*100)+'%']);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], {type:'text/csv'})), download: 'talaimary_load_history_2024.csv' });
  a.click();
  showToast('Load history exported!', 'success');
};

/* ══════════════════════════════════════════════════════
   SECTION 17 — MODALS (Add/Edit Forms)
══════════════════════════════════════════════════════ */
window.openModal = (title, bodyHtml) => {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-bg').style.display = 'flex';
};

window.closeModal = () => {
  document.getElementById('modal-bg').style.display = 'none';
};

document.getElementById('modal-bg').addEventListener('click', e => {
  if (e.target === e.currentTarget) window.closeModal();
});

// Add Transformer Modal
window.openAddTransformerModal = (existing = null) => {
  const f = existing || {};
  window.openModal(existing ? 'Edit Distribution Transformer' : 'Add Distribution Transformer', `
  <form id="tx-form" onsubmit="window.saveTxForm(event)">
    <p class="form-section-title"><span class="num-circle">A</span> Basic Info</p>
    <div class="form-row cols-3">
      <div class="fg"><label>Feeder Name <span class="req">*</span></label>
        <select required name="feeder">
          ${FEEDER_SUMMARY.map(ff => `<option value="${ff.name}" ${f.feeder===ff.name?'selected':''}>${ff.name}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label>GIS ID</label><input name="gis_id" value="${f.gis_id||''}" placeholder="e.g. 2085135"></div>
      <div class="fg"><label>Capacity (kVA) <span class="req">*</span></label>
        <select required name="capacity_kva">
          ${[50,100,200,250,315,500].map(k => `<option value="${k}" ${f.capacity_kva===k?'selected':''}>${k} kVA</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row cols-2">
      <div class="fg"><label>Local / Common Name <span class="req">*</span></label><input required name="local_name" value="${f.local_name||''}" placeholder="e.g. Hanufar Mor West"></div>
      <div class="fg"><label>GIS Location (Map URL)</label><input name="gis_location" value="${f.gis_location||''}" placeholder="https://maps.google.com/..."></div>
    </div>

    <p class="form-section-title"><span class="num-circle">B</span> Equipment Status</p>
    <div class="form-row cols-3">
      <div class="fg"><label>11 kV LA — Present</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="la_present" value="Yes" ${f.la_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="la_present" value="No" ${f.la_present==='No'?'checked':''}> No</label>
        </div>
      </div>
      <div class="fg"><label>11 kV LA — Condition</label>
        <select name="la_condition"><option value="">N/A</option><option ${f.la_condition==='Good'?'selected':''}>Good</option><option ${f.la_condition==='Bad'?'selected':''}>Bad</option></select>
      </div>
      <div class="fg"></div>
      <div class="fg"><label>11 kV DOFC — Present</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="dofc_present" value="Yes" ${f.dofc_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="dofc_present" value="No" ${f.dofc_present==='No'?'checked':''}> No</label>
        </div>
      </div>
      <div class="fg"><label>11 kV DOFC — Condition</label>
        <select name="dofc_condition"><option value="">N/A</option><option ${f.dofc_condition==='Good'?'selected':''}>Good</option><option ${f.dofc_condition==='Bad'?'selected':''}>Bad</option></select>
      </div>
      <div class="fg"></div>
      <div class="fg"><label>0.4 kV MCCB — Present</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="mccb_present" value="Yes" ${f.mccb_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="mccb_present" value="No" ${f.mccb_present==='No'?'checked':''}> No</label>
        </div>
      </div>
      <div class="fg"><label>0.4 kV MCCB — Condition</label>
        <select name="mccb_condition"><option value="">N/A</option><option ${f.mccb_condition==='Good'?'selected':''}>Good</option><option ${f.mccb_condition==='Bad'?'selected':''}>Bad</option></select>
      </div>
    </div>

    <p class="form-section-title"><span class="num-circle">C</span> Grounding &amp; LT Loop</p>
    <div class="form-row cols-3">
      <div class="fg"><label>Grounding — Present</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="grounding_present" value="Yes" ${f.grounding_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="grounding_present" value="No" ${f.grounding_present==='No'?'checked':''}> No</label>
        </div>
      </div>
      <div class="fg"><label>Grounding Qty</label><input type="number" name="grounding_qty" min="0" value="${f.grounding_qty||''}"></div>
      <div class="fg"><label>LT Loop Material</label>
        <select name="lt_material"><option value="">—</option><option ${f.lt_material==='Copper'?'selected':''}>Copper</option><option ${f.lt_material==='Aluminium'?'selected':''}>Aluminium</option></select>
      </div>
      <div class="fg full-width"><label>Remarks</label><textarea name="remarks" rows="2">${f.remarks||''}</textarea></div>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Transformer</button>
    </div>
  </form>
  `);
};

window.saveTxForm = async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const record = Object.fromEntries(fd.entries());
  record.grounding_qty = parseInt(record.grounding_qty) || 0;

  if (IS_CONFIGURED) {
    await addDoc(collection(db, 'transformers'), { ...record, createdAt: serverTimestamp() });
  } else {
    SAMPLE_TRANSFORMERS.push({ ...record, sl: SAMPLE_TRANSFORMERS.length + 1 });
  }
  window.closeModal();
  showToast('Transformer record saved!', 'success');
  renderDtEquipment();
};

// Add Project Modal
window.openAddProjectModal = (type) => {
  window.openModal(`Add ${type === 'ongoing' ? 'Ongoing' : 'Upcoming'} Project`, `
  <form id="proj-form" onsubmit="window.saveProjForm(event, '${type}')">
    <div class="form-row cols-2">
      <div class="fg full-width"><label>Project Name <span class="req">*</span></label><input required name="name" placeholder="e.g. Talaimary 33 kV Bus Extension"></div>
      <div class="fg"><label>Location <span class="req">*</span></label><input required name="location" placeholder="e.g. Rajshahi"></div>
      <div class="fg"><label>Budget (Lac BDT)</label><input type="number" name="budget_lac" min="0" placeholder="e.g. 450"></div>
      <div class="fg"><label>Start Date</label><input type="date" name="start_date"></div>
      <div class="fg"><label>End Date</label><input type="date" name="end_date"></div>
      <div class="fg"><label>Contractor</label><input name="contractor" placeholder="e.g. Energypac Engineering Ltd."></div>
      <div class="fg"><label>Status</label>
        <select name="status">
          ${type==='ongoing'?['In Progress','Pending','On Hold'].map(s=>`<option>${s}</option>`).join(''):
            ['Planning','DPP Approved','Design Phase','Tender Stage'].map(s=>`<option>${s}</option>`).join('')}
        </select>
      </div>
      ${type==='ongoing' ? `<div class="fg"><label>Progress (%)</label><input type="number" name="progress" min="0" max="100" value="0"></div>` : ''}
      <div class="fg full-width"><label>Description</label><textarea name="description" rows="2"></textarea></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Project</button>
    </div>
  </form>`);
};

window.saveProjForm = async (e, type) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const record = Object.fromEntries(fd.entries());
  record.type = type;
  record.budget_lac = parseInt(record.budget_lac) || 0;
  record.progress   = parseInt(record.progress) || 0;
  record.id = 'p' + Date.now();

  if (IS_CONFIGURED) {
    await addDoc(collection(db, 'projects'), { ...record, createdAt: serverTimestamp() });
  } else {
    SAMPLE_PROJECTS.push(record);
  }
  window.closeModal();
  showToast('Project saved!', 'success');
  renderProjects(type);
};

// Stubs for other modals
window.openAddSubstationModal = () => showToast('Add Substation form — connect Firebase to enable', 'warn');
window.openEditSubstationModal = () => showToast('Edit form — connect Firebase to enable', 'warn');
window.openAddLineModal = () => showToast('Add 33 kV Line form — connect Firebase to enable', 'warn');
window.openAddSwitchingModal = () => showToast('Add Switching SS form — connect Firebase to enable', 'warn');
window.openEditTxModal = (gisId) => {
  const tx = SAMPLE_TRANSFORMERS.find(t => t.gis_id === gisId);
  if (tx) window.openAddTransformerModal(tx);
};
window.confirmDeleteTx = (gisId) => {
  if (confirm(`Delete transformer GIS ID: ${gisId}?`)) {
    const idx = SAMPLE_TRANSFORMERS.findIndex(t => t.gis_id === gisId);
    if (idx > -1) { SAMPLE_TRANSFORMERS.splice(idx, 1); renderDtEquipment(); showToast('Deleted.', 'success'); }
  }
};

/* ══════════════════════════════════════════════════════
   SECTION 18 — TOAST NOTIFICATIONS
══════════════════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  const wrap = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'times-circle':type==='warn'?'exclamation-triangle':'info-circle'}"></i> ${msg}`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; setTimeout(() => t.remove(), 400); }, 3500);
}

/* ══════════════════════════════════════════════════════
   SECTION 19 — EXPOSE GLOBALS & INIT
══════════════════════════════════════════════════════ */
window.showSection     = showSection;
window.showToast       = showToast;
window.renderDtRows    = renderDtRows;

document.addEventListener('DOMContentLoaded', () => {
  // Mobile dropdown toggle
  document.querySelectorAll('.dd-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        btn.closest('.has-dd').classList.toggle('open');
      }
    });
  });

  if (!IS_CONFIGURED) {
    // Demo mode — auto-login
    currentUser = { email: 'demo@nesco.gov.bd', displayName: 'Demo Admin' };
    currentRole = 'admin';
    // Show login screen briefly, then auto-login after 1.5s
    setTimeout(() => onLoginSuccess(), 1500);
  }
});
