-- Migration: Create ElevateWeb Content Engine Tables
-- Idempotent DDL for topics, posts, slides, sources

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Topics Table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    pillar TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    hook TEXT NOT NULL,
    caption TEXT NOT NULL,
    cta TEXT NOT NULL,
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    tone TEXT,
    slide_count INTEGER NOT NULL CHECK (slide_count >= 5 AND slide_count <= 8),
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Slides Table
CREATE TABLE IF NOT EXISTS slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL CHECK (slide_number >= 1 AND slide_number <= 8),
    type TEXT NOT NULL,
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    visual_suggestion TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_slide_number UNIQUE (post_id, slide_number)
);

-- 4. Sources Table
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    url TEXT,
    source_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_posts_topic_id ON posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_slides_post_id ON slides(post_id);
CREATE INDEX IF NOT EXISTS idx_sources_post_id ON sources(post_id);
