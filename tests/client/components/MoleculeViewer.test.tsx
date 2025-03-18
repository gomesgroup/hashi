import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import MoleculeViewer from '../../../src/client/components/MoleculeViewer';
import { ChimeraXEnvironment } from '../../mocks/chimeraxMock';

// Create mock server
const server = setupServer(
  // Mock successful image request
  rest.get('/api/sessions/:sessionId/snapshots/:snapshotId/file', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.set('Content-Type', 'image/png'),
      ctx.body('mock-image-data')
    );
  }),
  
  // Mock successful ChimeraX API request
  rest.post('/api/sessions/:sessionId/snapshots', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          id: 'mock-snapshot-id',
          sessionId: 'mock-session-id',
          url: '/api/sessions/mock-session-id/snapshots/mock-snapshot-id/file',
          status: 'completed'
        }
      })
    );
  }),
  
  // Mock successful session creation
  rest.post('/api/sessions', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        status: 'success',
        data: {
          id: 'mock-session-id',
          createdAt: new Date().toISOString()
        }
      })
    );
  }),
  
  // Mock successful structure load
  rest.post('/api/structures/load', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          structureId: '1ubq',
          format: 'pdb'
        }
      })
    );
  })
);

// Start mock server before tests
beforeAll(() => server.listen());
// Reset handlers after each test
afterEach(() => server.resetHandlers());
// Close server after all tests
afterAll(() => server.close());

describe('MoleculeViewer Component', () => {
  
  // Mock properties for testing
  const mockProps = {
    structureId: '1ubq',
    width: 800,
    height: 600,
    style: {
      representation: 'cartoon',
      colorScheme: 'rainbow'
    },
    onLoadingChange: jest.fn(),
    onError: jest.fn(),
    fallbackUrl: 'https://www.rcsb.org/structure/1ubq/image'
  };
  
  it('should render loading state initially', () => {
    render(<MoleculeViewer {...mockProps} />);
    
    expect(screen.getByTestId('molecule-viewer-loading')).toBeInTheDocument();
    expect(screen.getByText(/Loading molecular visualization/i)).toBeInTheDocument();
  });
  
  it('should render molecule when ChimeraX snapshot is available', async () => {
    render(<MoleculeViewer {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-image')).toBeInTheDocument();
    });
    
    const image = screen.getByTestId('molecule-viewer-image');
    expect(image).toHaveAttribute('src', expect.stringContaining('/api/sessions/mock-session-id/snapshots/mock-snapshot-id/file'));
    expect(mockProps.onLoadingChange).toHaveBeenCalledWith(false);
  });
  
  it('should use fallback when ChimeraX rendering fails', async () => {
    // Mock failure for snapshot creation
    server.use(
      rest.post('/api/sessions/:sessionId/snapshots', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            status: 'error',
            message: 'Unable to save images because OpenGL rendering is not available',
            errorCode: 'NO_OSMESA'
          })
        );
      })
    );
    
    render(<MoleculeViewer {...mockProps} />);
    
    // Wait for loading to complete and fallback to be shown
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-fallback')).toBeInTheDocument();
    });
    
    const fallbackImage = screen.getByTestId('molecule-viewer-fallback');
    expect(fallbackImage).toHaveAttribute('src', mockProps.fallbackUrl);
    expect(screen.getByText(/Using external visualization/i)).toBeInTheDocument();
    expect(mockProps.onError).toHaveBeenCalled();
  });
  
  it('should handle case when both ChimeraX and fallback fail', async () => {
    // Mock failure for snapshot creation
    server.use(
      rest.post('/api/sessions/:sessionId/snapshots', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            status: 'error',
            message: 'Unable to save images because OpenGL rendering is not available',
            errorCode: 'NO_OSMESA'
          })
        );
      })
    );
    
    // Render with no fallback URL
    render(<MoleculeViewer {...mockProps} fallbackUrl={undefined} />);
    
    // Wait for loading to complete and error to be shown
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-error')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Failed to render molecule/i)).toBeInTheDocument();
    expect(mockProps.onError).toHaveBeenCalled();
  });
  
  it('should allow user to refresh the view', async () => {
    render(<MoleculeViewer {...mockProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-image')).toBeInTheDocument();
    });
    
    // Find and click refresh button
    const refreshButton = screen.getByTestId('molecule-viewer-refresh');
    fireEvent.click(refreshButton);
    
    // Should show loading state again
    expect(screen.getByTestId('molecule-viewer-loading')).toBeInTheDocument();
    
    // Wait for second render to complete
    await waitFor(() => {
      expect(screen.getByTestId('molecule-viewer-image')).toBeInTheDocument();
    });
    
    // onLoadingChange should have been called for both loading and completion states
    expect(mockProps.onLoadingChange).toHaveBeenCalledTimes(4);
  });
});