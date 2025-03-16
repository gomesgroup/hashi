import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from './User';
import { Project } from './Project';
import { Tag } from './Tag';
import { StructureVersion } from './StructureVersion';

@Entity('molecular_structures')
export class MolecularStructure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  format: string; // pdb, mol2, xyz, etc.

  @Column({ nullable: true })
  source: string; // Where the structure came from (PDB, user-uploaded, etc.)

  @Column({ nullable: true })
  externalId: string; // Reference ID in external database (PDB ID, etc.)

  @Column({ default: false })
  isPublic: boolean;

  @Column({ nullable: true })
  thumbnailPath: string;

  @Column({ default: 0 })
  size: number; // in bytes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.structures, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Project, project => project.structures, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @OneToMany(() => StructureVersion, version => version.structure)
  versions: StructureVersion[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'structure_tags',
    joinColumn: { name: 'structureId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: Tag[];
}