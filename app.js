/* ════════════════════════════════════════════════════════════════
   NESCO Distribution MIS — app.js  v3.0
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
  'ss-summary':        '33/11 kV Substations › Substation Summary',
  'ss-detail':         '33/11 kV Substations › Detail View',
  'all-33kv':          '33/11 kV Substations › 33 kV Line Feeder & Equipment',
  'all-pt-sw':         '33/11 kV Substations › Power Transformer Feeder Equipment',
  'all-pt-load':       '33/11 kV Substations › Power Transformer Loading & Operating Parameters',
  'all-11kv':          '33/11 kV Substations › 11 kV Feeder Info',
  'switching-ss':      '33 kV Switching Substations › Grid SS-wise NESCO Feeder List',
  'dt-overall':        'Distribution Transformer › Overall Summary',
  'dt-sdd-summary':    'Distribution Transformer › SDD/ESU-wise Summary',
  'dt-details':        'Distribution Transformer › Transformer Details',
  'dt-operating':      'Distribution Transformer › Operating Values',
  'dt-load':           'Distribution Transformer › DT Load',
  'dt-equipment':      'Distribution Transformer › Equipment Status',
  'ongoing-projects':  'Ongoing Projects',
  'upcoming-projects': 'Upcoming Projects',
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
    'dt-overall':        renderDTOverallSummary,
    'dt-sdd-summary':    renderDTSDDSummary,
    'dt-details':        () => renderDTDetails(param),
    'dt-operating':      renderDTOperating,
    'dt-load':           () => renderDTLoad(param),
    'dt-equipment':      renderDTEquipment,
    'ongoing-projects':  renderOngoing,
    'upcoming-projects': renderUpcoming,
    'load-history':      renderLoadHistory,
  };
  (R[sec] || (() => { document.getElementById('content').innerHTML = `<div class="page-loader">Coming soon.</div>`; }))();
}

window.toggleNav = () => document.getElementById('nav-menu').classList.toggle('open');
const D = v => (v != null && String(v).trim() !== '' && String(v) !== 'null') ? v : '—';

/* ══════════════════════════════════════════════════
   SECTION 9 — HOME  (renamed from Dashboard)
══════════════════════════════════════════════════ */
function renderHome() {
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
      <p>NESCO Distribution Management Information System — ${ALL_SUBSTATIONS.length} substations loaded</p>
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
      <input class="search-input" id="ss-search" placeholder="🔍 Search…" oninput="window.filterSSTable()" style="max-width:240px">
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddSSModal()"><i class="fas fa-plus"></i> Add Substation</button>` : ''}
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${ALL_SUBSTATIONS.length}</div><div class="kpi-sub">Total Substations</div></div>
    <div class="kpi-card green"><div class="kpi-val">${ALL_SUBSTATIONS.filter(s=>s.status==='Online').length}</div><div class="kpi-sub">Online</div></div>
    <div class="kpi-card"><div class="kpi-val">${ALL_SUBSTATIONS.reduce((s,ss)=>s+(ss.power_transformers||[]).length,0)}</div><div class="kpi-sub">Power Transformers</div></div>
    <div class="kpi-card"><div class="kpi-val">${ALL_SUBSTATIONS.reduce((s,ss)=>s+(ss.feeders_11kv||[]).length,0)}</div><div class="kpi-sub">Total 11 kV Feeders</div></div>
    <div class="kpi-card amber"><div class="kpi-val">1065 MW</div><div class="kpi-sub">Network Max Demand</div></div>
  </div>

  <div class="panel">
    <div class="panel-head"><h3>All 33/11 kV Substations</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl" id="ss-table">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Substation Name</th>
          <th>SDD / ESU</th>
          <th>Capacity (MVA)</th>
          <th>Max Demand (MW)</th>
          <th>Power TXs</th>
          <th>11 kV Feeders</th>
          <th>33 kV Lines</th>
          <th>Control Room No.</th>
          <th>GPS</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="ss-tbody">${renderSSRows(ALL_SUBSTATIONS)}</tbody>
    </table>
    </div></div>
  </div>
  `;
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
    <td>${D(ss.sdd_esu)}</td>
    <td class="num">${D(ss.capacity_mva)}</td>
    <td class="num">${ss.max_demand_mw!=null ? ss.max_demand_mw+' MW' : '—'}</td>
    <td class="num">${(ss.power_transformers||[]).length}</td>
    <td class="num">${(ss.feeders_11kv||[]).length}</td>
    <td class="num">${(ss.lines_33kv||[]).length}</td>
    <td style="font-size:.8rem">${D(ss.mobile)}</td>
    <td>${ss.gps_lat ? `<a href="https://maps.google.com/?q=${ss.gps_lat},${ss.gps_lng}" target="_blank" title="${ss.gps_lat},${ss.gps_lng}"><i class="fas fa-map-marker-alt" style="color:var(--red2)"></i></a>` : '—'}</td>
    <td><span class="badge badge-online">${ss.status||'Online'}</span></td>
    <td>
      <button class="btn btn-xs btn-secondary" onclick="window.showSection('ss-detail','${ss.id}')"><i class="fas fa-eye"></i></button>
      ${currentRole==='admin' ? `<button class="btn btn-xs btn-primary" onclick="window.openEditSSModal('${ss.id}')" style="margin-left:3px"><i class="fas fa-edit"></i></button>` : ''}
    </td>
  </tr>`).join('');
}

window.filterSSTable = () => {
  const q = (document.getElementById('ss-search')?.value||'').toLowerCase();
  const filtered = ALL_SUBSTATIONS.filter(ss =>
    !q || (ss.name||'').toLowerCase().includes(q) || (ss.sdd_esu||'').toLowerCase().includes(q)
  );
  document.getElementById('ss-tbody').innerHTML = renderSSRows(filtered);
};

/* ══════════════════════════════════════════════════
   SECTION 11 — SUBSTATION DETAIL (serial sections, no tabs)
══════════════════════════════════════════════════ */
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
            <td style="font-weight:600;color:var(--text3);font-size:.82rem">Date of Measurement</td>
            <td>${D(ss.grounding_date)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

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
          <th>NESCO Switching SS</th>
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
      <td style="font-size:.8rem">${f.nesco_sw ? `<span class="badge badge-gray">${f.nesco_sw}</span>` : ''}</td>
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
  const rows = [['Sr','Zone','Source Grid','NESCO Switching SS','Target NESCO SS',
                  'Line Name','Type','Conductor','Length (km)']];
  data.forEach(f => rows.push([
    f.sr, f.zone, f.source_grid, f.nesco_sw||'',
    f.target_ss, f.line_name, f.type, f.conductor, f.length_km||''
  ]));
  const csv = rows.map(r => r.map(v => v==null?'':v).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], {type:'text/csv'})),
    download: 'switching_ss_feeders.csv'
  });
  a.click();
  showToast('CSV exported!', 'success');
};}

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

window.openAddDTLoadModal = (ssId) => {
  const OVERALL_SUMMARY = [
  {sr:1,name:'Rajshahi-1',total:256,kva50:1,kva100:44,kva200:94,kva250:117,kvaOther:0,la_yes:108,la_no:140,la_good:89,la_bad:18,la_req:158,dofc_yes:73,dofc_no:175,dofc_good:60,dofc_bad:13,dofc_req:188,mccb_yes:98,mccb_no:150,mccb_good:79,mccb_bad:18,mccb_req:168,gnd_yes:240,gnd_no:8,gnd_req:8,lt_copper:158,lt_aluminium:89,kpi_la:0.4219,kpi_dofc:0.2852,kpi_mccb:0.3828},
  {sr:2,name:'Rajshahi-2',total:224,kva50:0,kva100:35,kva200:100,kva250:88,kvaOther:1,la_yes:132,la_no:75,la_good:53,la_bad:60,la_req:135,dofc_yes:217,dofc_no:0,dofc_good:65,dofc_bad:113,dofc_req:113,mccb_yes:51,mccb_no:166,mccb_good:21,mccb_bad:9,mccb_req:175,gnd_yes:216,gnd_no:1,gnd_req:1,lt_copper:199,lt_aluminium:5,kpi_la:0.5893,kpi_dofc:0.9688,kpi_mccb:0.2277},
  {sr:3,name:'Rajshahi-3',total:332,kva50:1,kva100:91,kva200:106,kva250:134,kvaOther:0,la_yes:165,la_no:160,la_good:90,la_bad:75,la_req:235,dofc_yes:318,dofc_no:8,dofc_good:203,dofc_bad:115,dofc_req:123,mccb_yes:104,mccb_no:221,mccb_good:74,mccb_bad:22,mccb_req:243,gnd_yes:323,gnd_no:3,gnd_req:3,lt_copper:268,lt_aluminium:63,kpi_la:0.497,kpi_dofc:0.9578,kpi_mccb:0.3133},
  {sr:4,name:'Rajshahi-4',total:262,kva50:0,kva100:12,kva200:117,kva250:130,kvaOther:3,la_yes:121,la_no:126,la_good:57,la_bad:53,la_req:179,dofc_yes:98,dofc_no:149,dofc_good:70,dofc_bad:19,dofc_req:168,mccb_yes:61,mccb_no:188,mccb_good:15,mccb_bad:27,mccb_req:215,gnd_yes:202,gnd_no:45,gnd_req:45,lt_copper:210,lt_aluminium:39,kpi_la:0.4618,kpi_dofc:0.374,kpi_mccb:0.2328},
  {sr:5,name:'Rajshahi-5',total:191,kva50:0,kva100:78,kva200:56,kva250:54,kvaOther:3,la_yes:168,la_no:19,la_good:96,la_bad:79,la_req:98,dofc_yes:187,dofc_no:0,dofc_good:102,dofc_bad:86,dofc_req:86,mccb_yes:112,mccb_no:74,mccb_good:94,mccb_bad:16,mccb_req:90,gnd_yes:187,gnd_no:1,gnd_req:1,lt_copper:145,lt_aluminium:42,kpi_la:0.8796,kpi_dofc:0.9791,kpi_mccb:0.5864},
  {sr:6,name:'Kashiadanga',total:206,kva50:1,kva100:84,kva200:65,kva250:55,kvaOther:2,la_yes:69,la_no:141,la_good:61,la_bad:8,la_req:149,dofc_yes:64,dofc_no:147,dofc_good:63,dofc_bad:1,dofc_req:148,mccb_yes:50,mccb_no:161,mccb_good:32,mccb_bad:3,mccb_req:164,gnd_yes:80,gnd_no:131,gnd_req:131,lt_copper:152,lt_aluminium:118,kpi_la:0.335,kpi_dofc:0.3107,kpi_mccb:0.2427},
  {sr:7,name:'Bimanbandar',total:206,kva50:0,kva100:82,kva200:55,kva250:64,kvaOther:5,la_yes:122,la_no:81,la_good:116,la_bad:6,la_req:87,dofc_yes:201,dofc_no:0,dofc_good:120,dofc_bad:83,dofc_req:83,mccb_yes:65,mccb_no:137,mccb_good:60,mccb_bad:5,mccb_req:142,gnd_yes:204,gnd_no:0,gnd_req:0,lt_copper:113,lt_aluminium:57,kpi_la:0.5922,kpi_dofc:0.9757,kpi_mccb:0.3155},
  {sr:8,name:'Tanore ESU',total:82,kva50:2,kva100:46,kva200:15,kva250:18,kvaOther:1,la_yes:32,la_no:50,la_good:32,la_bad:0,la_req:50,dofc_yes:71,dofc_no:11,dofc_good:70,dofc_bad:1,dofc_req:12,mccb_yes:19,mccb_no:0,mccb_good:19,mccb_bad:0,mccb_req:0,gnd_yes:82,gnd_no:0,gnd_req:0,lt_copper:51,lt_aluminium:31,kpi_la:0.3902,kpi_dofc:0.8659,kpi_mccb:0.2317},
  {sr:9,name:'Chapai-Nawabganj-1',total:231,kva50:0,kva100:44,kva200:73,kva250:114,kvaOther:0,la_yes:205,la_no:26,la_good:118,la_bad:94,la_req:120,dofc_yes:230,dofc_no:1,dofc_good:156,dofc_bad:69,dofc_req:70,mccb_yes:55,mccb_no:176,mccb_good:52,mccb_bad:26,mccb_req:202,gnd_yes:204,gnd_no:27,gnd_req:27,lt_copper:183,lt_aluminium:49,kpi_la:0.8874,kpi_dofc:0.9957,kpi_mccb:0.2381},
  {sr:10,name:'Chapai-Nawabganj-2',total:199,kva50:0,kva100:51,kva200:100,kva250:47,kvaOther:1,la_yes:90,la_no:109,la_good:91,la_bad:0,la_req:109,dofc_yes:198,dofc_no:1,dofc_good:41,dofc_bad:158,dofc_req:159,mccb_yes:77,mccb_no:121,mccb_good:71,mccb_bad:14,mccb_req:135,gnd_yes:191,gnd_no:8,gnd_req:8,lt_copper:189,lt_aluminium:10,kpi_la:0.4523,kpi_dofc:0.995,kpi_mccb:0.3869},
  {sr:11,name:'Godagari',total:196,kva50:0,kva100:65,kva200:71,kva250:48,kvaOther:12,la_yes:113,la_no:88,la_good:89,la_bad:41,la_req:129,dofc_yes:163,dofc_no:38,dofc_good:160,dofc_bad:5,dofc_req:43,mccb_yes:51,mccb_no:150,mccb_good:20,mccb_bad:21,mccb_req:171,gnd_yes:199,gnd_no:2,gnd_req:2,lt_copper:0,lt_aluminium:0,kpi_la:0.5765,kpi_dofc:0.8316,kpi_mccb:0.2602},
  {sr:12,name:'Gomostapur',total:273,kva50:1,kva100:99,kva200:87,kva250:86,kvaOther:0,la_yes:154,la_no:119,la_good:112,la_bad:42,la_req:161,dofc_yes:256,dofc_no:17,dofc_good:196,dofc_bad:60,dofc_req:77,mccb_yes:92,mccb_no:177,mccb_good:87,mccb_bad:99,mccb_req:276,gnd_yes:267,gnd_no:6,gnd_req:6,lt_copper:207,lt_aluminium:66,kpi_la:0.5641,kpi_dofc:0.9377,kpi_mccb:0.337},
  {sr:13,name:'Shibganj_Chapai-Nawabganj',total:116,kva50:0,kva100:38,kva200:39,kva250:39,kvaOther:0,la_yes:76,la_no:40,la_good:74,la_bad:2,la_req:42,dofc_yes:116,dofc_no:0,dofc_good:79,dofc_bad:37,dofc_req:37,mccb_yes:43,mccb_no:73,mccb_good:42,mccb_bad:1,mccb_req:74,gnd_yes:116,gnd_no:0,gnd_req:0,lt_copper:108,lt_aluminium:8,kpi_la:0.6552,kpi_dofc:1.0,kpi_mccb:0.3707},
  {sr:14,name:'Natore',total:191,kva50:0,kva100:46,kva200:56,kva250:83,kvaOther:6,la_yes:82,la_no:110,la_good:82,la_bad:0,la_req:110,dofc_yes:190,dofc_no:2,dofc_good:171,dofc_bad:19,dofc_req:21,mccb_yes:64,mccb_no:128,mccb_good:64,mccb_bad:0,mccb_req:128,gnd_yes:190,gnd_no:2,gnd_req:2,lt_copper:189,lt_aluminium:1,kpi_la:0.4293,kpi_dofc:0.9948,kpi_mccb:0.3351},
  {sr:15,name:'Sirajganj-1',total:191,kva50:0,kva100:40,kva200:61,kva250:89,kvaOther:1,la_yes:166,la_no:23,la_good:102,la_bad:67,la_req:90,dofc_yes:189,dofc_no:0,dofc_good:92,dofc_bad:92,dofc_req:92,mccb_yes:83,mccb_no:101,mccb_good:53,mccb_bad:17,mccb_req:118,gnd_yes:191,gnd_no:0,gnd_req:0,lt_copper:154,lt_aluminium:0,kpi_la:0.8691,kpi_dofc:0.9895,kpi_mccb:0.4346},
  {sr:16,name:'Sirajganj-2',total:181,kva50:0,kva100:45,kva200:74,kva250:62,kvaOther:0,la_yes:138,la_no:44,la_good:56,la_bad:117,la_req:161,dofc_yes:173,dofc_no:9,dofc_good:97,dofc_bad:76,dofc_req:85,mccb_yes:36,mccb_no:145,mccb_good:22,mccb_bad:51,mccb_req:196,gnd_yes:182,gnd_no:0,gnd_req:0,lt_copper:182,lt_aluminium:0,kpi_la:0.7624,kpi_dofc:0.9558,kpi_mccb:0.1989},
  {sr:18,name:'Pabna-2',total:248,kva50:0,kva100:45,kva200:115,kva250:85,kvaOther:3,la_yes:84,la_no:164,la_good:38,la_bad:46,la_req:210,dofc_yes:247,dofc_no:1,dofc_good:240,dofc_bad:7,dofc_req:8,mccb_yes:31,mccb_no:217,mccb_good:30,mccb_bad:0,mccb_req:217,gnd_yes:247,gnd_no:1,gnd_req:1,lt_copper:247,lt_aluminium:0,kpi_la:0.3387,kpi_dofc:0.996,kpi_mccb:0.125},
  {sr:19,name:'Ishwardi',total:290,kva50:0,kva100:74,kva200:107,kva250:107,kvaOther:2,la_yes:180,la_no:146,la_good:153,la_bad:20,la_req:166,dofc_yes:225,dofc_no:101,dofc_good:191,dofc_bad:24,dofc_req:125,mccb_yes:132,mccb_no:194,mccb_good:118,mccb_bad:0,mccb_req:194,gnd_yes:323,gnd_no:3,gnd_req:3,lt_copper:309,lt_aluminium:16,kpi_la:0.6207,kpi_dofc:0.7759,kpi_mccb:0.4552},
  {sr:20,name:'Naogaon-1',total:213,kva50:3,kva100:17,kva200:103,kva250:87,kvaOther:3,la_yes:79,la_no:134,la_good:78,la_bad:1,la_req:135,dofc_yes:213,dofc_no:0,dofc_good:0,dofc_bad:213,dofc_req:213,mccb_yes:18,mccb_no:195,mccb_good:18,mccb_bad:0,mccb_req:195,gnd_yes:0,gnd_no:0,gnd_req:0,lt_copper:206,lt_aluminium:7,kpi_la:0.3709,kpi_dofc:1.0,kpi_mccb:0.0845},
  {sr:21,name:'Naogaon-2',total:265,kva50:6,kva100:65,kva200:116,kva250:64,kvaOther:14,la_yes:125,la_no:137,la_good:75,la_bad:49,la_req:186,dofc_yes:261,dofc_no:2,dofc_good:122,dofc_bad:138,dofc_req:140,mccb_yes:19,mccb_no:241,mccb_good:15,mccb_bad:1,mccb_req:242,gnd_yes:239,gnd_no:23,gnd_req:23,lt_copper:260,lt_aluminium:0,kpi_la:0.4717,kpi_dofc:0.9849,kpi_mccb:0.0717},
  {sr:22,name:'Santahar',total:327,kva50:0,kva100:85,kva200:135,kva250:105,kvaOther:2,la_yes:301,la_no:26,la_good:137,la_bad:166,la_req:192,dofc_yes:323,dofc_no:4,dofc_good:185,dofc_bad:138,dofc_req:142,mccb_yes:58,mccb_no:269,mccb_good:49,mccb_bad:8,mccb_req:277,gnd_yes:327,gnd_no:0,gnd_req:0,lt_copper:286,lt_aluminium:39,kpi_la:0.9205,kpi_dofc:0.9878,kpi_mccb:0.1774},
  {sr:23,name:'Joypurhat',total:191,kva50:0,kva100:37,kva200:39,kva250:113,kvaOther:2,la_yes:174,la_no:36,la_good:134,la_bad:41,la_req:77,dofc_yes:210,dofc_no:0,dofc_good:75,dofc_bad:135,dofc_req:135,mccb_yes:47,mccb_no:163,mccb_good:37,mccb_bad:11,mccb_req:174,gnd_yes:208,gnd_no:2,gnd_req:2,lt_copper:205,lt_aluminium:5,kpi_la:0.911,kpi_dofc:1.0995,kpi_mccb:0.2461},
  {sr:24,name:'Dupchachia',total:258,kva50:0,kva100:55,kva200:116,kva250:85,kvaOther:2,la_yes:178,la_no:49,la_good:62,la_bad:124,la_req:173,dofc_yes:226,dofc_no:0,dofc_good:62,dofc_bad:165,dofc_req:165,mccb_yes:21,mccb_no:206,mccb_good:17,mccb_bad:31,mccb_req:237,gnd_yes:226,gnd_no:1,gnd_req:1,lt_copper:205,lt_aluminium:7,kpi_la:0.6899,kpi_dofc:0.876,kpi_mccb:0.0814},
  {sr:26,name:'Bogura-2',total:259,kva50:0,kva100:62,kva200:102,kva250:95,kvaOther:0,la_yes:171,la_no:81,la_good:110,la_bad:61,la_req:142,dofc_yes:252,dofc_no:0,dofc_good:196,dofc_bad:55,dofc_req:55,mccb_yes:68,mccb_no:184,mccb_good:67,mccb_bad:1,mccb_req:185,gnd_yes:252,gnd_no:0,gnd_req:0,lt_copper:243,lt_aluminium:9,kpi_la:0.6602,kpi_dofc:0.973,kpi_mccb:0.2625},
  {sr:27,name:'Bogura-3',total:228,kva50:0,kva100:48,kva200:77,kva250:103,kvaOther:0,la_yes:222,la_no:6,la_good:53,la_bad:169,la_req:175,dofc_yes:228,dofc_no:0,dofc_good:44,dofc_bad:184,dofc_req:184,mccb_yes:13,mccb_no:215,mccb_good:12,mccb_bad:1,mccb_req:216,gnd_yes:228,gnd_no:0,gnd_req:0,lt_copper:216,lt_aluminium:12,kpi_la:0.9737,kpi_dofc:1.0,kpi_mccb:0.057},
  {sr:28,name:'Bogura-4',total:209,kva50:0,kva100:35,kva200:102,kva250:72,kvaOther:0,la_yes:131,la_no:74,la_good:74,la_bad:56,la_req:130,dofc_yes:204,dofc_no:0,dofc_good:150,dofc_bad:54,dofc_req:54,mccb_yes:22,mccb_no:183,mccb_good:22,mccb_bad:0,mccb_req:183,gnd_yes:205,gnd_no:0,gnd_req:0,lt_copper:182,lt_aluminium:23,kpi_la:0.6268,kpi_dofc:0.9761,kpi_mccb:0.1053},
  {sr:29,name:'Bogura-5',total:115,kva50:0,kva100:31,kva200:51,kva250:33,kvaOther:0,la_yes:66,la_no:49,la_good:36,la_bad:30,la_req:79,dofc_yes:115,dofc_no:0,dofc_good:59,dofc_bad:56,dofc_req:56,mccb_yes:5,mccb_no:110,mccb_good:5,mccb_bad:0,mccb_req:110,gnd_yes:115,gnd_no:0,gnd_req:0,lt_copper:134,lt_aluminium:96,kpi_la:0.5739,kpi_dofc:1.0,kpi_mccb:0.0435},
  {sr:30,name:'Sherpur',total:223,kva50:0,kva100:51,kva200:59,kva250:111,kvaOther:2,la_yes:184,la_no:39,la_good:113,la_bad:65,la_req:104,dofc_yes:217,dofc_no:6,dofc_good:170,dofc_bad:46,dofc_req:52,mccb_yes:22,mccb_no:201,mccb_good:39,mccb_bad:1,mccb_req:202,gnd_yes:204,gnd_no:19,gnd_req:19,lt_copper:220,lt_aluminium:1,kpi_la:0.8251,kpi_dofc:0.9731,kpi_mccb:0.0987},
  {sr:31,name:'Shibganj ESU Bogura',total:130,kva50:0,kva100:36,kva200:56,kva250:38,kvaOther:0,la_yes:91,la_no:28,la_good:63,la_bad:31,la_req:59,dofc_yes:119,dofc_no:0,dofc_good:44,dofc_bad:74,dofc_req:74,mccb_yes:40,mccb_no:79,mccb_good:39,mccb_bad:8,mccb_req:87,gnd_yes:119,gnd_no:0,gnd_req:0,lt_copper:237,lt_aluminium:21,kpi_la:0.7,kpi_dofc:0.9154,kpi_mccb:0.3077},
];

const DT_GRAND_TOTAL = {total:6293,la_yes:3927,la_no:2320,dofc_yes:5584,dofc_no:672,mccb_yes:1557,mccb_no:4625,gnd_yes:5767,lt_copper:5458,lt_aluminium:814,kpi_la:0.6223,kpi_dofc:0.8957,kpi_mccb:0.2486};

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

  <div class="kpi-row" style="grid-template-columns:repeat(6,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${OVERALL_SUMMARY.length}</div><div class="kpi-sub">Total SDD/ESU</div></div>
    <div class="kpi-card"><div class="kpi-val">${DT_GRAND_TOTAL.total.toLocaleString()}</div><div class="kpi-sub">Total Transformers</div></div>
    <div class="kpi-card red"><div class="kpi-val">${(DT_GRAND_TOTAL.kpi_la*100).toFixed(1)}%</div><div class="kpi-sub">LA Coverage</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${(DT_GRAND_TOTAL.kpi_dofc*100).toFixed(1)}%</div><div class="kpi-sub">DOFC Coverage</div></div>
    <div class="kpi-card purple"><div class="kpi-val">${(DT_GRAND_TOTAL.kpi_mccb*100).toFixed(1)}%</div><div class="kpi-sub">MCCB Coverage</div></div>
    <div class="kpi-card green"><div class="kpi-val">${DT_GRAND_TOTAL.gnd_yes.toLocaleString()}</div><div class="kpi-sub">Grounding Present</div></div>
  </div>

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
        </tr>
        <tr style="background:#e8eef5;font-size:.75rem">
          <th>50kVA</th><th>100kVA</th><th>200kVA</th><th>250kVA</th><th>Other</th>
          <th>Yes</th><th>No</th><th>Good</th><th>Bad</th>
          <th>Yes</th><th>No</th><th>Good</th><th>Bad</th>
          <th>Yes</th><th>No</th><th>Good</th><th>Bad</th>
          <th>Yes</th><th>No</th><th>Req.</th>
          <th>Copper</th><th>Aluminium</th>
          <th>LA</th><th>DOFC</th><th>MCCB</th>
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
  return list.map(s => `<tr>
    <td>${s.sr}</td>
    <td>
      <a href="#" onclick="window.showSection('dt-sdd-summary');return false"
         style="color:var(--blue);font-weight:600">${s.name}</a>
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
  </tr>`).join('') + `
  <tr style="background:#f0f5fb;font-weight:700;border-top:2px solid var(--border2)">
    <td colspan="2">Grand Total</td>
    <td class="num">${DT_GRAND_TOTAL.total.toLocaleString()}</td>
    <td colspan="2"></td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+r.kva200,0)}</td>
    <td class="num">${OVERALL_SUMMARY.reduce((s,r)=>s+r.kva250,0)}</td>
    <td></td>
    <td class="num">${DT_GRAND_TOTAL.la_yes}</td><td class="num">${DT_GRAND_TOTAL.la_no}</td><td colspan="2"></td>
    <td class="num">${DT_GRAND_TOTAL.dofc_yes}</td><td class="num">${DT_GRAND_TOTAL.dofc_no}</td><td colspan="2"></td>
    <td class="num">${DT_GRAND_TOTAL.mccb_yes}</td><td class="num">${DT_GRAND_TOTAL.mccb_no}</td><td colspan="2"></td>
    <td class="num">${DT_GRAND_TOTAL.gnd_yes}</td><td colspan="2"></td>
    <td class="num">${DT_GRAND_TOTAL.lt_copper}</td><td class="num">${DT_GRAND_TOTAL.lt_aluminium}</td>
    <td style="font-size:.78rem;font-weight:700;color:var(--green2)">${(DT_GRAND_TOTAL.kpi_la*100).toFixed(1)}%</td>
    <td style="font-size:.78rem;font-weight:700;color:var(--green2)">${(DT_GRAND_TOTAL.kpi_dofc*100).toFixed(1)}%</td>
    <td style="font-size:.78rem;font-weight:700;color:var(--amber2)">${(DT_GRAND_TOTAL.kpi_mccb*100).toFixed(1)}%</td>
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
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="sdd-tbody">
        ${renderSDDRows(OVERALL_SUMMARY)}
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

function renderSDDRows(list) {
  return list.map((s,i) => {
    const laP  = s.total ? (s.kpi_la*100).toFixed(1)+'%' : '—';
    const dofcP= s.total ? (s.kpi_dofc*100).toFixed(1)+'%' : '—';
    const mccbP= s.total ? (s.kpi_mccb*100).toFixed(1)+'%' : '—';
    const sddId = s.name.toLowerCase().replace(/[^a-z0-9]/g,'_');
    return `<tr>
      <td>${s.sr}</td>
      <td>
        <a href="#" onclick="window.showSection('dt-details','${sddId}');return false"
           style="color:var(--blue);font-weight:600">${s.name}</a>
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
      <td>
        <button class="btn btn-xs btn-secondary" onclick="window.showSection('dt-details','${sddId}')">
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
};

/* ── DT Details (per SDD — reads Firebase; demo with Rajshahi-1 data) ───── */
let DT_DETAIL_RECORDS = [];
let DT_DETAIL_SDD     = null;

async function renderDTDetails(sddId) {
  DT_DETAIL_SDD = sddId;
  const sddObj  = OVERALL_SUMMARY.find(s => s.name.toLowerCase().replace(/[^a-z0-9]/g,'_') === sddId);
  const sddName = sddObj ? sddObj.name : sddId;

  // Show loading state immediately
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>DT Details — ${sddName}</h2><p>Loading transformer records...</p></div>
    <div class="sec-head-right">
      <button class="btn btn-sm btn-secondary" onclick="window.showSection('dt-sdd-summary')"><i class="fas fa-arrow-left"></i> Back</button>
    </div>
  </div>
  <div class="page-loader"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
  `;

  // Load from Firebase if configured, else use demo data
  if (IS_CONFIGURED && db) {
    try {
      const { getDocs, collection, query, where, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const q = query(collection(db,'dt_records'), where('sdd_id','==',sddId), orderBy('sl'), limit(200));
      const snap = await getDocs(q);
      DT_DETAIL_RECORDS = snap.docs.map(d => d.data());
    } catch(e) {
      console.error('Firebase load error:', e);
      DT_DETAIL_RECORDS = sddId.includes('rajshahi_1') ? _demoRecords() : [];
    }
  } else {
    // Demo: use Rajshahi-1 Binodpur records
    DT_DETAIL_RECORDS = sddId.includes('rajshahi_1') || sddId === 'rajshahi_1' ? _demoRecords() : [];
  }

  _showDTDetailsPage(sddName, sddId);
}

function _demoRecords() {
  return [
    {sl:1,substation:'Talaimary',feeder:'Binodpur',gis_id:'2085135',capacity_kva:250,ref_no:'4256',gis_location:'Open in Google Maps',local_name:'Hanufar Mor West',la_yn:'Yes',la_cond:'Good',dofc_yn:'Yes',dofc_cond:'Bad',mccb_yn:'No',mccb_cond:null,gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:2,substation:'Talaimary',feeder:'Binodpur',gis_id:'2084899',capacity_kva:250,ref_no:'4780',gis_location:'Open in Google Maps',local_name:'Anis Mor East',la_yn:'No',la_cond:null,dofc_yn:'No',dofc_cond:null,mccb_yn:'No',mccb_cond:null,gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:3,substation:'Talaimary',feeder:'Binodpur',gis_id:'2084594',capacity_kva:200,ref_no:'4087',gis_location:'Open in Google Maps',local_name:'Binodpur Bazar Mosque',la_yn:'No',la_cond:null,dofc_yn:'No',dofc_cond:null,mccb_yn:'Yes',mccb_cond:'Bad',gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:4,substation:'Talaimary',feeder:'Binodpur',gis_id:'2084561',capacity_kva:250,ref_no:'4044',gis_location:'Open in Google Maps',local_name:'Hanufar Mor',la_yn:'No',la_cond:null,dofc_yn:'No',dofc_cond:null,mccb_yn:'No',mccb_cond:null,gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:5,substation:'Talaimary',feeder:'Binodpur',gis_id:'2084832',capacity_kva:100,ref_no:'6250',gis_location:'Open in Google Maps',local_name:'Mirzapur Unique Palace',la_yn:'Yes',la_cond:'Good',dofc_yn:'Yes',dofc_cond:'Good',mccb_yn:'Yes',mccb_cond:'Good',gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:6,substation:'Talaimary',feeder:'Binodpur',gis_id:'2084681',capacity_kva:250,ref_no:'4263',gis_location:'Open in Google Maps',local_name:'Lebubagan-1',la_yn:'Yes',la_cond:'Good',dofc_yn:'Yes',dofc_cond:'Good',mccb_yn:'Yes',mccb_cond:'Bad',gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:7,substation:'Talaimary',feeder:'Binodpur',gis_id:'2084948',capacity_kva:200,ref_no:'4051',gis_location:'Open in Google Maps',local_name:'Mirzapur Milestone School',la_yn:'No',la_cond:null,dofc_yn:'No',dofc_cond:null,mccb_yn:'No',mccb_cond:null,gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:8,substation:'Talaimary',feeder:'CharKazla',gis_id:'2084494',capacity_kva:200,ref_no:'13013',gis_location:'Open in Google Maps',local_name:'Corridor Mor',la_yn:'No',la_cond:null,dofc_yn:'No',dofc_cond:null,mccb_yn:'No',mccb_cond:null,gnd_yn:'Yes',gnd_count:1,lt_conductor:'Copper'},
    {sl:9,substation:'Talaimary',feeder:'CharKazla',gis_id:'2084854',capacity_kva:200,ref_no:'12528',gis_location:'Open in Google Maps',local_name:'Abdur Rahim Mor North',la_yn:'Yes',la_cond:'Good',dofc_yn:'Yes',dofc_cond:'Good',mccb_yn:'Yes',mccb_cond:'Good',gnd_yn:'Yes',gnd_count:2,lt_conductor:'Copper'},
    {sl:10,substation:'Talaimary',feeder:'Raninagar',gis_id:'2084511',capacity_kva:200,ref_no:'3213',gis_location:'Open in Google Maps',local_name:'Shahid Minar North',la_yn:'Yes',la_cond:'Bad',dofc_yn:'No',dofc_cond:null,mccb_yn:'No',mccb_cond:null,gnd_yn:'Yes',gnd_count:1,lt_conductor:'Aluminium'},
  ];
}

function _showDTDetailsPage(sddName, sddId) {
  const allFeeders = [...new Set(DT_DETAIL_RECORDS.map(r=>r.feeder).filter(Boolean))];

  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>DT Details — ${sddName}</h2>
      <p>${DT_DETAIL_RECORDS.length} transformer records ${IS_CONFIGURED ? '(from Firebase)' : '(demo data — connect Firebase for all records)'}</p>
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

  ${!IS_CONFIGURED ? `<div class="alert alert-warn"><i class="fas fa-info-circle"></i>
    <div>Showing demo records (Rajshahi-1 only). Run <strong>parse_all_dt.py</strong> → <strong>upload_dt_firebase.py</strong> → paste Firebase config to load all 14,000 records.</div>
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
    <td style="font-size:.76rem">
      ${r.gis_location && r.gis_location !== 'Open in Google Maps' ?
        `<a href="${r.gis_location}" target="_blank"><i class="fas fa-map-marker-alt" style="color:var(--red2)"></i> Map</a>` :
        '<span style="color:var(--text3)">—</span>'}
    </td>
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
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>Distribution Transformer — Operating Values</h2>
      <p>Phase current measurements and oil temperature readings</p>
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
        <option value="">All</option>
        <option value="Yes">Overloaded</option>
        <option value="No">Normal</option>
      </select>
      ${currentRole==='admin' ? `<button class="btn btn-primary btn-sm" onclick="window.openAddOpModal()"><i class="fas fa-plus"></i> Add Reading</button>` : ''}
      <button class="btn btn-sm btn-secondary" onclick="window.exportOpCSV()"><i class="fas fa-download"></i> CSV</button>
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${DT_OP_DATA.length}</div><div class="kpi-sub">Records Entered</div></div>
    <div class="kpi-card red"><div class="kpi-val">${DT_OP_DATA.filter(r=>r.overload==='Yes').length}</div><div class="kpi-sub">Overloaded</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${DT_OP_DATA.length ? (DT_OP_DATA.reduce((s,r)=>s+(parseFloat(r.oil_temp)||0),0)/DT_OP_DATA.length).toFixed(1)+'°C' : '—'}</div><div class="kpi-sub">Avg Oil Temperature</div></div>
    <div class="kpi-card green"><div class="kpi-val">${DT_OP_DATA.filter(r=>r.overload==='No').length}</div><div class="kpi-sub">Normal Load</div></div>
  </div>

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
          <th style="color:#3b82f6">Rated Current (A)</th>
          <th style="color:#ef4444">Phase A (A)</th>
          <th style="color:#f59e0b">Phase B (A)</th>
          <th style="color:#10b981">Phase C (A)</th>
          <th>Total kVA</th>
          <th>Overload</th>
          <th>Oil Temp (°C)</th>
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

  <div class="alert alert-info" style="margin-top:16px">
    <i class="fas fa-calculator"></i>
    <div>
      <strong>Rated Current</strong> = kVA × 1000 / (√3 × 400) &nbsp;|&nbsp;
      <strong>Total kVA</strong> = 3 × kVA per phase &nbsp;|&nbsp;
      <strong>Overload</strong>: Yes if any phase current &gt; Rated Current
    </div>
  </div>
  `;
}

function ratedCurrent(kva) {
  if (!kva) return null;
  return +(kva * 1000 / (Math.sqrt(3) * 400)).toFixed(1);
}

function renderOpRows(rows) {
  if (!rows.length) return `<tr><td colspan="14" class="tbl-empty">No operating records. Admin can add readings using the + Add Reading button.</td></tr>`;
  return rows.map((r,i) => {
    const rated = ratedCurrent(r.capacity_kva);
    const phA   = parseFloat(r.phase_a) || null;
    const phB   = parseFloat(r.phase_b) || null;
    const phC   = parseFloat(r.phase_c) || null;
    const maxPh = Math.max(phA||0, phB||0, phC||0);
    const totalKva = (phA&&phB&&phC) ? +(3 * (phA+phB+phC)/3 * 400 / 1000).toFixed(1) : null;
    const overload = rated && maxPh > rated ? 'Yes' : (maxPh > 0 ? 'No' : null);
    const phCell = (v, col) => v!=null ? `<td class="num" style="background:${overload==='Yes'&&v>rated?'rgba(239,68,68,.08)':'transparent'};color:${col};font-weight:600">${v}</td>` : '<td class="num">—</td>';
    return `<tr>
      <td>${i+1}</td>
      <td style="font-family:'Courier New',monospace;font-size:.78rem">${D(r.gis_id)}</td>
      <td class="num">${D(r.capacity_kva)}</td>
      <td style="font-size:.76rem">${D(r.gis_location)}</td>
      <td style="font-size:.8rem">${(r.local_name||'—').substring(0,18)}${(r.local_name||'').length>18?'…':''}</td>
      <td class="num" style="color:#3b82f6;font-weight:600">${rated||'—'}</td>
      ${phCell(phA,'#ef4444')}
      ${phCell(phB,'#f59e0b')}
      ${phCell(phC,'#10b981')}
      <td class="num">${totalKva!=null ? totalKva : '—'}</td>
      <td>${overload!=null ? `<span class="badge ${overload==='Yes'?'badge-bad':'badge-good'}">${overload}</span>` : '—'}</td>
      <td class="num" style="${(r.oil_temp||0)>80?'color:var(--red2);font-weight:700':''}">${D(r.oil_temp)}</td>
      <td style="font-size:.78rem">${D(r.date)}</td>
      ${currentRole==='admin' ? `<td>
        <button class="btn btn-xs btn-secondary" onclick="window.openEditOpModal(${i})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-xs btn-danger" onclick="window.deleteOpRecord(${i})" style="margin-left:2px"><i class="fas fa-trash"></i></button>
      </td>` : ''}
    </tr>`;
  }).join('');
}

window.filterOpTable = () => {
  const sdd    = document.getElementById('op-sdd')?.value    || '';
  const feeder = document.getElementById('op-feeder')?.value || '';
  const ov     = document.getElementById('op-overload')?.value|| '';
  const rated  = r => ratedCurrent(r.capacity_kva);
  const maxPh  = r => Math.max(parseFloat(r.phase_a)||0, parseFloat(r.phase_b)||0, parseFloat(r.phase_c)||0);
  const filtered = DT_OP_DATA.filter(r => {
    if (sdd    && r.sdd_name !== sdd)   return false;
    if (feeder && r.feeder  !== feeder) return false;
    if (ov === 'Yes' && !(rated(r) && maxPh(r) > rated(r))) return false;
    if (ov === 'No'  &&  (rated(r) && maxPh(r) > rated(r))) return false;
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
══════════════════════════════════════════════════ */
function renderLoadHistory() {
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left"><h2>Load History</h2>
      <p>Monthly load trends — Talaimary 33/11 kV (2024)</p>
    </div>
    <div class="sec-head-right">
      <select class="filter-sel"><option>2024</option><option>2023</option></select>
      <button class="btn btn-sm btn-secondary" onclick="window.exportLoadCSV()"><i class="fas fa-download"></i> Export CSV</button>
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(5,1fr)">
    <div class="kpi-card amber"><div class="kpi-val">${Math.max(...LOAD_HISTORY.total)} MW</div><div class="kpi-sub">Peak Load (2024)</div></div>
    <div class="kpi-card"><div class="kpi-val">${(LOAD_HISTORY.total.reduce((a,b)=>a+b)/12).toFixed(1)} MW</div><div class="kpi-sub">Average Load</div></div>
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
    <div class="panel-head"><h3>Monthly Load Data</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead><tr><th>Month</th><th>T1 Load (MW)</th><th>T2 Load (MW)</th><th>Total (MW)</th><th>Loading %</th></tr></thead>
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
  </div>
  `;
  setTimeout(() => {
    const ctx1 = document.getElementById('chart-load-line');
    if (ctx1) charts['load-line'] = new Chart(ctx1, {
      type:'line',
      data:{labels:LOAD_HISTORY.labels,datasets:[
        {label:'T1 (MW)',   data:LOAD_HISTORY.T1,   borderColor:'#1565c0',backgroundColor:'rgba(21,101,192,.1)',tension:0.4,fill:true,pointRadius:5},
        {label:'T2 (MW)',   data:LOAD_HISTORY.T2,   borderColor:'#059669',backgroundColor:'rgba(5,150,105,.1)', tension:0.4,fill:true,pointRadius:5},
        {label:'Total (MW)',data:LOAD_HISTORY.total,borderColor:'#d97706',backgroundColor:'transparent',        tension:0.4,borderDash:[5,4],pointRadius:3},
      ]},
      options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false,title:{display:true,text:'Load (MW)'}}},plugins:{legend:{position:'top'}}}
    });
    const ctx2 = document.getElementById('chart-load-pie');
    if (ctx2) charts['load-pie'] = new Chart(ctx2, {
      type:'doughnut',
      data:{labels:['T1 Load','T2 Load'],datasets:[{data:[LOAD_HISTORY.T1.reduce((a,b)=>a+b),LOAD_HISTORY.T2.reduce((a,b)=>a+b)],backgroundColor:['#1565c0','#059669'],borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}
    });
  }, 100);
}

window.exportLoadCSV = () => {
  const rows=[['Month','T1 (MW)','T2 (MW)','Total (MW)','Loading %']];
  LOAD_HISTORY.labels.forEach((m,i)=>rows.push([m+' 2024',LOAD_HISTORY.T1[i],LOAD_HISTORY.T2[i],LOAD_HISTORY.total[i],Math.round(LOAD_HISTORY.total[i]/40*100)+'%']));
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})),download:'load_history_2024.csv'});
  a.click(); showToast('Exported!','success');
};


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
    return qOk && typeOk && txOk;
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
