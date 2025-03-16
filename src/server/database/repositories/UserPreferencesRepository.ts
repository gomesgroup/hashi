import { UserPreferences } from '../entities/UserPreferences';
import { BaseRepository } from './BaseRepository';

export class UserPreferencesRepository extends BaseRepository<UserPreferences> {
  constructor() {
    super(UserPreferences);
  }

  async findByUserAndCategory(userId: string, category: string): Promise<UserPreferences[]> {
    return this.repository.find({
      where: { userId, category },
    });
  }

  async findByUserCategoryAndKey(userId: string, category: string, key: string): Promise<UserPreferences | null> {
    return this.repository.findOne({
      where: { userId, category, key },
    });
  }

  async savePreference(userId: string, category: string, key: string, value: any): Promise<UserPreferences> {
    const existing = await this.findByUserCategoryAndKey(userId, category, key);
    
    if (existing) {
      existing.value = value;
      return this.repository.save(existing);
    } else {
      const newPreference = this.repository.create({
        userId,
        category,
        key,
        value,
      });
      return this.repository.save(newPreference);
    }
  }
}