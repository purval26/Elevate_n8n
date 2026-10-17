/**
 * Database record interfaces representing PostgreSQL tables created in Supabase migrations.
 */

export interface TopicRecord {
  id: string; // UUID
  title: string;
  pillar: string;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

export interface TopicInsert {
  id?: string;
  title: string;
  pillar: string;
  created_at?: string;
  updated_at?: string;
}

export interface TopicUpdate {
  title?: string;
  pillar?: string;
  updated_at?: string;
}

export type PostStatus = 'draft' | 'generated' | 'reviewed' | 'published' | 'archived';

export interface PostRecord {
  id: string; // UUID
  topic_id: string; // UUID FK -> topics.id
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
  tone: string | null;
  slide_count: number;
  status: PostStatus | string;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}

export interface PostInsert {
  id?: string;
  topic_id: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags?: string[];
  tone?: string | null;
  slide_count: number;
  status?: PostStatus | string;
  created_at?: string;
  updated_at?: string;
}

export interface PostUpdate {
  hook?: string;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  tone?: string | null;
  slide_count?: number;
  status?: PostStatus | string;
  updated_at?: string;
}

export interface SlideRecord {
  id: string; // UUID
  post_id: string; // UUID FK -> posts.id
  slide_number: number;
  type: string;
  headline: string;
  body: string;
  visual_suggestion: string;
  created_at: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
}

export interface SlideInsert {
  id?: string;
  post_id: string;
  slide_number: number;
  type: string;
  headline: string;
  body: string;
  visual_suggestion: string;
  created_at?: string;
  updated_at?: string;
}

export interface SourceRecord {
  id: string; // UUID
  post_id: string; // UUID FK -> posts.id
  url: string | null;
  source_text: string;
  created_at: string; // ISO 8601 timestamp
}

export interface SourceInsert {
  id?: string;
  post_id: string;
  url?: string | null;
  source_text: string;
  created_at?: string;
}

export interface PostWithRelations extends PostRecord {
  topic?: TopicRecord;
  slides: SlideRecord[];
  sources: SourceRecord[];
}

export interface PersistedCarouselResult {
  topicId: string;
  postId: string;
  slideIds: string[];
  sourceIds: string[];
}
