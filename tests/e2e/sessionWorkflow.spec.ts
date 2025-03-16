import { test, expect } from '@playwright/test';

test.describe('Session Management Workflow', () => {
  test('should create a new session and load a molecule', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Create a new session
    await page.click('text=New Session');
    
    // Wait for session creation
    await page.waitForSelector('text=Session created successfully');
    
    // Verify session info is displayed
    const sessionInfo = await page.textContent('.session-info');
    expect(sessionInfo).toContain('Session ID:');
    
    // Upload a PDB file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Upload File');
    const fileChooser = await fileChooserPromise;
    
    // Select a test PDB file
    await fileChooser.setFiles({
      name: 'test-molecule.pdb',
      mimeType: 'chemical/x-pdb',
      buffer: Buffer.from(`
HEADER    TEST MOLECULE
ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00  0.00           N  
ATOM      2  CA  ALA A   1      11.639   6.071  -5.147  1.00  0.00           C  
ATOM      3  C   ALA A   1      10.701   5.236  -4.301  1.00  0.00           C  
ATOM      4  O   ALA A   1      10.387   5.596  -3.159  1.00  0.00           O  
ATOM      5  CB  ALA A   1      13.006   5.434  -5.169  1.00  0.00           C  
END
      `)
    });
    
    // Wait for molecule to load
    await page.waitForSelector('.molecule-viewer canvas');
    
    // Verify molecule is rendered (check for WebGL canvas with content)
    const canvas = await page.$('.molecule-viewer canvas');
    expect(await canvas?.screenshot()).not.toBeNull();
    
    // Try to rotate the molecule view
    const viewerCanvas = await page.$('.molecule-viewer canvas');
    await viewerCanvas?.click({ position: { x: 100, y: 100 } });
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(300, 150);
    await page.mouse.up();
    
    // Take a snapshot of the current view
    await page.click('text=Take Snapshot');
    await page.waitForSelector('text=Snapshot created');
    
    // Verify snapshot is displayed in the gallery
    const snapshotPreview = await page.$('.snapshot-gallery img');
    expect(snapshotPreview).not.toBeNull();
    
    // End session
    await page.click('text=End Session');
    await page.waitForSelector('text=Session ended');
    
    // Verify we're back at the home page
    expect(await page.textContent('h1')).toContain('ChimeraX Web Integration');
  });
});