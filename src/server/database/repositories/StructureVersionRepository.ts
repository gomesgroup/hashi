import { StructureVersion } from '../entities/StructureVersion';
import { BaseRepository } from './BaseRepository';

export class StructureVersionRepository extends BaseRepository<StructureVersion> {
  constructor() {
    super(StructureVersion);
  }

  async findByStructure(structureId: string): Promise<StructureVersion[]> {
    return this.repository.find({
      where: { structureId },
      order: { versionNumber: 'DESC' },
    });
  }

  async findLatestByStructure(structureId: string): Promise<StructureVersion | null> {
    return this.repository.findOne({
      where: { structureId },
      order: { versionNumber: 'DESC' },
    });
  }

  async getNextVersionNumber(structureId: string): Promise<number> {
    const latest = await this.findLatestByStructure(structureId);
    return latest ? latest.versionNumber + 1 : 1;
  }

  async getVersions(structureId: string, limit?: number): Promise<StructureVersion[]> {
    const query = this.repository.createQueryBuilder('version')
      .where('version.structureId = :structureId', { structureId })
      .orderBy('version.versionNumber', 'DESC');
      
    if (limit) {
      query.take(limit);
    }
    
    return query.getMany();
  }

  async deleteOldVersions(structureId: string, keepLatestCount: number): Promise<boolean> {
    if (keepLatestCount <= 0) return false;
    
    const versions = await this.findByStructure(structureId);
    if (versions.length <= keepLatestCount) return false;
    
    const versionsToDelete = versions.slice(keepLatestCount);
    if (versionsToDelete.length === 0) return false;
    
    const idsToDelete = versionsToDelete.map(v => v.id);
    const result = await this.repository.delete(idsToDelete);
    
    return result.affected ? result.affected > 0 : false;
  }
}