import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import config from '../config';
import { 
  RenderingJob, 
  SnapshotParameters, 
  RenderingJobStatus, 
  ImageFormat 
} from '../types/rendering';

/**
 * RenderingQueue Service
 * 
 * Manages rendering jobs using a priority queue system.
 * Handles job submission, prioritization, execution, and status tracking.
 */
class RenderingQueue extends EventEmitter {
  private jobs: Map<string, RenderingJob> = new Map();
  private queue: string[] = [];
  private processing: Set<string> = new Set();
  private initialized: boolean = false;

  /**
   * Initialize the rendering queue system
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure snapshot directory exists
      await fs.mkdir(config.rendering.snapshotDir, { recursive: true });
      
      // Create subdirectories for each session as needed
      // Session directories will be created when needed

      logger.info(`Rendering queue initialized with snapshot directory: ${config.rendering.snapshotDir}`);
      this.initialized = true;
    } catch (error) {
      logger.error(`Failed to initialize rendering queue: ${error}`);
      throw new Error(`Rendering queue initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Submit a new rendering job to the queue
   * @param sessionId Session ID
   * @param parameters Rendering parameters
   * @param priority Priority level (higher number = higher priority)
   * @returns Job information
   */
  public submitJob(
    sessionId: string, 
    parameters: SnapshotParameters, 
    priority: number = 1
  ): RenderingJob {
    // Create job ID
    const jobId = uuidv4();
    const now = new Date();

    // Apply default values for parameters
    const defaultedParams: SnapshotParameters = {
      width: parameters.width || config.rendering.defaultImageWidth,
      height: parameters.height || config.rendering.defaultImageHeight,
      format: parameters.format || ImageFormat.PNG,
      ...parameters
    };

    // Enforce maximum dimensions
    if (defaultedParams.width && defaultedParams.width > config.rendering.maxImageWidth) {
      defaultedParams.width = config.rendering.maxImageWidth;
    }
    
    if (defaultedParams.height && defaultedParams.height > config.rendering.maxImageHeight) {
      defaultedParams.height = config.rendering.maxImageHeight;
    }

    // Create job object
    const job: RenderingJob = {
      id: jobId,
      sessionId,
      parameters: defaultedParams,
      status: RenderingJobStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      priority
    };

    // Add to job map and queue
    this.jobs.set(jobId, job);
    this.addToQueue(jobId, priority);

    logger.info(`Rendering job submitted: ${jobId} for session ${sessionId}`);

    // Process the queue
    setImmediate(() => this.processQueue());

    return job;
  }

  /**
   * Get a job by ID
   * @param jobId Job ID
   * @returns Job information or undefined if not found
   */
  public getJob(jobId: string): RenderingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a session
   * @param sessionId Session ID
   * @returns Array of jobs for the session
   */
  public getSessionJobs(sessionId: string): RenderingJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.sessionId === sessionId);
  }

  /**
   * Cancel a rendering job
   * @param jobId Job ID
   * @returns True if job was cancelled, false if it couldn't be cancelled
   */
  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return false;
    }

    // If job is already completed or failed, it can't be cancelled
    if (
      job.status === RenderingJobStatus.COMPLETED || 
      job.status === RenderingJobStatus.FAILED
    ) {
      return false;
    }

    // If job is processing, try to cancel the operation
    if (job.status === RenderingJobStatus.PROCESSING) {
      // TODO: Implement actual cancellation if possible
      // For now, we'll just mark it as cancelled
      this.processing.delete(jobId);
    } else if (job.status === RenderingJobStatus.PENDING) {
      // Remove from queue
      this.queue = this.queue.filter(id => id !== jobId);
    }

    // Update job status
    job.status = RenderingJobStatus.CANCELLED;
    job.updatedAt = new Date();
    job.message = 'Job cancelled by user';

    logger.info(`Rendering job cancelled: ${jobId}`);

    return true;
  }

  /**
   * Clean up completed/failed/cancelled jobs for a session
   * @param sessionId Session ID
   * @returns Number of jobs cleaned up
   */
  public async cleanupSessionJobs(sessionId: string): Promise<number> {
    const sessionJobs = this.getSessionJobs(sessionId);
    let cleanedCount = 0;

    for (const job of sessionJobs) {
      if (
        job.status === RenderingJobStatus.COMPLETED ||
        job.status === RenderingJobStatus.FAILED ||
        job.status === RenderingJobStatus.CANCELLED
      ) {
        // Delete snapshot file if it exists
        if (job.filePath) {
          try {
            await fs.unlink(job.filePath);
            logger.debug(`Deleted snapshot file: ${job.filePath}`);
          } catch (error) {
            logger.warn(`Failed to delete snapshot file ${job.filePath}: ${error}`);
          }
        }

        // Remove from job map
        this.jobs.delete(job.id);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get the snapshot file path for a completed job
   * @param jobId Job ID
   * @returns File path or undefined if job not found or not completed
   */
  public getSnapshotFilePath(jobId: string): string | undefined {
    const job = this.jobs.get(jobId);
    
    if (!job || job.status !== RenderingJobStatus.COMPLETED) {
      return undefined;
    }

    return job.filePath;
  }

  /**
   * Add a job to the queue with priority
   * @param jobId Job ID
   * @param priority Priority level
   */
  private addToQueue(jobId: string, priority: number): void {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return;
    }

    job.priority = priority;

    // Find the position to insert based on priority
    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const queuedJobId = this.queue[i];
      const queuedJob = this.jobs.get(queuedJobId);
      
      if (queuedJob && (queuedJob.priority || 0) < priority) {
        insertIndex = i;
        break;
      }
    }

    // Insert at the appropriate position
    this.queue.splice(insertIndex, 0, jobId);
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    // Check if we can process more jobs
    if (this.processing.size >= config.rendering.maxConcurrentJobs) {
      return;
    }

    // Get the next job from the queue
    while (
      this.queue.length > 0 && 
      this.processing.size < config.rendering.maxConcurrentJobs
    ) {
      const jobId = this.queue.shift();
      
      if (!jobId) {
        continue;
      }

      const job = this.jobs.get(jobId);
      
      if (!job) {
        continue;
      }

      // Start processing the job
      this.processing.add(jobId);
      job.status = RenderingJobStatus.PROCESSING;
      job.updatedAt = new Date();

      logger.info(`Processing rendering job: ${jobId}`);

      // Process the job asynchronously
      this.processJob(job)
        .catch(error => {
          logger.error(`Error processing rendering job ${jobId}: ${error}`);
          
          // Update job status on error
          job.status = RenderingJobStatus.FAILED;
          job.updatedAt = new Date();
          job.message = `Rendering failed: ${error.message}`;
        })
        .finally(() => {
          // Remove from processing set
          this.processing.delete(jobId);
          
          // Process next job
          this.processQueue();
        });
    }
  }

  /**
   * Process a single rendering job
   * @param job Rendering job
   */
  private async processJob(job: RenderingJob): Promise<void> {
    try {
      // Create session directory if it doesn't exist
      const sessionDir = path.join(config.rendering.snapshotDir, job.sessionId);
      await fs.mkdir(sessionDir, { recursive: true });

      // Determine file extension based on format
      let fileExtension: string;
      switch (job.parameters.format) {
        case ImageFormat.JPEG:
          fileExtension = 'jpg';
          break;
        case ImageFormat.TIFF:
          fileExtension = 'tiff';
          break;
        case ImageFormat.PNG:
        default:
          fileExtension = 'png';
          break;
      }

      // Generate unique filename
      const filename = `${job.id}-${Date.now()}.${fileExtension}`;
      const filePath = path.join(sessionDir, filename);

      // Generate ChimeraX command for snapshot
      const snapshotCommand = this.buildSnapshotCommand(job, filePath);

      // Try multiple rendering approaches if needed
      let result = await this.executeChimeraXCommand(job.sessionId, snapshotCommand);
      let attempts = 1;
      const maxAttempts = 3;

      // If the first attempt failed, try backup rendering options
      while (!result.success && attempts < maxAttempts) {
        attempts++;
        logger.warn(`Rendering attempt ${attempts-1} failed. Trying alternative approach...`);
        
        // Modify rendering parameters for fallback
        const fallbackCommand = this.buildFallbackCommand(job, filePath, attempts);
        result = await this.executeChimeraXCommand(job.sessionId, fallbackCommand);
      }

      if (!result.success) {
        // If all ChimeraX rendering attempts failed, use placeholder image
        await this.generatePlaceholderImage(job, filePath);
        logger.warn(`Using placeholder image for job ${job.id} after ${attempts} failed rendering attempts`);
        
        // Note that we're using a placeholder in the job record
        job.filePath = filePath;
        job.status = RenderingJobStatus.COMPLETED;
        job.message = 'ChimeraX rendering unavailable. Using placeholder image instead.';
        job.updatedAt = new Date();
        job.completedAt = new Date();
        
        // Try to get file size
        try {
          const stats = await fs.stat(filePath);
          job.fileSize = stats.size;
        } catch {
          job.fileSize = 0;
        }
        
        logger.info(`Rendering job completed with placeholder: ${job.id}`);
        return;
      }

      // Verify file exists and is valid
      try {
        const stats = await fs.stat(filePath);
        
        // Check if the file is empty or too small (likely corrupt)
        if (stats.size < 100) { // Arbitrary small size threshold
          throw new Error('Generated image file is too small or corrupt');
        }
        
        // Update job with file information
        job.filePath = filePath;
        job.fileSize = stats.size;
        job.status = RenderingJobStatus.COMPLETED;
        job.updatedAt = new Date();
        job.completedAt = new Date();
        
        // If we used fallback methods, note that in the message
        if (attempts > 1) {
          job.message = `Rendering completed using fallback method (attempt ${attempts}).`;
        }

        logger.info(`Rendering job completed: ${job.id}, size: ${stats.size} bytes, attempts: ${attempts}`);
      } catch (error) {
        // If we can't verify the file, try to generate a placeholder
        await this.generatePlaceholderImage(job, filePath);
        
        job.filePath = filePath;
        job.status = RenderingJobStatus.COMPLETED;
        job.message = `Snapshot file verification failed: ${(error as Error).message}. Using placeholder image.`;
        job.updatedAt = new Date();
        job.completedAt = new Date();
        
        // Try to get file size
        try {
          const stats = await fs.stat(filePath);
          job.fileSize = stats.size;
        } catch {
          job.fileSize = 0;
        }
        
        logger.warn(`Rendering job ${job.id} completed with verification error, using placeholder.`);
      }
    } catch (error) {
      // Update job status
      job.status = RenderingJobStatus.FAILED;
      job.updatedAt = new Date();
      job.message = `Rendering failed: ${(error as Error).message}`;

      logger.error(`Rendering job ${job.id} failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Builds a fallback rendering command with simpler options
   * @param job Rendering job
   * @param outputPath Output file path
   * @param attempt Attempt number (used to determine fallback strategy)
   * @returns ChimeraX command for fallback rendering
   * @private
   */
  private buildFallbackCommand(job: RenderingJob, outputPath: string, attempt: number): string {
    // Simplify parameters for better chance of success
    const commands: string[] = [];
    
    // Set simpler view for better performance
    commands.push('view initial');
    
    // Use simple background
    commands.push('background solid white');
    
    // Use simpler rendering based on attempt number
    if (attempt === 2) {
      // Second attempt: try with simpler style
      commands.push('style stick');
      
      // Lower resolution
      const width = Math.min(job.parameters.width || config.rendering.defaultImageWidth, 800);
      const height = Math.min(job.parameters.height || config.rendering.defaultImageHeight, 600);
      
      // Simplify save command
      const escapedPath = outputPath.replace(/\\/g, '\\\\');
      commands.push(`save "${escapedPath}" width ${width} height ${height} supersample 1`);
    } else {
      // Last attempt: most basic rendering
      commands.push('style lines');
      
      // Lowest acceptable resolution
      const width = Math.min(job.parameters.width || config.rendering.defaultImageWidth, 640);
      const height = Math.min(job.parameters.height || config.rendering.defaultImageHeight, 480);
      
      // Basic save command
      const escapedPath = outputPath.replace(/\\/g, '\\\\');
      commands.push(`save "${escapedPath}" width ${width} height ${height}`);
    }
    
    return commands.join('; ');
  }
  
  /**
   * Generates a placeholder image when ChimeraX rendering fails
   * @param job Rendering job
   * @param outputPath Output file path
   * @private
   */
  private async generatePlaceholderImage(job: RenderingJob, outputPath: string): Promise<void> {
    try {
      const { createCanvas, loadImage } = require('canvas');
      
      // Set dimensions
      const width = job.parameters.width || config.rendering.defaultImageWidth;
      const height = job.parameters.height || config.rendering.defaultImageHeight;
      
      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);
      
      // Draw border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, width - 10, height - 10);
      
      // Draw text
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ChimeraX Rendering Unavailable', width / 2, height / 2 - 20);
      
      ctx.font = '18px Arial';
      ctx.fillText('Please check OSMesa installation', width / 2, height / 2 + 20);
      
      // Save as image
      const fs = require('fs');
      const stream = fs.createWriteStream(outputPath);
      
      if (job.parameters.format === ImageFormat.JPEG) {
        const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
        fs.writeFileSync(outputPath, buffer);
      } else {
        // Default to PNG
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
      }
      
      logger.info(`Generated placeholder image at ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to generate placeholder image: ${(error as Error).message}`);
      
      // If canvas fails, try to copy a default placeholder image from assets
      try {
        const defaultPlaceholder = path.join(__dirname, '..', '..', 'assets', 'placeholder.png');
        if (fs.existsSync(defaultPlaceholder)) {
          fs.copyFileSync(defaultPlaceholder, outputPath);
          logger.info(`Copied default placeholder image to ${outputPath}`);
        } else {
          throw new Error('Default placeholder image not found');
        }
      } catch (copyError) {
        logger.error(`Failed to copy default placeholder: ${(copyError as Error).message}`);
        throw error; // Re-throw the original error if we can't create a placeholder
      }
    }
  }

  /**
   * Build a ChimeraX command string for generating a snapshot
   * @param job Rendering job
   * @param outputPath Output file path
   * @returns ChimeraX command string
   */
  private buildSnapshotCommand(job: RenderingJob, outputPath: string): string {
    const params = job.parameters;
    const commands: string[] = [];

    // Set view parameters if specified
    if (params.camera) {
      if (params.camera.position && params.camera.target) {
        commands.push(`view position ${params.camera.position.join(',')}`);
        commands.push(`view target ${params.camera.target.join(',')}`);
      }
      
      if (params.camera.fieldOfView) {
        commands.push(`view fieldOfView ${params.camera.fieldOfView}`);
      }
    }

    // Set lighting parameters
    if (params.lighting) {
      if (params.lighting.ambientIntensity !== undefined) {
        commands.push(`lighting ambient ${params.lighting.ambientIntensity}`);
      }
      
      if (params.lighting.ambientColor) {
        commands.push(`lighting ambientColor ${params.lighting.ambientColor}`);
      }
      
      if (params.lighting.shadows !== undefined) {
        commands.push(`lighting shadows ${params.lighting.shadows ? 'true' : 'false'}`);
      }
      
      // Add directional lights if specified
      if (params.lighting.directionalLights) {
        params.lighting.directionalLights.forEach((light, index) => {
          const direction = light.direction.join(',');
          const color = light.color || 'white';
          const intensity = light.intensity || 1.0;
          
          commands.push(`lighting directional ${index} direction ${direction} color ${color} intensity ${intensity}`);
        });
      }
    }

    // Set background parameters
    if (params.background) {
      if (params.background.color) {
        commands.push(`background color ${params.background.color}`);
      }
      
      if (params.background.transparent) {
        commands.push('background transparent true');
      }
      
      if (params.background.gradient) {
        commands.push(
          `background gradient ${params.background.gradient.topColor} ${params.background.gradient.bottomColor}`
        );
      }
    }

    // Set style parameters
    if (params.style) {
      let styleCmd = `style ${params.style.representation}`;
      
      if (params.style.colorScheme) {
        styleCmd += ` color ${params.style.colorScheme}`;
      }
      
      commands.push(styleCmd);
      
      // Additional style options
      if (params.style.transparency !== undefined) {
        commands.push(`transparency ${params.style.transparency}`);
      }
      
      if (params.style.showHydrogens !== undefined) {
        commands.push(`show ${params.style.showHydrogens ? '' : 'hide '}hydrogens`);
      }
      
      if (params.style.showSolvent !== undefined) {
        commands.push(`show ${params.style.showSolvent ? '' : 'hide '}solvent`);
      }
    }

    // Add scale bar if requested
    if (params.showScaleBar) {
      const position = params.scaleBarOptions?.position || 'bottom-right';
      const length = params.scaleBarOptions?.length || 10; // Default 10 Å
      const color = params.scaleBarOptions?.color || 'white';
      
      commands.push(`scalebar position ${position} length ${length} color ${color} show true`);
    }

    // Add caption if specified
    if (params.caption) {
      commands.push(`label text "${params.caption}" size 20 position bottom-center color white`);
    }

    // Generate the final save command
    const width = params.width || config.rendering.defaultImageWidth;
    const height = params.height || config.rendering.defaultImageHeight;
    const format = params.format || ImageFormat.PNG;
    
    // Build save options
    let saveOptions = '';
    if (format === ImageFormat.JPEG && params.quality) {
      saveOptions = ` quality ${params.quality}`;
    }
    
    if (params.supersampling) {
      saveOptions += ` supersample ${params.supersampling}`;
    }

    // Escape Windows backslashes in path
    const escapedPath = outputPath.replace(/\\/g, '\\\\');
    
    // Add final save command
    commands.push(`save "${escapedPath}" width ${width} height ${height} format ${format}${saveOptions}`);

    // Join all commands with semicolons
    return commands.join('; ');
  }

  /**
   * Execute a ChimeraX command via the ChimeraX service
   * @param sessionId Session ID
   * @param command Command to execute
   * @returns Command execution result
   */
  private async executeChimeraXCommand(
    sessionId: string, 
    command: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Import ChimeraXProcessManager here to avoid circular dependency
      const { chimeraXProcessManager } = await import('./ChimeraXProcessManager');
      
      return await chimeraXProcessManager.sendCommand(sessionId, command);
    } catch (error) {
      logger.error(`Error executing ChimeraX command: ${error}`);
      return {
        success: false,
        error: `Failed to execute ChimeraX command: ${(error as Error).message}`
      };
    }
  }
}

// Export singleton instance
export const renderingQueue = new RenderingQueue();
export default renderingQueue;