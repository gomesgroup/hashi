/**
 * Example usage of the ChimeraX Process Manager
 * 
 * This example demonstrates how to:
 * 1. Spawn a ChimeraX process
 * 2. Send commands to the process
 * 3. Terminate the process
 */

import chimeraXProcessManager from '../server/services/ChimeraXProcessManager';
import { ChimeraXProcess } from '../server/types/chimerax';

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('ChimeraX Process Manager Example');
    console.log('--------------------------------');
    
    // 1. Spawn a ChimeraX process
    console.log('\n1. Spawning ChimeraX process...');
    const process = await chimeraXProcessManager.spawnChimeraXProcess();
    
    console.log(`Process created with ID: ${process.id}`);
    console.log(`REST API running on port: ${process.port}`);
    console.log(`Process ID: ${process.pid}`);
    
    // 2. Retrieve process information
    console.log('\n2. Retrieving process information...');
    const retrievedProcess = chimeraXProcessManager.getChimeraXProcess(process.id);
    if (retrievedProcess) {
      console.log(`Found process with ID: ${retrievedProcess.id}`);
      console.log(`Status: ${retrievedProcess.status}`);
      console.log(`Created at: ${retrievedProcess.createdAt.toISOString()}`);
    } else {
      console.log('Process not found!');
    }
    
    // 3. Send a command to display a molecule
    console.log('\n3. Sending commands to ChimeraX...');
    
    // Open a molecule from PDB
    console.log('Opening molecule from PDB...');
    const openResult = await chimeraXProcessManager.sendCommand(process.id, 'open 1zik');
    
    if (openResult.success) {
      console.log('Successfully opened molecule');
    } else {
      console.log(`Failed to open molecule: ${openResult.error}`);
    }
    
    // Add a surface representation
    console.log('Adding surface representation...');
    const surfaceResult = await chimeraXProcessManager.sendCommand(process.id, 'surface');
    
    if (surfaceResult.success) {
      console.log('Successfully added surface');
    } else {
      console.log(`Failed to add surface: ${surfaceResult.error}`);
    }
    
    // Change coloring
    console.log('Changing coloring...');
    const colorResult = await chimeraXProcessManager.sendCommand(process.id, 'color byattribute bfactor');
    
    if (colorResult.success) {
      console.log('Successfully changed coloring');
    } else {
      console.log(`Failed to change coloring: ${colorResult.error}`);
    }
    
    // 4. List all running processes
    console.log('\n4. Listing all running processes...');
    const allProcesses = chimeraXProcessManager.getAllProcesses();
    console.log(`Total running processes: ${allProcesses.length}`);
    
    for (const proc of allProcesses) {
      console.log(`- Process ID: ${proc.id}, Port: ${proc.port}, PID: ${proc.pid}`);
    }
    
    // 5. Terminate the process
    console.log('\n5. Terminating the process...');
    const terminated = await chimeraXProcessManager.terminateChimeraXProcess(process.id);
    
    if (terminated) {
      console.log(`Process ${process.id} terminated successfully`);
    } else {
      console.log(`Failed to terminate process ${process.id}`);
    }
    
    // Verify termination
    const afterTermination = chimeraXProcessManager.getChimeraXProcess(process.id);
    if (!afterTermination) {
      console.log('Process successfully removed from manager');
    } else {
      console.log('Process still exists in manager!');
    }
    
    console.log('\nExample completed.');
  } catch (error) {
    console.error('Error in example:', (error as Error).message);
  }
}

// Execute the example
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}