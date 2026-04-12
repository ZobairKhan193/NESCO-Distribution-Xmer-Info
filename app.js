/* ════════════════════════════════════════════════════════════════
   NESCO Distribution MIS — app.js
   Substation detail view matches every column in
   Substation_Information_Template.xlsx exactly.
════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   SECTION 1 — FIREBASE CONFIG
   ★ PASTE YOUR FIREBASE CONFIG HERE ★
══════════════════════════════════════════════════════ */
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDoc, serverTimestamp }
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
let currentUser    = null;
let currentRole    = 'user';
let currentSection = 'dashboard';
let charts         = {};

/* ══════════════════════════════════════════════════════
   SECTION 3 — SUBSTATION DATA  (from substations.json)
══════════════════════════════════════════════════════ */
let ALL_SUBSTATIONS = [];
let TALAIMARY_SS    = null;

async function loadSubstationData() {
  try {
    const r = await fetch('./substations.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    ALL_SUBSTATIONS = await r.json();
    TALAIMARY_SS = ALL_SUBSTATIONS.find(s =>
      (s.name||'').toLowerCase().includes('talaimari')
    ) || ALL_SUBSTATIONS[0];
    console.log(`✓ Loaded ${ALL_SUBSTATIONS.length} substations`);
  } catch (err) {
    console.error('substations.json load failed:', err);
    TALAIMARY_SS    = FALLBACK_SS;
    ALL_SUBSTATIONS = [FALLBACK_SS];
    showToast('substations.json not found — showing demo data', 'warn');
  }
}

/* Minimal fallback so the page never breaks */
const FALLBACK_SS = {
  id: 'talaimary-rajshahi', sheet_name: 'Talaimari',
  name: 'Talaimary 33/11 KV',
  sdd_esu: 'S&D-1, Rajshahi.',
  capacity_mva: '2x20/26.66',
  max_demand_mw: 23,
  gps_lat: 24.360371, gps_lng: 88.626316,
  mobile: '01782-299771',
  grounding_resistance: null, grounding_date: null,
  status: 'Online',
  lines_33kv: [
    { name:'Katakhali-Talaimari',    source_ring:'Source', length_km:5.5, conductor:'Grosbeak', breaker:'Energypac', panel:'Energypac', remarks:'Source line' },
    { name:'City Central-Talaimari', source_ring:'Ring',   length_km:4.5, conductor:'Grosbeak', breaker:'Energypac', panel:'Energypac', remarks:'Ring line'   },
    { name:'Meherchandi-Talaimari',  source_ring:'Ring',   length_km:3.3, conductor:'Grosbeak', breaker:'Energypac', panel:'Energypac', remarks:'Ring line'   },
  ],
  power_transformers: [
    { name:'T1', capacity:'20/26.66', ais_gis:'AIS', cb_type:null,
      breaker:'Energypac', cb_year:'2018', ct_manufacturer:null, ct_year:null,
      panel:'Energypac', panel_year:'2018',
      max_load_mw:12, impedance_pct:11.061,
      brand:'Energypac', year:'2018',
      oltc_manufacturer:null, oil_breakdown_voltage:null,
      oti_temp:null, oti_date:null,
      ht_wti_temp:null, ht_wti_date:null,
      lt_wti_temp:null, lt_wti_date:null,
      comment: null },
    { name:'T2', capacity:'20/26.66', ais_gis:'AIS', cb_type:null,
      breaker:'Energypac', cb_year:'2018', ct_manufacturer:null, ct_year:null,
      panel:'Energypac', panel_year:'2018',
      max_load_mw:11, impedance_pct:11.056,
      brand:'Energypac', year:'2018',
      oltc_manufacturer:null, oil_breakdown_voltage:null,
      oti_temp:null, oti_date:null,
      ht_wti_temp:null, ht_wti_date:null,
      lt_wti_temp:null, lt_wti_date:null,
      comment: null },
  ],
  feeders_11kv: [
    { transformer:'T1', capacity:'20/26.66', name:'Sagorpara',   max_load_mw:2.5, length_km:6,    panel:'Energypac', panel_year:null, remarks:'Coupling Existing' },
    { transformer:'T1', capacity:'20/26.66', name:'Tikapara',    max_load_mw:2.4, length_km:5,    panel:null,        panel_year:null, remarks:null },
    { transformer:'T1', capacity:'20/26.66', name:'RUET',        max_load_mw:1.2, length_km:0.8,  panel:null,        panel_year:null, remarks:null },
    { transformer:'T1', capacity:'20/26.66', name:'Varsity',     max_load_mw:2.2, length_km:6,    panel:null,        panel_year:null, remarks:null },
    { transformer:'T1', capacity:'20/26.66', name:'Motihar',     max_load_mw:2.1, length_km:5.2,  panel:null,        panel_year:null, remarks:null },
    { transformer:'T2', capacity:'20/26.66', name:'Sericulture', max_load_mw:2.2, length_km:7.5,  panel:'Energypac', panel_year:null, remarks:null },
    { transformer:'T2', capacity:'20/26.66', name:'Raninagor',   max_load_mw:2.1, length_km:8,    panel:null,        panel_year:null, remarks:null },
    { transformer:'T2', capacity:'20/26.66', name:'Vadra',       max_load_mw:2.0, length_km:11,   panel:null,        panel_year:null, remarks:null },
    { transformer:'T2', capacity:'20/26.66', name:'CharKazla',   max_load_mw:2.3, length_km:10.5, panel:null,        panel_year:null, remarks:null },
    { transformer:'T2', capacity:'20/26.66', name:'Binodpur',    max_load_mw:null,length_km:62,   panel:null,        panel_year:null, remarks:null },
  ],
};

/* ══════════════════════════════════════════════════════
   SECTION 4 — DISTRIBUTION TRANSFORMER DATA
   (Rajshahi-Analysis_03.xlsx — Talaimary feeders)
══════════════════════════════════════════════════════ */
const FEEDER_SUMMARY = [
  { name:'Binodpur',    count:36, kva100:9,  kva200:12, kva250:15, total_kva:7050,   cap_mva:7.05,   la:11, la_absent:22, la_good:9,  la_bad:2, dofc:11, dofc_absent:22, dofc_good:5,  dofc_bad:6, mccb:12, mccb_absent:21, mccb_good:7,  mccb_bad:5, gnd:27, gnd_absent:6,  copper:27, aluminium:0  },
  { name:'CharKazla',   count:32, kva100:9,  kva200:13, kva250:10, total_kva:6000,   cap_mva:6.00,   la:13, la_absent:18, la_good:13, la_bad:0, dofc:11, dofc_absent:20, dofc_good:11, dofc_bad:0, mccb:14, mccb_absent:17, mccb_good:12, mccb_bad:2, gnd:31, gnd_absent:0,  copper:26, aluminium:0  },
  { name:'Motihar',     count:34, kva100:5,  kva200:16, kva250:13, total_kva:6950,   cap_mva:6.95,   la:17, la_absent:16, la_good:16, la_bad:1, dofc:9,  dofc_absent:24, dofc_good:4,  dofc_bad:5, mccb:17, mccb_absent:16, mccb_good:8,  mccb_bad:9, gnd:33, gnd_absent:0,  copper:30, aluminium:0  },
  { name:'RUET',        count:29, kva100:0,  kva200:0,  kva250:0,  total_kva:0,      cap_mva:0,      la:0,  la_absent:0,  la_good:0,  la_bad:0, dofc:0,  dofc_absent:0,  dofc_good:0,  dofc_bad:0, mccb:0,  mccb_absent:0,  mccb_good:0,  mccb_bad:0, gnd:0,  gnd_absent:0,  copper:0,  aluminium:0  },
  { name:'Raninagar',   count:28, kva100:3,  kva200:12, kva250:12, total_kva:5750,   cap_mva:5.75,   la:19, la_absent:9,  la_good:12, la_bad:6, dofc:8,  dofc_absent:20, dofc_good:8,  dofc_bad:0, mccb:17, mccb_absent:11, mccb_good:16, mccb_bad:1, gnd:28, gnd_absent:0,  copper:9,  aluminium:19 },
  { name:'Sagorpara',   count:35, kva100:1,  kva200:0,  kva250:0,  total_kva:287968, cap_mva:287.97, la:0,  la_absent:0,  la_good:0,  la_bad:0, dofc:0,  dofc_absent:0,  dofc_good:0,  dofc_bad:0, mccb:0,  mccb_absent:0,  mccb_good:0,  mccb_bad:0, gnd:0,  gnd_absent:0,  copper:0,  aluminium:0  },
  { name:'Tikapara',    count:33, kva100:3,  kva200:9,  kva250:21, total_kva:7350,   cap_mva:7.35,   la:14, la_absent:16, la_good:11, la_bad:3, dofc:12, dofc_absent:18, dofc_good:12, dofc_bad:0, mccb:13, mccb_absent:17, mccb_good:13, mccb_bad:0, gnd:29, gnd_absent:1,  copper:19, aluminium:0  },
  { name:'Sericulture', count:29, kva100:7,  kva200:11, kva250:11, total_kva:5650,   cap_mva:5.65,   la:8,  la_absent:21, la_good:8,  la_bad:0, dofc:8,  dofc_absent:21, dofc_good:8,  dofc_bad:0, mccb:10, mccb_absent:19, mccb_good:10, mccb_bad:0, gnd:29, gnd_absent:0,  copper:11, aluminium:1  },
  { name:'Versity',     count:29, kva100:1,  kva200:0,  kva250:0,  total_kva:100,    cap_mva:0.1,    la:0,  la_absent:0,  la_good:0,  la_bad:0, dofc:0,  dofc_absent:0,  dofc_good:0,  dofc_bad:0, mccb:0,  mccb_absent:0,  mccb_good:0,  mccb_bad:0, gnd:0,  gnd_absent:0,  copper:0,  aluminium:0  },
  { name:'Vodra',       count:29, kva100:4,  kva200:7,  kva250:18, total_kva:6300,   cap_mva:6.30,   la:9,  la_absent:20, la_good:9,  la_bad:0, dofc:4,  dofc_absent:25, dofc_good:4,  dofc_bad:0, mccb:6,  mccb_absent:23, mccb_good:6,  mccb_bad:0, gnd:29, gnd_absent:0,  copper:6,  aluminium:23 },
];

const SAMPLE_TRANSFORMERS = [
  {feeder:'Binodpur',   sl:1, gis_id:'2085135', substation:'Talaimary', capacity_kva:250, ref_no:'4256',    local_name:'Hanufar Mor West',       la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Bad',  mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Binodpur',   sl:2, gis_id:'2084899', substation:'Talaimary', capacity_kva:250, ref_no:'4780',    local_name:'Anis Mor East',          la_present:'No',  la_condition:'',     dofc_present:'No',  dofc_condition:'',     mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Binodpur',   sl:3, gis_id:'2084594', substation:'Talaimary', capacity_kva:200, ref_no:'4087',    local_name:'Binodpur Bazar Mosque',  la_present:'No',  la_condition:'',     dofc_present:'No',  dofc_condition:'',     mccb_present:'Yes', mccb_condition:'Bad', grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Binodpur',   sl:4, gis_id:'2084561', substation:'Talaimary', capacity_kva:250, ref_no:'4044',    local_name:'Hanufar Mor',            la_present:'No',  la_condition:'',     dofc_present:'No',  dofc_condition:'',     mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Binodpur',   sl:5, gis_id:'2084832', substation:'Talaimary', capacity_kva:100, ref_no:'6250',    local_name:'Mirzapur Unique Palace', la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Binodpur',   sl:6, gis_id:'2084681', substation:'Talaimary', capacity_kva:250, ref_no:'4263',    local_name:'Lebubagan-1',            la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Bad', grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Motihar',    sl:1, gis_id:'2084563', substation:'Talaimary', capacity_kva:200, ref_no:'192',     local_name:'Amena Tower North',      la_present:'No',  la_condition:'',     dofc_present:'No',  dofc_condition:'',     mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Motihar',    sl:2, gis_id:'2084023', substation:'Talaimary', capacity_kva:250, ref_no:'199',     local_name:'Alamer Mor West',        la_present:'No',  la_condition:'',     dofc_present:'No',  dofc_condition:'',     mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'Motihar',    sl:6, gis_id:'3520914', substation:'Talaimary', capacity_kva:200, ref_no:'1102947', local_name:'Fultola West',           la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'CharKazla',  sl:1, gis_id:'2084494', substation:'Talaimary', capacity_kva:200, ref_no:'13013',   local_name:'Corridor Mor',           la_present:'No',  la_condition:'',     dofc_present:'No',  dofc_condition:'',     mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Copper',    remarks:''},
  {feeder:'CharKazla',  sl:5, gis_id:'2084854', substation:'Talaimary', capacity_kva:200, ref_no:'12528',   local_name:'Abdur Rahim Mor North',  la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:2, lt_material:'Copper',    remarks:''},
  {feeder:'Raninagar',  sl:1, gis_id:'2084511', substation:'Talaimary', capacity_kva:200, ref_no:'3213',    local_name:'Shahid Minar North',     la_present:'Yes', la_condition:'Bad',  dofc_present:'No',  dofc_condition:'',     mccb_present:'No',  mccb_condition:'',    grounding_present:'Yes', grounding_qty:1, lt_material:'Aluminium', remarks:''},
  {feeder:'Raninagar',  sl:8, gis_id:'2084007', substation:'Talaimary', capacity_kva:200, ref_no:'3206',    local_name:"Women's Hall",           la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:2, lt_material:'Aluminium', remarks:''},
  {feeder:'Tikapara',   sl:3, gis_id:'2085322', substation:'Talaimary', capacity_kva:200, ref_no:'10252',   local_name:'Tikapara School',        la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:2, lt_material:'Aluminium', remarks:''},
  {feeder:'Sericulture',sl:8, gis_id:'3521221', substation:'Talaimary', capacity_kva:200, ref_no:'42',      local_name:'Motpukur Mor (Wall)',     la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:2, lt_material:'Copper',    remarks:''},
  {feeder:'Vodra',      sl:2, gis_id:'3521256', substation:'Talaimary', capacity_kva:250, ref_no:'109',     local_name:'Vodra Bou Bazar-1',      la_present:'Yes', la_condition:'Good', dofc_present:'Yes', dofc_condition:'Good', mccb_present:'Yes', mccb_condition:'Good',grounding_present:'Yes', grounding_qty:2, lt_material:'Aluminium', remarks:''},
];

const SAMPLE_PROJECTS = [
  { id:'p1', type:'ongoing',  name:'Talaimary 33 kV Bus Extension',   location:'Rajshahi',           status:'In Progress',  progress:65, budget_lac:450,  start_date:'2024-06-01', end_date:'2025-09-30', description:'Extension of 33 kV bus at Talaimary substation to accommodate additional transformer bay.',  contractor:'Energypac Engineering Ltd.'  },
  { id:'p2', type:'ongoing',  name:'Binodpur Feeder Reconductoring',   location:'Binodpur, Rajshahi', status:'In Progress',  progress:40, budget_lac:280,  start_date:'2024-09-01', end_date:'2025-12-31', description:'Replacement of old ACSR conductor on the Binodpur 11 kV feeder with new XLPE cable.',       contractor:'Bangladesh Electrical Consortium'},
  { id:'p3', type:'ongoing',  name:'SCADA Integration – Talaimary',    location:'Talaimary, Rajshahi',status:'Pending',      progress:15, budget_lac:820,  start_date:'2024-11-01', end_date:'2026-03-31', description:'Installation of SCADA system for remote monitoring and control of Talaimary substation.', contractor:'ABB Bangladesh'              },
  { id:'p4', type:'upcoming', name:'New 33/11 kV Substation – Paba',   location:'Paba, Rajshahi',    status:'Design Phase', progress:0,  budget_lac:1800, start_date:'2025-07-01', end_date:'2027-06-30', description:'Construction of a new 33/11 kV substation at Paba to reduce load on Talaimary.',          contractor:'TBD'                         },
  { id:'p5', type:'upcoming', name:'Motihar Underground Cable',         location:'Motihar, Rajshahi', status:'DPP Approved', progress:0,  budget_lac:650,  start_date:'2025-10-01', end_date:'2027-03-31', description:'Underground cabling for Motihar feeder through the university campus area.',              contractor:'TBD'                         },
];

const LOAD_HISTORY = {
  labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  T1:     [10.2, 10.8, 11.5, 12.1, 13.4, 14.2, 14.8, 15.1, 13.9, 12.4, 11.2, 10.5],
  T2:     [ 9.8, 10.1, 10.9, 11.4, 12.8, 13.6, 14.1, 14.4, 13.2, 11.8, 10.6,  9.9],
  total:  [20.0, 20.9, 22.4, 23.5, 26.2, 27.8, 28.9, 29.5, 27.1, 24.2, 21.8, 20.4],
};

/* ══════════════════════════════════════════════════════
   SECTION 5 — AUTH
══════════════════════════════════════════════════════ */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email  = document.getElementById('login-email').value.trim();
  const pwd    = document.getElementById('login-password').value;
  const btn    = document.getElementById('login-btn');
  const errEl  = document.getElementById('login-error');
  const errMsg = document.getElementById('login-err-msg');

  btn.disabled = true;
  btn.textContent = '⏳ Signing in…';
  errEl.style.display = 'none';

  if (!IS_CONFIGURED) {
    currentUser = { email, displayName: email.split('@')[0] };
    currentRole = 'admin';
    onLoginSuccess();
    return;
  }
  try {
    const cred    = await signInWithEmailAndPassword(auth, email, pwd);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    currentRole   = userDoc.exists() ? (userDoc.data().role || 'user') : 'user';
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
  document.getElementById('u-avatar').textContent   = name.charAt(0).toUpperCase();
  document.getElementById('u-name').textContent     = name;
  document.getElementById('u-role').textContent     = currentRole.toUpperCase();
  document.getElementById('u-dd-name').textContent  = name;
  document.getElementById('u-dd-email').textContent = email;
  showSection('dashboard');
}

window.logout = async () => { if (IS_CONFIGURED) await signOut(auth); location.reload(); };

if (IS_CONFIGURED) {
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      const ud = await getDoc(doc(db, 'users', user.uid));
      currentRole = ud.exists() ? (ud.data().role||'user') : 'user';
      onLoginSuccess();
    }
  });
}

/* ══════════════════════════════════════════════════════
   SECTION 6 — NAVIGATION
══════════════════════════════════════════════════════ */
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
  showSection(link.dataset.section);
  document.getElementById('nav-menu').classList.remove('open');
});

function showSection(sec, param = null) {
  currentSection = sec;
  document.getElementById('bc-label').textContent = SECTION_LABELS[sec] || sec;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.nav-link[data-section="${sec}"]`);
  if (active) active.classList.add('active');
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};

  const R = {
    'dashboard':             renderDashboard,
    'substation-summary':    renderSubstationSummary,
    'substation-detail':     () => renderSubstationDetail(param),
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
  (R[sec] || (() => {
    document.getElementById('content').innerHTML = `<div class="page-loader">Section coming soon.</div>`;
  }))();
}

window.toggleNav = () => document.getElementById('nav-menu').classList.toggle('open');

/* ════════════════════════════════════════════════════
   HELPER — null-safe display value
════════════════════════════════════════════════════ */
const D = v => (v != null && v !== '' && v !== 'null') ? v : '—';

/* ══════════════════════════════════════════════════════
   SECTION 7 — DASHBOARD
══════════════════════════════════════════════════════ */
function renderDashboard() {
  const totalTx   = FEEDER_SUMMARY.reduce((s,f) => s+f.count,  0);
  const totalMva  = FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f) => s+f.cap_mva, 0);
  const totalLa   = FEEDER_SUMMARY.reduce((s,f) => s+f.la,   0);
  const totalDofc = FEEDER_SUMMARY.reduce((s,f) => s+f.dofc, 0);
  const totalMccb = FEEDER_SUMMARY.reduce((s,f) => s+f.mccb, 0);
  const totalGnd  = FEEDER_SUMMARY.reduce((s,f) => s+f.gnd,  0);

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>System Dashboard</h2>
      <p>NESCO Distribution Network — ${ALL_SUBSTATIONS.length} substations across northern Bangladesh</p>
    </div>
    <div class="sec-head-right">
      <span class="badge badge-online"><i class="fas fa-circle"></i> Network Online</span>
      <span style="font-size:.78rem;color:var(--text3)">Updated: ${new Date().toLocaleDateString()}</span>
    </div>
  </div>

  ${!IS_CONFIGURED ? `<div class="alert alert-warn"><i class="fas fa-exclamation-triangle"></i>
    <div><strong>Demo Mode:</strong> Firebase not configured. Paste your config in app.js to enable full database features.</div>
  </div>` : ''}

  <div class="kpi-row">
    <div class="kpi-card navy"><div class="kpi-val">${ALL_SUBSTATIONS.length}</div><div class="kpi-sub">Total Substations</div></div>
    <div class="kpi-card"><div class="kpi-val">${TALAIMARY_SS?.capacity_mva||'2×20'}</div><div class="kpi-sub">Talaimary Capacity (MVA)</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${TALAIMARY_SS?.max_demand_mw||23} MW</div><div class="kpi-sub">Talaimary Max Demand</div></div>
    <div class="kpi-card"><div class="kpi-val">${totalTx}</div><div class="kpi-sub">Dist. Transformers (Talaimary)</div></div>
    <div class="kpi-card"><div class="kpi-val">${totalMva.toFixed(1)}</div><div class="kpi-sub">DT Capacity (MVA)</div></div>
    <div class="kpi-card green"><div class="kpi-val">${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).length}</div><div class="kpi-sub">Active Feeders</div></div>
    <div class="kpi-card"><div class="kpi-val">${SAMPLE_PROJECTS.filter(p=>p.type==='ongoing').length}</div><div class="kpi-sub">Ongoing Projects</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${SAMPLE_PROJECTS.filter(p=>p.type==='upcoming').length}</div><div class="kpi-sub">Upcoming Projects</div></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-shield-alt"></i> DT Equipment Coverage — Talaimary (314 Transformers)</h3></div>
      <div class="panel-body">
        ${[
          ['11 kV LA',    totalLa,   totalTx, 'var(--red2)'],
          ['11 kV DOFC',  totalDofc, totalTx, 'var(--amber2)'],
          ['0.4 kV MCCB', totalMccb, totalTx, 'var(--purple2)'],
          ['Grounding',   totalGnd,  totalTx, 'var(--green2)'],
        ].map(([lbl,val,tot,col]) => {
          const pct = Math.round(val/tot*100);
          return `<div class="cov-bar-row">
            <div class="cov-bar-label">${lbl}</div>
            <div class="cov-bar-wrap"><div class="cov-bar-fill" style="width:${pct}%;background:${col}"></div></div>
            <div class="cov-bar-val">${pct}%</div>
            <div style="font-size:.74rem;color:var(--text3);min-width:60px">${val}/${tot}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-bolt"></i> Talaimary Feeder Quick Summary</h3></div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Feeder</th><th>DTs</th><th>Capacity</th><th>LA %</th><th>Grounding %</th></tr></thead>
          <tbody>${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).map(f => {
            const laPct  = f.count ? Math.round(f.la/f.count*100)  : 0;
            const gndPct = f.count ? Math.round(f.gnd/f.count*100) : 0;
            return `<tr>
              <td><strong>${f.name}</strong></td>
              <td class="num">${f.count}</td>
              <td class="num">${f.cap_mva.toFixed(2)} MVA</td>
              <td><span class="badge ${laPct>=50?'badge-yes':'badge-no'}">${laPct}%</span></td>
              <td><span class="badge ${gndPct>=80?'badge-yes':'badge-partial'}">${gndPct}%</span></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    </div>
  </div>

  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head">
      <h3><i class="fas fa-chart-area"></i> Monthly Load Trend — Talaimary (2024)</h3>
      <span class="badge badge-blue">T1 + T2 Combined</span>
    </div>
    <div class="panel-body"><div class="chart-container"><canvas id="chart-dash-load"></canvas></div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3><i class="fas fa-hard-hat"></i> Active Projects</h3>
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('ongoing-projects')">View All</button>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Project</th><th>Location</th><th>Budget (Lac BDT)</th><th>Progress</th><th>Status</th></tr></thead>
      <tbody>${SAMPLE_PROJECTS.filter(p=>p.type==='ongoing').map(p=>`
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
    </table></div></div>
  </div>
  `;

  setTimeout(() => {
    const ctx = document.getElementById('chart-dash-load');
    if (!ctx) return;
    charts['dash-load'] = new Chart(ctx, {
      type: 'line',
      data: { labels: LOAD_HISTORY.labels, datasets: [
        { label:'T1 Load (MW)', data:LOAD_HISTORY.T1,    borderColor:'#1565c0', backgroundColor:'rgba(21,101,192,.08)', tension:0.4, fill:true, pointRadius:4 },
        { label:'T2 Load (MW)', data:LOAD_HISTORY.T2,    borderColor:'#059669', backgroundColor:'rgba(5,150,105,.08)',  tension:0.4, fill:true, pointRadius:4 },
        { label:'Total (MW)',   data:LOAD_HISTORY.total, borderColor:'#d97706', backgroundColor:'transparent',          tension:0.4, borderDash:[5,4], pointRadius:3 },
      ]},
      options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top'}}, scales:{y:{beginAtZero:false,title:{display:true,text:'Load (MW)'}}} }
    });
  }, 100);
}

/* ══════════════════════════════════════════════════════
   SECTION 8 — SUBSTATION SUMMARY
══════════════════════════════════════════════════════ */
function renderSubstationSummary() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>33/11 kV Substation Summary</h2>
      <p>All ${ALL_SUBSTATIONS.length} substations in the NESCO distribution network</p>
    </div>
    <div class="sec-head-right">
      <input class="search-input" id="ss-search" placeholder="🔍 Search substations…" oninput="window.filterSSGrid()" style="max-width:280px">
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddSubstationModal()"><i class="fas fa-plus"></i> Add</button>` : ''}
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${ALL_SUBSTATIONS.length}</div><div class="kpi-sub">Total Substations</div></div>
    <div class="kpi-card green"><div class="kpi-val">${ALL_SUBSTATIONS.filter(s=>s.status==='Online').length}</div><div class="kpi-sub">Online</div></div>
    <div class="kpi-card red"><div class="kpi-val">0</div><div class="kpi-sub">Offline</div></div>
    <div class="kpi-card"><div class="kpi-val">${ALL_SUBSTATIONS.reduce((s,ss)=>s+(ss.power_transformers||[]).length,0)}</div><div class="kpi-sub">Total Power TXs</div></div>
    <div class="kpi-card amber"><div class="kpi-val">1065 MW</div><div class="kpi-sub">Network Max Demand</div></div>
  </div>
  <div class="ss-grid" id="ss-grid">
    ${ALL_SUBSTATIONS.map(ss => renderSSCard(ss)).join('')}
  </div>
  `;
}

function renderSSCard(ss) {
  if (!ss) return '';
  const txs     = ss.power_transformers || [];
  const feeders = ss.feeders_11kv       || [];
  const lines   = ss.lines_33kv         || [];
  const totalLoad = txs.reduce((s,t)=>s+(parseFloat(t.max_load_mw)||0), 0);
  const capMatch  = (ss.capacity_mva||'').match(/(\d+(?:\.\d+)?)/);
  const capNum    = capMatch ? parseFloat(capMatch[1]) : 0;
  const loadPct   = capNum  ? Math.round(totalLoad/capNum*100) : 0;
  return `
  <div class="ss-card" onclick="window.showSection('substation-detail','${ss.id}')">
    <div class="ss-card-top">
      <div>
        <div class="ss-name">${ss.name||ss.sheet_name}</div>
        <div class="ss-meta"><i class="fas fa-building"></i> ${ss.sdd_esu||'—'}</div>
      </div>
      <span class="badge badge-online">${ss.status||'Online'}</span>
    </div>
    <div style="font-size:.78rem;color:var(--text3);margin-bottom:8px">
      <i class="fas fa-bolt"></i> ${ss.capacity_mva||'—'} MVA &nbsp;|&nbsp;
      <i class="fas fa-tachometer-alt"></i> ${ss.max_demand_mw ? ss.max_demand_mw+' MW' : '—'}
    </div>
    ${capNum&&totalLoad ? `
    <div class="progress-bar" style="margin-bottom:4px">
      <div class="progress-fill ${loadPct>80?'danger':loadPct>60?'warn':'ok'}" style="width:${Math.min(loadPct,100)}%"></div>
    </div>
    <div style="font-size:.72rem;color:var(--text3);margin-bottom:8px">Load: ${totalLoad} MW / ${ss.capacity_mva} (${loadPct}%)</div>` : ''}
    <div class="ss-stats">
      <div class="ss-stat"><span class="ss-stat-val">${lines.length}</span><span class="ss-stat-lbl">33 kV Lines</span></div>
      <div class="ss-stat"><span class="ss-stat-val">${txs.length}</span><span class="ss-stat-lbl">Power TXs</span></div>
      <div class="ss-stat"><span class="ss-stat-val">${feeders.length}</span><span class="ss-stat-lbl">11 kV Feeders</span></div>
      <div class="ss-stat"><span class="ss-stat-val">${ss.mobile ? '✓' : '—'}</span><span class="ss-stat-lbl">Contact</span></div>
    </div>
  </div>`;
}

window.filterSSGrid = () => {
  const q = (document.getElementById('ss-search')?.value||'').toLowerCase();
  const filtered = ALL_SUBSTATIONS.filter(ss =>
    !q || (ss.name||'').toLowerCase().includes(q) || (ss.sdd_esu||'').toLowerCase().includes(q)
  );
  document.getElementById('ss-grid').innerHTML =
    filtered.length ? filtered.map(ss=>renderSSCard(ss)).join('') :
    `<div style="padding:40px;text-align:center;color:var(--text3)">No substations match.</div>`;
};

/* ══════════════════════════════════════════════════════
   SECTION 9 — SUBSTATION DETAIL VIEW
   Matches every column in Substation_Information_Template.xlsx
══════════════════════════════════════════════════════ */
function renderSubstationDetail(id) {
  const ss = (id ? ALL_SUBSTATIONS.find(s=>s.id===id) : null) || TALAIMARY_SS;
  if (!ss) return;

  const txs     = ss.power_transformers || [];
  const feeders = ss.feeders_11kv       || [];
  const lines   = ss.lines_33kv         || [];

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>${ss.name||ss.sheet_name}</h2>
      <p>${ss.sdd_esu||'—'}</p>
    </div>
    <div class="sec-head-right">
      <span class="badge badge-online">${ss.status||'Online'}</span>
      ${ss.gps_lat ? `<a href="https://maps.google.com/?q=${ss.gps_lat},${ss.gps_lng}" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-map-marker-alt"></i> View on Map</a>` : ''}
      ${currentRole==='admin' ? `<button class="btn btn-sm btn-primary" onclick="window.openEditSubstationModal('${ss.id}')"><i class="fas fa-edit"></i> Edit</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('substation-summary')"><i class="fas fa-arrow-left"></i> Back</button>
    </div>
  </div>

  <!-- ══ A. SUBSTATION HEADER INFO ══ -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3><i class="fas fa-info-circle"></i> Substation Information</h3></div>
    <div class="panel-body">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0">

        <div class="info-row">
          <span class="info-lbl">Substation Name</span>
          <span class="info-val">${D(ss.name||ss.sheet_name)}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">SDD / ESU Name</span>
          <span class="info-val">${D(ss.sdd_esu)}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">SS Capacity (MVA)</span>
          <span class="info-val">${D(ss.capacity_mva)}</span>
        </div>

        <div class="info-row">
          <span class="info-lbl">Max Demand (MW)</span>
          <span class="info-val">${ss.max_demand_mw != null ? ss.max_demand_mw+' MW' : '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">GPS Coordinate</span>
          <span class="info-val">${ss.gps_lat ? `${ss.gps_lat}, ${ss.gps_lng}` : '—'}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Control Room No.</span>
          <span class="info-val">${D(ss.mobile)}</span>
        </div>

        <div class="info-row">
          <span class="info-lbl">Grounding Resistance</span>
          <span class="info-val">${D(ss.grounding_resistance)}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Date of Measurement</span>
          <span class="info-val">${D(ss.grounding_date)}</span>
        </div>
        <div class="info-row">
          <span class="info-lbl">Signed Document</span>
          <span class="info-val">${ss.grounding_doc ? `<a href="${ss.grounding_doc}" target="_blank">View</a>` : '—'}</span>
        </div>

      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab-btn active" onclick="window.switchTab(this,'tab-33kv')">
      <i class="fas fa-route"></i> 33 kV Lines
    </button>
    <button class="tab-btn" onclick="window.switchTab(this,'tab-pt-sw')">
      <i class="fas fa-microchip"></i> Power TX — Switchgear
    </button>
    <button class="tab-btn" onclick="window.switchTab(this,'tab-pt-load')">
      <i class="fas fa-tachometer-alt"></i> Power TX — Loading
    </button>
    <button class="tab-btn" onclick="window.switchTab(this,'tab-feeders')">
      <i class="fas fa-sitemap"></i> 11 kV Feeders
    </button>
  </div>

  <!-- ══ B. 33 KV LINE FEEDER ══
       Template columns: Name | Source/Ring Line | Length (km) | Conductor | (CB | PCM Panel | Remarks)
  -->
  <div class="tab-content active" id="tab-33kv">
    <div class="panel">
      <div class="panel-head">
        <h3>33 KV Source Line &amp; Ring Line</h3>
        ${currentRole==='admin' ? `<button class="btn btn-xs btn-primary" onclick="window.openAddLineModal('${ss.id}')"><i class="fas fa-plus"></i> Add Line</button>` : ''}
      </div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Name of the Feeder</th>
              <th>Source / Ring Line</th>
              <th>Length (km)</th>
              <th>Conductor</th>
              <th>Circuit Breaker</th>
              <th>PCM Panel</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${lines.length ? lines.map(l => `
            <tr>
              <td><strong>${D(l.name)}</strong></td>
              <td>
                <span class="badge ${l.remarks&&l.remarks.toLowerCase().includes('source') ? 'badge-blue' : 'badge-gray'}">
                  ${D(l.source_ring || (l.remarks && l.remarks.toLowerCase().includes('source') ? 'Source' : l.remarks&&l.remarks.toLowerCase().includes('ring') ? 'Ring' : '—'))}
                </span>
              </td>
              <td class="num">${l.length_km!=null ? l.length_km+' km' : '—'}</td>
              <td>${D(l.conductor)}</td>
              <td>${D(l.breaker)}</td>
              <td>${D(l.panel)}</td>
              <td>${D(l.remarks)}</td>
            </tr>`).join('') :
            `<tr><td colspan="7" class="tbl-empty">No 33 kV line data recorded for this substation.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </div>
    ${ss.line_comment ? `
    <div class="alert alert-info" style="margin-top:12px">
      <i class="fas fa-comment"></i>
      <div><strong>Comments on 33 kV Lines:</strong> ${ss.line_comment}</div>
    </div>` : ''}
  </div>

  <!-- ══ C. POWER TRANSFORMER — CB / SWITCHGEAR INFO ══
       Template columns:
       Name | Capacity (MVA) | AIS/GIS | CB Type | CB Manufacturer | CB Mfg Year |
       CT Manufacturer | CT Mfg Year | PCM Panel Manufacturer | PCM Panel Mfg Year | Comment
  -->
  <div class="tab-content" id="tab-pt-sw">
    <div class="panel">
      <div class="panel-head">
        <h3>33/11 KV Power Transformer — Circuit Breaker &amp; Panel Information</h3>
        ${currentRole==='admin' ? `<button class="btn btn-xs btn-primary" onclick="window.openAddTxModal('${ss.id}')"><i class="fas fa-plus"></i> Add TX</button>` : ''}
      </div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity (MVA)</th>
              <th>AIS / GIS</th>
              <th>CB Type</th>
              <th>CB Manufacturer</th>
              <th>CB Mfg. Year</th>
              <th>CT Manufacturer</th>
              <th>CT Mfg. Year</th>
              <th>PCM Panel Manufacturer</th>
              <th>PCM Panel Mfg. Year</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            ${txs.length ? txs.map(t => `
            <tr>
              <td><strong>${D(t.name)}</strong></td>
              <td class="num">${D(t.capacity)}</td>
              <td><span class="badge badge-gray">${D(t.ais_gis)}</span></td>
              <td>${D(t.cb_type)}</td>
              <td>${D(t.breaker)}</td>
              <td>${D(t.cb_year || t.year)}</td>
              <td>${D(t.ct_manufacturer)}</td>
              <td>${D(t.ct_year)}</td>
              <td>${D(t.panel)}</td>
              <td>${D(t.panel_year || t.year)}</td>
              <td style="font-size:.78rem;color:var(--text3)">${D(t.comment)}</td>
            </tr>`).join('') :
            `<tr><td colspan="11" class="tbl-empty">No power transformer data recorded.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  </div>

  <!-- ══ D. POWER TRANSFORMER — LOADING & PERFORMANCE ══
       Template columns:
       Name | Capacity (MVA) | Max Load (MW) | % Impedance | Manufacturer | Mfg Year |
       OLTC Manufacturer | Oil Breakdown Voltage |
       OTI Highest Temp + Date |
       HT WTI Highest Temp + Date |
       LT WTI Highest Temp + Date
  -->
  <div class="tab-content" id="tab-pt-load">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:20px">
      ${txs.map(t => {
        const cap  = parseFloat(t.capacity||0);
        const load = parseFloat(t.max_load_mw||0);
        const pct  = cap&&load ? Math.round(load/cap*100) : null;
        return `
        <div class="kpi-card ${pct!=null&&pct>80?'red':pct!=null&&pct>60?'amber':'green'}">
          <div class="kpi-val">${D(t.name)}</div>
          <div class="kpi-sub">${D(t.capacity)} MVA &nbsp;·&nbsp; ${load||'—'} MW load</div>
          ${pct!=null ? `
          <div class="progress-bar" style="margin-top:8px">
            <div class="progress-fill ${pct>80?'danger':pct>60?'warn':'ok'}" style="width:${pct}%"></div>
          </div>
          <div style="font-size:.76rem;margin-top:4px;font-weight:600">${pct}% loading</div>` : ''}
        </div>`;
      }).join('')}
    </div>

    <div class="panel">
      <div class="panel-head"><h3>33/11 KV Power Transformer — Loading &amp; Performance Data</h3></div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity (MVA)</th>
              <th>Max Load (MW)</th>
              <th>% Impedance</th>
              <th>Manufacturer</th>
              <th>Mfg. Year</th>
              <th>OLTC Manufacturer</th>
              <th>Oil Breakdown Voltage</th>
              <th>OTI Highest Temp</th>
              <th>OTI Date</th>
              <th>HT WTI Highest Temp</th>
              <th>HT WTI Date</th>
              <th>LT WTI Highest Temp</th>
              <th>LT WTI Date</th>
            </tr>
          </thead>
          <tbody>
            ${txs.length ? txs.map(t => {
              const cap  = parseFloat(t.capacity||0);
              const load = parseFloat(t.max_load_mw||0);
              const pct  = cap&&load ? Math.round(load/cap*100) : null;
              return `
              <tr>
                <td><strong>${D(t.name)}</strong></td>
                <td class="num">${D(t.capacity)}</td>
                <td class="num">
                  ${t.max_load_mw!=null ? `<strong>${t.max_load_mw} MW</strong>` : '—'}
                  ${pct!=null ? `<br><span style="font-size:.72rem;color:${pct>80?'var(--red2)':pct>60?'var(--amber2)':'var(--green2)'}">(${pct}%)</span>` : ''}
                </td>
                <td class="num">${t.impedance_pct!=null ? t.impedance_pct+'%' : (t.impedance || '—')}</td>
                <td>${D(t.brand)}</td>
                <td>${D(t.year)}</td>
                <td>${D(t.oltc_manufacturer)}</td>
                <td class="num">${D(t.oil_breakdown_voltage)}</td>
                <td class="num">${D(t.oti_temp)}</td>
                <td>${D(t.oti_date)}</td>
                <td class="num">${D(t.ht_wti_temp)}</td>
                <td>${D(t.ht_wti_date)}</td>
                <td class="num">${D(t.lt_wti_temp)}</td>
                <td>${D(t.lt_wti_date)}</td>
              </tr>`;
            }).join('') :
            `<tr><td colspan="14" class="tbl-empty">No power transformer data recorded.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </div>

    ${ss.tx_comment ? `
    <div class="alert alert-info" style="margin-top:12px">
      <i class="fas fa-comment"></i>
      <div><strong>Comments on 33/11 kV Power Transformer:</strong> ${ss.tx_comment}</div>
    </div>` : ''}
  </div>

  <!-- ══ E. 11 KV FEEDER INFORMATION ══
       Template columns:
       Transformer | Capacity (MVA) | 11 KV Feeder Name | Max Load (MW) |
       11 KV Feeder Length (km) | Switchgear Panel Manufacturer | Mfg Year | Remarks
  -->
  <div class="tab-content" id="tab-feeders">
    <div class="panel">
      <div class="panel-head">
        <h3>11 KV Feeder Information</h3>
        ${currentRole==='admin' ? `<button class="btn btn-xs btn-primary" onclick="window.openAddFeederModal('${ss.id}')"><i class="fas fa-plus"></i> Add Feeder</button>` : ''}
      </div>
      <div class="panel-body no-pad">
        <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Transformer</th>
              <th>Capacity (MVA)</th>
              <th>11 KV Feeder Name</th>
              <th>Max Load (MW)</th>
              <th>Feeder Length (km)</th>
              <th>11 kV Switchgear Panel Mfr.</th>
              <th>Panel Mfg. Year</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${feeders.length ? (() => {
              let lastTx = null;
              return feeders.map(f => {
                const showTx = f.transformer !== lastTx;
                lastTx = f.transformer;
                return `
                <tr${showTx ? ' style="border-top:2px solid var(--border2)"' : ''}>
                  <td>${showTx ? `<strong>${D(f.transformer)}</strong>` : ''}</td>
                  <td class="num">${showTx ? D(f.capacity || (txs.find(t=>t.name===f.transformer)||{}).capacity) : ''}</td>
                  <td><strong>${D(f.name)}</strong></td>
                  <td class="num">${f.max_load_mw!=null ? f.max_load_mw+' MW' : '—'}</td>
                  <td class="num">${f.length_km!=null ? f.length_km+' km' : '—'}</td>
                  <td>${D(f.panel)}</td>
                  <td>${D(f.panel_year)}</td>
                  <td style="font-size:.78rem;color:var(--text3)">${D(f.remarks)}</td>
                </tr>`;
              }).join('');
            })() :
            `<tr><td colspan="8" class="tbl-empty">No 11 kV feeder data recorded for this substation.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
    </div>

    ${ss.feeder_comment ? `
    <div class="alert alert-info" style="margin-top:12px">
      <i class="fas fa-comment"></i>
      <div><strong>Comments on 11 kV Feeder:</strong> ${ss.feeder_comment}</div>
    </div>` : ''}

    <div class="alert alert-warn" style="margin-top:12px">
      <i class="fas fa-paperclip"></i>
      <div><strong>Attach Maintenance Report (Signed Copy)</strong> — upload via the Edit button above.</div>
    </div>
  </div>
  `;
}

window.switchTab = (btn, tabId) => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId)?.classList.add('active');
};

/* ══════════════════════════════════════════════════════
   SECTION 10 — 33 kV LINE SUMMARY (all substations)
══════════════════════════════════════════════════════ */
function renderLine33kv() {
  const allLines = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.lines_33kv||[]).map(l => ({ ...l, substation: ss.name||ss.sheet_name }))
  );
  window._allLines = allLines;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>33 kV Line Summary</h2>
      <p>${allLines.length} source &amp; ring lines across ${ALL_SUBSTATIONS.length} substations</p>
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${allLines.length}</div><div class="kpi-sub">Total Lines</div></div>
    <div class="kpi-card"><div class="kpi-val">${allLines.filter(l=>l.remarks&&l.remarks.toLowerCase().includes('source')).length}</div><div class="kpi-sub">Source Lines</div></div>
    <div class="kpi-card"><div class="kpi-val">${allLines.filter(l=>l.remarks&&l.remarks.toLowerCase().includes('ring')).length}</div><div class="kpi-sub">Ring Lines</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${allLines.filter(l=>(l.conductor||'').toLowerCase().includes('marlin')).length}</div><div class="kpi-sub">Old Marlin Conductor</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>All 33 kV Lines</h3>
      <input class="search-input" id="line-search" placeholder="🔍 Search…" oninput="window.filterLineTable()" style="max-width:220px">
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Substation</th><th>Line Name</th><th>Type</th><th>Length (km)</th><th>Conductor</th><th>Circuit Breaker</th><th>PCM Panel</th><th>Remarks</th></tr></thead>
      <tbody id="line-tbody">${renderLineRows(allLines)}</tbody>
    </table>
    </div></div>
  </div>`;
}

function renderLineRows(lines) {
  if (!lines.length) return `<tr><td colspan="8" class="tbl-empty">No lines found.</td></tr>`;
  return lines.map(l=>`<tr>
    <td>${l.substation}</td>
    <td><strong>${D(l.name)}</strong></td>
    <td><span class="badge ${l.remarks&&l.remarks.toLowerCase().includes('source')?'badge-blue':'badge-gray'}">${l.source_ring||l.remarks||'—'}</span></td>
    <td class="num">${l.length_km!=null?l.length_km+' km':'—'}</td>
    <td>${D(l.conductor)}</td>
    <td>${D(l.breaker)}</td>
    <td>${D(l.panel)}</td>
    <td style="font-size:.78rem;color:var(--text3)">${D(l.remarks)}</td>
  </tr>`).join('');
}

window.filterLineTable = () => {
  const q = (document.getElementById('line-search')?.value||'').toLowerCase();
  const f = (window._allLines||[]).filter(l=>!q||l.name.toLowerCase().includes(q)||l.substation.toLowerCase().includes(q));
  document.getElementById('line-tbody').innerHTML = renderLineRows(f);
};

/* ══════════════════════════════════════════════════════
   SECTION 11 — POWER TRANSFORMER SUMMARY (all substations)
══════════════════════════════════════════════════════ */
function renderPowerTransformer() {
  const allTxs = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.power_transformers||[]).map(t => ({ ...t, substation: ss.name||ss.sheet_name }))
  );
  window._allTxs = allTxs;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Power Transformer Summary</h2>
      <p>${allTxs.length} power transformers across ${ALL_SUBSTATIONS.length} substations</p>
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${allTxs.length}</div><div class="kpi-sub">Total Power TXs</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${allTxs.filter(t=>t.year&&parseInt(t.year)<2000).length}</div><div class="kpi-sub">Aged (Pre-2000)</div></div>
    <div class="kpi-card green"><div class="kpi-val">${allTxs.filter(t=>t.year&&parseInt(t.year)>=2020).length}</div><div class="kpi-sub">New (2020+)</div></div>
    <div class="kpi-card"><div class="kpi-val">${[...new Set(allTxs.map(t=>t.brand).filter(Boolean))].length}</div><div class="kpi-sub">Manufacturers</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>All Power Transformers</h3>
      <input class="search-input" id="tx-search" placeholder="🔍 Search…" oninput="window.filterTxTable()" style="max-width:220px">
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Substation</th><th>Name</th><th>Capacity (MVA)</th>
          <th>Max Load (MW)</th><th>Loading %</th><th>% Impedance</th>
          <th>Manufacturer</th><th>Year</th>
          <th>CB Manufacturer</th><th>PCM Panel</th>
        </tr>
      </thead>
      <tbody id="tx-tbody">${renderTxRows(allTxs)}</tbody>
    </table>
    </div></div>
  </div>`;
}

function renderTxRows(txs) {
  if (!txs.length) return `<tr><td colspan="10" class="tbl-empty">No transformers found.</td></tr>`;
  return txs.map(t => {
    const cap  = parseFloat(t.capacity||0);
    const load = parseFloat(t.max_load_mw||0);
    const pct  = cap&&load ? Math.round(load/cap*100) : null;
    return `<tr>
      <td>${t.substation}</td>
      <td><strong>${D(t.name)}</strong></td>
      <td class="num">${D(t.capacity)}</td>
      <td class="num">${t.max_load_mw!=null?t.max_load_mw+' MW':'—'}</td>
      <td>${pct!=null?`<div style="display:flex;align-items:center;gap:8px">
        <div class="progress-bar" style="width:70px"><div class="progress-fill ${pct>80?'danger':'ok'}" style="width:${pct}%"></div></div>
        <span style="font-size:.78rem;font-weight:600">${pct}%</span></div>`:'—'}</td>
      <td class="num">${t.impedance_pct!=null?t.impedance_pct+'%':(t.impedance||'—')}</td>
      <td>${D(t.brand)}</td>
      <td>${D(t.year)}</td>
      <td>${D(t.breaker)}</td>
      <td>${D(t.panel)}</td>
    </tr>`;
  }).join('');
}

window.filterTxTable = () => {
  const q = (document.getElementById('tx-search')?.value||'').toLowerCase();
  const f = (window._allTxs||[]).filter(t=>!q||t.substation.toLowerCase().includes(q)||(t.brand||'').toLowerCase().includes(q));
  document.getElementById('tx-tbody').innerHTML = renderTxRows(f);
};

/* ══════════════════════════════════════════════════════
   SECTION 12 — 11 kV SWITCHGEAR SUMMARY (all substations)
══════════════════════════════════════════════════════ */
function renderSwitchgear11kv() {
  const allFeeders = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.feeders_11kv||[]).map(f => ({ ...f, substation: ss.name||ss.sheet_name }))
  );
  window._allFeeders = allFeeders;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>11 kV Switchgear &amp; Feeder Summary</h2>
      <p>${allFeeders.length} feeders across ${ALL_SUBSTATIONS.length} substations</p>
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${allFeeders.length}</div><div class="kpi-sub">Total 11 kV Feeders</div></div>
    <div class="kpi-card"><div class="kpi-val">${allFeeders.filter(f=>f.max_load_mw>=3).length}</div><div class="kpi-sub">High Load (≥3 MW)</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${allFeeders.filter(f=>f.length_km>=50).length}</div><div class="kpi-sub">Long Lines (≥50 km)</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>All 11 kV Feeders</h3>
      <input class="search-input" id="feeder-search" placeholder="🔍 Search…" oninput="window.filterFeederTable()" style="max-width:220px">
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Substation</th><th>Transformer</th><th>Capacity (MVA)</th>
          <th>11 kV Feeder Name</th><th>Max Load (MW)</th><th>Length (km)</th>
          <th>Panel Manufacturer</th><th>Panel Mfg. Year</th><th>Remarks</th>
        </tr>
      </thead>
      <tbody id="feeder-tbody">${renderFeederRows(allFeeders)}</tbody>
    </table>
    </div></div>
  </div>`;
}

function renderFeederRows(feeders) {
  if (!feeders.length) return `<tr><td colspan="9" class="tbl-empty">No feeders found.</td></tr>`;
  return feeders.map(f=>`<tr>
    <td>${f.substation}</td>
    <td><span class="badge badge-blue">${D(f.transformer)}</span></td>
    <td class="num">${D(f.capacity)}</td>
    <td><strong>${D(f.name)}</strong></td>
    <td class="num">${f.max_load_mw!=null?f.max_load_mw+' MW':'—'}</td>
    <td class="num">${f.length_km!=null?f.length_km+' km':'—'}</td>
    <td>${D(f.panel)}</td>
    <td>${D(f.panel_year)}</td>
    <td style="font-size:.78rem;color:var(--text3)">${D(f.remarks)}</td>
  </tr>`).join('');
}

window.filterFeederTable = () => {
  const q = (document.getElementById('feeder-search')?.value||'').toLowerCase();
  const f = (window._allFeeders||[]).filter(f=>!q||f.name.toLowerCase().includes(q)||f.substation.toLowerCase().includes(q));
  document.getElementById('feeder-tbody').innerHTML = renderFeederRows(f);
};

/* ══════════════════════════════════════════════════════
   SECTION 13 — DT CAPACITY & LOAD
══════════════════════════════════════════════════════ */
function renderDtCapacity() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Distribution Transformer — Capacity &amp; Load</h2>
      <p>314 DTs under Talaimary 33/11 kV Substation, Rajshahi</p>
    </div>
    <div class="sec-head-right">
      ${currentRole==='admin'?`<button class="btn btn-primary btn-sm" onclick="window.openAddTransformerModal()"><i class="fas fa-plus"></i> Add DT</button>`:''}
    </div>
  </div>
  <div class="kpi-row">
    <div class="kpi-card"><div class="kpi-val">314</div><div class="kpi-sub">Total DTs</div></div>
    <div class="kpi-card navy"><div class="kpi-val">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva100,0)}</div><div class="kpi-sub">× 100 kVA</div></div>
    <div class="kpi-card"><div class="kpi-val">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva200,0)}</div><div class="kpi-sub">× 200 kVA</div></div>
    <div class="kpi-card blue"><div class="kpi-val">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva250,0)}</div><div class="kpi-sub">× 250 kVA</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f)=>s+f.cap_mva,0).toFixed(1)}</div><div class="kpi-sub">Total MVA</div></div>
  </div>
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3><i class="fas fa-chart-bar"></i> Transformer Count by Feeder &amp; Rating</h3></div>
    <div class="panel-body"><div class="chart-container"><canvas id="chart-dt-cap"></canvas></div></div>
  </div>
  ${renderFeederSummaryTable()}`;

  setTimeout(() => {
    const ctx = document.getElementById('chart-dt-cap');
    if (!ctx) return;
    const vf = FEEDER_SUMMARY.filter(f=>f.cap_mva<100);
    charts['dt-cap'] = new Chart(ctx, {
      type:'bar',
      data:{ labels:vf.map(f=>f.name), datasets:[
        {label:'100 kVA',data:vf.map(f=>f.kva100),backgroundColor:'#93c5fd'},
        {label:'200 kVA',data:vf.map(f=>f.kva200),backgroundColor:'#1565c0'},
        {label:'250 kVA',data:vf.map(f=>f.kva250),backgroundColor:'#0b2545'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,title:{display:true,text:'No. of Transformers'}}},plugins:{legend:{position:'top'}}}
    });
  }, 100);
}

function renderFeederSummaryTable() {
  return `
  <div class="panel">
    <div class="panel-head"><h3>Feeder Summary — Rajshahi (Talaimary SS)</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Feeder</th><th>Count</th><th>100kVA</th><th>200kVA</th><th>250kVA</th><th>Total kVA</th><th>Cap (MVA)</th><th>LA%</th><th>DOFC%</th><th>MCCB%</th><th>Grounding%</th></tr></thead>
      <tbody>
        ${FEEDER_SUMMARY.map(f=>{
          const laPct=f.count?Math.round(f.la/f.count*100):0;
          const dofcPct=f.count?Math.round(f.dofc/f.count*100):0;
          const mccbPct=f.count?Math.round(f.mccb/f.count*100):0;
          const gndPct=f.count?Math.round(f.gnd/f.count*100):0;
          const capDisp=f.cap_mva<100?f.cap_mva.toFixed(2):f.total_kva.toLocaleString()+' kVA*';
          return `<tr>
            <td><strong>${f.name}</strong></td>
            <td class="num">${f.count}</td>
            <td class="num">${f.kva100}</td><td class="num">${f.kva200}</td><td class="num">${f.kva250}</td>
            <td class="num">${f.total_kva.toLocaleString()}</td><td class="num">${capDisp}</td>
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
          <td class="num">—</td>
          <td class="num">${FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f)=>s+f.cap_mva,0).toFixed(2)} MVA</td>
          <td colspan="4" style="font-size:.76rem;color:var(--text3)">*Sagorpara / RUET / Versity data pending</td>
        </tr>
      </tbody>
    </table>
    </div></div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 14 — DT EQUIPMENT (LA/DOFC/MCCB)
══════════════════════════════════════════════════════ */
function renderDtEquipment() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Distribution Transformer — Equipment Status</h2>
      <p>LA, DOFC, MCCB, Grounding &amp; LT Loop inspection records — Talaimary SS</p>
    </div>
    <div class="sec-head-right">
      <input class="search-input" id="dt-search" placeholder="🔍 Search…" oninput="window.filterDtTable()" style="max-width:200px">
      <select class="filter-sel" id="dt-feeder-filter" onchange="window.filterDtTable()">
        <option value="">All Feeders</option>
        ${FEEDER_SUMMARY.map(f=>`<option>${f.name}</option>`).join('')}
      </select>
      <select class="filter-sel" id="dt-la-filter" onchange="window.filterDtTable()">
        <option value="">LA: All</option>
        <option value="Yes">LA: Present</option>
        <option value="No">LA: Absent</option>
      </select>
      ${currentRole==='admin'?`<button class="btn btn-primary btn-sm" onclick="window.openAddTransformerModal()"><i class="fas fa-plus"></i> Add</button>`:''}
    </div>
  </div>

  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3>Equipment Coverage by Feeder</h3></div>
    <div class="panel-body"><div class="chart-container chart-sm"><canvas id="chart-dt-eq"></canvas></div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>Transformer Records <span id="dt-count" style="font-weight:400;color:var(--text3)">(${SAMPLE_TRANSFORMERS.length} sample records)</span></h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sl.</th><th>Feeder</th><th>GIS ID</th><th>Local Name</th><th>kVA</th><th>11kV LA</th><th>11kV DOFC</th><th>0.4kV MCCB</th><th>Grounding</th><th>LT Loop</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
      <tbody id="dt-tbody">${renderDtRows(SAMPLE_TRANSFORMERS)}</tbody>
    </table>
    </div></div>
  </div>

  <div class="alert alert-info" style="margin-top:16px">
    <i class="fas fa-info-circle"></i>
    <div>Showing <strong>${SAMPLE_TRANSFORMERS.length} sample records</strong>. Upload Rajshahi-Analysis_03.xlsx to Firebase to import all 314 records.</div>
  </div>`;

  setTimeout(() => {
    const ctx = document.getElementById('chart-dt-eq');
    if (!ctx) return;
    const vf = FEEDER_SUMMARY.filter(f=>f.cap_mva<100);
    charts['dt-eq'] = new Chart(ctx, {
      type:'bar',
      data:{labels:vf.map(f=>f.name), datasets:[
        {label:'LA Present',   data:vf.map(f=>Math.round(f.la/f.count*100)),   backgroundColor:'rgba(220,38,38,.75)'},
        {label:'DOFC Present', data:vf.map(f=>Math.round(f.dofc/f.count*100)), backgroundColor:'rgba(217,119,6,.75)'},
        {label:'MCCB Present', data:vf.map(f=>Math.round(f.mccb/f.count*100)), backgroundColor:'rgba(124,58,237,.75)'},
        {label:'Grounding',    data:vf.map(f=>Math.round(f.gnd/f.count*100)),  backgroundColor:'rgba(5,150,105,.75)'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,scales:{y:{max:100,title:{display:true,text:'% of Transformers'}}},plugins:{legend:{position:'top'}}}
    });
  }, 100);
}

function renderDtRows(rows) {
  if (!rows.length) return `<tr><td colspan="11" class="tbl-empty">No records found.</td></tr>`;
  return rows.map(t=>`<tr>
    <td>${t.sl}</td>
    <td><strong>${t.feeder}</strong></td>
    <td style="font-size:.76rem;font-family:'Courier New',monospace">${t.gis_id}</td>
    <td title="${t.local_name}">${t.local_name.substring(0,22)}${t.local_name.length>22?'…':''}</td>
    <td class="num"><strong>${t.capacity_kva}</strong></td>
    <td>
      <span class="badge ${t.la_present==='Yes'?'badge-yes':'badge-no'}">${t.la_present}</span>
      ${t.la_condition?`<span class="badge ${t.la_condition==='Good'?'badge-good':'badge-bad'}" style="margin-left:3px">${t.la_condition}</span>`:''}
    </td>
    <td>
      <span class="badge ${t.dofc_present==='Yes'?'badge-yes':'badge-no'}">${t.dofc_present}</span>
      ${t.dofc_condition?`<span class="badge ${t.dofc_condition==='Good'?'badge-good':'badge-bad'}" style="margin-left:3px">${t.dofc_condition}</span>`:''}
    </td>
    <td>
      <span class="badge ${t.mccb_present==='Yes'?'badge-yes':'badge-no'}">${t.mccb_present}</span>
      ${t.mccb_condition?`<span class="badge ${t.mccb_condition==='Good'?'badge-good':'badge-bad'}" style="margin-left:3px">${t.mccb_condition}</span>`:''}
    </td>
    <td>
      <span class="badge ${t.grounding_present==='Yes'?'badge-yes':'badge-no'}">${t.grounding_present}</span>
      ${t.grounding_qty?`<span style="font-size:.72rem;color:var(--text3);margin-left:4px">(${t.grounding_qty})</span>`:''}
    </td>
    <td><span class="badge ${t.lt_material==='Copper'?'badge-blue':'badge-gray'}">${t.lt_material||'—'}</span></td>
    ${currentRole==='admin'?`<td><button class="btn btn-xs btn-secondary" onclick="window.openEditTxModal('${t.gis_id}')"><i class="fas fa-edit"></i></button></td>`:''}
  </tr>`).join('');
}

window.filterDtTable = () => {
  const q      = (document.getElementById('dt-search')?.value||'').toLowerCase();
  const feeder = document.getElementById('dt-feeder-filter')?.value||'';
  const la     = document.getElementById('dt-la-filter')?.value||'';
  const filtered = SAMPLE_TRANSFORMERS.filter(t=>
    (!feeder||t.feeder===feeder)&&(!la||t.la_present===la)&&
    (!q||JSON.stringify(t).toLowerCase().includes(q))
  );
  document.getElementById('dt-tbody').innerHTML = renderDtRows(filtered);
  document.getElementById('dt-count').textContent = `(${filtered.length} records)`;
};

/* ══════════════════════════════════════════════════════
   SECTION 15 — PROJECTS
══════════════════════════════════════════════════════ */
function renderProjects(type) {
  const projects = SAMPLE_PROJECTS.filter(p=>p.type===type);
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>${type==='ongoing'?'Ongoing':'Upcoming'} Projects</h2></div>
    <div class="sec-head-right">
      ${currentRole==='admin'?`<button class="btn btn-primary btn-sm" onclick="window.openAddProjectModal('${type}')"><i class="fas fa-plus"></i> Add Project</button>`:''}
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card"><div class="kpi-val">${projects.length}</div><div class="kpi-sub">Total</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${projects.reduce((s,p)=>s+p.budget_lac,0).toLocaleString()}</div><div class="kpi-sub">Budget (Lac BDT)</div></div>
    <div class="kpi-card green"><div class="kpi-val">${type==='ongoing'?Math.round(projects.reduce((s,p)=>s+p.progress,0)/Math.max(projects.length,1))+'%':'—'}</div><div class="kpi-sub">Avg. Progress</div></div>
    <div class="kpi-card"><div class="kpi-val">${projects.filter(p=>p.status==='In Progress').length}</div><div class="kpi-sub">In Progress</div></div>
  </div>
  <div class="proj-grid">
    ${projects.map(p=>`
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
      ${type==='ongoing'?`
      <div class="proj-progress">
        <div class="proj-progress-label"><span>Progress</span><span>${p.progress}%</span></div>
        <div class="progress-bar"><div class="progress-fill ${p.progress>60?'ok':p.progress>30?'warn':'danger'}" style="width:${p.progress}%"></div></div>
      </div>`:''}
    </div>`).join('')}
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 16 — SWITCHING SUBSTATIONS
══════════════════════════════════════════════════════ */
function renderSwitchingSubstations() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Switching Substations</h2></div>
  </div>
  <div class="alert alert-info"><i class="fas fa-info-circle"></i>
    <div>Switching substation records module. Use Add button to enter switching station data.</div>
  </div>
  <div class="panel">
    <div class="panel-head"><h3>Switching Substations</h3>
      ${currentRole==='admin'?`<button class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Add</button>`:''}
    </div>
    <div class="panel-body"><div class="tbl-empty">No switching substations added yet.</div></div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SECTION 17 — LOAD HISTORY
══════════════════════════════════════════════════════ */
function renderLoadHistory() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Previous Load History</h2>
      <p>Monthly load trends — Talaimary 33/11 kV (2024)</p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel"><option>2024</option><option>2023</option></select>
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card amber"><div class="kpi-val">${Math.max(...LOAD_HISTORY.total)} MW</div><div class="kpi-sub">Peak Load</div></div>
    <div class="kpi-card"><div class="kpi-val">${(LOAD_HISTORY.total.reduce((a,b)=>a+b,0)/12).toFixed(1)} MW</div><div class="kpi-sub">Average Load</div></div>
    <div class="kpi-card green"><div class="kpi-val">${Math.min(...LOAD_HISTORY.total)} MW</div><div class="kpi-sub">Min Load</div></div>
    <div class="kpi-card"><div class="kpi-val">${Math.round(Math.max(...LOAD_HISTORY.total)/40*100)}%</div><div class="kpi-sub">Peak Load Factor</div></div>
    <div class="kpi-card navy"><div class="kpi-val">40 MVA</div><div class="kpi-sub">Installed Capacity</div></div>
  </div>
  <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-chart-line"></i> Monthly Load Trend</h3></div>
      <div class="panel-body"><div class="chart-container"><canvas id="chart-load-line"></canvas></div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-chart-pie"></i> T1 vs T2 Share</h3></div>
      <div class="panel-body"><div class="chart-container"><canvas id="chart-load-pie"></canvas></div></div>
    </div>
  </div>
  <div class="panel" style="margin-top:16px">
    <div class="panel-head"><h3>Monthly Load Data</h3>
      <button class="btn btn-sm btn-secondary" onclick="window.exportLoadCSV()"><i class="fas fa-download"></i> Export CSV</button>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Month</th><th>T1 (MW)</th><th>T2 (MW)</th><th>Total (MW)</th><th>Loading %</th></tr></thead>
      <tbody>${LOAD_HISTORY.labels.map((m,i)=>{
        const pct=Math.round(LOAD_HISTORY.total[i]/40*100);
        return `<tr>
          <td><strong>${m} 2024</strong></td>
          <td class="num">${LOAD_HISTORY.T1[i]}</td>
          <td class="num">${LOAD_HISTORY.T2[i]}</td>
          <td class="num"><strong>${LOAD_HISTORY.total[i]}</strong></td>
          <td><span class="badge ${pct>70?'badge-bad':pct>50?'badge-partial':'badge-good'}">${pct}%</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    </div></div>
  </div>`;

  setTimeout(() => {
    const ctx1 = document.getElementById('chart-load-line');
    if (ctx1) charts['load-line'] = new Chart(ctx1, {
      type:'line',
      data:{labels:LOAD_HISTORY.labels, datasets:[
        {label:'T1 (MW)',   data:LOAD_HISTORY.T1,    borderColor:'#1565c0',backgroundColor:'rgba(21,101,192,.1)',tension:0.4,fill:true,pointRadius:5},
        {label:'T2 (MW)',   data:LOAD_HISTORY.T2,    borderColor:'#059669',backgroundColor:'rgba(5,150,105,.1)', tension:0.4,fill:true,pointRadius:5},
        {label:'Total (MW)',data:LOAD_HISTORY.total,  borderColor:'#d97706',backgroundColor:'transparent',       tension:0.4,borderDash:[5,4],pointRadius:3},
      ]},
      options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false,title:{display:true,text:'Load (MW)'}}},plugins:{legend:{position:'top'}}}
    });
    const ctx2 = document.getElementById('chart-load-pie');
    if (ctx2) charts['load-pie'] = new Chart(ctx2, {
      type:'doughnut',
      data:{labels:['T1 Load','T2 Load'],datasets:[{data:[LOAD_HISTORY.T1.reduce((a,b)=>a+b,0),LOAD_HISTORY.T2.reduce((a,b)=>a+b,0)],backgroundColor:['#1565c0','#059669'],borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}
    });
  }, 100);
}

window.exportLoadCSV = () => {
  const rows = [['Month','T1 (MW)','T2 (MW)','Total (MW)','Loading %']];
  LOAD_HISTORY.labels.forEach((m,i)=>rows.push([m+' 2024',LOAD_HISTORY.T1[i],LOAD_HISTORY.T2[i],LOAD_HISTORY.total[i],Math.round(LOAD_HISTORY.total[i]/40*100)+'%']));
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})),download:'talaimary_load_2024.csv'});
  a.click();
  showToast('CSV exported!','success');
};

/* ══════════════════════════════════════════════════════
   SECTION 18 — MODALS
══════════════════════════════════════════════════════ */
window.openModal = (title, bodyHtml) => {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-bg').style.display = 'flex';
};
window.closeModal = () => { document.getElementById('modal-bg').style.display='none'; };
document.getElementById('modal-bg').addEventListener('click', e => { if(e.target===e.currentTarget) window.closeModal(); });

window.openAddTransformerModal = (existing=null) => {
  const f = existing||{};
  window.openModal(existing?'Edit DT':'Add Distribution Transformer',`
  <form id="tx-form" onsubmit="window.saveTxForm(event)">
    <div class="form-row cols-3">
      <div class="fg"><label>Feeder <span class="req">*</span></label>
        <select required name="feeder">${FEEDER_SUMMARY.map(ff=>`<option value="${ff.name}" ${f.feeder===ff.name?'selected':''}>${ff.name}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>GIS ID</label><input name="gis_id" value="${f.gis_id||''}"></div>
      <div class="fg"><label>Capacity (kVA) <span class="req">*</span></label>
        <select required name="capacity_kva">${[50,100,200,250,315,500].map(k=>`<option value="${k}" ${f.capacity_kva===k?'selected':''}>${k} kVA</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row cols-2">
      <div class="fg"><label>Local Name <span class="req">*</span></label><input required name="local_name" value="${f.local_name||''}"></div>
      <div class="fg"><label>Remarks</label><input name="remarks" value="${f.remarks||''}"></div>
    </div>
    <div class="form-row cols-3">
      <div class="fg"><label>11kV LA</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="la_present" value="Yes" ${f.la_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="la_present" value="No"  ${f.la_present==='No'?'checked':''}>  No</label>
        </div>
      </div>
      <div class="fg"><label>LA Condition</label>
        <select name="la_condition"><option value="">N/A</option><option ${f.la_condition==='Good'?'selected':''}>Good</option><option ${f.la_condition==='Bad'?'selected':''}>Bad</option></select>
      </div>
      <div class="fg"></div>
      <div class="fg"><label>11kV DOFC</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="dofc_present" value="Yes" ${f.dofc_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="dofc_present" value="No"  ${f.dofc_present==='No'?'checked':''}>  No</label>
        </div>
      </div>
      <div class="fg"><label>DOFC Condition</label>
        <select name="dofc_condition"><option value="">N/A</option><option ${f.dofc_condition==='Good'?'selected':''}>Good</option><option ${f.dofc_condition==='Bad'?'selected':''}>Bad</option></select>
      </div>
      <div class="fg"></div>
      <div class="fg"><label>0.4kV MCCB</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="mccb_present" value="Yes" ${f.mccb_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="mccb_present" value="No"  ${f.mccb_present==='No'?'checked':''}>  No</label>
        </div>
      </div>
      <div class="fg"><label>MCCB Condition</label>
        <select name="mccb_condition"><option value="">N/A</option><option ${f.mccb_condition==='Good'?'selected':''}>Good</option><option ${f.mccb_condition==='Bad'?'selected':''}>Bad</option></select>
      </div>
    </div>
    <div class="form-row cols-3">
      <div class="fg"><label>Grounding</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="grounding_present" value="Yes" ${f.grounding_present==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="grounding_present" value="No"  ${f.grounding_present==='No'?'checked':''}>  No</label>
        </div>
      </div>
      <div class="fg"><label>Grounding Qty</label><input type="number" name="grounding_qty" min="0" value="${f.grounding_qty||''}"></div>
      <div class="fg"><label>LT Loop Material</label>
        <select name="lt_material"><option value="">—</option><option ${f.lt_material==='Copper'?'selected':''}>Copper</option><option ${f.lt_material==='Aluminium'?'selected':''}>Aluminium</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
    </div>
  </form>`);
};

window.saveTxForm = async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const record = Object.fromEntries(fd.entries());
  record.grounding_qty = parseInt(record.grounding_qty)||0;
  record.sl = SAMPLE_TRANSFORMERS.length+1;
  if (IS_CONFIGURED) await addDoc(collection(db,'transformers'),{...record,createdAt:serverTimestamp()});
  else SAMPLE_TRANSFORMERS.push(record);
  window.closeModal();
  showToast('Transformer saved!','success');
  renderDtEquipment();
};

window.openAddProjectModal = (type) => {
  window.openModal(`Add ${type==='ongoing'?'Ongoing':'Upcoming'} Project`,`
  <form id="proj-form" onsubmit="window.saveProjForm(event,'${type}')">
    <div class="form-row cols-2">
      <div class="fg full-width"><label>Project Name <span class="req">*</span></label><input required name="name"></div>
      <div class="fg"><label>Location</label><input name="location"></div>
      <div class="fg"><label>Budget (Lac BDT)</label><input type="number" name="budget_lac" min="0"></div>
      <div class="fg"><label>Start Date</label><input type="date" name="start_date"></div>
      <div class="fg"><label>End Date</label><input type="date" name="end_date"></div>
      <div class="fg"><label>Contractor</label><input name="contractor"></div>
      <div class="fg"><label>Status</label>
        <select name="status">${(type==='ongoing'?['In Progress','Pending','On Hold']:['Planning','DPP Approved','Design Phase','Tender Stage']).map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      ${type==='ongoing'?`<div class="fg"><label>Progress (%)</label><input type="number" name="progress" min="0" max="100" value="0"></div>`:''}
      <div class="fg full-width"><label>Description</label><textarea name="description" rows="2"></textarea></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
    </div>
  </form>`);
};

window.saveProjForm = async (e,type) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const record = Object.fromEntries(fd.entries());
  record.type=type; record.budget_lac=parseInt(record.budget_lac)||0; record.progress=parseInt(record.progress)||0; record.id='p'+Date.now();
  if (IS_CONFIGURED) await addDoc(collection(db,'projects'),{...record,createdAt:serverTimestamp()});
  else SAMPLE_PROJECTS.push(record);
  window.closeModal();
  showToast('Project saved!','success');
  renderProjects(type);
};

window.openAddSubstationModal    = () => showToast('Connect Firebase to enable adding substations','warn');
window.openEditSubstationModal   = () => showToast('Edit substation — connect Firebase to enable','warn');
window.openAddLineModal          = () => showToast('Add 33 kV line — connect Firebase to enable','warn');
window.openAddTxModal            = () => showToast('Add power transformer — connect Firebase to enable','warn');
window.openAddFeederModal        = () => showToast('Add 11 kV feeder — connect Firebase to enable','warn');
window.openEditTxModal           = gisId => { const tx=SAMPLE_TRANSFORMERS.find(t=>t.gis_id===gisId); if(tx) window.openAddTransformerModal(tx); };

/* ══════════════════════════════════════════════════════
   SECTION 19 — TOAST
══════════════════════════════════════════════════════ */
function showToast(msg, type='info') {
  const wrap = document.getElementById('toasts');
  const t    = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = {success:'check-circle',error:'times-circle',warn:'exclamation-triangle',info:'info-circle'}[type]||'info-circle';
  t.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(()=>t.remove(),400); }, 3500);
}

/* ══════════════════════════════════════════════════════
   SECTION 20 — GLOBALS
══════════════════════════════════════════════════════ */
window.showSection  = showSection;
window.showToast    = showToast;
window.renderDtRows = renderDtRows;

/* ══════════════════════════════════════════════════════
   SECTION 21 — INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  // ★ Step 1: Load all 82 substations from substations.json
  await loadSubstationData();

  // Mobile nav toggle
  document.querySelectorAll('.dd-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        btn.closest('.has-dd').classList.toggle('open');
      }
    });
  });

  // Demo mode: auto-login when Firebase not configured
  if (!IS_CONFIGURED) {
    currentUser = { email: 'demo@nesco.gov.bd', displayName: 'Demo Admin' };
    currentRole = 'admin';
    setTimeout(() => onLoginSuccess(), 1500);
  }
});
