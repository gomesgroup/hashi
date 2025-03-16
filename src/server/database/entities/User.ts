import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Project } from './Project';
import { MolecularStructure } from './MolecularStructure';
import { UserPreferences } from './UserPreferences';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  institution: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ default: 0 })
  storageUsed: number; // in bytes

  @Column({ default: 1073741824 }) // 1GB in bytes
  storageQuota: number;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Project, project => project.user)
  projects: Project[];

  @OneToMany(() => MolecularStructure, structure => structure.user)
  structures: MolecularStructure[];

  @OneToMany(() => UserPreferences, preference => preference.user)
  preferences: UserPreferences[];
}