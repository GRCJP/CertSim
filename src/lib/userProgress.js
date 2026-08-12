import { supabase } from './supabase.js';

export async function getUserData(userId, bankId, dataType) {
  // userId is the Auth0 user.sub value (e.g., "auth0|xxx")
  if (!userId) {
    console.warn('getUserData called without userId');
    return null;
  }
  
  console.log('Fetching data for user:', userId, 'bank:', bankId, 'type:', dataType);
  
  const { data, error } = await supabase
    .from('user_progress')
    .select('data')
    .eq('user_id', userId)
    .eq('question_bank_id', bankId)
    .eq('data_type', dataType)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getUserData error:', error);
    throw error;
  }
  return data?.data ?? null;
}

export async function updateUserData(userId, bankId, dataType, payload) {
  // userId is the Auth0 user.sub value (e.g., "auth0|xxx")
  if (!userId) {
    console.warn('updateUserData called without userId');
    return;
  }
  
  console.log('Updating data for user:', userId, 'bank:', bankId, 'type:', dataType);
  
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      question_bank_id: bankId,
      data_type: dataType,
      data: payload,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('updateUserData error:', error);
    throw error;
  }
}
