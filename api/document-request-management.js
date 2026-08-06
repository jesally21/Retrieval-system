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
    SUPABASE_ANON_KEY: [
      'SUPABASE_UPSTREAM_ANON_KEY',
      'REACT_APP_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_ANON_KEY',
      'VITE_SUPABASE_ANON_KEY',
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

function getClient(accessToken = '', req = null) {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: normalizeBearer(accessToken || req?.headers?.authorization || ''),
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizeName(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeConfidentiality(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'Non Confidential' || normalized === 'Normal') return 'Normal';
  if (['Confidential', 'Highly Sensitive'].includes(normalized)) return normalized;
  return 'Normal';
}

function resolveBranch(profile, request) {
  const requestBranch = normalizeName(request.branch || request.branchName || '', '');
  if (requestBranch) return requestBranch;
  const profileBranch = normalizeName(profile?.branch || '', '');
  if (profileBranch) return profileBranch;
  if (['department_head', 'dpo', 'ceo', 'archivist', 'superadmin'].includes(normalizeName(profile?.role || '').toLowerCase())) {
    return 'Head Office';
  }
  return '';
}

function buildRequestRow(payload, profile, existing = null, approver = null) {
  const request = payload?.request || payload || {};
  const isDraft = String(request.status || existing?.status || 'Pending Approval') === 'Draft';
  const requestBranch = resolveBranch(profile, { ...request, branch: request.branch || existing?.branch });
  const requestDepartment = normalizeName(request.department || existing?.department || profile?.department, '');
  const requestPosition = normalizeName(request.position || existing?.position || profile?.position, '');
  const requestNo = normalizeName(request.requestNo || request.request_no || existing?.request_no, '');

  return {
    id: normalizeName(request.id || existing?.id || '', '') || undefined,
    request_no: requestNo || null,
    requestor_id: existing?.requestor_id || profile.id,
    requestor_name: normalizeName(request.requestorName || existing?.requestor_name || profile.full_name || profile.email, ''),
    request_date: request.requestDate || existing?.request_date || new Date().toISOString().slice(0, 10),
    document_title: normalizeName(request.documentTitle || existing?.document_title || '', ''),
    document_reference_no: normalizeName(request.documentReferenceNo || existing?.document_reference_no || '', '') || null,
    document_category_id: normalizeName(request.documentCategoryId || existing?.document_category_id || '', '') || null,
    document_type: request.documentType || existing?.document_type || 'Physical',
    confidentiality_level: normalizeConfidentiality(request.confidentialityLevel || existing?.confidentiality_level || 'Normal'),
    purpose: normalizeName(request.purpose || existing?.purpose || '', ''),
    date_needed: request.dateNeeded || existing?.date_needed || new Date().toISOString().slice(0, 10),
    borrow_return_due_date: request.borrowReturnDueDate || existing?.borrow_return_due_date || new Date().toISOString().slice(0, 10),
    remarks: normalizeName(request.remarks || existing?.remarks || '', '') || null,
    branch: requestBranch,
    department: requestDepartment || null,
    position: requestPosition || null,
    status: isDraft ? 'Draft' : 'Pending Approval',
    current_approver_id: approver?.approver_id || normalizeName(request.currentApprover || existing?.current_approver_id || '', '') || null,
    current_approver_name: approver?.approver_name || normalizeName(request.currentApproverName || existing?.current_approver_name || '', '') || null,
    branch_head_requested_by: normalizeName(request.branchHeadRequestedBy || existing?.branch_head_requested_by || '', '') || null,
    branch_head_requested_at: request.branchHeadRequestedAt || existing?.branch_head_requested_at || null,
    approved_by: normalizeName(request.approvedBy || existing?.approved_by || '', '') || null,
    approved_at: request.approvedAt || existing?.approved_at || null,
    approval_remarks: normalizeName(request.approvalRemarks || existing?.approval_remarks || '', '') || null,
    rejected_by: normalizeName(request.rejectedBy || existing?.rejected_by || '', '') || null,
    rejected_at: request.rejectedAt || existing?.rejected_at || null,
    rejection_reason: normalizeName(request.rejectionReason || existing?.rejection_reason || '', '') || null,
    clarification_remarks: normalizeName(request.clarificationRemarks || existing?.clarification_remarks || '', '') || null,
    forwarded_to_archivist_at: request.forwardedToArchivistAt || existing?.forwarded_to_archivist_at || null,
    assigned_archivist_id: normalizeName(request.assignedArchivistId || existing?.assigned_archivist_id || '', '') || null,
    assigned_archivist_name: normalizeName(request.assignedArchivistName || existing?.assigned_archivist_name || '', '') || null,
    agreement_accepted: Boolean(request.agreementAccepted ?? existing?.agreement_accepted),
  };
}

async function resolveApprover(client, requestorRole, branch, confidentialityLevel) {
  const { data, error } = await client.rpc('resolve_request_approver', {
    p_requestor_role: requestorRole,
    p_branch: normalizeName(branch, ''),
    p_confidentiality: normalizeConfidentiality(confidentialityLevel),
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error: null };
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
    const accessToken = String(payload?.accessToken || '').trim();
    const client = getClient(accessToken, req);
    const { data: userData, error: userError } = await client.auth.getUser(accessToken || undefined);
    if (userError || !userData?.user) {
      return json(res, 401, { error: 'Unauthorized.' });
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, full_name, email, role, branch, department, position, status, is_active')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !profile) {
      return json(res, 400, { error: profileError?.message || 'Profile not found.' });
    }

  if (action === 'create-request') {
    const request = payload?.request || {};
    if (String(request.requestorId || '') !== profile.id) {
      return json(res, 403, { error: 'Requestor mismatch.' });
    }

    const row = buildRequestRow({ request }, profile, null, null);
    delete row.id;
    if (!row.document_title) {
      return json(res, 400, { error: 'Document title is required.' });
    }
    if (!row.branch) {
      return json(res, 400, { error: 'Branch is required.' });
    }

    const { data: approver, error: approverError } = await resolveApprover(client, profile.role, row.branch, row.confidentiality_level);
    if (approverError) {
      return json(res, 400, { error: approverError.message || 'Failed to resolve approver.' });
    }
    if (!approver?.approver_id && row.status !== 'Draft') {
      return json(res, 400, { error: 'No approver found for this request.' });
    }
    if (row.status !== 'Draft') {
      row.current_approver_id = approver?.approver_id || row.current_approver_id || null;
      row.current_approver_name = approver?.approver_name || row.current_approver_name || null;
    }

    const { data: inserted, error: insertError } = await client
      .from('document_requests')
      .insert(row)
      .select()
        .single();

      if (insertError) {
        return json(res, 400, { error: insertError.message || 'Failed to create request.' });
      }

      return json(res, 200, { request: inserted });
    }

    if (action === 'save-request') {
      const request = payload?.request || {};
      const requestId = String(request.id || '').trim();
      if (!requestId) {
        return json(res, 400, { error: 'Request id is required.' });
      }

      const { data: existing, error: existingError } = await client
        .from('document_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (existingError) {
        return json(res, 400, { error: existingError.message || 'Failed to load the existing request.' });
      }

      if (!existing) {
        return json(res, 404, { error: 'Request not found.' });
      }

      const { data: canApprove, error: canApproveError } = await client.rpc('can_approve_request', {
        target_request_id: requestId,
      });

      if (canApproveError) {
        return json(res, 400, { error: canApproveError.message || 'Failed to validate request access.' });
      }

      const isRequestor = existing.requestor_id === profile.id;
      const isPrivileged = Boolean(canApprove) || ['archivist', 'superadmin', 'admin', 'dpo', 'ceo'].includes(normalizeName(profile.role).toLowerCase());

      if (!isRequestor && !isPrivileged) {
        return json(res, 403, { error: 'You are not allowed to update this request.' });
      }

      if (isRequestor && existing.status !== 'Draft') {
        return json(res, 403, { error: 'Only draft requests can be edited by the requestor.' });
      }

      const row = buildRequestRow({ request }, profile, existing, null);
      row.id = requestId;
      row.status = isRequestor
        ? (existing.status === 'Draft' || String(request.status || '').trim() === 'Draft' ? 'Draft' : 'Pending Approval')
        : (request.status || existing.status || 'Pending Approval');
      if (!row.document_title) {
        return json(res, 400, { error: 'Document title is required.' });
      }
      if (!row.branch) {
        return json(res, 400, { error: 'Branch is required.' });
      }

      if (row.status === 'Pending Approval') {
        const { data: approver, error: approverError } = await resolveApprover(client, profile.role, row.branch, row.confidentiality_level);
        if (approverError) {
          return json(res, 400, { error: approverError.message || 'Failed to resolve approver.' });
        }
        if (!approver?.approver_id) {
          return json(res, 400, { error: 'No approver found for this request.' });
        }
        row.current_approver_id = approver.approver_id;
        row.current_approver_name = approver.approver_name || row.current_approver_name || null;
      }

      const { data: saved, error: saveError } = await client
        .from('document_requests')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();

      if (saveError) {
        return json(res, 400, { error: saveError.message || 'Failed to save request.' });
      }

      return json(res, 200, { request: saved });
    }

    return json(res, 400, { error: `Unknown action: ${action}` });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error.' });
  }
};
