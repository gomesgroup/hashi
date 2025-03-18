import { repositories } from '../../database/repositories';
import logger from '../../utils/logger';

export interface SearchParams {
  query: string;
  userId: string;
  type?: 'structure' | 'session' | 'project' | 'all';
  tags?: string[];
  format?: string;
  sortBy?: 'name' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResults {
  structures?: any[];
  sessions?: any[];
  projects?: any[];
  total: {
    structures?: number;
    sessions?: number;
    projects?: number;
    all?: number;
  };
  page?: number;
  limit?: number;
  totalPages?: number;
}

export class SearchService {
  /**
   * Search for structures, sessions, and projects
   */
  public async search(params: SearchParams): Promise<SearchResults> {
    const {
      query,
      userId,
      type = 'all',
      tags = [],
      format,
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = params;

    const results: SearchResults = {
      total: {},
    };

    try {
      // Calculate pagination
      const offset = (page - 1) * limit;

      // Search for structures
      if (type === 'all' || type === 'structure') {
        const structures = await this.searchStructures(query, userId, tags, format, sortBy, sortOrder, offset, limit);
        results.structures = structures;
        results.total.structures = await this.countStructureResults(query, userId, tags, format);
      }

      // Search for sessions
      if (type === 'all' || type === 'session') {
        const sessions = await this.searchSessions(query, userId, sortBy, sortOrder, offset, limit);
        results.sessions = sessions;
        results.total.sessions = await this.countSessionResults(query, userId);
      }

      // Search for projects
      if (type === 'all' || type === 'project') {
        const projects = await this.searchProjects(query, userId, tags, sortBy, sortOrder, offset, limit);
        results.projects = projects;
        results.total.projects = await this.countProjectResults(query, userId, tags);
      }

      // Calculate total count for all types
      results.total.all = (results.total.structures || 0) + (results.total.sessions || 0) + (results.total.projects || 0);

      // Add pagination metadata
      results.page = page;
      results.limit = limit;
      results.totalPages = Math.ceil(results.total.all / limit);

      return results;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Search for structures
   */
  private async searchStructures(
    query: string,
    userId: string,
    tags: string[],
    format?: string,
    sortBy: string = 'date',
    sortOrder: string = 'desc',
    offset: number = 0,
    limit: number = 20
  ): Promise<any[]> {
    let queryBuilder = repositories.structures.repository
      .createQueryBuilder('structure')
      .leftJoinAndSelect('structure.tags', 'tag')
      .where('structure.userId = :userId', { userId });

    // Add query filtering
    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(structure.name LIKE :query OR structure.description LIKE :query OR structure.externalId LIKE :query OR tag.name LIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Add tag filtering
    if (tags.length > 0) {
      queryBuilder = queryBuilder
        .innerJoin('structure.tags', 'filterTag')
        .andWhere('filterTag.name IN (:...tags)', { tags });
    }

    // Add format filtering
    if (format) {
      queryBuilder = queryBuilder.andWhere('structure.format = :format', { format });
    }

    // Add sorting
    switch (sortBy) {
      case 'name':
        queryBuilder = queryBuilder.orderBy('structure.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'size':
        queryBuilder = queryBuilder.orderBy('structure.size', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'date':
      default:
        queryBuilder = queryBuilder.orderBy('structure.updatedAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
    }

    // Add pagination
    queryBuilder = queryBuilder.skip(offset).take(limit);

    return queryBuilder.getMany();
  }

  /**
   * Count the number of structure results
   */
  private async countStructureResults(
    query: string,
    userId: string,
    tags: string[],
    format?: string
  ): Promise<number> {
    let queryBuilder = repositories.structures.repository
      .createQueryBuilder('structure')
      .leftJoin('structure.tags', 'tag')
      .where('structure.userId = :userId', { userId });

    // Add query filtering
    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(structure.name LIKE :query OR structure.description LIKE :query OR structure.externalId LIKE :query OR tag.name LIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Add tag filtering
    if (tags.length > 0) {
      queryBuilder = queryBuilder
        .innerJoin('structure.tags', 'filterTag')
        .andWhere('filterTag.name IN (:...tags)', { tags });
    }

    // Add format filtering
    if (format) {
      queryBuilder = queryBuilder.andWhere('structure.format = :format', { format });
    }

    return queryBuilder.getCount();
  }

  /**
   * Search for sessions
   */
  private async searchSessions(
    query: string,
    userId: string,
    sortBy: string = 'date',
    sortOrder: string = 'desc',
    offset: number = 0,
    limit: number = 20
  ): Promise<any[]> {
    let queryBuilder = repositories.sessions.repository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId });

    // Add query filtering
    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(session.name LIKE :query OR session.description LIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Add sorting
    switch (sortBy) {
      case 'name':
        queryBuilder = queryBuilder.orderBy('session.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'size':
        queryBuilder = queryBuilder.orderBy('session.size', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'date':
      default:
        queryBuilder = queryBuilder.orderBy('session.updatedAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
    }

    // Add pagination
    queryBuilder = queryBuilder.skip(offset).take(limit);

    return queryBuilder.getMany();
  }

  /**
   * Count the number of session results
   */
  private async countSessionResults(query: string, userId: string): Promise<number> {
    let queryBuilder = repositories.sessions.repository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId });

    // Add query filtering
    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(session.name LIKE :query OR session.description LIKE :query)',
        { query: `%${query}%` }
      );
    }

    return queryBuilder.getCount();
  }

  /**
   * Search for projects
   */
  private async searchProjects(
    query: string,
    userId: string,
    tags: string[],
    sortBy: string = 'date',
    sortOrder: string = 'desc',
    offset: number = 0,
    limit: number = 20
  ): Promise<any[]> {
    let queryBuilder = repositories.projects.repository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.tags', 'tag')
      .where('project.userId = :userId', { userId });

    // Add query filtering
    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(project.name LIKE :query OR project.description LIKE :query OR tag.name LIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Add tag filtering
    if (tags.length > 0) {
      queryBuilder = queryBuilder
        .innerJoin('project.tags', 'filterTag')
        .andWhere('filterTag.name IN (:...tags)', { tags });
    }

    // Add sorting
    switch (sortBy) {
      case 'name':
        queryBuilder = queryBuilder.orderBy('project.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'size':
        queryBuilder = queryBuilder.orderBy('project.size', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'date':
      default:
        queryBuilder = queryBuilder.orderBy('project.updatedAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
    }

    // Add pagination
    queryBuilder = queryBuilder.skip(offset).take(limit);

    return queryBuilder.getMany();
  }

  /**
   * Count the number of project results
   */
  private async countProjectResults(
    query: string,
    userId: string,
    tags: string[]
  ): Promise<number> {
    let queryBuilder = repositories.projects.repository
      .createQueryBuilder('project')
      .leftJoin('project.tags', 'tag')
      .where('project.userId = :userId', { userId });

    // Add query filtering
    if (query) {
      queryBuilder = queryBuilder.andWhere(
        '(project.name LIKE :query OR project.description LIKE :query OR tag.name LIKE :query)',
        { query: `%${query}%` }
      );
    }

    // Add tag filtering
    if (tags.length > 0) {
      queryBuilder = queryBuilder
        .innerJoin('project.tags', 'filterTag')
        .andWhere('filterTag.name IN (:...tags)', { tags });
    }

    return queryBuilder.getCount();
  }
}