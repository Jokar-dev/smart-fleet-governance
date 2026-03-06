# VehiFy - Fleet Governance & Emergency Vehicle System

VehiFy is a static, browser-run fleet command center built with **HTML, CSS, and Vanilla JavaScript** using **localStorage** as the data layer.

It is designed for fleet governance, emergency response dispatching, scheduling, maintenance tracking, and analytics in a modern dashboard interface.

## Tech Stack
- HTML
- CSS
- Vanilla JavaScript
- localStorage (no backend)
- Leaflet.js (map rendering via CDN)

## Project Structure
```text
/vehify
  index.html
  style.css
  app.js
  README.md
  /pages
    dashboard.html
    vehicles.html
    drivers.html
    trips.html
    maintenance.html
    reports.html
  /components
    navbar.html
    sidebar.html
```

## How to Run
1. Open `vehify/index.html` directly in a browser.
2. No installation, server, or API setup is required.

## Core Features
- Dashboard KPIs and command-center layout
- Vehicle CRUD (status, fuel, health, location, service date)
- Driver CRUD (availability and assignments)
- Trip scheduling with availability checks
- Maintenance tracking and alerts
- Reports with charts (canvas-based)
- Role-based access simulation (`Admin`, `Fleet Manager`, `Driver`)
- Emergency override mode
- Fleet efficiency scoring

## Smart Dispatch
`Request Vehicle` supports:
- Request Type: `Emergency`, `Transport`, `Logistics`
- Emergency Kind: `Accident`, `Fire`, `Medical`, `Security`, `General`
- Priority, location, and passenger-aware assignment logic

Examples:
- `Fire` emergencies prioritize **fire brigade** units
- `Accident/Medical` emergencies prioritize **ambulance** units

## Map
- Fleet map uses **Leaflet + OpenStreetMap tiles**
- Vehicle markers include popup details (type, location, fuel, status)
- Fallback message appears if map assets cannot load

## Data and Persistence
- All records are stored in localStorage:
  - vehicles
  - drivers
  - trips
  - alerts
  - role and mode settings
- First run seeds demo data
- Bulk mock data generator expands dataset to at least 100+ records

## Status Color Logic
- Emergency: red
- Transport: orange/yellow
- Logistics: green

## Demo Flow (Suggested)
1. Open Home page
2. Enter Dashboard
3. Submit `Request Vehicle` (try Fire vs Accident)
4. Show map marker distribution
5. Trigger Emergency Override
6. Open Reports and highlight analytics/efficiency

## Notes
- This is a static app; data is browser-local.
- Clearing browser storage resets persisted records.
