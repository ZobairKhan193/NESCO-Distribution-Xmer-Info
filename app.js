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
  'switching-ss':      '33 kV Switching Substations',
  'dt-summary':        'Distribution Transformer › Substation-wise Summary',
  'dt-load':           'Distribution Transformer › Load',
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
    'dt-summary':        renderDTSummary,
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
  document.getElementById('content').innerHTML = `
  <div class="sec-head">
    <div class="sec-head-left">
      <h2>33 kV Switching Substations</h2>
      <p>Grid substation information and switching station works under ADB project</p>
    </div>
  </div>

  <div class="kpi-row" style="grid-template-columns:repeat(4,1fr)">
    <div class="kpi-card navy"><div class="kpi-val">${GRID_SUBSTATIONS.length}</div><div class="kpi-sub">Total Grid Substations</div></div>
    <div class="kpi-card green"><div class="kpi-val">${GRID_SUBSTATIONS.filter(g=>g.condition==='Existing').length}</div><div class="kpi-sub">Existing</div></div>
    <div class="kpi-card amber"><div class="kpi-val">${GRID_SUBSTATIONS.filter(g=>g.condition==='Ongoing').length}</div><div class="kpi-sub">Ongoing / Under Construction</div></div>
    <div class="kpi-card"><div class="kpi-val">${GRID_SUBSTATIONS.filter(g=>g.sw_type==='GIS').length}</div><div class="kpi-sub">GIS Switching SS</div></div>
  </div>

  <!-- Grid Substations table -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3><i class="fas fa-network-wired"></i> Grid Substation Locations</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Sl.</th>
          <th>Zone</th>
          <th>Name of Grid Substation</th>
          <th>Grid SS Type</th>
          <th>33 kV Switching SS Type</th>
          <th>Switching SS Operated By</th>
          <th>Operating Condition</th>
          <th>Google Map</th>
          ${currentRole==='admin' ? '<th>Action</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${(() => {
          let lastZone = null;
          return GRID_SUBSTATIONS.map((g,i) => {
            const showZone = g.zone && g.zone !== lastZone;
            if (g.zone) lastZone = g.zone;
            return `
            <tr${showZone ? ' style="border-top:3px solid var(--blue)"' : ''}>
              <td>${g.sr || '—'}</td>
              <td>${showZone ? `<span class="badge badge-blue">${g.zone}</span>` : (g.zone===lastZone ? '' : '')}</td>
              <td><strong>${g.name}</strong>${g.note ? ` <span style="font-size:.72rem;color:var(--text3)">(${g.note})</span>` : ''}</td>
              <td><span class="badge ${g.grid_type==='GIS'?'badge-blue':'badge-gray'}">${g.grid_type}</span></td>
              <td><span class="badge ${g.sw_type==='GIS'?'badge-blue':'badge-gray'}">${g.sw_type}</span></td>
              <td>
                <span class="badge ${g.operated_by==='NESCO'?'badge-yes':g.operated_by==='Power Grid'?'badge-blue':g.operated_by==='PBS'?'badge-partial':'badge-gray'}">
                  ${g.operated_by}
                </span>
              </td>
              <td><span class="badge ${g.condition==='Existing'?'badge-good':g.condition==='Ongoing'?'badge-partial':'badge-gray'}">${g.condition}</span></td>
              <td>${g.gps_lat ? `<a href="https://maps.google.com/?q=${g.gps_lat},${g.gps_lng}" target="_blank"><i class="fas fa-map-marker-alt" style="color:var(--red2)"></i> View</a>` : '—'}</td>
              ${currentRole==='admin' ? `<td><button class="btn btn-xs btn-secondary" onclick="window.openEditGridModal(${i})"><i class="fas fa-edit"></i></button></td>` : ''}
            </tr>`;
          }).join('');
        })()}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- Switching SS Works -->
  <div class="panel" style="margin-bottom:20px">
    <div class="panel-head"><h3><i class="fas fa-tools"></i> Switching Substation Works — ADB Funded Project</h3></div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr><th>SL</th><th>Grid Name</th><th>Description of Work</th><th>Type</th></tr>
      </thead>
      <tbody>
        ${SWITCHING_SS_WORKS.map(w=>`
        <tr>
          <td>${w.sl}</td>
          <td><strong>${w.grid}</strong></td>
          <td style="font-size:.82rem">${w.description}</td>
          <td><span class="badge ${w.type.includes('GIS')?'badge-blue':'badge-gray'}">${w.type}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div></div>
  </div>

  <!-- Bay Breaker Requirements -->
  <div class="panel">
    <div class="panel-head"><h3><i class="fas fa-plug"></i> Bay Breaker Requirements at Grid Substations</h3>
      <span class="badge badge-blue">Total: ${BAY_BREAKER_WORKS.reduce((s,b)=>s+b.bays,0)} bay breakers</span>
    </div>
    <div class="panel-body no-pad"><div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr><th>SL</th><th>132/33 kV Source Grid</th><th>Bay Breakers Required</th><th>Description of Line Bay</th><th>S&D</th></tr>
      </thead>
      <tbody>
        ${BAY_BREAKER_WORKS.map(b=>`
        <tr>
          <td>${b.sl}</td>
          <td><strong>${b.grid}</strong></td>
          <td class="num"><strong>${b.bays}</strong></td>
          <td style="font-size:.82rem">${b.description}</td>
          <td style="font-size:.78rem;color:var(--text3)">${b.sdd||'—'}</td>
        </tr>`).join('')}
        <tr style="background:#f0f5fb;font-weight:700">
          <td colspan="2">Total</td>
          <td class="num">${BAY_BREAKER_WORKS.reduce((s,b)=>s+b.bays,0)}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
    </div></div>
  </div>
  `;
}

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
