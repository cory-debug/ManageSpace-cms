# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ManageSpace Revenue Intelligence Module - A revenue management tool for self-storage operators to generate and manage rent increase recommendations (ECRI - Existing Customer Rent Increases).

**Tech Stack:** React Router 7 with SSR, SQLite (via better-sqlite3), Drizzle ORM, Tailwind CSS v4, TypeScript

## Monorepo Structure

```
ManageSpace/
├── revman/          # Main React Router application
├── shared/          # Shared utilities (unit types, calculations)
└── docs/            # Domain documentation
```

## Development Commands

All commands run from `revman/` directory:

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run start        # Run production server
npm run typecheck    # Run TypeScript type checking
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset DB: delete data/, migrate, seed
```

## Architecture

### Application Structure (revman/)

- **app/routes.ts** - Route configuration using React Router's layout/route/index pattern
- **app/routes/** - Route components with colocated loaders/actions
- **app/lib/** - Business logic services:
  - `ecri-service.ts` - ECRI orchestration (DB queries + recommendation generation)
  - `recommendation-engine.ts` - Pure functions for ECRI calculations
  - `market-rate.ts` - Distance-weighted competitor market rate calculation
  - `settings.ts` - Company/facility settings merge logic
  - `types.ts` - TypeScript enums, interfaces, re-exports shared types
- **app/db/** - Drizzle schema and database setup
  - `schema.ts` - All table definitions with type exports
  - `index.ts` - Database connection
  - `migrate.ts` / `seed.ts` - Migration and seeding scripts

### Shared Module (shared/)

Imported via `@shared/*` alias. Contains canonical unit type definitions used across modules.

### Path Aliases

- `~/*` → `./app/*` (within revman)
- `@shared/*` → `../shared/*` (monorepo shared code)

### Database

SQLite stored at `revman/data/revman.db`. Schema includes:
- Companies, CompanySettings, FacilitySettings (hierarchical config with inheritance)
- Facilities, UnitTypes, Customers
- EcriRecommendations, EcriHistory, EcriActions (recommendation lifecycle)
- CompSets, Competitors, CompetitorRates (market rate data)

## Key Business Concepts

**ECRI Stances:** Three pricing aggressiveness levels:
- Conservative (35% gap capture, ~2% churn)
- Baseline (55% gap capture, ~5% churn)
- Aggressive (75% gap capture, ~12% churn)

**Position Categories:** Customer rent vs street/market rate determines base stance:
- BELOW_STREET → Aggressive
- AT_STREET → Aggressive
- ABOVE_STREET_BELOW_MARKET → Baseline
- AT_ABOVE_MARKET → Conservative
- ABOVE_THRESHOLD → Skip

**Cohort Types:** LONG_TENURE, LARGE_GAP, POST_PROMO, HIGH_RISK

See `revman/docs/BRIEF.md` for complete business rules and decision tree.
