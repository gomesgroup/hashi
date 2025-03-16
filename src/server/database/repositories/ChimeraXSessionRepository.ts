import { ChimeraXSession } from '../entities/ChimeraXSession';
import { BaseRepository } from './BaseRepository';
import { FindOptionsRelations } from 'typeorm';

export class ChimeraXSessionRepository extends BaseRepository<ChimeraXSession> {
  constructor() {
    super(ChimeraXSession);
  }

  async findByUser(userId: string, relations?: FindOptionsRelations<ChimeraXSession>): Promise<ChimeraXSession[]> {
    return this.repository.find({
      where: { userId },
      relations,
      order: { updatedAt: 'DESC' },
    });
  }

  async findByProject(projectId: string, relations?: FindOptionsRelations<ChimeraXSession>): Promise<ChimeraXSession[]> {
    return this.repository.find({
      where: { projectId },
      relations,
      order: { updatedAt: 'DESC' },
    });
  }

  async findByIdWithVersions(sessionId: string): Promise<ChimeraXSession | null> {
    return this.repository.findOne({
      where: { id: sessionId },
      relations: { versions: true },
    });
  }

  async findByIdWithSnapshots(sessionId: string): Promise<ChimeraXSession | null> {
    return this.repository.findOne({
      where: { id: sessionId },
      relations: { snapshots: true },
    });
  }

  async updateLastAccessed(sessionId: string): Promise<void> {
    await this.repository.update(sessionId, { lastAccessedAt: new Date() });
  }

  async updateSize(sessionId: string, newSize: number): Promise<void> {
    await this.repository.increment({ id: sessionId }, 'size', newSize);
  }

  async searchSessions(userId: string, query: string): Promise<ChimeraXSession[]> {
    return this.repository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('(session.name LIKE :query OR session.description LIKE :query)', {
        query: `%${query}%`,
      })
      .orderBy('session.updatedAt', 'DESC')
      .getMany();
  }
}