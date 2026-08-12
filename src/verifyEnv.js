// This file verifies that environment variables are included in the build
// Run this in the browser console to verify the deployment

console.log('=== Verifying Environment Variables ===');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase URL exists:', !!import.meta.env.VITE_SUPABASE_URL);

console.log('Supabase Anon Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('Supabase Anon Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0);

console.log('Auth0 Domain:', import.meta.env.VITE_AUTH0_DOMAIN);
console.log('Auth0 Domain exists:', !!import.meta.env.VITE_AUTH0_DOMAIN);

console.log('Auth0 Client ID:', import.meta.env.VITE_AUTH0_CLIENT_ID);
console.log('Auth0 Client ID exists:', !!import.meta.env.VITE_AUTH0_CLIENT_ID);

// Check if the values are the expected ones
const expectedUrl = 'https://szyjviaolnaoywopfrqp.supabase.co';
const expectedDomain = 'dev-351wds1ubpw3eyut.us.auth0.com';

if (import.meta.env.VITE_SUPABASE_URL === expectedUrl) {
  console.log('✅ Supabase URL is correct');
} else {
  console.error('❌ Supabase URL is incorrect or missing');
}

if (import.meta.env.VITE_AUTH0_DOMAIN === expectedDomain) {
  console.log('✅ Auth0 Domain is correct');
} else {
  console.error('❌ Auth0 Domain is incorrect or missing');
}

console.log('=== End Verification ===');
