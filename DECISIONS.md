# Technical Decisions & Configurations - ClinicEngage AI

This document logs locked technical choices and defaults used throughout the build.

## Core Stack
- **Runtime**: Node.js v25.2.1 (using npm workspaces)
- **Monorepo Structure**:
  - `apps/api`: NestJS backend
  - `apps/web`: Vite + React + Tailwind + TypeScript frontend
  - `packages/db`: Shared Prisma setup
  - `packages/types`: Shared TypeScript interfaces
- **Database**: PostgreSQL 15 (Docker)
- **Caching & Lock Manager**: Redis 7 (Docker)

## Authentication & Security
- **Algorithm**: HS256 JWT
- **Secret Provider**: Loaded from `.env` (`JWT_SECRET`)
- **Access Token Expiry**: 15 minutes
- **Refresh Token Expiry**: 7 days
- **Passphrase Hashing**: `bcrypt` (10 salt rounds)
- **Multi-Tenancy**: Automatically enforced via `@ClinicId()` parameter extraction injecting the current `clinic_id` scope to queries.

## Third-Party Integrations
- **Sarvam AI Key**: `sk_7vbe9iur_saL5dMBplsJfvzwJd0oytYwy` (STT/TTS streaming)
