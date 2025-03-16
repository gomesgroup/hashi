import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import chimeraXProcessManager from './ChimeraXProcessManager';
import sessionService from './session';
import websocketService from './websocketService';
import { WebSocketMessageType, WebSocketMessagePriority } from '../types/websocket';
import {
  SelectionCriteria,
  SelectionResult,
  AtomProperties,
  BondDefinition,
  TransformationParameters,
  MinimizationParameters,
  MinimizationResult,
  Transaction,
  TransactionResult,
  TransformationType,
} from '../types/structure';

/**
 * Structure Modification Service
 * 
 * Manages molecular structure modifications within ChimeraX sessions, including:
 * - Selection of atoms, residues, and molecules
 * - Adding, modifying, and deleting atoms and bonds
 * - Applying transformations
 * - Energy minimization
 * - Transaction history management for undo/redo operations
 */
class StructureService {
  private transactions: Map<string, Transaction[]> = new Map();
  private undoStack: Map<string, Transaction[]> = new Map();
  private selectionNames: Map<string, Set<string>> = new Map();
  private readonly maxTransactionHistory: number = 100;

  /**
   * Creates a new selection in a ChimeraX session
   * @param sessionId Session ID
   * @param criteria Selection criteria
   * @returns Selection result with a unique selection name
   */
  public async createSelection(
    sessionId: string,
    criteria: SelectionCriteria
  ): Promise<SelectionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Generate a unique selection name
      const selectionName = this.generateUniqueSelectionName(sessionId);

      // Build ChimeraX command for selection
      let command = `select ${criteria.specifier} `;
      
      // Add options
      if (criteria.options) {
        if (criteria.options.extend) command += 'extend true ';
        if (criteria.options.invert) command += 'invert true ';
        if (criteria.options.replace) command += 'replace true ';
      }

      // Name the selection
      command += `name ${selectionName}`;

      // Send the command to ChimeraX
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);

      if (!result.success) {
        throw new Error(`Failed to create selection: ${result.error}`);
      }

      // Get count of selected atoms
      const countResult = await chimeraXProcessManager.sendCommand(
        sessionId,
        `sel ${selectionName} count`
      );

      if (!countResult.success) {
        throw new Error(`Failed to get selection count: ${countResult.error}`);
      }

      // Create a selection result
      const selectionResult: SelectionResult = {
        selectionName,
        count: countResult.data?.count || 0,
        type: criteria.type,
        specifier: criteria.specifier,
      };

      // Store the selection name for this session
      if (!this.selectionNames.has(sessionId)) {
        this.selectionNames.set(sessionId, new Set());
      }
      this.selectionNames.get(sessionId)?.add(selectionName);

      // Record the transaction
      this.recordTransaction(sessionId, 'createSelection', { criteria, result: selectionResult });

      return selectionResult;
    } catch (error) {
      logger.error(`Error creating selection: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Modifies atom properties in a selection or structure
   * @param sessionId Session ID
   * @param atomProperties Atom properties to modify
   * @param selectionName Name of the selection to modify
   * @returns Result of the operation
   */
  public async modifyAtoms(
    sessionId: string,
    atomProperties: AtomProperties,
    selectionName: string
  ): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Validate the selection name exists
      this.validateSelectionExists(sessionId, selectionName);

      // Build the ChimeraX command for atom modification
      let commands: string[] = [];

      if (atomProperties.position) {
        const [x, y, z] = atomProperties.position;
        commands.push(`move ${selectionName} to ${x},${y},${z}`);
      }

      if (atomProperties.charge !== undefined) {
        commands.push(`setattr ${selectionName} charge ${atomProperties.charge}`);
      }

      if (atomProperties.radius !== undefined) {
        commands.push(`setattr ${selectionName} radius ${atomProperties.radius}`);
      }

      if (atomProperties.element) {
        commands.push(`setattr ${selectionName} element ${atomProperties.element}`);
      }

      if (atomProperties.name) {
        commands.push(`setattr ${selectionName} name ${atomProperties.name}`);
      }

      if (atomProperties.occupancy !== undefined) {
        commands.push(`setattr ${selectionName} occupancy ${atomProperties.occupancy}`);
      }

      if (atomProperties.bfactor !== undefined) {
        commands.push(`setattr ${selectionName} bfactor ${atomProperties.bfactor}`);
      }

      // Execute all commands
      const transactionId = uuidv4();
      let allSuccessful = true;
      let errorMessage = '';

      for (const cmd of commands) {
        const result = await chimeraXProcessManager.sendCommand(sessionId, cmd);
        if (!result.success) {
          allSuccessful = false;
          errorMessage = result.error || 'Unknown error';
          break;
        }
      }

      // Record the transaction
      if (allSuccessful) {
        this.recordTransaction(sessionId, 'modifyAtoms', { atomProperties, selectionName });
      }

      return {
        transactionId,
        success: allSuccessful,
        message: allSuccessful ? 'Atoms modified successfully' : `Failed to modify atoms: ${errorMessage}`,
      };
    } catch (error) {
      logger.error(`Error modifying atoms: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Adds atoms to a structure
   * @param sessionId Session ID
   * @param atoms Array of atom properties to add
   * @param structureId Structure ID (model ID in ChimeraX)
   * @returns Result of the operation
   */
  public async addAtoms(
    sessionId: string,
    atoms: AtomProperties[],
    structureId: string
  ): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Create a temporary PDB-like text to add atoms
      let atomDefs = '';
      let atomIndex = 1;

      for (const atom of atoms) {
        const position = atom.position || [0, 0, 0];
        const element = atom.element || 'C';
        const name = atom.name || element;
        const charge = atom.charge || 0;
        const occupancy = atom.occupancy || 1.0;
        const bfactor = atom.bfactor || 0.0;
        const serialNumber = atom.serialNumber || atomIndex;

        // Create an ATOM record in PDB format
        atomDefs += `ATOM  ${String(serialNumber).padStart(5, ' ')} ${name.padEnd(4, ' ')} XXX A   1    ${position[0].toFixed(3).padStart(8, ' ')}${position[1].toFixed(3).padStart(8, ' ')}${position[2].toFixed(3).padStart(8, ' ')}${occupancy.toFixed(2).padStart(6, ' ')}${bfactor.toFixed(2).padStart(6, ' ')}           ${element.padEnd(2, ' ')}  \n`;
        atomIndex++;
      }

      // Add atoms by creating a temporary PDB file
      const command = `open inlinedata:${atomDefs.trim()} type pdb structureModel ${structureId}`;
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);

      if (!result.success) {
        throw new Error(`Failed to add atoms: ${result.error}`);
      }

      // Generate a transaction ID
      const transactionId = uuidv4();

      // Record the transaction
      this.recordTransaction(sessionId, 'addAtoms', { atoms, structureId });

      return {
        transactionId,
        success: true,
        message: `Added ${atoms.length} atoms to structure ${structureId}`,
        data: { addedCount: atoms.length }
      };
    } catch (error) {
      logger.error(`Error adding atoms: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Removes atoms from a structure
   * @param sessionId Session ID
   * @param selectionName Name of the selection to remove
   * @returns Result of the operation
   */
  public async removeAtoms(
    sessionId: string,
    selectionName: string
  ): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Validate the selection name exists
      this.validateSelectionExists(sessionId, selectionName);

      // Get atom count before deletion
      const countResult = await chimeraXProcessManager.sendCommand(
        sessionId,
        `sel ${selectionName} count`
      );

      if (!countResult.success) {
        throw new Error(`Failed to get atom count: ${countResult.error}`);
      }

      const atomCount = countResult.data?.count || 0;

      // Execute the delete command
      const result = await chimeraXProcessManager.sendCommand(
        sessionId,
        `delete ${selectionName}`
      );

      if (!result.success) {
        throw new Error(`Failed to remove atoms: ${result.error}`);
      }

      // Generate a transaction ID
      const transactionId = uuidv4();

      // Record the transaction
      this.recordTransaction(sessionId, 'removeAtoms', { selectionName, atomCount });

      // Remove the selection name from the set
      this.selectionNames.get(sessionId)?.delete(selectionName);

      return {
        transactionId,
        success: true,
        message: `Removed ${atomCount} atoms`,
        data: { removedCount: atomCount }
      };
    } catch (error) {
      logger.error(`Error removing atoms: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Adds bonds between atoms
   * @param sessionId Session ID
   * @param bonds Array of bond definitions
   * @returns Result of the operation
   */
  public async addBonds(
    sessionId: string,
    bonds: BondDefinition[]
  ): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Create bonds one by one
      let successes = 0;
      let failures = 0;
      let errorMessages: string[] = [];

      for (const bond of bonds) {
        // Build the ChimeraX command for bond creation
        const command = `bond ${bond.atom1} ${bond.atom2}${bond.order ? ' order ' + bond.order : ''}`;
        
        const result = await chimeraXProcessManager.sendCommand(sessionId, command);
        
        if (result.success) {
          successes++;
        } else {
          failures++;
          if (result.error) {
            errorMessages.push(result.error);
          }
        }
      }

      // Generate a transaction ID
      const transactionId = uuidv4();

      // Record the transaction (only if there were some successes)
      if (successes > 0) {
        this.recordTransaction(sessionId, 'addBonds', { bonds });
      }

      const success = failures === 0;
      let message = `Added ${successes} bonds`;
      if (failures > 0) {
        message += `, ${failures} failed`;
        if (errorMessages.length > 0) {
          message += `: ${errorMessages[0]}${errorMessages.length > 1 ? ' and others' : ''}`;
        }
      }

      return {
        transactionId,
        success,
        message,
        data: { addedCount: successes, failedCount: failures }
      };
    } catch (error) {
      logger.error(`Error adding bonds: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Removes bonds between atoms
   * @param sessionId Session ID
   * @param selectionName Name of the selection containing bonds to remove
   * @returns Result of the operation
   */
  public async removeBonds(
    sessionId: string,
    selectionName: string
  ): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Validate the selection name exists
      this.validateSelectionExists(sessionId, selectionName);

      // Execute the unbond command
      const result = await chimeraXProcessManager.sendCommand(
        sessionId,
        `~bond ${selectionName}`
      );

      if (!result.success) {
        throw new Error(`Failed to remove bonds: ${result.error}`);
      }

      // Generate a transaction ID
      const transactionId = uuidv4();

      // Record the transaction
      this.recordTransaction(sessionId, 'removeBonds', { selectionName });

      return {
        transactionId,
        success: true,
        message: `Removed bonds for selection ${selectionName}`,
      };
    } catch (error) {
      logger.error(`Error removing bonds: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Applies a transformation to a structure or selection
   * @param sessionId Session ID
   * @param params Transformation parameters
   * @returns Result of the operation
   */
  public async applyTransformation(
    sessionId: string,
    params: TransformationParameters
  ): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      if (params.selectionName) {
        // Validate the selection name exists
        this.validateSelectionExists(sessionId, params.selectionName);
      }

      // Build the ChimeraX command based on transformation type
      let command = '';
      const target = params.selectionName || params.structureId || 'sel';

      switch (params.type) {
        case TransformationType.ROTATE:
          if (!params.angle || !params.axis) {
            throw new Error('Rotation requires angle and axis parameters');
          }
          command = `rotate ${params.angle} ${params.axis.join(',')} models ${target}`;
          if (params.center) {
            command += ` center ${params.center.join(',')}`;
          }
          break;

        case TransformationType.TRANSLATE:
          if (!params.translation) {
            throw new Error('Translation requires translation parameter');
          }
          command = `move ${params.translation.join(',')} models ${target}`;
          break;

        case TransformationType.CENTER:
          command = `view ${target}`;
          break;

        case TransformationType.SCALE:
          if (!params.factor) {
            throw new Error('Scaling requires factor parameter');
          }
          command = `scale ${params.factor} models ${target}`;
          break;

        case TransformationType.MATRIX:
          if (!params.matrix) {
            throw new Error('Matrix transformation requires matrix parameter');
          }
          // Convert matrix to ChimeraX format (flattened)
          const flatMatrix = params.matrix.flat().join(',');
          command = `matrixset ${flatMatrix} models ${target}`;
          break;

        default:
          throw new Error(`Unknown transformation type: ${params.type}`);
      }

      // Execute the command
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);

      if (!result.success) {
        throw new Error(`Failed to apply transformation: ${result.error}`);
      }

      // Generate a transaction ID
      const transactionId = uuidv4();

      // Record the transaction
      this.recordTransaction(sessionId, 'applyTransformation', { params });

      return {
        transactionId,
        success: true,
        message: `Applied ${params.type} transformation to ${target}`,
      };
    } catch (error) {
      logger.error(`Error applying transformation: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Performs energy minimization on a selection or structure
   * @param sessionId Session ID
   * @param params Minimization parameters
   * @returns Result of the minimization
   */
  public async performMinimization(
    sessionId: string,
    params: MinimizationParameters
  ): Promise<MinimizationResult> {
    try {
      // Create a unique operation ID for tracking and notifications
      const operationId = uuidv4();
      
      // Check if session exists
      this.validateSession(sessionId);

      if (params.selectionName) {
        // Validate the selection name exists
        this.validateSelectionExists(sessionId, params.selectionName);
      }

      // Build the ChimeraX command for minimization
      const target = params.selectionName || params.structureId || 'sel';
      let command = `minimize ${target}`;

      if (params.steps) command += ` steps ${params.steps}`;
      if (params.algorithm) command += ` method ${params.algorithm}`;
      if (params.forceField) command += ` forcefield ${params.forceField}`;
      if (params.cutoff) command += ` cutoff ${params.cutoff}`;
      if (params.maxIterations) command += ` maxSteps ${params.maxIterations}`;
      if (params.energyTolerance) command += ` tol ${params.energyTolerance}`;

      // Add JSON output for parsing
      command += ' nogui true log true';
      
      // Add polling update for real-time feedback
      // In a real implementation, this would require a specialized ChimeraX command
      // that reports progress periodically
      command += ' updateInterval 10';
      
      // Create operation details for notifications
      const operationDetails = {
        target,
        algorithm: params.algorithm || 'default',
        steps: params.steps || 'default',
        forceField: params.forceField || 'default',
        expectedDuration: params.steps ? Math.min(params.steps * 100, 30000) : 15000 // Estimate duration
      };
      
      // Send operation started notification via WebSocket
      const startedMessage = websocketService.createMessage(
        WebSocketMessageType.OPERATION_STARTED,
        {
          operationId,
          operationType: 'minimization',
          details: operationDetails
        },
        { 
          sessionId, 
          priority: WebSocketMessagePriority.HIGH 
        }
      );
      
      await websocketService.broadcastToSession(sessionId, startedMessage);
      
      // In a real implementation with true progress tracking, we would use:
      // 1. A websocket connection to ChimeraX that sends progress updates
      // 2. A streaming command API that returns partial results
      // 3. A polling mechanism that queries minimization status

      // For this demonstration, we'll simulate progress with a separate async process
      this.simulateMinimizationProgress(sessionId, operationId, operationDetails);
      
      // Execute the command
      const startTime = Date.now();
      const result = await chimeraXProcessManager.sendCommand(sessionId, command);
      const duration = Date.now() - startTime;

      if (!result.success) {
        // Send error notification
        const errorMessage = websocketService.createMessage(
          WebSocketMessageType.OPERATION_FAILED,
          {
            operationId,
            operationType: 'minimization',
            error: result.error || 'Unknown error occurred during minimization'
          },
          { 
            sessionId, 
            priority: WebSocketMessagePriority.HIGH 
          }
        );
        
        await websocketService.broadcastToSession(sessionId, errorMessage);
        
        throw new Error(`Failed to perform minimization: ${result.error}`);
      }

      // Parse the minimization results
      const minResult = this.parseMinimizationResults(result.data, duration);

      // Record the transaction
      this.recordTransaction(sessionId, 'performMinimization', { params, result: minResult });
      
      // Send completion notification
      const completedMessage = websocketService.createMessage(
        WebSocketMessageType.OPERATION_COMPLETED,
        {
          operationId,
          operationType: 'minimization',
          details: {
            steps: minResult.steps,
            initialEnergy: minResult.initialEnergy,
            finalEnergy: minResult.finalEnergy,
            energyChange: minResult.energyChange,
            rmsd: minResult.rmsd,
            duration: minResult.duration
          }
        },
        { 
          sessionId, 
          priority: WebSocketMessagePriority.HIGH 
        }
      );
      
      await websocketService.broadcastToSession(sessionId, completedMessage);

      return minResult;
    } catch (error) {
      logger.error(`Error performing minimization: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Simulates progress updates for minimization operations
   * In a real implementation, this would be replaced with actual progress tracking
   * @param sessionId Session ID
   * @param operationId Operation ID
   * @param details Operation details
   * @private
   */
  private simulateMinimizationProgress(
    sessionId: string,
    operationId: string,
    details: any
  ): void {
    const totalSteps = details.steps === 'default' ? 100 : parseInt(details.steps, 10);
    const stepSize = Math.max(1, Math.floor(totalSteps / 10)); // Report ~10 progress updates
    const stepDelay = Math.max(100, Math.floor(details.expectedDuration / 10)); // Distribute over expected duration
    
    // Initial energy estimate
    let currentEnergy = 100.0;
    const finalEnergy = 10.0;
    const energyStep = (currentEnergy - finalEnergy) / (totalSteps / stepSize);
    
    // Simulation loop
    let currentStep = 0;
    
    const progressInterval = setInterval(async () => {
      currentStep += stepSize;
      
      if (currentStep >= totalSteps) {
        clearInterval(progressInterval);
        return;
      }
      
      // Calculate simulated values
      const progress = Math.min(0.99, currentStep / totalSteps);
      currentEnergy -= energyStep;
      const rmsd = (1.0 - progress) * 0.5; // Simulate decreasing RMSD
      
      // Send progress notification
      const progressMessage = websocketService.createMessage(
        WebSocketMessageType.OPERATION_PROGRESS,
        {
          operationId,
          operationType: 'minimization',
          progress: Math.round(progress * 100) / 100,
          details: {
            currentStep,
            totalSteps,
            currentEnergy: Math.round(currentEnergy * 100) / 100,
            rmsd: Math.round(rmsd * 1000) / 1000
          }
        },
        { 
          sessionId, 
          priority: WebSocketMessagePriority.NORMAL 
        }
      );
      
      await websocketService.broadcastToSession(sessionId, progressMessage)
        .catch(err => logger.error(`Error sending progress update: ${err.message}`));
        
    }, stepDelay);
    
    // Prevent the interval from keeping the process alive
    if (progressInterval.unref) {
      progressInterval.unref();
    }
  }

  /**
   * Undoes the last operation on a session
   * @param sessionId Session ID
   * @returns Result of the undo operation
   */
  public async undoOperation(sessionId: string): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Check if there are any transactions to undo
      const transactions = this.transactions.get(sessionId);
      if (!transactions || transactions.length === 0) {
        return {
          transactionId: uuidv4(),
          success: false,
          message: 'No operations to undo',
        };
      }

      // Get the last transaction
      const lastTransaction = transactions[transactions.length - 1];

      // Execute undo command specific to the operation type
      let undoCommand = '';
      let success = false;
      let message = '';

      switch (lastTransaction.operation) {
        case 'createSelection':
          // To undo a selection, just delete it
          if (lastTransaction.selectionName) {
            undoCommand = `~sel ${lastTransaction.selectionName}`;
            const result = await chimeraXProcessManager.sendCommand(sessionId, undoCommand);
            success = result.success;
            message = success
              ? `Undid selection ${lastTransaction.selectionName}`
              : `Failed to undo selection: ${result.error}`;
            
            // Remove the selection name from the set if successful
            if (success) {
              this.selectionNames.get(sessionId)?.delete(lastTransaction.selectionName);
            }
          } else {
            success = false;
            message = 'Cannot undo selection: no selection name found';
          }
          break;

        // Use the general undo command for other operations
        default:
          undoCommand = 'undo';
          const result = await chimeraXProcessManager.sendCommand(sessionId, undoCommand);
          success = result.success;
          message = success
            ? `Undid operation ${lastTransaction.operation}`
            : `Failed to undo operation: ${result.error}`;
          break;
      }

      if (success) {
        // Move the transaction from the history to the undo stack
        if (!this.undoStack.has(sessionId)) {
          this.undoStack.set(sessionId, []);
        }
        this.undoStack.get(sessionId)?.push(lastTransaction);
        transactions.pop();
      }

      return {
        transactionId: uuidv4(),
        success,
        message,
        data: { operation: lastTransaction.operation },
      };
    } catch (error) {
      logger.error(`Error undoing operation: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Redoes the last undone operation on a session
   * @param sessionId Session ID
   * @returns Result of the redo operation
   */
  public async redoOperation(sessionId: string): Promise<TransactionResult> {
    try {
      // Check if session exists
      this.validateSession(sessionId);

      // Check if there are any transactions to redo
      const undoStack = this.undoStack.get(sessionId);
      if (!undoStack || undoStack.length === 0) {
        return {
          transactionId: uuidv4(),
          success: false,
          message: 'No operations to redo',
        };
      }

      // Get the last undone transaction
      const lastUndone = undoStack[undoStack.length - 1];

      // Execute redo command
      const result = await chimeraXProcessManager.sendCommand(sessionId, 'redo');
      const success = result.success;

      if (success) {
        // Move the transaction from the undo stack back to the history
        if (!this.transactions.has(sessionId)) {
          this.transactions.set(sessionId, []);
        }
        this.transactions.get(sessionId)?.push(lastUndone);
        undoStack.pop();
      }

      const message = success
        ? `Redid operation ${lastUndone.operation}`
        : `Failed to redo operation: ${result.error}`;

      return {
        transactionId: uuidv4(),
        success,
        message,
        data: { operation: lastUndone.operation },
      };
    } catch (error) {
      logger.error(`Error redoing operation: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Gets the transaction history for a session
   * @param sessionId Session ID
   * @returns Array of transactions
   */
  public getTransactionHistory(sessionId: string): Transaction[] {
    // Check if session exists
    this.validateSession(sessionId);

    // Return a copy of the transactions
    return [...(this.transactions.get(sessionId) || [])];
  }

  /**
   * Clears all transactions for a session
   * @param sessionId Session ID
   */
  public clearTransactionHistory(sessionId: string): void {
    // Check if session exists
    this.validateSession(sessionId);

    // Clear the transaction history
    this.transactions.delete(sessionId);
    this.undoStack.delete(sessionId);
  }

  /**
   * Records a transaction in the history
   * @param sessionId Session ID
   * @param operation Operation name
   * @param parameters Operation parameters
   * @private
   */
  private recordTransaction(
    sessionId: string,
    operation: string,
    parameters: any,
    selectionName?: string,
    structureId?: string
  ): void {
    // Initialize transaction array if needed
    if (!this.transactions.has(sessionId)) {
      this.transactions.set(sessionId, []);
    }

    const transactions = this.transactions.get(sessionId)!;

    // Create a new transaction
    const transaction: Transaction = {
      id: uuidv4(),
      sessionId,
      timestamp: new Date(),
      operation,
      parameters,
      selectionName,
      structureId,
    };

    // Add to the history
    transactions.push(transaction);

    // Limit the history size
    if (transactions.length > this.maxTransactionHistory) {
      transactions.shift();
    }

    // Clear the undo stack when a new operation is performed
    this.undoStack.set(sessionId, []);
  }

  /**
   * Generates a unique selection name for a session
   * @param sessionId Session ID
   * @returns Unique selection name
   * @private
   */
  private generateUniqueSelectionName(sessionId: string): string {
    const base = 'sel';
    let index = 1;
    let name = `${base}${index}`;

    // Get the existing selection names for this session
    const existingNames = this.selectionNames.get(sessionId) || new Set();

    // Find a unique name
    while (existingNames.has(name)) {
      index++;
      name = `${base}${index}`;
    }

    return name;
  }

  /**
   * Validates that a session exists
   * @param sessionId Session ID
   * @throws Error if session does not exist
   * @private
   */
  private validateSession(sessionId: string): void {
    const session = sessionService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
  }

  /**
   * Validates that a selection exists in a session
   * @param sessionId Session ID
   * @param selectionName Selection name
   * @throws Error if selection does not exist
   * @private
   */
  private validateSelectionExists(sessionId: string, selectionName: string): void {
    const selectionNames = this.selectionNames.get(sessionId);
    if (!selectionNames || !selectionNames.has(selectionName)) {
      throw new Error(`Selection not found: ${selectionName}`);
    }
  }

  /**
   * Parses minimization results from ChimeraX output
   * @param data ChimeraX command result data
   * @param duration Minimization duration in milliseconds
   * @returns Parsed minimization results
   * @private
   */
  private parseMinimizationResults(data: any, duration: number): MinimizationResult {
    // Default values
    const result: MinimizationResult = {
      initialEnergy: data?.initialEnergy || 0,
      finalEnergy: data?.finalEnergy || 0,
      steps: data?.steps || 0,
      converged: data?.converged || false,
      rmsd: data?.rmsd || 0,
      duration,
    };

    return result;
  }

  /**
   * Cleanup method to remove resources when a session is terminated
   * @param sessionId Session ID
   */
  public cleanupSession(sessionId: string): void {
    this.transactions.delete(sessionId);
    this.undoStack.delete(sessionId);
    this.selectionNames.delete(sessionId);
  }
}

export const structureService = new StructureService();
export default structureService;