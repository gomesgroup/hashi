import { MolecularStructure } from '../entities/MolecularStructure';
import { BaseRepository } from './BaseRepository';
import { FindOptionsRelations } from 'typeorm';

export class MolecularStructureRepository extends BaseRepository<MolecularStructure> {
  constructor() {
    super(MolecularStructure);
  }

  async findByUser(userId: string, relations?: FindOptionsRelations<MolecularStructure>): Promise<MolecularStructure[]> {
    return this.repository.find({
      where: { userId },
      relations,
      order: { updatedAt: 'DESC' },
    });
  }

  async findByProject(projectId: string, relations?: FindOptionsRelations<MolecularStructure>): Promise<MolecularStructure[]> {
    return this.repository.find({
      where: { projectId },
      relations,
      order: { updatedAt: 'DESC' },
    });
  }

  async findByIdWithVersions(structureId: string): Promise<MolecularStructure | null> {
    return this.repository.findOne({
      where: { id: structureId },
      relations: { versions: true },
    });
  }

  async findByIdWithTags(structureId: string): Promise<MolecularStructure | null> {
    return this.repository.findOne({
      where: { id: structureId },
      relations: { tags: true },
    });
  }

  async findByExternalId(externalId: string): Promise<MolecularStructure | null> {
    return this.repository.findOne({
      where: { externalId },
    });
  }

  async searchStructures(userId: string, query: string): Promise<MolecularStructure[]> {
    return this.repository
      .createQueryBuilder('structure')
      .leftJoinAndSelect('structure.tags', 'tag')
      .where('structure.userId = :userId', { userId })
      .andWhere(
        '(structure.name LIKE :query OR structure.description LIKE :query OR structure.externalId LIKE :query OR tag.name LIKE :query)',
        { query: `%${query}%` }
      )
      .orderBy('structure.updatedAt', 'DESC')
      .getMany();
  }

  async updateSize(structureId: string, newSize: number): Promise<void> {
    await this.repository.increment({ id: structureId }, 'size', newSize);
  }
}