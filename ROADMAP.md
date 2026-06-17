# Location Intelligence — Feature Roadmap

Post-MVP features planned for future releases, organized by priority and complexity.

---

## Phase 1: Expand Data & Coverage (Q3 2026)

### All 14 Facility Categories
Implement remaining facility types: Universities, Hospitals, Clinics, Pharmacies, Railway Stations, Airports, Shopping Centres, Supermarkets, Parks, Libraries, Police Stations, Fire Stations. Backend and frontend support already scaffolded; requires Overpass queries + marker colors.

### Professional Māori Translations
Replace placeholder Māori (mi.json) with professional translations of all UI labels, buttons, messages, and error states. Engage with iwi consultation for cultural accuracy.

### Radius Circle Visualization
Display a visual circle on the map showing the search radius boundary. Helps users understand coverage area and experiment with radius adjustments interactively.

---

## Phase 2: Enhanced Analysis & Insights (Q4 2026)

### Drive-Time Isochrone Analysis
Show shaded zones on map representing 5/10/15/20-minute drive/walk times from searched location. Improves property assessment beyond simple distance thresholds. Requires OSRM matrix API integration.

### Crime Data Overlay
Integrate regional crime statistics (NZ Police data) as an optional overlay. Display crime hotspots/heatmap, crime type breakdown by suburb. Adds context for safety-conscious buyers.

### Location Score Recalibration
Fine-tune scoring weights and formula based on early user feedback. A/B test formula variants to maximize correlation with property desirability.

---

## Phase 3: Integration & Sharing (Q1 2027)

### Property Listing API Integration
Connect with Realestate.co.nz / OneRoof API. Display nearby listings within search radius. Enable "compare this property with neighbors" workflows for agents.

### Navigation Links
Add "Directions" buttons linking to Google Maps/Apple Maps from each facility marker. Desktop: directions, Mobile: native maps app deep links.

### Save & Share Reports
Allow users to generate shareable location reports (PDF or link). Include: address, facility counts, scores, isochrones. Enable real estate agents to share analyses with clients.

---

## Phase 4: User Personalization (Q2 2027)

### Authentication & User Accounts
Implement login (OAuth via Google/email). Store user preferences: saved locations, custom radius defaults, facility category toggles, theme preference.

### Saved Locations
Bookmark favorite properties with custom notes. Compare across multiple saved locations (e.g., "which suburb has better schools?").

### Custom Category Weights
Allow power users (agents, investors) to adjust scoring weights per category. Persist custom formulas tied to user account.

---

## Phase 5: Advanced Geospatial (Q3 2027)

### Accessibility Heat Map
Overlay public transport accessibility scores; highlight areas with good PT access. Integrate with real-time transit APIs (Auckland Transport, regional councils).

### School Catchment Zones
Display school zone boundaries from official government data. Filter schools by zone assignment for given address.

### Suburb Trend Analysis
Show 5-year price trends, population growth, development pipelines by suburb. Context for long-term property investment decisions.

---

## Technical Debt & Maintenance (Ongoing)

- [ ] Upgrade to latest Next.js, React, Tailwind versions quarterly
- [ ] Refactor shared component library into `@location-intelligence/ui` package
- [ ] Add Storybook for component documentation
- [ ] Expand test coverage (unit → 80%, integration → 60%)
- [ ] Set up E2E tests (Cypress/Playwright)
- [ ] Performance audit & Core Web Vitals optimization
- [ ] CDN caching strategy for static assets & API responses
- [ ] Analytics integration (Vercel Web Analytics or Plausible)

---

## Success Metrics (Track post-MVP)

- **User Engagement**: DAU/WAU, session duration, repeat visits
- **Feature Adoption**: % users enabling each new category
- **Analysis Quality**: User feedback on score accuracy
- **Conversion**: Agent sign-ups, paid tier uptake (if monetized)
- **Performance**: LCP <2s, CLS <0.1, No 404s on assets

---

*Last updated: 2026-06-17*
