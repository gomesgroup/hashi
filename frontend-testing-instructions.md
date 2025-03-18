# Hashi Frontend Testing Instructions

## Current Setup

We have successfully set up the following components:

1. **Standalone Backend Server**: Running on http://localhost:9876
   - ChimeraX integration with basic API endpoints (status, start, stop, command)
   - CORS has been added to allow frontend connections

2. **Frontend Development Server**: Running on http://localhost:3001
   - Vite-based React application with TypeScript
   - Main dashboard updated to include standalone server test panel

3. **Mock Services**:
   - Session service with mock session data
   - Structure service with mock structural data
   - Implementation of useStructure hook with mock 3D model data

## Testing Instructions

### Step 1: Ensure Servers Are Running

1. **Standalone Backend Server**: Should be running on port 9876
   ```
   node standalone-test.js
   ```

2. **Frontend Development Server**: Should be running on port 3001
   ```
   npm run dev:client
   ```

### Step 2: Access the Dashboard

1. Open a browser and navigate to http://localhost:3001
2. You should see the main dashboard with a "Standalone Server Test" panel
3. Check the connection status to the standalone server
4. If connected, you should see the ChimeraX status display

### Step 3: Test ChimeraX Controls

1. From the dashboard, click "Start ChimeraX" to launch a ChimeraX instance
2. Once started, test the "Open PDB 1abc" button to send a command
3. Finally, click "Stop ChimeraX" to terminate the instance

### Step 4: Explore Molecular Viewer

1. Click on "Molecular Viewer" from the dashboard
2. The viewer should display a simple 3D molecular structure using mock data
3. Test various visualization controls if available

## Known Issues and Limitations

1. **API Integration**: The frontend is using mocked data services rather than real API calls
2. **Authentication**: Not fully implemented - using a mock session for testing
3. **Molecular Viewer**: Using simplified mock data rather than real PDB structures
4. **CORS Issues**: May occur if the standalone server isn't configured with CORS

## Next Steps for Integration

To fully integrate the frontend with the backend:

1. **Update API Client**: 
   - Modify `src/client/services/api.ts` to point to the standalone server
   - Update service implementations to use real API endpoints instead of mock data

2. **Add Structure Upload**:
   - Implement file upload to send structures to the backend
   - Connect this to the ChimeraX processing pipeline

3. **Real-time Updates**:
   - Implement WebSocket connection for real-time updates from ChimeraX
   - Update viewer to reflect changes from ChimeraX in real-time

4. **Complete Authentication**:
   - Implement proper authentication with JWT tokens
   - Add login/registration workflows

## Troubleshooting

If you encounter issues:

1. **Backend Connection Failure**:
   - Ensure standalone server is running on port 9876
   - Check CORS configuration in standalone-test.js

2. **Frontend Build Errors**:
   - Check TypeScript errors in the console
   - Verify all imports and type definitions

3. **Viewer Not Rendering**:
   - Check browser console for WebGL errors
   - Verify ThreeJS dependencies are loaded correctly