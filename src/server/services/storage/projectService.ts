import { repositories } from '../../database/repositories';
import { Project } from '../../database/entities/Project';
import { Tag } from '../../database/entities/Tag';
import { logger } from '../../utils/logger';

export interface CreateProjectParams {
  name: string;
  description?: string;
  userId: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface UpdateProjectParams {
  projectId: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
  isArchived?: boolean;
  tags?: string[];
  userId: string;
}

export class ProjectService {
  /**
   * Create a new project
   */
  public async createProject(params: CreateProjectParams): Promise<Project> {
    const {
      name,
      description,
      userId,
      isPublic = false,
      tags = [],
    } = params;

    try {
      // Create the project in the database
      const project = await repositories.projects.create({
        name,
        description,
        userId,
        isPublic,
      });

      // Add tags if provided
      if (tags.length > 0) {
        await this.addTagsToProject(project.id, userId, tags);
      }

      return project;
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw error;
    }
  }

  /**
   * Update an existing project
   */
  public async updateProject(params: UpdateProjectParams): Promise<Project> {
    const {
      projectId,
      name,
      description,
      isPublic,
      isArchived,
      tags,
      userId,
    } = params;

    // Retrieve the project
    const project = await repositories.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check ownership
    if (project.userId !== userId) {
      throw new Error('You do not have permission to update this project');
    }

    try {
      // Update project information
      let updateData: Partial<Project> = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isArchived !== undefined) updateData.isArchived = isArchived;

      // Update the project
      if (Object.keys(updateData).length > 0) {
        await repositories.projects.update(projectId, updateData);
      }

      // Update tags if provided
      if (tags && tags.length > 0) {
        await this.addTagsToProject(projectId, userId, tags);
      }

      // Return the updated project
      return await repositories.projects.findById(projectId) as Project;
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   * Note: This won't delete associated structures and sessions, just remove their association
   */
  public async deleteProject(projectId: string, userId: string): Promise<boolean> {
    // Retrieve the project
    const project = await repositories.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check ownership
    if (project.userId !== userId) {
      throw new Error('You do not have permission to delete this project');
    }

    try {
      // Get associated structures and sessions to update them
      const structures = await repositories.structures.findByProject(projectId);
      const sessions = await repositories.sessions.findByProject(projectId);

      // Start a transaction for all database operations
      const queryRunner = repositories.projects.repository.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Remove project association from structures and sessions
        for (const structure of structures) {
          await repositories.structures.update(structure.id, { projectId: null });
        }

        for (const session of sessions) {
          await repositories.sessions.update(session.id, { projectId: null });
        }

        // Delete the project
        await repositories.projects.delete(projectId);

        await queryRunner.commitTransaction();
        return true;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw error;
    }
  }

  /**
   * Get a project with details
   * Includes structures, sessions, and tags
   */
  public async getProjectDetails(projectId: string, userId: string): Promise<any> {
    // Retrieve the project
    const project = await repositories.projects.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check access (owner or public project)
    if (project.userId !== userId && !project.isPublic) {
      throw new Error('You do not have permission to view this project');
    }

    // Get related data
    const structures = await repositories.structures.findByProject(projectId);
    const sessions = await repositories.sessions.findByProject(projectId);
    const projectWithTags = await repositories.projects.findByIdWithTags(projectId);

    return {
      ...project,
      structures,
      sessions,
      tags: projectWithTags?.tags || [],
    };
  }

  /**
   * Add a structure to a project
   */
  public async addStructureToProject(structureId: string, projectId: string, userId: string): Promise<boolean> {
    // Retrieve the structure and project
    const structure = await repositories.structures.findById(structureId);
    const project = await repositories.projects.findById(projectId);

    if (!structure) {
      throw new Error(`Structure ${structureId} not found`);
    }

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check permissions
    if (structure.userId !== userId) {
      throw new Error('You do not have permission to modify this structure');
    }

    if (project.userId !== userId) {
      throw new Error('You do not have permission to modify this project');
    }

    try {
      // Update the structure with the project ID
      await repositories.structures.update(structureId, { projectId });

      // Update project size
      await repositories.projects.updateSize(projectId, structure.size);

      return true;
    } catch (error) {
      logger.error('Failed to add structure to project:', error);
      throw error;
    }
  }

  /**
   * Remove a structure from a project
   */
  public async removeStructureFromProject(structureId: string, projectId: string, userId: string): Promise<boolean> {
    // Retrieve the structure
    const structure = await repositories.structures.findById(structureId);

    if (!structure) {
      throw new Error(`Structure ${structureId} not found`);
    }

    // Check permissions and project association
    if (structure.userId !== userId) {
      throw new Error('You do not have permission to modify this structure');
    }

    if (structure.projectId !== projectId) {
      throw new Error(`Structure ${structureId} is not associated with project ${projectId}`);
    }

    try {
      // Update the structure to remove project association
      await repositories.structures.update(structureId, { projectId: null });

      // Update project size
      await repositories.projects.updateSize(projectId, -structure.size);

      return true;
    } catch (error) {
      logger.error('Failed to remove structure from project:', error);
      throw error;
    }
  }

  /**
   * Add a session to a project
   */
  public async addSessionToProject(sessionId: string, projectId: string, userId: string): Promise<boolean> {
    // Retrieve the session and project
    const session = await repositories.sessions.findById(sessionId);
    const project = await repositories.projects.findById(projectId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check permissions
    if (session.userId !== userId) {
      throw new Error('You do not have permission to modify this session');
    }

    if (project.userId !== userId) {
      throw new Error('You do not have permission to modify this project');
    }

    try {
      // Update the session with the project ID
      await repositories.sessions.update(sessionId, { projectId });

      // Update project size
      await repositories.projects.updateSize(projectId, session.size);

      return true;
    } catch (error) {
      logger.error('Failed to add session to project:', error);
      throw error;
    }
  }

  /**
   * Remove a session from a project
   */
  public async removeSessionFromProject(sessionId: string, projectId: string, userId: string): Promise<boolean> {
    // Retrieve the session
    const session = await repositories.sessions.findById(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check permissions and project association
    if (session.userId !== userId) {
      throw new Error('You do not have permission to modify this session');
    }

    if (session.projectId !== projectId) {
      throw new Error(`Session ${sessionId} is not associated with project ${projectId}`);
    }

    try {
      // Update the session to remove project association
      await repositories.sessions.update(sessionId, { projectId: null });

      // Update project size
      await repositories.projects.updateSize(projectId, -session.size);

      return true;
    } catch (error) {
      logger.error('Failed to remove session from project:', error);
      throw error;
    }
  }

  /**
   * Add tags to a project
   */
  private async addTagsToProject(projectId: string, userId: string, tagNames: string[]): Promise<void> {
    // Get or create tags
    const tags: Tag[] = [];
    for (const name of tagNames) {
      // Try to find existing tag
      let tag = await repositories.tags.findByUserAndName(userId, name);
      
      // Create tag if it doesn't exist
      if (!tag) {
        tag = await repositories.tags.create({
          name,
          createdById: userId,
        });
      }
      
      tags.push(tag);
    }
    
    // Get the project with existing tags
    const project = await repositories.projects.findByIdWithTags(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    // Update the tags
    project.tags = tags;
    await repositories.projects.repository.save(project);
  }
}