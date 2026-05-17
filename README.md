# NESCO DNMS — Distribution Network Management System

Internal web application used by NESCO (Northern Electricity Supply Company
Limited, Bangladesh) engineers and officials to view and manage power
distribution infrastructure data: 33/11 kV substations, switching substations,
distribution transformers, repair shops, ongoing projects, and renewable energy
assets.

- **Live site:** https://zobairkhan193.github.io/NESCO-Distribution-Xmer-Info/
- **Hosting:** GitHub Pages (static, no build server)
- **Stack:** Vanilla HTML / CSS / ES modules, Chart.js, Font Awesome,
  Firebase Auth + Firestore for admin actions

## Repository layout

```
.
├── index.html                       Shell, login, top nav, modal
├── style.css                        Design system + components
├── app.js                           SPA logic (sections, rendering, filters)
├── homepage-data.json               Technical Highlights for the homepage
├── substations.json                 All 33/11 kV substation data
├── distribution-transformers.json   Per-SDD distribution transformer data
├── projects.json                    NIDMP + PDSSP project rows
├── switching-ss.json                33 kV switching substations
├── store.json                       Substation & line equipment lists
├── renewable-energy.json            Renewable energy overview
├── zrs.json                         Zonal Repair Shop monthly + yearly data
└── scripts/                         Python conversion scripts (Excel → JSON)
```

## Data refresh workflow

The Excel source files live in the workspace folders at the repository root
(`33-11 kV SS Info/`, `Distribution Transformer/`, `ZRS/`, etc.). When source
files change, regenerate the JSON files with the scripts in `scripts/`:

```
py -3 scripts/build_all.py
```

Then commit the regenerated JSON files alongside any UI changes.

## Local preview

Any static server works:

```
py -3 -m http.server 8000
```

Then open <http://localhost:8000>.
