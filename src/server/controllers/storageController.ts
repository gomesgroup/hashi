import { Request, Response } from 'express';
import { storageHub } from '../services/storage/StorageHub';
import { logger } from '../utils/logger';

export class StorageController {
  /**
   * Structure endpoints
   */
  public async createStructure(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const structure = await storageHub.structures.createStructure({
        ...req.body,
        userId,
      });

      res.status(201).json(structure);
    } catch (error) {
      logger.error('Failed to create structure:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async getStructure(req: Request, res: Response): Promise<void> {
    try {
      const structureId = req.params.structureId;
      const result = await storageHub.structures.getStructureVersion(structureId);

      res.status(200).json({
        structure: result.version,
        content: result.content.toString(),
      });
    } catch (error) {
      logger.error('Failed to get structure:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async getStructureVersion(req: Request, res: Response): Promise<void> {
    try {
      const structureId = req.params.structureId;
      const versionNumber = parseInt(req.params.versionNumber, 10);
      const result = await storageHub.structures.getStructureVersion(structureId, versionNumber);

      res.status(200).json({
        version: result.version,
        content: result.content.toString(),
      });
    } catch (error) {
      logger.error('Failed to get structure version:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async updateStructure(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const structureId = req.params.structureId;
      const structure = await storageHub.structures.updateStructure({
        ...req.body,
        structureId,
        userId,
      });

      res.status(200).json(structure);
    } catch (error) {
      logger.error('Failed to update structure:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async deleteStructure(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const structureId = req.params.structureId;
      const result = await storageHub.structures.deleteStructure(structureId, userId);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to delete structure:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async compareStructureVersions(req: Request, res: Response): Promise<void> {
    try {
      const structureId = req.params.structureId;
      const version1 = parseInt(req.query.version1 as string, 10);
      const version2 = parseInt(req.query.version2 as string, 10);

      const result = await storageHub.structures.compareVersions(structureId, version1, version2);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Failed to compare structure versions:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Session endpoints
   */
  public async createSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await storageHub.sessions.createSession({
        ...req.body,
        userId,
      });

      res.status(201).json(session);
    } catch (error) {
      logger.error('Failed to create session:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async getSession(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.sessionId;
      const result = await storageHub.sessions.getSessionVersion(sessionId);

      res.status(200).json({
        session: result.version,
        content: result.content.toString(),
      });
    } catch (error) {
      logger.error('Failed to get session:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async getSessionVersion(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.params.sessionId;
      const versionNumber = parseInt(req.params.versionNumber, 10);
      const result = await storageHub.sessions.getSessionVersion(sessionId, versionNumber);

      res.status(200).json({
        version: result.version,
        content: result.content.toString(),
      });
    } catch (error) {
      logger.error('Failed to get session version:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessionId = req.params.sessionId;
      const session = await storageHub.sessions.updateSession({
        ...req.body,
        sessionId,
        userId,
      });

      res.status(200).json(session);
    } catch (error) {
      logger.error('Failed to update session:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sessionId = req.params.sessionId;
      const result = await storageHub.sessions.deleteSession(sessionId, userId);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to delete session:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Project endpoints
   */
  public async createProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const project = await storageHub.projects.createProject({
        ...req.body,
        userId,
      });

      res.status(201).json(project);
    } catch (error) {
      logger.error('Failed to create project:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async getProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId;
      const project = await storageHub.projects.getProjectDetails(projectId, userId);

      res.status(200).json(project);
    } catch (error) {
      logger.error('Failed to get project:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId;
      const project = await storageHub.projects.updateProject({
        ...req.body,
        projectId,
        userId,
      });

      res.status(200).json(project);
    } catch (error) {
      logger.error('Failed to update project:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId;
      const result = await storageHub.projects.deleteProject(projectId, userId);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to delete project:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async addStructureToProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId;
      const structureId = req.params.structureId;
      const result = await storageHub.projects.addStructureToProject(structureId, projectId, userId);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to add structure to project:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async removeStructureFromProject(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = req.params.projectId;
      const structureId = req.params.structureId;
      const result = await storageHub.projects.removeStructureFromProject(structureId, projectId, userId);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to remove structure from project:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Search endpoints
   */
  public async search(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const query = req.query.q as string;
      const type = req.query.type as string;
      const tags = req.query.tags ? (req.query.tags as string).split(',') : [];
      const format = req.query.format as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const results = await storageHub.search.search({
        query,
        userId,
        type: type as any,
        tags,
        format,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        page,
        limit,
      });

      res.status(200).json(results);
    } catch (error) {
      logger.error('Search failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * User preferences endpoints
   */
  public async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const category = req.params.category;
      const preferences = await storageHub.preferences.getUserPreferences(userId, category);

      res.status(200).json(preferences);
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async setUserPreference(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const category = req.params.category;
      const key = req.params.key;
      const { value } = req.body;

      await storageHub.preferences.setUserPreference(userId, category, key, value);

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Failed to set user preference:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async deleteUserPreference(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const category = req.params.category;
      const key = req.params.key;

      const result = await storageHub.preferences.deleteUserPreference(userId, category, key);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to delete user preference:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async resetUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const category = req.params.category;
      const result = await storageHub.preferences.resetUserPreferences(userId, category);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to reset user preferences:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async exportUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await storageHub.preferences.exportUserPreferences(userId);

      res.status(200).json(preferences);
    } catch (error) {
      logger.error('Failed to export user preferences:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async importUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = req.body;
      const result = await storageHub.preferences.importUserPreferences(userId, data);

      res.status(200).json({ success: result });
    } catch (error) {
      logger.error('Failed to import user preferences:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}