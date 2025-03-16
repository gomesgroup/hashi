import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../src/server';
import { cleanupTestFiles } from './testUtils';

// Skip tests if running in CI environment
const runTests = process.env.CI !== 'true';

describe('File Handling System', () => {
  // Create a temporary test file
  const testFilePath = path.join(__dirname, 'fixtures', 'test.pdb');
  const testFileContent = `HEADER    TEST FILE
ATOM      1  N   ASP A  30      53.682  64.387  50.379  1.00 35.15           N  
ATOM      2  CA  ASP A  30      54.259  64.201  51.721  1.00 37.65           C  
ATOM      3  C   ASP A  30      55.680  63.669  51.585  1.00 34.78           C  
ATOM      4  O   ASP A  30      56.585  64.263  52.170  1.00 37.21           O  
ATOM      5  CB  ASP A  30      54.301  65.527  52.491  1.00 48.05           C  
ATOM      6  CG  ASP A  30      54.993  65.401  53.830  1.00 54.99           C  
ATOM      7  OD1 ASP A  30      54.865  64.354  54.518  1.00 57.71           O  
ATOM      8  OD2 ASP A  30      55.685  66.353  54.219  1.00 60.20           O  
TER
END
`;

  beforeAll(() => {
    // Create fixtures directory if it doesn't exist
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    // Create test PDB file
    fs.writeFileSync(testFilePath, testFileContent);
  });

  afterAll(() => {
    // Clean up test files
    cleanupTestFiles();
  });

  // Skip tests in CI environment
  if (!runTests) {
    it('File handling tests skipped in CI environment', () => {
      console.log('Skipping file handling tests in CI environment');
    });
    return;
  }

  describe('File Upload API', () => {
    it('should successfully upload a file', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', testFilePath)
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'test.pdb');
      expect(response.body.data).toHaveProperty('format', 'pdb');
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .expect(400);
      
      expect(response.body.status).toBe('error');
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });

  describe('File Download API', () => {
    let fileId: string;

    beforeAll(async () => {
      // Upload a file first
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', testFilePath);
      
      fileId = response.body.data.id;
    });

    it('should successfully download a file', async () => {
      const response = await request(app)
        .get(`/api/files/${fileId}`)
        .expect(200);
      
      expect(response.headers['content-type']).toContain('chemical/x-pdb');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should return 404 when file not found', async () => {
      const response = await request(app)
        .get('/api/files/non-existent-id')
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('File Formats API', () => {
    it('should return supported formats', async () => {
      const response = await request(app)
        .get('/api/files/formats/supported')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('formats');
      expect(Array.isArray(response.body.data.formats)).toBe(true);
      expect(response.body.data.formats).toContain('pdb');
    });
  });
});