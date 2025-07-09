# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bowman is a git-based aim management system for project goal visualization and tracking. The system manages interconnected "aims" (project goals/objectives) and their relationships through an interactive graph interface.

## Development Commands

### Client (Vue 3 + TypeScript)
```bash
cd client
npm run dev          # Start development server
npm run build        # Build for production (runs vue-tsc -b && vite build)
npm run preview      # Preview production build
npm run test         # Run tests with Vitest
npm run test:ui      # Run tests with Vitest UI
```

### Server (Express.js + TypeScript)
```bash
cd server
npm run dev          # Start development server with tsx watch
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests with Vitest
npm run test:ui      # Run tests with Vitest UI
```

## Architecture

### Core Concepts
- **Aims**: Central entities representing project goals with title, description, status, and metadata
- **Contributions**: Relationships between aims (prerequisite, enables, supports, related)
- **Repositories**: Git repos containing aims stored in `.quiver/` directory structure

### Data Storage Structure
```
.quiver/
├── meta.json          # Repository metadata and root aim reference
├── aims/              # Individual aim files as {aimId}.json
└── contributions/     # Relationship files organized by aim
    └── {aimId}/
        ├── from/      # Incoming contributions
        └── to/        # Outgoing contribution references
```

### Key Client Components
- `App.vue`: Main application orchestrating repo selection and graph visualization
- `AimGraph.vue`: SVG-based interactive graph with zoom/pan capabilities
- `AimNode.vue`: Individual draggable aim visualization as circular nodes
- `AimConnection.vue`: Bezier curve connections showing aim relationships
- `RepoSelector.vue`: Repository selection interface
- `InitDialog.vue`: Repository initialization for first aim creation

### API Services
- `BowmanAPI`: REST client for server communication
- Endpoints for repository management, aim CRUD, contribution tracking, search

### Server Structure
- `index.ts`: HTTP server with WebSocket support
- `app.ts`: Express application with REST API endpoints
- File system-based JSON storage for aims and contributions

## Key Technologies

**Frontend**: Vue 3 (Composition API), TypeScript, Vite, Fuse.js (search), Vitest
**Backend**: Express.js, WebSocket (ws), TypeScript, Vitest
**Storage**: File system JSON in git repositories

## Development Notes

- The system uses SVG for graph visualization with custom vector math utilities
- WebSocket connection exists but is currently basic - enhance for real-time features
- Search functionality uses Fuse.js for fuzzy matching on aim titles and tags
- Aim positioning and relationships are calculated using 2D vector mathematics
- Each repository maintains its own aim graph independent of others

## development servers
I start the development servers for the bowman local server and the bowman ui. 
Check the .env file of the server and the vite config of the ui to see which ports. 
