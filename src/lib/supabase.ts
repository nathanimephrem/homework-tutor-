import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
  lastTested?: number;
}

const STORAGE_KEY = 'homework_tutor_supabase_config';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        connected: parsed.connected ?? (!!envUrl && !!envKey),
        lastTested: parsed.lastTested,
      };
    }
  } catch (e) {
    console.warn('Failed to parse stored Supabase config:', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    connected: !!envUrl && !!envKey,
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(customConfig?: { url: string; anonKey: string }): SupabaseClient | null {
  const config = customConfig || getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  try {
    if (!supabaseInstance || customConfig) {
      supabaseInstance = createClient(config.url, config.anonKey);
    }
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'Please provide both Supabase Project URL and Anon/Public Key.' };
  }

  try {
    // Validate URL format
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      return { success: false, message: 'Invalid Supabase URL format.' };
    }

    const testClient = createClient(url, anonKey);
    
    // Quick probe to check auth status or ping API
    const { error } = await testClient.auth.getSession();
    if (error) {
      return { success: false, message: `Supabase connection failed: ${error.message}` };
    }

    return { success: true, message: 'Connected to Supabase project successfully!' };
  } catch (err: any) {
    return { success: false, message: `Could not connect: ${err?.message || 'Invalid URL or network error'}` };
  }
}
