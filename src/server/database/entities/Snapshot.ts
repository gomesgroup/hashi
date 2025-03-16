import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChimeraXSession } from './ChimeraXSession';
import { User } from './User';

@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column()
  imagePath: string;

  @Column({ nullable: true })
  imageFormat: string; // PNG, JPG, etc.

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ default: 0 })
  size: number; // in bytes

  @Column({ type: 'json', nullable: true })
  viewSettings: any; // Camera position, lighting, etc.

  @Column({ type: 'json', nullable: true })
  styleSettings: any; // Molecule styles, colors, etc.

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ChimeraXSession, session => session.snapshots, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: ChimeraXSession;

  @Column()
  sessionId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;
}