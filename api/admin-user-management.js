const { createClient } = require('@supabase/supabase-js');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
}

function getEnv(name) {
  const fallbackNames = {
    SUPABASE_URL: [
      'SUPABASE_UPSTREAM_URL',
      'REACT_APP_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_URL',
      'VITE_SUPABASE_URL',
    ],
    SUPABASE_SERVICE_ROLE_KEY: [
      'SUPABASE_UPSTREAM_SERVICE_ROLE_KEY',
      'REACT_APP_SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_SUPABASE_SERVICE_ROLE_KEY',
    ],
  };
  const fallback = fallbackNames[name] || [];
  const value = process.env[name] || fallback.map((key) => process.env[key]).find(Boolean);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function normalizeBearer(token) {
  const value = String(token || '').trim();
  if (!value) return '';
  return value.toLowerCase().startsWith('bearer ') ? value : `Bearer ${value}`;
}

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'admin') return 'superadmin';
  if (['staff/requestor', 'staff-requestor', 'staff requestor', 'requestor', 'staff', 'staff / requestor'].includes(value)) return 'requestor';
  if (['branch head', 'branch-head', 'branch/head', 'branch head approver', 'manager - approver of requestor', 'manager / approver of requestor'].includes(value)) return 'branch_head';
  if (['department head', 'department-head', 'department/head', 'head - approver of requestors and managers', 'head / approver of requestors and managers'].includes(value)) return 'department_head';
  if (['admin/dpo', 'admin - dpo', 'data privacy officer', 'dpo'].includes(value)) return 'dpo';
  if (['admin/ceo', 'admin - ceo', 'ceo'].includes(value)) return 'ceo';
  if (['archivist', 'archivist - process approved docs'].includes(value)) return 'archivist';
  if (['superadmin', 'super admin', 'superadmin / ict', 'super admin / ict', 'super admin - ict', 'ict'].includes(value)) return 'superadmin';
  if (['requestor', 'branch_head', 'department_head', 'sacd_head', 'dpo', 'ceo', 'archivist', 'superadmin'].includes(value)) {
    return value === 'sacd_head' ? 'department_head' : value;
  }
  return 'requestor';
}

function getAdminClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function getCallerClient(req) {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    global: {
      headers: {
        Authorization: normalizeBearer(req.headers.authorization || ''),
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

async function requireSuperAdmin(req) {
  const callerClient = getCallerClient(req);
  const { data: userData, error: userError } = await callerClient.auth.getUser(req.headers.authorization || undefined);
  if (userError || !userData?.user) {
    throw new Error('Unauthorized.');
  }

  const adminClient = getAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role, status, full_name, email')
    .eq('id', userData.user.id)
    .single();

  const role = normalizeRole(profile?.role);
  if (profileError || !profile || role !== 'superadmin') {
    throw new Error('Forbidden.');
  }

  return { adminClient, profile, callerUserId: userData.user.id };
}

module.exports = async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const action = String(payload?.action || '');

    if (action === 'update-self-profile') {
      const callerClient = getCallerClient(req);
      const { data: userData, error: userError } = await callerClient.auth.getUser(req.headers.authorization || undefined);
      if (userError || !userData?.user) {
        return json(res, 401, { error: 'Unauthorized.' });
      }

      const userId = String(payload?.userId || '').trim();
      if (!userId || userId !== userData.user.id) {
        return json(res, 403, { error: 'Forbidden.' });
      }

      const profile = payload?.profile || {};
      const updates = {};
      if (profile.full_name !== undefined) updates.full_name = String(profile.full_name || '').trim();
      if (profile.email !== undefined) updates.email = String(profile.email || '').trim().toLowerCase();
      if (profile.avatar_url !== undefined) updates.avatar_url = profile.avatar_url || null;
      if (Object.keys(updates).length === 0) {
        return json(res, 400, { error: 'No profile fields were provided.' });
      }

      const adminClient = getAdminClient();
      const { data: updatedProfile, error: profileError } = await adminClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        return json(res, 400, { error: profileError.message || 'Failed to update profile.' });
      }

      const authUpdate = {};
      if (updates.email) authUpdate.email = updates.email;
      const userMetadata = {};
      if (updates.full_name !== undefined) userMetadata.full_name = updates.full_name;
      if (updates.avatar_url !== undefined) userMetadata.avatar_url = updates.avatar_url;
      if (Object.keys(authUpdate).length || Object.keys(userMetadata).length) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
          ...authUpdate,
          ...(Object.keys(userMetadata).length ? { user_metadata: userMetadata } : {}),
        });
        if (authUpdateError) {
          return json(res, 400, { error: authUpdateError.message || 'Profile updated, but auth sync failed.' });
        }
      }

      return json(res, 200, { profile: updatedProfile });
    }

    const { adminClient, profile: superAdminProfile, callerUserId } = await requireSuperAdmin(req);

    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');
    const profile = payload?.profile || {};
    if (action === 'create-user') {
      const fullName = String(profile?.full_name || '').trim();
      if (!email || !password || !fullName) {
        return json(res, 400, { error: 'Email, password, and full name are required.' });
      }

      const role = normalizeRole(profile?.role);
      const metadata = {
        full_name: fullName,
        branch: String(profile?.branch || ''),
        department: String(profile?.department || ''),
        position: String(profile?.position || ''),
        role,
        status: 'Active',
        avatar_url: profile?.avatar_url || null,
      };

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: { role },
      });

      if (createError || !created?.user) {
        return json(res, 400, { error: createError?.message || 'Failed to create auth user.' });
      }

      const { data: syncedProfile, error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          id: created.user.id,
          full_name: fullName,
          email,
          avatar_url: profile?.avatar_url || null,
          branch: String(profile?.branch || ''),
          department: String(profile?.department || ''),
          position: String(profile?.position || ''),
          role,
          status: 'Active',
          is_active: true,
          created_by_name: superAdminProfile.full_name,
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        return json(res, 400, { error: profileError.message || 'User created, but profile sync failed.' });
      }

      return json(res, 200, { user: created.user, profile: syncedProfile });
    }

    if (action === 'update-user') {
      const userId = String(payload?.userId || '').trim();
      if (!userId) {
        return json(res, 400, { error: 'userId is required.' });
      }

      const { data: existingProfile, error: existingError } = await adminClient
        .from('profiles')
        .select('position, role')
        .eq('id', userId)
        .single();
      if (existingError) {
        return json(res, 400, { error: existingError.message || 'Failed to load the current profile.' });
      }
      if (normalizeRole(existingProfile?.role) === 'superadmin' && callerUserId !== userId) {
        return json(res, 403, { error: 'Forbidden.' });
      }

      const updates = {};
      if (profile.full_name !== undefined) updates.full_name = String(profile.full_name || '').trim();
      if (profile.email !== undefined) updates.email = String(profile.email || '').trim().toLowerCase();
      if (profile.branch !== undefined) updates.branch = String(profile.branch || '');
      if (profile.department !== undefined) updates.department = String(profile.department || '');
      if (profile.position !== undefined) {
        const nextPosition = String(profile.position || '').trim();
        updates.position = nextPosition || String(existingProfile?.position || '');
      }
      if (profile.role !== undefined) updates.role = normalizeRole(profile.role);
      if (profile.status !== undefined) updates.status = String(profile.status || 'Active');
      if (profile.avatar_url !== undefined) updates.avatar_url = profile.avatar_url || null;
      if (Object.keys(updates).length === 0) {
        return json(res, 400, { error: 'No profile fields were provided.' });
      }

      const { data: updatedProfile, error: profileError } = await adminClient
        .from('profiles')
        .update({
          ...updates,
          is_active: String(profile.status || 'Active') !== 'Inactive',
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        return json(res, 400, { error: profileError.message || 'Failed to update profile.' });
      }

      const authUpdate = {};
      if (updates.email) authUpdate.email = updates.email;
      const userMetadata = {};
      if (updates.full_name !== undefined) userMetadata.full_name = updates.full_name;
      if (updates.branch !== undefined) userMetadata.branch = updates.branch;
      if (updates.department !== undefined) userMetadata.department = updates.department;
      if (updates.position !== undefined) userMetadata.position = updates.position;
      if (updates.role !== undefined) userMetadata.role = updates.role;
      if (updates.status !== undefined) userMetadata.status = updates.status;
      if (updates.avatar_url !== undefined) userMetadata.avatar_url = updates.avatar_url;
      const appMetadata = {};
      if (updates.role !== undefined) appMetadata.role = updates.role;
      if (Object.keys(authUpdate).length || Object.keys(userMetadata).length || Object.keys(appMetadata).length) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
          ...authUpdate,
          ...(Object.keys(userMetadata).length ? { user_metadata: userMetadata } : {}),
          ...(Object.keys(appMetadata).length ? { app_metadata: appMetadata } : {}),
        });
        if (authUpdateError) {
          return json(res, 400, { error: authUpdateError.message || 'Profile updated, but auth sync failed.' });
        }
      }

      return json(res, 200, { profile: updatedProfile });
    }

    if (action === 'reset-password') {
      const userId = String(payload?.userId || '').trim();
      const nextPassword = String(payload?.password || '');
      if (!userId || !nextPassword) {
        return json(res, 400, { error: 'userId and password are required.' });
      }
      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (targetError) {
        return json(res, 400, { error: targetError.message || 'Failed to load the current profile.' });
      }
      if (normalizeRole(targetProfile?.role) === 'superadmin' && callerUserId !== userId) {
        return json(res, 403, { error: 'Forbidden.' });
      }
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, { password: nextPassword });
      if (error) return json(res, 400, { error: error.message || 'Failed to update password.' });
      return json(res, 200, { user: data.user });
    }

    if (action === 'set-status') {
      const userId = String(payload?.userId || '').trim();
      const status = String(payload?.status || '').trim();
      if (!userId || !['Active', 'Inactive'].includes(status)) {
        return json(res, 400, { error: 'userId and a valid status are required.' });
      }
      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (targetError) {
        return json(res, 400, { error: targetError.message || 'Failed to load the current profile.' });
      }
      if (normalizeRole(targetProfile?.role) === 'superadmin' && callerUserId !== userId) {
        return json(res, 403, { error: 'Forbidden.' });
      }

      const { data: updatedProfile, error } = await adminClient
        .from('profiles')
        .update({ status, is_active: status === 'Active' })
        .eq('id', userId)
        .select()
        .single();

      if (error) return json(res, 400, { error: error.message || 'Failed to update status.' });
      return json(res, 200, { profile: updatedProfile });
    }

    if (action === 'delete-user') {
      const userId = String(payload?.userId || '').trim();
      if (!userId) {
        return json(res, 400, { error: 'userId is required.' });
      }
      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (targetError) {
        return json(res, 400, { error: targetError.message || 'Failed to load the current profile.' });
      }
      if (normalizeRole(targetProfile?.role) === 'superadmin' && callerUserId !== userId) {
        return json(res, 403, { error: 'Forbidden.' });
      }

      const { error } = await adminClient.rpc('delete_user_account', { p_user_id: userId });
      if (error) {
        return json(res, 400, { error: error.message || 'Failed to delete user account.' });
      }

      return json(res, 200, { success: true });
    }

    return json(res, 400, { error: `Unknown action: ${action}` });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
};
