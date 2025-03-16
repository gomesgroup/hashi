import chimeraXProcessManager from './ChimeraXProcessManager';
import logger from '../utils/logger';
import { ChimeraXCommandResult } from '../types/chimerax';

/**
 * Interface for command history entry
 */
export interface CommandHistoryEntry {
  id: string;
  sessionId: string;
  command: string;
  result: ChimeraXCommandResult;
  timestamp: Date;
  executionTimeMs: number;
}

/**
 * Interface for command documentation
 */
export interface CommandDocumentation {
  name: string;
  synopsis: string;
  description?: string;
  category?: string;
  usage?: string;
  examples?: string[];
}

/**
 * Command Service
 * 
 * Manages ChimeraX command execution and history
 */
class CommandService {
  private commandHistory: Map<string, CommandHistoryEntry[]>;
  private commandDocs: Map<string, CommandDocumentation>;

  constructor() {
    this.commandHistory = new Map<string, CommandHistoryEntry[]>();
    this.commandDocs = new Map<string, CommandDocumentation>();
    
    // Load command documentation - in a real implementation, this might be
    // fetched from ChimeraX's built-in documentation or a separate file
    this.initializeCommandDocs();
  }

  /**
   * Execute a command in a ChimeraX session
   * @param sessionId Session ID
   * @param command Command to execute
   * @returns Command result
   */
  public async executeCommand(sessionId: string, command: string): Promise<ChimeraXCommandResult> {
    logger.debug(`Executing command in session ${sessionId}: ${command}`);
    
    if (!sessionId || !command) {
      return {
        success: false,
        error: 'Session ID and command are required'
      };
    }
    
    const startTime = Date.now();
    let result: ChimeraXCommandResult;
    
    try {
      // Execute command via ChimeraX Process Manager
      result = await chimeraXProcessManager.sendCommand(sessionId, command);
      const executionTime = Date.now() - startTime;
      
      // Add to command history
      this.addToHistory(sessionId, command, result, executionTime);
      
      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error(`Error executing command: ${errorMessage}`);
      
      result = {
        success: false,
        error: errorMessage
      };
      
      // Also add failed commands to history
      const executionTime = Date.now() - startTime;
      this.addToHistory(sessionId, command, result, executionTime);
      
      return result;
    }
  }

  /**
   * Execute multiple commands in sequence
   * @param sessionId Session ID
   * @param commands Array of commands to execute
   * @returns Array of command results
   */
  public async executeCommandSequence(sessionId: string, commands: string[]): Promise<ChimeraXCommandResult[]> {
    if (!sessionId || !commands.length) {
      return [{
        success: false,
        error: 'Session ID and at least one command are required'
      }];
    }

    const results: ChimeraXCommandResult[] = [];
    
    for (const command of commands) {
      const result = await this.executeCommand(sessionId, command);
      results.push(result);
      
      // If a command fails, stop the sequence
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get command history for a session
   * @param sessionId Session ID
   * @param limit Maximum number of entries to return (default: 100)
   * @param offset Offset for pagination (default: 0)
   * @returns Array of command history entries
   */
  public getCommandHistory(sessionId: string, limit: number = 100, offset: number = 0): CommandHistoryEntry[] {
    if (!sessionId) {
      return [];
    }
    
    const history = this.commandHistory.get(sessionId) || [];
    
    // Sort by timestamp (newest first) and apply pagination
    return history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get all available command documentation
   * @param category Optional category filter
   * @param searchTerm Optional search term
   * @returns Filtered command documentation
   */
  public getCommandDocs(category?: string, searchTerm?: string): CommandDocumentation[] {
    let commands = Array.from(this.commandDocs.values());
    
    // Filter by category if provided
    if (category) {
      commands = commands.filter(cmd => cmd.category === category);
    }
    
    // Filter by search term if provided
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      commands = commands.filter(cmd => 
        cmd.name.toLowerCase().includes(search) || 
        cmd.synopsis.toLowerCase().includes(search) ||
        (cmd.description && cmd.description.toLowerCase().includes(search))
      );
    }
    
    return commands;
  }

  /**
   * Get documentation for a specific command
   * @param commandName Command name
   * @returns Command documentation or null if not found
   */
  public getCommandDoc(commandName: string): CommandDocumentation | null {
    return this.commandDocs.get(commandName) || null;
  }

  /**
   * Clear command history for a session
   * @param sessionId Session ID
   * @returns True if history was cleared, false if session not found
   */
  public clearCommandHistory(sessionId: string): boolean {
    if (!this.commandHistory.has(sessionId)) {
      return false;
    }
    
    this.commandHistory.set(sessionId, []);
    return true;
  }

  /**
   * Add a command to the history
   * @param sessionId Session ID
   * @param command Executed command
   * @param result Command execution result
   * @param executionTimeMs Execution time in milliseconds
   * @private
   */
  private addToHistory(
    sessionId: string, 
    command: string, 
    result: ChimeraXCommandResult, 
    executionTimeMs: number
  ): void {
    // Create history entry if it doesn't exist
    if (!this.commandHistory.has(sessionId)) {
      this.commandHistory.set(sessionId, []);
    }
    
    const historyEntry: CommandHistoryEntry = {
      id: Date.now().toString(), // Simple ID generation
      sessionId,
      command,
      result,
      timestamp: new Date(),
      executionTimeMs
    };
    
    const sessionHistory = this.commandHistory.get(sessionId)!;
    sessionHistory.push(historyEntry);
    
    // Limit history size to 1000 entries per session
    if (sessionHistory.length > 1000) {
      sessionHistory.shift(); // Remove oldest entry
    }
  }

  /**
   * Initialize command documentation
   * @private
   */
  private initializeCommandDocs(): void {
    // This is a simplified set of commands for demonstration
    // In a real implementation, these would be fetched from ChimeraX
    const sampleCommands: CommandDocumentation[] = [
      {
        name: 'open',
        synopsis: 'Open molecular structure files',
        description: 'Opens molecular structure files in various formats (PDB, mol2, etc.)',
        category: 'io',
        usage: 'open filename [format options]',
        examples: ['open 1abc', 'open myfile.pdb', 'open myfile.mol format mol']
      },
      {
        name: 'close',
        synopsis: 'Close models',
        description: 'Closes specified models or all models if none are specified',
        category: 'io',
        usage: 'close [#model-spec]',
        examples: ['close #1', 'close']
      },
      {
        name: 'save',
        synopsis: 'Save data to a file',
        description: 'Saves models, images, or other data to a file',
        category: 'io',
        usage: 'save filename [format options]',
        examples: ['save model.pdb', 'save image.png']
      },
      {
        name: 'cartoon',
        synopsis: 'Show cartoons for atomic structures',
        description: 'Creates cartoon representations for specified atomic models',
        category: 'visualization',
        usage: 'cartoon [#atom-spec]',
        examples: ['cartoon', 'cartoon #1']
      },
      {
        name: 'color',
        synopsis: 'Color atoms, ribbons, surfaces',
        description: 'Sets the color of specified items',
        category: 'visualization',
        usage: 'color color-spec [#atom-spec]',
        examples: ['color red', 'color blue #1']
      },
      {
        name: 'surface',
        synopsis: 'Show molecular surface',
        description: 'Creates a molecular surface for specified atomic models',
        category: 'visualization',
        usage: 'surface [#atom-spec]',
        examples: ['surface', 'surface #1']
      }
    ];
    
    // Add commands to the map
    for (const cmd of sampleCommands) {
      this.commandDocs.set(cmd.name, cmd);
    }
  }
}

// Export singleton instance
export const commandService = new CommandService();
export default commandService;