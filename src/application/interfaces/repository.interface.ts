/**
 * Repository-related interfaces
 */

/**
 * Repository interface for generic CRUD operations
 * Repository is a generic type that can be used to return any type of data
 * findById: the promise returns a T or null, T because we want to return the type of data that the repository is returning, it 
 * could be a user, a document, a document version, etc. 
 * findMany: the promise returns an array of T, T because we want to return the type of data that the repository is returning, it  
 * could be an array of users, a array of documents, a array of document versions, etc. 
 * create: the promise returns a T, T because we want to return the type of data that the repository is returning, and partial because 
 * we want to be able to create a new entity with only some of the properties
 * update: the promise returns a T or null, T because we want to return the type of data that the repository is returning, and 
 * partial because we want to be able to update an entity with only some of the properties
 */
export interface Repository<T> {
  findById(_id: string): Promise<T | null>;
  findMany(_filters?: Record<string, unknown>): Promise<T[]>;
  create(_data: Partial<T>): Promise<T>;
  update(_id: string, _data: Partial<T>): Promise<T | null>;
  delete(_id: string): Promise<boolean>;
}

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
