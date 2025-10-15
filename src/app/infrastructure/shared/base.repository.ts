/**
 * BaseRepository
 * Generic reusable repository for Drizzle ORM-based persistence
 * Handles common CRUD and pagination operations
 */

import { sql } from "drizzle-orm";
import { PaginationParams, PaginatedResponse } from "@/app/domain/shared/api.interface";
import { DatabaseError } from "@/app/domain/shared/errors";
import { calculatePaginationMeta } from "./db.utils";

export abstract class BaseRepository<T> {
  protected db: any;
  protected table: any;

  constructor(db: any, table: any) {
    this.db = db;
    this.table = table;
  }

  protected async findById(id: string): Promise<T | null> {
    try {
      const [row] = await this.db.select().from(this.table).where(sql`${this.table.id} = ${id}`).limit(1);
      return row ?? null;
    } catch (error) {
      throw new DatabaseError({ message: "Failed to find by ID", cause: error });
    }
  }

  protected async exists(id: string): Promise<boolean> {
    const [result] = await this.db.select({ id: this.table.id }).from(this.table).where(sql`${this.table.id} = ${id}`).limit(1);
    return !!result;
  }

  protected async count(where?: any): Promise<number> {
    const [result] = where
      ? await this.db.select({ count: sql`count(*)` }).from(this.table).where(where)
      : await this.db.select({ count: sql`count(*)` }).from(this.table);
    return Number(result?.count ?? 0);
  }

  protected async findMany(where?: any): Promise<T[]> {
    try {
      return where ? await this.db.select().from(this.table).where(where) : await this.db.select().from(this.table);
    } catch (error) {
      throw new DatabaseError({ message: "Failed to findMany", cause: error });
    }
  }

  protected async findManyPaginated(
    pagination: PaginationParams,
    where?: any,
    orderBy?: any
  ): Promise<PaginatedResponse<T>> {
    try {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      const dataQuery = this.db.select().from(this.table);
      const countQuery = this.db.select({ count: sql`count(*)` }).from(this.table);

      const [data, countResult] = await Promise.all([
        where ? dataQuery.where(where).limit(limit).offset(offset).orderBy(orderBy) : dataQuery.limit(limit).offset(offset).orderBy(orderBy),
        where ? countQuery.where(where) : countQuery
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      return {
        data,
        pagination: calculatePaginationMeta(page, limit, total)
      };
    } catch (error) {
      throw new DatabaseError({ message: "Failed to paginate data", cause: error });
    }
  }

  protected async deleteById(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(this.table).where(sql`${this.table.id} = ${id}`);
      return result.length > 0;
    } catch (error) {
      throw new DatabaseError({ message: "Failed to delete record", cause: error });
    }
  }
}
