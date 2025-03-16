import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChimeraXSession } from './ChimeraXSession';
import { User } from './User';

@Entity('session_versions')
export class SessionVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  versionNumber: number;

  @Column({ nullable: true })
  commitMessage: string;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column()
  filePath: string; // Path to the ChimeraX session file

  @Column({ default: 0 })
  size: number; // in bytes

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChimeraXSession, session => session.versions, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: ChimeraXSession;

  @Column()
  sessionId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  // Serialized data about structures, views, etc.
  @Column({ type: 'json', nullable: true })
  metadata: any;
}