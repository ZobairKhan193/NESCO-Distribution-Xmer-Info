/* ═══════════════════════════════════════════════════════════════════
   TransInspect — script.js
   Handles: Firebase connection, form submit, table display,
            CSV/Excel import, CSV export, validation, search
   ─────────────────────────────────────────────────────────────────
   BEGINNER NOTE: Read each section heading. The sections are:
   1. Firebase Config     ← You MUST edit this
   2. Firebase Setup
   3. Navigation
   4. Form Submit
   5. Load & Display Records
   6. Search & Filter
   7. Delete Record
   8. Export to CSV
   9. Import CSV / Excel
  10. Utility Helpers
═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════
   SECTION 1 — FIREBASE CONFIG
   ★ PASTE YOUR FIREBASE CONFIG HERE ★
   Get this from: Firebase Console → Your Project → ⚙️ Settings
   → "Your apps" → Web App → Config
═══════════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyAklct5CT07Medb_aCKouodofrebHhaavs",
  authDomain: "distribution-transformer-info.firebaseapp.com",
  projectId: "distribution-transformer-info",
  storageBucket: "distribution-transformer-info.firebasestorage.app",
  messagingSenderId: "256439246815",
  appId: "1:256439246815:web:5e2f54a78693b3a203ee6a",
  measurementId: "G-WMHSJLFYPX"
};

// ─── Check if config is still placeholder ────────────────────────
const IS_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY";


/* ═══════════════════════════════════════════════════════════════════
   SECTION 2 — FIREBASE SETUP
   We use the Firebase CDN (loaded via importmap below).
   Firestore is Firebase's NoSQL database — it stores "documents"
   (like JSON objects) inside "collections" (like folders).
   Our collection is called "inspections".
═══════════════════════════════════════════════════════════════════ */

// Firebase SDK imports (loaded from CDN as ES modules)
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// These will be set after init
let app, db, inspectionsCol;

function initFirebase() {
  if (!IS_CONFIGURED) {
    // Firebase not configured — use local storage as fallback so
    // beginners can still test the UI without a database
    console.warn("Firebase not configured. Using localStorage as demo fallback.");
    document.getElementById('config-banner').classList.remove('hidden');
    return false;
  }

  try {
    app             = initializeApp(firebaseConfig);
    db              = getFirestore(app);
    // "inspections" is the name of our Firestore collection
    inspectionsCol  = collection(db, "inspections");
    console.log("✅ Firebase connected.");
    document.getElementById('config-banner').style.display = 'none';
    return true;
  } catch (err) {
    console.error("Firebase init error:", err);
    showToast("❌ Firebase connection failed. Check your config.", "error");
    return false;
  }
}

// ─── localStorage fallback (for demo without Firebase) ───────────
// When Firebase is not set up, records are stored in the browser.
// They will disappear when the browser cache is cleared.
const DEMO_KEY = "transinspect_demo_records";

function getDemoRecords() {
  return JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
}
function saveDemoRecord(record) {
  const records = getDemoRecords();
  record.id        = "demo_" + Date.now();
  record.createdAt = new Date().toISOString();
  records.push(record);
  localStorage.setItem(DEMO_KEY, JSON.stringify(records));
  return record.id;
}
function deleteDemoRecord(id) {
  let records = getDemoRecords();
  records = records.filter(r => r.id !== id);
  localStorage.setItem(DEMO_KEY, JSON.stringify(records));
}


/* ═══════════════════════════════════════════════════════════════════
   SECTION 3 — NAVIGATION
   Switches between the 3 main sections: Form / Table / Import
═══════════════════════════════════════════════════════════════════ */

function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Show the requested section
  document.getElementById(sectionId).classList.add('active');
  // Update nav button highlight
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Match the nav button to the section
  const btnMap = {
    'form-section':   0,
    'table-section':  1,
    'import-section': 2
  };
  const btns = document.querySelectorAll('.nav-btn');
  if (btnMap[sectionId] !== undefined) btns[btnMap[sectionId]].classList.add('active');

  // Auto-load records when switching to table view
  if (sectionId === 'table-section') loadRecords();
}


/* ═══════════════════════════════════════════════════════════════════
   SECTION 4 — FORM SUBMIT
   Reads all form fields, validates them, then saves to Firebase
   (or localStorage demo fallback).
═══════════════════════════════════════════════════════════════════ */

document.getElementById('inspection-form').addEventListener('submit', async function(e) {
  e.preventDefault(); // Stop the page from reloading

  if (!validateForm()) return; // Stop if validation fails

  // ── Collect form data ─────────────────────────────────────────
  const record = {
    sl_no:              getVal('sl_no'),
    feeder_name:        getVal('feeder_name'),
    substation_name:    getVal('substation_name'),
    transformer_name:   getVal('transformer_name'),
    gis_id:             getVal('gis_id'),
    capacity_kva:       getVal('capacity_kva'),
    map_location:       getVal('map_location'),

    // Equipment status
    la_present:         getRadio('la_present'),
    la_condition:       getVal('la_condition'),
    dofc_present:       getRadio('dofc_present'),
    dofc_condition:     getVal('dofc_condition'),
    mccb_present:       getRadio('mccb_present'),
    mccb_condition:     getVal('mccb_condition'),

    // Grounding & LT Loop
    grounding_present:  getRadio('grounding_present'),
    grounding_qty:      getVal('grounding_qty'),
    lt_loop_material:   getVal('lt_loop_material'),
    notes:              getVal('notes'),
  };

  // ── Show loading state ────────────────────────────────────────
  const btn = document.getElementById('submit-btn');
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline';
  btn.disabled = true;

  try {
    if (IS_CONFIGURED) {
      // ── Save to Firestore ──────────────────────────────────
      // addDoc() creates a new document in the "inspections" collection
      // serverTimestamp() lets Firebase record the exact save time
      await addDoc(inspectionsCol, {
        ...record,
        createdAt: serverTimestamp()
      });
    } else {
      // ── Save to localStorage (demo) ────────────────────────
      saveDemoRecord(record);
    }

    showToast("✅ Record saved successfully!");
    resetForm();
    // Switch to table view to see the new record
    setTimeout(() => showSection('table-section'), 1000);

  } catch (err) {
    console.error("Save error:", err);
    showToast("❌ Failed to save. Check console for details.", "error");
  } finally {
    // Restore button state
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loader').style.display = 'none';
    btn.disabled = false;
  }
});


/* ═══════════════════════════════════════════════════════════════════
   SECTION 5 — LOAD & DISPLAY RECORDS
   Fetches all documents from Firestore and builds the HTML table.
═══════════════════════════════════════════════════════════════════ */

// This array holds all loaded records for search/filter
let allRecords = [];

async function loadRecords() {
  const tbody = document.getElementById('records-body');
  tbody.innerHTML = '<tr><td colspan="13" class="empty-state">⏳ Loading records...</td></tr>';

  try {
    let records = [];

    if (IS_CONFIGURED) {
      // ── Fetch from Firestore ───────────────────────────────
      // getDocs() fetches ALL documents from the collection
      // orderBy('createdAt') sorts newest first
      const q       = query(inspectionsCol, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      snapshot.forEach(docSnap => {
        records.push({ id: docSnap.id, ...docSnap.data() });
      });
    } else {
      // ── Load from localStorage (demo) ──────────────────────
      records = getDemoRecords().reverse();
    }

    allRecords = records;
    renderTable(records);
    updateSummaryCards(records);

  } catch (err) {
    console.error("Load error:", err);
    tbody.innerHTML = '<tr><td colspan="13" class="empty-state">❌ Failed to load records.</td></tr>';
  }
}

// ─── Render records into the HTML table ──────────────────────────
function renderTable(records) {
  const tbody = document.getElementById('records-body');

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="13" class="empty-state">No records found. Add your first inspection!</td></tr>';
    return;
  }

  // Build table rows
  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${esc(r.sl_no)}</td>
      <td>${esc(r.feeder_name)}</td>
      <td>${esc(r.substation_name)}</td>
      <td title="${esc(r.transformer_name)}">${esc(r.transformer_name)}</td>
      <td><strong>${esc(r.capacity_kva)}</strong></td>
      <td>
        ${badge(r.la_present, 'present')}
        ${r.la_condition ? badge(r.la_condition, 'condition') : ''}
      </td>
      <td>
        ${badge(r.dofc_present, 'present')}
        ${r.dofc_condition ? badge(r.dofc_condition, 'condition') : ''}
      </td>
      <td>
        ${badge(r.mccb_present, 'present')}
        ${r.mccb_condition ? badge(r.mccb_condition, 'condition') : ''}
      </td>
      <td>${badge(r.grounding_present, 'present')} ${r.grounding_qty ? '(' + esc(r.grounding_qty) + ')' : ''}</td>
      <td>${esc(r.lt_loop_material) || '—'}</td>
      <td>
        ${r.map_location
          ? `<a class="btn-map" href="${esc(r.map_location)}" target="_blank">🗺️ Map</a>`
          : '—'}
      </td>
      <td title="${esc(r.notes)}">${r.notes ? esc(r.notes).substring(0, 40) + (r.notes.length > 40 ? '…' : '') : '—'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-delete" onclick="deleteRecord('${r.id}')">🗑 Del</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Summary cards above the table ───────────────────────────────
function updateSummaryCards(records) {
  const total = records.length;
  const laYes   = records.filter(r => r.la_present   === 'Yes').length;
  const dofcYes = records.filter(r => r.dofc_present === 'Yes').length;
  const mccbYes = records.filter(r => r.mccb_present === 'Yes').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-la').textContent    = laYes;
  document.getElementById('stat-dofc').textContent  = dofcYes;
  document.getElementById('stat-mccb').textContent  = mccbYes;
}


/* ═══════════════════════════════════════════════════════════════════
   SECTION 6 — SEARCH & FILTER
   Filters the displayed table rows in real time as user types.
═══════════════════════════════════════════════════════════════════ */

function filterTable() {
  const term = document.getElementById('search-input').value.toLowerCase().trim();
  if (!term) {
    renderTable(allRecords);
    return;
  }
  const filtered = allRecords.filter(r =>
    Object.values(r).some(v =>
      v && String(v).toLowerCase().includes(term)
    )
  );
  renderTable(filtered);
}


/* ═══════════════════════════════════════════════════════════════════
   SECTION 7 — DELETE RECORD
   Shows a confirmation modal before deleting.
═══════════════════════════════════════════════════════════════════ */

let pendingDeleteId = null;

function deleteRecord(id) {
  pendingDeleteId = id;
  document.getElementById('delete-modal').style.display = 'flex';
}

function closeModal() {
  pendingDeleteId = null;
  document.getElementById('delete-modal').style.display = 'none';
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  closeModal();

  try {
    if (IS_CONFIGURED) {
      // deleteDoc() removes the document with this ID from Firestore
      await deleteDoc(doc(db, "inspections", pendingDeleteId));
    } else {
      deleteDemoRecord(pendingDeleteId);
    }
    showToast("🗑️ Record deleted.");
    loadRecords(); // Refresh table
  } catch (err) {
    console.error("Delete error:", err);
    showToast("❌ Delete failed.", "error");
  }
}

// Close modal when clicking outside
document.getElementById('delete-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});


/* ═══════════════════════════════════════════════════════════════════
   SECTION 8 — EXPORT TO CSV
   Downloads all currently loaded records as a .csv file.
═══════════════════════════════════════════════════════════════════ */

function exportToCSV() {
  if (allRecords.length === 0) {
    showToast("No records to export!", "error");
    return;
  }

  // Define the column order for the export
  const columns = [
    'sl_no','feeder_name','substation_name','transformer_name','gis_id',
    'capacity_kva','la_present','la_condition','dofc_present','dofc_condition',
    'mccb_present','mccb_condition','grounding_present','grounding_qty',
    'lt_loop_material','map_location','notes'
  ];

  const header = columns.join(',');

  const rows = allRecords.map(r =>
    columns.map(col => {
      const val = r[col] ?? '';
      // Wrap in quotes if it contains a comma or newline
      return String(val).includes(',') || String(val).includes('\n')
        ? `"${String(val).replace(/"/g, '""')}"` : String(val);
    }).join(',')
  );

  const csvContent = [header, ...rows].join('\n');

  // Create a temporary download link and click it
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `transformer_inspection_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("⬇️ CSV downloaded!");
}


/* ═══════════════════════════════════════════════════════════════════
   SECTION 9 — IMPORT CSV / EXCEL
   Uses the SheetJS library to parse files in the browser.
   Then sends each row to Firebase as a new document.
═══════════════════════════════════════════════════════════════════ */

let parsedImportData = []; // Holds parsed rows before import

// ─── Drag & Drop handlers ─────────────────────────────────────────
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.add('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processImportFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processImportFile(file);
}

// ─── Parse the uploaded file ─────────────────────────────────────
function processImportFile(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      // XLSX.read() can handle both .csv and .xlsx / .xls
      const data     = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // Take the first sheet
      const sheetName = workbook.SheetNames[0];
      const sheet     = workbook.Sheets[sheetName];

      // sheet_to_json converts each row into a JavaScript object
      // The first row of your file becomes the object keys (column names)
      parsedImportData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (parsedImportData.length === 0) {
        showToast("❌ File is empty or unreadable.", "error");
        return;
      }

      showImportPreview(parsedImportData);

    } catch (err) {
      console.error("File parse error:", err);
      showToast("❌ Could not read file. Make sure it's a valid CSV or Excel.", "error");
    }
  };

  reader.readAsArrayBuffer(file);
}

// ─── Show a preview table of the first 5 rows ────────────────────
function showImportPreview(data) {
  const preview  = data.slice(0, 5);
  const columns  = Object.keys(data[0]);
  const table    = document.getElementById('preview-table');

  table.innerHTML = `
    <thead>
      <tr>${columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${preview.map(row => `
        <tr>${columns.map(c => `<td>${esc(String(row[c]))}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  `;

  // Show count info
  document.getElementById('import-btn').textContent =
    `⬆️ Import All ${data.length} Rows to Database`;

  document.getElementById('drop-zone').style.display = 'none';
  document.getElementById('import-preview').style.display = 'block';
}

function cancelImport() {
  parsedImportData = [];
  document.getElementById('drop-zone').style.display = 'block';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('file-input').value = '';
}

// ─── Map column names flexibly ────────────────────────────────────
// This lets the importer work even if column names are slightly different
// e.g. "Feeder Name" maps to "feeder_name"
const COLUMN_ALIASES = {
  sl_no:             ['sl_no','sl.','serial','sl no','serial no','serial number','#'],
  feeder_name:       ['feeder_name','feeder name','feeder','feedername'],
  substation_name:   ['substation_name','substation name','substation','substationname'],
  transformer_name:  ['transformer_name','transformer name','transformer','local name','localname'],
  gis_id:            ['gis_id','gis id','gis','gisid'],
  capacity_kva:      ['capacity_kva','capacity','kva','rating','kva rating'],
  map_location:      ['map_location','map location','map link','gis location','google maps'],
  la_present:        ['la_present','la present','11kv la','la'],
  la_condition:      ['la_condition','la condition','la cond'],
  dofc_present:      ['dofc_present','dofc present','11kv dofc','dofc'],
  dofc_condition:    ['dofc_condition','dofc condition','dofc cond'],
  mccb_present:      ['mccb_present','mccb present','0.4kv mccb','mccb'],
  mccb_condition:    ['mccb_condition','mccb condition','mccb cond'],
  grounding_present: ['grounding_present','grounding present','grounding','ground'],
  grounding_qty:     ['grounding_qty','grounding qty','grounding quantity','gnd qty'],
  lt_loop_material:  ['lt_loop_material','lt loop','lt loop material','lt material','copper/aluminium'],
  notes:             ['notes','note','remarks','comment','additional notes'],
};

function mapColumns(rawRow) {
  const mapped = {};
  const rawKeys = Object.keys(rawRow);

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    // Find the raw column that matches any alias (case-insensitive)
    const match = rawKeys.find(k =>
      aliases.includes(k.toLowerCase().trim())
    );
    mapped[field] = match ? String(rawRow[match]).trim() : '';
  }
  return mapped;
}

// ─── Send all rows to Firestore ───────────────────────────────────
async function importData() {
  if (parsedImportData.length === 0) return;

  const btn = document.getElementById('import-btn');
  btn.disabled   = true;
  btn.textContent = '⏳ Importing...';

  let successCount = 0;
  let errorCount   = 0;

  for (const rawRow of parsedImportData) {
    try {
      const record = mapColumns(rawRow);
      // Add a timestamp to each imported record
      if (IS_CONFIGURED) {
        await addDoc(inspectionsCol, { ...record, createdAt: serverTimestamp() });
      } else {
        saveDemoRecord(record);
      }
      successCount++;
    } catch (err) {
      console.error("Row import error:", err, rawRow);
      errorCount++;
    }
  }

  btn.disabled   = false;
  btn.textContent = `⬆️ Import All ${parsedImportData.length} Rows`;

  showToast(`✅ Imported ${successCount} rows${errorCount > 0 ? `, ${errorCount} failed` : ''}!`);
  cancelImport();

  // Go to table to see imported records
  setTimeout(() => showSection('table-section'), 1500);
}


/* ═══════════════════════════════════════════════════════════════════
   SECTION 10 — UTILITY HELPERS
═══════════════════════════════════════════════════════════════════ */

// ─── Get form field value ─────────────────────────────────────────
function getVal(id) {
  return (document.getElementById(id)?.value || '').trim();
}

// ─── Get selected radio value ─────────────────────────────────────
function getRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

// ─── Escape HTML to prevent XSS ──────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Generate status badge HTML ───────────────────────────────────
function badge(value, type) {
  if (!value) return '';
  const cls = {
    'Yes':       'badge-yes',
    'No':        'badge-no',
    'Good':      'badge-good',
    'Bad':       'badge-bad',
  }[value] || 'badge-no';
  return `<span class="badge ${cls}">${esc(value)}</span>`;
}

// ─── Form validation ──────────────────────────────────────────────
function validateForm() {
  let valid = true;

  // Text/select fields that are required
  const requiredFields = [
    'sl_no', 'feeder_name', 'substation_name', 'transformer_name', 'capacity_kva'
  ];

  requiredFields.forEach(id => {
    const el  = document.getElementById(id);
    const err = document.getElementById('err-' + id);
    if (!el.value.trim()) {
      el.classList.add('invalid');
      if (err) err.textContent = 'This field is required.';
      valid = false;
    } else {
      el.classList.remove('invalid');
      if (err) err.textContent = '';
    }
  });

  // Radio groups
  const radioFields = ['la_present', 'dofc_present', 'mccb_present', 'grounding_present'];
  radioFields.forEach(name => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    const group   = document.querySelector(`input[name="${name}"]`)?.closest('.radio-group');
    const err     = document.getElementById('err-' + name);
    if (!checked) {
      if (group) group.classList.add('invalid');
      if (err) err.textContent = 'Please select Yes or No.';
      valid = false;
    } else {
      if (group) group.classList.remove('invalid');
      if (err) err.textContent = '';
    }
  });

  // Scroll to first error
  if (!valid) {
    const firstErr = document.querySelector('.invalid, .radio-group.invalid');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return valid;
}

// ─── Reset / clear the form ───────────────────────────────────────
function resetForm() {
  document.getElementById('inspection-form').reset();
  // Remove any invalid styling
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
}

// ─── Open Google Maps link ────────────────────────────────────────
function openMap() {
  const url = document.getElementById('map_location').value.trim();
  if (url) {
    window.open(url, '_blank');
  } else {
    // Open Google Maps search for user to find the location
    window.open('https://maps.google.com', '_blank');
  }
}

// ─── Toast notification ───────────────────────────────────────────
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.background = type === 'error' ? 'var(--c-red)' : 'var(--c-green)';
  toast.style.color = type === 'error' ? '#fff' : '#001a0d';

  // Auto-hide after 3 seconds
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, 3500);
}


/* ═══════════════════════════════════════════════════════════════════
   STARTUP — runs when the page loads
═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  // Auto-load records on page start so the table is ready
  setTimeout(loadRecords, 500);
});
