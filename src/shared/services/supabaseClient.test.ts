import { supabase, supabaseAuthStorage } from './supabaseClient';

describe('supabaseClient', () => {
  it('prefers sessionStorage for auth persistence when available', () => {
    expect(supabaseAuthStorage).toBe(window.sessionStorage);
  });

  it('configures Supabase auth to persist sessions with storage', () => {
    expect((supabase.auth as any).persistSession).toBe(true);
    expect((supabase.auth as any).storage).toBe(supabaseAuthStorage);
  });
});
