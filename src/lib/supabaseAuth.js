import { supabase } from './supabaseClient';

function formatSupabaseError(error, fallbackMessage = 'Supabase request failed.') {
  if (!error) return new Error(fallbackMessage);
  if (error instanceof Error) {
    if (error.message === '{}' || error.message === '[object Object]') {
      return new Error(fallbackMessage);
    }
    return error;
  }
  if (typeof error === 'string') return new Error(error);
  const message = error.message || error.details || error.hint || error.error_description || fallbackMessage;
  if (message === '{}' || message === '[object Object]') {
    return new Error(fallbackMessage);
  }
  return new Error(message);
}

function normalizeAuthFailure(error, fallbackMessage) {
  const status = error?.status || error?.code;
  if (status === 403) {
    return new Error(`${fallbackMessage} Supabase returned 403. Check auth settings and RLS policies.`);
  }

  if (status === 500) {
    return new Error(`${fallbackMessage} Supabase Auth reached the database, but the profile creation trigger failed. Run the latest Supabase schema/migration, then try again.`);
  }

  if (error instanceof Error) {
    if (/failed to fetch/i.test(error.message)) {
      return new Error('Unable to reach Supabase. Check the network, project URL, and auth settings.');
    }
    return formatSupabaseError(error, fallbackMessage);
  }

  if (typeof error === 'string') {
    if (/failed to fetch/i.test(error)) {
      return new Error('Unable to reach Supabase. Check the network, project URL, and auth settings.');
    }
    return new Error(error);
  }

  return formatSupabaseError(error, fallbackMessage);
}

function getAdminApiUrls() {
  const configuredUrl = (process.env.REACT_APP_ADMIN_API_URL || window.__ENV__?.REACT_APP_ADMIN_API_URL || '').trim();
  const urls = [];
  if (configuredUrl) urls.push(configuredUrl);
  urls.push('/api/admin-user-management');
  urls.push('http://127.0.0.1:3001/api/admin-user-management');
  return [...new Set(urls)];
}

async function invokeAdminApi(body) {
  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult?.data?.session?.access_token || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  let lastError = null;
  for (const url of getAdminApiUrls()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error || payload?.message || `Admin API request failed (${response.status}).`;
        if (response.status === 404) {
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }
      return payload;
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.code;
      const message = String(error?.message || '');
      if (status === 404 || /404|failed to fetch|NetworkError/i.test(message)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Admin API request failed.');
}

async function createUserDirectly({ email, password, profile }) {
  const sessionBefore = await supabase.auth.getSession();
  const originalSession = sessionBefore?.data?.session || null;
  const metadata = {
    full_name: String(profile?.full_name || '').trim(),
    branch: String(profile?.branch || ''),
    department: String(profile?.department || ''),
    position: String(profile?.position || ''),
    role: String(profile?.role || 'requestor'),
    status: 'Active',
    avatar_url: profile?.avatar_url || null,
  };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    return { data: null, error: normalizeAuthFailure(error, 'Failed to create user account.') };
  }

  const newUser = data?.user || data?.session?.user || null;
  if (originalSession?.access_token && originalSession?.refresh_token && newUser?.id) {
    await supabase.auth.setSession({
      access_token: originalSession.access_token,
      refresh_token: originalSession.refresh_token,
    }).catch(() => {});
  }

  if (newUser?.id) {
    const profileRow = {
      id: newUser.id,
      full_name: metadata.full_name || newUser.email || 'User',
      email: email.toLowerCase(),
      avatar_url: metadata.avatar_url || null,
      branch: metadata.branch || null,
      department: metadata.department || null,
      position: metadata.position || null,
      created_by: profile?.created_by || null,
      created_by_name: profile?.created_by_name || null,
      status: 'Active',
      role: metadata.role || 'requestor',
      is_active: true,
    };

    const { data: syncedProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileRow, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      return { data: null, error: normalizeAuthFailure(profileError, 'Failed to create user account.') };
    }

    return {
      data: {
        user: newUser,
        session: data?.session || null,
        profile: syncedProfile,
        fallbackUsed: true,
      },
      error: null,
    };
  }

  return {
    data: {
      user: newUser,
      session: data?.session || null,
      fallbackUsed: false,
    },
    error: null,
  };
}

function isRetryableConnectionError(error) {
  const message = String(error?.message || '');
  return /404|failed to fetch|NetworkError|Missing environment variable|Unable to reach Supabase/i.test(message);
}

async function updateProfileDirectly(userId, profile) {
  const updatePayload = {
    full_name: profile.full_name !== undefined ? String(profile.full_name || '').trim() : undefined,
    email: profile.email !== undefined ? String(profile.email || '').trim().toLowerCase() : undefined,
    branch: profile.branch !== undefined ? String(profile.branch || '') : undefined,
    department: profile.department !== undefined ? String(profile.department || '') : undefined,
    position: profile.position !== undefined ? String(profile.position || '') : undefined,
    role: profile.role !== undefined ? String(profile.role || 'requestor') : undefined,
    status: profile.status !== undefined ? String(profile.status || 'Active') : undefined,
    avatar_url: profile.avatar_url !== undefined ? profile.avatar_url || null : undefined,
    is_active: profile.status !== undefined ? String(profile.status || 'Active') !== 'Inactive' : undefined,
  };

  const cleanedPayload = Object.fromEntries(
    Object.entries(updatePayload).filter(([, value]) => value !== undefined),
  );

  const { data, error } = await supabase
    .from('profiles')
    .update(cleanedPayload)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: formatSupabaseError(error, 'Failed to update profile directly.') };
  }

  return { data, error: null };
}

async function updateOwnProfileDirectly(userId, profile) {
  const sessionResult = await supabase.auth.getSession();
  const currentUserId = sessionResult?.data?.session?.user?.id || '';
  if (currentUserId !== userId) {
    return { data: null, error: new Error('Current session does not match the requested profile.') };
  }

  const authPayload = {};
  if (profile.email !== undefined) authPayload.email = String(profile.email || '').trim().toLowerCase();

  const metadata = {};
  if (profile.full_name !== undefined) metadata.full_name = String(profile.full_name || '').trim();
  if (profile.avatar_url !== undefined) metadata.avatar_url = profile.avatar_url || null;

  if (Object.keys(authPayload).length || Object.keys(metadata).length) {
    const { error: authError } = await supabase.auth.updateUser({
      ...(Object.keys(authPayload).length ? authPayload : {}),
      ...(Object.keys(metadata).length ? { data: metadata } : {}),
    });
    if (authError) {
      return { data: null, error: formatSupabaseError(authError, 'Failed to update profile.') };
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...(profile.full_name !== undefined ? { full_name: String(profile.full_name || '').trim() } : {}),
      ...(profile.email !== undefined ? { email: String(profile.email || '').trim().toLowerCase() } : {}),
      ...(profile.avatar_url !== undefined ? { avatar_url: profile.avatar_url || null } : {}),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: formatSupabaseError(error, 'Failed to update profile.') };
  }

  return { data, error: null };
}

export async function getCurrentSessionUser() {
  if (!supabase) return { user: null, session: null, error: new Error('Supabase is not configured.') };

  try {
    const { data, error } = await supabase.auth.getSession();
    return {
      user: data?.session?.user || null,
      session: data?.session || null,
      error: error ? normalizeAuthFailure(error, 'Failed to load the current session.') : null,
    };
  } catch (error) {
    return { user: null, session: null, error: normalizeAuthFailure(error, 'Failed to load the current session.') };
  }
}

export async function signInWithEmailPassword(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: error ? normalizeAuthFailure(error, 'Login failed.') : null };
  } catch (error) {
    return { data: null, error: normalizeAuthFailure(error, 'Login failed.') };
  }
}

export async function createUserAccount({ email, password, profile }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const attempts = [
    async () => {
      const data = await invokeAdminApi({
        action: 'create-user',
        email,
        password,
        profile,
      });
      return { data, error: null };
    },
    async () => createUserDirectly({ email, password, profile }),
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (!result?.error) return result;
      lastError = result.error;
    } catch (error) {
      lastError = error;
      if (!isRetryableConnectionError(error)) {
        return { data: null, error: normalizeAuthFailure(error, 'Create user failed.') };
      }
    }
  }

  return { data: null, error: normalizeAuthFailure(lastError, 'Create user failed.') };
}

export async function updateUserAccount({ userId, profile }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const data = await invokeAdminApi({
      action: 'update-user',
      userId,
      profile,
    });
    return { data, error: null };
  } catch (error) {
    const message = String(error?.message || '');
    if (/404|failed to fetch|NetworkError|Missing environment variable/i.test(message)) {
      const fallback = await updateProfileDirectly(userId, profile);
      if (!fallback.error) {
        return {
          data: {
            profile: fallback.data,
            fallbackUsed: true,
          },
          error: null,
        };
      }
    }
    return { data: null, error: normalizeAuthFailure(error, 'Update user failed.') };
  }
}

export async function updateOwnProfile({ userId, profile }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const data = await invokeAdminApi({
      action: 'update-self-profile',
      userId,
      profile,
    });
    return { data, error: null };
  } catch (error) {
    const message = String(error?.message || '');
    if (/404|failed to fetch|NetworkError|Missing environment variable/i.test(message)) {
      const fallback = await updateOwnProfileDirectly(userId, profile);
      if (!fallback.error) {
        return {
          data: {
            profile: fallback.data,
            fallbackUsed: true,
          },
          error: null,
        };
      }
    }
    return { data: null, error: normalizeAuthFailure(error, 'Update profile failed.') };
  }
}

export async function resetUserPassword({ userId, password }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const data = await invokeAdminApi({
      action: 'reset-password',
      userId,
      password,
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeAuthFailure(error, 'Password reset failed.') };
  }
}

export async function toggleUserStatus({ userId, status }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const data = await invokeAdminApi({
      action: 'set-status',
      userId,
      status,
    });
    return { data, error: null };
  } catch (error) {
    if (String(error?.message || '').includes('404')) {
      const { data: profile, error: fallbackError } = await supabase
        .from('profiles')
        .update({ status, is_active: status === 'Active' })
        .eq('id', userId)
        .select()
        .single();
      if (!fallbackError) {
        return { data: { profile, fallbackUsed: true }, error: null };
      }
    }
    return { data: null, error: normalizeAuthFailure(error, 'Status update failed.') };
  }
}

export async function deleteUserAccount({ userId }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  try {
    const { data: deleted, error } = await supabase.rpc('delete_user_account', {
      p_user_id: userId,
    });
    if (!error) {
      return { data: deleted || { success: true }, error: null };
    }
  } catch (error) {
    const message = String(error?.message || '');
    if (!/404|failed to fetch|NetworkError|Missing environment variable/i.test(message)) {
      return { data: null, error: normalizeAuthFailure(error, 'Delete user failed.') };
    }
  }

  try {
    const data = await invokeAdminApi({
      action: 'delete-user',
      userId,
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeAuthFailure(error, 'Delete user failed.') };
  }
}

export async function signOut() {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? normalizeAuthFailure(error, 'Sign out failed.') : null };
  } catch (error) {
    return { error: normalizeAuthFailure(error, 'Sign out failed.') };
  }
}
