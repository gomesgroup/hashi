import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from './User';
import { MolecularStructure } from './MolecularStructure';
import { Tag } from './Tag';
import { ChimeraXSession } from './ChimeraXSession';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: 0 })
  size: number; // in bytes

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.projects, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => MolecularStructure, structure => structure.project)
  structures: MolecularStructure[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'project_tags',
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: Tag[];

  @OneToMany(() => ChimeraXSession, session => session.project)
  sessions: ChimeraXSession[];
}