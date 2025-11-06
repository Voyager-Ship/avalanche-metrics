# avalanche-metrics

Minimal Express + TypeScript project to serve basic metrics endpoints.

## What this project contains

- TypeScript entrypoint: `app.ts`
- Routes: `routes/index.ts` (provides GET /hello)
- Build output: `dist/` (after `npm run build`)

## Prerequisites

- Node.js >= 18 (recommended)
- npm

## Install

Install dependencies:

```bash
npm install
```

## Development

Run the server in development mode with automatic restart (uses `ts-node-dev`):

```bash
npm run dev
```

This runs `app.ts` directly and reloads on changes.

## Build & Start (production)

Compile TypeScript to `dist/` and run the compiled app:

```bash
npm run build
npm start
```

Set the port with the `PORT` environment variable (default 3000):

```bash
PORT=4000 npm run dev
# or after build
PORT=4000 npm start
```

## Endpoints

- GET /hello — returns JSON `{ "message": "Hello World" }`

Example:

```bash
curl http://localhost:3000/hello
# { "message": "Hello World" }
```

## Notes

- Dev dependencies were added for TypeScript and runtime tooling (`typescript`, `ts-node-dev`, `@types/*`).
- After `npm install` you might see audit warnings from transitive dependencies. I can help upgrade or pin safe fixes if you want.

## Next steps (optional)

- Move source into `src/` and adjust `tsconfig.json`.
- Add linting (ESLint) and basic unit tests (Jest).
