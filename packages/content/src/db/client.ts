/**
 * Supabase Client Factory for ElevateWeb Content Engine.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  client?: SupabaseClient | unknown;
  supabase?: SupabaseClient | unknown;
  supabaseClient?: SupabaseClient | unknown;
  auth?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Creates or retrieves a Supabase client instance.
 * Accepts an existing client instance, custom options, or pulls
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * Handles missing credentials gracefully when an existing or mock client is provided.
 */
export function createSupabaseClient(
  options?: SupabaseClientOptions | SupabaseClient | unknown,
): SupabaseClient {
  // If options itself is an existing client instance or mock with .from()
  if (options && typeof options === 'object') {
    const obj = options as Record<string, unknown>;
    if (obj.client) {
      return obj.client as SupabaseClient;
    }
    if (obj.supabase) {
      return obj.supabase as SupabaseClient;
    }
    if (obj.supabaseClient) {
      return obj.supabaseClient as SupabaseClient;
    }
    if (typeof obj.from === 'function') {
      return options as SupabaseClient;
    }
  }

  const opts = (options && typeof options === 'object' ? options : {}) as SupabaseClientOptions;
  const supabaseUrl = opts.supabaseUrl ?? process.env.SUPABASE_URL;
  const supabaseKey = opts.supabaseKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  const resolvedUrl = supabaseUrl || 'https://placeholder.supabase.co';
  const resolvedKey = supabaseKey || 'placeholder-service-role-key';

  return createClient(resolvedUrl, resolvedKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const getSupabaseClient = createSupabaseClient;
