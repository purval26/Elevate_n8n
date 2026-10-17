/**
 * In-memory Mock Supabase client for ElevateWeb Content Engine E2E testing.
 * Implements relational tables (topics, posts, slides, sources) with cascading deletion and failure simulation.
 */

import { randomUUID } from 'node:crypto';

export type MockDbFailureMode =
  | 'none'
  | 'fail_topics'
  | 'fail_posts'
  | 'fail_slides'
  | 'fail_sources'
  | 'fail_connection';

export interface MockSupabaseOptions {
  failureMode?: MockDbFailureMode;
}

export class MockSupabaseClient {
  public failureMode: MockDbFailureMode;
  public topics: Map<string, any> = new Map();
  public posts: Map<string, any> = new Map();
  public slides: Map<string, any> = new Map();
  public sources: Map<string, any> = new Map();
  public calls: Array<{ table: string; action: string; payload?: any; filter?: any }> = [];

  constructor(options: MockSupabaseOptions = {}) {
    this.failureMode = options.failureMode ?? 'none';
  }

  public setFailureMode(mode: MockDbFailureMode) {
    this.failureMode = mode;
  }

  public reset() {
    this.failureMode = 'none';
    this.topics.clear();
    this.posts.clear();
    this.slides.clear();
    this.sources.clear();
    this.calls = [];
  }

  public from(tableName: string) {
    return new MockQueryBuilder(this, tableName);
  }
}

class MockQueryBuilder {
  private client: MockSupabaseClient;
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: Array<{ column: string; value: any }> = [];
  private isSingle = false;

  constructor(client: MockSupabaseClient, tableName: string) {
    this.client = client;
    this.tableName = tableName;
  }

  public insert(values: any) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  public select(_columns?: string) {
    // Keeps current action or transitions to select
    return this;
  }

  public delete() {
    this.action = 'delete';
    return this;
  }

  public eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  public single() {
    this.isSingle = true;
    return this;
  }

  public then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: any; error: any }> {
    this.client.calls.push({
      table: this.tableName,
      action: this.action,
      payload: this.payload,
      filter: this.filters,
    });

    if (this.client.failureMode === 'fail_connection') {
      return {
        data: null,
        error: {
          code: 'PGRST000',
          message: 'Connection to Supabase database timed out or network is unreachable',
          details: null,
          hint: null,
        },
      };
    }

    if (this.client.failureMode === `fail_${this.tableName}`) {
      return {
        data: null,
        error: {
          code: '23505',
          message: `Database constraint violation on table ${this.tableName}`,
          details: `Simulated error for table ${this.tableName}`,
          hint: null,
        },
      };
    }

    const now = new Date().toISOString();

    if (this.action === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const insertedList: any[] = [];

      for (const item of items) {
        const id = item.id || randomUUID();
        const record = {
          ...item,
          id,
          created_at: item.created_at || now,
          updated_at: item.updated_at || now,
        };

        if (this.tableName === 'topics') {
          this.client.topics.set(id, record);
        } else if (this.tableName === 'posts') {
          this.client.posts.set(id, record);
        } else if (this.tableName === 'slides') {
          this.client.slides.set(id, record);
        } else if (this.tableName === 'sources') {
          this.client.sources.set(id, record);
        }
        insertedList.push(record);
      }

      const returnData = this.isSingle || !Array.isArray(this.payload) ? insertedList[0] : insertedList;
      return { data: returnData, error: null };
    }

    if (this.action === 'delete') {
      const deletedList: any[] = [];
      const tableMap =
        this.tableName === 'topics'
          ? this.client.topics
          : this.tableName === 'posts'
            ? this.client.posts
            : this.tableName === 'slides'
              ? this.client.slides
              : this.client.sources;

      for (const [id, record] of Array.from(tableMap.entries())) {
        const matches = this.filters.every((f) => record[f.column] === f.value);
        if (matches) {
          tableMap.delete(id);
          deletedList.push(record);

          // Simulate ON DELETE CASCADE
          if (this.tableName === 'posts') {
            for (const [sId, sRecord] of Array.from(this.client.slides.entries())) {
              if (sRecord.post_id === id) {
                this.client.slides.delete(sId);
              }
            }
            for (const [srcId, srcRecord] of Array.from(this.client.sources.entries())) {
              if (srcRecord.post_id === id) {
                this.client.sources.delete(srcId);
              }
            }
          }
        }
      }

      return { data: deletedList, error: null };
    }

    // Default select
    const tableMap =
      this.tableName === 'topics'
        ? this.client.topics
        : this.tableName === 'posts'
          ? this.client.posts
          : this.tableName === 'slides'
            ? this.client.slides
            : this.client.sources;

    const matched = Array.from(tableMap.values()).filter((record) =>
      this.filters.every((f) => record[f.column] === f.value),
    );

    const returnData = this.isSingle ? matched[0] || null : matched;
    return { data: returnData, error: null };
  }
}

export function createMockSupabase(options: MockSupabaseOptions = {}): MockSupabaseClient {
  return new MockSupabaseClient(options);
}
