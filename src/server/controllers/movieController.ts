import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import movieService from '../services/movieService';
import logger from '../utils/logger';
import { ApiResponse } from '../../shared/types';
import { MovieParameters } from '../types/rendering';

/**
 * Movie Controller
 * Handles HTTP requests related to movie generation
 */
export const movieController = {
  /**
   * Create a new movie for a session
   * POST /api/sessions/:sessionId/movies
   */
  createMovie: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const parameters: MovieParameters = req.body;
      
      const movie = await movieService.createMovie(sessionId, parameters);
      
      const response: ApiResponse = {
        status: 'success',
        data: movie,
      };
      
      res.status(201).json(response);
    } catch (error) {
      logger.error(`Error creating movie: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Get movie status
   * GET /api/sessions/:sessionId/movies/:movieId
   */
  getMovieStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, movieId } = req.params;
      
      const status = movieService.getMovieStatus(sessionId, movieId);
      
      if (!status) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'MOVIE_NOT_FOUND',
            message: 'Movie not found',
          },
        });
      }
      
      const response: ApiResponse = {
        status: 'success',
        data: status,
      };
      
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error getting movie status: ${(error as Error).message}`);
      next(error);
    }
  },
  
  /**
   * Get movie file
   * GET /api/sessions/:sessionId/movies/:movieId/file
   */
  getMovieFile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, movieId } = req.params;
      
      const fileInfo = await movieService.getMovieFile(sessionId, movieId);
      
      if (!fileInfo) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'MOVIE_FILE_NOT_FOUND',
            message: 'Movie file not found or not yet rendered',
          },
        });
      }
      
      // Set headers for file download
      res.setHeader('Content-Type', fileInfo.mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.filename}"`);
      res.setHeader('Content-Length', fileInfo.size);
      
      // Stream the file
      const fileStream = fs.createReadStream(fileInfo.path);
      fileStream.pipe(res);
    } catch (error) {
      logger.error(`Error getting movie file: ${(error as Error).message}`);
      next(error);
    }
  },
};

export default movieController;