// Simple Supabase REST client - no auth functionality
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// IMPORTANT: Do not pre-encode values passed to URLSearchParams.
// URLSearchParams will encode them exactly once.
// This keeps Auth0 user.sub as raw `auth0|...` at the callsite while producing `auth0%7C...` on the wire.
const encodeEq = (value) => `eq.${String(value)}`;

// Create a minimal client with only database operations
const supabase = {
  from: (table) => ({
    select: (columns) => ({
      eq: (column, value) => ({
        eq: (column2, value2) => ({
          eq: (column3, value3) => ({
            single: async () => {
              const params = new URLSearchParams({
                [column]: encodeEq(value),
                [column2]: encodeEq(value2),
                [column3]: encodeEq(value3),
                select: String(columns),
              });
              const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
              const response = await fetch(url, {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
              });
              if (!response.ok) {
                const error = { code: 'PGRST116' };
                if (response.status !== 406) throw error;
                return { data: null, error };
              }
              const data = await response.json();
              return data && data.length > 0 ? { data: data[0] } : { data: null, error: { code: 'PGRST116' } };
            }
          })
        })
      })
    }),
    upsert: async (data) => {
      const params = new URLSearchParams({
        on_conflict: 'user_id,question_bank_id,data_type',
      });
      const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify([data]),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { error: null };
    }
  })
};

export { supabase };
