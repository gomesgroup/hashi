import { Snapshot } from '../entities/Snapshot';
import { BaseRepository } from './BaseRepository';

export class SnapshotRepository extends BaseRepository<Snapshot> {
  constructor() {
    super(Snapshot);
  }

  async findBySession(sessionId: string): Promise<Snapshot[]> {
    return this.repository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Snapshot[]> {
    return this.repository.find({
      where: { createdById: userId },
      order: { createdAt: 'DESC' },
    });
  }
}