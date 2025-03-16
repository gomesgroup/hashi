import { User } from '../entities/User';
import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      select: [
        'id',
        'username',
        'email',
        'password',
        'isAdmin',
        'isActive',
        'role',
        'lastLoginAt',
      ],
    });
  }

  async updateStorageUsed(userId: string, newSize: number): Promise<void> {
    await this.repository.increment({ id: userId }, 'storageUsed', newSize);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update(userId, { lastLoginAt: new Date() });
  }
}