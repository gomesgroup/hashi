import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { MolecularStructure } from './MolecularStructure';
import { User } from './User';

@Entity('structure_versions')
export class StructureVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  versionNumber: number;

  @Column({ nullable: true })
  commitMessage: string;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column()
  filePath: string; // Path to the actual structure file

  @Column({ default: 0 })
  size: number; // in bytes

  @Column({ nullable: true })
  format: string; // pdb, mol2, xyz, etc.

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => MolecularStructure, structure => structure.versions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'structureId' })
  structure: MolecularStructure;

  @Column()
  structureId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  // Additional metadata
  @Column({ type: 'json', nullable: true })
  metadata: any; // JSON object with structure-specific metadata
}