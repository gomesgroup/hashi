import { Project } from '../entities/Project';
import { BaseRepository } from './BaseRepository';
import { FindOptionsRelations } from 'typeorm';

export class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super(Project);
  }

  async findByUser(userId: string, relations?: FindOptionsRelations<Project>): Promise<Project[]> {
    return this.repository.find({
      where: { userId },
      relations,
      order: { updatedAt: 'DESC' },
    });
  }

  async findByUserAndId(userId: string, projectId: string, relations?: FindOptionsRelations<Project>): Promise<Project | null> {
    return this.repository.findOne({
      where: { userId, id: projectId },
      relations,
    });
  }

  async findByIdWithTags(projectId: string): Promise<Project | null> {
    return this.repository.findOne({
      where: { id: projectId },
      relations: { tags: true },
    });
  }

  async findByIdWithStructures(projectId: string): Promise<Project | null> {
    return this.repository.findOne({
      where: { id: projectId },
      relations: { structures: true },
    });
  }

  async findByIdWithSessions(projectId: string): Promise<Project | null> {
    return this.repository.findOne({
      where: { id: projectId },
      relations: { sessions: true },
    });
  }

  async searchProjects(userId: string, query: string): Promise<Project[]> {
    return this.repository
      .createQueryBuilder('project')
      .where('project.userId = :userId', { userId })
      .andWhere('(project.name LIKE :query OR project.description LIKE :query)', {
        query: `%${query}%`,
      })
      .orderBy('project.updatedAt', 'DESC')
      .getMany();
  }

  async updateSize(projectId: string, newSize: number): Promise<void> {
    await this.repository.increment({ id: projectId }, 'size', newSize);
  }
}