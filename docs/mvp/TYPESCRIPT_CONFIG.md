# TypeScript and Environment Setup

This document details the tasks required to fix the TypeScript configuration issues and set up proper development and production environments for the Hashi application.

## Task 1: Fix TypeScript Configuration Issues

### Goal
Update the TypeScript configuration to resolve current compilation errors without disabling strict mode completely.

### Subtasks

#### 1.1 Update tsconfig.json
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/tsconfig.json`
- **Description**: Update the TypeScript configuration to properly support React, Express, and Node.js.
- **Changes**:
  - Ensure proper JSX configuration for React components
  - Add appropriate library includes for DOM and Node.js APIs
  - Configure path aliases for cleaner imports
  - Enable strict typing but with appropriate exceptions

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "moduleResolution": "node",
    "paths": {
      "@/*": ["./src/*"],
      "@client/*": ["./src/client/*"],
      "@server/*": ["./src/server/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/**/*", "types.d.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

#### 1.2 Create Express Type Definitions
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/types/express.d.ts`
- **Description**: Create type definitions for Express to add custom properties to the Request object.
- **Implementation**:
  - Define interface extensions for Express Request object
  - Add types for user authentication properties
  - Define session-related properties

```typescript
import { User } from '../server/database/entities/User';
import { UserRole } from '../server/types/auth';

declare global {
  namespace Express {
    export interface Request {
      userId?: string;
      user?: User;
      role?: UserRole;
      token?: string;
    }
  }
}

export {};
```

#### 1.3 Fix WebSocketMessage Interface
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/types/websocket.ts`
- **Description**: Update the WebSocketMessage interface to include the payload property.
- **Changes**:
  - Add payload property to the base WebSocketMessage interface
  - Ensure proper inheritance in extended message types
  - Update message handler types

#### 1.4 Fix API Route Handler Types
- **Files**: 
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/routes/api.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/server/routes/sessionRoutes.ts`
  - Other route files
- **Description**: Fix TypeScript errors in route handler functions by using proper type casting.
- **Approach**:
  - Use appropriate type annotations for middleware functions
  - Cast handlers to express.RequestHandler when needed
  - Create utility types for common handler patterns

#### 1.5 Fix Null/Undefined Handling in Services
- **Files**: `/Users/passos/GitHub/gomesgroup/hashi/src/server/services/storage/*.ts`
- **Description**: Address issues with null/undefined values in service classes.
- **Approach**:
  - Add proper null checks
  - Use optional chaining and nullish coalescing
  - Update return type definitions

## Task 2: Set Up Development and Production Environments

### Goal
Configure the development and production environments for efficient development and optimal deployment.

### Subtasks

#### 2.1 Fix Development Server Setup
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/package.json`
  - `/Users/passos/GitHub/gomesgroup/hashi/nodemon.json`
- **Description**: Fix the current development server setup to allow both frontend and backend to run smoothly.
- **Implementation**:
  - Update npm scripts for development
  - Configure nodemon for backend hot reloading
  - Set up proper port assignments

#### 2.2 Configure Vite for Frontend Development
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/vite.config.ts`
- **Description**: Configure Vite for optimal React development experience.
- **Implementation**:
  - Set up HMR (Hot Module Replacement)
  - Configure proxy for API requests
  - Set up path aliases
  - Add HTTPS support if needed

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@client': path.resolve(__dirname, './src/client'),
      '@server': path.resolve(__dirname, './src/server'),
      '@shared': path.resolve(__dirname, './src/shared')
    }
  }
});
```

#### 2.3 Configure Production Build
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/package.json`
  - `/Users/passos/GitHub/gomesgroup/hashi/scripts/build.js`
- **Description**: Set up production build process for both frontend and backend.
- **Implementation**:
  - Configure TypeScript compilation for production
  - Set up Vite build for frontend
  - Create build script

#### 2.4 Update Docker Configuration
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/Dockerfile`
  - `/Users/passos/GitHub/gomesgroup/hashi/docker-compose.yml`
- **Description**: Update Docker configuration for both development and production.
- **Implementation**:
  - Configure multi-stage Docker build
  - Set up proper volumes for ChimeraX integration
  - Configure environment variables
  - Optimize for production deployment

#### 2.5 Create Development Utilities
- **Files**: `/Users/passos/GitHub/gomesgroup/hashi/scripts/*.js`
- **Description**: Create utility scripts for development and debugging.
- **Implementation**:
  - Database reset/seeding script
  - ChimeraX connectivity test script
  - Development environment validation script

## Acceptance Criteria

The tasks in this document are considered complete when:

1. The application builds without TypeScript errors when running `npm run build`
2. Development server can be started with `npm run dev` without errors
3. Frontend and backend can communicate properly in development
4. Docker containers can be built and run successfully
5. Production build produces optimized output ready for deployment