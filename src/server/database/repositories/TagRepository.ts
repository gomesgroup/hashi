import { Tag } from '../entities/Tag';
import { BaseRepository } from './BaseRepository';

export class TagRepository extends BaseRepository<Tag> {
  constructor() {
    super(Tag);
  }

  async findByUserAndName(userId: string, name: string): Promise<Tag | null> {
    return this.repository.findOne({
      where: { createdById: userId, name },
    });
  }

  async findByUser(userId: string): Promise<Tag[]> {
    return this.repository.find({
      where: { createdById: userId },
      order: { name: 'ASC' },
    });
  }
}