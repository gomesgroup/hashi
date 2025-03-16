import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Project } from './Project';
import { Snapshot } from './Snapshot';
import { SessionVersion } from './SessionVersion';

@Entity('chimerax_sessions')
export class ChimeraXSession {
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

  @Column({ nullable: true })
  thumbnailPath: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastAccessedAt: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Project, project => project.sessions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ nullable: true })
  projectId: string;

  @OneToMany(() => Snapshot, snapshot => snapshot.session)
  snapshots: Snapshot[];

  @OneToMany(() => SessionVersion, version => version.session)
  versions: SessionVersion[];
}