import { StorageService } from '.';
import { StructureStorageService } from './structureService';
import { SessionStorageService } from './sessionService';
import { ProjectService } from './projectService';
import { SearchService } from './searchService';
import { PreferencesService } from './preferencesService';

/**
 * StorageHub provides a single access point to all storage-related services
 */
export class StorageHub {
  public storage: StorageService;
  public structures: StructureStorageService;
  public sessions: SessionStorageService;
  public projects: ProjectService;
  public search: SearchService;
  public preferences: PreferencesService;

  constructor() {
    this.storage = new StorageService();
    this.structures = new StructureStorageService();
    this.sessions = new SessionStorageService();
    this.projects = new ProjectService();
    this.search = new SearchService();
    this.preferences = new PreferencesService();
  }
}

// Export a singleton instance
export const storageHub = new StorageHub();