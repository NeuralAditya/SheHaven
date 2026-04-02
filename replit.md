# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Women Safety Smart Route App — a full-stack prototype featuring smart safe routing, SOS emergency button, live location tracking, unsafe zone alerts, and AI risk scoring.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (not used in this project — all mock data)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Map**: Leaflet.js + react-leaflet

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── safe-route/         # React + Vite frontend (main app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## API Endpoints

- `GET /api/healthz` — Health check
- `POST /api/route` — Returns fastest and safest routes with safety scores
- `GET /api/risk-score?lat=&lng=` — AI safety score for a location (0-100)
- `POST /api/sos` — Triggers SOS emergency alert
- `GET /api/unsafe-zones` — Returns predefined unsafe zones

## Features

1. **Smart Safe Routing** — Two routes: fastest (blue) and safest (green) with color-coded polylines
2. **SOS Emergency Button** — One-click with 3-second countdown, simulates alert to contacts
3. **Live Location Tracking** — Real-time marker, share link
4. **Unsafe Zone Alerts** — 5 hardcoded zones in Delhi shown as red circles on map
5. **AI Risk Score** — Weighted scoring: time of day (30%), crime index (40%), lighting (15%), crowd density (15%)
6. **Fake Call Screen** — Full-screen UI for "Fake Call from Mom"

## Safety Scoring Logic

- Time of day: 6 AM–8 PM = low risk, 8 PM–11 PM = medium, 11 PM–6 AM = high
- Crime index: deterministic seeded formula based on coordinates
- Lighting: daytime or low-crime areas score higher
- Crowd density: business hours + commercial areas = denser crowds
