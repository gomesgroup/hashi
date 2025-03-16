import { repositories } from '../../database/repositories';
import { logger } from '../../utils/logger';

export class PreferencesService {
  /**
   * Get all preferences for a user by category
   */
  public async getUserPreferences(userId: string, category: string): Promise<Record<string, any>> {
    try {
      const preferences = await repositories.userPreferences.findByUserAndCategory(userId, category);
      
      // Convert to key-value object
      const result: Record<string, any> = {};
      for (const pref of preferences) {
        result[pref.key] = pref.value;
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to get user preferences for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Set a specific preference for a user
   */
  public async setUserPreference(userId: string, category: string, key: string, value: any): Promise<void> {
    try {
      await repositories.userPreferences.savePreference(userId, category, key, value);
    } catch (error) {
      logger.error(`Failed to set user preference for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a specific preference for a user
   */
  public async deleteUserPreference(userId: string, category: string, key: string): Promise<boolean> {
    try {
      const preference = await repositories.userPreferences.findByUserCategoryAndKey(userId, category, key);
      
      if (!preference) {
        return false;
      }
      
      await repositories.userPreferences.delete(preference.id);
      return true;
    } catch (error) {
      logger.error(`Failed to delete user preference for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset all preferences in a category to defaults
   */
  public async resetUserPreferences(userId: string, category: string): Promise<boolean> {
    try {
      const preferences = await repositories.userPreferences.findByUserAndCategory(userId, category);
      
      for (const preference of preferences) {
        await repositories.userPreferences.delete(preference.id);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to reset user preferences for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Export user preferences as JSON
   */
  public async exportUserPreferences(userId: string): Promise<Record<string, Record<string, any>>> {
    try {
      // Get all preferences for the user
      const preferences = await repositories.userPreferences.findAll({
        where: { userId },
      });
      
      // Organize by category
      const result: Record<string, Record<string, any>> = {};
      
      for (const pref of preferences) {
        if (!result[pref.category]) {
          result[pref.category] = {};
        }
        
        result[pref.category][pref.key] = pref.value;
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to export user preferences for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Import user preferences from JSON
   */
  public async importUserPreferences(userId: string, data: Record<string, Record<string, any>>): Promise<boolean> {
    try {
      // Process each category and key-value pair
      for (const category in data) {
        const categoryData = data[category];
        
        for (const key in categoryData) {
          const value = categoryData[key];
          await this.setUserPreference(userId, category, key, value);
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to import user preferences for ${userId}:`, error);
      throw error;
    }
  }
}