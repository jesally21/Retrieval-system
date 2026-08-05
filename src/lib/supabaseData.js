import { supabase } from './supabaseClient';

function normalizeName(value, fallback = '') {
  return String(value || fallback).trim();
}

export function normalizeRole(role) {
  const value = String(role || '').trim();
  if (value === 'sacd_head') return 'department_head';
  if (value === 'admin') return 'superadmin';
  if (['requestor', 'branch_head', 'department_head', 'dpo', 'ceo', 'archivist', 'superadmin'].includes(value)) return value;
  return 'requestor';
}

export function normalizeBranchName(branch) {
  return normalizeName(branch, '');
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => normalizeName(value)).filter(Boolean))];
}

function formatSupabaseError(error, fallbackMessage = 'Supabase request failed.') {
  if (!error) return new Error(fallbackMessage);
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  const message = error.message || error.details || error.hint || error.error_description || fallbackMessage;
  if (message === '{}' || message === '[object Object]') {
    return new Error(fallbackMessage);
  }
  return new Error(message);
}

function mapProfileRow(row) {
  return {
    id: row.id,
    name: row.full_name || row.email || '',
    email: row.email || '',
    role: normalizeRole(row.role),
    branch: normalizeName(row.branch, ''),
    department: row.department || '',
    position: row.position || '',
    status: row.status || (row.is_active === false ? 'Inactive' : 'Active'),
    createdAt: row.created_at || '',
    createdBy: row.created_by || '',
    createdByName: row.created_by_name || '',
    avatar: row.avatar_url || '',
    is_active: row.is_active !== false,
    avatarCustom: Boolean(row.avatar_url && !String(row.avatar_url).includes('data:image/svg+xml')),
  };
}

function mapRequestRow(row, usersById = new Map()) {
  const requestor = usersById.get(row.requestor_id);
  const approver = usersById.get(row.current_approver_id);
  const archivist = usersById.get(row.assigned_archivist_id);
  return {
    id: row.id,
    requestNo: row.request_no,
    requestorId: row.requestor_id,
    requestorName: row.requestor_name || requestor?.name || '',
    requestDate: row.request_date,
    documentTitle: row.document_title,
    documentReferenceNo: row.document_reference_no || '',
    documentCategoryId: row.document_category_id || '',
    documentType: row.document_type,
    confidentialityLevel: row.confidentiality_level === 'Normal' ? 'Non Confidential' : row.confidentiality_level || 'Non Confidential',
    purpose: row.purpose,
    dateNeeded: row.date_needed,
    borrowReturnDueDate: row.borrow_return_due_date,
    remarks: row.remarks || '',
    branch: normalizeName(row.branch, ''),
    department: row.department || '',
    position: row.position || '',
    status: row.status,
    currentApprover: row.current_approver_id || '',
    currentApproverName: row.current_approver_name || approver?.name || '',
    branchHeadRequestedBy: row.branch_head_requested_by || '',
    branchHeadRequestedAt: row.branch_head_requested_at || '',
    approvedBy: row.approved_by || '',
    approvedAt: row.approved_at || '',
    approvalRemarks: row.approval_remarks || '',
    rejectedBy: row.rejected_by || '',
    rejectedAt: row.rejected_at || '',
    rejectionReason: row.rejection_reason || '',
    clarificationRemarks: row.clarification_remarks || '',
    forwardedToArchivistAt: row.forwarded_to_archivist_at || '',
    assignedArchivistId: row.assigned_archivist_id || '',
    assignedArchivistName: row.assigned_archivist_name || archivist?.name || '',
    agreementAccepted: Boolean(row.agreement_accepted),
  };
}

function mapProcessingRow(row, usersById = new Map()) {
  const archivist = usersById.get(row.archivist_id);
  return {
    dateReceived: row.date_received || '',
    dateReleased: row.date_released || '',
    borrowerName: row.borrower_name || '',
    expectedReturnDate: row.expected_return_date || '',
    physicalConditionBeforeRelease: row.physical_condition_before_release || 'Good Condition',
    storageLocation: row.storage_location || '',
    electronicReleaseMethod: row.electronic_release_method || 'Link',
    electronicReleaseReference: row.electronic_release_reference || '',
    accessExpiryDate: row.access_expiry_date || '',
    deletionConfirmationRequired: Boolean(row.deletion_confirmation_required),
    accessRevoked: Boolean(row.access_revoked),
    releaseRemarks: row.release_remarks || '',
    archivistId: row.archivist_id || '',
    archivistName: row.archivist_name || archivist?.name || '',
  };
}

function mapElectronicReleaseLinkRow(row, usersById = new Map()) {
  const releasedBy = usersById.get(row.released_by);
  return {
    requestId: row.request_id,
    electronicReleaseReference: row.electronic_release_reference || '',
    releasedBy: row.released_by || '',
    releasedByName: row.released_by_name || releasedBy?.name || '',
    releasedAt: row.released_at || '',
  };
}

function mapClosureRow(row, usersById = new Map()) {
  const validator = usersById.get(row.validated_by);
  const closer = usersById.get(row.closed_by);
  return {
    dateReturned: row.date_returned || '',
    conditionUponReturn: row.condition_upon_return || 'Complete',
    isComplete: Boolean(row.is_complete),
    hasDamage: Boolean(row.has_damage),
    hasMarkings: Boolean(row.has_markings),
    missingPages: Boolean(row.missing_pages),
    refiledLocation: row.refiled_location || '',
    accessRevoked: Boolean(row.access_revoked),
    deletionConfirmed: Boolean(row.deletion_confirmed),
    validatedBy: row.validated_by || '',
    validatedByName: validator?.name || '',
    validationDate: row.validation_date || '',
    closureRemarks: row.closure_remarks || '',
    closedBy: row.closed_by || '',
    closedByName: closer?.name || '',
    closedAt: row.closed_at || '',
  };
}

function mapIncidentRow(row, usersById = new Map()) {
  const reporter = usersById.get(row.reported_by);
  const resolver = usersById.get(row.resolved_by);
  return {
    id: row.id,
    requestId: row.request_id,
    reportedBy: row.reported_by,
    reportedByName: row.reported_by_name || reporter?.name || '',
    incidentType: row.incident_type,
    incidentDescription: row.incident_description,
    actionTaken: row.action_taken || '',
    status: row.status,
    resolvedBy: row.resolved_by || '',
    resolvedByName: resolver?.name || '',
    resolvedAt: row.resolved_at || '',
    createdAt: row.created_at,
  };
}

function mapAuditLogRow(row, usersById = new Map()) {
  const user = usersById.get(row.user_id);
  return {
    id: row.id,
    requestId: row.request_id,
    userId: row.user_id,
    userName: row.user_name || user?.name || '',
    action: row.action,
    oldStatus: row.old_status || '',
    newStatus: row.new_status || '',
    remarks: row.remarks || '',
    createdAt: row.created_at,
  };
}

async function fetchTable(table, select = '*', orderBy = 'created_at', ascending = false) {
  const query = supabase.from(table).select(select);
  if (orderBy) query.order(orderBy, { ascending });
  const { data, error } = await query;
  if (error) throw formatSupabaseError(error, `Failed to load ${table}.`);
  return data || [];
}

async function replaceTableRows(table, rows, key = 'id') {
  const { data: existing, error: existingError } = await supabase.from(table).select(key);
  if (existingError) throw formatSupabaseError(existingError, `Failed to read ${table}.`);

  const nextKeys = new Set(rows.map((row) => row[key]).filter(Boolean));
  const deleteKeys = (existing || [])
    .map((row) => row[key])
    .filter((value) => value && !nextKeys.has(value));

  if (deleteKeys.length) {
    const { error: deleteError } = await supabase.from(table).delete().in(key, deleteKeys);
    if (deleteError) throw formatSupabaseError(deleteError, `Failed to delete stale ${table} rows.`);
  }

  if (rows.length) {
    const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict: key });
    if (upsertError) throw formatSupabaseError(upsertError, `Failed to sync ${table}.`);
  }
}

async function replaceReferenceRows(table, rows) {
  const { data: existing, error: existingError } = await supabase.from(table).select('name');
  if (existingError) throw formatSupabaseError(existingError, `Failed to read ${table}.`);

  const nextNames = new Set(rows.map((row) => normalizeName(row.name)).filter(Boolean));
  const deleteNames = (existing || [])
    .map((row) => row.name)
    .filter((value) => value && !nextNames.has(value));

  if (deleteNames.length) {
    const { error: deleteError } = await supabase.from(table).delete().in('name', deleteNames);
    if (deleteError) throw formatSupabaseError(deleteError, `Failed to delete stale ${table} rows.`);
  }

  if (rows.length) {
    const { error: upsertError } = await supabase.from(table).upsert(rows, { onConflict: 'name' });
    if (upsertError) throw formatSupabaseError(upsertError, `Failed to sync ${table}.`);
  }
}

export async function loadSupabaseAppData() {
  if (!supabase) {
    return {
      users: [],
      requests: [],
      processing: {},
      electronicReleaseLinks: {},
      closures: {},
      incidents: [],
      auditLogs: [],
      branches: [],
      departments: [],
      categories: [],
    };
  }

  const [
    profilesResult,
    requestsResult,
    processingResult,
    releaseLinksResult,
    closuresResult,
    incidentsResult,
    auditLogsResult,
    branchesResult,
    departmentsResult,
    categoriesResult,
  ] = await Promise.all([
    fetchTable('profiles', '*', 'full_name', true).catch(() => []),
    fetchTable('document_requests', '*', 'created_at', false).catch(() => []),
    fetchTable('archivist_processing', '*', 'created_at', false).catch(() => []),
    fetchTable('electronic_release_links', '*', 'created_at', false).catch(() => []),
    fetchTable('request_closures', '*', 'created_at', false).catch(() => []),
    fetchTable('incident_reports', '*', 'created_at', false).catch(() => []),
    fetchTable('audit_logs', '*', 'created_at', false).catch(() => []),
    fetchTable('branches', 'name, is_active', 'name', true).catch(() => []),
    fetchTable('departments', 'name, is_active', 'name', true).catch(() => []),
    fetchTable('document_categories', 'name, description, is_active', 'name', true).catch(() => []),
  ]);

  const users = Array.isArray(profilesResult) ? profilesResult.map(mapProfileRow) : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const requests = Array.isArray(requestsResult) ? requestsResult.map((row) => mapRequestRow(row, usersById)) : [];
  const processing = Object.fromEntries((Array.isArray(processingResult) ? processingResult : []).map((row) => [row.request_id, mapProcessingRow(row, usersById)]));
  const electronicReleaseLinks = Object.fromEntries((Array.isArray(releaseLinksResult) ? releaseLinksResult : []).map((row) => [row.request_id, mapElectronicReleaseLinkRow(row, usersById)]));
  const closures = Object.fromEntries((Array.isArray(closuresResult) ? closuresResult : []).map((row) => [row.request_id, mapClosureRow(row, usersById)]));
  const incidents = Array.isArray(incidentsResult) ? incidentsResult.map((row) => mapIncidentRow(row, usersById)) : [];
  const auditLogs = Array.isArray(auditLogsResult) ? auditLogsResult.map((row) => mapAuditLogRow(row, usersById)) : [];

  return {
    users,
    requests,
    processing,
    electronicReleaseLinks,
    closures,
    incidents,
    auditLogs,
    branches: uniqueStrings((branchesResult || []).map((row) => row.name)),
    departments: uniqueStrings((departmentsResult || []).map((row) => row.name)),
    categories: uniqueStrings((categoriesResult || []).map((row) => row.name)),
  };
}

export async function syncProfiles(users) {
  if (!supabase) return;
  const rows = users.map((user) => ({
    id: user.id,
    full_name: normalizeName(user.name, user.email),
    email: normalizeName(user.email).toLowerCase(),
    avatar_url: user.avatar || null,
    branch: normalizeName(user.branch, ''),
    department: normalizeName(user.department),
    position: normalizeName(user.position),
    status: user.status || (user.is_active === false ? 'Inactive' : 'Active'),
    role: normalizeRole(user.role),
    is_active: user.is_active !== false,
    created_by: user.createdBy || user.created_by || null,
    created_by_name: user.createdByName || user.created_by_name || null,
  }));
  await replaceTableRows('profiles', rows, 'id');
}

export async function syncRequests(requests) {
  if (!supabase) return;
  const rows = requests.map((request) => ({
    id: request.id,
    request_no: request.requestNo,
    requestor_id: request.requestorId,
    requestor_name: request.requestorName,
    request_date: request.requestDate,
    document_title: request.documentTitle,
    document_reference_no: request.documentReferenceNo || null,
    document_category_id: request.documentCategoryId || null,
    document_type: request.documentType,
    confidentiality_level: request.confidentialityLevel === 'Non Confidential' ? 'Normal' : request.confidentialityLevel,
    purpose: request.purpose,
    date_needed: request.dateNeeded,
    borrow_return_due_date: request.borrowReturnDueDate,
    remarks: request.remarks || null,
    branch: normalizeName(request.branch, ''),
    department: request.department || null,
    position: request.position || null,
    status: request.status,
    current_approver_id: request.currentApprover || null,
    current_approver_name: request.currentApproverName || null,
    branch_head_requested_by: request.branchHeadRequestedBy || null,
    branch_head_requested_at: request.branchHeadRequestedAt || null,
    approved_by: request.approvedBy || null,
    approved_at: request.approvedAt || null,
    approval_remarks: request.approvalRemarks || null,
    rejected_by: request.rejectedBy || null,
    rejected_at: request.rejectedAt || null,
    rejection_reason: request.rejectionReason || null,
    clarification_remarks: request.clarificationRemarks || null,
    forwarded_to_archivist_at: request.forwardedToArchivistAt || null,
    assigned_archivist_id: request.assignedArchivistId || null,
    assigned_archivist_name: request.assignedArchivistName || null,
    agreement_accepted: Boolean(request.agreementAccepted),
  }));
  await replaceTableRows('document_requests', rows, 'id');
}

function buildRequestRow(request) {
  return {
    id: request.id,
    request_no: request.requestNo,
    requestor_id: request.requestorId,
    requestor_name: request.requestorName,
    request_date: request.requestDate,
    document_title: request.documentTitle,
    document_reference_no: request.documentReferenceNo || null,
    document_category_id: request.documentCategoryId || null,
    document_type: request.documentType,
    confidentiality_level: request.confidentialityLevel === 'Non Confidential' ? 'Normal' : request.confidentialityLevel,
    purpose: request.purpose,
    date_needed: request.dateNeeded,
    borrow_return_due_date: request.borrowReturnDueDate,
    remarks: request.remarks || null,
    branch: normalizeName(request.branch, ''),
    department: request.department || null,
    position: request.position || null,
    status: request.status,
    current_approver_id: request.currentApprover || null,
    current_approver_name: request.currentApproverName || null,
    branch_head_requested_by: request.branchHeadRequestedBy || null,
    branch_head_requested_at: request.branchHeadRequestedAt || null,
    approved_by: request.approvedBy || null,
    approved_at: request.approvedAt || null,
    approval_remarks: request.approvalRemarks || null,
    rejected_by: request.rejectedBy || null,
    rejected_at: request.rejectedAt || null,
    rejection_reason: request.rejectionReason || null,
    clarification_remarks: request.clarificationRemarks || null,
    forwarded_to_archivist_at: request.forwardedToArchivistAt || null,
    assigned_archivist_id: request.assignedArchivistId || null,
    assigned_archivist_name: request.assignedArchivistName || null,
    agreement_accepted: Boolean(request.agreementAccepted),
  };
}

export async function createRequestRecord(request) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const row = buildRequestRow(request);
  delete row.id;
  const { data, error } = await supabase.rpc('create_document_request', {
    p_request: row,
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to create request.') };
  return { data, error: null };
}

export async function saveProcessingRecord(requestId, record) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('save_archivist_processing', {
    p_request_id: requestId,
    p_record: {
      archivist_id: record.archivistId || null,
      archivist_name: record.archivistName || null,
      date_received: record.dateReceived || null,
      date_released: record.dateReleased || null,
      borrower_name: record.borrowerName || null,
      expected_return_date: record.expectedReturnDate || null,
      physical_condition_before_release: record.physicalConditionBeforeRelease || null,
      storage_location: record.storageLocation || null,
      electronic_release_method: record.electronicReleaseMethod || null,
      electronic_release_reference: record.electronicReleaseReference || null,
      access_expiry_date: record.accessExpiryDate || null,
      access_revoked: Boolean(record.accessRevoked),
      deletion_confirmation_required: Boolean(record.deletionConfirmationRequired),
      release_remarks: record.releaseRemarks || null,
    },
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to save processing record.') };
  return { data, error: null };
}

export async function saveElectronicReleaseLinkRecord(requestId, record) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('save_electronic_release_link', {
    p_request_id: requestId,
    p_record: {
      electronic_release_reference: record.electronicReleaseReference || null,
      released_by: record.releasedBy || null,
      released_by_name: record.releasedByName || null,
      released_at: record.releasedAt || null,
    },
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to save electronic release link.') };
  return { data, error: null };
}

export async function saveClosureRecord(requestId, record) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('save_request_closure', {
    p_request_id: requestId,
    p_record: {
      date_returned: record.dateReturned || null,
      condition_upon_return: record.conditionUponReturn || null,
      is_complete: Boolean(record.isComplete),
      has_damage: Boolean(record.hasDamage),
      has_markings: Boolean(record.hasMarkings),
      missing_pages: Boolean(record.missingPages),
      refiled_location: record.refiledLocation || null,
      access_revoked: Boolean(record.accessRevoked),
      deletion_confirmed: Boolean(record.deletionConfirmed),
      validated_by: record.validatedBy || null,
      validated_by_name: record.validatedByName || null,
      validation_date: record.validationDate || null,
      closure_remarks: record.closureRemarks || null,
      closed_by: record.closedBy || null,
      closed_by_name: record.closedByName || null,
      closed_at: record.closedAt || null,
    },
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to save closure record.') };
  return { data, error: null };
}

export async function saveIncidentRecord(record) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('save_incident_report', {
    p_record: {
      id: record.id || null,
      request_id: record.requestId || null,
      reported_by: record.reportedBy || null,
      reported_by_name: record.reportedByName || null,
      incident_type: record.incidentType || null,
      incident_description: record.incidentDescription || null,
      action_taken: record.actionTaken || null,
      status: record.status || 'Open',
      resolved_by: record.resolvedBy || null,
      resolved_by_name: record.resolvedByName || null,
      resolved_at: record.resolvedAt || null,
      created_at: record.createdAt || null,
    },
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to save incident report.') };
  return { data, error: null };
}

export async function saveRequestRecord(request) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const row = buildRequestRow(request);
  const { data, error } = await supabase.rpc('save_document_request', {
    p_request: row,
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to save request.') };
  return { data, error: null };
}

export async function deleteRequestRecord(requestId) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  const { error } = await supabase.from('document_requests').delete().eq('id', requestId);
  return { error: error ? formatSupabaseError(error, 'Failed to delete request.') : null };
}

export async function saveAuditLogRecord(log) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.from('audit_logs').upsert({
    id: log.id,
    request_id: log.requestId || null,
    user_id: log.userId || null,
    user_name: log.userName || null,
    action: log.action,
    old_status: log.oldStatus || null,
    new_status: log.newStatus || null,
    remarks: log.remarks || null,
    created_at: log.createdAt,
  }, { onConflict: 'id' }).select().single();
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to save audit log.') };
  return { data, error: null };
}

export async function resolveRequestApprover({ requestorRole, branch, confidentialityLevel }) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured.') };
  const { data, error } = await supabase.rpc('resolve_request_approver', {
    p_requestor_role: requestorRole,
    p_branch: normalizeName(branch, ''),
    p_confidentiality: confidentialityLevel,
  });
  if (error) return { data: null, error: formatSupabaseError(error, 'Failed to resolve approver.') };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error: null };
}

export async function syncProcessing(processing) {
  if (!supabase) return;
  const rows = Object.entries(processing).map(([requestId, record]) => ({
    request_id: requestId,
    archivist_id: record.archivistId || null,
    archivist_name: record.archivistName || null,
    date_received: record.dateReceived || null,
    date_released: record.dateReleased || null,
    borrower_name: record.borrowerName || null,
    expected_return_date: record.expectedReturnDate || null,
    physical_condition_before_release: record.physicalConditionBeforeRelease || null,
    storage_location: record.storageLocation || null,
    electronic_release_method: record.electronicReleaseMethod || null,
    electronic_release_reference: record.electronicReleaseReference || null,
    access_expiry_date: record.accessExpiryDate || null,
    access_revoked: Boolean(record.accessRevoked),
    deletion_confirmation_required: Boolean(record.deletionConfirmationRequired),
    release_remarks: record.releaseRemarks || null,
  }));
  await replaceTableRows('archivist_processing', rows, 'request_id');
}

export async function syncClosures(closures) {
  if (!supabase) return;
  const rows = Object.entries(closures).map(([requestId, record]) => ({
    request_id: requestId,
    date_returned: record.dateReturned || null,
    condition_upon_return: record.conditionUponReturn || null,
    is_complete: Boolean(record.isComplete),
    has_damage: Boolean(record.hasDamage),
    has_markings: Boolean(record.hasMarkings),
    missing_pages: Boolean(record.missingPages),
    refiled_location: record.refiledLocation || null,
    access_revoked: Boolean(record.accessRevoked),
    deletion_confirmed: Boolean(record.deletionConfirmed),
    validated_by: record.validatedBy || null,
    validation_date: record.validationDate || null,
    closure_remarks: record.closureRemarks || null,
    closed_by: record.closedBy || null,
    closed_at: record.closedAt || null,
  }));
  await replaceTableRows('request_closures', rows, 'request_id');
}

export async function syncIncidents(incidents) {
  if (!supabase) return;
  const rows = incidents.map((incident) => ({
    id: incident.id,
    request_id: incident.requestId,
    reported_by: incident.reportedBy,
    reported_by_name: incident.reportedByName || null,
    incident_type: incident.incidentType,
    incident_description: incident.incidentDescription,
    action_taken: incident.actionTaken || null,
    status: incident.status,
    resolved_by: incident.resolvedBy || null,
    resolved_at: incident.resolvedAt || null,
  }));
  await replaceTableRows('incident_reports', rows, 'id');
}

export async function syncAuditLogs(auditLogs) {
  if (!supabase) return;
  const rows = auditLogs.map((log) => ({
    id: log.id,
    request_id: log.requestId || null,
    user_id: log.userId || null,
    user_name: log.userName || null,
    action: log.action,
    old_status: log.oldStatus || null,
    new_status: log.newStatus || null,
    remarks: log.remarks || null,
    created_at: log.createdAt,
  }));
  await replaceTableRows('audit_logs', rows, 'id');
}

export async function syncReferenceData({ branches = [], departments = [], categories = [] }) {
  if (!supabase) return;
  await Promise.all([
    replaceReferenceRows('branches', branches.map((name) => ({ name: normalizeName(name), is_active: true }))),
    replaceReferenceRows('departments', departments.map((name) => ({ name: normalizeName(name), is_active: true }))),
    replaceReferenceRows('document_categories', categories.map((name) => ({ name: normalizeName(name), is_active: true }))),
  ]);
}
