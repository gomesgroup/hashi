import { SessionVersion } from '../entities/SessionVersion';
import { BaseRepository } from './BaseRepository';

export class SessionVersionRepository extends BaseRepository<SessionVersion> {
  constructor() {
    super(SessionVersion);
  }

  async findBySession(sessionId: string): Promise<SessionVersion[]> {
    return this.repository.find({
      where: { sessionId },
      order: { versionNumber: 'DESC' },
    });
  }

  async findLatestBySession(sessionId: string): Promise<SessionVersion | null> {
    return this.repository.findOne({
      where: { sessionId },
      order: { versionNumber: 'DESC' },
    });
  }

  async getNextVersionNumber(sessionId: string): Promise<number> {
    const latest = await this.findLatestBySession(sessionId);
    return latest ? latest.versionNumber + 1 : 1;
  }

  async getVersions(sessionId: string, limit?: number): Promise<SessionVersion[]> {
    const query = this.repository.createQueryBuilder('version')
      .where('version.sessionId = :sessionId', { sessionId })
      .orderBy('version.versionNumber', 'DESC');
      
    if (limit) {
      query.take(limit);
    }
    
    return query.getMany();
  }

  async deleteOldVersions(sessionId: string, keepLatestCount: number): Promise<boolean> {
    if (keepLatestCount <= 0) return false;
    
    const versions = await this.findBySession(sessionId);
    if (versions.length <= keepLatestCount) return false;
    
    const versionsToDelete = versions.slice(keepLatestCount);
    if (versionsToDelete.length === 0) return false;
    
    const idsToDelete = versionsToDelete.map(v => v.id);
    const result = await this.repository.delete(idsToDelete);
    
    return result.affected ? result.affected > 0 : false;
  }
}