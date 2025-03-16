import { UserRepository } from './UserRepository';
import { ProjectRepository } from './ProjectRepository';
import { MolecularStructureRepository } from './MolecularStructureRepository';
import { StructureVersionRepository } from './StructureVersionRepository';
import { ChimeraXSessionRepository } from './ChimeraXSessionRepository';
import { SessionVersionRepository } from './SessionVersionRepository';
import { TagRepository } from './TagRepository';
import { SnapshotRepository } from './SnapshotRepository';
import { UserPreferencesRepository } from './UserPreferencesRepository';

export const repositories = {
  users: new UserRepository(),
  projects: new ProjectRepository(),
  structures: new MolecularStructureRepository(),
  structureVersions: new StructureVersionRepository(),
  sessions: new ChimeraXSessionRepository(),
  sessionVersions: new SessionVersionRepository(),
  tags: new TagRepository(),
  snapshots: new SnapshotRepository(),
  userPreferences: new UserPreferencesRepository(),
};

export {
  UserRepository,
  ProjectRepository,
  MolecularStructureRepository,
  StructureVersionRepository,
  ChimeraXSessionRepository,
  SessionVersionRepository,
  TagRepository,
  SnapshotRepository,
  UserPreferencesRepository,
};