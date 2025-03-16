import { Repository, FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm';
import { AppDataSource } from '..';

export class BaseRepository<T> {
  protected repository: Repository<T>;

  constructor(entityClass: new () => T) {
    this.repository = AppDataSource.getRepository(entityClass);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOneBy({ id } as unknown as FindOptionsWhere<T>);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = this.repository.create(data as any);
    await this.repository.save(entity as any);
    return entity;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    await this.repository.update(id, data as any);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }
}