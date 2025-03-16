import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import config from '../config';
import logger from '../utils/logger';
import sessionService from './session';
import { 
  MovieParameters, 
  RenderingJobStatus, 
  SnapshotParameters 
} from '../types/rendering';

/**
 * Movie Service
 * 
 * Provides functionality for generating movie sequences from ChimeraX sessions.
 */
class MovieService {
  private jobs: Map<string, any> = new Map();
  private initialized: boolean = false;
  
  /**
   * Initialize the movie service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Create movies directory if it doesn't exist
      const moviesDir = path.join(config.rendering.snapshotDir, 'movies');
      await fs.mkdir(moviesDir, { recursive: true });
      
      logger.info(`Movie service initialized with directory: ${moviesDir}`);
      this.initialized = true;
    } catch (error) {
      logger.error(`Failed to initialize movie service: ${error}`);
      throw new Error(`Movie service initialization failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a movie sequence
   * @param sessionId Session ID
   * @param parameters Movie parameters
   * @returns Movie job ID
   */
  public async createMovie(
    sessionId: string, 
    parameters: MovieParameters
  ): Promise<{ id: string; status: RenderingJobStatus }> {
    try {
      // Validate session exists
      const session = sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      // Validate parameters
      if (!parameters.frames || parameters.frames.length < 2) {
        throw new Error('Movie requires at least 2 frames');
      }
      
      // Create job ID
      const jobId = uuidv4();
      const now = new Date();
      
      // Create job object
      const job = {
        id: jobId,
        sessionId,
        parameters,
        status: RenderingJobStatus.PENDING,
        createdAt: now,
        updatedAt: now,
        framePaths: [] as string[],
        outputPath: null as string | null,
      };
      
      // Store job
      this.jobs.set(jobId, job);
      
      // Process the movie job asynchronously
      this.processMovieJob(job)
        .catch(error => {
          logger.error(`Error processing movie job ${jobId}: ${error}`);
          job.status = RenderingJobStatus.FAILED;
          job.updatedAt = new Date();
          job.message = `Movie generation failed: ${(error as Error).message}`;
        });
      
      return {
        id: jobId,
        status: RenderingJobStatus.PENDING,
      };
    } catch (error) {
      logger.error(`Failed to create movie: ${error}`);
      throw new Error(`Movie creation failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get movie status
   * @param sessionId Session ID
   * @param movieId Movie ID
   * @returns Movie status
   */
  public getMovieStatus(
    sessionId: string, 
    movieId: string
  ): { 
    id: string; 
    status: RenderingJobStatus; 
    progress?: number; 
    message?: string;
    url?: string;
  } | null {
    const job = this.jobs.get(movieId);
    
    if (!job || job.sessionId !== sessionId) {
      return null;
    }
    
    let progress: number | undefined;
    if (job.status === RenderingJobStatus.PROCESSING && job.totalFrames) {
      progress = Math.round((job.completedFrames / job.totalFrames) * 100);
    }
    
    // If completed, add URL
    let url: string | undefined;
    if (job.status === RenderingJobStatus.COMPLETED && job.outputPath) {
      url = `/api/sessions/${sessionId}/movies/${movieId}/file`;
    }
    
    return {
      id: job.id,
      status: job.status,
      progress,
      message: job.message,
      url,
    };
  }
  
  /**
   * Get movie file
   * @param sessionId Session ID
   * @param movieId Movie ID
   * @returns Movie file information or null if not found
   */
  public async getMovieFile(
    sessionId: string, 
    movieId: string
  ): Promise<{ 
    path: string; 
    filename: string; 
    mimetype: string; 
    size: number; 
  } | null> {
    try {
      const job = this.jobs.get(movieId);
      
      if (!job || job.sessionId !== sessionId || job.status !== RenderingJobStatus.COMPLETED || !job.outputPath) {
        return null;
      }
      
      // Check if file exists
      try {
        const stats = await fs.stat(job.outputPath);
        
        // Determine MIME type
        let mimetype: string;
        if (job.parameters.format === 'gif') {
          mimetype = 'image/gif';
        } else {
          mimetype = 'video/mp4';
        }
        
        // Return file information
        return {
          path: job.outputPath,
          filename: path.basename(job.outputPath),
          mimetype,
          size: stats.size,
        };
      } catch {
        return null;
      }
    } catch (error) {
      logger.error(`Failed to get movie file: ${error}`);
      throw new Error(`Movie file retrieval failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Process a movie job
   * @param job Movie job
   * @private
   */
  private async processMovieJob(job: any): Promise<void> {
    try {
      // Update job status
      job.status = RenderingJobStatus.PROCESSING;
      job.updatedAt = new Date();
      job.message = 'Rendering frames...';
      job.totalFrames = job.parameters.frames.length;
      job.completedFrames = 0;
      
      // Create session directory if it doesn't exist
      const sessionDir = path.join(config.rendering.snapshotDir, job.sessionId);
      await fs.mkdir(sessionDir, { recursive: true });
      
      // Create frames directory
      const framesDir = path.join(sessionDir, `movie-${job.id}`);
      await fs.mkdir(framesDir, { recursive: true });
      
      // Import ChimeraXProcessManager here to avoid circular dependency
      const { chimeraXProcessManager } = await import('./ChimeraXProcessManager');
      
      // Generate frames
      const framePaths: string[] = [];
      for (let i = 0; i < job.parameters.frames.length; i++) {
        const frame = job.parameters.frames[i];
        const frameNum = i.toString().padStart(4, '0');
        const framePath = path.join(framesDir, `frame-${frameNum}.png`);
        
        // Create snapshot parameters for this frame
        const snapshotParams: SnapshotParameters = {
          ...job.parameters,
          width: job.parameters.width || config.rendering.defaultImageWidth,
          height: job.parameters.height || config.rendering.defaultImageHeight,
        };
        
        // Apply frame-specific settings
        if (frame.camera) {
          snapshotParams.camera = {
            ...snapshotParams.camera,
            ...frame.camera,
          };
        }
        
        if (frame.style) {
          snapshotParams.style = {
            ...snapshotParams.style,
            ...frame.style,
          };
        }
        
        // Generate command for this frame
        const command = this.buildFrameCommand(snapshotParams, framePath);
        
        // Execute the command
        const result = await chimeraXProcessManager.sendCommand(job.sessionId, command);
        
        if (!result.success) {
          throw new Error(`Failed to render frame ${i}: ${result.error || 'Unknown error'}`);
        }
        
        // Verify frame was created
        try {
          await fs.access(framePath);
          framePaths.push(framePath);
          job.completedFrames++;
          job.updatedAt = new Date();
        } catch {
          throw new Error(`Frame file not created: ${framePath}`);
        }
      }
      
      // Store frame paths
      job.framePaths = framePaths;
      job.message = 'Generating movie file...';
      
      // Generate movie file
      const outputFormat = job.parameters.format || 'mp4';
      const fps = job.parameters.fps || 30;
      const outputPath = path.join(sessionDir, `movie-${job.id}.${outputFormat}`);
      
      // Generate the movie using ffmpeg
      await this.generateMovie(framePaths, outputPath, outputFormat, fps);
      
      // Update job status
      job.status = RenderingJobStatus.COMPLETED;
      job.updatedAt = new Date();
      job.completedAt = new Date();
      job.outputPath = outputPath;
      job.message = 'Movie generated successfully';
      
      // Clean up frames
      try {
        for (const framePath of framePaths) {
          await fs.unlink(framePath);
        }
        await fs.rmdir(framesDir);
      } catch (error) {
        logger.warn(`Failed to clean up movie frames: ${error}`);
      }
    } catch (error) {
      // Update job status
      job.status = RenderingJobStatus.FAILED;
      job.updatedAt = new Date();
      job.message = `Movie generation failed: ${(error as Error).message}`;
      
      logger.error(`Movie job ${job.id} failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Build a ChimeraX command for a frame
   * @param params Snapshot parameters
   * @param outputPath Output file path
   * @returns ChimeraX command
   * @private
   */
  private buildFrameCommand(params: SnapshotParameters, outputPath: string): string {
    const commands: string[] = [];
    
    // Camera settings
    if (params.camera) {
      if (params.camera.position && params.camera.target) {
        commands.push(`view position ${params.camera.position.join(',')}`);
        commands.push(`view target ${params.camera.target.join(',')}`);
      }
      
      if (params.camera.fieldOfView) {
        commands.push(`view fieldOfView ${params.camera.fieldOfView}`);
      }
    }
    
    // Lighting settings
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
    }
    
    // Background settings
    if (params.background) {
      if (params.background.color) {
        commands.push(`background color ${params.background.color}`);
      }
      
      if (params.background.transparent) {
        commands.push('background transparent true');
      }
    }
    
    // Style settings
    if (params.style) {
      let styleCmd = `style ${params.style.representation}`;
      
      if (params.style.colorScheme) {
        styleCmd += ` color ${params.style.colorScheme}`;
      }
      
      commands.push(styleCmd);
    }
    
    // Add save command
    const width = params.width || config.rendering.defaultImageWidth;
    const height = params.height || config.rendering.defaultImageHeight;
    const escapedPath = outputPath.replace(/\\/g, '\\\\');
    
    commands.push(`save "${escapedPath}" width ${width} height ${height} format png supersample 3`);
    
    return commands.join('; ');
  }
  
  /**
   * Generate a movie file from frames using ffmpeg
   * @param framePaths Array of frame file paths
   * @param outputPath Output file path
   * @param format Output format (mp4 or gif)
   * @param fps Frames per second
   * @private
   */
  private async generateMovie(
    framePaths: string[], 
    outputPath: string, 
    format: string, 
    fps: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if we have frames
      if (framePaths.length === 0) {
        return reject(new Error('No frames to generate movie'));
      }
      
      // Build ffmpeg command
      const ffmpegPath = 'ffmpeg'; // Assume ffmpeg is installed and in PATH
      
      let args: string[];
      if (format === 'gif') {
        args = [
          '-y',                   // Overwrite output files
          '-framerate', fps.toString(),
          '-i', path.join(path.dirname(framePaths[0]), 'frame-%04d.png'),
          '-vf', 'palettegen',    // Generate palette for better gif quality
          '-o', outputPath.replace(/\.gif$/, '-palette.png')
        ];
      } else {
        // MP4 format
        args = [
          '-y',                   // Overwrite output files
          '-framerate', fps.toString(),
          '-i', path.join(path.dirname(framePaths[0]), 'frame-%04d.png'),
          '-c:v', 'libx264',      // Codec
          '-preset', 'medium',    // Encoding preset
          '-crf', '23',           // Quality
          '-pix_fmt', 'yuv420p',  // Pixel format
          outputPath
        ];
      }
      
      // Spawn ffmpeg process
      const ffmpeg = spawn(ffmpegPath, args);
      
      // Handle process output
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }
}

// Export singleton instance
export const movieService = new MovieService();
export default movieService;