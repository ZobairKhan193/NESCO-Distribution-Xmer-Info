/* ════════════════════════════════════════════════════════════════
   NESCO DNMS (Distribution Network Management System) — app.js  v4.0
   Menu: Home | 33/11 kV Substations | Switching SS |
         Distribution Transformer | Ongoing Projects |
         Upcoming Projects | Load History
════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   SECTION 1 — FIREBASE CONFIG  ★ PASTE YOUR CONFIG ★
══════════════════════════════════════════════════ */
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDoc,
         updateDoc, deleteDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAklct5CT07Medb_aCKouodofrebHhaavs",
  authDomain: "distribution-transformer-info.firebaseapp.com",
  projectId: "distribution-transformer-info",
  storageBucket: "distribution-transformer-info.firebasestorage.app",
  messagingSenderId: "256439246815",
  appId: "1:256439246815:web:5e2f54a78693b3a203ee6a",
  measurementId: "G-WMHSJLFYPX"
};

const IS_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";
let app, auth, db;
if (IS_CONFIGURED) {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
}

/* ══════════════════════════════════════════════════
   SECTION 2 — APP STATE
══════════════════════════════════════════════════ */
let currentUser    = null;
let currentRole    = 'user';
let currentSection = 'home';
let charts         = {};

/* ══════════════════════════════════════════════════
   SECTION 3 — SUBSTATION DATA  (from substations.json)
══════════════════════════════════════════════════ */
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
    showToast('substations.json not found — showing demo data','warn');
  }
}

const FALLBACK_SS = {
  id:'talaimary-rajshahi', sheet_name:'Talaimari',
  name:'Talaimary 33/11 KV', sdd_esu:'S&D-1, Rajshahi.',
  capacity_mva:'2x20/26.66', max_demand_mw:23,
  gps_lat:24.360371, gps_lng:88.626316,
  mobile:'01782-299771', grounding_resistance:null, grounding_date:null,
  status:'Online',
  lines_33kv:[
    {name:'Katakhali-Talaimari',    source_ring:'Source',length_km:5.5,conductor:'Grosbeak',breaker:'Energypac',panel:'Energypac',remarks:'Source line'},
    {name:'City Central-Talaimari', source_ring:'Ring',  length_km:4.5,conductor:'Grosbeak',breaker:'Energypac',panel:'Energypac',remarks:'Ring line'},
    {name:'Meherchandi-Talaimari',  source_ring:'Ring',  length_km:3.3,conductor:'Grosbeak',breaker:'Energypac',panel:'Energypac',remarks:'Ring line'},
  ],
  power_transformers:[
    {name:'T1',capacity:'20/26.66',ais_gis:'AIS',cb_type:null,breaker:'Energypac',cb_year:'2018',
     ct_manufacturer:null,ct_year:null,panel:'Energypac',panel_year:'2018',
     max_load_mw:12,impedance_pct:11.061,brand:'Energypac',year:'2018',
     oltc_manufacturer:null,oil_breakdown_voltage:null,
     oti_temp:null,oti_date:null,ht_wti_temp:null,ht_wti_date:null,
     lt_wti_temp:null,lt_wti_date:null,comment:null},
    {name:'T2',capacity:'20/26.66',ais_gis:'AIS',cb_type:null,breaker:'Energypac',cb_year:'2018',
     ct_manufacturer:null,ct_year:null,panel:'Energypac',panel_year:'2018',
     max_load_mw:11,impedance_pct:11.056,brand:'Energypac',year:'2018',
     oltc_manufacturer:null,oil_breakdown_voltage:null,
     oti_temp:null,oti_date:null,ht_wti_temp:null,ht_wti_date:null,
     lt_wti_temp:null,lt_wti_date:null,comment:null},
  ],
  feeders_11kv:[
    {transformer:'T1',capacity:'20/26.66',name:'Sagorpara',  max_load_mw:2.5,length_km:6,   panel:'Energypac',panel_year:null,remarks:'Coupling Existing'},
    {transformer:'T1',capacity:'20/26.66',name:'Tikapara',   max_load_mw:2.4,length_km:5,   panel:null,panel_year:null,remarks:null},
    {transformer:'T1',capacity:'20/26.66',name:'RUET',       max_load_mw:1.2,length_km:0.8, panel:null,panel_year:null,remarks:null},
    {transformer:'T1',capacity:'20/26.66',name:'Varsity',    max_load_mw:2.2,length_km:6,   panel:null,panel_year:null,remarks:null},
    {transformer:'T1',capacity:'20/26.66',name:'Motihar',    max_load_mw:2.1,length_km:5.2, panel:null,panel_year:null,remarks:null},
    {transformer:'T2',capacity:'20/26.66',name:'Sericulture',max_load_mw:2.2,length_km:7.5, panel:'Energypac',panel_year:null,remarks:null},
    {transformer:'T2',capacity:'20/26.66',name:'Raninagor',  max_load_mw:2.1,length_km:8,   panel:null,panel_year:null,remarks:null},
    {transformer:'T2',capacity:'20/26.66',name:'Vadra',      max_load_mw:2.0,length_km:11,  panel:null,panel_year:null,remarks:null},
    {transformer:'T2',capacity:'20/26.66',name:'CharKazla',  max_load_mw:2.3,length_km:10.5,panel:null,panel_year:null,remarks:null},
    {transformer:'T2',capacity:'20/26.66',name:'Binodpur',   max_load_mw:null,length_km:62, panel:null,panel_year:null,remarks:null},
  ],
};


/* ══════════════════════════════════════════════════
   SECTION 3b — DISTRIBUTION TRANSFORMER DATA
   (from distribution-transformers.json)
══════════════════════════════════════════════════ */
let DT_DATA       = null;          // raw JSON
let DT_BY_SDD     = {};             // { sdd_id : [legacy-flat transformer rows] }
let DT_OP_SEEDED  = false;          // operating-values seeded yet?

async function loadDTData() {
  try {
    const r = await fetch('./distribution-transformers.json');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    DT_DATA = await r.json();
    _buildDTAdapters();
    console.log(`✓ Loaded DT data: ${DT_DATA.sdd_count} SDD, ${DT_DATA.transformer_count} transformers`);
  } catch (err) {
    console.error('distribution-transformers.json load failed:', err);
    showToast('distribution-transformers.json not found — DT views will be empty','warn');
  }
}

function _buildDTAdapters() {
  if (!DT_DATA || !Array.isArray(DT_DATA.sdds)) return;

  // ── 1. OVERALL_SUMMARY: one flat row per SDD/ESU (used by Overall + SDD-wise views)
  // build_dt.py (v2 shape) emits the totals at the top level of `summary`,
  // not nested under `summary.total`. Accept both shapes for safety.
  OVERALL_SUMMARY = DT_DATA.sdds.map((s, idx) => {
    const sum = s.summary || {};
    // If sum.total is a plain object (legacy nested shape), use it; otherwise
    // the totals are flat directly on `sum`.
    const t = (sum.total && typeof sum.total === 'object') ? sum.total : sum;
    const k = t.kva       || {};
    const la= t.la        || {};
    const df= t.dofc      || {};
    const mc= t.mccb      || {};
    const gn= t.grounding || {};
    const lt= t.lt_loop   || {};
    const kp= t.kpi       || {};
    return {
      sr:           idx + 1,
      sdd_id:       s.id,
      name:         s.name,
      total:        t.total || 0,
      kva50:        k['50']  || 0,
      kva100:       k['100'] || 0,
      kva200:       k['200'] || 0,
      kva250:       k['250'] || 0,
      kvaOther:     k.other  || 0,
      la_yes:       la.yes   || 0,  la_no:   la.no   || 0,
      la_good:      la.good  || 0,  la_bad:  la.bad  || 0,  la_req:  la.req || 0,
      dofc_yes:     df.yes   || 0,  dofc_no: df.no   || 0,
      dofc_good:    df.good  || 0,  dofc_bad:df.bad  || 0,  dofc_req:df.req || 0,
      mccb_yes:     mc.yes   || 0,  mccb_no: mc.no   || 0,
      mccb_good:    mc.good  || 0,  mccb_bad:mc.bad  || 0,  mccb_req:mc.req || 0,
      gnd_yes:      gn.yes   || 0,  gnd_no:  gn.no   || 0,  gnd_req: gn.req || 0,
      lt_copper:    lt.copper    || 0,
      lt_aluminium: lt.aluminium || 0,
      kpi_la:       kp.la   || 0,
      kpi_dofc:     kp.dofc || 0,
      kpi_mccb:     kp.mccb || 0,
      _feeders:     (s.summary && s.summary.feeders) || [],
    };
  });

  // ── 2. DT_GRAND_TOTAL
  const g = DT_DATA.grand_total || {};
  const gK = g.kva || {}, gLA = g.la || {}, gDF = g.dofc || {}, gMC = g.mccb || {},
        gGN = g.grounding || {}, gLT = g.lt_loop || {}, gKP = g.kpi || {};
  DT_GRAND_TOTAL = {
    total: g.total || 0,
    kva50:  gK['50']  || 0, kva100: gK['100'] || 0,
    kva200: gK['200'] || 0, kva250: gK['250'] || 0, kvaOther: gK.other || 0,
    la_yes: gLA.yes   || 0, la_no:  gLA.no    || 0,
    la_good:gLA.good  || 0, la_bad: gLA.bad   || 0,
    dofc_yes: gDF.yes || 0, dofc_no:  gDF.no  || 0,
    dofc_good:gDF.good|| 0, dofc_bad: gDF.bad || 0,
    mccb_yes: gMC.yes || 0, mccb_no:  gMC.no  || 0,
    mccb_good:gMC.good|| 0, mccb_bad: gMC.bad || 0,
    gnd_yes: gGN.yes  || 0, gnd_no:   gGN.no  || 0, gnd_req: gGN.req || 0,
    lt_copper:    gLT.copper    || 0,
    lt_aluminium: gLT.aluminium || 0,
    kpi_la:   gKP.la   || 0,
    kpi_dofc: gKP.dofc || 0,
    kpi_mccb: gKP.mccb || 0,
  };

  // ── 3. DT_BY_SDD: per-SDD flat transformer list, in the legacy field shape
  DT_BY_SDD = {};
  for (const s of DT_DATA.sdds) {
    const rows = [];
    let sl = 0;
    for (const f of (s.feeders || [])) {
      for (const t of (f.transformers || [])) {
        sl += 1;
        rows.push({
          sl:            t.sl || sl,
          sdd_id:        s.id,
          sdd_name:      s.name,
          substation:    t.substation || t.substation_gis,
          feeder:        f.name || t.feeder,
          gis_id:        t.gis_id,
          capacity_kva:  t.kva,
          ref_no:        t.ref_no,
          gis_location:  t.gis_location,
          local_name:    t.local_name,
          la_yn:         t.la_yn,
          la_cond:       t.la_cond,
          dofc_yn:       t.dofc_yn,
          dofc_cond:     t.dofc_cond,
          mccb_yn:       t.mccb_yn,
          mccb_cond:     t.mccb_cond,
          gnd_yn:        t.grounding_yn,
          gnd_cond:      t.grounding_cond,
          gnd_count:     t.lt_loop_count,        // legacy column header is "Gnd. Count" but data is LT-Loop count
          lt_yn:         t.lt_loop_yn,
          lt_count:      t.lt_loop_count,
          lt_conductor:  t.lt_loop_conductor,
          phase_a:       t.phase_a,
          phase_b:       t.phase_b,
          phase_c:       t.phase_c,
          oil_temp:      t.oil_temp,
        });
      }
    }
    DT_BY_SDD[s.id] = rows;
  }
  DT_OP_SEEDED = false;
}

/* Render the GIS-location cell for any DT row as a clickable Google
   Maps link. Handles three shapes of `gis_location`:
     1. Full URL  → use directly
     2. Coordinate string "lat,lng" or "lat, lng" → build maps URL
     3. Plain text ("Open in Google Maps" / coords-only) → if a
        `gis_location_label` is also present we use it as the link
        text, otherwise render as plain "—" / text. */
function _dtMapCell(r) {
  const v = r && r.gis_location;
  if (!v) return '<span style="color:var(--text3)">—</span>';
  const sv = String(v).trim();
  let url = null;
  if (/^https?:\/\//i.test(sv)) {
    url = sv;
  } else {
    // Try to parse "lat,lng" or "lat, lng"
    const m = sv.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      url = `https://maps.google.com/?q=${m[1]},${m[2]}`;
    }
  }
  if (url) {
    return `<a href="${url}" target="_blank" rel="noopener"
              style="color:#1d4ed8;font-weight:600;text-decoration:none"
              title="Open in Google Maps">
              <i class="fas fa-map-marker-alt" style="color:#dc2626"></i>
              ${esc(r.gis_location_label || 'Map')}
            </a>`;
  }
  // No URL we can build — show text but mark plainly so user knows.
  return `<span style="color:var(--text3);font-style:italic" title="${esc(sv)}">${esc(sv)}</span>`;
}

/* Helper: locate an SDD entry by either its id (slug) or display name. */
function findSDD(idOrName) {
  if (!OVERALL_SUMMARY.length) return null;
  return OVERALL_SUMMARY.find(s =>
       s.sdd_id === idOrName
    || s.name   === idOrName
    || s.name.toLowerCase().replace(/[^a-z0-9]/g,'_') === idOrName
  ) || null;
}


/* ══════════════════════════════════════════════════
   SECTION 3c — HOMEPAGE / PROJECTS / NEW MODULES DATA
══════════════════════════════════════════════════ */
let HOME_DATA      = null;   // from homepage-data.json
let PROJECTS_DATA  = null;   // from projects.json (NIDMP + PDSSP)
let ZRS_DATA       = null;   // from zrs.json (new — Zonal Repair Shop)
let STORE_DATA     = null;   // from store.json (new)
let SWITCHING_DATA = null;   // from switching-ss.json (new)
let RENEWABLE_DATA = null;   // from renewable-energy.json (new)

// Cache-busting query string — bump v= whenever a JSON file changes so
// browsers don't serve stale data. The build script could update this in
// future; for now it's a per-session timestamp.
const DATA_V = `v=${Date.now()}`;

async function _loadJson(filename) {
  const r = await fetch(`./${filename}?${DATA_V}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${filename}`);
  return await r.json();
}

async function loadHomepageData() {
  try {
    HOME_DATA = await _loadJson('homepage-data.json');
    console.log(`✓ homepage: ${HOME_DATA.metrics.length} metrics × ${HOME_DATA.years.length} years`);
  } catch (err) { console.warn('homepage-data.json:', err.message); }
}
async function loadProjectsData() {
  try {
    PROJECTS_DATA = await _loadJson('projects.json');
    const total = (PROJECTS_DATA.categories || []).reduce((n,c)=>n+c.projects.length,0);
    console.log(`✓ projects: ${total} project(s) across ${PROJECTS_DATA.categories.length} categories`);
  } catch (err) { console.warn('projects.json:', err.message); }
}
async function loadZrsData() {
  try {
    ZRS_DATA = await _loadJson('zrs.json');
    console.log(`✓ zrs: ${ZRS_DATA.long_rows.length} measurement rows, ${ZRS_DATA.deliveries.length} deliveries`);
  } catch (err) { console.warn('zrs.json:', err.message); }
}
async function loadStoreData() {
  try {
    STORE_DATA = await _loadJson('store.json');
    console.log(`✓ store: ${STORE_DATA.substation_equipment.items.length} SS items, ${STORE_DATA.line_equipment.items.length} line items`);
  } catch (err) { console.warn('store.json:', err.message); }
}
async function loadSwitchingData() {
  try {
    SWITCHING_DATA = await _loadJson('switching-ss.json');
    console.log(`✓ switching-ss: ${SWITCHING_DATA.grid_feeders.rows.length} feeders, ${SWITCHING_DATA.grid_substations.rows.length} grid SS`);
  } catch (err) { console.warn('switching-ss.json:', err.message); }
}
async function loadRenewableData() {
  try {
    RENEWABLE_DATA = await _loadJson('renewable-energy.json');
    console.log(`✓ renewable: ${RENEWABLE_DATA.blocks.length} blocks`);
  } catch (err) { console.warn('renewable-energy.json:', err.message); }
}

/* ══════════════════════════════════════════════════
   SECTION 4 — GRID SUBSTATION DATA
   (from Grid_Substation_Info.xlsx)
══════════════════════════════════════════════════ */
const GRID_SUBSTATIONS = [
  // Rajshahi Zone
  {sr:1,  zone:'Rajshahi', name:'Katakhali 132/33 kV',          grid_type:'AIS', sw_type:'GIS', operated_by:'NESCO',      condition:'Existing', gps_lat:24.366324, gps_lng:88.676006},
  {sr:2,  zone:'',         name:'Miapur 230/132/33 kV',          grid_type:'AIS', sw_type:'GIS', operated_by:'NESCO',      condition:'Existing', gps_lat:24.411831, gps_lng:88.573168},
  {sr:3,  zone:'',         name:'Chapai Nawabgonj (Horipur) 132/33 kV', grid_type:'AIS',sw_type:'AIS',operated_by:'Power Grid',condition:'Existing',gps_lat:24.580293,gps_lng:88.290253},
  {sr:4,  zone:'',         name:'Amnura 132/33 kV',              grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.634250, gps_lng:88.402019},
  {sr:5,  zone:'',         name:'Chowdala 132/33 kV',            grid_type:'AIS', sw_type:'AIS', operated_by:'PBS',        condition:'Existing', gps_lat:24.797897, gps_lng:88.262474},
  {sr:6,  zone:'',         name:'Natore 132/33 kV',              grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.411789, gps_lng:89.008821},
  {sr:7,  zone:'',         name:'Pabna 132/33 kV',               grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.023652, gps_lng:89.234282},
  {sr:8,  zone:'',         name:'Joynogor 132/33 kV',            grid_type:'AIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Existing', gps_lat:24.096777, gps_lng:89.084257},
  {sr:9,  zone:'',         name:'Puran Bogura 132/33 kV',        grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.840890, gps_lng:89.351233},
  {sr:10, zone:'',         name:'Mahasthangarh 132/33 kV',       grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.959815, gps_lng:89.357098, feeders:10},
  {sr:11, zone:'',         name:'Sabgram 132/33 kV',             grid_type:'AIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Ongoing',  gps_lat:24.837835, gps_lng:89.422290},
  {sr:null,zone:'',        name:'Dupchanchia 132/33 kV',         grid_type:'AIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Ongoing',  gps_lat:24.856494, gps_lng:89.139980, note:'Tentative'},
  {sr:12, zone:'',         name:'Sirajganj 132/33 kV',           grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.448195, gps_lng:89.670278},
  {sr:13, zone:'',         name:'Naogaon 230/132/33 kV',         grid_type:'AIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Existing', gps_lat:24.803141, gps_lng:88.963467},
  {sr:14, zone:'',         name:'Joypurhat 132/33 kV',           grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:25.106615, gps_lng:89.009866},
  {sr:15, zone:'',         name:'Sherpur 132/33 kV',             grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:24.637295, gps_lng:89.426805, feeders:4},
  // Rangpur Zone
  {sr:16, zone:'Rangpur',  name:'Rangpur 230/132/33 kV',         grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:25.729042, gps_lng:89.251996},
  {sr:17, zone:'',         name:'Palashbari 132/33 kV',          grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:25.277097, gps_lng:89.349996, feeders:2},
  {sr:18, zone:'',         name:'Gaibandha 132/33 kV',           grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Ongoing',  gps_lat:25.326706, gps_lng:89.507290},
  {sr:19, zone:'',         name:'Lalmonirhat 132/33 kV',         grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:25.918024, gps_lng:89.454319},
  {sr:20, zone:'',         name:'Saidpur 132/33 kV',             grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:25.813579, gps_lng:88.885239},
  {sr:21, zone:'',         name:'Jaldhaka 132/33 kV',            grid_type:'AIS', sw_type:'AIS', operated_by:'PBS',        condition:'Existing', gps_lat:26.042185, gps_lng:88.993770},
  {sr:22, zone:'',         name:'Thakurgaon 132/33 kV',          grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:26.038420, gps_lng:88.425448},
  {sr:23, zone:'',         name:'Purbasadipur 230/132/33 kV',    grid_type:'GIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Existing', gps_lat:25.755055, gps_lng:88.677780},
  {sr:null,zone:'',        name:'Dinajpur 132/33 kV',            grid_type:'AIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Existing', gps_lat:25.608684, gps_lng:88.676589},
  {sr:null,zone:'',        name:'Pirganj 132/33 kV',             grid_type:'AIS', sw_type:'AIS', operated_by:'PBS',        condition:'Existing', gps_lat:25.858940, gps_lng:88.379114},
  {sr:24, zone:'',         name:'Kurigram 132/33 kV',            grid_type:'AIS', sw_type:'AIS', operated_by:'Power Grid', condition:'Existing', gps_lat:25.809125, gps_lng:89.594340},
  {sr:25, zone:'',         name:'Barapukuria 230/132/33 kV',     grid_type:'AIS', sw_type:'AIS', operated_by:'NESCO',      condition:'Existing', gps_lat:25.550214, gps_lng:88.952897},
  {sr:26, zone:'',         name:'Panchagarh 132/33 kV',          grid_type:'AIS', sw_type:'AIS', operated_by:'PBS',        condition:'Existing', gps_lat:26.354425, gps_lng:88.557513, feeders:8},
  {sr:27, zone:'',         name:'Hatibandha 132/33 kV',          grid_type:'GIS', sw_type:'GIS', operated_by:'NESCO',      condition:'Ongoing',  gps_lat:26.209593, gps_lng:89.087878},
  {sr:28, zone:'',         name:'Domar 132/33 kV',               grid_type:'GIS', sw_type:'GIS', operated_by:'PBS',        condition:'Ongoing',  gps_lat:26.104471, gps_lng:88.799905},
];

/* Switching SS works (from PDF) */
const SWITCHING_SS_WORKS = [
  {sl:1, grid:'Domar 230/132/33 kV',         description:'PGCB will give land to NESCO.',                                                   type:'AIS'},
  {sl:2, grid:'Hatibandha 132/33 kV',         description:'PGCB will give land to NESCO.',                                                   type:'AIS'},
  {sl:3, grid:'Pabna 132/33 kV',              description:'NESCO will build AIS control room. Shift existing 33 kV Panels (NESCO & REB).',   type:'AIS (Panel Shifting)'},
  {sl:4, grid:'Rangpur 132/33 kV',            description:'PGCB will build 230/132/33 kV grid; removal of existing 33 kV switchyard proposed. NESCO to build GIS SS at emergency.', type:'GIS'},
  {sl:5, grid:'Katakhali 132/33 kV',          description:'New 33/11 kV GIS SS construction.',                                               type:'GIS'},
  {sl:6, grid:'Purbo Sadipur 132/33 kV',      description:'New 33 kV GIS Switching Station / Control Room beside existing AIS.',             type:'GIS'},
  {sl:7, grid:'Thakurgaon 132/33 kV',         description:'New 33 kV AIS switching station construction in own area & feeders shifting.',    type:'AIS (Panel Shifting)'},
  {sl:8, grid:'Chapai Nawabganj 132/33 kV',   description:'New 33 kV AIS control room construction in allocated area of PGCB & feeders shifting.', type:'AIS (Panel Shifting)'},
];

const BAY_BREAKER_WORKS = [
  {sl:1,  grid:'Nurpur Grid, Pabna',                    bays:5, description:'2 new (Kadamtala & BSCIC) 33/11 kV SS & 3 existing SS (Satiani, Loskorpur, Poilanpur double circuit)',sdd:'S&DD-1 & 2, Pabna'},
  {sl:2,  grid:'Jaynagar Grid, Ishwardi',               bays:3, description:'Proposed EPZ SS, Patilakhali new circuit, Schoolpara-EPZ Ring line',                                  sdd:'S&DD Ishwardi'},
  {sl:3,  grid:'Natore Grid, Natore',                   bays:1, description:'To separate incoming for Harishpur & Alaipur',                                                        sdd:'S&D Natore'},
  {sl:4,  grid:'Shialkol Grid, Sirajganj',              bays:1, description:'33/11 kV Shialkol SS (proposed)',                                                                     sdd:'S&DD-2 Sirajganj'},
  {sl:5,  grid:'Amnura Grid, Chapainawabganj',          bays:2, description:'33/11 kV Nachole & Godagari SS',                                                                      sdd:'S&DD-Gomostapur & Godagari'},
  {sl:6,  grid:'Sabgram Grid, Bogura',                  bays:4, description:'2 new 33/11 kV GIS (Matidali, Shibbati), TMSS SS & 1 spare (2 from PGCB project)',                   sdd:'S&DD Bogura 1,2,3 / Korotoa / Dupchanchia / Santahar'},
  {sl:7,  grid:'Mohasthan Grid, Bogura',                bays:2, description:'Proposed 33/11 kV Baropur SS & 1 spare',                                                             sdd:''},
  {sl:8,  grid:'Puran Bogura Grid, Bogura',             bays:1, description:'33/11 kV Godarpara SS',                                                                               sdd:''},
  {sl:9,  grid:'Dupchanchia Grid, Bogura',              bays:6, description:'33/11 kV Dupchanchia, Muroil, Godarpara, Talora, Azad Group & 1 spare',                              sdd:''},
  {sl:10, grid:'Naogaon Grid',                          bays:4, description:'Proposed Santahar Silo SS, Proposed Naogaon Bypass SS, Proposed Kathaltoli GIS SS & Ajmeri 33 kV',   sdd:'S&DD Santahar & Naogaon North'},
  {sl:11, grid:'Sherpur Grid, Bogura',                  bays:1, description:'To separate incoming for Hazipur & Mirzapur SS',                                                      sdd:'S&D Sherpur'},
  {sl:12, grid:'Lalmonirhat Grid, Lalmonirhat',         bays:1, description:'For upcoming Chaparhat SS',                                                                           sdd:'S&D Kaliganj'},
  {sl:13, grid:'Golahat Grid, Saidpur, Nilphamari',     bays:3, description:'33/11 kV Rabiar Mor SS (proposed) & Economic Zone SS, Parbotipur existing 33/11 kV SS',              sdd:'S&DD Saidpur, Parbotipur ESU'},
  {sl:14, grid:'Taraganj Grid SS',                      bays:2, description:'33/11 kV Niamotpur SS & 1 spare',                                                                     sdd:'S&DD Saidpur'},
  {sl:15, grid:'Kurigram Grid',                         bays:2, description:'Double circuit in Kurigram SS, one for Dhorola EPZ (Bhutan)',                                         sdd:'S&D Kurigram'},
];

/* ══════════════════════════════════════════════════
   SECTION 5 — ADB PROJECT DATA (from PDFs)
══════════════════════════════════════════════════ */
const ADB_NEW_GIS = [
  {sr:1, name:'Chandipur SS',              sdd:'SDD-2, Rajshahi', capacity:'2x20/26.66', location:'Rajshahi City'},
  {sr:2, name:'Bogura SDD-1 Campus SS',    sdd:'SDD-1, Bogura',   capacity:'2x20/26.66', location:'Bogura City'},
  {sr:3, name:'Rangpur SDD-1 Campus SS',   sdd:'SDD-1, Rangpur',  capacity:'2x20/26.66', location:'Rangpur City'},
];

const ADB_NEW_AIS = [
  {sr:1, name:'Kodomtola SS',              sdd:'SDD-1, Pabna',    capacity:'2x10/13.33', location:'Pabna City'},
  {sr:2, name:'Baharkasna SS',             sdd:'SDD-3, Rangpur',  capacity:'2x10/13.33', location:'Rangpur City'},
  {sr:3, name:'Dinajpur SDD-1 Campus SS',  sdd:'SDD-1, Dinajpur', capacity:'2x10/13.33', location:'Dinajpur City'},
];

const ADB_UPGRADES = [
  {sr:1,  name:'Katkipara',     sdd:'SDD-2, Rangpur',   upgrade:'1x20/26.66', location:'Rangpur City'},
  {sr:2,  name:'Mahiganj',      sdd:'SDD-3, Rangpur',   upgrade:'1x20/26.66', location:'Rangpur City'},
  {sr:3,  name:'Dhangora',      sdd:'SDD-2, Gaibandha', upgrade:'1x20/26.66', location:'Gaibandha'},
  {sr:4,  name:'Niamotpur',     sdd:'Saidpur',          upgrade:'1x20/26.66', location:'Saidpur'},
  {sr:5,  name:'Golahat',       sdd:'Saidpur',          upgrade:'1x20/26.66', location:'Saidpur'},
  {sr:6,  name:'Fakirpara',     sdd:'SDD-1, Dinajpur',  upgrade:'1x20/26.66', location:'Dinajpur City'},
  {sr:7,  name:'Balubari',      sdd:'SDD-2, Dinajpur',  upgrade:'1x20/26.66', location:'Dinajpur City'},
  {sr:8,  name:'Upashahar',     sdd:'SDD-2, Dinajpur',  upgrade:'1x20/26.66', location:'Dinajpur City'},
  {sr:9,  name:'Setabganj',     sdd:'Setabganj',        upgrade:'1x20/26.66', location:'Dinajpur'},
  {sr:10, name:'Panchagarh',    sdd:'Panchagarh',       upgrade:'1x20/26.66', location:'Panchagarh'},
];

const ADB_NEW_GIS_SWITCHING = [
  {sr:11, grid:'Katakhali 132/33 kV SS',    name:'Katakhali',    location:'Rajshahi City'},
  {sr:12, grid:'Rangpur 132/33 kV SS',      name:'Lalbagh',      location:'Rangpur City'},
  {sr:13, grid:'Purbosadipur 132/33 kV SS', name:'Purbosadipur', location:'Dinajpur'},
];

const ADB_NEW_AIS_SWITCHING = [
  {sr:14, grid:'Domar 230/132/33 kV SS',    name:'Domar',        location:'Domar, Nilphamari'},
  {sr:15, grid:'Hatibandha 132/33 kV SS',   name:'Hatibandha',   location:'Hatibandha, Lalmonirhat'},
];

/* ══════════════════════════════════════════════════
   SECTION 6 — DISTRIBUTION TRANSFORMER DATA
   (Rajshahi-Analysis_03.xlsx — Talaimary feeders)
══════════════════════════════════════════════════ */
const FEEDER_SUMMARY = [
  {name:'Binodpur',    count:36,kva100:9, kva200:12,kva250:15,total_kva:7050,  cap_mva:7.05, la:11,la_absent:22,dofc:11,dofc_absent:22,mccb:12,mccb_absent:21,gnd:27,gnd_absent:6, copper:27,aluminium:0 },
  {name:'CharKazla',   count:32,kva100:9, kva200:13,kva250:10,total_kva:6000,  cap_mva:6.00, la:13,la_absent:18,dofc:11,dofc_absent:20,mccb:14,mccb_absent:17,gnd:31,gnd_absent:0, copper:26,aluminium:0 },
  {name:'Motihar',     count:34,kva100:5, kva200:16,kva250:13,total_kva:6950,  cap_mva:6.95, la:17,la_absent:16,dofc:9, dofc_absent:24,mccb:17,mccb_absent:16,gnd:33,gnd_absent:0, copper:30,aluminium:0 },
  {name:'RUET',        count:29,kva100:0, kva200:0, kva250:0, total_kva:0,     cap_mva:0,    la:0, la_absent:0, dofc:0, dofc_absent:0, mccb:0, mccb_absent:0, gnd:0, gnd_absent:0, copper:0, aluminium:0 },
  {name:'Raninagar',   count:28,kva100:3, kva200:12,kva250:12,total_kva:5750,  cap_mva:5.75, la:19,la_absent:9, dofc:8, dofc_absent:20,mccb:17,mccb_absent:11,gnd:28,gnd_absent:0, copper:9, aluminium:19},
  {name:'Sagorpara',   count:35,kva100:1, kva200:0, kva250:0, total_kva:287968,cap_mva:287.97,la:0,la_absent:0, dofc:0, dofc_absent:0, mccb:0, mccb_absent:0, gnd:0, gnd_absent:0, copper:0, aluminium:0 },
  {name:'Tikapara',    count:33,kva100:3, kva200:9, kva250:21,total_kva:7350,  cap_mva:7.35, la:14,la_absent:16,dofc:12,dofc_absent:18,mccb:13,mccb_absent:17,gnd:29,gnd_absent:1, copper:19,aluminium:0 },
  {name:'Sericulture', count:29,kva100:7, kva200:11,kva250:11,total_kva:5650,  cap_mva:5.65, la:8, la_absent:21,dofc:8, dofc_absent:21,mccb:10,mccb_absent:19,gnd:29,gnd_absent:0, copper:11,aluminium:1 },
  {name:'Versity',     count:29,kva100:1, kva200:0, kva250:0, total_kva:100,   cap_mva:0.1,  la:0, la_absent:0, dofc:0, dofc_absent:0, mccb:0, mccb_absent:0, gnd:0, gnd_absent:0, copper:0, aluminium:0 },
  {name:'Vodra',       count:29,kva100:4, kva200:7, kva250:18,total_kva:6300,  cap_mva:6.30, la:9, la_absent:20,dofc:4, dofc_absent:25,mccb:6, mccb_absent:23,gnd:29,gnd_absent:0, copper:6, aluminium:23},
];

const SAMPLE_TRANSFORMERS = [
  {feeder:'Binodpur',  sl:1,gis_id:'2085135',substation:'Talaimary',capacity_kva:250,ref_no:'4256',  local_name:'Hanufar Mor West',      la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Bad', mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',  sl:2,gis_id:'2084899',substation:'Talaimary',capacity_kva:250,ref_no:'4780',  local_name:'Anis Mor East',         la_present:'No', la_condition:'',   dofc_present:'No', dofc_condition:'',    mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',  sl:3,gis_id:'2084594',substation:'Talaimary',capacity_kva:200,ref_no:'4087',  local_name:'Binodpur Bazar Mosque', la_present:'No', la_condition:'',   dofc_present:'No', dofc_condition:'',    mccb_present:'Yes',mccb_condition:'Bad', grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',  sl:4,gis_id:'2084561',substation:'Talaimary',capacity_kva:250,ref_no:'4044',  local_name:'Hanufar Mor',           la_present:'No', la_condition:'',   dofc_present:'No', dofc_condition:'',    mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Binodpur',  sl:5,gis_id:'2084832',substation:'Talaimary',capacity_kva:100,ref_no:'6250',  local_name:'Mirzapur Unique Palace',la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Motihar',   sl:1,gis_id:'2084563',substation:'Talaimary',capacity_kva:200,ref_no:'192',   local_name:'Amena Tower North',     la_present:'No', la_condition:'',   dofc_present:'No', dofc_condition:'',    mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Motihar',   sl:2,gis_id:'2084023',substation:'Talaimary',capacity_kva:250,ref_no:'199',   local_name:'Alamer Mor West',       la_present:'No', la_condition:'',   dofc_present:'No', dofc_condition:'',    mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'CharKazla', sl:1,gis_id:'2084494',substation:'Talaimary',capacity_kva:200,ref_no:'13013', local_name:'Corridor Mor',          la_present:'No', la_condition:'',   dofc_present:'No', dofc_condition:'',    mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Copper',remarks:''},
  {feeder:'Raninagar', sl:1,gis_id:'2084511',substation:'Talaimary',capacity_kva:200,ref_no:'3213',  local_name:'Shahid Minar North',    la_present:'Yes',la_condition:'Bad', dofc_present:'No', dofc_condition:'',    mccb_present:'No', mccb_condition:'',   grounding_present:'Yes',grounding_qty:1,lt_material:'Aluminium',remarks:''},
  {feeder:'Tikapara',  sl:3,gis_id:'2085322',substation:'Talaimary',capacity_kva:200,ref_no:'10252', local_name:'Tikapara School',       la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Aluminium',remarks:''},
  {feeder:'Sericulture',sl:8,gis_id:'3521221',substation:'Talaimary',capacity_kva:200,ref_no:'42',   local_name:'Motpukur Mor (Wall)',    la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Copper',remarks:''},
  {feeder:'Vodra',     sl:2,gis_id:'3521256',substation:'Talaimary',capacity_kva:250,ref_no:'109',   local_name:'Vodra Bou Bazar-1',     la_present:'Yes',la_condition:'Good',dofc_present:'Yes',dofc_condition:'Good',mccb_present:'Yes',mccb_condition:'Good',grounding_present:'Yes',grounding_qty:2,lt_material:'Aluminium',remarks:''},
];

/* DT Load measurement data (empty — filled by admin) */
let DT_LOAD_DATA = [];

const LOAD_HISTORY = {
  labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  T1:    [10.2,10.8,11.5,12.1,13.4,14.2,14.8,15.1,13.9,12.4,11.2,10.5],
  T2:    [ 9.8,10.1,10.9,11.4,12.8,13.6,14.1,14.4,13.2,11.8,10.6, 9.9],
  total: [20.0,20.9,22.4,23.5,26.2,27.8,28.9,29.5,27.1,24.2,21.8,20.4],
};

/* ══════════════════════════════════════════════════
   SECTION 7 — AUTH
══════════════════════════════════════════════════ */
document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email  = document.getElementById('login-email').value.trim();
  const pwd    = document.getElementById('login-password').value;
  const btn    = document.getElementById('login-btn');
  const errEl  = document.getElementById('login-error');
  const errMsg = document.getElementById('login-err-msg');
  btn.disabled = true; btn.textContent = '⏳ Signing in…'; errEl.style.display = 'none';
  if (!IS_CONFIGURED) {
    currentUser = { email, displayName: email.split('@')[0] };
    currentRole = 'admin';
    onLoginSuccess(); return;
  }
  try {
    const cred    = await signInWithEmailAndPassword(auth, email, pwd);
    const userDoc = await getDoc(doc(db,'users',cred.user.uid));
    currentRole   = userDoc.exists() ? (userDoc.data().role||'user') : 'user';
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
  showSection('home');
}

window.logout = async () => { if (IS_CONFIGURED) await signOut(auth); location.reload(); };

if (IS_CONFIGURED) {
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      const ud = await getDoc(doc(db,'users',user.uid));
      currentRole = ud.exists() ? (ud.data().role||'user') : 'user';
      onLoginSuccess();
    }
  });
}

/* ══════════════════════════════════════════════════
   SECTION 8 — NAVIGATION
══════════════════════════════════════════════════ */
const SECTION_LABELS = {
  'home':              'Home',
  'ss-summary':        '33/11 kV Substation › Substation Summary',
  'ss-detail':         '33/11 kV Substation › Detail View',
  'all-33kv':          '33/11 kV Substation › 33 kV Line Feeder & Equipment',
  'all-pt-sw':         '33/11 kV Substation › Power Transformer Feeder Equipment',
  'all-pt-load':       '33/11 kV Substation › Power Transformer Loading & Operating Parameters',
  'all-11kv':          '33/11 kV Substation › 11 kV Feeder Info',
  'dt-overall':        'Distribution Transformer › Overall Summary',
  'dt-sdd-summary':    'Distribution Transformer › SDD/ESU-wise Summary',
  'dt-details':        'Distribution Transformer › Transformer Details',
  'dt-operating':      'Distribution Transformer › Operating Parameters',
  'dt-oil':            'Distribution Transformer › Oil Parameters',
  'dt-load':           'Distribution Transformer › DT Load',
  'dt-equipment':      'Distribution Transformer › Equipment Status',
  'switching-ss':      'Switching Substations › Grid SS-wise NESCO Feeder List',
  'fault-level':       'Switching Substations › Fault Level',
  'ongoing-projects':  'Projects › Ongoing Projects',
  'upcoming-projects': 'Projects › Upcoming Projects',
  'nidmp':             'Projects › Ongoing › NIDMP',
  'pdssp':             'Projects › Upcoming › PDSSP',
  'renewable-energy':  'Renewable Energy',
  'store-substation':  'Store › Substation Equipment Info',
  'store-line':        'Store › Line Equipment Info',
  'zrs':               'ZRS — Zonal Repair Shop',
  'zrs-detail':        'ZRS — Zonal Repair Shop › Detail',
  'load-history':      'Load History',
};

document.addEventListener('click', e => {
  const link = e.target.closest('[data-section]');
  if (!link) return;
  e.preventDefault();
  const p = link.dataset.param || null;
  showSection(link.dataset.section, p);
  document.getElementById('nav-menu').classList.remove('open');
});

function showSection(sec, param = null) {
  currentSection = sec;
  document.getElementById('bc-label').textContent = SECTION_LABELS[sec] || sec;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const active = document.querySelector(`.nav-link[data-section="${sec}"]`);
  if (active) active.classList.add('active');
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} }); charts = {};

  const R = {
    'home':              renderHome,
    'ss-summary':        renderSSSummary,
    'ss-detail':         () => renderSSDetail(param),
    'all-33kv':          renderAll33kv,
    'all-pt-sw':         renderAllPTSw,
    'all-pt-load':       renderAllPTLoad,
    'all-11kv':          renderAll11kv,
    'switching-ss':      renderSwitchingSS,
    'fault-level':       renderFaultLevel,
    'ongoing-projects':  renderOngoingProjects,
    'upcoming-projects': renderUpcomingProjects,
    'nidmp':             renderNIDMP,
    'pdssp':             renderPDSSP,
    'renewable-energy':  renderRenewable,
    'store-substation':  () => renderStoreEquipment('substation'),
    'store-line':        () => renderStoreEquipment('line'),
    'zrs':               renderZRS,
    'zrs-detail':        () => renderZRSDetail(param),
    'dt-oil':            renderDTOil,
    'dt-overall':        renderDTOverallSummary,
    'dt-sdd-summary':    renderDTSDDSummary,
    'dt-details':        () => renderDTDetails(param),
    'dt-operating':      renderDTOperating,
    'dt-load':           () => renderDTLoad(param),
    'dt-equipment':      renderDTEquipment,
    'load-history':      renderLoadHistory,
  };
  (R[sec] || (() => { document.getElementById('content').innerHTML = `<div class="page-loader">Coming soon.</div>`; }))();

  // Wide tables: attach a top mirror-scrollbar so users don't have to
  // scroll to the bottom of the page just to reach the native one.
  requestAnimationFrame(() => _attachTableScrollMirrors());
}

window.toggleNav = () => document.getElementById('nav-menu').classList.toggle('open');
const D = v => (v != null && String(v).trim() !== '' && String(v) !== 'null') ? v : '—';

/* ── Top scrollbar mirror for every wide table ──
   Inserts a 14px-tall div above each .tbl-wrap that has horizontal
   overflow, and keeps its scrollLeft synced with the wrap's
   scrollLeft. Content is untouched. */
function _attachTableScrollMirrors() {
  const wraps = document.querySelectorAll('#content .tbl-wrap');
  wraps.forEach(wrap => {
    // Clean up any previous mirror so re-renders don't accumulate them
    const prev = wrap.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('tbl-scroll-mirror')) {
      prev.remove();
    }

    const tbl = wrap.querySelector('table');
    if (!tbl) return;
    // Only attach if the table actually overflows horizontally
    if (tbl.scrollWidth <= wrap.clientWidth + 2) return;

    const mirror = document.createElement('div');
    mirror.className = 'tbl-scroll-mirror';
    const inner = document.createElement('div');
    inner.style.width = tbl.scrollWidth + 'px';
    mirror.appendChild(inner);
    wrap.parentNode.insertBefore(mirror, wrap);

    let syncing = false;
    mirror.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      wrap.scrollLeft = mirror.scrollLeft;
      syncing = false;
    });
    wrap.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      mirror.scrollLeft = wrap.scrollLeft;
      syncing = false;
    });
  });
}

// Keep mirror widths in sync when the viewport resizes
window.addEventListener('resize', () => {
  document.querySelectorAll('#content .tbl-wrap').forEach(wrap => {
    const mirror = wrap.previousElementSibling;
    const tbl = wrap.querySelector('table');
    if (!mirror || !tbl || !mirror.classList.contains('tbl-scroll-mirror')) return;
    const inner = mirror.firstElementChild;
    if (inner) inner.style.width = tbl.scrollWidth + 'px';
  });
});

// Catch tables that arrive after the initial showSection call (e.g. when
// the PDSSP "Line" tab is switched, or the ZRS detail loads its monthly
// table). A single observer running for the lifetime of the page; cheap
// because we early-exit if no tables show up.
(function _watchForLateTables() {
  if (typeof MutationObserver === 'undefined') return;
  let pending = false;
  const obs = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      _attachTableScrollMirrors();
    });
  });
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('content');
    if (root) obs.observe(root, { childList: true, subtree: true });
  });
})();

/* ══════════════════════════════════════════════════
   SECTION 9 — HOME  (renamed from Dashboard)
══════════════════════════════════════════════════ */
function renderHome() {
  if (HOME_DATA && Array.isArray(HOME_DATA.metrics) && HOME_DATA.metrics.length) {
    return renderHomeFromData();
  }
  return renderHomeLegacy();
}

function renderHomeFromData() {
  const yrs   = HOME_DATA.years;
  const find  = (q) => HOME_DATA.metrics.find(m => m.label.toLowerCase().includes(q));
  const last  = (m) => m && m.values && m.values[m.values.length - 1];
  const num   = (v) => {
    if (v == null) return null;
    const m = String(v).replace(/,/g,'').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  };
  const nums  = (m) => (m ? m.values.map(num) : []);

  const grid    = find('132/33');
  const ss33    = find('33/11 kv sub-station');
  const cap     = find('capacity');
  const demand  = find('maximum demand');
  const ohl33   = find('33kv overhead');
  const ohl11   = find('11kv overhead');
  const ohl04a  = find('11/0.4');
  const ohl04   = find('0.4 kv overhead');
  const dtX     = find('distribution transformer');
  const fdr33   = find('33 kv feeder');
  const fdr11   = find('11 kv feeder');

  // Helper: compute % growth between first and last value
  const growth = (m) => {
    if (!m) return null;
    const a = num(m.values[0]), b = last(m);
    const bn = num(b);
    if (a == null || bn == null || a === 0) return null;
    return ((bn - a) / a) * 100;
  };
  const fmt = (v) => v == null ? '—' : (typeof v === 'number' ? v.toLocaleString() : v);

  document.getElementById('content').innerHTML = `
  <div class="hero-card">
    <div class="hero-icon"><i class="fas fa-bolt"></i></div>
    <div class="hero-text">
      <h1>NESCO DNMS — Distribution Network Management System</h1>
      <p>Northern Electricity Supply Company Limited · Bangladesh</p>
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card navy">
      <div class="kpi-val">${fmt(last(grid))}</div>
      <div class="kpi-sub">132/33 kV Grid Substations</div>
      ${growth(grid) != null ? `<div class="kpi-change up"><i class="fas fa-arrow-up"></i> ${growth(grid).toFixed(1)}% over ${yrs.length-1} yrs</div>` : ''}
    </div>
    <div class="kpi-card indigo">
      <div class="kpi-val">${fmt(last(ss33))}</div>
      <div class="kpi-sub">33/11 kV Substations</div>
      ${growth(ss33) != null ? `<div class="kpi-change up"><i class="fas fa-arrow-up"></i> ${growth(ss33).toFixed(1)}% over ${yrs.length-1} yrs</div>` : ''}
    </div>
    <div class="kpi-card teal">
      <div class="kpi-val">${fmt(last(cap))}</div>
      <div class="kpi-sub">Capacity (MVA, ONAN/ONAF)</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-val">${fmt(last(demand))} MW</div>
      <div class="kpi-sub">Maximum Demand</div>
      ${growth(demand) != null ? `<div class="kpi-change up"><i class="fas fa-arrow-up"></i> ${growth(demand).toFixed(1)}% growth</div>` : ''}
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card amber">
      <div class="kpi-val">${fmt(last(dtX))}</div>
      <div class="kpi-sub">Distribution Transformers</div>
      ${growth(dtX) != null ? `<div class="kpi-change up"><i class="fas fa-arrow-up"></i> ${growth(dtX).toFixed(1)}% growth</div>` : ''}
    </div>
    <div class="kpi-card pink">
      <div class="kpi-val">${fmt(last(fdr33))}</div>
      <div class="kpi-sub">33 kV Feeders</div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-val">${fmt(last(fdr11))}</div>
      <div class="kpi-sub">11 kV Feeders</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-val">${fmt(last(ohl33))} <small style="font-size:.55em;font-weight:600">km</small></div>
      <div class="kpi-sub">33 kV Overhead Line</div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>Network Growth — Maximum Demand & Substation Capacity</h3>
      <span style="font-size:.78rem;color:var(--text3)">Last ${yrs.length} fiscal years</span>
    </div>
    <div class="panel-body">
      <div style="height:340px;position:relative">
        <canvas id="home-demand-chart"></canvas>
      </div>
    </div>
  </div>

  <div class="grid-2col" style="display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(440px,1fr))">
    <div class="panel">
      <div class="panel-head"><h3>Distribution Transformers (count)</h3></div>
      <div class="panel-body">
        <div style="height:280px;position:relative"><canvas id="home-dt-chart"></canvas></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Distribution Lines (km)</h3></div>
      <div class="panel-body">
        <div style="height:280px;position:relative"><canvas id="home-line-chart"></canvas></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Substation Count Trend</h3></div>
      <div class="panel-body">
        <div style="height:280px;position:relative"><canvas id="home-ss-chart"></canvas></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Feeder Count Trend</h3></div>
      <div class="panel-body">
        <div style="height:280px;position:relative"><canvas id="home-feeder-chart"></canvas></div>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Headlines</h3></div>
    <div class="panel-body">
      <div class="hl-grid">
        ${(HOME_DATA.commentary || []).map(c => `
          <div class="hl-card">
            <div class="hl-head"><i class="fas fa-circle-info"></i> ${c.heading}</div>
            <div class="hl-text">${c.text}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Quick links</h3></div>
    <div class="panel-body">
      <div class="quick-grid">
        <a class="qcard" href="#" onclick="window.showSection('ss-summary');return false">
          <i class="fas fa-bolt"></i><div><strong>33/11 kV Substations</strong><span>View all ${ALL_SUBSTATIONS.length} substations</span></div>
        </a>
        <a class="qcard" href="#" onclick="window.showSection('dt-overall');return false">
          <i class="fas fa-circle-half-stroke"></i><div><strong>Distribution Transformer</strong><span>Survey + operating data</span></div>
        </a>
        <a class="qcard" href="#" onclick="window.showSection('switching-ss');return false">
          <i class="fas fa-network-wired"></i><div><strong>Switching SS</strong><span>Grid-wise feeder list</span></div>
        </a>
        <a class="qcard" href="#" onclick="window.showSection('pdssp');return false">
          <i class="fas fa-hard-hat"></i><div><strong>PDSSP</strong><span>Ongoing strengthening project</span></div>
        </a>
        <a class="qcard" href="#" onclick="window.showSection('nidmp');return false">
          <i class="fas fa-calendar-plus"></i><div><strong>NIDMP</strong><span>Upcoming modernization project</span></div>
        </a>
        <a class="qcard" href="#" onclick="window.showSection('load-history');return false">
          <i class="fas fa-chart-line"></i><div><strong>Load History</strong><span>Network demand trends</span></div>
        </a>
      </div>
    </div>
  </div>
  `;

  // Defer chart-drawing so the canvases are in the DOM
  setTimeout(() => _drawHomeCharts({yrs, demand, cap, dtX, ohl33, ohl11, ohl04a, ohl04, ss33, grid, fdr33, fdr11, num, nums}), 60);
}

function _drawHomeCharts(ctx) {
  const {yrs, demand, cap, dtX, ohl33, ohl11, ohl04a, ohl04, ss33, grid, fdr33, fdr11, num, nums} = ctx;
  const palette = {
    blue:'#2563eb', red:'#dc2626', amber:'#f59e0b', green:'#10b981',
    purple:'#7c3aed', pink:'#db2777', teal:'#0d9488', indigo:'#4f46e5'
  };
  const baseOpts = {
    responsive:true, maintainAspectRatio:false,
    interaction:{intersect:false, mode:'index'},
    plugins:{legend:{position:'bottom', labels:{boxWidth:12, padding:10, font:{size:11}}}},
    scales:{
      y:{beginAtZero:false, grid:{color:'rgba(99,102,241,.08)'}},
      x:{grid:{display:false}}
    }
  };

  const mk = (id, cfg) => {
    const el = document.getElementById(id);
    if (!el || typeof Chart === 'undefined') return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(el, cfg);
  };

  // Capacity is "X/Y" — split into ONAN/ONAF
  const capONAN = cap ? cap.values.map(v => num((String(v).split('/')[0] || '').trim())) : [];
  const capONAF = cap ? cap.values.map(v => num((String(v).split('/')[1] || '').trim())) : [];

  mk('home-demand-chart', {
    type:'bar',
    data:{
      labels:yrs,
      datasets:[
        {label:'Maximum Demand (MW)', data:nums(demand), backgroundColor:palette.red, borderRadius:6, yAxisID:'y'},
        {label:'Capacity ONAN (MVA)', data:capONAN,      type:'line', borderColor:palette.blue,   backgroundColor:palette.blue,   tension:.35, yAxisID:'y1', pointRadius:5, pointHoverRadius:7, borderWidth:3},
        {label:'Capacity ONAF (MVA)', data:capONAF,      type:'line', borderColor:palette.indigo, backgroundColor:palette.indigo, tension:.35, yAxisID:'y1', pointRadius:5, pointHoverRadius:7, borderWidth:3, borderDash:[6,4]},
      ]
    },
    options:{
      ...baseOpts,
      scales:{
        y:{title:{display:true, text:'MW'}, beginAtZero:false},
        y1:{position:'right', title:{display:true, text:'MVA'}, grid:{display:false}, beginAtZero:false},
        x:{grid:{display:false}}
      }
    }
  });

  mk('home-dt-chart', {
    type:'bar',
    data:{
      labels:yrs,
      datasets:[{label:'Distribution Transformers', data:nums(dtX), backgroundColor:palette.amber, borderRadius:6}]
    },
    options:baseOpts
  });

  mk('home-line-chart', {
    type:'line',
    data:{
      labels:yrs,
      datasets:[
        {label:'33 kV',      data:nums(ohl33),  borderColor:palette.blue,   backgroundColor:palette.blue+'22',   tension:.35, pointRadius:4, fill:true, borderWidth:2.5},
        {label:'11 kV',      data:nums(ohl11),  borderColor:palette.green,  backgroundColor:palette.green+'22',  tension:.35, pointRadius:4, fill:true, borderWidth:2.5},
        {label:'11/0.4 kV',  data:nums(ohl04a), borderColor:palette.amber,  backgroundColor:palette.amber+'22',  tension:.35, pointRadius:4, fill:true, borderWidth:2.5},
        {label:'0.4 kV',     data:nums(ohl04),  borderColor:palette.purple, backgroundColor:palette.purple+'22', tension:.35, pointRadius:4, fill:true, borderWidth:2.5},
      ]
    },
    options:baseOpts
  });

  mk('home-ss-chart', {
    type:'line',
    data:{
      labels:yrs,
      datasets:[
        {label:'132/33 kV Grid SS', data:nums(grid), borderColor:palette.indigo, backgroundColor:palette.indigo, tension:.35, pointRadius:5, borderWidth:3},
        {label:'33/11 kV SS',       data:nums(ss33), borderColor:palette.teal,   backgroundColor:palette.teal,   tension:.35, pointRadius:5, borderWidth:3},
      ]
    },
    options:baseOpts
  });

  mk('home-feeder-chart', {
    type:'bar',
    data:{
      labels:yrs,
      datasets:[
        {label:'33 kV Feeders', data:nums(fdr33), backgroundColor:palette.pink,  borderRadius:6},
        {label:'11 kV Feeders', data:nums(fdr11), backgroundColor:palette.purple, borderRadius:6},
      ]
    },
    options:baseOpts
  });
}





/* ══════════════════════════════════════════════════
   FILTER HELPERS  (for 33/11 kV Substation pages)
══════════════════════════════════════════════════ */
function _ssCapacityMVA(ss) {
  // capacity_mva is like '2x20/26.66' or '3*20/26.66' — return the ONAF total in MVA
  if (!ss || !ss.capacity_mva) return null;
  const s = String(ss.capacity_mva).replace(/\s/g,'');
  const m = s.match(/(\d+)[x*](\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?/);
  if (!m) return null;
  const n = parseInt(m[1]);
  const onaf = parseFloat(m[3] || m[2]);
  return n * onaf;
}

function _ssZone(ss) {
  if (!ss) return '';
  return ss.zone || ss.sdd_esu || '';
}

function _uniqueValues(list, fn) {
  return [...new Set(list.map(fn).filter(Boolean))].sort();
}

function ssFilterBar(idPrefix, list, onChange, opts={}) {
  // Returns HTML for: search + zone + capacity-range + SS Type dropdowns
  const zones = _uniqueValues(list, _ssZone);
  const types = _uniqueValues(list, s => s.ss_type);
  return `
    <input class="search-input" id="${idPrefix}-q" placeholder="🔍 Search substation…" oninput="${onChange}()" style="max-width:200px">
    <select class="filter-sel" id="${idPrefix}-zone" onchange="${onChange}()">
      <option value="">All Zones / SDD</option>
      ${zones.map(z => `<option value="${z}">${z}</option>`).join('')}
    </select>
    <select class="filter-sel" id="${idPrefix}-type" onchange="${onChange}()">
      <option value="">SS Type: All</option>
      ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
    </select>
    <select class="filter-sel" id="${idPrefix}-cap" onchange="${onChange}()">
      <option value="">Capacity: All</option>
      <option value="0-20">≤ 20 MVA</option>
      <option value="20-40">20 – 40 MVA</option>
      <option value="40-80">40 – 80 MVA</option>
      <option value="80-9999">&gt; 80 MVA</option>
    </select>`;
}

function applySSFilters(idPrefix, list) {
  const q       = (document.getElementById(idPrefix+'-q')?.value     || '').toLowerCase();
  const zone    =  document.getElementById(idPrefix+'-zone')?.value   || '';
  const ssType  =  document.getElementById(idPrefix+'-type')?.value   || '';
  const capRng  =  document.getElementById(idPrefix+'-cap')?.value    || '';

  const [capLo, capHi] = capRng ? capRng.split('-').map(Number) : [null,null];

  return list.filter(ss => {
    if (q && !((ss.name||'').toLowerCase().includes(q) ||
               (ss.sdd_esu||'').toLowerCase().includes(q))) return false;
    if (zone && _ssZone(ss) !== zone) return false;
    if (ssType && (ss.ss_type || '') !== ssType) return false;
    if (capLo != null) {
      const c = _ssCapacityMVA(ss);
      if (c == null || c < capLo || c > capHi) return false;
    }
    return true;
  });
}

/* renderPDSSP / renderNIDMP have moved to SECTION 18b — they now read
   from the regenerated projects.json (categories → projects) instead of
   the old PROJECTS_DATA.pdssp / .nidmp shape. */

/* ══════════════════════════════════════════════════
   DT — Oil Parameters submenu
══════════════════════════════════════════════════ */
function renderDTOil() {
  // Seed once from JSON, same way as renderDTOperating
  if (!DT_OP_SEEDED && DT_BY_SDD && Object.keys(DT_BY_SDD).length) {
    DT_OP_DATA = [];
    for (const sddId of Object.keys(DT_BY_SDD)) {
      for (const r of DT_BY_SDD[sddId]) {
        DT_OP_DATA.push({
          sdd_id: r.sdd_id, sdd_name: r.sdd_name, feeder: r.feeder,
          gis_id: r.gis_id, capacity_kva: r.capacity_kva,
          gis_location: r.gis_location, local_name: r.local_name,
          phase_a: r.phase_a, phase_b: r.phase_b, phase_c: r.phase_c,
          oil_temp: r.oil_temp, oil_bdv: r.oil_bdv, date: null
        });
      }
    }
    DT_OP_SEEDED = true;
  }

  const sdds    = OVERALL_SUMMARY.map(s => s.name);
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — Oil Parameters</h2>
      <p>Oil Breakdown Voltage (BDV) and Oil Temperature for distribution transformers</p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel" id="oil-sdd" onchange="window.filterOilTable()">
        <option value="">All SDD/ESU</option>
        ${sdds.map(n => `<option value="${n}">${n}</option>`).join('')}
      </select>
      <select class="filter-sel" id="oil-feeder" onchange="window.filterOilTable()">
        <option value="">All Feeders</option>
      </select>
      <button class="btn btn-sm btn-secondary" onclick="window.exportOilCSV()"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${(() => {
    const stats = DT_OP_DATA.reduce((a,r) => {
      const t = _phNum(r.oil_temp), b = _phNum(r.oil_bdv);
      if (t != null) { a.tempN++; a.tempSum += t; if (t > 80) a.tempHi++; }
      if (b != null) { a.bdvN++;  a.bdvSum  += b; if (b < 30) a.bdvLo++;  }
      return a;
    }, {tempN:0,tempSum:0,tempHi:0, bdvN:0,bdvSum:0,bdvLo:0});
    return `<div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
      <div class="kpi-card navy"><div class="kpi-val">${DT_OP_DATA.length.toLocaleString()}</div><div class="kpi-sub">Total Transformers</div></div>
      <div class="kpi-card teal"><div class="kpi-val">${stats.tempN.toLocaleString()}</div><div class="kpi-sub">Oil-temp Records</div></div>
      <div class="kpi-card red"><div class="kpi-val">${stats.tempHi}</div><div class="kpi-sub">Hot (&gt;80°C)</div></div>
      <div class="kpi-card amber"><div class="kpi-val">${stats.bdvN.toLocaleString()}</div><div class="kpi-sub">BDV Records</div></div>
      <div class="kpi-card pink"><div class="kpi-val">${stats.bdvLo}</div><div class="kpi-sub">Low BDV (&lt;30 kV)</div></div>
    </div>`;
  })()}

  <div class="panel">
    <div class="panel-head"><h3>Oil Parameter Records</h3>
      <span id="oil-count" style="font-size:.82rem;color:var(--text3)">${DT_OP_DATA.length} records</span></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>GIS ID</th>
          <th>Rating (kVA)</th>
          <th>SDD/ESU</th>
          <th>Feeder</th>
          <th>Local Name</th>
          <th>Oil BDV (kV)</th>
          <th>Oil Temp (°C)</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody id="oil-tbody">
        ${renderOilRows(DT_OP_DATA)}
      </tbody>
    </table>
    </div></div>
  </div>

  <div class="note-bar"><i class="fas fa-droplet"></i>
    <div><strong>Oil BDV:</strong> recommended &gt; 30 kV (IEC 60156). <strong>Oil Temp:</strong> alarm &gt; 80 °C, trip &gt; 95 °C.</div>
  </div>
  `;
}

function renderOilRows(rows) {
  if (!rows.length) return `<tr><td colspan="10" class="tbl-empty">No oil-parameter records.</td></tr>`;
  return rows.map((r,i) => {
    const bdv  = _phNum(r.oil_bdv);
    const temp = _phNum(r.oil_temp);
    const bdvBadge = bdv == null ? '—' : (bdv < 30
        ? `<span class="badge badge-bad">Low</span>` :
        `<span class="badge badge-good">OK</span>`);
    const tempBadge = temp == null ? '—' : (temp > 80
        ? `<span class="badge badge-bad">Hot</span>` :
        `<span class="badge badge-good">Normal</span>`);
    const status = (bdv != null && bdv < 30) || (temp != null && temp > 80)
      ? `<span class="badge badge-bad">Action Required</span>`
      : (bdv != null || temp != null
          ? `<span class="badge badge-good">OK</span>`
          : '<span class="badge badge-gray">No data</span>');
    return `<tr>
      <td>${i+1}</td>
      <td style="font-family:'Courier New',monospace;font-size:.78rem">${D(r.gis_id)}</td>
      <td class="num">${D(r.capacity_kva)}</td>
      <td style="font-size:.8rem">${D(r.sdd_name)}</td>
      <td style="font-size:.8rem">${D(r.feeder)}</td>
      <td style="font-size:.8rem" title="${r.local_name||''}">${(r.local_name||'—').substring(0,18)}${(r.local_name||'').length>18?'…':''}</td>
      <td class="num">${bdv != null ? bdv : '—'} ${bdvBadge !== '—' ? bdvBadge : ''}</td>
      <td class="num">${temp != null ? temp : '—'} ${tempBadge !== '—' ? tempBadge : ''}</td>
      <td>${status}</td>
      <td style="font-size:.78rem">${D(r.date)}</td>
    </tr>`;
  }).join('');
}

window.filterOilTable = () => {
  const sddSel    = document.getElementById('oil-sdd');
  const feederSel = document.getElementById('oil-feeder');
  const sdd    = sddSel ? sddSel.value : '';
  if (feederSel) {
    const wanted = feederSel.value;
    const feeders = sdd
      ? [...new Set(DT_OP_DATA.filter(r => r.sdd_name === sdd).map(r => r.feeder).filter(Boolean))]
      : [];
    feederSel.innerHTML = `<option value="">All Feeders</option>` +
      feeders.map(f => `<option value="${f}" ${f===wanted?'selected':''}>${f}</option>`).join('');
  }
  const feeder = feederSel ? feederSel.value : '';
  const f = DT_OP_DATA.filter(r => {
    if (sdd && r.sdd_name !== sdd) return false;
    if (feeder && r.feeder !== feeder) return false;
    return true;
  });
  document.getElementById('oil-tbody').innerHTML = renderOilRows(f);
  document.getElementById('oil-count').textContent = f.length + ' records';
};

window.exportOilCSV = () => {
  const rows = [['GIS ID','Rating (kVA)','SDD','Feeder','Local Name','Oil BDV (kV)','Oil Temp (°C)','Date']];
  DT_OP_DATA.forEach(r => rows.push([
    r.gis_id, r.capacity_kva, r.sdd_name, r.feeder, r.local_name,
    r.oil_bdv, r.oil_temp, r.date
  ]));
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([rows.map(r => r.map(v => v == null ? '' : v).join(',')).join('\n')], {type:'text/csv'})),
    download: 'dt_oil_parameters.csv'
  });
  a.click(); showToast('Exported!','success');
};

function renderHomeLegacy() {
  const totalTx   = FEEDER_SUMMARY.reduce((s,f)=>s+f.count,0);
  const totalMva  = FEEDER_SUMMARY.filter(f=>f.cap_mva<100).reduce((s,f)=>s+f.cap_mva,0);
  const totalLa   = FEEDER_SUMMARY.reduce((s,f)=>s+f.la,0);
  const totalDofc = FEEDER_SUMMARY.reduce((s,f)=>s+f.dofc,0);
  const totalMccb = FEEDER_SUMMARY.reduce((s,f)=>s+f.mccb,0);
  const totalGnd  = FEEDER_SUMMARY.reduce((s,f)=>s+f.gnd,0);

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Home</h2>
      <p>NESCO Distribution Network Management System — ${ALL_SUBSTATIONS.length} substations loaded</p>
    </div>
    <div class="sec-head-right">
      <span class="badge badge-online"><i class="fas fa-circle"></i> Network Online</span>
      <span style="font-size:.78rem;color:var(--text3)">${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>
    </div>
  </div>

  ${!IS_CONFIGURED ? `<div class="alert alert-warn"><i class="fas fa-exclamation-triangle"></i>
    <div><strong>Demo Mode:</strong> Firebase not configured — paste your config in app.js to save data.</div></div>` : ''}

  <div class="kpi-row">
    <div class="kpi-card navy"><div class="kpi-val">${ALL_SUBSTATIONS.length}</div><div class="kpi-sub">33/11 kV Substations</div></div>
    <div class="kpi-card"><div class="kpi-val">${GRID_SUBSTATIONS.length}</div><div class="kpi-sub">Grid Substations</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${SWITCHING_SS_WORKS.length}</div><div class="kpi-sub">Switching SS Works</div></div>
    <div class="kpi-card"><div class="kpi-val">${totalTx}</div><div class="kpi-sub">Distribution TXs (Talaimary)</div></div>
    <div class="kpi-card"><div class="kpi-val">${totalMva.toFixed(1)}</div><div class="kpi-sub">DT Capacity (MVA)</div></div>
    <div class="kpi-card green"><div class="kpi-val">${ADB_NEW_GIS.length+ADB_NEW_AIS.length}</div><div class="kpi-sub">New ADB Substations</div></div>
    <div class="kpi-card"><div class="kpi-val">${ADB_UPGRADES.length}</div><div class="kpi-sub">ADB SS Upgrades</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${BAY_BREAKER_WORKS.reduce((s,b)=>s+b.bays,0)}</div><div class="kpi-sub">Bay Breakers Required</div></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-shield-alt"></i> DT Equipment Coverage — Talaimary (314 TXs)</h3></div>
      <div class="panel-body">
        ${[['11 kV LA',totalLa,totalTx,'var(--red2)'],['11 kV DOFC',totalDofc,totalTx,'var(--amber2)'],['0.4 kV MCCB',totalMccb,totalTx,'var(--purple2)'],['Grounding',totalGnd,totalTx,'var(--green2)']].map(([lbl,val,tot,col])=>{
          const pct=Math.round(val/tot*100);
          return `<div class="cov-bar-row">
            <div class="cov-bar-label">${lbl}</div>
            <div class="cov-bar-wrap"><div class="cov-bar-fill" style="width:${pct}%;background:${col}"></div></div>
            <div class="cov-bar-val">${pct}%</div>
            <div style="font-size:.74rem;color:var(--text3);min-width:55px">${val}/${tot}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-hard-hat"></i> ADB Project Quick Overview</h3></div>
      <div class="panel-body no-pad"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Category</th><th>Count</th><th>Capacity</th></tr></thead>
        <tbody>
          <tr><td>New 33/11 kV GIS SS</td><td class="num">3</td><td>2×20/26.66 MVA each</td></tr>
          <tr><td>New 33/11 kV AIS SS</td><td class="num">3</td><td>2×10/13.33 MVA each</td></tr>
          <tr><td>SS Capacity Upgradation</td><td class="num">10</td><td>1×20/26.66 MVA each</td></tr>
          <tr><td>New GIS Switching SS</td><td class="num">3</td><td>33 kV Switching</td></tr>
          <tr><td>New AIS Switching SS</td><td class="num">2</td><td>33 kV Switching</td></tr>
          <tr><td>Bay Breakers Required</td><td class="num">${BAY_BREAKER_WORKS.reduce((s,b)=>s+b.bays,0)}</td><td>Various grid points</td></tr>
        </tbody>
      </table></div></div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3><i class="fas fa-chart-area"></i> Monthly Load Trend — Talaimary 33/11 kV (2024)</h3>
      <span class="badge badge-blue">T1 + T2</span>
    </div>
    <div class="panel-body"><div class="chart-container"><canvas id="chart-home-load"></canvas></div></div>
  </div>
  `;

  setTimeout(() => {
    const ctx = document.getElementById('chart-home-load');
    if (!ctx) return;
    charts['home-load'] = new Chart(ctx, {
      type:'line',
      data:{labels:LOAD_HISTORY.labels,datasets:[
        {label:'T1 Load (MW)',data:LOAD_HISTORY.T1,   borderColor:'#1565c0',backgroundColor:'rgba(21,101,192,.08)',tension:0.4,fill:true,pointRadius:4},
        {label:'T2 Load (MW)',data:LOAD_HISTORY.T2,   borderColor:'#059669',backgroundColor:'rgba(5,150,105,.08)', tension:0.4,fill:true,pointRadius:4},
        {label:'Total (MW)',  data:LOAD_HISTORY.total,borderColor:'#d97706',backgroundColor:'transparent',         tension:0.4,borderDash:[5,4],pointRadius:3},
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:false,title:{display:true,text:'Load (MW)'}}}}
    });
  }, 100);
}

/* ══════════════════════════════════════════════════
   SECTION 10 — 33/11 kV SUBSTATION SUMMARY (TABLE)
══════════════════════════════════════════════════ */
function renderSSSummary() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>33/11 kV Substation Summary</h2>
      <p>${ALL_SUBSTATIONS.length} substations in the NESCO distribution network</p>
    </div>
    <div class="sec-head-right">
      ${ssFilterBar('ss', ALL_SUBSTATIONS, 'window.filterSSTable')}
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddSSModal()"><i class="fas fa-plus"></i> Add Substation</button>` : ''}
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${ALL_SUBSTATIONS.length}</div><div class="kpi-sub">Total Substations</div></div>
    <div class="kpi-card teal"><div class="kpi-val">${ALL_SUBSTATIONS.filter(s=>s.ss_type==='AIS').length}</div><div class="kpi-sub">AIS Type</div></div>
    <div class="kpi-card indigo"><div class="kpi-val">${ALL_SUBSTATIONS.filter(s=>s.ss_type==='GIS').length}</div><div class="kpi-sub">GIS Type</div></div>
    <div class="kpi-card"><div class="kpi-val">${ALL_SUBSTATIONS.reduce((s,ss)=>s+(ss.power_transformers||[]).length,0)}</div><div class="kpi-sub">Power Transformers</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${ALL_SUBSTATIONS.reduce((s,ss)=>s+(ss.feeders_11kv||[]).length,0)}</div><div class="kpi-sub">Total 11 kV Feeders</div></div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>All 33/11 kV Substations</h3>
      <span id="ss-count" style="font-size:.82rem;color:var(--text3)">${ALL_SUBSTATIONS.length} Substations</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl" id="ss-table">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation Name</th>
          <th>SS Type</th>
          <th>SDD / ESU</th>
          <th>Capacity (MVA)</th>
          <th>Max Demand (MW)</th>
          <th>Power TXs</th>
          <th>11 kV Feeders</th>
          <th>33 kV Lines</th>
          <th>Control Room No.</th>
          <th>GPS</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="ss-tbody">${renderSSRows(ALL_SUBSTATIONS)}</tbody>
    </table>
    </div></div>
  </div>
  `;
}

/* Style helper for the SS Type cell.
   AIS → blue badge, GIS → purple badge, Rural Type → amber badge. */
function _ssTypeBadge(t) {
  if (!t) return '<span class="badge badge-gray">—</span>';
  const cls = t === 'GIS' ? 'badge-blue'
            : t === 'AIS' ? 'badge-good'
            : 'badge-partial';
  return `<span class="badge ${cls}">${t}</span>`;
}

function renderSSRows(list) {
  if (!list.length) return `<tr><td colspan="12" class="tbl-empty">No substations found.</td></tr>`;
  return list.map((ss,i) => `
  <tr>
    <td>${i+1}</td>
    <td>
      <a href="#" onclick="window.showSection('ss-detail','${ss.id}');return false;" style="font-weight:600;color:var(--blue)">
        ${ss.name||ss.sheet_name}
      </a>
    </td>
    <td>${_ssTypeBadge(ss.ss_type)}</td>
    <td>${D(ss.sdd_esu)}</td>
    <td class="num">${D(ss.capacity_mva)}</td>
    <td class="num">${ss.max_demand_mw!=null ? ss.max_demand_mw+' MW' : '—'}</td>
    <td class="num">${(ss.power_transformers||[]).length}</td>
    <td class="num">${(ss.feeders_11kv||[]).length}</td>
    <td class="num">${(ss.lines_33kv||[]).length}</td>
    <td style="font-size:.8rem">${D(ss.mobile)}</td>
    <td>${ss.gps_lat ? `<a href="https://maps.google.com/?q=${ss.gps_lat},${ss.gps_lng}" target="_blank" title="${ss.gps_lat},${ss.gps_lng}"><i class="fas fa-map-marker-alt" style="color:var(--red2)"></i></a>` : '—'}</td>
    <td>
      <button class="btn btn-xs btn-secondary" onclick="window.showSection('ss-detail','${ss.id}')"><i class="fas fa-eye"></i></button>
      ${currentRole==='admin' ? `<button class="btn btn-xs btn-primary" onclick="window.openEditSSModal('${ss.id}')" style="margin-left:3px"><i class="fas fa-edit"></i></button>` : ''}
    </td>
  </tr>`).join('');
}

window.filterSSTable = () => {
  const filtered = applySSFilters('ss', ALL_SUBSTATIONS);
  const tbody = document.getElementById('ss-tbody');
  if (tbody) tbody.innerHTML = renderSSRows(filtered);
  const cEl = document.getElementById('ss-count');
  if (cEl) cEl.textContent = filtered.length + ' Substations';
};

/* ══════════════════════════════════════════════════
   SECTION 11 — SUBSTATION DETAIL (serial sections, no tabs)
══════════════════════════════════════════════════ */
/* §6b — Previous 5 years (FY 2020-2021 .. FY 2024-2025) of max load,
   rendered as a compact horizontal table so years are columns.
   If the source data does not (yet) contain a per-substation load
   history, we show "—" cells with a small note. */
const FIVE_YEAR_FYS = [
  '2020-2021', '2021-2022', '2022-2023', '2023-2024', '2024-2025',
];
function _renderFiveYearLoadTable(ss) {
  const history = ss.load_history_5yr || {};   // shape: { "2024-2025": 23.0, ... }
  const cells = FIVE_YEAR_FYS.map(fy => {
    const v = history[fy];
    return `<td class="num">${v == null ? '—' : `${v} MW`}</td>`;
  }).join('');
  const hasAny = FIVE_YEAR_FYS.some(fy => history[fy] != null);
  return `
    <div class="panel" style="margin-bottom:20px">
      <div class="panel-head" style="background:var(--navy);color:#fff">
        <h3 style="color:#fff;font-size:.85rem">1b. PREVIOUS 5 YEARS LOAD <span style="color:rgba(255,255,255,.6);font-weight:500;font-size:.75rem;text-transform:none">— Maximum recorded per fiscal year</span></h3>
      </div>
      <div class="panel-body no-pad">
        <table class="tbl ss-load-tbl">
          <thead><tr>
            <th>Metric</th>
            ${FIVE_YEAR_FYS.map(fy => `<th class="num">FY ${fy}</th>`).join('')}
          </tr></thead>
          <tbody>
            <tr><td><strong>Max Load (MW)</strong></td>${cells}</tr>
          </tbody>
        </table>
        ${hasAny ? '' : `<div style="padding:10px 16px;font-size:.78rem;color:var(--text3);font-style:italic">Load-history values not yet populated in the source workbook. They will appear here automatically once the Excel master file is updated and the JSON regenerated.</div>`}
      </div>
    </div>`;
}

function renderSSDetail(id) {
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
      ${ss.gps_lat ? `<a href="https://maps.google.com/?q=${ss.gps_lat},${ss.gps_lng}" target="_blank" class="btn btn-sm btn-secondary"><i class="fas fa-map-marker-alt"></i> Map</a>` : ''}
      ${currentRole==='admin' ? `<button class="btn btn-sm btn-primary" onclick="window.openEditSSModal('${ss.id}')"><i class="fas fa-edit"></i> Edit</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('ss-summary')"><i class="fas fa-arrow-left"></i> Back</button>
    </div>
  </div>

  <!-- ══ 1. SUBSTATION BASIC INFORMATION ══ -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">1. SUBSTATION BASIC INFORMATION</h3>
    </div>
    <div class="panel-body" style="padding:0">
      <table class="tbl" style="margin:0">
        <tbody>
          <tr style="background:var(--s2)">
            <td style="width:220px;font-weight:600;color:var(--text3);font-size:.82rem">Substation Name</td>
            <td style="font-weight:700">${D(ss.name||ss.sheet_name)}</td>
            <td style="width:220px;font-weight:600;color:var(--text3);font-size:.82rem">SDD / ESU Name</td>
            <td>${D(ss.sdd_esu)}</td>
          </tr>
          <tr>
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">SS Capacity (MVA)</td>
            <td>${D(ss.capacity_mva)}</td>
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">Max Demand (MW)</td>
            <td>${ss.max_demand_mw!=null ? ss.max_demand_mw+' MW' : '—'}</td>
          </tr>
          <tr style="background:var(--s2)">
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">GPS Coordinate</td>
            <td>${ss.gps_lat ? `${ss.gps_lat}, ${ss.gps_lng}` : '—'}</td>
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">Control Room No.</td>
            <td>${D(ss.mobile)}</td>
          </tr>
          <tr>
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">Grounding Resistance (Ω)</td>
            <td>${D(ss.grounding_resistance)}</td>
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">Date of Measurement (Grounding Resistance)</td>
            <td>${D(ss.grounding_date)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ 1b. PREVIOUS 5 YEARS LOAD  (per AGENT_BRIEF §6b) ══ -->
  ${_renderFiveYearLoadTable(ss)}

  <!-- ══ 2. 33 kV LINE FEEDER & EQUIPMENT ══ -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff;display:flex;justify-content:space-between;align-items:center">
      <h3 style="color:#fff;font-size:.85rem">2. 33 KV LINE FEEDER &amp; EQUIPMENT</h3>
      ${currentRole==='admin' ? `<button class="btn btn-xs btn-secondary" style="border-color:rgba(255,255,255,.4);color:#fff" onclick="window.openAddLineModal('${ss.id}')"><i class="fas fa-plus"></i> Add Line</button>` : ''}
    </div>
    <div class="panel-body no-pad">
      <div class="tbl-wrap"><table class="tbl">
        <thead>
          <tr>
            <th>Sl.</th>
            <th>Name of the Feeder</th>
            <th>Source / Ring Line</th>
            <th>Length (km)</th>
            <th>Conductor</th>
            <th>Circuit Breaker</th>
            <th>PCM Panel</th>
            <th>Remarks</th>
            ${currentRole==='admin' ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${lines.length ? lines.map((l,i) => `
          <tr>
            <td>${i+1}</td>
            <td><strong>${D(l.name)}</strong></td>
            <td><span class="badge ${(l.source_ring||l.remarks||'').toLowerCase().includes('source') ? 'badge-blue' : 'badge-gray'}">${D(l.source_ring || (l.remarks?.toLowerCase().includes('source') ? 'Source' : l.remarks?.toLowerCase().includes('ring') ? 'Ring' : '—'))}</span></td>
            <td class="num">${l.length_km!=null ? l.length_km+' km' : '—'}</td>
            <td>${D(l.conductor)}</td>
            <td>${D(l.breaker)}</td>
            <td>${D(l.panel)}</td>
            <td style="font-size:.78rem;color:var(--text3)">${D(l.remarks)}</td>
            ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.openEditLineModal('${ss.id}',${i})"><i class="fas fa-edit"></i></button></td>` : ''}
          </tr>`).join('') :
          `<tr><td colspan="9" class="tbl-empty">No 33 kV line data recorded.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  </div>

  <!-- ══ 3. POWER TRANSFORMER FEEDER EQUIPMENT ══ -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff;display:flex;justify-content:space-between;align-items:center">
      <h3 style="color:#fff;font-size:.85rem">3. POWER TRANSFORMER FEEDER EQUIPMENT (Circuit Breaker &amp; Panel)</h3>
      ${currentRole==='admin' ? `<button class="btn btn-xs btn-secondary" style="border-color:rgba(255,255,255,.4);color:#fff" onclick="window.openAddTxModal('${ss.id}')"><i class="fas fa-plus"></i> Add TX</button>` : ''}
    </div>
    <div class="panel-body no-pad">
      <div class="tbl-wrap"><table class="tbl">
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
            <th>PCM Panel Mfr.</th>
            <th>PCM Panel Year</th>
            <th>Comment</th>
            ${currentRole==='admin' ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${txs.length ? txs.map((t,i) => `
          <tr>
            <td><strong>${D(t.name)}</strong></td>
            <td class="num">${D(t.capacity)}</td>
            <td><span class="badge badge-gray">${D(t.ais_gis)}</span></td>
            <td>${D(t.cb_type)}</td>
            <td>${D(t.breaker)}</td>
            <td>${D(t.cb_year||t.year)}</td>
            <td>${D(t.ct_manufacturer)}</td>
            <td>${D(t.ct_year)}</td>
            <td>${D(t.panel)}</td>
            <td>${D(t.panel_year||t.year)}</td>
            <td style="font-size:.78rem;color:var(--text3)">${D(t.comment)}</td>
            ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.openEditTxSwModal('${ss.id}',${i})"><i class="fas fa-edit"></i></button></td>` : ''}
          </tr>`).join('') :
          `<tr><td colspan="12" class="tbl-empty">No power transformer data recorded.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  </div>

  <!-- ══ 4. POWER TRANSFORMER LOADING & OPERATING PARAMETERS ══ -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">4. POWER TRANSFORMER LOADING &amp; OPERATING PARAMETERS</h3>
    </div>
    <div class="panel-body no-pad">
      <div class="tbl-wrap"><table class="tbl">
        <thead>
          <tr>
            <th>Name</th>
            <th>Capacity (MVA)</th>
            <th>Max Load (MW)</th>
            <th>Loading %</th>
            <th>% Impedance</th>
            <th>Manufacturer</th>
            <th>Mfg. Year</th>
            <th>OLTC Mfr.</th>
            <th>Oil BDV</th>
            <th>OTI Highest (°C)</th>
            <th>OTI Date</th>
            <th>HT WTI (°C)</th>
            <th>HT WTI Date</th>
            <th>LT WTI (°C)</th>
            <th>LT WTI Date</th>
            ${currentRole==='admin' ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${txs.length ? txs.map((t,i) => {
            const cap  = parseFloat(t.capacity||0);
            const load = parseFloat(t.max_load_mw||0);
            const pct  = cap&&load ? Math.round(load/cap*100) : null;
            return `
          <tr>
            <td><strong>${D(t.name)}</strong></td>
            <td class="num">${D(t.capacity)}</td>
            <td class="num">${t.max_load_mw!=null ? t.max_load_mw+' MW' : '—'}</td>
            <td>${pct!=null ? `<div style="display:flex;align-items:center;gap:6px">
              <div class="progress-bar" style="width:60px"><div class="progress-fill ${pct>80?'danger':pct>60?'warn':'ok'}" style="width:${pct}%"></div></div>
              <span style="font-size:.78rem;font-weight:700;color:${pct>80?'var(--red2)':pct>60?'var(--amber2)':'var(--green2)'}">${pct}%</span></div>` : '—'}</td>
            <td class="num">${t.impedance_pct!=null ? t.impedance_pct+'%' : D(t.impedance)}</td>
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
            ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.openEditTxLoadModal('${ss.id}',${i})"><i class="fas fa-edit"></i></button></td>` : ''}
          </tr>`;
          }).join('') :
          `<tr><td colspan="16" class="tbl-empty">No transformer loading data recorded.</td></tr>`}
        </tbody>
      </table></div>
    </div>
  </div>

  <!-- ══ 5. 11 kV FEEDER INFORMATION ══ -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff;display:flex;justify-content:space-between;align-items:center">
      <h3 style="color:#fff;font-size:.85rem">5. 11 KV FEEDER INFORMATION</h3>
      ${currentRole==='admin' ? `<button class="btn btn-xs btn-secondary" style="border-color:rgba(255,255,255,.4);color:#fff" onclick="window.openAddFeederModal('${ss.id}')"><i class="fas fa-plus"></i> Add Feeder</button>` : ''}
    </div>
    <div class="panel-body no-pad">
      <div class="tbl-wrap"><table class="tbl">
        <thead>
          <tr>
            <th>Sl.</th>
            <th>Transformer</th>
            <th>Capacity (MVA)</th>
            <th>11 kV Feeder Name</th>
            <th>Max Load (MW)</th>
            <th>Feeder Length (km)</th>
            <th>Panel Manufacturer</th>
            <th>Panel Mfg. Year</th>
            <th>Remarks</th>
            ${currentRole==='admin' ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${feeders.length ? (() => {
            let lastTx = null; let sl = 0;
            return feeders.map((f,i) => {
              const showTx = f.transformer !== lastTx;
              lastTx = f.transformer; sl++;
              return `
              <tr${showTx&&sl>1 ? ' style="border-top:2px solid var(--border2)"' : ''}>
                <td>${sl}</td>
                <td>${showTx ? `<strong>${D(f.transformer)}</strong>` : ''}</td>
                <td class="num">${showTx ? D(f.capacity || (txs.find(t=>t.name===f.transformer)||{}).capacity) : ''}</td>
                <td><strong>${D(f.name)}</strong></td>
                <td class="num">${f.max_load_mw!=null ? f.max_load_mw+' MW' : '—'}</td>
                <td class="num">${f.length_km!=null ? f.length_km+' km' : '—'}</td>
                <td>${D(f.panel)}</td>
                <td>${D(f.panel_year)}</td>
                <td style="font-size:.78rem;color:var(--text3)">${D(f.remarks)}</td>
                ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.openEditFeederModal('${ss.id}',${i})"><i class="fas fa-edit"></i></button></td>` : ''}
              </tr>`;
            }).join('');
          })() :
          `<tr><td colspan="10" class="tbl-empty">No 11 kV feeder data recorded.</td></tr>`}
        </tbody>
      </table></div>
    </div>
    <div style="padding:10px 16px;background:#fffbeb;border-top:1px solid var(--border);font-size:.78rem;color:#78350f">
      <i class="fas fa-paperclip"></i> &nbsp;<strong>Attach Maintenance Report (Signed Copy)</strong> — upload via Edit button.
    </div>
  </div>
  

  <div class="panel" style="margin-top:14px">
    <div class="panel-head">
      <h3><i class="fas fa-chart-line"></i> 5-Year Maximum Load (MW)</h3>
      <span style="font-size:.78rem;color:var(--text3)">FY 2019-20 &nbsp;→&nbsp; FY 2023-24</span>
    </div>
    <div class="panel-body">
      <div class="tbl-wrap"><table class="tbl ss-load-tbl">
        <thead><tr>
          <th>Fiscal Year</th>
          <th class="num">Max Load (MW)</th>
          <th>Notes</th>
        </tr></thead>
        <tbody>
          ${[ '2019-2020','2020-2021','2021-2022','2022-2023','2023-2024' ].map((yr,i,arr) => {
            const isLast = i === arr.length - 1;
            const val   = isLast ? (ss.max_demand_mw != null ? ss.max_demand_mw : '—') : '—';
            const notes = isLast ? 'Latest recorded' : 'Historical data not yet collected';
            return `<tr>
              <td><strong>${yr}</strong></td>
              <td class="num">${val !== '—' ? val + ' MW' : '<span style=\"color:var(--text4)\">—</span>'}</td>
              <td style="color:var(--text3);font-size:.82rem">${notes}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
  </div>

  `;
}

/* ══════════════════════════════════════════════════
   SECTION 12 — 33 kV SWITCHING SUBSTATIONS
══════════════════════════════════════════════════ */
function renderSwitchingSS() {
  const grids     = {};
  const zones     = {};
  SW_FEEDERS.forEach(f => {
    if (!grids[f.source_grid]) { grids[f.source_grid] = []; zones[f.source_grid] = f.zone; }
    grids[f.source_grid].push(f);
  });

  const existing   = SW_FEEDERS.filter(f=>f.type==='Existing').length;
  const proposed   = SW_FEEDERS.filter(f=>f.type==='Proposed').length;
  const totalLen   = SW_FEEDERS.reduce((s,f)=>s+(f.length_km||0),0);
  const gridCount  = Object.keys(grids).length;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>33 kV Switching Substations — Grid SS-wise NESCO Feeder List</h2>
      <p>${SW_FEEDERS.length} feeder connections from ${gridCount} grid substations · ${RING_LINES.length} ring lines</p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel" id="sw-zone-filter" onchange="window.filterSwSection()">
        <option value="">All Zones</option>
        <option value="Rajshahi">Rajshahi</option>
        <option value="Rangpur">Rangpur</option>
      </select>
      <select class="filter-sel" id="sw-type-filter" onchange="window.filterSwSection()">
        <option value="">All Types</option>
        <option value="Existing">Existing</option>
        <option value="Proposed">Proposed</option>
      </select>
      <input class="search-input" id="sw-search" placeholder="🔍 Search grid or SS…"
             oninput="window.filterSwSection()" style="max-width:200px">
      <button class="btn btn-sm btn-secondary" onclick="window.exportSwCSV()">
        <i class="fas fa-download"></i> CSV
      </button>
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy">
      <div class="kpi-val">${gridCount}</div>
      <div class="kpi-sub">Source Grid Substations</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${SW_FEEDERS.length}</div>
      <div class="kpi-sub">Total NESCO Feeders</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-val">${existing}</div>
      <div class="kpi-sub">Existing Lines</div>
    </div>
    <div class="kpi-card amber">
      <div class="kpi-val">${proposed}</div>
      <div class="kpi-sub">Proposed Lines</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${totalLen.toFixed(0)} km</div>
      <div class="kpi-sub">Total Line Length</div>
    </div>
  </div>

  <!-- ── SOURCE LINES: Grid SS-wise grouped table ── -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head">
      <h3><i class="fas fa-route"></i> Source Line — Grid SS to NESCO Substation</h3>
      <span id="sw-count" style="font-size:.82rem;color:var(--text3)">${SW_FEEDERS.length} connections</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl" id="sw-table">
      <thead>
        <tr>
          <th>Sr.</th>
          <th>Zone</th>
          <th>Source Grid Substation</th>
          <th>Target NESCO Substation</th>
          <th>Name of 33 kV Source Line</th>
          <th>Type</th>
          <th>Conductor</th>
          <th>Length (km)</th>
        </tr>
      </thead>
      <tbody id="sw-tbody">
        ${renderSwGroupedRows(SW_FEEDERS)}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- ── RING LINES ── -->
  <div class="panel">
    <div class="panel-head">
      <h3><i class="fas fa-sync-alt"></i> 33 kV Ring Line Connections</h3>
      <span class="badge badge-blue">${RING_LINES.length} ring lines &nbsp;·&nbsp; ${RING_LINES.filter(r=>r.type==='Existing').length} existing &nbsp;·&nbsp; ${RING_LINES.filter(r=>r.type==='Proposed').length} proposed</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sr.</th>
          <th>Zone</th>
          <th>Grid Substation</th>
          <th>Substation 1</th>
          <th>Substation 2</th>
          <th>Name of 33 kV Ring Line</th>
          <th>Type</th>
          <th>Conductor</th>
          <th>Length (km)</th>
        </tr>
      </thead>
      <tbody>
        ${renderRingRows(RING_LINES)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;

  window._swFiltered = SW_FEEDERS;
}

function renderSwGroupedRows(rows) {
  if (!rows.length) return `<tr><td colspan="9" class="tbl-empty">No records found.</td></tr>`;
  let lastGrid = null;
  let lastZone = null;
  return rows.map(f => {
    const newGrid = f.source_grid !== lastGrid;
    const newZone = f.zone && f.zone !== lastZone;
    if (newGrid) lastGrid = f.source_grid;
    if (newZone) lastZone = f.zone;
    const gridFeeders = rows.filter(r => r.source_grid === f.source_grid);
    const gridExist   = gridFeeders.filter(r => r.type === 'Existing').length;
    const gridProp    = gridFeeders.filter(r => r.type === 'Proposed').length;
    return `
    <tr${newGrid ? ' style="border-top:2px solid var(--border2)"' : ''}>
      <td>${D(f.sr)}</td>
      <td>${newZone
        ? `<span class="badge ${f.zone==='Rajshahi'?'badge-blue':'badge-green'}" style="white-space:nowrap">${f.zone}</span>`
        : ''}</td>
      <td>${newGrid
        ? `<div style="font-weight:700;font-size:.82rem;color:var(--navy)">${f.source_grid}</div>
           <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${gridFeeders.length} SS &nbsp;·&nbsp; ${gridExist} existing${gridProp?` · ${gridProp} proposed`:''}</div>`
        : ''}</td>
      <td><strong>${D(f.target_ss)}</strong></td>
      <td style="font-size:.82rem">${D(f.line_name)}</td>
      <td><span class="badge ${f.type==='Existing'?'badge-good':'badge-partial'}">${D(f.type)}</span></td>
      <td>${D(f.conductor)}</td>
      <td class="num">${f.length_km!=null ? f.length_km+' km' : '—'}</td>
    </tr>`;
  }).join('');
}

function renderRingRows(rows) {
  if (!rows.length) return `<tr><td colspan="9" class="tbl-empty">No records found.</td></tr>`;
  let lastGrid = null;
  return rows.map(r => {
    const newGrid = r.grid !== lastGrid;
    if (newGrid) lastGrid = r.grid;
    return `<tr${newGrid ? ' style="border-top:2px solid var(--border2)"' : ''}>
      <td>${D(r.sr)}</td>
      <td>${r.zone && newGrid
        ? `<span class="badge ${r.zone==='Rajshahi'?'badge-blue':'badge-green'}">${r.zone}</span>` : ''}</td>
      <td>${newGrid ? `<span style="font-weight:600;font-size:.82rem">${D(r.grid)}</span>` : ''}</td>
      <td><strong>${D(r.ss1)}</strong></td>
      <td><strong>${D(r.ss2)}</strong></td>
      <td style="font-size:.82rem">${D(r.line_name)}</td>
      <td><span class="badge ${r.type==='Existing'?'badge-good':'badge-partial'}">${D(r.type)}</span></td>
      <td>${D(r.conductor)}</td>
      <td class="num">${r.length_km!=null ? r.length_km+' km' : '—'}</td>
    </tr>`;
  }).join('');
}

window.filterSwSection = () => {
  const zone = document.getElementById('sw-zone-filter')?.value || '';
  const type = document.getElementById('sw-type-filter')?.value || '';
  const q    = (document.getElementById('sw-search')?.value || '').toLowerCase();

  const filtered = SW_FEEDERS.filter(f =>
    (!zone || f.zone === zone) &&
    (!type || f.type === type) &&
    (!q    || (f.source_grid||'').toLowerCase().includes(q) ||
               (f.target_ss||'').toLowerCase().includes(q)  ||
               (f.line_name||'').toLowerCase().includes(q))
  );

  document.getElementById('sw-tbody').innerHTML = renderSwGroupedRows(filtered);
  document.getElementById('sw-count').textContent = filtered.length + ' connections';
  window._swFiltered = filtered;
};

window.exportSwCSV = () => {
  const data = window._swFiltered || SW_FEEDERS;
  const rows = [['Sr','Zone','Source Grid','Target NESCO SS',
                  'Line Name','Type','Conductor','Length (km)']];
  data.forEach(f => rows.push([
    f.sr, f.zone, f.source_grid,
    f.target_ss, f.line_name, f.type, f.conductor, f.length_km||''
  ]));
  const csv = rows.map(r => r.map(v => v==null?'':v).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], {type:'text/csv'})),
    download: 'switching_ss_feeders.csv'
  });
  a.click();
  showToast('CSV exported!', 'success');
};

/* ══════════════════════════════════════════════════
   SECTION 13 — DISTRIBUTION TRANSFORMER
   (a) Substation-wise Summary
══════════════════════════════════════════════════ */
function renderDTSummary() {
  const validFeeders = FEEDER_SUMMARY.filter(f=>f.cap_mva<100);
  const total = FEEDER_SUMMARY.reduce((s,f)=>s+f.count,0);
  const totalMva = validFeeders.reduce((s,f)=>s+f.cap_mva,0);
  const totalLa   = validFeeders.reduce((s,f)=>s+f.la,0);
  const totalDofc = validFeeders.reduce((s,f)=>s+f.dofc,0);
  const totalGnd  = validFeeders.reduce((s,f)=>s+f.gnd,0);

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — Substation-wise Summary</h2>
      <p>Click a substation name to view individual transformer load data</p>
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${total}</div><div class="kpi-sub">Total DTs (Talaimary)</div></div>
    <div class="kpi-card"><div class="kpi-val">${totalMva.toFixed(1)}</div><div class="kpi-sub">Total Capacity (MVA)</div></div>
    <div class="kpi-card red"><div class="kpi-val">${totalLa}</div><div class="kpi-sub">LA Present</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${totalDofc}</div><div class="kpi-sub">DOFC Present</div></div>
    <div class="kpi-card green"><div class="kpi-val">${totalGnd}</div><div class="kpi-sub">Grounding Present</div></div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Substation-wise Distribution Transformer Summary</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation</th>
          <th>Feeder</th>
          <th>100 kVA</th>
          <th>200 kVA</th>
          <th>250 kVA</th>
          <th>Other kVA</th>
          <th>Total DTs</th>
          <th>Total Capacity (MVA)</th>
          <th>LA Present</th>
          <th>LA Absent</th>
          <th>DOFC Present</th>
          <th>DOFC Absent</th>
          <th>Grounding Present</th>
          <th>Grounding Absent</th>
          <th>LA % Coverage</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${FEEDER_SUMMARY.map((f,i) => {
          const laPct = f.count ? Math.round(f.la/f.count*100) : 0;
          const other = f.count - f.kva100 - f.kva200 - f.kva250;
          const capDisp = f.cap_mva < 100 ? f.cap_mva.toFixed(2) : '(special)';
          return `<tr>
            <td>${i+1}</td>
            <td>
              <a href="#" onclick="window.showSection('dt-load','talaimary');return false;" style="font-weight:600;color:var(--blue)">
                Talaimary 33/11 kV
              </a>
            </td>
            <td><strong>${f.name}</strong></td>
            <td class="num">${f.kva100}</td>
            <td class="num">${f.kva200}</td>
            <td class="num">${f.kva250}</td>
            <td class="num">${other>0?other:0}</td>
            <td class="num"><strong>${f.count}</strong></td>
            <td class="num">${capDisp}</td>
            <td class="num">${f.la}</td>
            <td class="num">${f.la_absent}</td>
            <td class="num">${f.dofc}</td>
            <td class="num">${f.dofc_absent}</td>
            <td class="num">${f.gnd}</td>
            <td class="num">${f.gnd_absent}</td>
            <td><span class="badge ${laPct>=50?'badge-yes':'badge-no'}">${laPct}%</span></td>
            <td>
              <button class="btn btn-xs btn-secondary" onclick="window.showSection('dt-equipment')">
                <i class="fas fa-list"></i> Details
              </button>
            </td>
          </tr>`;
        }).join('')}
        <tr style="background:#f0f5fb;font-weight:700">
          <td colspan="3">TOTAL</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva100,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva200,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.kva250,0)}</td>
          <td class="num">—</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.count,0)}</td>
          <td class="num">${totalMva.toFixed(2)} MVA</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.la,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.la_absent,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.dofc,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.dofc_absent,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.gnd,0)}</td>
          <td class="num">${FEEDER_SUMMARY.reduce((s,f)=>s+f.gnd_absent,0)}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

/* ══════════════════════════════════════════════════
   SECTION 14 — DT LOAD  (b)
══════════════════════════════════════════════════ */
function renderDTLoad(selectedSS) {
  // Step 1: show substation selector if nothing selected
  if (!selectedSS) {
    document.getElementById('content').innerHTML = `
    <div class="sec-head">
      <div class="sec-head-left"><h2>Distribution Transformer — Load Data</h2></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-search"></i> Select Substation</h3></div>
      <div class="panel-body">
        <p style="color:var(--text3);margin-bottom:16px">Please select a substation to view its distribution transformer load data.</p>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <select class="filter-sel" id="ss-picker" style="min-width:280px;padding:10px 12px;font-size:.95rem">
            <option value="">— Select Substation —</option>
            ${ALL_SUBSTATIONS.map(ss=>`<option value="${ss.id}">${ss.name||ss.sheet_name}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="window.goDTLoad()"><i class="fas fa-arrow-right"></i> View Data</button>
        </div>
      </div>
    </div>
    `;
    return;
  }

  // Step 2: show load table for selected substation
  const ss = ALL_SUBSTATIONS.find(s=>s.id===selectedSS) || TALAIMARY_SS;
  const loadRows = DT_LOAD_DATA.filter(r=>r.substation_id===selectedSS);

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>DT Load Data — ${ss?.name||'Substation'}</h2>
      <p>Per-phase current measurement for distribution transformers</p>
    </div>
    <div class="sec-head-right">
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddDTLoadModal('${selectedSS}')"><i class="fas fa-plus"></i> Add Record</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('dt-load')"><i class="fas fa-arrow-left"></i> Change SS</button>
      <button class="btn btn-sm btn-secondary" onclick="window.exportDTLoadCSV('${selectedSS}')"><i class="fas fa-download"></i> Export CSV</button>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>Transformer Load Records</h3>
      <input class="search-input" id="dtload-search" placeholder="🔍 Search GIS ID or name…" oninput="window.filterDTLoad('${selectedSS}')" style="max-width:240px">
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl" id="dtload-table">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Transformer GIS ID</th>
          <th>Location</th>
          <th>Name</th>
          <th>TX Capacity (kVA)</th>
          <th>Per Phase Rated Current (A)</th>
          <th>Phase A Current (A)</th>
          <th>Phase B Current (A)</th>
          <th>Phase C Current (A)</th>
          <th>Neutral Current (A)</th>
          <th>Date of Measurement</th>
          ${currentRole==='admin' ? '<th>Action</th>' : ''}
        </tr>
      </thead>
      <tbody id="dtload-tbody">
        ${loadRows.length ? loadRows.map((r,i)=>`
        <tr>
          <td>${i+1}</td>
          <td style="font-family:'Courier New',monospace;font-size:.8rem">${D(r.gis_id)}</td>
          <td>${D(r.location)}</td>
          <td><strong>${D(r.name)}</strong></td>
          <td class="num">${D(r.capacity_kva)}</td>
          <td class="num">${D(r.rated_current)}</td>
          <td class="num">${D(r.phase_a)}</td>
          <td class="num">${D(r.phase_b)}</td>
          <td class="num">${D(r.phase_c)}</td>
          <td class="num">${D(r.neutral)}</td>
          <td>${D(r.date)}</td>
          ${currentRole==='admin' ? `<td>
            <button class="btn btn-xs btn-secondary" onclick="window.openEditDTLoadModal(${i},'${selectedSS}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs btn-danger" onclick="window.deleteDTLoad(${i},'${selectedSS}')" style="margin-left:3px"><i class="fas fa-trash"></i></button>
          </td>` : ''}
        </tr>`).join('') :
        `<tr><td colspan="12" class="tbl-empty">
          No load records for this substation yet.
          ${currentRole==='admin' ? ' Click <strong>Add Record</strong> to enter data.' : ''}
        </td></tr>`}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

window.goDTLoad = () => {
  const val = document.getElementById('ss-picker')?.value;
  if (!val) { showToast('Please select a substation first','warn'); return; }
  showSection('dt-load', val);
};

window.filterDTLoad = (ssId) => {
  const q = (document.getElementById('dtload-search')?.value||'').toLowerCase();
  const filtered = DT_LOAD_DATA.filter(r =>
    r.substation_id===ssId &&
    (!q || (r.gis_id||'').toLowerCase().includes(q) || (r.name||'').toLowerCase().includes(q))
  );
  const tbody = document.getElementById('dtload-tbody');
  if (!tbody) return;
  tbody.innerHTML = filtered.length ? filtered.map((r,i)=>`
  <tr>
    <td>${i+1}</td>
    <td style="font-family:'Courier New',monospace;font-size:.8rem">${D(r.gis_id)}</td>
    <td>${D(r.location)}</td>
    <td><strong>${D(r.name)}</strong></td>
    <td class="num">${D(r.capacity_kva)}</td>
    <td class="num">${D(r.rated_current)}</td>
    <td class="num">${D(r.phase_a)}</td>
    <td class="num">${D(r.phase_b)}</td>
    <td class="num">${D(r.phase_c)}</td>
    <td class="num">${D(r.neutral)}</td>
    <td>${D(r.date)}</td>
    ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.openEditDTLoadModal(${i},'${ssId}')"><i class="fas fa-edit"></i></button></td>` : ''}
  </tr>`).join('') :
  `<tr><td colspan="12" class="tbl-empty">No records match.</td></tr>`;
};

window.exportDTLoadCSV = (ssId) => {
  const rows = [['GIS ID','Location','Name','Capacity (kVA)','Rated Current (A)','Phase A','Phase B','Phase C','Neutral','Date']];
  DT_LOAD_DATA.filter(r=>r.substation_id===ssId).forEach(r =>
    rows.push([r.gis_id,r.location,r.name,r.capacity_kva,r.rated_current,r.phase_a,r.phase_b,r.phase_c,r.neutral,r.date])
  );
  const a = Object.assign(document.createElement('a'),{
    href: URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})),
    download: `dt_load_${ssId}.csv`
  });
  a.click(); showToast('Exported!','success');
};

/* OVERALL_SUMMARY + DT_GRAND_TOTAL are populated from distribution-transformers.json
   via loadDTData() (see SECTION 3b further below). */
let OVERALL_SUMMARY = [];
let DT_GRAND_TOTAL = {
  total: 0,
  la_yes: 0, la_no: 0, la_good: 0, la_bad: 0,
  dofc_yes: 0, dofc_no: 0, dofc_good: 0, dofc_bad: 0,
  mccb_yes: 0, mccb_no: 0, mccb_good: 0, mccb_bad: 0,
  gnd_yes: 0, gnd_no: 0, gnd_req: 0,
  lt_copper: 0, lt_aluminium: 0,
  kpi_la: 0, kpi_dofc: 0, kpi_mccb: 0,
};

const SW_FEEDERS = [
  {sr:1,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Talaimari',line_name:'Katakhali Grid To Talaimari SS',type:'Existing',conductor:'Grosbeak',length_km:6.08},
  {sr:2,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Horogram',line_name:'Katakhali Grid To Horogram SS',type:'Existing',conductor:'Grosbeak',length_km:18.37},
  {sr:3,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Shalbagan',line_name:'Katakhali Grid To Shalbagan SS',type:'Existing',conductor:'Grosbeak',length_km:10.17},
  {sr:4,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'City Central',line_name:'Katakhali Grid To City Central SS',type:'Existing',conductor:'Grosbeak',length_km:12.58},
  {sr:5,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Bindur More',line_name:'Katakhali Grid To Bindur More SS',type:'Existing',conductor:'Grosbeak',length_km:10.59},
  {sr:6,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Katakhali',line_name:'Katakhali Grid To Katakhali SS',type:'Existing',conductor:'Grosbeak',length_km:0.1},
  {sr:7,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Meherchandi',line_name:'Katakhali Grid To Meherchandi SS',type:'Existing',conductor:'Grosbeak',length_km:6.57},
  {sr:8,zone:'Rajshahi',source_grid:'Katakhali 132/33 KV Sustation',nesco_sw:null,target_ss:'Bimanbandar',line_name:'Katakhali Grid To Bimanbandar SS',type:'Existing',conductor:'Grosbeak',length_km:17.32},
  {sr:9,zone:'Rajshahi',source_grid:'Bimanbandar 33/11 kV SS',nesco_sw:null,target_ss:'Tanore',line_name:'Bimanbandar SS To Tanore SS',type:'Existing',conductor:'Merlin',length_km:19.97},
  {sr:10,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'Chandipur',line_name:'Miapur Grid To Chandipur SS',type:'Proposed',conductor:'Grosbeak',length_km:9.0},
  {sr:11,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'Horogram',line_name:'Miapur Grid To Horogram SS (OH)',type:'Existing',conductor:'Grosbeak',length_km:4.44},
  {sr:12,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'Horogram',line_name:'Miapur Grid To Horogram SS (UG)',type:'Existing',conductor:'Grosbeak',length_km:null},
  {sr:13,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'Shalbagan',line_name:'Miapur Grid To Shalbagan SS',type:'Existing',conductor:'Grosbeak',length_km:10.0},
  {sr:14,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'City Central',line_name:'Miapur Grid To City Central SS',type:'Existing',conductor:'Grosbeak',length_km:9.0},
  {sr:15,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'Bindur More',line_name:'Miapur Grid To Bindur More SS',type:'Existing',conductor:'Grosbeak',length_km:10.6},
  {sr:16,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'Kashiadanga',line_name:'Miapur Grid To Kashiadanga SS',type:'Existing',conductor:'Grosbeak',length_km:null},
  {sr:17,zone:'Rajshahi',source_grid:'Miapur 230/132/33 KV Sustation',nesco_sw:null,target_ss:'City Hut',line_name:'Miapur Grid To City Hut SS',type:'Existing',conductor:'Grosbeak',length_km:4.61},
  {sr:18,zone:'Rajshahi',source_grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation',nesco_sw:null,target_ss:'Huzrapur',line_name:'Chapainawabgonj Grid To Huzrapur SS',type:'Existing',conductor:'Grosbeak',length_km:5.0},
  {sr:19,zone:'Rajshahi',source_grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation',nesco_sw:null,target_ss:'Noyagola',line_name:'Chapainawabgonj Grid To Noyagola SS',type:'Existing',conductor:'Grosbeak',length_km:8.0},
  {sr:20,zone:'Rajshahi',source_grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation',nesco_sw:null,target_ss:'Bottolahat',line_name:'Chapainawabgonj Grid To Bottolahat SS',type:'Existing',conductor:'Grosbeak',length_km:4.0},
  {sr:21,zone:'Rajshahi',source_grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation',nesco_sw:null,target_ss:'Godagari',line_name:'Chapainawabgonj Grid To Godagari SS',type:'Existing',conductor:'Grosbeak',length_km:27.0},
  {sr:22,zone:'Rajshahi',source_grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation',nesco_sw:null,target_ss:'Rohonpur',line_name:'Chapainawabgonj Grid To Rohonpur SS',type:'Existing',conductor:'Grosbeak',length_km:37.0},
  {sr:23,zone:'Rajshahi',source_grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation',nesco_sw:null,target_ss:'Shibganj',line_name:'Chapainawabgonj Grid To Shibganj SS',type:'Existing',conductor:'Merlin',length_km:28.0},
  {sr:24,zone:'Rajshahi',source_grid:'Amnura 132/33 KV Sustation',nesco_sw:null,target_ss:'Noyagola',line_name:'Amnura Grid To Noyagola SS',type:'Existing',conductor:'Grosbeak',length_km:32.0},
  {sr:25,zone:'Rajshahi',source_grid:'Amnura 132/33 KV Sustation',nesco_sw:null,target_ss:'Rohonpur',line_name:'Amnura Grid To Rohonpur SS',type:'Existing',conductor:'Grosbeak',length_km:null},
  {sr:26,zone:'Rajshahi',source_grid:'Amnura 132/33 KV Sustation',nesco_sw:null,target_ss:'Nachol',line_name:'Amnura Grid To Nachol SS',type:'Existing',conductor:'Merlin',length_km:16.0},
  {sr:27,zone:'Rajshahi',source_grid:'Chowdala 132/33 KV Sustation',nesco_sw:null,target_ss:'Rohonpur',line_name:'Chowdala Grid To Rohonpur SS',type:'Existing',conductor:'Grosbeak',length_km:8.0},
  {sr:28,zone:'Rajshahi',source_grid:'Chowdala 132/33 KV Sustation',nesco_sw:null,target_ss:'Shibganj (Chapai)',line_name:'Chowdala Grid To Shibganj (Chapai) SS',type:'Proposed',conductor:'Grosbeak',length_km:25.0},
  {sr:29,zone:'Rajshahi',source_grid:'Natore 132/33 KV Sustation',nesco_sw:null,target_ss:'Alaipur',line_name:'Natore Grid To Alaipur SS',type:'Existing',conductor:'Merlin',length_km:7.0},
  {sr:30,zone:'Rajshahi',source_grid:'Natore 132/33 KV Sustation',nesco_sw:null,target_ss:'Harishpur',line_name:'Natore Grid To Harishpur SS',type:'Existing',conductor:'Grosbeak',length_km:0.05},
  {sr:31,zone:'Rajshahi',source_grid:'Pabna 132/33 KV Sustation',nesco_sw:null,target_ss:'Poilanpur',line_name:'Pabna Grid To Poilanpur SS',type:'Existing',conductor:'Grosbeak',length_km:4.5},
  {sr:32,zone:'Rajshahi',source_grid:'Pabna 132/33 KV Sustation',nesco_sw:null,target_ss:'Loskorpur',line_name:'Pabna Grid To Loskorpur SS',type:'Existing',conductor:'Grosbeak',length_km:7.0},
  {sr:33,zone:'Rajshahi',source_grid:'Pabna 132/33 KV Sustation',nesco_sw:null,target_ss:'Chatiani',line_name:'Pabna Grid To Chatiani SS',type:'Existing',conductor:'Grosbeak',length_km:7.5},
  {sr:34,zone:'Rajshahi',source_grid:'Pabna 132/33 KV Sustation',nesco_sw:null,target_ss:'Kodomtola',line_name:'Pabna Grid To Kodomtola SS',type:'Proposed',conductor:'Grosbeak',length_km:8.0},
  {sr:35,zone:'Rajshahi',source_grid:'Pabna 132/33 KV Sustation',nesco_sw:null,target_ss:'Nurpur',line_name:'Pabna Grid To Nurpur SS',type:'Existing',conductor:'Grosbeak',length_km:0.15},
  {sr:36,zone:'Rajshahi',source_grid:'Joynogor 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Joynagar',line_name:'Joynogor Grid To Joynagar SS',type:'Existing',conductor:'Grosbeak',length_km:0.09},
  {sr:37,zone:'Rajshahi',source_grid:'Joynogor 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Patilakhali',line_name:'Joynogor Grid To Patilakhali SS',type:'Existing',conductor:'Grosbeak',length_km:5.5},
  {sr:38,zone:'Rajshahi',source_grid:'Joynogor 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'School Para',line_name:'Joynogor Grid To School Para SS',type:'Existing',conductor:'Grosbeak',length_km:13.0},
  {sr:39,zone:'Rajshahi',source_grid:'Joynogor 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Rooppur & Green city',line_name:'Joynogor Grid To Green city SS Ckt 01',type:'Existing',conductor:'Grosbeak',length_km:2.98},
  {sr:40,zone:'Rajshahi',source_grid:'Joynogor 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Rooppur & Green city',line_name:'Joynogor Grid To Green city SS Ckt 02',type:'Existing',conductor:'Grosbeak',length_km:3.07},
  {sr:41,zone:'Rajshahi',source_grid:'Sirajganj  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Bahirgola',line_name:'Sirajganj Grid To Bahirgola SS',type:'Existing',conductor:'Grosbeak',length_km:6.05},
  {sr:42,zone:'Rajshahi',source_grid:'Sirajganj  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Raypur',line_name:'Sirajganj Grid To Raypur SS',type:'Existing',conductor:'Grosbeak',length_km:4.5},
  {sr:43,zone:'Rajshahi',source_grid:'Sirajganj  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Puthiabari',line_name:'Sirajganj Grid To Puthiabari SS',type:'Existing',conductor:'Grosbeak',length_km:8.4},
  {sr:44,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Rahman Nagar',line_name:'Puran Bogura Grid To Rahman Nagar SS',type:'Existing',conductor:'Grosbeak',length_km:7.18},
  {sr:45,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Banani',line_name:'Puran Bogura Grid To Banani SS',type:'Existing',conductor:'Grosbeak',length_km:7.5},
  {sr:46,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Bogura SDD-1 Campus',line_name:'Puran Bogura Grid To Bogura SDD-1 Campus SS',type:'Proposed',conductor:'Grosbeak',length_km:2.9},
  {sr:47,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Shibbati',line_name:'Puran Bogura Grid To Shibbati SS',type:'Existing',conductor:'Grosbeak',length_km:10.33},
  {sr:48,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Puran Bogura',line_name:'Puran BoguraGrid To Puran Bogura SS',type:'Existing',conductor:'Grosbeak',length_km:0.5},
  {sr:49,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Matidali',line_name:'Puran Bogura Grid To Matidali SS',type:'Existing',conductor:'Grosbeak',length_km:12.0},
  {sr:50,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Godar Para',line_name:'Puran Bogura Grid To Godar Para SS',type:'Existing',conductor:'Grosbeak',length_km:4.95},
  {sr:51,zone:'Rajshahi',source_grid:'Puran Bogura 132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Dupchanchia (Regular)',line_name:'Puran Bogura Grid To Dupchanchia (Regular) SS',type:'Existing',conductor:'Grosbeak',length_km:28.0},
  {sr:52,zone:'Rajshahi',source_grid:'Mahasthangarh  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Shibganj (Bogura)',line_name:'Mahasthangarh Grid To Shibganj (Bogura) SS',type:'Existing',conductor:'Grosbeak',length_km:1.6},
  {sr:53,zone:'Rajshahi',source_grid:'Sherpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Hazipur',line_name:'Sherpur Grid To Hazipur SS',type:'Existing',conductor:'Grosbeak',length_km:7.0},
  {sr:54,zone:'Rajshahi',source_grid:'Sherpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Mirzapur',line_name:'Sherpur Grid To Mirzapur SS',type:'Existing',conductor:'Grosbeak',length_km:0.1},
  {sr:55,zone:'Rajshahi',source_grid:'Sabgram  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Shibbati',line_name:'Sabgram Grid To Shibbati SS',type:'Proposed',conductor:'Grosbeak',length_km:8.0},
  {sr:56,zone:'Rajshahi',source_grid:'Sabgram  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Matidali',line_name:'Sabgram Grid To Matidali SS',type:'Proposed',conductor:'Grosbeak',length_km:10.0},
  {sr:57,zone:'Rajshahi',source_grid:'Sabgram  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Banani',line_name:'Sabgram Grid To Banani SS',type:'Proposed',conductor:'Grosbeak',length_km:7.0},
  {sr:58,zone:'Rajshahi',source_grid:'Naogaon  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Kathaltali',line_name:'Naogaon Grid To Kathaltali SS',type:'Existing',conductor:'Grosbeak',length_km:0.1},
  {sr:59,zone:'Rajshahi',source_grid:'Naogaon  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Arji Naogaon',line_name:'Naogaon Grid To Arji Naogaon SS',type:'Existing',conductor:'Grosbeak',length_km:8.0},
  {sr:60,zone:'Rajshahi',source_grid:'Naogaon  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Baludanga',line_name:'Naogaon Grid To Baludanga SS',type:'Existing',conductor:'Merlin',length_km:12.0},
  {sr:61,zone:'Rajshahi',source_grid:'Naogaon  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Santahar',line_name:'Naogaon Grid To Santahar SS',type:'Existing',conductor:'Grosbeak',length_km:3.2},
  {sr:62,zone:'Rajshahi',source_grid:'Naogaon  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Tilokpur',line_name:'Naogaon Grid To Tilokpur SS',type:'Existing',conductor:'Grosbeak',length_km:null},
  {sr:63,zone:'Rajshahi',source_grid:'Naogaon  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Adamdighi',line_name:'Naogaon Grid To Adamdighi SS',type:'Existing',conductor:'Grosbeak',length_km:12.9},
  {sr:64,zone:'Rajshahi',source_grid:'Joypurhat  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Khonjonpur',line_name:'Joypurhat Grid To Khonjonpur SS',type:'Existing',conductor:'Grosbeak',length_km:0.3},
  {sr:65,zone:'Rajshahi',source_grid:'Joypurhat  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Natun Hut',line_name:'Joypurhat Grid To Natun Hut SS',type:'Existing',conductor:'Grosbeak',length_km:7.0},
  {sr:66,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Lalbag',line_name:'Rangpur Grid To Lalbag SS',type:'Existing',conductor:'Grosbeak',length_km:0.5},
  {sr:67,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'SDD-1 Campus (Shapla)',line_name:'Rangpur Grid To SDD-1 Campus (Shapla) SS',type:'Proposed',conductor:'Grosbeak',length_km:1.9},
  {sr:68,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Katkipara',line_name:'Rangpur Grid To Katkipara SS',type:'Existing',conductor:'Grosbeak',length_km:6.0},
  {sr:69,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Katkipara',line_name:'Rangpur Grid To Katkipara SS',type:'Existing',conductor:null,length_km:8.0},
  {sr:70,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Mahiganj',line_name:'Rangpur Grid To Mahiganj SS',type:'Existing',conductor:'Grosbeak',length_km:6.0},
  {sr:71,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Burirhut',line_name:'Rangpur Grid To Burirhut SS',type:'Existing',conductor:'Grosbeak',length_km:12.0},
  {sr:72,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Burirhut',line_name:'Rangpur Grid To Burirhut SS',type:'Existing',conductor:'Grosbeak',length_km:12.0},
  {sr:73,zone:'Rangpur',source_grid:'Rangpur  230/132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Baharkasna',line_name:'Rangpur Grid To Baharkasna SS',type:'Proposed',conductor:'Grosbeak',length_km:11.6},
  {sr:74,zone:'Rangpur',source_grid:'Palashbari  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Masterpara',line_name:'Palashbari Grid To Masterpara SS',type:'Existing',conductor:'Grosbeak',length_km:25.0},
  {sr:75,zone:'Rangpur',source_grid:'Palashbari  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Dhangora',line_name:'Palashbari Grid To Dhangora SS',type:'Existing',conductor:'Grosbeak',length_km:18.0},
  {sr:76,zone:'Rangpur',source_grid:'Palashbari  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Gobindaganj',line_name:'Palashbari Grid To Gobindaganj SS',type:'Existing',conductor:'Grosbeak',length_km:22.0},
  {sr:77,zone:'Rangpur',source_grid:'Palashbari  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Palashbari',line_name:'Palashbari Grid To Palashbari SS',type:'Existing',conductor:'Grosbeak',length_km:0.5},
  {sr:78,zone:'Rangpur',source_grid:'Gaibandha  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Masterpara',line_name:'Gaibandha Grid To Masterpara SS',type:'Existing',conductor:'Grosbeak',length_km:5.5},
  {sr:79,zone:'Rangpur',source_grid:'Gaibandha  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Dhangora',line_name:'Gaibandha Grid To Dhangora SS',type:'Existing',conductor:'Grosbeak',length_km:0.6},
  {sr:80,zone:'Rangpur',source_grid:'Lalmonirhat  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Lalmonirhat',line_name:'Lalmonirhat Grid To Lalmonirhat SS',type:'Existing',conductor:'Grosbeak',length_km:0.2},
  {sr:81,zone:'Rangpur',source_grid:'Lalmonirhat  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Kaliganj',line_name:'Lalmonirhat Grid To Kaliganj SS',type:'Existing',conductor:'Grosbeak',length_km:35.0},
  {sr:82,zone:'Rangpur',source_grid:'Saidpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Golahut',line_name:'Saidpur Grid To Golahut SS',type:'Existing',conductor:'Grosbeak',length_km:0.01},
  {sr:83,zone:'Rangpur',source_grid:'Saidpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Niyamatpur, Saidpur',line_name:'Saidpur Grid To Niyamatpur, Saidpur SS',type:'Existing',conductor:'Grosbeak',length_km:7.0},
  {sr:84,zone:'Rangpur',source_grid:'Saidpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Kukhapara',line_name:'Saidpur Grid To Kukhapara SS',type:'Existing',conductor:'Grosbeak',length_km:19.0},
  {sr:85,zone:'Rangpur',source_grid:'Saidpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Sobujpara',line_name:'Saidpur Grid To Sobujpara SS',type:'Existing',conductor:'Grosbeak',length_km:21.0},
  {sr:86,zone:'Rangpur',source_grid:'Saidpur  132/33 KV Sustation',nesco_sw:'NESCO (AIS)',target_ss:'Parbatipur',line_name:'Saidpur Grid To Parbatipur SS',type:'Existing',conductor:'Grosbeak',length_km:null},
  {sr:87,zone:'Rangpur',source_grid:'Jaldhaka  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Kishorganj',line_name:'Jaldhaka Grid To Kishorganj SS',type:'Existing',conductor:'Grosbeak',length_km:27.0},
  {sr:88,zone:'Rangpur',source_grid:'Jaldhaka  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Jaldhaka',line_name:'Jaldhaka Grid To Jaldhaka SS',type:'Existing',conductor:'Grosbeak',length_km:5.0},
  {sr:89,zone:'Rangpur',source_grid:'Jaldhaka  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Patgram',line_name:'Jaldhaka Grid To Patgram SS',type:'Existing',conductor:'Grosbeak',length_km:50.0},
  {sr:90,zone:'Rangpur',source_grid:'Jaldhaka  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Domar',line_name:'Jaldhaka Grid To Domar SS',type:'Existing',conductor:'Grosbeak',length_km:20.0},
  {sr:91,zone:'Rangpur',source_grid:'Jaldhaka  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Bamunia',line_name:'Jaldhaka Grid To Bamunia SS',type:'Existing',conductor:'Grosbeak',length_km:22.0},
  {sr:92,zone:'Rangpur',source_grid:'Jaldhaka  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Barakhata',line_name:'Jaldhaka Grid To Barakhata SS',type:'Existing',conductor:null,length_km:28.0},
  {sr:93,zone:'Rangpur',source_grid:'Thakurgaon  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Goyalpara',line_name:'Thakurgaon Grid To Goyalpara SS',type:'Existing',conductor:'Merlin',length_km:12.0},
  {sr:94,zone:'Rangpur',source_grid:'Thakurgaon  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'DPS',line_name:'Thakurgaon Grid To DPS SS',type:'Existing',conductor:'Grosbeak',length_km:0.5},
  {sr:95,zone:'Rangpur',source_grid:'Purbasadipur  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Fakirpara',line_name:'Purbasadipur Grid To Fakirpara SS Ckt 01',type:'Existing',conductor:'Grosbeak',length_km:16.0},
  {sr:96,zone:'Rangpur',source_grid:'Purbasadipur  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Fakirpara',line_name:'Purbasadipur Grid To Fakirpara SS Ckt 02',type:'Existing',conductor:'Grosbeak',length_km:18.0},
  {sr:97,zone:'Rangpur',source_grid:'Purbasadipur  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Balubari',line_name:'Purbasadipur Grid To Balubari SS',type:'Existing',conductor:'Grosbeak',length_km:18.0},
  {sr:98,zone:'Rangpur',source_grid:'Purbasadipur  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Uposhohor',line_name:'Purbasadipur Grid To Uposhohor SS',type:'Existing',conductor:'Grosbeak',length_km:19.3},
  {sr:99,zone:'Rangpur',source_grid:'Purbasadipur  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Setabganj',line_name:'Purbasadipur Grid To Setabganj SS Ckt 01',type:'Existing',conductor:'Grosbeak',length_km:29.0},
  {sr:100,zone:'Rangpur',source_grid:'Purbasadipur  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Setabganj',line_name:'Purbasadipur Grid To Setabganj SS Ckt02',type:'Existing',conductor:null,length_km:30.0},
  {sr:101,zone:'Rangpur',source_grid:'Dinajpur 132/33 kV Grid Substation',nesco_sw:'PBS (AIS)',target_ss:'Fakirpara',line_name:'Dinajpur Grid To Fakirpara SS',type:'Existing',conductor:'Grosbeak',length_km:10.0},
  {sr:102,zone:'Rangpur',source_grid:'Dinajpur 132/33 kV Grid Substation',nesco_sw:'PBS (AIS)',target_ss:'Balubari',line_name:'Dinajpur Grid To Balubari SS',type:'Existing',conductor:'Grosbeak',length_km:4.2},
  {sr:103,zone:'Rangpur',source_grid:'Dinajpur 132/33 kV Grid Substation',nesco_sw:'PBS (AIS)',target_ss:'Uposhohor',line_name:'Dinajpur Grid To Uposhohor SS',type:'Existing',conductor:'Grosbeak',length_km:3.8},
  {sr:null,zone:'Rangpur',source_grid:'Pirganj 132/33 kV Substation',nesco_sw:'PBS (AIS)',target_ss:'Setabganj',line_name:null,type:'Existing',conductor:'Grosbeak (needs confirmation)',length_km:15.0},
  {sr:104,zone:'Rangpur',source_grid:'Kurigram  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Kurigram',line_name:'Kurigram Grid To Kurigram SS',type:'Existing',conductor:'Grosbeak',length_km:5.0},
  {sr:105,zone:'Rangpur',source_grid:'Kurigram  132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Kurigram',line_name:'Kurigram Grid To Kurigram SS',type:'Existing',conductor:'Grosbeak',length_km:6.0},
  {sr:106,zone:'Rangpur',source_grid:'Barapukuria  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Fulbari',line_name:'Barapukuria Grid To Fulbari SS Ckt 01',type:'Existing',conductor:'Merlin',length_km:10.14},
  {sr:null,zone:'Rangpur',source_grid:'Barapukuria  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Fulbari',line_name:'Barapukuria Grid To Fulbari SS Ckt 02',type:'Existing',conductor:'Grosbeak',length_km:11.71},
  {sr:107,zone:'Rangpur',source_grid:'Barapukuria  230/132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Parbatipur',line_name:'Barapukuria Grid To Parbatipur SS',type:'Existing',conductor:'Grosbeak',length_km:16.0},
  {sr:108,zone:'Rangpur',source_grid:'Panchagarh  132/33 kV  Substation',nesco_sw:'PBS (AIS)',target_ss:'Panchagarh',line_name:'Panchagarh Grid To Panchagarh SS',type:'Existing',conductor:'Grosbeak',length_km:1.5},
  {sr:109,zone:'Rangpur',source_grid:'Panchagarh  132/33 kV  Substation',nesco_sw:'PBS (AIS)',target_ss:'Bhajanpur',line_name:'Panchagarh Grid To Bhajanpur SS',type:'Existing',conductor:'Grosbeak',length_km:null},
  {sr:110,zone:'Rangpur',source_grid:'Panchagarh  132/33 kV  Substation',nesco_sw:'PBS (AIS)',target_ss:'Tetulia',line_name:'Panchagarh Grid To Tetulia SS',type:'Existing',conductor:'Merlin',length_km:35.0},
  {sr:111,zone:'Rangpur',source_grid:'Hatibandha 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Hatibandha',line_name:'Hatibandha Grid To Hatibandha SS',type:'Proposed',conductor:'Grosbeak',length_km:12.0},
  {sr:112,zone:'Rangpur',source_grid:'Hatibandha 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Barakhata',line_name:'Hatibandha Grid To Barakhata SS',type:'Proposed',conductor:'Grosbeak',length_km:3.0},
  {sr:113,zone:'Rangpur',source_grid:'Hatibandha 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Patgram',line_name:'Hatibandha Grid To Patgram SS',type:'Proposed',conductor:'Grosbeak',length_km:24.0},
  {sr:114,zone:'Rangpur',source_grid:'Hatibandha 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Burimari',line_name:'Hatibandha Grid To Burimari SS',type:'Proposed',conductor:'Grosbeak',length_km:30.0},
  {sr:115,zone:'Rangpur',source_grid:'Domar 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Domar',line_name:'Domar Grid To Domar SS',type:'Proposed',conductor:'Grosbeak',length_km:6.0},
  {sr:116,zone:'Rangpur',source_grid:'Domar 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Bamunia',line_name:'Domar Grid To Bamunia SS',type:'Proposed',conductor:'Grosbeak',length_km:15.0},
  {sr:117,zone:'Rangpur',source_grid:'Domar 132/33 KV Sustation',nesco_sw:'PBS (AIS)',target_ss:'Kukhapara',line_name:'Domar Grid To Kukhapara SS',type:'Proposed',conductor:'Grosbeak',length_km:25.0}
];

const RING_LINES = [
  {sr:1,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Talaimari',ss2:'City Central',line_name:'Talaimari To City Central 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:4.35},
  {sr:2,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Talaimari',ss2:'Meherchandi',line_name:'Talaimari To Meherchandi 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:2.92},
  {sr:3,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Horogram',ss2:'City Central',line_name:'Horogram To City Central 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:4.95},
  {sr:4,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Horogram',ss2:'Kashiadanga',line_name:'Horogram To Kashiadanga 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:4.47},
  {sr:5,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Shalbagan',ss2:'Bimanbandar',line_name:'Shalbagan To Bimanbandar 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:5.99},
  {sr:6,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Shalbagan',ss2:'Bindur More',line_name:'Shalbagan To Bindur More 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:1.41},
  {sr:7,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Shalbagan',ss2:'City Hut',line_name:'Shalbagan To City Hut 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:5.0},
  {sr:9,zone:'Rajshahi',grid:'Katakhali 132/33 KV Sustation & Miapur 230/132/33 KV Sustation',ss1:'Bimanbandar',ss2:'City Hut',line_name:'Bimanbandar To City Hut 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:8.0},
  {sr:10,zone:'Rajshahi',grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation, Amnura 132/33 KV Sustation, Chowdala 132/33 KV Sustation',ss1:'Huzrapur',ss2:'Bottolahat',line_name:'Huzrapur To Bottolahat 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:6.5},
  {sr:11,zone:'Rajshahi',grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation, Amnura 132/33 KV Sustation, Chowdala 132/33 KV Sustation',ss1:'Huzrapur',ss2:'Rohonpur',line_name:'Huzrapur To Rohonpur 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:32.24},
  {sr:12,zone:'Rajshahi',grid:'Chapai Nawabgonj (Horipur) 132/33 KV Sustation, Amnura 132/33 KV Sustation, Chowdala 132/33 KV Sustation',ss1:'Rohonpur',ss2:'Nachol',line_name:'Rohonpur To Nachol 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:16.0},
  {sr:13,zone:'Rajshahi',grid:'Natore 132/33 KV Sustation',ss1:'Harishpur',ss2:'Alaipur',line_name:'Harishpur To Alaipur 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:7.0},
  {sr:14,zone:'Rajshahi',grid:'Pabna 132/33 KV Sustation',ss1:'Poilanpur',ss2:'Chatiani',line_name:'Poilanpur To Chatiani 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:2.55},
  {sr:15,zone:'Rajshahi',grid:'Pabna 132/33 KV Sustation',ss1:'Loskorpur',ss2:'Chatiani',line_name:'Loskorpur To Chatiani 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:13.0},
  {sr:16,zone:'Rajshahi',grid:'Pabna 132/33 KV Sustation',ss1:'Nurpur',ss2:'Loskorpur',line_name:'Nurpur To Loskorpur 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:7.0},
  {sr:17,zone:'Rajshahi',grid:'Joynogor 132/33 KV Sustation',ss1:'Patilakhali',ss2:'School Para',line_name:'Patilakhali To School Para 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:8.0},
  {sr:18,zone:'Rajshahi',grid:'Sirajganj  132/33 KV Sustation',ss1:'Bahirgola',ss2:'Puthiabari',line_name:'Bahirgola To Puthiabari 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:3.38},
  {sr:19,zone:'Rajshahi',grid:'Sirajganj  132/33 KV Sustation',ss1:'Raypur',ss2:'Puthiabari',line_name:'Raypur To Puthiabari 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:4.16},
  {sr:20,zone:'Rajshahi',grid:'Puran Bogura 132/33 KV Sustation',ss1:'Rahman Nagar',ss2:'Shibbati',line_name:'Rahman Nagar To Shibbati 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:5.98},
  {sr:21,zone:'Rajshahi',grid:'Puran Bogura 132/33 KV Sustation',ss1:'Dupchanchia (Regular)',ss2:'Talora',line_name:'Dupchanchia (Regular) To Talora 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:8.0},
  {sr:22,zone:'Rajshahi',grid:'Joypurhat  132/33 KV Sustation',ss1:'Khonjonpur',ss2:'Natun Hut',line_name:'Khonjonpur To Natun Hut 33 kV Ringline',type:'Proposed',conductor:'Grosbeak',length_km:6.0},
  {sr:23,zone:'Rajshahi',grid:'Naogaon  230/132/33 KV Sustation',ss1:'Arji Naogaon',ss2:'Baludanga',line_name:'Arji Naogaon To Baludanga 33 kV Ringline',type:'Proposed',conductor:'Grosbeak',length_km:12.0},
  {sr:24,zone:'Rangpur',grid:'Rangpur  230/132/33 KV Sustation',ss1:'Mahiganj',ss2:'Burirhut',line_name:'Mahiganj To Burirhut 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:13.0},
  {sr:25,zone:'Rangpur',grid:'Palashbari  132/33 KV Sustation',ss1:'Masterpara',ss2:'Dhangora',line_name:'Masterpara To Dhangora 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:4.73},
  {sr:26,zone:'Rangpur',grid:'Lalmonirhat  132/33 KV Sustation',ss1:'Kaliganj',ss2:'Hatibandha',line_name:'Kaliganj To Hatibandha 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:26.0},
  {sr:27,zone:'Rangpur',grid:'Saidpur  132/33 KV Sustation',ss1:'Golahut',ss2:'Niyamatpur, Saidpur',line_name:'Golahut To Niyamatpur, Saidpur 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:7.0},
  {sr:28,zone:'Rangpur',grid:'Saidpur  132/33 KV Sustation',ss1:'Kukhapara',ss2:'Sobujpara',line_name:'Kukhapara To Sobujpara 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:4.0},
  {sr:29,zone:'Rangpur',grid:'Thakurgaon  132/33 KV Sustation',ss1:'Goyalpara',ss2:'DPS',line_name:'Goyalpara To DPS 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:12.0},
  {sr:30,zone:'Rangpur',grid:'Purbasadipur  230/132/33 KV Sustation',ss1:'Fakirpara',ss2:'Balubari',line_name:'Fakirpara To Balubari 33 kV Ringline',type:'Existing',conductor:'Merlin',length_km:6.0},
  {sr:31,zone:'Rangpur',grid:'Purbasadipur  230/132/33 KV Sustation',ss1:'Balubari',ss2:'Uposhohor',line_name:'Balubari To Uposhohor 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:6.0},
  {sr:32,zone:'Rangpur',grid:'Panchagarh  132/33 kV  Substation',ss1:'Tetulia',ss2:'Bhajanpur',line_name:'Tetulia To Bhajanpur 33 kV Ringline',type:'Existing',conductor:'Grosbeak',length_km:16.0}
];

/* ══════════════════════════════════════════════════
   NEW DT SECTIONS — built from parsed Excel files
══════════════════════════════════════════════════ */

/* ── Overall DT Summary ─────────────────────────────────────────────────── */
function renderDTOverallSummary() {
  const pct = v => (v * 100).toFixed(1) + '%';
  const bar = (val, cls) => `<div class="progress-bar" style="width:80px"><div class="progress-fill ${cls}" style="width:${Math.min(val*100,100)}%"></div></div>`;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — Overall Summary</h2>
      <p>All SDD/ESU across the NESCO network — ${DT_GRAND_TOTAL.total} transformers</p>
    </div>
    <div class="sec-head-right">
      <input class="search-input" id="os-search" placeholder="🔍 Search SDD…" oninput="window.filterOverallSummary()" style="max-width:220px">
      <button class="btn btn-sm btn-secondary" onclick="window.exportOverallCSV()"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${(() => {
    const totalLA   = OVERALL_SUMMARY.reduce((s,r)=>s+(r.la_no   + r.la_bad  ),0);
    const totalDOFC = OVERALL_SUMMARY.reduce((s,r)=>s+(r.dofc_no + r.dofc_bad),0);
    const totalMCCB = OVERALL_SUMMARY.reduce((s,r)=>s+(r.mccb_no + r.mccb_bad),0);
    const totalGnd  = OVERALL_SUMMARY.reduce((s,r)=>s+(r.gnd_no || 0),0);
    return `<div class="kpi-row" style="grid-template-columns:repeat(6,1fr)">
      <div class="kpi-card navy"><div class="kpi-val">${OVERALL_SUMMARY.length}</div><div class="kpi-sub">Total SDD/ESU</div></div>
      <div class="kpi-card indigo"><div class="kpi-val">${DT_GRAND_TOTAL.total.toLocaleString()}</div><div class="kpi-sub">Total Transformers</div></div>
      <div class="kpi-card red"><div class="kpi-val">${(DT_GRAND_TOTAL.kpi_la*100).toFixed(1)}%</div><div class="kpi-sub">LA Coverage</div></div>
      <div class="kpi-card amber"><div class="kpi-val">${(DT_GRAND_TOTAL.kpi_dofc*100).toFixed(1)}%</div><div class="kpi-sub">DOFC Coverage</div></div>
      <div class="kpi-card purple"><div class="kpi-val">${(DT_GRAND_TOTAL.kpi_mccb*100).toFixed(1)}%</div><div class="kpi-sub">MCCB Coverage</div></div>
      <div class="kpi-card teal"><div class="kpi-val">${DT_GRAND_TOTAL.gnd_yes.toLocaleString()}</div><div class="kpi-sub">Grounding Present</div></div>
    </div>
    <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
      <div class="kpi-card red"><div class="kpi-val">${(totalLA*3).toLocaleString()}</div><div class="kpi-sub">LA Required (nos.)</div></div>
      <div class="kpi-card amber"><div class="kpi-val">${(totalDOFC*3).toLocaleString()}</div><div class="kpi-sub">DOFC Required (nos.)</div></div>
      <div class="kpi-card purple"><div class="kpi-val">${(totalMCCB*2).toLocaleString()}</div><div class="kpi-sub">MCCB Required (nos.)</div></div>
      <div class="kpi-card pink"><div class="kpi-val">${totalGnd.toLocaleString()}</div><div class="kpi-sub">Grounding Required</div></div>
    </div>
    <div class="note-bar"><i class="fas fa-info-circle"></i>
      <div><strong>01 set = 3 nos</strong> for 11 kV LA &amp; 11 kV DOFC (1 set per phase × 3 phases). MCCB count = 2 per transformer (incoming + outgoing). Grounding count is one per transformer.</div>
    </div>`;
  })()}

  <div class="panel">
    <div class="panel-head">
      <h3>Consolidated Summary — All SDD/ESU</h3>
      <span id="os-count" style="font-size:.82rem;color:var(--text3)">${OVERALL_SUMMARY.length} SDDs</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th rowspan="2">Sr.</th>
          <th rowspan="2">Name of SDD/ESU</th>
          <th rowspan="2">TX Count</th>
          <th colspan="5">kVA Breakdown</th>
          <th colspan="4">11 kV LA</th>
          <th colspan="4">11 kV DOFC</th>
          <th colspan="4">0.4 kV MCCB</th>
          <th colspan="3">Grounding</th>
          <th colspan="2">LT Loop</th>
          <th colspan="3">KPI – Coverage</th>
          <th colspan="4" style="background:linear-gradient(90deg,#fef3c7,#fde68a)">Required (nos.)</th>
        </tr>
        <tr style="background:#e8eef5;font-size:.75rem">
          <th>50kVA</th><th>100kVA</th><th>200kVA</th><th>250kVA</th><th>Other</th>
          <th>Yes</th><th>No</th><th>Good</th><th>Bad</th>
          <th>Yes</th><th>No</th><th>Good</th><th>Bad</th>
          <th>Yes</th><th>No</th><th>Good</th><th>Bad</th>
          <th>Yes</th><th>No</th><th>Req.</th>
          <th>Copper</th><th>Aluminium</th>
          <th>LA</th><th>DOFC</th><th>MCCB</th>
          <th title="(LA needed) × 3">LA</th>
          <th title="(DOFC needed) × 3">DOFC</th>
          <th title="(MCCB needed) × 2">MCCB</th>
          <th title="Grounding needed">Gnd.</th>
        </tr>
      </thead>
      <tbody id="os-tbody">
        ${renderOverallRows(OVERALL_SUMMARY)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function renderOverallRows(list) {
  const pBar = (v, cls) => `<div style="display:flex;align-items:center;gap:4px">
    <div class="progress-bar" style="width:45px"><div class="progress-fill ${cls}" style="width:${Math.min(v*100,100)}%"></div></div>
    <span style="font-size:.73rem;font-weight:700">${(v*100).toFixed(1)}%</span></div>`;
  const reqPill = (n) => `<span class="req-pill ${n===0?'req-zero':''}">${n.toLocaleString()}</span>`;
  return list.map(s => {
    const needLA   = (s.la_no   + s.la_bad  ) * 3;
    const needDOFC = (s.dofc_no + s.dofc_bad) * 3;
    const needMCCB = (s.mccb_no + s.mccb_bad) * 2;
    const needGnd  =  s.gnd_no || 0;
    return `<tr>
    <td>${s.sr}</td>
    <td>
      <a href="#" onclick="window.showSection('dt-details','${s.sdd_id}');return false"
         style="color:var(--blue);font-weight:700">${s.name}</a>
    </td>
    <td class="num"><strong>${s.total}</strong></td>
    <td class="num">${s.kva50||0}</td><td class="num">${s.kva100}</td><td class="num">${s.kva200}</td><td class="num">${s.kva250}</td><td class="num">${s.kvaOther||0}</td>
    <td class="num">${s.la_yes}</td><td class="num">${s.la_no}</td><td class="num">${s.la_good}</td><td class="num">${s.la_bad}</td>
    <td class="num">${s.dofc_yes}</td><td class="num">${s.dofc_no}</td><td class="num">${s.dofc_good}</td><td class="num">${s.dofc_bad}</td>
    <td class="num">${s.mccb_yes}</td><td class="num">${s.mccb_no}</td><td class="num">${s.mccb_good}</td><td class="num">${s.mccb_bad}</td>
    <td class="num">${s.gnd_yes}</td><td class="num">${s.gnd_no}</td><td class="num">${s.gnd_req}</td>
    <td class="num">${s.lt_copper}</td><td class="num">${s.lt_aluminium}</td>
    <td>${pBar(s.kpi_la, s.kpi_la>=0.7?'ok':s.kpi_la>=0.4?'warn':'danger')}</td>
    <td>${pBar(s.kpi_dofc, s.kpi_dofc>=0.8?'ok':s.kpi_dofc>=0.5?'warn':'danger')}</td>
    <td>${pBar(s.kpi_mccb, s.kpi_mccb>=0.5?'ok':s.kpi_mccb>=0.25?'warn':'danger')}</td>
    <td class="num">${reqPill(needLA)}</td>
    <td class="num">${reqPill(needDOFC)}</td>
    <td class="num">${reqPill(needMCCB)}</td>
    <td class="num">${reqPill(needGnd)}</td>
  </tr>`;
  }).join('') + `
  <tr style="background:linear-gradient(90deg,#e0e7ff,#dbeafe);font-weight:800;border-top:2px solid #93c5fd">
    <td colspan="2">Grand Total</td>
    <td class="num">${DT_GRAND_TOTAL.total.toLocaleString()}</td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+(r.kva50||0),0)}</td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+r.kva100,0)}</td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+r.kva200,0)}</td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+r.kva250,0)}</td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+(r.kvaOther||0),0)}</td>
    <td class="num">${DT_GRAND_TOTAL.la_yes}</td><td class="num">${DT_GRAND_TOTAL.la_no}</td>
    <td class="num">${DT_GRAND_TOTAL.la_good||0}</td><td class="num">${DT_GRAND_TOTAL.la_bad||0}</td>
    <td class="num">${DT_GRAND_TOTAL.dofc_yes}</td><td class="num">${DT_GRAND_TOTAL.dofc_no}</td>
    <td class="num">${DT_GRAND_TOTAL.dofc_good||0}</td><td class="num">${DT_GRAND_TOTAL.dofc_bad||0}</td>
    <td class="num">${DT_GRAND_TOTAL.mccb_yes}</td><td class="num">${DT_GRAND_TOTAL.mccb_no}</td>
    <td class="num">${DT_GRAND_TOTAL.mccb_good||0}</td><td class="num">${DT_GRAND_TOTAL.mccb_bad||0}</td>
    <td class="num">${DT_GRAND_TOTAL.gnd_yes}</td><td class="num">${DT_GRAND_TOTAL.gnd_no||0}</td><td class="num">${DT_GRAND_TOTAL.gnd_req||0}</td>
    <td class="num">${DT_GRAND_TOTAL.lt_copper}</td><td class="num">${DT_GRAND_TOTAL.lt_aluminium}</td>
    <td style="font-size:.85rem;font-weight:800;color:var(--green2)">${(DT_GRAND_TOTAL.kpi_la*100).toFixed(1)}%</td>
    <td style="font-size:.85rem;font-weight:800;color:var(--green2)">${(DT_GRAND_TOTAL.kpi_dofc*100).toFixed(1)}%</td>
    <td style="font-size:.85rem;font-weight:800;color:var(--amber2)">${(DT_GRAND_TOTAL.kpi_mccb*100).toFixed(1)}%</td>
    ${(() => {
      const tLA   = OVERALL_SUMMARY.reduce((s,r)=>s+(r.la_no  +r.la_bad  ),0)*3;
      const tDOFC = OVERALL_SUMMARY.reduce((s,r)=>s+(r.dofc_no+r.dofc_bad),0)*3;
      const tMCCB = OVERALL_SUMMARY.reduce((s,r)=>s+(r.mccb_no+r.mccb_bad),0)*2;
      const tGnd  = OVERALL_SUMMARY.reduce((s,r)=>s+(r.gnd_no || 0),0);
      return `<td class="num"><span class="req-pill">${tLA.toLocaleString()}</span></td>
              <td class="num"><span class="req-pill">${tDOFC.toLocaleString()}</span></td>
              <td class="num"><span class="req-pill">${tMCCB.toLocaleString()}</span></td>
              <td class="num"><span class="req-pill ${tGnd===0?'req-zero':''}">${tGnd.toLocaleString()}</span></td>`;
    })()}
  </tr>`;
}

window.filterOverallSummary = () => {
  const q = (document.getElementById('os-search')?.value||'').toLowerCase();
  const filtered = OVERALL_SUMMARY.filter(s => !q || s.name.toLowerCase().includes(q));
  document.getElementById('os-tbody').innerHTML = renderOverallRows(filtered);
  document.getElementById('os-count').textContent = filtered.length + ' SDDs';
};

window.exportOverallCSV = () => {
  const rows = [['Sr','SDD/ESU Name','TX Count','kVA50','kVA100','kVA200','kVA250','kVAOther','LA Yes','LA No','LA Good','LA Bad','DOFC Yes','DOFC No','MCCB Yes','MCCB No','Gnd Yes','Gnd No','LT Copper','LT Aluminium','KPI LA','KPI DOFC','KPI MCCB']];
  OVERALL_SUMMARY.forEach(s => rows.push([s.sr,s.name,s.total,s.kva50,s.kva100,s.kva200,s.kva250,s.kvaOther,s.la_yes,s.la_no,s.la_good,s.la_bad,s.dofc_yes,s.dofc_no,s.mccb_yes,s.mccb_no,s.gnd_yes,s.gnd_no,s.lt_copper,s.lt_aluminium,(s.kpi_la*100).toFixed(1)+'%',(s.kpi_dofc*100).toFixed(1)+'%',(s.kpi_mccb*100).toFixed(1)+'%']));
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})),download:'dt_overall_summary.csv'});
  a.click(); showToast('Exported!','success');
};

/* ── SDD-wise DT Summary ────────────────────────────────────────────────── */
// Rajshahi-1 feeder summary (demo — loaded from Firebase for all 85 SDDs)
const DEMO_FEEDER_SUMMARY_R1 = [
  {feeder:'Binodpur',total:36,kva100:9,kva200:12,kva250:15,la_yes:11,la_no:23,dofc_yes:11,dofc_no:23,mccb_yes:12,mccb_no:22,gnd_yes:27,lt_copper:27,lt_aluminium:6},
  {feeder:'CharKazla',total:32,kva100:9,kva200:13,kva250:10,la_yes:13,la_no:18,dofc_yes:11,dofc_no:20,mccb_yes:14,mccb_no:17,gnd_yes:31,lt_copper:26,lt_aluminium:5},
  {feeder:'Motihar',total:34,kva100:5,kva200:16,kva250:13,la_yes:17,la_no:16,dofc_yes:9,dofc_no:24,mccb_yes:17,mccb_no:16,gnd_yes:33,lt_copper:30,lt_aluminium:3},
  {feeder:'Raninagar',total:28,kva100:3,kva200:12,kva250:12,la_yes:19,la_no:9,dofc_yes:8,dofc_no:20,mccb_yes:17,mccb_no:11,gnd_yes:28,lt_copper:9,lt_aluminium:17},
  {feeder:'Sagorpara',total:35,kva100:3,kva200:14,kva250:18,la_yes:18,la_no:17,dofc_yes:11,dofc_no:24,mccb_yes:9,mccb_no:26,gnd_yes:35,lt_copper:31,lt_aluminium:5},
  {feeder:'Sericulture',total:29,kva100:7,kva200:11,kva250:11,la_yes:8,la_no:21,dofc_yes:8,dofc_no:21,mccb_yes:10,mccb_no:19,gnd_yes:29,lt_copper:11,lt_aluminium:17},
  {feeder:'Tikapara',total:32,kva100:3,kva200:9,kva250:20,la_yes:13,la_no:16,dofc_yes:11,dofc_no:18,mccb_yes:13,mccb_no:16,gnd_yes:28,lt_copper:18,lt_aluminium:13},
  {feeder:'Vodra',total:29,kva100:4,kva200:7,kva250:18,la_yes:9,la_no:20,dofc_yes:4,dofc_no:25,mccb_yes:6,mccb_no:23,gnd_yes:29,lt_copper:6,lt_aluminium:23},
];

function renderDTSDDSummary() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — SDD/ESU-wise Summary</h2>
      <p>Click any SDD to view individual transformer details</p>
    </div>
    <div class="sec-head-right">
      <input class="search-input" id="sdd-search" placeholder="🔍 Search SDD…" oninput="window.filterSDDTable()" style="max-width:220px">
    </div>
  </div>

  <div class="note-bar"><i class="fas fa-info-circle"></i>
    <div><strong>01 set = 3 nos</strong> for LA &amp; DOFC. MCCB = 2 per transformer. Required = (Absent + Bad) for that equipment.</div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>All SDD/ESU — Feeder-wise Summary</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sr.</th>
          <th>SDD / ESU Name</th>
          <th>TX Count</th>
          <th>100 kVA</th><th>200 kVA</th><th>250 kVA</th>
          <th>LA Present</th><th>LA Absent</th>
          <th>DOFC Present</th><th>DOFC Absent</th>
          <th>MCCB Present</th><th>MCCB Absent</th>
          <th>Grounding Present</th>
          <th>LA Coverage</th>
          <th>DOFC Coverage</th>
          <th>MCCB Coverage</th>
          <th title="LA needed × 3">LA Req (nos)</th>
          <th title="DOFC needed × 3">DOFC Req (nos)</th>
          <th title="MCCB needed × 2">MCCB Req (nos)</th>
          <th>Gnd. Req</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="sdd-tbody">
        ${renderSDDRows(OVERALL_SUMMARY)}
      </tbody>
      <tfoot id="sdd-tfoot">
        ${_renderSDDTotalsRow(OVERALL_SUMMARY)}
      </tfoot>
    </table>
    </div></div>
  </div>
  `;
}

/* Footer SUM row for the SDD-wise summary table. */
function _renderSDDTotalsRow(list) {
  if (!list || !list.length) return '';
  const sum = (key) => list.reduce((a, s) => a + (s[key] || 0), 0);
  const total      = sum('total');
  const kva100     = sum('kva100');
  const kva200     = sum('kva200');
  const kva250     = sum('kva250');
  const laYes      = sum('la_yes');
  const laNo       = sum('la_no');
  const dofcYes    = sum('dofc_yes');
  const dofcNo     = sum('dofc_no');
  const mccbYes    = sum('mccb_yes');
  const mccbNo     = sum('mccb_no');
  const gndYes     = sum('gnd_yes');
  const laReq      = list.reduce((a, s) => a + ((s.la_no + s.la_bad) * 3), 0);
  const dofcReq    = list.reduce((a, s) => a + ((s.dofc_no + s.dofc_bad) * 3), 0);
  const mccbReq    = list.reduce((a, s) => a + ((s.mccb_no + s.mccb_bad) * 2), 0);
  const gndReq     = sum('gnd_no');
  const laCov      = total ? (laYes/total*100).toFixed(1)+'%'   : '—';
  const dofcCov    = total ? (dofcYes/total*100).toFixed(1)+'%' : '—';
  const mccbCov    = total ? (mccbYes/total*100).toFixed(1)+'%' : '—';
  return `<tr class="tbl-sum-row">
    <td colspan="2"><strong>TOTAL (${list.length} SDDs)</strong></td>
    <td class="num"><strong>${total.toLocaleString()}</strong></td>
    <td class="num"><strong>${kva100.toLocaleString()}</strong></td>
    <td class="num"><strong>${kva200.toLocaleString()}</strong></td>
    <td class="num"><strong>${kva250.toLocaleString()}</strong></td>
    <td class="num"><strong>${laYes.toLocaleString()}</strong></td>
    <td class="num"><strong>${laNo.toLocaleString()}</strong></td>
    <td class="num"><strong>${dofcYes.toLocaleString()}</strong></td>
    <td class="num"><strong>${dofcNo.toLocaleString()}</strong></td>
    <td class="num"><strong>${mccbYes.toLocaleString()}</strong></td>
    <td class="num"><strong>${mccbNo.toLocaleString()}</strong></td>
    <td class="num"><strong>${gndYes.toLocaleString()}</strong></td>
    <td><strong>${laCov}</strong></td>
    <td><strong>${dofcCov}</strong></td>
    <td><strong>${mccbCov}</strong></td>
    <td class="num"><strong>${laReq.toLocaleString()}</strong></td>
    <td class="num"><strong>${dofcReq.toLocaleString()}</strong></td>
    <td class="num"><strong>${mccbReq.toLocaleString()}</strong></td>
    <td class="num"><strong>${gndReq.toLocaleString()}</strong></td>
    <td></td>
  </tr>`;
}

function renderSDDRows(list) {
  const reqPill = (n) => `<span class="req-pill ${n===0?'req-zero':''}">${n.toLocaleString()}</span>`;
  return list.map((s) => {
    const laP  = s.total ? (s.kpi_la*100).toFixed(1)+'%' : '—';
    const dofcP= s.total ? (s.kpi_dofc*100).toFixed(1)+'%' : '—';
    const mccbP= s.total ? (s.kpi_mccb*100).toFixed(1)+'%' : '—';
    const sddId = s.sdd_id || s.name.toLowerCase().replace(/[^a-z0-9]/g,'_');
    const needLA   = (s.la_no   + s.la_bad  ) * 3;
    const needDOFC = (s.dofc_no + s.dofc_bad) * 3;
    const needMCCB = (s.mccb_no + s.mccb_bad) * 2;
    const needGnd  =  s.gnd_no || 0;
    return `<tr>
      <td>${s.sr}</td>
      <td>
        <a href="#" onclick="window.showSection('dt-details','${sddId}');return false"
           style="color:var(--blue);font-weight:700">${s.name}</a>
      </td>
      <td class="num"><strong>${s.total}</strong></td>
      <td class="num">${s.kva100}</td><td class="num">${s.kva200}</td><td class="num">${s.kva250}</td>
      <td class="num">${s.la_yes}</td><td class="num">${s.la_no}</td>
      <td class="num">${s.dofc_yes}</td><td class="num">${s.dofc_no}</td>
      <td class="num">${s.mccb_yes}</td><td class="num">${s.mccb_no}</td>
      <td class="num">${s.gnd_yes}</td>
      <td><span class="badge ${s.kpi_la>=0.7?'badge-good':s.kpi_la>=0.4?'badge-partial':'badge-bad'}">${laP}</span></td>
      <td><span class="badge ${s.kpi_dofc>=0.8?'badge-good':s.kpi_dofc>=0.5?'badge-partial':'badge-bad'}">${dofcP}</span></td>
      <td><span class="badge ${s.kpi_mccb>=0.5?'badge-good':s.kpi_mccb>=0.25?'badge-partial':'badge-bad'}">${mccbP}</span></td>
      <td class="num">${reqPill(needLA)}</td>
      <td class="num">${reqPill(needDOFC)}</td>
      <td class="num">${reqPill(needMCCB)}</td>
      <td class="num">${reqPill(needGnd)}</td>
      <td>
        <button class="btn btn-xs btn-primary" onclick="window.showSection('dt-details','${sddId}')">
          <i class="fas fa-eye"></i> Details
        </button>
      </td>
    </tr>`;
  }).join('');
}

window.filterSDDTable = () => {
  const q = (document.getElementById('sdd-search')?.value||'').toLowerCase();
  const f = OVERALL_SUMMARY.filter(s => !q || s.name.toLowerCase().includes(q));
  document.getElementById('sdd-tbody').innerHTML = renderSDDRows(f);
  const tf = document.getElementById('sdd-tfoot');
  if (tf) tf.innerHTML = _renderSDDTotalsRow(f);
};

/* ── DT Details (per SDD — reads Firebase; demo with Rajshahi-1 data) ───── */
let DT_DETAIL_RECORDS = [];
let DT_DETAIL_SDD     = null;

async function renderDTDetails(sddId) {
  DT_DETAIL_SDD = sddId;
  const sddObj  = findSDD(sddId);
  const sddName = sddObj ? sddObj.name : sddId;
  const lookupId = sddObj ? sddObj.sdd_id : sddId;

  // Pull the records from the JSON-backed adapter
  DT_DETAIL_RECORDS = (DT_BY_SDD && DT_BY_SDD[lookupId]) ? DT_BY_SDD[lookupId].slice() : [];

  _showDTDetailsPage(sddName, lookupId);
}

// _demoRecords() removed — JSON-driven now

function _showDTDetailsPage(sddName, sddId) {
  const allFeeders = [...new Set(DT_DETAIL_RECORDS.map(r=>r.feeder).filter(Boolean))];

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>DT Details — ${sddName}</h2>
      <p>${DT_DETAIL_RECORDS.length} transformer records · loaded from <code>distribution-transformers.json</code></p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel" id="dtd-feeder" onchange="window.filterDTDetail()">
        <option value="">All Feeders</option>
        ${allFeeders.map(f=>`<option value="${f}">${f}</option>`).join('')}
      </select>
      <input class="search-input" id="dtd-search" placeholder="🔍 GIS ID or name…" oninput="window.filterDTDetail()" style="max-width:200px">
      <select class="filter-sel" id="dtd-la" onchange="window.filterDTDetail()">
        <option value="">LA: All</option>
        <option value="Yes">LA: Present</option>
        <option value="No">LA: Absent</option>
      </select>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddDTRecordModal('${sddId}')"><i class="fas fa-plus"></i> Add</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.exportDTDetailCSV('${sddName}')"><i class="fas fa-download"></i> CSV</button>
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('dt-sdd-summary')"><i class="fas fa-arrow-left"></i> Back</button>
    </div>
  </div>

  ${DT_DETAIL_RECORDS.length === 0 ? `<div class="alert alert-warn"><i class="fas fa-info-circle"></i>
    <div>No transformer records for this SDD/ESU yet. Make sure <code>distribution-transformers.json</code> contains data for <strong>${sddName}</strong>.</div>
  </div>` : ''}

  <div class="panel">
    <div class="panel-head">
      <h3>Transformer Records</h3>
      <span id="dtd-count" style="font-size:.82rem;color:var(--text3)">${DT_DETAIL_RECORDS.length} records</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation</th>
          <th>Feeder</th>
          <th>GIS ID</th>
          <th>Rating (kVA)</th>
          <th>Ref. No.</th>
          <th>GIS Location</th>
          <th>Local Name</th>
          <th>11kV LA</th>
          <th>LA Cond.</th>
          <th>11kV DOFC</th>
          <th>DOFC Cond.</th>
          <th>0.4kV MCCB</th>
          <th>MCCB Cond.</th>
          <th>Grounding</th>
          <th>Gnd. Count</th>
          <th>LT Loop</th>
          ${currentRole==='admin' ? '<th>Action</th>' : ''}
        </tr>
      </thead>
      <tbody id="dtd-tbody">
        ${renderDTDetailRows(DT_DETAIL_RECORDS)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function renderDTDetailRows(rows) {
  if (!rows.length) return `<tr><td colspan="18" class="tbl-empty">No records. Upload data via Firebase.</td></tr>`;
  const yn = v => v==='Yes' ? '<span class="badge badge-yes">Yes</span>' : v==='No' ? '<span class="badge badge-no">No</span>' : D(v);
  const cond = v => v==='Good' ? '<span class="badge badge-good">Good</span>' : v==='Bad' ? '<span class="badge badge-bad">Bad</span>' : '—';
  return rows.map((r,i) => `<tr>
    <td>${r.sl||i+1}</td>
    <td style="font-size:.8rem">${D(r.substation)}</td>
    <td><strong>${D(r.feeder)}</strong></td>
    <td style="font-family:'Courier New',monospace;font-size:.78rem">${D(r.gis_id)}</td>
    <td class="num"><strong>${D(r.capacity_kva)}</strong></td>
    <td style="font-size:.78rem">${D(r.ref_no)}</td>
    <td style="font-size:.76rem">${_dtMapCell(r)}</td>
    <td style="font-size:.8rem" title="${r.local_name||''}">${(r.local_name||'—').substring(0,18)}${(r.local_name||'').length>18?'…':''}</td>
    <td>${yn(r.la_yn)}</td>
    <td>${cond(r.la_cond)}</td>
    <td>${yn(r.dofc_yn)}</td>
    <td>${cond(r.dofc_cond)}</td>
    <td>${yn(r.mccb_yn)}</td>
    <td>${cond(r.mccb_cond)}</td>
    <td>${yn(r.gnd_yn)}</td>
    <td class="num">${r.gnd_count!=null ? r.gnd_count : '—'}</td>
    <td><span class="badge ${r.lt_conductor==='Copper'?'badge-blue':r.lt_conductor==='Aluminium'?'badge-gray':''}">${D(r.lt_conductor)}</span></td>
    ${currentRole==='admin' ? `<td>
      <button class="btn btn-xs btn-secondary" onclick="window.openEditDTRecordModal(${i})"><i class="fas fa-edit"></i></button>
      <button class="btn btn-xs btn-danger" onclick="window.deleteDTRecord(${i})" style="margin-left:2px"><i class="fas fa-trash"></i></button>
    </td>` : ''}
  </tr>`).join('');
}

window.filterDTDetail = () => {
  const feeder = document.getElementById('dtd-feeder')?.value || '';
  const q      = (document.getElementById('dtd-search')?.value||'').toLowerCase();
  const la     = document.getElementById('dtd-la')?.value || '';
  const f = DT_DETAIL_RECORDS.filter(r =>
    (!feeder || r.feeder === feeder) &&
    (!la     || r.la_yn  === la) &&
    (!q      || (r.gis_id||'').includes(q) || (r.local_name||'').toLowerCase().includes(q) || (r.ref_no||'').includes(q))
  );
  document.getElementById('dtd-tbody').innerHTML = renderDTDetailRows(f);
  document.getElementById('dtd-count').textContent = f.length + ' records';
};

window.exportDTDetailCSV = (name) => {
  const rows = [['Sl','Substation','Feeder','GIS ID','Rating (kVA)','Ref No','Local Name','LA','LA Cond','DOFC','DOFC Cond','MCCB','MCCB Cond','Grounding','Gnd Count','LT Conductor']];
  DT_DETAIL_RECORDS.forEach(r => rows.push([r.sl,r.substation,r.feeder,r.gis_id,r.capacity_kva,r.ref_no,r.local_name,r.la_yn,r.la_cond,r.dofc_yn,r.dofc_cond,r.mccb_yn,r.mccb_cond,r.gnd_yn,r.gnd_count,r.lt_conductor]));
  const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>v==null?'':v).join(',')).join('\n')],{type:'text/csv'})),download:`dt_details_${name}.csv`});
  a.click(); showToast('Exported!','success');
};

window.openAddDTRecordModal = (sddId) => {
  window.openModal('Add Transformer Record', `
  <form id="dtr-form" onsubmit="window.saveDTRecord(event,'${sddId}')">
    <div class="form-row cols-3">
      <div class="fg"><label>Substation <span class="req">*</span></label><input required name="substation"></div>
      <div class="fg"><label>Feeder <span class="req">*</span></label><input required name="feeder"></div>
      <div class="fg"><label>GIS ID</label><input name="gis_id"></div>
    </div>
    <div class="form-row cols-3">
      <div class="fg"><label>Rating (kVA)</label>
        <select name="capacity_kva"><option value="">—</option>${[50,100,200,250,315,500].map(k=>`<option>${k}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>Ref. No.</label><input name="ref_no"></div>
      <div class="fg"><label>Local Name</label><input name="local_name"></div>
    </div>
    <div class="form-row cols-4" style="gap:8px">
      ${[['la_yn','11kV LA'],['dofc_yn','11kV DOFC'],['mccb_yn','0.4kV MCCB'],['gnd_yn','Grounding']].map(([n,lbl])=>`
      <div class="fg"><label>${lbl}</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="${n}" value="Yes"> Yes</label>
          <label class="radio-opt"><input type="radio" name="${n}" value="No"> No</label>
        </div>
      </div>`).join('')}
    </div>
    <div class="form-row cols-4" style="gap:8px">
      ${[['la_cond','LA Cond.'],['dofc_cond','DOFC Cond.'],['mccb_cond','MCCB Cond.']].map(([n,lbl])=>`
      <div class="fg"><label>${lbl}</label>
        <select name="${n}"><option value="">N/A</option><option>Good</option><option>Bad</option></select>
      </div>`).join('')}
      <div class="fg"><label>Gnd Count</label><input type="number" min="0" name="gnd_count"></div>
    </div>
    <div class="form-row cols-2">
      <div class="fg"><label>LT Loop Conductor</label>
        <select name="lt_conductor"><option value="">—</option><option>Copper</option><option>Aluminium</option></select>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
    </div>
  </form>`);
};

window.saveDTRecord = async (e, sddId) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const r  = Object.fromEntries(fd.entries());
  r.sdd_id = sddId;
  r.sl = DT_DETAIL_RECORDS.length + 1;
  if (r.gnd_count) r.gnd_count = parseInt(r.gnd_count);
  if (r.capacity_kva) r.capacity_kva = parseInt(r.capacity_kva);
  if (IS_CONFIGURED) {
    const {addDoc, collection, serverTimestamp} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await addDoc(collection(db,'dt_records'), {...r, createdAt: serverTimestamp()});
  }
  DT_DETAIL_RECORDS.push(r);
  window.closeModal();
  showToast('Record saved!','success');
  _showDTDetailsPage(sddId, sddId);
};

window.openEditDTRecordModal = (idx) => {
  const r = DT_DETAIL_RECORDS[idx];
  if (!r) return;
  window.openModal('Edit Transformer Record', `
  <form id="dtr-edit-form" onsubmit="window.updateDTRecord(event,${idx})">
    <div class="form-row cols-3">
      <div class="fg"><label>Substation</label><input name="substation" value="${r.substation||''}"></div>
      <div class="fg"><label>Feeder</label><input name="feeder" value="${r.feeder||''}"></div>
      <div class="fg"><label>GIS ID</label><input name="gis_id" value="${r.gis_id||''}"></div>
    </div>
    <div class="form-row cols-3">
      <div class="fg"><label>Rating (kVA)</label>
        <select name="capacity_kva">${[50,100,200,250,315,500].map(k=>`<option value="${k}" ${r.capacity_kva==k?'selected':''}>${k}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>Ref. No.</label><input name="ref_no" value="${r.ref_no||''}"></div>
      <div class="fg"><label>Local Name</label><input name="local_name" value="${r.local_name||''}"></div>
    </div>
    <div class="form-row cols-4" style="gap:8px">
      ${[['la_yn','11kV LA',r.la_yn],['dofc_yn','11kV DOFC',r.dofc_yn],['mccb_yn','MCCB',r.mccb_yn],['gnd_yn','Grounding',r.gnd_yn]].map(([n,lbl,val])=>`
      <div class="fg"><label>${lbl}</label>
        <div class="radio-row">
          <label class="radio-opt"><input type="radio" name="${n}" value="Yes" ${val==='Yes'?'checked':''}> Yes</label>
          <label class="radio-opt"><input type="radio" name="${n}" value="No"  ${val==='No'?'checked':''}> No</label>
        </div>
      </div>`).join('')}
    </div>
    <div class="form-row cols-4" style="gap:8px">
      ${[['la_cond','LA Cond.',r.la_cond],['dofc_cond','DOFC Cond.',r.dofc_cond],['mccb_cond','MCCB Cond.',r.mccb_cond]].map(([n,lbl,val])=>`
      <div class="fg"><label>${lbl}</label>
        <select name="${n}"><option value="">N/A</option><option ${val==='Good'?'selected':''}>Good</option><option ${val==='Bad'?'selected':''}>Bad</option></select>
      </div>`).join('')}
      <div class="fg"><label>Gnd Count</label><input type="number" min="0" name="gnd_count" value="${r.gnd_count||''}"></div>
    </div>
    <div class="form-row cols-2">
      <div class="fg"><label>LT Loop Conductor</label>
        <select name="lt_conductor"><option value="">—</option>
          <option ${r.lt_conductor==='Copper'?'selected':''}>Copper</option>
          <option ${r.lt_conductor==='Aluminium'?'selected':''}>Aluminium</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
    </div>
  </form>`);
};

window.updateDTRecord = async (e, idx) => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const upd = Object.fromEntries(fd.entries());
  if (upd.gnd_count) upd.gnd_count = parseInt(upd.gnd_count);
  if (upd.capacity_kva) upd.capacity_kva = parseInt(upd.capacity_kva);
  Object.assign(DT_DETAIL_RECORDS[idx], upd);
  window.closeModal();
  showToast('Record updated!','success');
  _showDTDetailsPage(DT_DETAIL_SDD, DT_DETAIL_SDD);
};

window.deleteDTRecord = (idx) => {
  if (!confirm('Delete this record?')) return;
  DT_DETAIL_RECORDS.splice(idx, 1);
  showToast('Deleted.','success');
  _showDTDetailsPage(DT_DETAIL_SDD, DT_DETAIL_SDD);
};

/* ── DT Operating Values ────────────────────────────────────────────────── */
let DT_OP_DATA = [];  // stored in Firestore dt_operating collection

function renderDTOperating() {
  // Seed DT_OP_DATA from the JSON adapter the first time the page is opened
  // so users see one row per transformer (with phase/oil-temp values nullable
  // until collected). Edits the user makes are kept in-memory until reload.
  if (!DT_OP_SEEDED && DT_BY_SDD && Object.keys(DT_BY_SDD).length) {
    DT_OP_DATA = [];
    for (const sddId of Object.keys(DT_BY_SDD)) {
      for (const r of DT_BY_SDD[sddId]) {
        DT_OP_DATA.push({
          sdd_id:       r.sdd_id,
          sdd_name:     r.sdd_name,
          feeder:       r.feeder,
          gis_id:       r.gis_id,
          capacity_kva: r.capacity_kva,
          gis_location: r.gis_location,
          local_name:   r.local_name,
          phase_a:      r.phase_a,
          phase_b:      r.phase_b,
          phase_c:      r.phase_c,
          oil_temp:     r.oil_temp,
          date:         null,
        });
      }
    }
    DT_OP_SEEDED = true;
  }
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — Operating Parameters</h2>
      <p>Phase current measurements, balance &amp; overload status</p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel" id="op-sdd" onchange="window.filterOpTable()">
        <option value="">All SDD/ESU</option>
        ${OVERALL_SUMMARY.map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}
      </select>
      <select class="filter-sel" id="op-feeder" onchange="window.filterOpTable()">
        <option value="">All Feeders</option>
      </select>
      <select class="filter-sel" id="op-overload" onchange="window.filterOpTable()">
        <option value="">Load: All</option>
        <option value="Yes">Overloaded</option>
        <option value="No">Normal</option>
      </select>
      <select class="filter-sel" id="op-balance" onchange="window.filterOpTable()">
        <option value="">Balance: All</option>
        <option value="Balanced">Balanced</option>
        <option value="Unbalanced">Unbalanced</option>
      </select>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddOpModal()"><i class="fas fa-plus"></i> Add Reading</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.exportOpCSV()"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${(() => {
    const stats = DT_OP_DATA.reduce((acc,r) => {
      const total = totalLoadKva(r.phase_a, r.phase_b, r.phase_c);
      const ov    = overloadState(r.capacity_kva, total);
      const bal   = balanceState(r.phase_a, r.phase_b, r.phase_c);
      if (ov  === 'Yes') acc.over++;
      if (ov  === 'No')  acc.normal++;
      if (bal === 'Unbalanced') acc.unbal++;
      if (bal === 'Balanced')   acc.bal++;
      const t = _phNum(r.oil_temp);
      if (t != null) { acc.tempSum += t; acc.tempN++; }
      acc.measured = acc.measured + (ov || bal ? 1 : 0);
      return acc;
    }, {over:0, normal:0, unbal:0, bal:0, tempSum:0, tempN:0, measured:0});
    const avgTemp = stats.tempN ? (stats.tempSum / stats.tempN).toFixed(1) + '°C' : '—';
    return `<div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
      <div class="kpi-card navy"><div class="kpi-val">${DT_OP_DATA.length.toLocaleString()}</div><div class="kpi-sub">Total Transformers</div></div>
      <div class="kpi-card teal"><div class="kpi-val">${stats.measured.toLocaleString()}</div><div class="kpi-sub">With Readings</div></div>
      <div class="kpi-card red"><div class="kpi-val">${stats.over}</div><div class="kpi-sub">Overloaded</div></div>
      <div class="kpi-card pink"><div class="kpi-val">${stats.unbal}</div><div class="kpi-sub">Unbalanced</div></div>
      <div class="kpi-card green"><div class="kpi-val">${stats.normal}</div><div class="kpi-sub">Normal Load</div></div>
    </div>`;
  })()}

  <div class="panel">
    <div class="panel-head">
      <h3>Operating Value Records</h3>
      <span id="op-count" style="font-size:.82rem;color:var(--text3)">${DT_OP_DATA.length} records</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>GIS ID</th>
          <th>Rating (kVA)</th>
          <th>GIS Location</th>
          <th>Local Name</th>
          <th>Rated Current (A)</th>
          <th class="phA">Phase A (A)</th>
          <th class="phB">Phase B (A)</th>
          <th class="phC">Phase C (A)</th>
          <th>Total kVA</th>
          <th>Overload</th>
          <th>Balance</th>
          <th>Date</th>
          ${currentRole==='admin' ? '<th>Action</th>' : ''}
        </tr>
      </thead>
      <tbody id="op-tbody">
        ${renderOpRows(DT_OP_DATA)}
      </tbody>
    </table>
    </div></div>
  </div>

  <div class="note-bar" style="margin-top:16px">
    <i class="fas fa-calculator"></i>
    <div>
      <strong>Rated Current</strong> = kVA × 1000 / (√3 × 415)
      &nbsp;·&nbsp;
      <strong>Total kVA</strong> = 3 × kVA per phase &nbsp;
      <span style="opacity:.8">(per-phase kVA = (415/√3) × I&nbsp;/&nbsp;1000)</span>
      &nbsp;·&nbsp;
      <strong>Overloaded</strong>: Total kVA &gt; Rated kVA
      &nbsp;·&nbsp;
      <strong>Unbalanced</strong>: any two phase currents differ by ≥ 10 % of the larger
    </div>
  </div>
  `;
}

function _phNum(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(v);
  return isFinite(n) ? n : null;
}

/* Total operating kVA from line currents (3-phase, V_LL = 415 V).
   Sum of per-phase kVAs, where V_phase = 415/√3.                      */
function totalLoadKva(phA, phB, phC) {
  const a = _phNum(phA), b = _phNum(phB), c = _phNum(phC);
  if (a == null || b == null || c == null) return null;
  const Vph = 415 / Math.sqrt(3);
  return +(Vph * (a + b + c) / 1000).toFixed(1);
}

/* Unbalance: any pair of phases differing by ≥ 10 % of the larger.    */
function balanceState(phA, phB, phC) {
  const a = _phNum(phA), b = _phNum(phB), c = _phNum(phC);
  if (a == null || b == null || c == null) return null;
  const pairs = [[a,b],[b,c],[a,c]];
  for (const [x,y] of pairs) {
    const mx = Math.max(x, y);
    if (mx > 0 && Math.abs(x - y) / mx >= 0.10) return 'Unbalanced';
  }
  return 'Balanced';
}

/* Overloaded if measured total kVA exceeds rated kVA.                 */
function overloadState(ratedKva, totalKva) {
  if (ratedKva == null || totalKva == null) return null;
  return totalKva > ratedKva ? 'Yes' : 'No';
}

function ratedCurrent(kva) {
  if (!kva) return null;
  // I_rated = kVA × 1000 / (√3 × 415)
  return +(kva * 1000 / (Math.sqrt(3) * 415)).toFixed(1);
}

function renderOpRows(rows) {
  if (!rows.length) return `<tr><td colspan="14" class="tbl-empty">No operating records.</td></tr>`;
  return rows.map((r,i) => {
    const rated     = ratedCurrent(r.capacity_kva);
    const phA       = _phNum(r.phase_a);
    const phB       = _phNum(r.phase_b);
    const phC       = _phNum(r.phase_c);
    const totalKva  = totalLoadKva(phA, phB, phC);
    const balance   = balanceState(phA, phB, phC);
    const overload  = overloadState(r.capacity_kva, totalKva);
    const phCell = (v, col) => v != null
      ? `<td class="num" style="background:${overload==='Yes'?'rgba(239,68,68,.10)':'transparent'};color:${col};font-weight:700">${v}</td>`
      : '<td class="num">—</td>';
    return `<tr>
      <td>${i+1}</td>
      <td style="font-family:'Courier New',monospace;font-size:.78rem">${D(r.gis_id)}</td>
      <td class="num">${D(r.capacity_kva)}</td>
      <td style="font-size:.76rem">${_dtMapCell(r)}</td>
      <td style="font-size:.8rem" title="${r.local_name||''}">${(r.local_name||'—').substring(0,18)}${(r.local_name||'').length>18?'…':''}</td>
      <td class="num" style="color:#1d4ed8;font-weight:700">${rated||'—'}</td>
      ${phCell(phA,'#dc2626')}
      ${phCell(phB,'#d97706')}
      ${phCell(phC,'#059669')}
      <td class="num"><strong>${totalKva!=null ? totalKva : '—'}</strong></td>
      <td>${overload != null ? `<span class="badge ${overload==='Yes'?'badge-overload':'badge-good'}">${overload==='Yes'?'Overloaded':'Normal'}</span>` : '—'}</td>
      <td>${balance != null ? `<span class="badge ${balance==='Unbalanced'?'badge-unbalanced':'badge-balanced'}">${balance}</span>` : '—'}</td>
      <td style="font-size:.78rem">${D(r.date)}</td>
      ${currentRole==='admin' ? `<td>
        <button class="btn btn-xs btn-secondary" onclick="window.openEditOpModal(${i})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-xs btn-danger"    onclick="window.deleteOpRecord(${i})"  style="margin-left:2px"><i class="fas fa-trash"></i></button>
      </td>` : ''}
    </tr>`;
  }).join('');
}

window.filterOpTable = () => {
  const sddSel    = document.getElementById('op-sdd');
  const feederSel = document.getElementById('op-feeder');
  const sdd    = sddSel ? sddSel.value : '';
  // Repopulate feeder dropdown when SDD changes
  if (feederSel) {
    const wanted = feederSel.value;
    const feeders = sdd
      ? [...new Set(DT_OP_DATA.filter(r => r.sdd_name === sdd).map(r => r.feeder).filter(Boolean))]
      : [];
    feederSel.innerHTML = `<option value="">All Feeders</option>` +
      feeders.map(f => `<option value="${f}" ${f===wanted?'selected':''}>${f}</option>`).join('');
  }
  const feeder = feederSel ? feederSel.value : '';
  const ov     = document.getElementById('op-overload')?.value|| '';
  const balf   = document.getElementById('op-balance')?.value || '';
  const filtered = DT_OP_DATA.filter(r => {
    if (sdd    && r.sdd_name !== sdd)   return false;
    if (feeder && r.feeder  !== feeder) return false;
    if (balf) {
      const bs = balanceState(r.phase_a, r.phase_b, r.phase_c);
      if (bs !== balf) return false;
    }
    const total = totalLoadKva(r.phase_a, r.phase_b, r.phase_c);
    const ovState = overloadState(r.capacity_kva, total);
    if (ov === 'Yes' && ovState !== 'Yes') return false;
    if (ov === 'No'  && ovState !== 'No' ) return false;
    return true;
  });
  document.getElementById('op-tbody').innerHTML = renderOpRows(filtered);
  document.getElementById('op-count').textContent = filtered.length + ' records';
};

window.openAddOpModal = () => {
  window.openModal('Add Operating Value Reading', `
  <form id="op-form" onsubmit="window.saveOpRecord(event)">
    <div class="form-row cols-3">
      <div class="fg"><label>GIS ID <span class="req">*</span></label><input required name="gis_id" placeholder="e.g. 2085135"></div>
      <div class="fg"><label>Capacity (kVA)</label>
        <select name="capacity_kva"><option value="">—</option>${[50,100,200,250,315,500].map(k=>`<option>${k}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>Date <span class="req">*</span></label><input required type="date" name="date"></div>
    </div>
    <div class="form-row cols-2">
      <div class="fg"><label>GIS Location</label><input name="gis_location"></div>
      <div class="fg"><label>Local Name</label><input name="local_name"></div>
    </div>
    <div class="form-row cols-4" style="gap:8px">
      <div class="fg">
        <label style="color:#ef4444">Phase A Current (A)</label>
        <input type="number" step="0.01" name="phase_a" style="border-color:#ef4444">
      </div>
      <div class="fg">
        <label style="color:#f59e0b">Phase B Current (A)</label>
        <input type="number" step="0.01" name="phase_b" style="border-color:#f59e0b">
      </div>
      <div class="fg">
        <label style="color:#10b981">Phase C Current (A)</label>
        <input type="number" step="0.01" name="phase_c" style="border-color:#10b981">
      </div>
      <div class="fg"><label>Oil Temperature (°C)</label><input type="number" step="0.1" name="oil_temp"></div>
    </div>
    <div class="form-row cols-2">
      <div class="fg"><label>SDD/ESU</label>
        <select name="sdd_name"><option value="">—</option>${OVERALL_SUMMARY.map(s=>`<option>${s.name}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>Feeder</label><input name="feeder" placeholder="Feeder name"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
    </div>
  </form>`);
};

window.saveOpRecord = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const r  = Object.fromEntries(fd.entries());
  ['phase_a','phase_b','phase_c','oil_temp','capacity_kva'].forEach(k => { if(r[k]) r[k] = parseFloat(r[k]); });
  if (IS_CONFIGURED) {
    const {addDoc, collection, serverTimestamp} = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await addDoc(collection(db,'dt_operating'), {...r, createdAt: serverTimestamp()});
  }
  DT_OP_DATA.push(r);
  window.closeModal();
  showToast('Operating record saved!','success');
  renderDTOperating();
};

window.openEditOpModal = (idx) => {
  const r = DT_OP_DATA[idx];
  if (!r) return;
  window.openModal('Edit Operating Record', `
  <form id="op-edit-form" onsubmit="window.updateOpRecord(event,${idx})">
    <div class="form-row cols-3">
      <div class="fg"><label>GIS ID</label><input name="gis_id" value="${r.gis_id||''}"></div>
      <div class="fg"><label>Capacity (kVA)</label>
        <select name="capacity_kva">${[50,100,200,250,315,500].map(k=>`<option value="${k}" ${r.capacity_kva==k?'selected':''}>${k}</option>`).join('')}</select>
      </div>
      <div class="fg"><label>Date</label><input type="date" name="date" value="${r.date||''}"></div>
    </div>
    <div class="form-row cols-4" style="gap:8px">
      <div class="fg"><label style="color:#ef4444">Phase A (A)</label><input type="number" step="0.01" name="phase_a" value="${r.phase_a||''}" style="border-color:#ef4444"></div>
      <div class="fg"><label style="color:#f59e0b">Phase B (A)</label><input type="number" step="0.01" name="phase_b" value="${r.phase_b||''}" style="border-color:#f59e0b"></div>
      <div class="fg"><label style="color:#10b981">Phase C (A)</label><input type="number" step="0.01" name="phase_c" value="${r.phase_c||''}" style="border-color:#10b981"></div>
      <div class="fg"><label>Oil Temp (°C)</label><input type="number" step="0.1" name="oil_temp" value="${r.oil_temp||''}"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button>
    </div>
  </form>`);
};

window.updateOpRecord = async (e, idx) => {
  e.preventDefault();
  const fd  = new FormData(e.target);
  const upd = Object.fromEntries(fd.entries());
  ['phase_a','phase_b','phase_c','oil_temp','capacity_kva'].forEach(k => { if(upd[k]) upd[k] = parseFloat(upd[k]); });
  Object.assign(DT_OP_DATA[idx], upd);
  window.closeModal();
  showToast('Updated!','success');
  renderDTOperating();
};

window.deleteOpRecord = (idx) => {
  if (!confirm('Delete this reading?')) return;
  DT_OP_DATA.splice(idx,1);
  showToast('Deleted.','success');
  renderDTOperating();
};

window.exportOpCSV = () => {
  const rows = [['GIS ID','Rating (kVA)','Local Name','Rated Current (A)','Phase A','Phase B','Phase C','Total kVA','Overload','Oil Temp (°C)','Date']];
  DT_OP_DATA.forEach(r => {
    const rated = ratedCurrent(r.capacity_kva);
    const phA=parseFloat(r.phase_a)||null,phB=parseFloat(r.phase_b)||null,phC=parseFloat(r.phase_c)||null;
    const maxPh=Math.max(phA||0,phB||0,phC||0);
    const totalKva=(phA&&phB&&phC)?+(3*(phA+phB+phC)/3*400/1000).toFixed(1):null;
    const ov=rated&&maxPh>rated?'Yes':(maxPh>0?'No':'');
    rows.push([r.gis_id,r.capacity_kva,r.local_name,rated,phA,phB,phC,totalKva,ov,r.oil_temp,r.date]);
  });
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.map(r=>r.map(v=>v==null?'':v).join(',')).join('\n')],{type:'text/csv'})),download:'dt_operating_values.csv'});
  a.click(); showToast('Exported!','success');
};


window.openAddDTLoadModal = (ssId) => {
  window.openModal('Add DT Load Record', `
  <form id="dtload-form" onsubmit="window.saveDTLoad(event,'${ssId}')">
    <div class="form-row cols-3">
      <div class="fg"><label>Transformer GIS ID <span class="req">*</span></label><input required name="gis_id" placeholder="e.g. 2085135"></div>
      <div class="fg"><label>Location</label><input name="location" placeholder="e.g. Hanufar Mor West"></div>
      <div class="fg"><label>Name</label><input name="name" placeholder="Local name"></div>
    </div>
    <div class="form-row cols-3">
      <div class="fg"><label>Capacity (kVA)</label><input type="number" name="capacity_kva" placeholder="e.g. 250"></div>
      <div class="fg"><label>Per Phase Rated Current (A)</label><input type="number" step="0.01" name="rated_current" placeholder="e.g. 360.8"></div>
      <div class="fg"><label>Date of Measurement <span class="req">*</span></label><input required type="date" name="date"></div>
    </div>
    <div class="form-row cols-4">
      <div class="fg"><label>Phase A Current (A)</label><input type="number" step="0.01" name="phase_a"></div>
      <div class="fg"><label>Phase B Current (A)</label><input type="number" step="0.01" name="phase_b"></div>
      <div class="fg"><label>Phase C Current (A)</label><input type="number" step="0.01" name="phase_c"></div>
      <div class="fg"><label>Neutral Current (A)</label><input type="number" step="0.01" name="neutral"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Record</button>
    </div>
  </form>`);
};

window.saveDTLoad = async (e, ssId) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const record = Object.fromEntries(fd.entries());
  record.substation_id = ssId;
  ['capacity_kva','rated_current','phase_a','phase_b','phase_c','neutral'].forEach(k => {
    record[k] = record[k] ? parseFloat(record[k]) : null;
  });
  if (IS_CONFIGURED) await addDoc(collection(db,'dt_load'),{...record,createdAt:serverTimestamp()});
  DT_LOAD_DATA.push(record);
  window.closeModal();
  showToast('Load record saved!','success');
  renderDTLoad(ssId);
};

window.deleteDTLoad = (idx, ssId) => {
  if (!confirm('Delete this record?')) return;
  const allIdx = DT_LOAD_DATA.findIndex((r,i)=>r.substation_id===ssId&&i===idx);
  DT_LOAD_DATA.splice(allIdx, 1);
  showToast('Deleted.','success');
  renderDTLoad(ssId);
};

/* ══════════════════════════════════════════════════
   SECTION 15 — DT EQUIPMENT (LA/DOFC/MCCB)
══════════════════════════════════════════════════ */
function renderDTEquipment() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — Equipment Status</h2>
      <p>LA, DOFC, MCCB, Grounding &amp; LT Loop — Talaimary SS</p>
    </div>
    <div class="sec-head-right">
      <input class="search-input" id="dt-search" placeholder="🔍 Search…" oninput="window.filterDtTable()" style="max-width:200px">
      <select class="filter-sel" id="dt-feeder-filter" onchange="window.filterDtTable()">
        <option value="">All Feeders</option>${FEEDER_SUMMARY.map(f=>`<option>${f.name}</option>`).join('')}
      </select>
      <select class="filter-sel" id="dt-la-filter" onchange="window.filterDtTable()">
        <option value="">LA: All</option>
        <option value="Yes">Present</option>
        <option value="No">Absent</option>
      </select>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddDTModal()"><i class="fas fa-plus"></i> Add</button>` : ''}
    </div>
  </div>

  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3>Equipment Coverage by Feeder</h3></div>
    <div class="panel-body"><div class="chart-container chart-sm"><canvas id="chart-dt-eq"></canvas></div></div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <h3>Individual Transformer Records
        <span id="dt-count" style="font-weight:400;color:var(--text3);font-size:.85rem">(${SAMPLE_TRANSFORMERS.length} sample records)</span>
      </h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sl.</th><th>Feeder</th><th>GIS ID</th><th>Local Name</th><th>kVA</th><th>11kV LA</th><th>11kV DOFC</th><th>0.4kV MCCB</th><th>Grounding</th><th>LT Loop</th><th>Remarks</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
      <tbody id="dt-tbody">${renderDtRows(SAMPLE_TRANSFORMERS)}</tbody>
    </table>
    </div></div>
  </div>
  `;

  setTimeout(() => {
    const ctx = document.getElementById('chart-dt-eq');
    if (!ctx) return;
    const vf = FEEDER_SUMMARY.filter(f=>f.cap_mva<100);
    charts['dt-eq'] = new Chart(ctx, {
      type:'bar',
      data:{labels:vf.map(f=>f.name), datasets:[
        {label:'LA',   data:vf.map(f=>Math.round(f.la/f.count*100)),   backgroundColor:'rgba(220,38,38,.75)'},
        {label:'DOFC', data:vf.map(f=>Math.round(f.dofc/f.count*100)), backgroundColor:'rgba(217,119,6,.75)'},
        {label:'MCCB', data:vf.map(f=>Math.round(f.mccb/f.count*100)), backgroundColor:'rgba(124,58,237,.75)'},
        {label:'Grounding',data:vf.map(f=>Math.round(f.gnd/f.count*100)),backgroundColor:'rgba(5,150,105,.75)'},
      ]},
      options:{responsive:true,maintainAspectRatio:false,scales:{y:{max:100,title:{display:true,text:'% of Transformers'}}},plugins:{legend:{position:'top'}}}
    });
  }, 100);
}

function renderDtRows(rows) {
  if (!rows.length) return `<tr><td colspan="12" class="tbl-empty">No records found.</td></tr>`;
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
    <td style="font-size:.78rem;color:var(--text3)">${t.remarks||'—'}</td>
    ${currentRole==='admin'?`<td>
      <button class="btn btn-xs btn-secondary" onclick="window.openEditDTModal('${t.gis_id}')"><i class="fas fa-edit"></i></button>
    </td>`:''}
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

/* ══════════════════════════════════════════════════
   SECTION 16 — ONGOING PROJECTS
   (ADB Project data from PDFs)
══════════════════════════════════════════════════ */
function renderOngoing() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Ongoing Projects</h2>
      <p>ADB Funded Project — NESCO Distribution Network Improvement</p>
    </div>
    ${currentRole==='admin' ? `<div class="sec-head-right"><button class="btn btn-primary btn-sm" onclick="window.openAddProjectModal()"><i class="fas fa-plus"></i> Add Project</button></div>` : ''}
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${ADB_NEW_GIS.length}</div><div class="kpi-sub">New GIS Substations</div></div>
    <div class="kpi-card"><div class="kpi-val">${ADB_NEW_AIS.length}</div><div class="kpi-sub">New AIS Substations</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${ADB_UPGRADES.length}</div><div class="kpi-sub">Capacity Upgradations</div></div>
    <div class="kpi-card"><div class="kpi-val">${ADB_NEW_GIS_SWITCHING.length}</div><div class="kpi-sub">New GIS Switching SS</div></div>
    <div class="kpi-card"><div class="kpi-val">${ADB_NEW_AIS_SWITCHING.length}</div><div class="kpi-sub">New AIS Switching SS</div></div>
  </div>

  <!-- New GIS SS -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">NEW 33/11 kV GIS SUBSTATIONS — 3 Nos.</h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sr.</th><th>Name of Substation</th><th>SDD</th><th>Capacity</th><th>Location</th><th>Status</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
      <tbody>
        ${ADB_NEW_GIS.map(s=>`<tr>
          <td>${s.sr}</td><td><strong>${s.name}</strong></td><td>${s.sdd}</td>
          <td class="num">${s.capacity} MVA</td><td>${s.location}</td>
          <td><span class="badge badge-partial">In Progress</span></td>
          ${currentRole==='admin'?`<td><button class="btn btn-xs btn-secondary"><i class="fas fa-edit"></i></button></td>`:''}
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- New AIS SS -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">NEW 33/11 kV AIS SUBSTATIONS — 3 Nos.</h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sr.</th><th>Name of Substation</th><th>SDD</th><th>Capacity</th><th>Location</th><th>Status</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
      <tbody>
        ${ADB_NEW_AIS.map(s=>`<tr>
          <td>${s.sr}</td><td><strong>${s.name}</strong></td><td>${s.sdd}</td>
          <td class="num">${s.capacity} MVA</td><td>${s.location}</td>
          <td><span class="badge badge-partial">In Progress</span></td>
          ${currentRole==='admin'?`<td><button class="btn btn-xs btn-secondary"><i class="fas fa-edit"></i></button></td>`:''}
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- Upgradations -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">33/11 kV AIS SUBSTATIONS CAPACITY UPGRADATION — 10 Nos.</h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sr.</th><th>Name of Substation</th><th>SDD</th><th>Upgradation Capacity</th><th>Location</th><th>Status</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
      <tbody>
        ${ADB_UPGRADES.map(s=>`<tr>
          <td>${s.sr}</td><td><strong>${s.name}</strong></td><td>${s.sdd}</td>
          <td class="num">${s.upgrade} MVA</td><td>${s.location}</td>
          <td><span class="badge badge-partial">In Progress</span></td>
          ${currentRole==='admin'?`<td><button class="btn btn-xs btn-secondary"><i class="fas fa-edit"></i></button></td>`:''}
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- New GIS Switching SS -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">NEW 33 kV GIS SWITCHING SUBSTATIONS — 3 Nos.</h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sr.</th><th>Grid SS Name</th><th>Name of Switching SS</th><th>Location</th><th>Status</th></tr></thead>
      <tbody>
        ${ADB_NEW_GIS_SWITCHING.map(s=>`<tr>
          <td>${s.sr}</td><td>${s.grid}</td><td><strong>${s.name}</strong></td>
          <td>${s.location}</td><td><span class="badge badge-partial">In Progress</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- New AIS Switching SS -->
  <div class="panel">
    <div class="panel-head" style="background:var(--navy);color:#fff">
      <h3 style="color:#fff;font-size:.85rem">NEW 33 kV AIS SWITCHING SUBSTATIONS — 2 Nos.</h3>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sr.</th><th>Grid SS Name</th><th>Name of Switching SS</th><th>Location</th><th>Status</th></tr></thead>
      <tbody>
        ${ADB_NEW_AIS_SWITCHING.map(s=>`<tr>
          <td>${s.sr}</td><td>${s.grid}</td><td><strong>${s.name}</strong></td>
          <td>${s.location}</td><td><span class="badge badge-partial">In Progress</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

/* ══════════════════════════════════════════════════
   SECTION 17 — UPCOMING PROJECTS
══════════════════════════════════════════════════ */
const UPCOMING_PROJECTS = [
  {name:'Paba New 33/11 kV Substation',        location:'Paba, Rajshahi',     status:'Design Phase', budget_lac:1800, description:'New substation to reduce load on Talaimary.'},
  {name:'Motihar Underground Cable',             location:'Motihar, Rajshahi',  status:'DPP Approved', budget_lac:650,  description:'Underground cabling for Motihar feeder.'},
  {name:'Chandipur–Rajshahi Ring Line',          location:'Rajshahi City',      status:'Planning',     budget_lac:420,  description:'33 kV ring line between Chandipur and Talaimary substations.'},
  {name:'SCADA Integration — Rajshahi Zone',    location:'Rajshahi Zone',      status:'DPP Approved', budget_lac:2400, description:'Full SCADA for remote monitoring and control of all zone substations.'},
];

function renderUpcoming() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Upcoming Projects</h2><p>Planned infrastructure developments</p></div>
    ${currentRole==='admin' ? `<div class="sec-head-right"><button class="btn btn-primary btn-sm" onclick="window.openAddUpcomingModal()"><i class="fas fa-plus"></i> Add Project</button></div>` : ''}
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(3,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${UPCOMING_PROJECTS.length}</div><div class="kpi-sub">Upcoming Projects</div></div>
    <div class="kpi-card amber"><div class="kpi-val">৳${UPCOMING_PROJECTS.reduce((s,p)=>s+p.budget_lac,0).toLocaleString()}</div><div class="kpi-sub">Total Budget (Lac BDT)</div></div>
    <div class="kpi-card"><div class="kpi-val">${UPCOMING_PROJECTS.filter(p=>p.status==='DPP Approved').length}</div><div class="kpi-sub">DPP Approved</div></div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>Upcoming Projects List</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Sl.</th><th>Project Name</th><th>Location</th><th>Status</th><th>Budget (Lac BDT)</th><th>Description</th>${currentRole==='admin'?'<th>Action</th>':''}</tr></thead>
      <tbody>
        ${UPCOMING_PROJECTS.map((p,i)=>`<tr>
          <td>${i+1}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.location}</td>
          <td><span class="badge ${p.status==='DPP Approved'?'badge-blue':p.status==='Planning'?'badge-gray':'badge-partial'}">${p.status}</span></td>
          <td class="num">${p.budget_lac.toLocaleString()}</td>
          <td style="font-size:.82rem;color:var(--text3)">${p.description}</td>
          ${currentRole==='admin'?`<td><button class="btn btn-xs btn-secondary" onclick="window.openEditUpcomingModal(${i})"><i class="fas fa-edit"></i></button></td>`:''}
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

/* ══════════════════════════════════════════════════
   SECTION 18 — LOAD HISTORY
   §7: NESCO-wide last 5 fiscal years of total Maximum Demand,
        rendered as a single clean chart above the existing
        Talaimary monthly drill-down.
══════════════════════════════════════════════════ */
function _renderNESCOFiveYearLoadChart() {
  // Pull "Maximum Demand (MW)" series out of homepage-data.json and take
  // the last 5 fiscal years.
  if (!HOME_DATA) {
    return `<div class="panel" style="margin-bottom:18px"><div class="panel-body" style="text-align:center;color:var(--text3);font-size:.9rem">Homepage data not loaded yet — NESCO 5-year demand chart unavailable.</div></div>`;
  }
  const demand = HOME_DATA.metrics.find(m =>
    /maximum demand/i.test(m.label));
  if (!demand) return '';
  const years = HOME_DATA.years.slice(-5);
  const values = demand.values.slice(-5).map(v => {
    const m = String(v).replace(/,/g,'').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : null;
  });
  const peak = Math.max(...values.filter(v => v != null));
  return `
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head">
        <h3><i class="fas fa-chart-line"></i> NESCO Total Maximum Demand — Last 5 Fiscal Years</h3>
        <span style="font-size:.78rem;color:var(--text3)">Peak: <strong>${peak} MW</strong></span>
      </div>
      <div class="panel-body">
        <div style="height:320px;position:relative"><canvas id="nesco-5y-load"></canvas></div>
      </div>
    </div>`;
}

function renderLoadHistory() {
  // §7 — only the NESCO-wide last-5-FY maximum demand chart on this page.
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Load History</h2>
      <p>NESCO-wide annual peak demand — last 5 fiscal years.</p>
    </div>
  </div>

  ${_renderNESCOFiveYearLoadChart()}
  `;
  setTimeout(() => {
    const ctxN = document.getElementById('nesco-5y-load');
    if (!ctxN || !HOME_DATA) return;
    const demand = HOME_DATA.metrics.find(m => /maximum demand/i.test(m.label));
    if (!demand) return;
    const yrs = HOME_DATA.years.slice(-5);
    const vals = demand.values.slice(-5).map(v => {
      const m = String(v).replace(/,/g,'').match(/[\d.]+/);
      return m ? parseFloat(m[0]) : null;
    });
    charts['nesco5y'] = new Chart(ctxN, {
      type: 'line',
      data: {
        labels: yrs.map(y => `FY ${y}`),
        datasets: [{
          label: 'Maximum Demand (MW)',
          data: vals,
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29,78,216,.18)',
          fill: true, tension: 0.32, pointRadius: 6, pointHoverRadius: 8,
          pointBackgroundColor: '#1e3a8a',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.parsed.y} MW` } },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: false, title: { display: true, text: 'Maximum Demand (MW)' } },
        },
      },
    });
  }, 100);
}


/* ══════════════════════════════════════════════════
   SECTION 18b — COMBINED ALL-SUBSTATION VIEWS
   Each shows data for ALL substations in one table
══════════════════════════════════════════════════ */

/* ── Helpers ── */
function ssSearchBar(filterId, placeholder) {
  return `<input class="search-input" id="${filterId}" placeholder="${placeholder}"
    oninput="window.filterCombinedTable('${filterId}')" style="max-width:280px">`;
}

function kpiRow(items) {
  return `<div class="kpi-row" style="grid-template-columns:repeat(${items.length},1fr);margin-bottom:20px">
    ${items.map(([val,lbl,cls])=>`<div class="kpi-card ${cls||''}"><div class="kpi-val">${val}</div><div class="kpi-sub">${lbl}</div></div>`).join('')}
  </div>`;
}

/* ── §6d PT filter bar — only on Power Transformer submenu pages ──
   Real-time filters that combine with AND logic on top of any other
   filters (type, search). Renders manufacturing-year buckets + a feeder
   length slider. */
const PT_FILTER_DEFAULTS = { mfgYear: '', feederLenMax: 100 };
function combPTFilterBar() {
  return `
    <div class="pt-filter-bar" style="grid-column:1/-1">
      <div class="fg">
        <label><i class="fas fa-calendar-day"></i> TX Manufacturing Year</label>
        <select class="filter-sel" id="pt-mfg-year" onchange="window.filterCombinedTable('comb-search')">
          <option value="">All years</option>
          <option value="lt2000">Before 2000</option>
          <option value="2000_2010">2000 – 2010</option>
          <option value="2010_2020">2010 – 2020</option>
          <option value="ge2020">2020 and later</option>
        </select>
      </div>
      <div class="fg">
        <label><i class="fas fa-road"></i> Max 11 kV Feeder Length <span class="range-val" id="pt-feeder-val">100 km</span></label>
        <div class="range-line">
          <input type="range" id="pt-feeder-len" min="1" max="100" value="100"
                 oninput="document.getElementById('pt-feeder-val').textContent=this.value+' km'; window.filterCombinedTable('comb-search')">
        </div>
      </div>
      <div class="fg" style="justify-content:end">
        <button type="button" class="btn btn-sm btn-secondary" onclick="window.ptResetFilters()">
          <i class="fas fa-rotate-left"></i> Reset PT filters
        </button>
      </div>
    </div>`;
}
window.ptResetFilters = () => {
  const my = document.getElementById('pt-mfg-year');
  const fl = document.getElementById('pt-feeder-len');
  const fv = document.getElementById('pt-feeder-val');
  if (my) my.value = '';
  if (fl) fl.value = PT_FILTER_DEFAULTS.feederLenMax;
  if (fv) fv.textContent = PT_FILTER_DEFAULTS.feederLenMax + ' km';
  window.filterCombinedTable('comb-search');
};

/* Helper: does a TX object pass the active PT filters?
   Used by filterCombinedTable when on all-pt-sw or all-pt-load. */
function _passesPTFilters(t) {
  const mfg = (document.getElementById('pt-mfg-year') || {}).value || '';
  const feederCap = parseInt((document.getElementById('pt-feeder-len') || {}).value || '100', 10);

  // Mfg year (look at TX year OR cb_year as fallback)
  if (mfg) {
    const yr = parseInt(t.year || t.cb_year || 0, 10);
    if (!yr) return false;
    if (mfg === 'lt2000'    && !(yr < 2000))                return false;
    if (mfg === '2000_2010' && !(yr >= 2000 && yr <= 2010)) return false;
    if (mfg === '2010_2020' && !(yr >  2010 && yr <= 2020)) return false;
    if (mfg === 'ge2020'    && !(yr >= 2020))               return false;
  }

  // Feeder length cap — keep TX if its longest associated 11 kV feeder is
  // within the cap (across the parent substation).
  if (feederCap < 100) {
    const ss = ALL_SUBSTATIONS.find(s => s.id === t.ss_id);
    const maxLen = ss
      ? Math.max(0, ...((ss.feeders_11kv || []).filter(f => f.transformer === t.name)
                                              .map(f => parseFloat(f.length_km) || 0)))
      : 0;
    if (maxLen > feederCap) return false;
  }
  return true;
}

/* ══════════════════════════════════════════════════
   ALL-SS: 33 kV LINE FEEDER & EQUIPMENT
══════════════════════════════════════════════════ */
function renderAll33kv() {
  const allLines = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.lines_33kv||[]).map(l => ({...l, ss_name: ss.name||ss.sheet_name, ss_id: ss.id}))
  );
  window._combined = allLines;

  const totalLen  = allLines.reduce((s,l)=>s+(parseFloat(l.length_km)||0),0);
  const sources   = allLines.filter(l=>(l.source_ring||l.remarks||'').toLowerCase().includes('source')).length;
  const rings     = allLines.filter(l=>(l.source_ring||l.remarks||'').toLowerCase().includes('ring')).length;
  const marlin    = allLines.filter(l=>(l.conductor||'').toLowerCase().includes('marlin')).length;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>33 kV Line Feeder &amp; Equipment — All Substations</h2>
      <p>${allLines.length} lines across ${ALL_SUBSTATIONS.length} substations</p>
    </div>
    <div class="sec-head-right">
      ${ssSearchBar('comb-search','🔍 Search substation or line…')}
      <select class="filter-sel" id="comb-type-filter" onchange="window.filterCombinedTable('comb-search')">
        <option value="">All Types</option>
        <option value="source">Source Lines</option>
        <option value="ring">Ring Lines</option>
      </select>
      <button class="btn btn-sm btn-secondary" onclick="window.exportCombinedCSV('33kv_lines')"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${kpiRow([
    [allLines.length, 'Total Lines', 'navy'],
    [sources,         'Source Lines', ''],
    [rings,           'Ring Lines', ''],
    [totalLen.toFixed(1)+' km', 'Total Length', 'amber'],
    [marlin,          'Old Marlin Conductor', 'red'],
  ])}

  <div class="panel">
    <div class="panel-head">
      <h3>All 33 kV Lines</h3>
      <span id="comb-count" style="font-size:.82rem;color:var(--text3)">${allLines.length} records</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation</th>
          <th>Name of the Feeder / Line</th>
          <th>Source / Ring</th>
          <th>Length (km)</th>
          <th>Conductor</th>
          <th>Circuit Breaker</th>
          <th>PCM Panel</th>
          <th>Remarks</th>
          <th>Map</th>
        </tr>
      </thead>
      <tbody id="comb-tbody">
        ${render33kvRows(allLines)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function render33kvRows(rows) {
  if (!rows.length) return `<tr><td colspan="10" class="tbl-empty">No records found.</td></tr>`;
  return rows.map((l,i) => {
    const isSource = (l.source_ring||l.remarks||'').toLowerCase().includes('source');
    const isRing   = (l.source_ring||l.remarks||'').toLowerCase().includes('ring');
    const typeLabel = isSource ? 'Source' : isRing ? 'Ring' : D(l.source_ring);
    const typeBadge = isSource ? 'badge-blue' : 'badge-gray';
    return `<tr>
      <td>${i+1}</td>
      <td>
        <a href="#" onclick="window.showSection('ss-detail','${l.ss_id}');return false"
           style="color:var(--blue);font-weight:600;font-size:.82rem">${l.ss_name}</a>
      </td>
      <td><strong>${D(l.name)}</strong></td>
      <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
      <td class="num">${l.length_km!=null ? l.length_km+' km' : '—'}</td>
      <td>${D(l.conductor)}</td>
      <td>${D(l.breaker)}</td>
      <td>${D(l.panel)}</td>
      <td style="font-size:.78rem;color:var(--text3)">${D(l.remarks)}</td>
      <td>${l.ss_gps_lat ? `<a href="https://maps.google.com/?q=${l.ss_gps_lat},${l.ss_gps_lng}" target="_blank"><i class="fas fa-map-marker-alt" style="color:var(--red2)"></i></a>` : '—'}</td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════════════
   ALL-SS: POWER TRANSFORMER FEEDER EQUIPMENT
   (CB, CT, PCM Panel info)
══════════════════════════════════════════════════ */
function renderAllPTSw() {
  const allTxs = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.power_transformers||[]).map(t => ({...t, ss_name: ss.name||ss.sheet_name, ss_id: ss.id}))
  );
  window._combined = allTxs;

  const brands   = [...new Set(allTxs.map(t=>t.brand||t.breaker).filter(Boolean))].length;
  const gisCount = allTxs.filter(t=>(t.ais_gis||'').toUpperCase()==='GIS').length;
  const aged     = allTxs.filter(t=>t.year && parseInt(t.year)<2000).length;
  const newTx    = allTxs.filter(t=>t.year && parseInt(t.year)>=2020).length;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Power Transformer Feeder Equipment — All Substations</h2>
      <p>${allTxs.length} power transformers across ${ALL_SUBSTATIONS.length} substations</p>
    </div>
    <div class="sec-head-right">
      ${ssSearchBar('comb-search','🔍 Search substation or brand…')}
      ${combPTFilterBar()}
      <select class="filter-sel" id="comb-type-filter" onchange="window.filterCombinedTable('comb-search')">
        <option value="">AIS / GIS: All</option>
        <option value="AIS">AIS</option>
        <option value="GIS">GIS</option>
      </select>
      <button class="btn btn-sm btn-secondary" onclick="window.exportCombinedCSV('pt_equipment')"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${kpiRow([
    [allTxs.length, 'Total Power TXs', 'navy'],
    [gisCount,      'GIS Type', 'blue'],
    [aged,          'Aged (Pre-2000)', 'red'],
    [newTx,         'New (2020+)', 'green'],
    [brands,        'CB/Panel Brands', ''],
  ])}

  <div class="panel">
    <div class="panel-head">
      <h3>Power Transformer — CB &amp; Panel (Feeder Equipment)</h3>
      <span id="comb-count" style="font-size:.82rem;color:var(--text3)">${allTxs.length} records</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation</th>
          <th>TX Name</th>
          <th>Capacity (MVA)</th>
          <th>AIS / GIS</th>
          <th>CB Type</th>
          <th>CB Manufacturer</th>
          <th>CB Mfg. Year</th>
          <th>CT Manufacturer</th>
          <th>CT Mfg. Year</th>
          <th>PCM Panel Mfr.</th>
          <th>PCM Panel Year</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody id="comb-tbody">
        ${renderPTSwRows(allTxs)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function renderPTSwRows(rows) {
  if (!rows.length) return `<tr><td colspan="13" class="tbl-empty">No records found.</td></tr>`;
  return rows.map((t,i) => `<tr>
    <td>${i+1}</td>
    <td>
      <a href="#" onclick="window.showSection('ss-detail','${t.ss_id}');return false"
         style="color:var(--blue);font-weight:600;font-size:.82rem">${t.ss_name}</a>
    </td>
    <td><strong>${D(t.name)}</strong></td>
    <td class="num">${D(t.capacity)}</td>
    <td><span class="badge ${(t.ais_gis||'')=='GIS'?'badge-blue':'badge-gray'}">${D(t.ais_gis)}</span></td>
    <td>${D(t.cb_type)}</td>
    <td>${D(t.breaker)}</td>
    <td>${D(t.cb_year||t.year)}</td>
    <td>${D(t.ct_manufacturer)}</td>
    <td>${D(t.ct_year)}</td>
    <td>${D(t.panel)}</td>
    <td>${D(t.panel_year||t.year)}</td>
    <td style="font-size:.78rem;color:var(--text3)">${D(t.comment)}</td>
  </tr>`).join('');
}

/* ══════════════════════════════════════════════════
   ALL-SS: POWER TRANSFORMER LOADING & OPERATING PARAMETERS
══════════════════════════════════════════════════ */
function renderAllPTLoad() {
  const allTxs = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.power_transformers||[]).map(t => ({...t, ss_name: ss.name||ss.sheet_name, ss_id: ss.id}))
  );
  window._combined = allTxs;

  const withLoad   = allTxs.filter(t=>t.max_load_mw!=null);
  const overloaded = withLoad.filter(t=>{
    const cap=parseFloat(t.capacity||0), load=parseFloat(t.max_load_mw||0);
    return cap&&load&&(load/cap*100)>80;
  }).length;
  const totalLoad  = withLoad.reduce((s,t)=>s+(parseFloat(t.max_load_mw)||0),0);

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Power Transformer Loading &amp; Operating Parameters — All Substations</h2>
      <p>${allTxs.length} power transformers · ${withLoad.length} with load data</p>
    </div>
    <div class="sec-head-right">
      ${ssSearchBar('comb-search','🔍 Search substation or manufacturer…')}
      ${combPTFilterBar()}
      <select class="filter-sel" id="comb-type-filter" onchange="window.filterCombinedTable('comb-search')">
        <option value="">All</option>
        <option value="overloaded">Overloaded (&gt;80%)</option>
        <option value="high">High Load (60–80%)</option>
        <option value="normal">Normal (&lt;60%)</option>
      </select>
      <button class="btn btn-sm btn-secondary" onclick="window.exportCombinedCSV('pt_loading')"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${kpiRow([
    [allTxs.length,          'Total Power TXs',      'navy'],
    [totalLoad.toFixed(0)+' MW', 'Total Load (MW)',   'amber'],
    [overloaded,             'Overloaded (&gt;80%)',  'red'],
    [withLoad.length - overloaded, 'Normal Load',     'green'],
    [allTxs.length - withLoad.length, 'No Load Data', ''],
  ])}

  <div class="panel">
    <div class="panel-head">
      <h3>Power Transformer — Loading &amp; Operating Parameters</h3>
      <span id="comb-count" style="font-size:.82rem;color:var(--text3)">${allTxs.length} records</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation</th>
          <th>TX Name</th>
          <th>Capacity (MVA)</th>
          <th>Max Load (MW)</th>
          <th>Loading %</th>
          <th>% Impedance</th>
          <th>Manufacturer</th>
          <th>Mfg. Year</th>
          <th>OLTC Mfr.</th>
          <th>Oil BDV</th>
          <th>OTI Highest (°C)</th>
          <th>OTI Date</th>
          <th>HT WTI (°C)</th>
          <th>HT WTI Date</th>
          <th>LT WTI (°C)</th>
          <th>LT WTI Date</th>
        </tr>
      </thead>
      <tbody id="comb-tbody">
        ${renderPTLoadRows(allTxs)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function renderPTLoadRows(rows) {
  if (!rows.length) return `<tr><td colspan="17" class="tbl-empty">No records found.</td></tr>`;
  return rows.map((t,i) => {
    const cap  = parseFloat(t.capacity||0);
    const load = parseFloat(t.max_load_mw||0);
    const pct  = cap&&load ? Math.round(load/cap*100) : null;
    const pctColor = pct>80?'var(--red2)':pct>60?'var(--amber2)':'var(--green2)';
    return `<tr>
      <td>${i+1}</td>
      <td>
        <a href="#" onclick="window.showSection('ss-detail','${t.ss_id}');return false"
           style="color:var(--blue);font-weight:600;font-size:.82rem">${t.ss_name}</a>
      </td>
      <td><strong>${D(t.name)}</strong></td>
      <td class="num">${D(t.capacity)}</td>
      <td class="num">${t.max_load_mw!=null ? t.max_load_mw+' MW' : '—'}</td>
      <td>${pct!=null ? `<div style="display:flex;align-items:center;gap:6px">
        <div class="progress-bar" style="width:55px"><div class="progress-fill ${pct>80?'danger':pct>60?'warn':'ok'}" style="width:${pct}%"></div></div>
        <span style="font-size:.78rem;font-weight:700;color:${pctColor}">${pct}%</span>
      </div>` : '—'}</td>
      <td class="num">${t.impedance_pct!=null ? t.impedance_pct+'%' : D(t.impedance)}</td>
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
  }).join('');
}

/* ══════════════════════════════════════════════════
   ALL-SS: 11 kV FEEDER INFO
══════════════════════════════════════════════════ */
function renderAll11kv() {
  const allFeeders = ALL_SUBSTATIONS.flatMap(ss =>
    (ss.feeders_11kv||[]).map(f => ({...f, ss_name: ss.name||ss.sheet_name, ss_id: ss.id}))
  );
  window._combined = allFeeders;

  const totalLen  = allFeeders.reduce((s,f)=>s+(parseFloat(f.length_km)||0),0);
  const highLoad  = allFeeders.filter(f=>f.max_load_mw!=null && f.max_load_mw>=3).length;
  const longLines = allFeeders.filter(f=>f.length_km!=null  && f.length_km>=50).length;

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>11 kV Feeder Info — All Substations</h2>
      <p>${allFeeders.length} feeders across ${ALL_SUBSTATIONS.length} substations</p>
    </div>
    <div class="sec-head-right">
      ${ssSearchBar('comb-search','🔍 Search substation or feeder…')}
      <select class="filter-sel" id="comb-type-filter" onchange="window.filterCombinedTable('comb-search')">
        <option value="">All</option>
        <option value="high">High Load (≥3 MW)</option>
        <option value="long">Long Line (≥50 km)</option>
      </select>
      <select class="filter-sel" id="comb-tx-filter" onchange="window.filterCombinedTable('comb-search')">
        <option value="">All Transformers</option>
        <option value="T1">T1</option>
        <option value="T2">T2</option>
        <option value="T3">T3</option>
        <option value="T4">T4</option>
      </select>
      <button class="btn btn-sm btn-secondary" onclick="window.exportCombinedCSV('11kv_feeders')"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  ${kpiRow([
    [allFeeders.length,      'Total 11 kV Feeders', 'navy'],
    [totalLen.toFixed(0)+' km','Total Feeder Length',''],
    [highLoad,               'High Load (≥3 MW)',   'red'],
    [longLines,              'Long Lines (≥50 km)', 'amber'],
    [[...new Set(allFeeders.map(f=>f.panel).filter(Boolean))].length, 'Panel Brands', ''],
  ])}

  <div class="panel">
    <div class="panel-head">
      <h3>11 kV Feeder Information</h3>
      <span id="comb-count" style="font-size:.82rem;color:var(--text3)">${allFeeders.length} records</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation</th>
          <th>Transformer</th>
          <th>TX Capacity (MVA)</th>
          <th>11 kV Feeder Name</th>
          <th>Max Load (MW)</th>
          <th>Feeder Length (km)</th>
          <th>Panel Manufacturer</th>
          <th>Panel Mfg. Year</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody id="comb-tbody">
        ${render11kvRows(allFeeders)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function render11kvRows(rows) {
  if (!rows.length) return `<tr><td colspan="10" class="tbl-empty">No records found.</td></tr>`;
  return rows.map((f,i) => `<tr>
    <td>${i+1}</td>
    <td>
      <a href="#" onclick="window.showSection('ss-detail','${f.ss_id}');return false"
         style="color:var(--blue);font-weight:600;font-size:.82rem">${f.ss_name}</a>
    </td>
    <td><span class="badge badge-blue">${D(f.transformer)}</span></td>
    <td class="num">${D(f.capacity)}</td>
    <td><strong>${D(f.name)}</strong></td>
    <td class="num">${f.max_load_mw!=null ? f.max_load_mw+' MW' : '—'}</td>
    <td class="num">${f.length_km!=null ? f.length_km+' km' : '—'}</td>
    <td>${D(f.panel)}</td>
    <td>${D(f.panel_year)}</td>
    <td style="font-size:.78rem;color:var(--text3)">${D(f.remarks)}</td>
  </tr>`).join('');
}

/* ══════════════════════════════════════════════════
   SHARED: FILTER + EXPORT for combined tables
══════════════════════════════════════════════════ */
window.filterCombinedTable = (searchId) => {
  const q        = (document.getElementById(searchId)?.value||'').toLowerCase();
  const typeVal  = (document.getElementById('comb-type-filter')?.value||'').toLowerCase();
  const txFilter = (document.getElementById('comb-tx-filter')?.value||'');
  const sec      = currentSection;

  let filtered = (window._combined||[]).filter(item => {
    const text = JSON.stringify(item).toLowerCase();
    const qOk = !q || text.includes(q);

    // Type-specific filters
    let typeOk = true;
    if (typeVal) {
      if (sec==='all-33kv') {
        const lineType = (item.source_ring||item.remarks||'').toLowerCase();
        typeOk = lineType.includes(typeVal);
      } else if (sec==='all-pt-sw') {
        typeOk = (item.ais_gis||'').toUpperCase() === typeVal.toUpperCase();
      } else if (sec==='all-pt-load') {
        const cap=parseFloat(item.capacity||0), load=parseFloat(item.max_load_mw||0);
        const pct = cap&&load ? load/cap*100 : 0;
        if (typeVal==='overloaded') typeOk = pct>80;
        else if (typeVal==='high')  typeOk = pct>60 && pct<=80;
        else if (typeVal==='normal')typeOk = pct<=60;
      } else if (sec==='all-11kv') {
        if (typeVal==='high') typeOk = (item.max_load_mw||0)>=3;
        else if (typeVal==='long') typeOk = (item.length_km||0)>=50;
      }
    }

    const txOk = !txFilter || (item.transformer||'')===txFilter;

    // §6d: PT filters apply only on the Power Transformer submenu pages.
    const ptOk = (sec === 'all-pt-sw' || sec === 'all-pt-load')
      ? _passesPTFilters(item) : true;

    return qOk && typeOk && txOk && ptOk;
  });

  const tbody = document.getElementById('comb-tbody');
  const count = document.getElementById('comb-count');
  if (count) count.textContent = filtered.length + ' records';
  if (!tbody) return;

  const renderers = {
    'all-33kv':   render33kvRows,
    'all-pt-sw':  renderPTSwRows,
    'all-pt-load':renderPTLoadRows,
    'all-11kv':   render11kvRows,
  };
  tbody.innerHTML = (renderers[sec]||(() => ''))(filtered);
};

window.exportCombinedCSV = (name) => {
  const sec = currentSection;
  const rows = [];

  if (sec==='all-33kv') {
    rows.push(['Substation','Line Name','Type','Length (km)','Conductor','Breaker','Panel','Remarks']);
    (window._combined||[]).forEach(l=>rows.push([l.ss_name,l.name,l.source_ring||l.remarks||'',l.length_km,l.conductor,l.breaker,l.panel,l.remarks]));
  } else if (sec==='all-pt-sw') {
    rows.push(['Substation','TX Name','Capacity','AIS/GIS','CB Type','CB Mfr','CB Year','CT Mfr','CT Year','Panel Mfr','Panel Year','Comment']);
    (window._combined||[]).forEach(t=>rows.push([t.ss_name,t.name,t.capacity,t.ais_gis,t.cb_type,t.breaker,t.cb_year||t.year,t.ct_manufacturer,t.ct_year,t.panel,t.panel_year||t.year,t.comment]));
  } else if (sec==='all-pt-load') {
    rows.push(['Substation','TX Name','Capacity (MVA)','Max Load (MW)','Loading %','% Impedance','Manufacturer','Year','OLTC Mfr','Oil BDV']);
    (window._combined||[]).forEach(t=>{
      const cap=parseFloat(t.capacity||0),load=parseFloat(t.max_load_mw||0);
      const pct=cap&&load?Math.round(load/cap*100):'';
      rows.push([t.ss_name,t.name,t.capacity,t.max_load_mw,pct,t.impedance_pct||t.impedance,t.brand,t.year,t.oltc_manufacturer,t.oil_breakdown_voltage]);
    });
  } else if (sec==='all-11kv') {
    rows.push(['Substation','Transformer','TX Capacity','Feeder Name','Max Load (MW)','Length (km)','Panel Mfr','Panel Year','Remarks']);
    (window._combined||[]).forEach(f=>rows.push([f.ss_name,f.transformer,f.capacity,f.name,f.max_load_mw,f.length_km,f.panel,f.panel_year,f.remarks]));
  }

  if (!rows.length) { showToast('No data to export','warn'); return; }
  const csv = rows.map(r=>r.map(v=>v==null?'':String(v).replace(/,/g,' ')).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'),{
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
    download: `nesco_${name}.csv`
  });
  a.click();
  showToast('CSV exported!','success');
};

/* ══════════════════════════════════════════════════
   SECTION 18b — NEW SECTIONS (v4.0): Projects landings,
   NIDMP / PDSSP detail, Renewable Energy, Store, ZRS,
   Fault Level
══════════════════════════════════════════════════ */

/* ── helper: escape a value for safe HTML interpolation ── */
function esc(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function _getProjCategory(catId) {
  if (!PROJECTS_DATA) return null;
  return (PROJECTS_DATA.categories || []).find(c => c.id === catId) || null;
}

/* ── Projects landing pages (Ongoing / Upcoming) ── */
function _renderProjectsLanding(catId, title, subtitle, heroClass) {
  const cat = _getProjCategory(catId);
  const projects = cat ? cat.projects : [];
  const cards = projects.map(p => `
    <div class="projlist-card">
      <span class="pl-code">${esc(p.code)}</span>
      <div class="pl-name">${esc(p.name)}</div>
      <div class="pl-summary">${esc(p.summary || '')}</div>
      <a href="#" class="pl-cta" onclick="window.showSection('${esc(p.id)}');return false;">
        Open project <i class="fas fa-arrow-right"></i>
      </a>
    </div>`).join('');

  document.getElementById('content').innerHTML = `
    <div class="proj-hero ${heroClass}">
      <span class="proj-tag">${title}</span>
      <h1>${title}</h1>
      <p>${esc(subtitle)}</p>
    </div>
    ${projects.length
      ? `<div class="projlist-grid">${cards}</div>`
      : `<div class="projlist-empty">No projects in this category yet.</div>`}
  `;
}

function renderOngoingProjects() {
  _renderProjectsLanding(
    'ongoing',
    'Ongoing Projects',
    'NESCO development projects currently under implementation. Click a project for full substation-wise scope and BOQ.',
    'proj-hero-go'
  );
}
function renderUpcomingProjects() {
  _renderProjectsLanding(
    'upcoming',
    'Upcoming Projects',
    'NESCO development projects in planning / pre-implementation stage.',
    'proj-hero-up'
  );
}

/* ── NIDMP / PDSSP detail rendering driven entirely by projects.json
   so adding a new project = adding a new entry to that JSON. ── */
function _findProject(projectId) {
  if (!PROJECTS_DATA) return null;
  for (const cat of PROJECTS_DATA.categories || []) {
    const p = cat.projects.find(p => p.id === projectId);
    if (p) return { project: p, category: cat };
  }
  return null;
}

/* Build a clean tableHTML used by every project view. */
function _projTableHTML(data) {
  if (!data || !data.headers || !data.headers.length) return '';
  const head = data.headers.map(h => `<th>${esc(h)}</th>`).join('');
  const body = (data.rows || []).map(r => {
    const cells = data.headers.map(h => {
      const v = r[h];
      return `<td class="${typeof v === 'number' ? 'num' : ''}">${esc(v ?? '')}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `
    <div class="panel-body no-pad"><div class="tbl-wrap scrollable">
      <table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${data.headers.length}" class="tbl-empty">No rows.</td></tr>`}</tbody></table>
    </div></div>`;
}

/* Project Scope panel — brief summary + structured key facts + bullet
   list of objectives. Appears under the hero on every project page. */
function _renderProjectScope(p) {
  const scope = p.scope || {};
  const objectives = (scope.objectives || []).map(o =>
    `<li><i class="fas fa-circle-check"></i> ${esc(o)}</li>`).join('');
  const meta = [];
  if (scope.funding) meta.push(`<span class="pscope-pill"><i class="fas fa-coins"></i> ${esc(scope.funding)}</span>`);
  if (scope.status)  meta.push(`<span class="pscope-pill"><i class="fas fa-flag"></i> ${esc(scope.status)}</span>`);
  return `
    <div class="panel" style="margin-bottom:18px">
      <div class="panel-head">
        <h3><i class="fas fa-bullseye"></i> Project Scope &amp; Summary</h3>
        <div style="display:flex;gap:6px">${meta.join('')}</div>
      </div>
      <div class="panel-body">
        <p class="pscope-overview">${esc(scope.overview || p.summary || '')}</p>
        ${objectives ? `<ul class="pscope-list">${objectives}</ul>` : ''}
      </div>
    </div>`;
}

function _renderProjectDetail(projectId, heroClass) {
  const hit = _findProject(projectId);
  if (!hit) {
    document.getElementById('content').innerHTML = `
      <div class="placeholder-card">
        <i class="fas fa-folder-open"></i>
        <h3>Project not found</h3>
        <p>projects.json does not contain a project with id "<code>${esc(projectId)}</code>".</p>
      </div>`;
    return;
  }
  const p = hit.project;
  const backSection = hit.category.id === 'ongoing' ? 'ongoing-projects' : 'upcoming-projects';
  const summary = p.substation_summary || { headers: [], rows: [] };
  const bays = p.grid_bay_breakers;
  const lineReqs = p.line_requirements;

  // ── PDSSP: tabbed UI with Substation + Line views ──
  if (projectId === 'pdssp') {
    document.getElementById('content').innerHTML = `
      <div class="proj-hero ${heroClass}">
        <span class="proj-tag">${esc(p.code)}</span>
        <h1>${esc(p.name)}</h1>
        <p>${esc(p.summary || '')}</p>
      </div>

      <div class="sec-head">
        <div class="sec-head-left">
          <h2>${esc(p.code)} — Project Detail</h2>
          <p>Switch between Substation BOQ and Line Requirement views below.</p>
        </div>
        <div class="sec-head-right">
          <button class="btn btn-sm btn-secondary" onclick="window.showSection('${backSection}')">
            <i class="fas fa-arrow-left"></i> Back
          </button>
        </div>
      </div>

      ${_renderProjectScope(p)}

      <div class="proj-tabs">
        <button id="ptab-sub"  class="proj-tab active" onclick="window.pdsspSwitchTab('sub')">
          <i class="fas fa-bolt"></i> Substation
        </button>
        <button id="ptab-line" class="proj-tab" onclick="window.pdsspSwitchTab('line')">
          <i class="fas fa-route"></i> Line
        </button>
      </div>

      <div id="ptab-sub-body" class="proj-tab-body">
        <div class="panel">
          <div class="panel-head">
            <h3><i class="fas fa-table"></i> Substation-wise BOQ Summary</h3>
            <span style="font-size:.78rem;color:var(--text3)">${(summary.rows||[]).length} substations</span>
          </div>
          ${_projTableHTML(summary)}
        </div>
      </div>

      <div id="ptab-line-body" class="proj-tab-body" style="display:none">
        ${Array.isArray(lineReqs) && lineReqs.length
          ? _renderPdsspLineReqViews(lineReqs)
          : '<div class="placeholder-card"><p>No line requirement data loaded.</p></div>'}
      </div>
    `;

    // Populate the line view's default Grand-Total table so it's ready
    // when the user switches tabs.
    if (Array.isArray(lineReqs) && lineReqs.length) {
      setTimeout(() => window.pdsspRenderLineView(), 0);
    }
    return;
  }

  // ── NIDMP (and other projects): single-page layout with Scope on top ──
  let extras = '';

  if (p.all_substations) {
    const cats = Object.values(p.all_substations);
    const totalSS = cats.reduce((n, c) => n + c.rows.length, 0);
    extras += `
      <div class="panel" style="margin-top:18px">
        <div class="panel-head">
          <h3><i class="fas fa-list-ul"></i> All Substations Under ADB / NIDMP</h3>
          <span style="font-size:.78rem;color:var(--text3)">${totalSS} substations · ${cats.length} categories</span>
        </div>
        <div class="panel-body" style="padding:0">
          ${cats.map(c => _renderNidmpCategory(c)).join('')}
        </div>
      </div>`;
  }

  if (bays && bays.rows && bays.rows.length) {
    extras += `
      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><h3><i class="fas fa-microchip"></i> Grid Bay-Breakers</h3>
          <span style="font-size:.78rem;color:var(--text3)">${bays.rows.length} rows</span>
        </div>
        ${_projTableHTML(bays)}
      </div>`;
  }

  document.getElementById('content').innerHTML = `
    <div class="proj-hero ${heroClass}">
      <span class="proj-tag">${esc(p.code)}</span>
      <h1>${esc(p.name)}</h1>
      <p>${esc(p.summary || '')}</p>
    </div>
    <div class="sec-head">
      <div class="sec-head-left">
        <h2>${esc(p.code)} — Project Detail</h2>
        <p>Brief summary + detailed substation-wise BOQ.</p>
      </div>
      <div class="sec-head-right">
        <button class="btn btn-sm btn-secondary" onclick="window.showSection('${backSection}')">
          <i class="fas fa-arrow-left"></i> Back
        </button>
      </div>
    </div>
    ${_renderProjectScope(p)}
    <div class="panel">
      <div class="panel-head">
        <h3><i class="fas fa-table"></i> Substation-wise BOQ Summary</h3>
        <span style="font-size:.78rem;color:var(--text3)">${(summary.rows||[]).length} substations</span>
      </div>
      ${_projTableHTML(summary)}
    </div>
    ${extras}
  `;
}

window.pdsspSwitchTab = (which) => {
  for (const k of ['sub', 'line']) {
    const btn = document.getElementById('ptab-' + k);
    const body = document.getElementById('ptab-' + k + '-body');
    if (!btn || !body) continue;
    if (k === which) {
      btn.classList.add('active');
      body.style.display = 'block';
    } else {
      btn.classList.remove('active');
      body.style.display = 'none';
    }
  }
};

function renderNIDMP() { _renderProjectDetail('nidmp', 'proj-hero-go'); }

/* Render one NIDMP category block (table-row layout with sticky title). */
function _renderNidmpCategory(cat) {
  const heads = (cat.headers || []).map(h => `<th>${esc(h)}</th>`).join('');
  const rows = (cat.rows || []).map(r =>
    `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `
    <div style="padding:14px 20px 0">
      <h4 style="font-family:var(--fh);font-weight:800;color:#0b1d3f;font-size:.98rem">
        <i class="fas fa-folder-open" style="color:#6366f1;margin-right:6px"></i>
        ${esc(cat.label)}
        <span style="font-weight:500;color:var(--text3);font-size:.82rem">— ${esc(cat.count_label || (cat.rows.length + ' Nos.'))}</span>
      </h4>
    </div>
    <div class="tbl-wrap" style="margin-bottom:14px">
      <table class="tbl">
        <thead><tr>${heads}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
function renderPDSSP() { _renderProjectDetail('pdssp', 'proj-hero-up'); }

/* §5 — PDSSP Line Requirement rollups.
   Renders three views: Grand Total, Zone-wise, Circle-wise (with a
   dropdown to pick the Circle sheet). The data is already pre-rolled
   in the source workbook (Grand Summary / Zone / Circle sheets), we
   just expose them cleanly. */
let _pdsspLineReqsCache = null;
function _renderPdsspLineReqViews(lineReqs) {
  _pdsspLineReqsCache = lineReqs;
  const grand   = lineReqs.find(s => s.kind === 'grand');
  const zones   = lineReqs.filter(s => s.kind === 'zone');
  const circles = lineReqs.filter(s => s.kind === 'sdd' || s.kind === 'substation');

  const viewOptions = [];
  if (grand)        viewOptions.push(`<option value="grand">Grand Total — across all Zones</option>`);
  if (zones.length) viewOptions.push(`<option value="zone">Zone-wise summary</option>`);
  if (circles.length) viewOptions.push(`<option value="circle">Circle-wise detail</option>`);

  return `
    <div class="panel" style="margin-top:18px">
      <div class="panel-head">
        <h3><i class="fas fa-route"></i> Line Requirement — All SDDs (rollups)</h3>
        <span style="font-size:.78rem;color:var(--text3)">${lineReqs.length} sheets · pre-rolled in source workbook</span>
      </div>
      <div class="panel-body" style="padding-bottom:0">
        <div class="zrs-controls" style="margin-bottom:14px">
          <label>View</label>
          <select class="filter-sel" id="pdssp-lr-view" onchange="window.pdsspRenderLineView()">
            ${viewOptions.join('')}
          </select>
          <span id="pdssp-lr-extra" style="display:contents"></span>
        </div>
        <div id="pdssp-lr-body" class="no-pad" style="margin:0 -20px -20px">
          <!-- filled by pdsspRenderLineView() -->
        </div>
      </div>
    </div>
  `;
}

window.pdsspRenderLineView = () => {
  if (!_pdsspLineReqsCache) return;
  const lr = _pdsspLineReqsCache;
  const view = (document.getElementById('pdssp-lr-view')?.value) || 'grand';

  const tableHTML = (data) => {
    if (!data || !data.headers || !data.headers.length) return '<div class="placeholder-card"><p>No data.</p></div>';
    const head = data.headers.map(h => `<th>${esc(h)}</th>`).join('');
    const body = (data.rows || []).map(r => {
      const cells = data.headers.map(h => {
        const v = r[h];
        const isNum = typeof v === 'number';
        return `<td class="${isNum?'num':''}">${esc(v ?? '')}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<div class="tbl-wrap scrollable">
      <table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </div>`;
  };

  let html = '';
  // Reset any auxiliary controls
  const extra = document.getElementById('pdssp-lr-extra');
  if (extra) extra.innerHTML = '';

  if (view === 'grand') {
    const g = lr.find(s => s.kind === 'grand');
    html = g ? tableHTML(g) : '<div class="placeholder-card"><p>No Grand Summary sheet found.</p></div>';
  } else if (view === 'zone') {
    const zones = lr.filter(s => s.kind === 'zone');
    html = zones.map(z => `
      <div style="padding:14px 20px 6px"><h4 style="font-family:var(--fh);font-weight:800;color:#0b1d3f">${esc(z.sheet)}</h4></div>
      ${tableHTML(z)}
    `).join('');
  } else if (view === 'circle') {
    const circles = lr.filter(s => s.kind === 'sdd' || s.kind === 'substation');
    // Aux dropdown for which circle to show
    if (extra) {
      extra.innerHTML = `
        <label style="margin-left:14px">Circle</label>
        <select class="filter-sel" id="pdssp-lr-circle" onchange="window.pdsspRenderLineView()">
          ${circles.map((c,i) => `<option value="${i}">${esc(c.sheet)} (${c.rows.length} rows)</option>`).join('')}
        </select>
      `;
    }
    const idx = parseInt(document.getElementById('pdssp-lr-circle')?.value || '0', 10) || 0;
    const pick = circles[idx];
    html = pick ? tableHTML(pick) : '<div class="placeholder-card"><p>No Circle sheets found.</p></div>';
  }

  const body = document.getElementById('pdssp-lr-body');
  if (body) body.innerHTML = html;
};

/* ── Renewable Energy: structured renderer ──
   Skips the duplicated title + intro paragraphs (blocks 0-2) per
   owner request, surfaces the "Snapshot at a Glance" stats as
   prominent KPI tiles, and groups every numbered section into its
   own visual card with a themed icon. */
function renderRenewable() {
  if (!RENEWABLE_DATA) {
    document.getElementById('content').innerHTML = `<div class="page-loader">Loading…</div>`;
    return;
  }
  const blocks = (RENEWABLE_DATA.blocks || []).slice(0);

  // Drop the intro: first 3 blocks are the duplicated title + tagline
  // + opening paragraph that the owner asked to remove. They are
  // followed by the "Snapshot at a Glance" H1.
  const firstHeadingIdx = blocks.findIndex(b => b.kind === 'heading');
  const usable = firstHeadingIdx >= 0 ? blocks.slice(firstHeadingIdx) : blocks;

  // Group blocks under each H1 heading. The first H1 ("Snapshot at a
  // Glance") gets special KPI-tile treatment.
  const sections = [];
  let current = null;
  for (const b of usable) {
    if (b.kind === 'heading' && (b.level || 1) === 1) {
      current = { title: b.text, blocks: [] };
      sections.push(current);
    } else if (current) {
      current.blocks.push(b);
    }
  }

  // First section is "Snapshot at a Glance" with a 7×2 table.
  let snapshotHtml = '';
  let snapshot = sections.shift();
  if (snapshot) {
    const table = snapshot.blocks.find(b => b.kind === 'table');
    if (table && table.rows && table.rows.length) {
      // Each row is [metric label, value]
      const tiles = table.rows.map((r, i) => {
        const palette = ['t-green','t-teal','t-indigo','t-amber','t-pink','t-purple','t-orange'];
        const lbl = esc(r[0]);
        const val = esc(r[1]);
        return `<div class="metric-tile ${palette[i % palette.length]}">
          <i class="fas fa-solar-panel mt-icon"></i>
          <div class="mt-label">${lbl}</div>
          <div class="mt-val">${val}</div>
        </div>`;
      }).join('');
      snapshotHtml = `
        <h2 style="font-family:var(--fh);font-weight:800;color:#0b1d3f;margin:6px 0 12px;font-size:1.3rem">
          <i class="fas fa-chart-pie" style="color:#10b981;margin-right:8px"></i>${esc(snapshot.title)}
        </h2>
        <div class="metric-row">${tiles}</div>`;
    } else {
      // Fallback: put it back as a regular section
      sections.unshift(snapshot);
    }
  }

  // Iconography by section keyword
  const iconFor = (title) => {
    const t = title.toLowerCase();
    if (t.includes('rooftop') && t.includes('net'))      return 'fa-house-chimney';
    if (t.includes('floating'))                          return 'fa-water';
    if (t.includes('office') || t.includes('substation')) return 'fa-building';
    if (t.includes('opex'))                              return 'fa-handshake';
    if (t.includes('battery') || t.includes('charging')) return 'fa-car-battery';
    if (t.includes('ipp') || t.includes('evacuation'))   return 'fa-plug-circle-bolt';
    if (t.includes('future') || t.includes('plan'))      return 'fa-rocket';
    if (t.includes('looking ahead'))                     return 'fa-leaf';
    return 'fa-solar-panel';
  };

  // Render a non-snapshot section as a glass card
  const sectionCard = (sec) => {
    const icon = iconFor(sec.title);
    const inner = sec.blocks.map(b => {
      if (b.kind === 'heading') {
        const lvl = Math.max(2, Math.min(3, b.level || 2));
        return `<h${lvl} class="art-h${lvl}">${esc(b.text)}</h${lvl}>`;
      }
      if (b.kind === 'paragraph') {
        const t = b.text;
        // Render bullet-style paragraphs (start with "- " or a bullet
        // mark or contain " — capacity ") as list items in a UL.
        return `<p class="art-p">${esc(t)}</p>`;
      }
      if (b.kind === 'table' && b.rows && b.rows.length) {
        const [head, ...body] = b.rows;
        const ths = head.map(c => `<th>${esc(c)}</th>`).join('');
        const trs = body.map(r =>
          `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
        return `<div class="tbl-wrap" style="margin-top:10px"><table class="tbl">
          <thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
      }
      return '';
    }).join('');
    return `
      <div class="renew-card">
        <div class="renew-card-head">
          <div class="renew-icon"><i class="fas ${icon}"></i></div>
          <h3 class="renew-title">${esc(sec.title)}</h3>
        </div>
        <div class="renew-card-body">${inner}</div>
      </div>`;
  };

  document.getElementById('content').innerHTML = `
    <div class="proj-hero" style="background:linear-gradient(135deg,#047857 0%,#10b981 55%,#34d399 100%)">
      <span class="proj-tag"><i class="fas fa-leaf"></i> &nbsp;Renewable Energy</span>
      <h1>NESCO Renewable Energy Portfolio</h1>
      <p>Solar, floating solar, battery charging, and grid-tied IPP evacuation across the NESCO service area.</p>
    </div>

    ${snapshotHtml}

    <div class="renew-grid">
      ${sections.map(sectionCard).join('')}
    </div>
  `;
}

/* ── Store — Substation Equipment Info  /  Line Equipment Info ── */
function renderStoreEquipment(kind) {
  if (!STORE_DATA) {
    document.getElementById('content').innerHTML = `<div class="page-loader">Loading…</div>`;
    return;
  }
  const sub = kind === 'substation';
  const data = sub ? STORE_DATA.substation_equipment : STORE_DATA.line_equipment;
  const items = data.items || [];

  // Group by category
  const byCat = new Map();
  for (const it of items) {
    const k = it.category || 'Other';
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(it);
  }

  const colCount = sub ? 6 : 6;
  const headers = sub
    ? ['Equipment Name', 'Voltage Class', 'Rating / Capacity', 'Unit', 'Quantity', 'Notes']
    : ['Equipment Name', 'Voltage Class', 'Description',        'Unit', 'Quantity', 'Notes'];

  let body = '';
  for (const [cat, list] of byCat) {
    body += `<tr class="store-cat-head"><td colspan="${colCount}">${esc(cat)}</td></tr>`;
    for (const it of list) {
      const c2 = sub ? esc(it.rating) : esc(it.description);
      body += `<tr>
        <td>${esc(it.name)}</td>
        <td>${esc(it.voltage_class)}</td>
        <td>${c2}</td>
        <td>${esc(it.unit)}</td>
        <td class="num">${it.quantity != null ? esc(it.quantity) : '—'}</td>
        <td></td>
      </tr>`;
    }
  }

  const title  = sub ? 'Substation Equipment Info' : 'Line Equipment Info';
  const intro  = sub
    ? 'Inventory of substation-grade equipment specifications (power transformers, switchgear, control panels, etc.).'
    : 'Inventory of distribution-line equipment specifications (poles, conductors, transformers, accessories).';

  document.getElementById('content').innerHTML = `
    <div class="sec-head">
      <div class="sec-head-left">
        <h2>${title}</h2>
        <p>${intro} · ${items.length} items across ${byCat.size} categories.</p>
      </div>
    </div>
    <div class="panel"><div class="panel-body no-pad"><div class="tbl-wrap scrollable">
      <table class="tbl">
        <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${body || `<tr><td colspan="${colCount}" class="tbl-empty">No items.</td></tr>`}</tbody>
      </table>
    </div></div></div>`;
}

/* ── Fault Level placeholder (data not yet supplied) ── */
function renderFaultLevel() {
  document.getElementById('content').innerHTML = `
    <div class="sec-head">
      <div class="sec-head-left">
        <h2>Switching Substations — Fault Level</h2>
        <p>Per-substation 3-phase &amp; single-line-to-ground fault levels at the 33 kV bus.</p>
      </div>
    </div>
    <div class="placeholder-card">
      <i class="fas fa-bolt-lightning"></i>
      <h3>Fault Level data not yet supplied</h3>
      <p>Once the owner adds a <code>Fault Level</code> sheet (or a separate workbook) to <code>Switching Substations Info/</code>,
         the build_switching.py converter will pick it up automatically and this page will render the table.</p>
    </div>`;
}

/* ══════════════════════════════════════════════════
   ZRS — Zonal Repair Shop (full module per AGENT_BRIEF §9)
══════════════════════════════════════════════════ */

// UI state for the ZRS section
const ZRS_UI = {
  selectedZRS: 'All',     // 'All' or one of ZRS_DATA.zrs_locations
  kva:         'Total',   // '250' | '200' | '100' | 'Total'
  metric:      'repaired',// for the trend chart
  months:      'all',     // 'all' or a specific month
};

function _zrsTotalsAllZRS(metricSlug, kva) {
  if (!ZRS_DATA) return null;
  let sum = 0, latest = null, latestMnum = -1;
  const kind = (ZRS_DATA.metrics.find(m => m.slug === metricSlug) || {}).kind;
  for (const r of ZRS_DATA.long_rows) {
    if (r.metric !== metricSlug || r.kva !== kva || r.value == null) continue;
    if (kind === 'flow') {
      sum += r.value;
    } else if (r.month_num > latestMnum) {
      latestMnum = r.month_num;
      latest = r.value;
    }
  }
  return kind === 'flow' ? sum : latest;
}

function _zrsYTDByZRS(metricSlug, kva) {
  /* For each ZRS returns the YTD value (sum if flow, latest if stock). */
  if (!ZRS_DATA) return {};
  const out = {};
  const kind = (ZRS_DATA.metrics.find(m => m.slug === metricSlug) || {}).kind;
  for (const zrs of ZRS_DATA.zrs_locations) {
    let sum = 0, latest = null, latestMnum = -1;
    for (const r of ZRS_DATA.long_rows) {
      if (r.zrs !== zrs || r.metric !== metricSlug || r.kva !== kva || r.value == null) continue;
      if (kind === 'flow') sum += r.value;
      else if (r.month_num > latestMnum) { latestMnum = r.month_num; latest = r.value; }
    }
    out[zrs] = kind === 'flow' ? sum : latest;
  }
  return out;
}

function renderZRS() {
  if (!ZRS_DATA) {
    document.getElementById('content').innerHTML = `<div class="page-loader">Loading ZRS data…</div>`;
    return;
  }
  const kva = ZRS_UI.kva;

  // YTD KPI tiles
  const cards = [
    { slug:'received',     label:'Received YTD',           tone:'t-indigo', icon:'fa-inbox' },
    { slug:'repaired',     label:'Repaired YTD',           tone:'t-green',  icon:'fa-wrench' },
    { slug:'supplied',     label:'Supplied YTD',           tone:'t-orange', icon:'fa-truck' },
    { slug:'unrepairable', label:'Unrepairable YTD',       tone:'t-red',    icon:'fa-ban' },
    { slug:'cum_balance_repair', label:'Cum. Repairable (latest)',  tone:'t-purple', icon:'fa-warehouse' },
    { slug:'cum_deliverable',    label:'Cum. Deliverable (latest)', tone:'t-teal',   icon:'fa-boxes-stacked' },
  ];

  const cardsHtml = cards.map(c => {
    const v = _zrsTotalsAllZRS(c.slug, kva);
    const kind = (ZRS_DATA.metrics.find(m => m.slug === c.slug) || {}).kind;
    const kindHint = kind === 'flow' ? 'Sum across months' : 'Latest reported month';
    return `
      <div class="metric-tile ${c.tone}">
        <i class="fas ${c.icon} mt-icon"></i>
        <div class="mt-label">${c.label}</div>
        <div class="mt-val">${v == null ? '—' : v.toLocaleString()}</div>
        <div class="mt-trend ${kind==='flow' ? '' : 'dn'}">${kindHint} · ${kva} kVA</div>
      </div>`;
  }).join('');

  // ZRS-comparison table (4 ZRS × selected metric set, by current kva bucket)
  const compRows = ZRS_DATA.zrs_locations.map(zrs => {
    const cell = (slug) => {
      const ytd = _zrsYTDByZRS(slug, kva)[zrs];
      return ytd == null ? '—' : ytd.toLocaleString();
    };
    return `<tr>
      <td><a href="#" onclick="window.showSection('zrs-detail','${esc(zrs)}');return false;" style="font-weight:700;color:var(--blue)">${esc(zrs)}</a></td>
      <td class="num">${cell('received')}</td>
      <td class="num">${cell('repaired')}</td>
      <td class="num">${cell('supplied')}</td>
      <td class="num">${cell('unrepairable')}</td>
      <td class="num"><span class="zrs-stock">${cell('cum_balance_repair')}</span></td>
      <td class="num"><span class="zrs-stock">${cell('cum_deliverable')}</span></td>
    </tr>`;
  }).join('');

  // Notes from the dataset (April missing, Dinajpur stops in Feb)
  const notesHtml = `
    <div class="zrs-note"><i class="fas fa-circle-info"></i>
      <span><strong>${esc(ZRS_DATA.notes.april_note)}</strong> &nbsp;·&nbsp;
      ${esc(ZRS_DATA.notes.dinajpur_note)}</span>
    </div>
    <div class="zrs-note" style="background:linear-gradient(90deg,rgba(196,181,253,.35),rgba(167,243,208,.35));border-color:rgba(139,92,246,.35);color:#312e81">
      <i class="fas fa-circle-question"></i>
      <span><span class="zrs-stock">Stock metrics</span> (balances) are NOT summed across months — the tile shows the latest reported value.
            <span class="zrs-flow">Flow metrics</span> (Received, Repaired, Supplied, Unrepairable) ARE summed.</span>
    </div>`;

  // Controls
  const buckets = ZRS_DATA.kva_buckets.map(b =>
    `<option value="${esc(b)}" ${b===kva?'selected':''}>${esc(b)}${b==='Total'?'':' kVA'}</option>`).join('');
  const metricOpts = ZRS_DATA.metrics.map(m =>
    `<option value="${esc(m.slug)}" ${m.slug===ZRS_UI.metric?'selected':''}>${esc(m.label)}</option>`).join('');

  document.getElementById('content').innerHTML = `
    <div class="sec-head">
      <div class="sec-head-left">
        <h2>ZRS — Zonal Repair Shop</h2>
        <p>NESCO workshops where damaged distribution transformers are repaired and delivered back to field offices. Year ${ZRS_DATA.year}.</p>
      </div>
    </div>

    <div class="zrs-controls">
      <label>kVA Bucket</label>
      <select class="filter-sel" onchange="window.zrsSetKva(this.value)">${buckets}</select>
      <label style="margin-left:14px">Trend Metric</label>
      <select class="filter-sel" onchange="window.zrsSetMetric(this.value)">${metricOpts}</select>
    </div>

    ${notesHtml}

    <div class="metric-row">${cardsHtml}</div>

    <div class="panel">
      <div class="panel-head"><h3><i class="fas fa-table-cells"></i> ZRS Comparison — YTD by Location (${esc(kva)} kVA)</h3></div>
      <div class="panel-body no-pad"><div class="tbl-wrap">
        <table class="tbl">
          <thead><tr>
            <th>ZRS</th>
            <th class="num">Received <span style="font-weight:500;color:#065f46">flow</span></th>
            <th class="num">Repaired <span style="font-weight:500;color:#065f46">flow</span></th>
            <th class="num">Supplied <span style="font-weight:500;color:#065f46">flow</span></th>
            <th class="num">Unrepairable <span style="font-weight:500;color:#065f46">flow</span></th>
            <th class="num">Cum. Repairable <span style="font-weight:500;color:#5b21b6">stock</span></th>
            <th class="num">Cum. Deliverable <span style="font-weight:500;color:#5b21b6">stock</span></th>
          </tr></thead>
          <tbody>${compRows}</tbody>
        </table>
      </div></div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><h3><i class="fas fa-chart-line"></i> Monthly Trend — One Line per ZRS</h3>
        <span style="font-size:.78rem;color:var(--text3)">Metric: ${esc((ZRS_DATA.metrics.find(m=>m.slug===ZRS_UI.metric)||{}).label || '')} · ${esc(kva)} kVA</span>
      </div>
      <div class="panel-body"><div class="chart-container"><canvas id="zrs-trend"></canvas></div></div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><h3><i class="fas fa-building"></i> S&amp;DD-wise and ESU-wise Delivery Summary</h3>
        <span style="font-size:.78rem;color:var(--text3)">Aggregated qty of transformers delivered to receiving offices</span>
      </div>
      <div class="panel-body no-pad"><div class="tbl-wrap scrollable" style="max-height:380px">
        <table class="tbl">
          <thead><tr>
            <th>Office Type</th><th>Receiving Office</th>
            ${ZRS_DATA.zrs_locations.map(z => `<th class="num">${esc(z)}</th>`).join('')}
            <th class="num"><strong>Total Qty</strong></th>
          </tr></thead>
          <tbody>${_zrsOfficeBreakdownRows()}</tbody>
        </table>
      </div></div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><h3><i class="fas fa-truck-fast"></i> Deliveries Detail</h3>
        <span style="font-size:.78rem;color:var(--text3)">${ZRS_DATA.deliveries.length} rows · ${_zrsOfficeOptions().length} receiving offices</span>
      </div>
      <div class="panel-body no-pad">
        <div style="padding:12px 14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--glass-border-2)">
          <input class="search-input" id="zrs-deliv-q" placeholder="Search office / kVA / month…" oninput="window.zrsFilterDeliv()" style="max-width:240px">
          <select class="filter-sel" id="zrs-deliv-zrs" onchange="window.zrsFilterDeliv()">
            <option value="">All ZRS</option>
            ${ZRS_DATA.zrs_locations.map(z => `<option>${esc(z)}</option>`).join('')}
          </select>
          <select class="filter-sel" id="zrs-deliv-month" onchange="window.zrsFilterDeliv()">
            <option value="">All Months</option>
            ${ZRS_DATA.months_present.map(m => `<option>${esc(m)}</option>`).join('')}
          </select>
          <select class="filter-sel" id="zrs-deliv-otype" onchange="window.zrsRebuildOfficeOpts(); window.zrsFilterDeliv()">
            <option value="">All Office Types</option>
            <option value="S&DD">S&amp;DD only</option>
            <option value="ESU">ESU only</option>
          </select>
          <select class="filter-sel" id="zrs-deliv-office" onchange="window.zrsFilterDeliv()">
            <option value="">All Offices</option>
            ${_zrsOfficeOptions().map(o => `<option>${esc(o)}</option>`).join('')}
          </select>
          <span id="zrs-deliv-count" style="font-size:.8rem;color:var(--text3);margin-left:auto"></span>
        </div>
        <div class="tbl-wrap scrollable" style="max-height:480px">
          <table class="tbl">
            <thead><tr>
              <th>Month</th><th>ZRS</th><th>Receiving Office</th><th>kVA</th><th class="num">Quantity</th>
            </tr></thead>
            <tbody id="zrs-deliv-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  window.zrsFilterDeliv();
  _drawZRSTrend();
}

/* Classify a "Receiving Office" string into 'S&DD' or 'ESU' (or 'Other'). */
function _zrsOfficeType(office) {
  if (!office) return 'Other';
  const o = String(office).trim().toUpperCase();
  if (o.startsWith('S&DD')) return 'S&DD';
  if (o.startsWith('ESU'))  return 'ESU';
  return 'Other';
}

function _zrsOfficeOptions(typeFilter) {
  if (!ZRS_DATA) return [];
  const set = new Set();
  for (const d of ZRS_DATA.deliveries) {
    if (typeFilter && _zrsOfficeType(d.office) !== typeFilter) continue;
    if (d.office) set.add(d.office);
  }
  return [...set].sort((a,b)=>a.localeCompare(b));
}

window.zrsRebuildOfficeOpts = () => {
  const sel = document.getElementById('zrs-deliv-office');
  const type = document.getElementById('zrs-deliv-otype')?.value || '';
  if (!sel) return;
  const opts = _zrsOfficeOptions(type);
  sel.innerHTML = `<option value="">All Offices</option>` +
    opts.map(o => `<option>${esc(o)}</option>`).join('');
};

/* Build the rows for the S&DD/ESU breakdown table.
   Office × ZRS pivot, with a row total. Grouped by office type. */
function _zrsOfficeBreakdownRows() {
  if (!ZRS_DATA) return '';
  // tree[type][office][zrs] = qty
  const tree = {};
  for (const d of ZRS_DATA.deliveries) {
    const t = _zrsOfficeType(d.office);
    if (!tree[t]) tree[t] = {};
    if (!tree[t][d.office]) tree[t][d.office] = {};
    tree[t][d.office][d.zrs] = (tree[t][d.office][d.zrs] || 0) + (d.qty || 0);
  }
  const order = ['S&DD', 'ESU', 'Other'];
  const tagCls = (t) => t === 'S&DD' ? 'badge-blue' : t === 'ESU' ? 'badge-good' : 'badge-gray';

  let html = '';
  for (const t of order) {
    if (!tree[t]) continue;
    const offices = Object.keys(tree[t]).sort((a,b)=>a.localeCompare(b));
    // Type header row
    const typeTotal = offices.reduce((sum, o) =>
      sum + ZRS_DATA.zrs_locations.reduce((s,z) => s + (tree[t][o][z] || 0), 0), 0);
    html += `<tr class="store-cat-head"><td colspan="${ZRS_DATA.zrs_locations.length + 2}"><span class="badge ${tagCls(t)}">${esc(t)}</span> &nbsp; ${offices.length} office(s)</td><td class="num"><strong>${typeTotal.toLocaleString()}</strong></td></tr>`;

    for (const o of offices) {
      const cells = ZRS_DATA.zrs_locations.map(z => {
        const v = tree[t][o][z];
        return `<td class="num">${v ? v.toLocaleString() : '—'}</td>`;
      }).join('');
      const rowTot = ZRS_DATA.zrs_locations.reduce((s,z) => s + (tree[t][o][z] || 0), 0);
      html += `<tr>
        <td><span class="badge ${tagCls(t)}">${esc(t)}</span></td>
        <td>${esc(o)}</td>
        ${cells}
        <td class="num"><strong>${rowTot.toLocaleString()}</strong></td>
      </tr>`;
    }
  }
  return html;
}

function _drawZRSTrend() {
  const ctx = document.getElementById('zrs-trend');
  if (!ctx) return;
  const labels = ZRS_DATA.months_present;
  const slug = ZRS_UI.metric;
  const kva = ZRS_UI.kva;
  const colors = {
    Bogura:   '#1976d2',
    Dinajpur: '#7c3aed',
    Rajshahi: '#059669',
    Rangpur:  '#d97706',
  };
  const datasets = ZRS_DATA.zrs_locations.map(zrs => {
    const data = labels.map(m => {
      const row = ZRS_DATA.long_rows.find(r =>
        r.zrs === zrs && r.month === m && r.metric === slug && r.kva === kva);
      return row ? row.value : null;
    });
    return {
      label: zrs,
      data,
      borderColor: colors[zrs] || '#64748b',
      backgroundColor: (colors[zrs] || '#64748b') + '33',
      tension: 0.3, spanGaps: true, pointRadius: 3, pointHoverRadius: 5,
    };
  });
  charts.zrsTrend = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y ?? 'no data'}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

window.zrsSetKva    = (v) => { ZRS_UI.kva = v; renderZRS(); };
window.zrsSetMetric = (v) => { ZRS_UI.metric = v; renderZRS(); };

window.zrsFilterDeliv = () => {
  if (!ZRS_DATA) return;
  const q       = (document.getElementById('zrs-deliv-q')?.value || '').toLowerCase();
  const fzrs    = document.getElementById('zrs-deliv-zrs')?.value || '';
  const fmon    = document.getElementById('zrs-deliv-month')?.value || '';
  const fotype  = document.getElementById('zrs-deliv-otype')?.value || '';
  const foffice = document.getElementById('zrs-deliv-office')?.value || '';
  const rows    = ZRS_DATA.deliveries.filter(d => {
    if (fzrs   && d.zrs !== fzrs)                       return false;
    if (fmon   && d.month !== fmon)                     return false;
    if (fotype && _zrsOfficeType(d.office) !== fotype)  return false;
    if (foffice&& d.office !== foffice)                 return false;
    if (q) {
      const blob = (d.office + ' ' + d.kva + ' ' + d.month + ' ' + d.zrs).toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
  document.getElementById('zrs-deliv-count').textContent = `${rows.length} of ${ZRS_DATA.deliveries.length} rows`;
  const tbody = document.getElementById('zrs-deliv-tbody');
  tbody.innerHTML = rows.length
    ? rows.map(r => `<tr>
        <td>${esc(r.month)}</td>
        <td>${esc(r.zrs)}</td>
        <td>${esc(r.office)}</td>
        <td>${esc(r.kva || '—')}</td>
        <td class="num">${esc(r.qty)}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" class="tbl-empty">No deliveries match these filters.</td></tr>`;
};

/* ── ZRS — per-ZRS detail page (clicking a ZRS name) ── */
function renderZRSDetail(zrsName) {
  if (!ZRS_DATA || !zrsName) {
    document.getElementById('content').innerHTML = `<div class="page-loader">Loading…</div>`;
    return;
  }
  const months = ZRS_DATA.months_present;
  const kva = ZRS_UI.kva;
  const metricList = ZRS_DATA.metrics;

  // Build monthly table: rows = months, columns = the 8 metrics (current kva)
  const rows = months.map(m => {
    const cells = metricList.map(meta => {
      const row = ZRS_DATA.long_rows.find(r =>
        r.zrs === zrsName && r.month === m && r.metric === meta.slug && r.kva === kva);
      const cls = meta.kind === 'stock' ? 'zrs-stock' : 'zrs-flow';
      const v = row ? row.value : null;
      return `<td class="num"><span class="${cls}">${v == null ? '—' : v}</span></td>`;
    }).join('');
    return `<tr><td><strong>${esc(m)}</strong></td>${cells}</tr>`;
  }).join('');

  // YTD totals for the pipeline diagram
  const ytd = (slug) => {
    const all = _zrsYTDByZRS(slug, kva);
    return all[zrsName];
  };

  const dinajpurNote = (zrsName === 'Dinajpur') ? `
    <div class="zrs-note"><i class="fas fa-triangle-exclamation"></i>
      <span><strong>Dinajpur stopped reporting after February 2025.</strong>
      Subsequent months show "—".</span>
    </div>` : '';

  document.getElementById('content').innerHTML = `
    <div class="sec-head">
      <div class="sec-head-left">
        <h2>ZRS — ${esc(zrsName)}</h2>
        <p>Per-location monthly repair pipeline · ${esc(kva)} kVA bucket</p>
      </div>
      <div class="sec-head-right">
        <select class="filter-sel" onchange="window.zrsSetKva(this.value); window.showSection('zrs-detail','${esc(zrsName)}')">
          ${ZRS_DATA.kva_buckets.map(b => `<option value="${esc(b)}" ${b===kva?'selected':''}>${esc(b)}${b==='Total'?'':' kVA'}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-secondary" onclick="window.showSection('zrs')"><i class="fas fa-arrow-left"></i> Back to ZRS</button>
      </div>
    </div>

    ${dinajpurNote}

    <div class="zrs-pipeline">
      <div class="zrs-pipe-node received">
        <div class="lbl">Received YTD</div>
        <div class="val">${ytd('received') == null ? '—' : ytd('received').toLocaleString()}</div>
      </div>
      <div class="zrs-pipe-arrow"><i class="fas fa-arrow-right"></i></div>
      <div class="zrs-pipe-node repaired">
        <div class="lbl">Repaired YTD</div>
        <div class="val">${ytd('repaired') == null ? '—' : ytd('repaired').toLocaleString()}</div>
      </div>
      <div class="zrs-pipe-arrow"><i class="fas fa-arrow-right"></i></div>
      <div class="zrs-pipe-node supplied">
        <div class="lbl">Supplied YTD</div>
        <div class="val">${ytd('supplied') == null ? '—' : ytd('supplied').toLocaleString()}</div>
      </div>
      <div class="zrs-pipe-arrow"><i class="fas fa-arrow-down"></i></div>
      <div class="zrs-pipe-node unrepair">
        <div class="lbl">Unrepairable YTD</div>
        <div class="val">${ytd('unrepairable') == null ? '—' : ytd('unrepairable').toLocaleString()}</div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><h3><i class="fas fa-table"></i> Monthly Detail (${esc(kva)} kVA)</h3></div>
      <div class="panel-body no-pad"><div class="tbl-wrap scrollable">
        <table class="tbl">
          <thead><tr>
            <th>Month</th>
            ${metricList.map(m => `<th class="num"><span style="display:block;font-size:.62rem;font-weight:600;color:${m.kind==='stock'?'#5b21b6':'#065f46'};text-transform:uppercase">${m.kind}</span>${esc(m.label)}</th>`).join('')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div></div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════
   SECTION 19 — MODAL FRAMEWORK
══════════════════════════════════════════════════ */
window.openModal = (title, bodyHtml) => {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-bg').style.display = 'flex';
};
window.closeModal = () => { document.getElementById('modal-bg').style.display='none'; };
document.getElementById('modal-bg').addEventListener('click', e => { if(e.target===e.currentTarget) window.closeModal(); });

/* Admin modal stubs — show toast until Firebase connected */
window.openAddSSModal       = () => showToast('Add Substation — connect Firebase to enable','warn');
window.openEditSSModal      = (id) => showToast(`Edit substation ${id} — connect Firebase to enable`,'warn');
window.openAddLineModal     = () => showToast('Add 33 kV Line — connect Firebase to enable','warn');
window.openEditLineModal    = () => showToast('Edit Line — connect Firebase to enable','warn');
window.openAddTxModal       = () => showToast('Add Transformer — connect Firebase to enable','warn');
window.openEditTxSwModal    = () => showToast('Edit TX Switchgear — connect Firebase to enable','warn');
window.openEditTxLoadModal  = () => showToast('Edit TX Loading — connect Firebase to enable','warn');
window.openAddFeederModal   = () => showToast('Add Feeder — connect Firebase to enable','warn');
window.openEditFeederModal  = () => showToast('Edit Feeder — connect Firebase to enable','warn');
window.openEditGridModal    = () => showToast('Edit Grid SS — connect Firebase to enable','warn');
window.openAddDTModal       = () => showToast('Add DT record — connect Firebase to enable','warn');
window.openEditDTModal      = () => showToast('Edit DT — connect Firebase to enable','warn');
window.openAddProjectModal  = () => showToast('Add Project — connect Firebase to enable','warn');
window.openAddUpcomingModal = () => showToast('Add Upcoming Project — connect Firebase to enable','warn');
window.openEditUpcomingModal= () => showToast('Edit Project — connect Firebase to enable','warn');

/* ══════════════════════════════════════════════════
   SECTION 20 — TOAST
══════════════════════════════════════════════════ */
function showToast(msg, type='info') {
  const wrap=document.getElementById('toasts');
  const t=document.createElement('div'); t.className=`toast ${type}`;
  const icon={success:'check-circle',error:'times-circle',warn:'exclamation-triangle',info:'info-circle'}[type]||'info-circle';
  t.innerHTML=`<i class="fas fa-${icon}"></i> ${msg}`;
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(()=>t.remove(),400); },3500);
}

/* ══════════════════════════════════════════════════
   SECTION 21 — GLOBALS & INIT
══════════════════════════════════════════════════ */
window.showSection  = showSection;
window.showToast    = showToast;
window.renderDtRows = renderDtRows;

document.addEventListener('DOMContentLoaded', async () => {

  // Load all 82 substations from substations.json
  await loadSubstationData();
  // Load distribution-transformer dataset (32 SDD/ESU files)
  await loadDTData();
  // Load every section's dataset in parallel
  await Promise.all([
    loadHomepageData(),
    loadProjectsData(),
    loadZrsData(),
    loadStoreData(),
    loadSwitchingData(),
    loadRenewableData(),
  ]);

  // Mobile nav toggle
  document.querySelectorAll('.dd-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        btn.closest('.has-dd').classList.toggle('open');
      }
    });
  });

  // Demo mode auto-login
  if (!IS_CONFIGURED) {
    currentUser = { email:'demo@nesco.gov.bd', displayName:'Demo Admin' };
    currentRole = 'admin';
    setTimeout(() => onLoginSuccess(), 1500);
  }
});
