# Frontend Implementation

This document details the tasks required to implement the frontend components and functionality for the Hashi application.

## Task 1: Develop Core React Frontend Components

### Goal
Build the essential React frontend components needed for the MVP, focusing on visualization, session management, and user interaction.

### Subtasks

#### 1.1 Implement Layout and Navigation Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/Layout.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/Navigation.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/Sidebar.tsx`
- **Description**: Create the main layout components for the application.
- **Implementation**:
  - Create responsive layout with navigation bar and sidebar
  - Implement navigation menu with links to key sections
  - Add user profile section
  - Create session switcher

```tsx
// Layout.tsx example
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';
import { useAuth } from '../hooks/useAuth';

const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="app-container">
      <Navigation />
      
      <div className="main-content">
        {isAuthenticated && <Sidebar />}
        <ErrorBoundary>
          <main className="content-area">
            <Outlet />
          </main>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Layout;
```

#### 1.2 Create Authentication Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/LoginForm.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/RegisterForm.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/ProtectedRoute.tsx`
- **Description**: Implement authentication-related components.
- **Implementation**:
  - Create login form with validation
  - Build registration form
  - Implement protected route wrapper
  - Add password reset functionality (optional for MVP)

#### 1.3 Implement Molecular Viewer Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/MolecularViewer.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/ViewerControls.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/MoleculeInfo.tsx`
- **Description**: Create the core molecular visualization components.
- **Implementation**:
  - Build WebGL-based viewer using Three.js
  - Implement camera controls
  - Create molecule information sidebar
  - Add rendering style controls

```tsx
// MolecularViewer.tsx example
import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSession } from '../hooks/useSession';
import ViewerControls from './ViewerControls';
import MoleculeInfo from './MoleculeInfo';
import { useStructure } from '../hooks/useStructure';

const MolecularViewer: React.FC = () => {
  const { activeSession } = useSession();
  const { structures, loading, error, fetchStructures } = useStructure(activeSession?.id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (activeSession?.id) {
      fetchStructures();
    }
  }, [activeSession?.id, fetchStructures]);
  
  // Implementation
  
  return (
    <div className="molecular-viewer">
      <div className="viewer-container">
        <Canvas>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          {/* Molecule rendering */}
          <OrbitControls />
        </Canvas>
      </div>
      
      <div className="viewer-sidebar">
        <ViewerControls />
        <MoleculeInfo structure={activeStructure} />
      </div>
    </div>
  );
};

export default MolecularViewer;
```

#### 1.4 Implement Session Management Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/SessionControls.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/SessionList.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/CreateSessionDialog.tsx`
- **Description**: Create components for managing ChimeraX sessions.
- **Implementation**:
  - Build session creation dialog
  - Implement session browser/list
  - Create session control panel
  - Add session status indicators

#### 1.5 Implement Structure Management Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/StructureBrowser.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/StructureDetails.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/FileUpload.tsx`
- **Description**: Create components for managing molecular structures.
- **Implementation**:
  - Build file upload component with drag-and-drop
  - Create structure browser with filtering
  - Implement structure details view
  - Add structure management controls

#### 1.6 Create Command Interface Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/CommandInterface.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/CommandHistory.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/CommandSuggestions.tsx`
- **Description**: Implement components for sending commands to ChimeraX.
- **Implementation**:
  - Create command input with auto-completion
  - Build command history display
  - Implement command suggestions
  - Add common command shortcuts

#### 1.7 Implement Shared UI Components
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/Notification.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/LoadingIndicator.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/ErrorBoundary.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/components/ConfirmDialog.tsx`
- **Description**: Build reusable UI components.
- **Implementation**:
  - Create notification system for alerts and messages
  - Implement loading indicators
  - Add error boundary components
  - Create dialog components

## Task 2: Implement API Client Services for Frontend-Backend Communication

### Goal
Develop API client services for the frontend to communicate with the backend, focusing on data retrieval, state management, and real-time updates.

### Subtasks

#### 2.1 Create Base API Client
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/services/api.ts`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/types/api.ts`
- **Description**: Implement a base API client for HTTP requests.
- **Implementation**:
  - Create axios client with base configuration
  - Add authentication header management
  - Implement request/response interceptors
  - Add error handling and retry logic

```typescript
// api.ts example
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { refreshToken } from './authService';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for handling errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle token refresh if 401
        if (error.response && error.response.status === 401) {
          try {
            await refreshToken();
            // Retry the original request
            const originalRequest = error.config;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Handle refresh token failure
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  public async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client(config);
      return response.data;
    } catch (error) {
      // Error handling
      throw error;
    }
  }

  // Helper methods for common HTTP methods
  public async get<T>(url: string, params?: any): Promise<T> {
    return this.request<T>({ method: 'GET', url, params });
  }

  public async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'POST', url, data });
  }

  // Additional methods
}

// Create singleton instance
export const apiClient = new ApiClient();
export default apiClient;
```

#### 2.2 Implement Session Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/client/services/sessionService.ts`
- **Description**: Create service for managing ChimeraX sessions.
- **Implementation**:
  - Create methods for session creation and management
  - Implement session state synchronization
  - Add session error handling
  - Create session cleanup logic

#### 2.3 Implement Structure Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/client/services/structureService.ts`
- **Description**: Create service for structure management.
- **Implementation**:
  - Add methods for structure upload and retrieval
  - Implement structure metadata handling
  - Create structure version management
  - Add structure search and filtering

#### 2.4 Implement Command Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/client/services/commandService.ts`
- **Description**: Create service for sending commands to ChimeraX.
- **Implementation**:
  - Add methods for sending commands
  - Implement command response parsing
  - Create command history management
  - Add command validation and suggestions

#### 2.5 Implement WebSocket Service
- **File**: `/Users/passos/GitHub/gomesgroup/hashi/src/client/services/websocketService.ts`
- **Description**: Create service for real-time updates via WebSocket.
- **Implementation**:
  - Set up WebSocket connection management
  - Implement message handling and dispatching
  - Add reconnection logic
  - Create event subscription system

## Task 3: Create Context Providers and Hooks

### Goal
Implement React context providers and hooks for state management and component integration.

### Subtasks

#### 3.1 Create Authentication Context
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/contexts/AuthContext.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/hooks/useAuth.ts`
- **Description**: Implement authentication state management.
- **Implementation**:
  - Create context provider for auth state
  - Add login, logout, and registration functionality
  - Implement token management
  - Create authentication hooks

```tsx
// AuthContext.tsx example
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, logoutUser, refreshToken, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token and validate it
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const userData = await refreshToken();
          setUser(userData);
        }
      } catch (err) {
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await loginUser(email, password);
      setUser(userData);
    } catch (err) {
      setError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const authContextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 3.2 Create Session Context
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/contexts/SessionContext.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/hooks/useSession.ts`
- **Description**: Implement session state management.
- **Implementation**:
  - Create context provider for session state
  - Add session creation and management functionality
  - Implement active session tracking
  - Create session-related hooks

#### 3.3 Create Structure Context
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/contexts/StructureContext.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/hooks/useStructure.ts`
- **Description**: Implement structure state management.
- **Implementation**:
  - Create context provider for structure state
  - Add structure loading and management functionality
  - Implement active structure tracking
  - Create structure-related hooks

#### 3.4 Create UI Context
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/contexts/UIContext.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/hooks/useUI.ts`
- **Description**: Implement UI state management.
- **Implementation**:
  - Create context provider for UI state
  - Add notification system
  - Implement modal/dialog management
  - Create UI-related hooks

#### 3.5 Create WebSocket Context
- **Files**:
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/contexts/WebSocketContext.tsx`
  - `/Users/passos/GitHub/gomesgroup/hashi/src/client/hooks/useWebSocket.ts`
- **Description**: Implement WebSocket state management.
- **Implementation**:
  - Create context provider for WebSocket connection
  - Add message subscription system
  - Implement connection state management
  - Create WebSocket-related hooks

## Acceptance Criteria

The tasks in this document are considered complete when:

1. All required UI components are implemented and function correctly
2. Components properly integrate with the backend through API services
3. Real-time updates are received and displayed via WebSocket
4. Authentication and session management work correctly
5. The application state is properly managed through contexts and hooks
6. Users can navigate the application and perform core operations
7. The application provides appropriate feedback for user actions
8. The application renders correctly on different screen sizes