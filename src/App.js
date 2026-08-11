import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import './App.css';
import './components/ui/ui.css';
import { supabase, supabaseConfig } from './lib/supabaseClient';
import {
  createUserAccount,
  deleteUserAccount,
  getCurrentSessionUser,
  signInWithEmailPassword,
  signOut as supabaseSignOut,
  loadAdminDashboardData,
  updateOwnProfile,
  updateUserAccount,
} from './lib/supabaseAuth';
import {
  deleteRequestRecord,
  createRequestRecord,
  loadSupabaseAppData,
  normalizeBranchName,
  normalizeRole,
  saveAuditLogRecord,
  saveElectronicReleaseLinkRecord,
  saveClosureRecord,
  saveIncidentRecord,
  loadRequestRecord,
  saveProcessingRecord,
  saveRequestRecord,
  saveReferenceData,
} from './lib/supabaseData';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Select } from './components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';

const roles = {
  requestor: 'STAFF - REQUESTOR',
  branch_head: 'MANAGER - APPROVER OF REQUESTOR',
  department_head: 'HEAD - APPROVER OF REQUESTORS AND MANAGERS',
  dpo: 'ADMIN - DPO',
  ceo: 'ADMIN - CEO',
  archivist: 'ARCHIVIST - PROCESS APPROVED DOCS',
  superadmin: 'SUPER ADMIN - ICT',
};

const adminRoles = ['superadmin', 'ceo', 'dpo'];
const superAdminRoles = ['superadmin'];

const branches = [
  'Barbaza',
  'Culasi',
  'Sibalom',
  'San Jose',
  'Balasan',
  'Barotac Viejo',
  'Caticlan',
  'Molo',
  'Kalibo',
  'Janiuay',
  'Calinog',
  'Sara',
  'Pres. Roxas',
  'Altavas',
];
const departments = [
  'ICT Department',
  'Membership & Marketing Department',
  'Savings & Credit Department',
  'Finance & Accounting Department',
  'Human Resources & Administration Department',
  'Internal Audit Department',
];
const documentCategories = [
  'Member Records',
  'Finance Records',
  'HR Records',
  'Board Records',
  'Compliance Records',
  'ICT Records',
];
const statuses = ['Draft', 'Pending Approval', 'Rejected', 'Approved', 'Forwarded to Archivist', 'Processing', 'Released', 'Returned', 'Access Revoked', 'Deletion Confirmed', 'For Closure', 'Closed', 'Incident Reported', 'Overdue'];
const confidentialityLevels = ['Non Confidential', 'Confidential'];

function readErrorMessage(error, fallbackMessage = 'Something went wrong.') {
  if (!error) return fallbackMessage;
  if (typeof error === 'string') {
    const message = error.trim();
    if (!message || message === '{}' || message === '[object Object]') return fallbackMessage;
    return message;
  }
  if (error instanceof Error) return error.message || fallbackMessage;
  if (typeof error === 'object') {
    const message = error.message || error.error_description || error.details || error.hint;
    if (typeof message === 'string' && message.trim() && message !== '{}' && message !== '[object Object]') {
      return message.trim();
    }
    if (error.status || error.code) {
      return `${fallbackMessage} (${error.status || error.code})`;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // ignore serialization failures
    }
  }
  return fallbackMessage;
}

function normalizeLoadedSettings(settings = {}) {
  return {
    branches: Array.isArray(settings.branches) ? settings.branches : [],
    departments: Array.isArray(settings.departments) ? settings.departments : [],
    categories: Array.isArray(settings.categories) ? settings.categories : [],
  };
}

function normalizeLoadedUsers(users = []) {
  return Array.isArray(users) ? users.map((user) => ({
    ...user,
    password: undefined,
    status: user.status || (user.is_active === false ? 'Inactive' : 'Active'),
    createdAt: user.createdAt || user.created_at || '',
    createdBy: user.createdBy || user.created_by || '',
    createdByName: user.createdByName || user.created_by_name || '',
  })) : [];
}

function mapAuthUserToProfile(user) {
  const metadata = user?.user_metadata || {};
  const name = metadata.full_name || metadata.name || user?.email || 'User';
  const role = normalizeRole(metadata.role || 'requestor');
  const branch = normalizeBranchName(metadata.branch || '');
  const resolvedBranch = branch || (['department_head', 'dpo', 'ceo', 'archivist', 'superadmin'].includes(role) ? 'Head Office' : '');
  return {
    id: user.id,
    name,
    email: user.email || '',
    role,
    branch: resolvedBranch,
    department: metadata.department || '',
    position: metadata.position || '',
    status: metadata.status || 'Active',
    avatar: metadata.avatar_url || getAvatarUrl(name),
    is_active: true,
    avatarCustom: Boolean(metadata.avatar_url),
  };
}

async function loadAuthenticatedProfile(userId) {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, branch, department, position, status, avatar_url, is_active, created_by, created_by_name')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const role = normalizeRole(data.role);
  const branch = normalizeBranchName(data.branch || '');
  const resolvedBranch = branch || (['department_head', 'dpo', 'ceo', 'archivist', 'superadmin'].includes(role) ? 'Head Office' : '');

  return {
    id: data.id,
    name: data.full_name || data.email || 'User',
    email: data.email || '',
    role,
    branch: resolvedBranch,
    department: data.department || '',
    position: data.position || '',
    status: data.status || (data.is_active === false ? 'Inactive' : 'Active'),
    avatar: data.avatar_url || getAvatarUrl(data.full_name || data.email || 'User'),
    is_active: data.is_active !== false,
    avatarCustom: Boolean(data.avatar_url),
    createdAt: '',
    createdBy: data.created_by || '',
    createdByName: data.created_by_name || '',
  };
}

export function getAvatarUrl(name) {
  const palette = { bg1: '#8bd3ff', bg2: '#0f766e', hair: '#172554', shirt: '#1757a7', accent: '#93c5fd' };
  const hair = '<path d="M35 50c5-18 21-28 39-21 11 4 18 12 20 25-15-5-30-7-59-4z" fill="' + palette.hair + '"/>';
  const face = '<circle cx="64" cy="61" r="26" fill="#ffd7ba"/><circle cx="54" cy="61" r="3" fill="#1f2937"/><circle cx="74" cy="61" r="3" fill="#1f2937"/><path d="M55 75c6 5 13 5 19 0" stroke="#9f1239" stroke-width="4" stroke-linecap="round" fill="none"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${palette.bg1}"/><stop offset="1" stop-color="${palette.bg2}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#bg)"/><circle cx="98" cy="28" r="12" fill="${palette.accent}" opacity=".72"/>${hair}${face}<path d="M26 126c6-25 20-39 38-39s32 14 38 39H26z" fill="${palette.shirt}"/><path d="M53 90h22l-11 14-11-14z" fill="#fff" opacity=".88"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PROFILE_AVATAR_BUCKETS = ['profile-avatars'];

function buildAvatarStoragePath(userId, file) {
  const extension = String(file?.name || '')
    .split('.')
    .pop()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'png';
  const token = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${userId}/${token}.${extension}`;
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

async function uploadAvatarToStorage({ userId, file }) {
  if (!supabase || !userId || !file) {
    return { data: null, error: new Error('Supabase is not configured.') };
  }

  const storagePath = buildAvatarStoragePath(userId, file);
  let lastError = null;

  for (const bucketName of PROFILE_AVATAR_BUCKETS) {
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      lastError = uploadError;
      const bucketMissing = /bucket not found/i.test(String(uploadError.message || ''));
      if (bucketMissing) {
        continue;
      }
      return { data: null, error: uploadError };
    }

    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(storagePath);

    return {
      data: {
        avatarUrl: data?.publicUrl || '',
        storagePath,
        bucketName,
      },
      error: null,
    };
  }

  return {
    data: null,
    error: lastError || new Error('No avatar storage bucket is available.'),
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hasOpenIncident(request, incidents = []) {
  return incidents.some((incident) => incident.requestId === request.id && !['Resolved', 'Closed'].includes(incident.status));
}

function canCloseRequest(request, processing, closure, incidents = []) {
  if (hasOpenIncident(request, incidents)) return false;
  if (request.documentType === 'Physical') {
    return Boolean(closure.dateReturned && closure.conditionUponReturn && closure.refiledLocation && closure.isComplete && !closure.hasDamage && !closure.hasMarkings && !closure.missingPages);
  }
  if (processing.deletionConfirmationRequired) return Boolean(closure.deletionConfirmed && closure.validatedBy && closure.validationDate);
  return Boolean(closure.accessRevoked || closure.deletionConfirmed);
}

function isOverdue(request, processing) {
  const dueDate = processing?.expectedReturnDate || request.borrowReturnDueDate;
  return request.documentType === 'Physical' && request.status !== 'Closed' && request.status !== 'Returned' && dueDate && dueDate < today();
}

function hasDueDateWarning(request) {
  return (request.computedStatus || request.status) === 'Overdue';
}

function getStatusBadgeVariant(status) {
  if (['Pending Approval', 'For Closure'].includes(status)) return 'warning';
  if (['Approved', 'Forwarded to Archivist', 'Access Revoked', 'Deletion Confirmed'].includes(status)) return 'success';
  if (status === 'Closed') return 'neutral';
  if (['Rejected', 'Overdue', 'Incident Reported'].includes(status)) return 'danger';
  if (status === 'Processing') return 'info';
  if (['Released', 'Returned'].includes(status)) return 'purple';
  return 'neutral';
}

function isPathAllowed(path, role) {
  const rules = [
    { test: /^\/dashboard$/, roles: Object.keys(roles) },
    { test: /^\/requests\/new$/, roles: ['requestor', 'branch_head', 'department_head', 'superadmin'] },
    { test: /^\/requests\/my$/, roles: ['requestor', 'branch_head', 'department_head'] },
    { test: /^\/requests\/all$/, roles: ['dpo', 'ceo', 'superadmin'] },
    { test: /^\/requests\/[^/]+(\/closure)?$/, roles: Object.keys(roles) },
    { test: /^\/approvals$/, roles: ['branch_head', 'department_head', 'dpo', 'ceo', 'superadmin'] },
    { test: /^\/archivist(\/[^/]+\/process)?$/, roles: ['archivist', 'superadmin'] },
    { test: /^\/incidents(\/new)?$/, roles: ['archivist', 'superadmin', 'dpo', 'ceo'] },
    { test: /^\/reports$/, roles: ['branch_head', 'department_head', 'dpo', 'ceo', 'archivist', 'superadmin'] },
    { test: /^\/users$/, roles: superAdminRoles },
    { test: /^\/settings$/, roles: superAdminRoles },
    { test: /^\/audit-logs$/, roles: superAdminRoles },
  ];
  return rules.some((rule) => rule.test.test(path) && rule.roles.includes(role));
}

function canViewReleaseReferences(user, request) {
  return request.requestorId === user.id || user.role === 'archivist' || user.role === 'superadmin';
}

function validateRequestForm(form) {
  const errors = [];
  if (!form.documentTitle?.trim()) errors.push('Document title is required.');
  if (!form.documentType) errors.push('Document type is required.');
  if (!form.purpose?.trim()) errors.push('Purpose of retrieval is required.');
  if (!form.dateNeeded) errors.push('Date needed is required.');
  if (!form.borrowReturnDueDate) errors.push('Return due date is required.');
  if (form.dateNeeded && form.dateNeeded < today()) errors.push('Date needed cannot be earlier than today.');
  if (form.borrowReturnDueDate && form.borrowReturnDueDate < today()) errors.push('Return due date cannot be earlier than today.');
  if (form.dateNeeded && form.borrowReturnDueDate && form.borrowReturnDueDate < form.dateNeeded) errors.push('Return due date cannot be earlier than date needed.');
  if (!form.confidentialityLevel) errors.push('Confidentiality level is required.');
  if (!confidentialityLevels.includes(form.confidentialityLevel)) errors.push('Confidentiality level must be Confidential or Non Confidential.');
  if (!form.agreementAccepted) errors.push('Agreement checkbox must be accepted.');
  return errors;
}

function resolveRequestBranch(currentUser, formBranch = '') {
  const savedBranch = normalizeBranchName(currentUser?.branch || '');
  if (savedBranch) return savedBranch;
  const branch = normalizeBranchName(formBranch || '');
  if (branch) return branch;
  if (['department_head', 'dpo', 'ceo', 'archivist', 'superadmin'].includes(normalizeRole(currentUser?.role))) {
    return 'Head Office';
  }
  return '';
}

function resolveLocalRequestApprover(currentUser, users = [], branch = '', confidentialityLevel = 'Normal') {
  const requestorRole = normalizeRole(currentUser?.role);
  const normalizedBranch = normalizeBranchName(branch || currentUser?.branch || '');
  const normalizedConfidentiality = confidentialityLevel === 'Non Confidential' ? 'Normal' : confidentialityLevel || 'Normal';
  const activeUsers = Array.isArray(users) ? users.filter((user) => user && user.is_active !== false) : [];
  const findUser = (role, roleBranch = '') => activeUsers.find((user) => {
    if (normalizeRole(user.role) !== role) return false;
    if (!roleBranch) return true;
    return normalizeBranchName(user.branch) === roleBranch;
  }) || null;

  let targetRole = 'branch_head';
  if (normalizedConfidentiality === 'Confidential') {
    targetRole = 'dpo';
  } else if (requestorRole === 'branch_head') {
    targetRole = 'department_head';
  } else if (requestorRole === 'department_head') {
    targetRole = 'ceo';
  } else if (requestorRole === 'dpo' || requestorRole === 'ceo') {
    targetRole = 'superadmin';
  } else if (normalizedBranch === 'Head Office') {
    targetRole = 'department_head';
  }

  if (targetRole === 'branch_head') {
    return findUser('branch_head', normalizedBranch);
  }

  if (targetRole === 'dpo') {
    return findUser('dpo') || findUser('ceo') || findUser('superadmin');
  }

  if (targetRole === 'ceo') {
    return findUser('ceo') || findUser('superadmin');
  }

  if (targetRole === 'superadmin') {
    return findUser('superadmin') || findUser('ceo');
  }

  return findUser('department_head') || findUser('superadmin');
}

function getRequestorRole(request, users = []) {
  return normalizeRole(users.find((user) => user.id === request.requestorId)?.role || 'requestor');
}

function getAccessibleRequestsForUser(user, requests, users = []) {
  const role = normalizeRole(user?.role);
  if (!user) return [];
  if (['superadmin', 'archivist', 'dpo', 'ceo'].includes(role)) return requests;
  if (role === 'branch_head') {
    const branch = normalizeBranchName(user.branch);
    return requests.filter((request) => request.requestorId === user.id || (branch && normalizeBranchName(request.branch) === branch));
  }
  if (role === 'department_head') {
    const branch = normalizeBranchName(user.branch);
    return requests.filter((request) => {
      const requestorRole = getRequestorRole(request, users);
      return request.requestorId === user.id
        || requestorRole === 'branch_head'
        || normalizeBranchName(request.branch) === 'Head Office'
        || (branch && normalizeBranchName(request.branch) === branch);
    });
  }
  return requests.filter((request) => request.requestorId === user.id);
}

function canManageRequestFromList(user, request) {
  return normalizeRole(user?.role) === 'requestor'
    && request.requestorId === user?.id
    && ['Draft', 'Returned'].includes(request.status);
}

async function loadDashboardState(profile) {
  if (normalizeRole(profile?.role) === 'superadmin' && supabaseConfig.isConfigured && supabase) {
    const { data, error } = await loadAdminDashboardData();
    if (!error && data) {
      return data;
    }
    if (error) {
      const message = readErrorMessage(error);
      if (!/failed to fetch/i.test(message)) {
        console.error('Super admin dashboard load failed:', message);
      }
    }
  }
  return loadSupabaseAppData().catch(() => null);
}

function getInjectedTestSessionProfile() {
  if (typeof window === 'undefined') return null;
  return window.__TEST_SESSION_PROFILE__ || null;
}

function App() {
  const injectedTestSessionProfile = getInjectedTestSessionProfile();
  const [users, setUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(() => injectedTestSessionProfile?.id || '');
  const [path, setPathState] = useState('/dashboard');
  const [theme, setTheme] = useState('dark');
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [requestDetailOverride, setRequestDetailOverride] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathHistoryRef = useRef([]);
  const [requests, setRequests] = useState([]);
  const [processing, setProcessing] = useState({});
  const [electronicReleaseLinks, setElectronicReleaseLinks] = useState({});
  const [closures, setClosures] = useState({});
  const [settingsSnapshot, setSettingsSnapshot] = useState({ branches: [], departments: [], categories: [] });
  const [incidents, setIncidents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [authReady, setAuthReady] = useState(() => Boolean(injectedTestSessionProfile));
  const [isHydrated, setIsHydrated] = useState(false);
  const [sessionProfile, setSessionProfile] = useState(() => injectedTestSessionProfile);
  const [loadDiagnostics, setLoadDiagnostics] = useState({ loadErrors: [], counts: {} });
  const manualLogoutRef = useRef(false);
  const currentUser = users.find((user) => user.id === currentUserId) || sessionProfile || null;
  const currentRole = normalizeRole(currentUser?.role);
  const isSuperAdmin = currentRole === 'superadmin';
  const visibleLoadWarnings = useMemo(
    () => (Array.isArray(loadDiagnostics.loadErrors) ? loadDiagnostics.loadErrors : [])
      .filter((message) => !/failed to fetch/i.test(String(message))),
    [loadDiagnostics.loadErrors],
  );
  const setPath = useCallback((nextPath, options = {}) => {
    setPathState((currentPath) => {
      const resolvedPath = typeof nextPath === 'function' ? nextPath(currentPath) : nextPath;
      if (!resolvedPath || resolvedPath === currentPath) return currentPath;
      if (options.replace) {
        pathHistoryRef.current = pathHistoryRef.current.filter((item) => item !== resolvedPath);
      } else {
        pathHistoryRef.current = [...pathHistoryRef.current, currentPath].slice(-25);
      }
      return resolvedPath;
    });
  }, []);

  const goBack = useCallback(() => {
    setPathState((currentPath) => {
      const history = [...pathHistoryRef.current];
      let previousPath = history.pop();
      while (previousPath === currentPath) {
        previousPath = history.pop();
      }
      pathHistoryRef.current = history;
      return previousPath || '/dashboard';
    });
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    let subscription;

    const applyLoadedData = async (data) => {
      if (cancelled) return;
      setUsers(normalizeLoadedUsers(data.users || []));
      setRequests(data.requests || []);
      setProcessing(data.processing || {});
      setElectronicReleaseLinks(data.electronicReleaseLinks || {});
      setClosures(data.closures || {});
      setIncidents(data.incidents || []);
      setAuditLogs(data.auditLogs || []);
      setSettingsSnapshot(normalizeLoadedSettings(data.settings || {
        branches: data.branches,
        departments: data.departments,
        categories: data.categories,
      }));
      setLoadDiagnostics({
        loadErrors: Array.isArray(data?.diagnostics?.loadErrors) ? data.diagnostics.loadErrors : [],
        counts: data?.diagnostics?.counts || {},
      });
      setIsHydrated(true);
      setAuthReady(true);
    };

    const init = async () => {
      if (typeof window !== 'undefined' && window.__TEST_SESSION_PROFILE__) {
        const profile = window.__TEST_SESSION_PROFILE__;
        setCurrentUserId(profile.id || '');
        setSessionProfile(profile);
        setUsers((items) => {
          const filtered = items.filter((item) => item.id !== profile.id);
          return [profile, ...filtered];
        });
        setAuthReady(true);
        setIsHydrated(true);
        return;
      }
      if (!supabase) {
        setAuthReady(true);
        setIsHydrated(true);
        return;
      }
      const { user } = await getCurrentSessionUser();
      if (cancelled) return;
      let loadedProfile = null;
      if (user?.id) {
        setCurrentUserId(user.id);
        loadedProfile = await loadAuthenticatedProfile(user.id).catch(() => null);
        if (cancelled) return;
        const profile = loadedProfile || mapAuthUserToProfile(user);
        setSessionProfile(profile);
        setUsers((items) => {
          const filtered = items.filter((item) => item.id !== profile.id);
          return [profile, ...filtered];
        });
      }
      if (!user?.id) {
        setAuthReady(true);
        setIsHydrated(true);
        return;
      }
      const databaseState = await loadDashboardState(loadedProfile || mapAuthUserToProfile(user));
      if (cancelled) return;
      if (!databaseState) {
        await applyLoadedData({
          users: [],
          requests: [],
          processing: {},
          electronicReleaseLinks: {},
          closures: {},
          incidents: [],
          auditLogs: [],
          settings: normalizeLoadedSettings({}),
          branches: [],
          departments: [],
          categories: [],
          diagnostics: { loadErrors: ['Failed to load Supabase data.'], counts: {} },
        });
        if (loadedProfile) {
          setUsers((items) => {
            const filtered = items.filter((item) => item.id !== loadedProfile.id);
            return [loadedProfile, ...filtered];
          });
        }
        return;
      }
      await applyLoadedData({
        ...databaseState,
        users: normalizeLoadedUsers(databaseState.users || []),
        branches: Array.isArray(databaseState.branches) ? databaseState.branches : [],
        departments: Array.isArray(databaseState.departments) ? databaseState.departments : [],
        categories: Array.isArray(databaseState.categories) ? databaseState.categories : [],
      });
      if (Array.isArray(databaseState?.diagnostics?.loadErrors) && databaseState.diagnostics.loadErrors.length) {
        const warnings = databaseState.diagnostics.loadErrors.filter((message) => !/failed to fetch/i.test(String(message)));
        if (warnings.length) {
          console.error('Supabase load warnings:', warnings);
        }
      }
      if (loadedProfile) {
        setUsers((items) => {
          const filtered = items.filter((item) => item.id !== loadedProfile.id);
          return [loadedProfile, ...filtered];
        });
      }
    };

    init();

    if (supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (cancelled) return;
        if (session?.user?.id) {
          manualLogoutRef.current = false;
          setCurrentUserId(session.user.id);
          const loadedProfile = await loadAuthenticatedProfile(session.user.id).catch(() => null);
          if (cancelled) return;
          const profile = loadedProfile || mapAuthUserToProfile(session.user);
          setSessionProfile(profile);
          setUsers((items) => {
            const filtered = items.filter((item) => item.id !== profile.id);
            return [profile, ...filtered];
          });

          const databaseState = await loadDashboardState(profile);
          if (cancelled) return;
          if (!databaseState) {
            await applyLoadedData({
              users: [],
              requests: [],
              processing: {},
              electronicReleaseLinks: {},
              closures: {},
              incidents: [],
              auditLogs: [],
              settings: normalizeLoadedSettings({}),
              branches: [],
              departments: [],
              categories: [],
              diagnostics: { loadErrors: ['Failed to load Supabase data.'], counts: {} },
            });
            return;
          }

          await applyLoadedData({
            ...databaseState,
            users: normalizeLoadedUsers(databaseState.users || []),
            branches: Array.isArray(databaseState.branches) ? databaseState.branches : [],
            departments: Array.isArray(databaseState.departments) ? databaseState.departments : [],
            categories: Array.isArray(databaseState.categories) ? databaseState.categories : [],
          });
          if (Array.isArray(databaseState?.diagnostics?.loadErrors) && databaseState.diagnostics.loadErrors.length) {
            const warnings = databaseState.diagnostics.loadErrors.filter((message) => !/failed to fetch/i.test(String(message)));
            if (warnings.length) {
              console.error('Supabase load warnings:', warnings);
            }
          }
          setUsers((items) => {
            const filtered = items.filter((item) => item.id !== profile.id);
            return [profile, ...filtered];
          });
          return;
        }
        if (!manualLogoutRef.current) {
          return;
        }
        manualLogoutRef.current = false;
        setCurrentUserId('');
        setSessionProfile(null);
        setUsers([]);
        setRequests([]);
        setProcessing({});
        setClosures({});
        setIncidents([]);
        setAuditLogs([]);
        setSettingsSnapshot({ branches: [], departments: [], categories: [] });
        setLoadDiagnostics({ loadErrors: [], counts: {} });
        setAuthReady(true);
        setIsHydrated(true);
      });
      subscription = data.subscription;
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated || !supabase || !currentUserId) return undefined;

    const refreshRequestsFromDatabase = async () => {
      const databaseState = await loadDashboardState(currentUser);
      if (!databaseState) return;
      setRequests(databaseState.requests || []);
      setProcessing(databaseState.processing || {});
      setClosures(databaseState.closures || {});
      setIncidents(databaseState.incidents || []);
      setAuditLogs(databaseState.auditLogs || []);
      if (isSuperAdmin) {
        setUsers(normalizeLoadedUsers(databaseState.users || []));
      }
    };

    const channel = supabase
      .channel(`document_requests_realtime_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
        void refreshRequestsFromDatabase();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isHydrated, currentUserId, currentUser, isSuperAdmin]);

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    window.__setAppPath = setPath;
    window.__goBackAppPath = goBack;
    return () => {
      window.__setAppPath = null;
      window.__goBackAppPath = null;
    };
  }, [theme, setPath, goBack]);

  const addAuditLog = async (requestId, action, oldStatus, newStatus, remarks = '') => {
    if (!currentUser) return;
    const entry = { id: crypto.randomUUID(), requestId, userId: currentUser.id, userName: currentUser.name, action, oldStatus, newStatus, remarks, createdAt: new Date().toLocaleString() };
    setAuditLogs((logs) => [entry, ...logs]);
    if (supabaseConfig.isConfigured && supabase) {
      try {
        const { error } = await saveAuditLogRecord(entry);
        if (error) console.error('Failed to save audit log:', readErrorMessage(error));
      } catch (error) {
        console.error('Failed to save audit log:', readErrorMessage(error));
      }
    }
  };

  const updateRequestStatus = async (requestId, newStatus, action, remarks = '', patch = {}) => {
    const target = requests.find((item) => item.id === requestId);
    if (!target) return false;
    const nextItem = { ...target, ...patch, status: newStatus };
    if (!supabaseConfig.isConfigured || !supabase) {
      console.error('Failed to save request status: Supabase is not configured.');
      return false;
    }
    const { error } = await saveRequestRecord(nextItem);
    if (error) {
      console.error('Failed to save request status:', error);
      return false;
    }
    setRequests((items) => items.map((item) => (item.id === requestId ? nextItem : item)));
    void addAuditLog(requestId, action, target.status, newStatus, remarks);
    return true;
  };

  const submitRequest = async (form, requestId = null) => {
    const validationErrors = validateRequestForm(form);
    if (validationErrors.length) return validationErrors;
    const target = requestId ? requests.find((item) => item.id === requestId) : null;
    if (requestId && !['Draft', 'Returned'].includes(target?.status)) {
      return ['Only draft or returned requests can be edited.'];
    }

    if (requestId) {
      const nextApprover = resolveLocalRequestApprover(currentUser, users, resolveRequestBranch(currentUser, form.branch), form.confidentialityLevel);
      if (!nextApprover && normalizeRole(currentUser?.role) === 'requestor') {
        return [`No Branch Head available for ${resolveRequestBranch(currentUser, form.branch) || 'this branch'}.`];
      }
      const nextItem = target ? {
        ...target,
        ...form,
        requestorId: currentUser.id,
        requestorName: currentUser.name,
        requestorRole: currentUser.role,
        branch: resolveRequestBranch(currentUser, form.branch),
        department: form.department || currentUser.department,
        position: currentUser.position,
        status: 'Pending Approval',
        assignedArchivistId: '',
        assignedArchivistName: '',
        currentApprover: nextApprover?.id || target.currentApprover || '',
        currentApproverName: nextApprover?.name || target.currentApproverName || '',
      } : null;
      if (nextItem && supabaseConfig.isConfigured && supabase) {
        const { data, error } = await saveRequestRecord(nextItem);
        if (error) {
          console.error('Failed to save updated request:', readErrorMessage(error));
          return [readErrorMessage(error, 'Save request failed.')];
        }
        if (data) {
      nextItem.currentApprover = data.current_approver_id || nextItem.currentApprover || '';
      nextItem.currentApproverName = data.current_approver_name || nextItem.currentApproverName || '';
          nextItem.branch = data.branch || nextItem.branch;
          nextItem.requestNo = data.request_no || nextItem.requestNo;
        }
      }
      if (nextItem) {
        setRequests((items) => items.map((item) => (item.id === requestId ? nextItem : item)));
      }
      void addAuditLog(requestId, target?.status === 'Returned' ? 'Responded to clarification' : 'Updated request', target?.status || 'Updated', 'Pending Approval', form.purpose);
      setEditingRequestId(null);
      setPath(`/requests/${requestId}`);
      return [];
    }

    const next = {
      ...form,
      id: crypto.randomUUID(),
      requestNo: '',
      requestorId: currentUser.id,
      requestorName: currentUser.name,
      requestorRole: currentUser.role,
      requestDate: today(),
      branch: resolveRequestBranch(currentUser, form.branch),
      department: form.department || currentUser.department,
      position: currentUser.position,
      assignedArchivistId: '',
      assignedArchivistName: '',
      status: 'Pending Approval',
    };
    const nextApprover = resolveLocalRequestApprover(currentUser, users, next.branch, next.confidentialityLevel);
    if (!nextApprover && normalizeRole(currentUser?.role) === 'requestor') {
      return [`No Branch Head available for ${next.branch || 'this branch'}.`];
    }
    next.currentApprover = nextApprover?.id || '';
    next.currentApproverName = nextApprover?.name || '';
    if (!supabaseConfig.isConfigured || !supabase) {
      return ['Supabase is not configured. Check the deployed environment variables before submitting a request.'];
    }
    const { data, error } = await createRequestRecord(next);
    if (error) {
      console.error('Failed to save request:', readErrorMessage(error));
      return [readErrorMessage(error, 'Submit request failed.')];
    }
    next.requestNo = data?.request_no || data?.requestNo || next.requestNo;
    next.currentApprover = data?.current_approver_id || next.currentApprover || '';
    next.currentApproverName = data?.current_approver_name || next.currentApproverName || '';
    next.branch = data?.branch || next.branch;
    setRequests((items) => [next, ...items]);
    void addAuditLog(next.id, 'Submitted request', 'Draft', 'Pending Approval', next.purpose);
    setPath(`/requests/${next.id}`);
    return [];
  };

  const saveDraftRequest = async (form, requestId = null) => {
    if (!currentUser) return ['No active user session.'];
    const target = requestId ? requests.find((item) => item.id === requestId) : null;
    if (requestId && !['Draft', 'Returned'].includes(target?.status)) {
      return ['Only draft or returned requests can be edited.'];
    }
    const draftPayload = {
      ...form,
      requestorId: currentUser.id,
      requestorName: currentUser.name,
      requestorRole: currentUser.role,
      branch: resolveRequestBranch(currentUser, form.branch),
      department: form.department || currentUser.department,
      position: currentUser.position,
      assignedArchivistId: '',
      assignedArchivistName: '',
      status: 'Draft',
    };

    if (requestId) {
      const nextItem = target ? { ...target, ...draftPayload } : null;
      if (!supabaseConfig.isConfigured || !supabase) {
        return ['Supabase is not configured. Check the deployed environment variables before saving a draft.'];
      }
      if (nextItem) {
        const { data, error } = await saveRequestRecord(nextItem);
        if (error) {
          console.error('Failed to save draft request:', readErrorMessage(error));
          return [readErrorMessage(error, 'Save draft failed.')];
        }
        if (data) {
          nextItem.currentApprover = data.current_approver_id || nextItem.currentApprover || '';
          nextItem.currentApproverName = data.current_approver_name || nextItem.currentApproverName || '';
          nextItem.branch = data.branch || nextItem.branch;
        }
      }
      if (nextItem) setRequests((items) => items.map((item) => (item.id === requestId ? nextItem : item)));
      void addAuditLog(requestId, target?.status === 'Returned' ? 'Saved clarification draft' : 'Saved draft', target?.status || 'Draft', 'Draft', form.purpose || 'Draft saved');
      setEditingRequestId(null);
      setPath('/requests/my');
      return [];
    }

    const next = {
      ...draftPayload,
      id: crypto.randomUUID(),
      requestNo: '',
      requestDate: today(),
    };
    if (draftPayload.status !== 'Draft') {
      const nextApprover = resolveLocalRequestApprover(currentUser, users, next.branch, next.confidentialityLevel);
      next.currentApprover = nextApprover?.id || '';
      next.currentApproverName = nextApprover?.name || '';
    }
    if (!supabaseConfig.isConfigured || !supabase) {
      return ['Supabase is not configured. Check the deployed environment variables before saving a draft.'];
    }
    const { data, error } = await createRequestRecord(next);
    if (error) {
      console.error('Failed to save draft request:', readErrorMessage(error));
      return [readErrorMessage(error, 'Save draft failed.')];
    }
    next.requestNo = data?.request_no || data?.requestNo || next.requestNo;
    next.currentApprover = data?.current_approver_id || next.currentApprover || '';
    next.currentApproverName = data?.current_approver_name || next.currentApproverName || '';
    setRequests((items) => [next, ...items]);
    void addAuditLog(next.id, 'Saved draft', 'Draft', 'Draft', next.purpose || 'Draft saved');
    setPath('/requests/my');
    return [];
  };

  const withdrawRequest = async (requestId) => {
    const target = requests.find((item) => item.id === requestId);
    if (!target || !['Draft', 'Pending Approval'].includes(target.status)) return;
    await updateRequestStatus(requestId, 'Draft', 'Returned to draft by requestor', target.documentTitle || 'Request kept for audit trail');
    setEditingRequestId(null);
    setPath('/requests/my');
  };

  const deleteOwnRequest = async (requestId) => {
    const target = requests.find((item) => item.id === requestId);
    if (!target || target.requestorId !== currentUser.id) return;
    if (supabaseConfig.isConfigured && supabase) {
      const { error } = await deleteRequestRecord(requestId);
      if (error) {
        console.error('Failed to delete request:', error);
        return;
      }
    }
    setRequests((items) => items.filter((item) => item.id !== requestId));
    setProcessing((records) => Object.fromEntries(Object.entries(records).filter(([id]) => id !== requestId)));
    setClosures((records) => Object.fromEntries(Object.entries(records).filter(([id]) => id !== requestId)));
    setIncidents((items) => items.filter((item) => item.requestId !== requestId));
    void addAuditLog(requestId, 'Deleted own request', target.status, 'Deleted', target.documentTitle);
    if (editingRequestId === requestId) setEditingRequestId(null);
    setPath('/requests/my');
  };

  const updateCurrentUserProfile = async (patch) => {
    const name = String(patch.name || '').trim();
    const avatarFile = patch.avatarFile || null;
    let avatar = patch.avatarCustom ? String(patch.avatar || '').trim() : getAvatarUrl(name);
    const canEditSensitiveProfileFields = normalizeRole(currentUser.role) === 'superadmin';
    const email = canEditSensitiveProfileFields ? String(patch.email || '').trim().toLowerCase() : String(currentUser.email || '').trim().toLowerCase();
    const currentPassword = canEditSensitiveProfileFields ? String(patch.currentPassword || '').trim() : '';
    const newPassword = canEditSensitiveProfileFields ? String(patch.newPassword || '').trim() : '';

    const errors = [];
    if (!name) errors.push('Full name is required.');
    if (canEditSensitiveProfileFields) {
      if (!email) errors.push('Email is required.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');
      if (newPassword && newPassword.length < 6) errors.push('New password must be at least 6 characters long.');
      if (patch.confirmPassword !== undefined && newPassword !== String(patch.confirmPassword || '').trim()) errors.push('New password and confirmation do not match.');
    }

    const nextEmail = email || currentUser.email;
    const emailChanged = nextEmail.toLowerCase() !== String(currentUser.email || '').trim().toLowerCase();
    const passwordChanged = Boolean(newPassword);
    if (canEditSensitiveProfileFields && (emailChanged || passwordChanged) && !currentPassword) {
      errors.push('Current password is required to change your email or password.');
    }
    if (errors.length > 0) {
      return { errors };
    }

    if (avatarFile) {
      const fallbackAvatar = await readFileAsDataUrl(avatarFile);
      if (supabaseConfig.isConfigured && supabase) {
        const { data: uploadedAvatar, error: uploadError } = await uploadAvatarToStorage({
          userId: currentUser.id,
          file: avatarFile,
        });

        if (uploadError) {
          console.warn('Profile avatar upload failed, saving inline fallback instead:', uploadError);
          avatar = fallbackAvatar;
        } else {
          avatar = uploadedAvatar?.avatarUrl || avatar;
        }
      } else {
        avatar = fallbackAvatar;
      }
    }

    const nextProfile = {
      full_name: name,
      ...(canEditSensitiveProfileFields ? { email } : {}),
      avatar_url: patch.avatarCustom || avatarFile ? avatar : null,
      ...(canEditSensitiveProfileFields ? { current_password: currentPassword, new_password: newPassword } : {}),
    };

    if (supabaseConfig.isConfigured && supabase) {
      const { data, error } = await updateOwnProfile({
        userId: currentUser.id,
        profile: nextProfile,
      });
      if (error) return { errors: [readErrorMessage(error, 'Update profile failed.')] };

      const updatedProfile = data?.profile;
      const refreshedAvatar = updatedProfile?.avatar_url || (updatedProfile?.full_name ? getAvatarUrl(updatedProfile.full_name) : avatar);
      setUsers((items) => items.map((user) => {
        if (user.id !== currentUser.id) return user;
        return {
          ...user,
          name: updatedProfile?.full_name || name,
          email: updatedProfile?.email || email,
          avatar: refreshedAvatar,
          avatarCustom: Boolean(updatedProfile?.avatar_url),
        };
      }));

      return {
        errors: [],
        successMessage: data?.passwordChanged
          ? 'Profile updated. Please sign in again with your new password.'
          : 'Profile updated successfully.',
        requiresRelogin: Boolean(data?.passwordChanged),
      };
    }

    setUsers((items) => items.map((user) => {
      if (user.id !== currentUser.id) return user;
      return {
        ...user,
        name,
        email,
        avatar,
        avatarCustom: Boolean(patch.avatarCustom),
      };
    }));
    setSessionProfile((profile) => profile && profile.id === currentUser.id ? {
      ...profile,
      name,
      email,
      avatar,
    } : profile);
    return {
      errors: [],
      successMessage: 'Profile updated successfully.',
      requiresRelogin: false,
    };
  };

  const visibleRequests = useMemo(() => requests.map((request) => {
    const record = processing[request.id];
    return isOverdue(request, record) ? { ...request, computedStatus: 'Overdue' } : request;
  }), [requests, processing]);

  const route = path.split('/').filter(Boolean);
  const routeSection = route[0] || '';
  const routeRequestId = routeSection === 'requests' || routeSection === 'archivist' ? route[1] : route[0];
  const selectedRequest = requests.find((request) => request.id === routeRequestId) || requestDetailOverride;
  const allowedPath = currentUser ? isPathAllowed(path, currentUser.role) : false;

  useEffect(() => {
    let cancelled = false;

    if (!allowedPath || !routeRequestId || !['requests', 'archivist'].includes(routeSection)) {
      setRequestDetailOverride(null);
      return undefined;
    }

    if (requests.some((request) => request.id === routeRequestId)) {
      setRequestDetailOverride(null);
      return undefined;
    }

    if (!supabaseConfig.isConfigured || !supabase || !currentUser) {
      return undefined;
    }

    const loadMissingRequest = async () => {
      const { data, error } = await loadRequestRecord(routeRequestId);
      if (cancelled) return;
      if (error || !data) {
        setRequestDetailOverride(null);
        if (error) {
          console.error('Failed to load request detail:', readErrorMessage(error));
        }
        return;
      }

      setRequestDetailOverride(data);
      setRequests((items) => (items.some((item) => item.id === data.id) ? items : [data, ...items]));
    };

    void loadMissingRequest();

    return () => {
      cancelled = true;
    };
  }, [allowedPath, currentUser, requests, routeRequestId, routeSection]);

  if (!authReady || !currentUser || path === '/login') {
    return (
      <Login
        isConfigured={supabaseConfig.isConfigured}
        onLogin={async (email, password) => {
          if (!supabase) return ['Supabase is not configured.'];
          const { error, data } = await signInWithEmailPassword(email, password);
          if (error) return [readErrorMessage(error, 'Login failed.')];
          if (data?.user?.id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('status')
              .eq('id', data.user.id)
              .maybeSingle();
            if (profileData?.status === 'Inactive') {
              await supabaseSignOut();
              return ['This account is inactive. Please contact the super admin.'];
            }
            setCurrentUserId(data.user.id);
            setSessionProfile(mapAuthUserToProfile(data.user));
            setUsers((items) => {
              const nextUser = mapAuthUserToProfile(data.user);
              return items.some((item) => item.id === nextUser.id) ? items.map((item) => (item.id === nextUser.id ? { ...item, ...nextUser } : item)) : [nextUser, ...items];
            });
          }
          setAuthReady(true);
          setIsHydrated(true);
          setPath('/dashboard', { replace: true });
          return [];
        }}
      />
    );
  }

  const scopedRequests = getAccessibleRequestsForUser(currentUser, visibleRequests, users);
  const pageProps = { currentUser, users, requests: visibleRequests, rawRequests: requests, processing, electronicReleaseLinks, closures, incidents, auditLogs, setPath, submitRequest, updateRequestStatus, addAuditLog, setProcessing, setClosures, setIncidents, editingRequestId, setEditingRequestId, settingsSnapshot, departmentsList: settingsSnapshot.departments || departments, theme };

  return (
    <div className={`app-shell ${theme} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <Sidebar user={currentUser} path={path} setPath={setPath} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="workspace">
        {visibleLoadWarnings.length > 0 && (
          <div className="ui-alert ui-alert--warning">
            <strong>Supabase load warning:</strong>
            <div>{visibleLoadWarnings.join(' ')}</div>
          </div>
        )}
        <Header user={currentUser} onLogout={async () => { manualLogoutRef.current = true; await supabaseSignOut(); setCurrentUserId(''); setSessionProfile(null); setPath('/login', { replace: true }); }} onUpdateProfile={updateCurrentUserProfile} theme={theme} setTheme={setTheme} isMobileMenuOpen={isMobileMenuOpen} onMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)} />
        {!allowedPath && <RoleDenied setPath={setPath} />}
        {allowedPath && path === '/dashboard' && <Dashboard {...pageProps} />}
        {allowedPath && path === '/requests/new' && <NewRequest {...pageProps} editingRequestId={editingRequestId} setEditingRequestId={setEditingRequestId} saveDraftRequest={saveDraftRequest} />}
        {allowedPath && path === '/requests/my' && <RequestList title={currentUser.role === 'branch_head' ? 'Branch Requests' : currentUser.role === 'department_head' ? 'Department Requests' : 'My Requests'} requests={scopedRequests} setPath={setPath} currentUser={currentUser} allowManage={currentUser.role === 'requestor'} onEditRequest={(request) => { setEditingRequestId(request.id); setPath('/requests/new'); }} onWithdrawRequest={withdrawRequest} onDeleteRequest={deleteOwnRequest} />}
        {allowedPath && path === '/requests/all' && <RequestList title="All Requests" requests={visibleRequests} setPath={setPath} currentUser={currentUser} />}
        {allowedPath && route[0] === 'requests' && route[1] && route[2] !== 'closure' && <RequestDetails request={selectedRequest} {...pageProps} />}
        {allowedPath && route[0] === 'requests' && route[2] === 'closure' && <ClosurePage request={selectedRequest} {...pageProps} />}
        {allowedPath && path === '/approvals' && <ApprovalQueue {...pageProps} />}
        {allowedPath && path === '/archivist' && <ArchivistQueue {...pageProps} />}
        {allowedPath && route[0] === 'archivist' && route[2] === 'process' && <ArchivistProcess request={requests.find((request) => request.id === route[1])} {...pageProps} />}
        {allowedPath && path === '/incidents' && <Incidents {...pageProps} />}
        {allowedPath && path === '/incidents/new' && <NewIncident {...pageProps} />}
        {allowedPath && path === '/reports' && <Reports {...pageProps} branchesList={settingsSnapshot.branches || branches} departmentsList={settingsSnapshot.departments || departments} />}
        {allowedPath && path === '/users' && <Users users={users} setUsers={setUsers} currentUserId={currentUser.id} currentUser={currentUser} branchesList={settingsSnapshot.branches || branches} departmentsList={settingsSnapshot.departments || departments} />}
        {allowedPath && path === '/settings' && <Settings theme={theme} setTheme={setTheme} initialSettings={settingsSnapshot} onSettingsChange={setSettingsSnapshot} onSave={saveReferenceData} />}
        {allowedPath && path === '/audit-logs' && <AuditLogsPage logs={auditLogs} users={users} requests={requests} setPath={setPath} />}
      </main>
    </div>
  );
}

function SidebarIcon({ name }) {
  const commonProps = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' };
  const uid = useId().replace(/:/g, '');
  const frame = (bgA, bgB, glyph) => (
    <svg {...commonProps}>
      <defs>
        <linearGradient id={`bg-${name}-${uid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={bgA} />
          <stop offset="1" stopColor={bgB} />
        </linearGradient>
        <filter id={`shadow-${name}-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodColor="#000000" floodOpacity=".26" />
        </filter>
      </defs>
      <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6" fill={`url(#bg-${name}-${uid})`} filter={`url(#shadow-${name}-${uid})`} />
      {glyph}
    </svg>
  );

  switch (name) {
    case 'dashboard':
      return frame('rgba(47, 128, 237, 0.34)', 'rgba(37, 99, 235, 0.22)', (
        <>
          <rect x="6.1" y="6.1" width="4.4" height="4.4" rx="1.1" fill="#ffffff" opacity=".96" />
          <rect x="13.5" y="6.1" width="4.4" height="4.4" rx="1.1" fill="#ffffff" opacity=".78" />
          <rect x="6.1" y="13.5" width="4.4" height="4.4" rx="1.1" fill="#ffffff" opacity=".78" />
          <rect x="13.5" y="13.5" width="4.4" height="4.4" rx="1.1" fill="#ffffff" opacity=".96" />
        </>
      ));
    case 'approval':
      return frame('rgba(139, 92, 246, 0.34)', 'rgba(109, 40, 217, 0.22)', (
        <>
          <circle cx="12" cy="12" r="5.5" fill="#ffffff" opacity=".14" />
          <path d="m9 12.2 2 2 4.2-4.4" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ));
    case 'archive':
      return frame('rgba(34, 197, 94, 0.34)', 'rgba(22, 163, 74, 0.22)', (
        <>
          <path d="M6 6.5h12v2H6z" fill="#ffffff" opacity=".92" />
          <path d="M7 8.7h10v8.2H7z" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 12h6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M9 14.6h6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".78" />
        </>
      ));
    case 'request':
      return frame('rgba(245, 158, 11, 0.34)', 'rgba(217, 119, 6, 0.22)', (
        <>
          <path d="M7 5.4h6.2L17.5 9v9.1c0 .9-.7 1.6-1.6 1.6H7c-.9 0-1.6-.7-1.6-1.6V7c0-.9.7-1.6 1.6-1.6Z" fill="#ffffff" opacity=".92" />
          <path d="M13.2 5.4V9h4.3" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M8.6 11.4h6.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8.6 13.9h5.2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".84" />
          <path d="M8.6 16.4h4.2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".68" />
        </>
      ));
    case 'alert':
      return frame('rgba(239, 68, 68, 0.34)', 'rgba(220, 38, 38, 0.22)', (
        <>
          <path d="M12 4.8 19 17.5H5z" fill="#ffffff" opacity=".94" />
          <path d="M12 9v3.8" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="15.6" r="1.05" fill="#ffffff" />
        </>
      ));
    case 'reports':
      return frame('rgba(56, 189, 248, 0.34)', 'rgba(2, 132, 199, 0.22)', (
        <>
          <path d="M5.5 17V8.5" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M9.5 17V6.8" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M13.5 17V10" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M5.2 17.4h13.6" stroke="#ffffff" strokeOpacity=".72" strokeWidth="1.2" strokeLinecap="round" />
        </>
      ));
    case 'users':
      return frame('rgba(148, 163, 184, 0.34)', 'rgba(100, 116, 139, 0.22)', (
        <>
          <circle cx="10" cy="9.2" r="2.7" fill="#ffffff" opacity=".92" />
          <path d="M5 17.4c.8-2.7 2.6-4.1 5-4.1s4.2 1.4 5 4.1" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16.4" cy="10.2" r="1.8" fill="#ffffff" opacity=".72" />
        </>
      ));
    case 'settings':
      return frame('rgba(99, 102, 241, 0.34)', 'rgba(79, 70, 229, 0.22)', (
        <>
          <circle cx="12" cy="12" r="3" fill="#ffffff" opacity=".94" />
          <path d="M12 4.8v2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 17.2v2" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="m6.6 6.6 1.4 1.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="m16 16 1.4 1.4" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="m4.8 12 2-0.1" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="m17.2 12 2 .1" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ));
    case 'audit':
      return frame('rgba(167, 139, 250, 0.34)', 'rgba(124, 58, 237, 0.22)', (
        <>
          <path d="M6 5.2h8.1L18 9v9.6c0 .9-.7 1.6-1.6 1.6H6c-.9 0-1.6-.7-1.6-1.6V6.8c0-.9.7-1.6 1.6-1.6Z" fill="#ffffff" opacity=".9" />
          <path d="M14.1 5.2V9H18" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M8 11.5h6" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 14h4.8" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".82" />
        </>
      ));
    default:
      return frame('rgba(148, 163, 184, 0.34)', 'rgba(100, 116, 139, 0.22)', (
        <>
          <path d="M6 6.2h12v11.6H6z" fill="#ffffff" opacity=".88" />
          <path d="M8 9h8" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 12h8" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".86" />
          <path d="M8 15h5.8" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".68" />
        </>
      ));
  }
}

function ThemeIcon({ theme }) {
  const commonProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (theme === 'dark') {
    return <svg {...commonProps} aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" /><path d="M17 4h.01" /></svg>;
  }
  return <svg {...commonProps} aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2" /><path d="M12 19.5v2" /><path d="M4.5 12h-2" /><path d="M21.5 12h-2" /><path d="m5.6 5.6-1.4-1.4" /><path d="m19.8 19.8-1.4-1.4" /><path d="m18.4 5.6 1.4-1.4" /><path d="m4.2 19.8 1.4-1.4" /></svg>;
}

function Sidebar({ user, path, setPath, isOpen, onClose }) {
  const items = [
    ['Dashboard', '/dashboard', ['requestor', 'branch_head', 'department_head', 'dpo', 'ceo', 'archivist', ...superAdminRoles], 'dashboard'],
    ['Approval Queue', '/approvals', ['branch_head', 'department_head', 'dpo', 'ceo', ...superAdminRoles], 'approval'],
    ['Archivist Queue', '/archivist', ['archivist', ...superAdminRoles], 'archive'],
    ['All Requests', '/requests/all', ['dpo', 'ceo', ...superAdminRoles], 'request'],
    ['Incidents', '/incidents', ['archivist', 'dpo', 'ceo', ...superAdminRoles], 'alert'],
    ['Reports', '/reports', ['branch_head', 'department_head', 'dpo', 'ceo', 'archivist', ...superAdminRoles], 'reports'],
    ['Users', '/users', superAdminRoles, 'users'],
    ['Settings', '/settings', superAdminRoles, 'settings'],
    ['Audit Logs', '/audit-logs', superAdminRoles, 'audit'],
    ['New Request', '/requests/new', ['requestor', 'branch_head', 'department_head'], 'request'],
    ['My Requests', '/requests/my', ['requestor', 'branch_head', 'department_head'], 'request'],
  ];
  return (
    <>
      <button type="button" className={`mobile-menu-backdrop ${isOpen ? 'visible' : ''}`} aria-label="Close navigation menu" onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand">
        <img src="/bmpc-logo.png" alt="Barbaza Multi-Purpose Cooperative logo" />
        <div><span>BMPC</span><small>Document Retrieval</small></div>
      </div>
      <nav>{items.filter(([, , allowed]) => allowed.includes(user.role)).map(([label, href, , icon]) => <Button variant={path === href ? 'secondary' : 'ghost'} className={`${path === href ? 'active' : ''} ${label === 'Audit Logs' ? 'audit-logs-nav-item' : ''} sidebar-link sidebar-link--${icon}`} key={href} onClick={() => { setPath(href); onClose(); }}><span className={`nav-icon nav-icon--${icon}`} aria-hidden="true"><SidebarIcon name={icon} /></span><span>{label}</span></Button>)}</nav>
      </aside>
    </>
  );
}

function Header({ user, onLogout, onUpdateProfile, theme, setTheme, isMobileMenuOpen, onMenuToggle }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profilePasswordVisibility, setProfilePasswordVisibility] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [profileNotice, setProfileNotice] = useState('');
  const [profileDraft, setProfileDraft] = useState({
    name: user.name,
    email: user.email,
    avatar: user.avatarCustom ? user.avatar : '',
    avatarCustom: Boolean(user.avatarCustom),
    avatarFile: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileErrors, setProfileErrors] = useState([]);
  const profileImageInputRef = useRef(null);
  const isSuperAdmin = normalizeRole(user.role) === 'superadmin';
  const canEditSensitiveProfileFields = isSuperAdmin;

  useEffect(() => {
    if (isEditingProfile) {
      setProfileDraft((draft) => ({
        ...draft,
        avatar: user.avatarCustom ? user.avatar : '',
        avatarCustom: Boolean(user.avatarCustom),
        avatarFile: null,
      }));
      return;
    }

    setProfileDraft({
      name: user.name,
      email: user.email,
      avatar: user.avatarCustom ? user.avatar : '',
      avatarCustom: Boolean(user.avatarCustom),
      avatarFile: null,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileErrors([]);
    setIsEditingProfile(false);
    setProfilePasswordVisibility({
      current: false,
      next: false,
      confirm: false,
    });
  }, [user, isEditingProfile]);

  const currentAvatar = profileDraft.avatar || getAvatarUrl(profileDraft.name);
  const notifications = [];
  const hasNameChange = profileDraft.name.trim() !== user.name.trim();
  const hasAvatarChange = Boolean(profileDraft.avatarCustom) !== Boolean(user.avatarCustom)
    || (profileDraft.avatarCustom && profileDraft.avatar !== user.avatar)
    || Boolean(profileDraft.avatarFile);
  const hasEmailChange = canEditSensitiveProfileFields && profileDraft.email.trim().toLowerCase() !== user.email.trim().toLowerCase();
  const hasPasswordChange = canEditSensitiveProfileFields && Boolean(profileDraft.newPassword.trim());
  const hasProfileChanges = hasNameChange || hasAvatarChange || hasEmailChange || hasPasswordChange;
  const saveDisabled = !isEditingProfile || isSavingProfile || !hasProfileChanges;

  const resetProfileDraft = () => {
    setProfileDraft({
      name: user.name,
      email: user.email,
      avatar: user.avatarCustom ? user.avatar : '',
      avatarCustom: Boolean(user.avatarCustom),
      avatarFile: null,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setProfileErrors([]);
    setProfileNotice('');
    setProfilePasswordVisibility({
      current: false,
      next: false,
      confirm: false,
    });
  };

  const uploadProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileErrors(['Please choose an image file for the profile picture.']);
      event.target.value = '';
      return;
    }
    setIsEditingProfile(true);
    setProfileErrors([]);
    setProfileNotice('');
    const reader = new FileReader();
    reader.onload = () => {
      setProfileDraft((draft) => ({
        ...draft,
        avatar: String(reader.result || ''),
        avatarCustom: true,
        avatarFile: file,
      }));
      event.target.value = '';
    };
    reader.onerror = () => {
      setProfileErrors(['Failed to read the selected image.']);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const openEditMode = () => {
    setProfileErrors([]);
    setProfileNotice('');
    setIsEditingProfile(true);
  };

  const closeProfileEditor = () => {
    setIsProfileOpen(false);
    setIsEditingProfile(false);
    setIsSavingProfile(false);
    setProfileErrors([]);
    setProfileNotice('');
    setProfilePasswordVisibility({
      current: false,
      next: false,
      confirm: false,
    });
  };

  const cancelEditMode = () => {
    resetProfileDraft();
    setIsEditingProfile(false);
  };

  const saveProfile = async () => {
    if (!isEditingProfile) return;
    const nextErrors = [];
    const name = profileDraft.name.trim();

    if (!name) nextErrors.push('Full name is required.');
    if (canEditSensitiveProfileFields) {
      const email = profileDraft.email.trim().toLowerCase();
      const currentPassword = profileDraft.currentPassword.trim();
      const newPassword = profileDraft.newPassword.trim();
      const confirmPassword = profileDraft.confirmPassword.trim();

      if (!email) nextErrors.push('Email is required.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.push('Please enter a valid email address.');
      if (newPassword && newPassword.length < 6) nextErrors.push('New password must be at least 6 characters long.');
      if (newPassword !== confirmPassword) nextErrors.push('New password and confirmation do not match.');
      if ((hasEmailChange || hasPasswordChange) && !currentPassword) nextErrors.push('Current password is required to change your email or password.');
    }
    if (nextErrors.length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    setIsSavingProfile(true);
    setProfileErrors([]);
    setProfileNotice('');

    const result = await onUpdateProfile({
      name,
      ...(canEditSensitiveProfileFields ? { email: profileDraft.email.trim().toLowerCase() } : {}),
      avatar: profileDraft.avatar,
      avatarCustom: profileDraft.avatarCustom,
      avatarFile: profileDraft.avatarFile || null,
      ...(canEditSensitiveProfileFields ? {
        currentPassword: profileDraft.currentPassword.trim(),
        newPassword: profileDraft.newPassword.trim(),
        confirmPassword: profileDraft.confirmPassword.trim(),
      } : {}),
    });

    setIsSavingProfile(false);

    if (result?.errors?.length) {
      setProfileErrors(result.errors);
      return;
    }

    if (result?.successMessage) {
      setProfileNotice(result.successMessage);
    }

    setProfileDraft((draft) => ({
      ...draft,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
    setIsEditingProfile(false);

    if (result?.requiresRelogin) {
      window.setTimeout(() => {
        void onLogout();
      }, 1200);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <Button type="button" variant="ghost" className={`hamburger-button ${isMobileMenuOpen ? 'active' : ''}`} aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMobileMenuOpen} onClick={onMenuToggle}>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </Button>
        <div><h1>Welcome back, {user.name}!</h1><p>Here is what is happening with your document requests today.</p></div>
      </div>
      <div className="profile-tools">
        <Button className="user-chip" type="button" variant="outline" onClick={() => setIsProfileOpen(true)} aria-label="Edit profile">
          <img className="avatar-image compact" src={user.avatar || getAvatarUrl(user.name)} alt={user.name} />
          <div>
            <strong>{user.name}</strong>
            <span>{roles[user.role]} / {user.department}</span>
          </div>
        </Button>
        {notifications.length > 0 && (
          <div className="notification-wrap">
            <Button type="button" variant="ghost" className="topbar-icon-button" aria-label="Notifications" aria-expanded={isNotificationsOpen} onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}>
              <span className="notification-dot">{notifications.length}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
            </Button>
            {isNotificationsOpen && (
              <div className="notification-panel" role="status">
                <h3>Notifications</h3>
                {notifications.map((notification) => (
                  <div className="notification-item" key={notification.id}>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <Button type="button" variant="ghost" className="topbar-icon-button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <span className="theme-toggle-dot"><ThemeIcon theme={theme} /></span>
        </Button>
        <Button variant="outline" onClick={onLogout}>Logout</Button>
      </div>
      {isProfileOpen && (
        <div className="profile-editor" role="dialog" aria-modal="true" aria-label="Edit profile">
          <div className="profile-editor-panel">
            <div className="modal-header">
              <h2>Profile</h2>
              <button className="ghost modal-close-button" type="button" onClick={closeProfileEditor} aria-label="Close">x</button>
            </div>
            {profileNotice && <div className="success-banner" role="status">{profileNotice}</div>}
            {profileErrors.length > 0 && <AlertList items={profileErrors} />}
            <div className="profile-avatar-preview">
              <img className="avatar-image profile-avatar-image" src={currentAvatar} alt={profileDraft.name || user.name} />
              <div>
                <span>Profile picture</span>
                <p className="helper-text">Choose or replace your profile photo.</p>
                <button
                  type="button"
                  className="upload-avatar-button"
                  onClick={() => profileImageInputRef.current?.click()}
                >
                  Choose Image
                </button>
                <input
                  ref={profileImageInputRef}
                  className="upload-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={uploadProfileImage}
                />
              </div>
            </div>
            <Field label="Full Name" value={profileDraft.name} readOnly={!isEditingProfile} onChange={(value) => setProfileDraft((draft) => ({ ...draft, name: value }))} />
            {canEditSensitiveProfileFields && (
              <Field label="Email Address" type="email" value={profileDraft.email} readOnly={!isEditingProfile} onChange={(value) => setProfileDraft((draft) => ({ ...draft, email: value }))} />
            )}
            {canEditSensitiveProfileFields && isEditingProfile && (
              <div className="profile-security-section">
                <h3>Security</h3>
                <label className="field">
                  <span>Current Password</span>
                  <PasswordInput
                    value={profileDraft.currentPassword}
                    onChange={(value) => setProfileDraft((draft) => ({ ...draft, currentPassword: value }))}
                    isVisible={profilePasswordVisibility.current}
                    onToggle={() => setProfilePasswordVisibility((state) => ({ ...state, current: !state.current }))}
                  />
                </label>
                <label className="field">
                  <span>New Password</span>
                  <PasswordInput
                    value={profileDraft.newPassword}
                    onChange={(value) => setProfileDraft((draft) => ({ ...draft, newPassword: value }))}
                    isVisible={profilePasswordVisibility.next}
                    onToggle={() => setProfilePasswordVisibility((state) => ({ ...state, next: !state.next }))}
                  />
                </label>
                <label className="field">
                  <span>Confirm New Password</span>
                  <PasswordInput
                    value={profileDraft.confirmPassword}
                    onChange={(value) => setProfileDraft((draft) => ({ ...draft, confirmPassword: value }))}
                    isVisible={profilePasswordVisibility.confirm}
                    onToggle={() => setProfilePasswordVisibility((state) => ({ ...state, confirm: !state.confirm }))}
                  />
                </label>
                <p className="helper-text">Current password is required before changing your email or password.</p>
              </div>
            )}
            <div className="actions">
              {!isEditingProfile ? (
                <>
                  <button type="button" onClick={openEditMode}>Edit Profile</button>
                  <button className="ghost" type="button" onClick={closeProfileEditor}>Close</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={saveProfile} disabled={saveDisabled}>{isSavingProfile ? 'Saving...' : 'Save Changes'}</button>
                  <button className="ghost" type="button" onClick={cancelEditMode} disabled={isSavingProfile}>Cancel Edit</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Login({ isConfigured, onLogin }) {
  const [errors, setErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const updateLogin = (key, value) => setLoginForm((draft) => ({ ...draft, [key]: value }));
  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const submitLogin = async () => {
    const email = loginForm.email.trim().toLowerCase();
    const nextErrors = [];
    if (!email) nextErrors.push('Email is required.');
    else if (!isValidEmail(email)) nextErrors.push('Please enter a valid email address.');
    if (!loginForm.password.trim()) nextErrors.push('Password is required.');
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onLogin(email, loginForm.password);
      setErrors(Array.isArray(result) ? result : []);
    } catch (error) {
      setErrors([readErrorMessage(error, 'Login failed.')]);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Digital archive storage visual">
        <img src="/login-archive-visual.png" alt="Cloud archive and file storage" />
      </section>
      <Card className="login-panel">
        <img src="/bmpc-logo.png" alt="Barbaza Multi-Purpose Cooperative logo" />
        <CardHeader className="login-copy">
          <CardTitle>BMPC Document Retrieval</CardTitle>
          <CardDescription>Controlled archive request, approval, release, return, and audit monitoring for Barbaza Multi-Purpose Cooperative.</CardDescription>
        </CardHeader>
        {!isConfigured && <div className="ui-alert">Supabase is not configured yet. Set the environment variables before using authentication.</div>}
        {errors.length > 0 && <AlertList items={errors} />}
        <label className="field">Email</label>
        <Input value={loginForm.email} onChange={(event) => updateLogin('email', event.target.value)} />
        <label className="field">Password</label>
        <PasswordInput value={loginForm.password} onChange={(value) => updateLogin('password', value)} isVisible={showPassword} onToggle={() => setShowPassword((isVisible) => !isVisible)} />
        <Button type="button" className="submit-button" onClick={submitLogin} disabled={isSubmitting}>
          {isSubmitting && <span className="button-spinner" aria-hidden="true"></span>}
          <span>{isSubmitting ? 'Logging in...' : 'Login'}</span>
        </Button>
      </Card>
    </main>
  );
}

function PasswordInput({ value, onChange, isVisible, onToggle }) {
  return (
    <div className="password-input-wrap">
      <Input value={value} type={isVisible ? 'text' : 'password'} onChange={(event) => onChange(event.target.value)} />
      <Button className="password-toggle" variant="ghost" type="button" aria-label={isVisible ? 'Hide password' : 'Show password'} onClick={onToggle}>
        {isVisible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.5 5.3A8.9 8.9 0 0 1 12 5c5 0 8.5 4.5 9.5 7a11.8 11.8 0 0 1-2.3 3.4" /><path d="M6.6 6.6A12.2 12.2 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a8.8 8.8 0 0 0 4.3-1.1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12c1-2.5 4.5-7 9.5-7s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7s-8.5-4.5-9.5-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </Button>
    </div>
  );
}

function DashboardIcon({ name }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': 'true',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (name === 'pending') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }
  if (name === 'approved') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <path d="m9 12.5 2 2 4-5" />
      </svg>
    );
  }
  if (name === 'released') {
    return (
      <svg {...commonProps}>
        <path d="M4 8h16" />
        <path d="M5 8v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
        <path d="M8 4h8l2 4H6z" />
      </svg>
    );
  }
  if (name === 'alert') {
    return (
      <svg {...commonProps}>
        <path d="M12 3 2.8 19h18.4L12 3Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }
  if (name === 'branch') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  return (
    <svg {...commonProps}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function Dashboard({ currentUser, users, requests, processing, incidents, setPath, theme }) {
  const [selectedTrendDate, setSelectedTrendDate] = useState('');
  const my = getAccessibleRequestsForUser(currentUser, requests, users);
  const pendingRequests = my.filter((request) => request.status === 'Pending Approval');
  const approvedRequests = my.filter((request) => ['Approved', 'Forwarded to Archivist'].includes(request.status));
  const releasedRequests = my.filter((request) => request.status === 'Released');
  const archivistRequests = my.filter((request) => ['Forwarded to Archivist', 'Processing'].includes(request.status));
  const overview = [
    { label: 'Pending', count: pendingRequests.length, color: '#f59e0b' },
    { label: 'Approved', count: approvedRequests.length, color: '#22c55e' },
    { label: 'Released', count: releasedRequests.length, color: '#2563eb' },
    { label: 'For Archivist', count: archivistRequests.length, color: '#7c3aed' },
    { label: 'Others', count: Math.max(0, my.length - pendingRequests.length - approvedRequests.length - releasedRequests.length - archivistRequests.length), color: '#94a3b8' },
  ];
  const statCards = [
    {
      key: 'total',
      title: 'Total Requests',
      value: my.length,
      description: 'All time requests',
      color: '#4f46e5',
      icon: 'file',
      action: () => setPath('/requests/all'),
    },
    {
      key: 'pending',
      title: 'Pending Approval',
      value: pendingRequests.length,
      description: 'For your approval',
      color: '#f59e0b',
      icon: 'pending',
      action: () => setPath('/approvals'),
    },
    {
      key: 'approved',
      title: 'Approved Requests',
      value: approvedRequests.length,
      description: 'Successfully approved',
      color: '#22c55e',
      icon: 'approved',
      action: () => setPath('/approvals'),
    },
    {
      key: 'released',
      title: 'Released Documents',
      value: releasedRequests.length,
      description: 'Released to requesters',
      color: '#7c3aed',
      icon: 'released',
      action: () => setPath('/archivist'),
    },
  ];
  const donutStops = overview.reduce((state, item) => {
    const start = state.offset;
    const width = my.length ? (item.count / my.length) * 100 : 0;
    state.parts.push(`${item.color} ${start}% ${start + width}%`);
    state.offset += width;
    return state;
  }, { offset: 0, parts: [] }).parts.join(', ');
  const trendData = useMemo(() => {
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);
    return Array.from({ length: 30 }, (_, index) => {
      const day = new Date(baseDate);
      day.setDate(baseDate.getDate() - (29 - index));
      const date = day.toISOString().slice(0, 10);
      const dayRequests = my.filter((request) => request.requestDate === date);
      return {
        date,
        label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count: dayRequests.length,
        requests: dayRequests,
      };
    });
  }, [my]);
  const selectedTrend = trendData.find((item) => item.date === selectedTrendDate);
  const isLightMode = theme === 'light';
  const donutBackground = isLightMode
    ? `radial-gradient(circle, rgba(255, 255, 255, 0.88) 0 46%, transparent 47%), conic-gradient(${donutStops || '#dbe4f0 0% 100%'})`
    : `radial-gradient(circle, #fff 0 47%, transparent 48%), conic-gradient(${donutStops || '#e2e8f0 0% 100%'})`;
  return (
    <section className="page dashboard-page">
      <div className="dashboard-stat-grid">
        {statCards.map((item) => (
          <Card
            as="button"
            type="button"
            key={item.key}
            className={`dashboard-stat-card ${item.key}`}
            onClick={item.action}
          >
            <CardHeader className="dashboard-stat-card-header">
              <div className="dashboard-stat-header-row">
                <span className="dashboard-stat-label">{item.title}</span>
                <span className="dashboard-stat-icon" style={{ '--stat-accent': item.color }}>
                  <DashboardIcon name={item.icon} />
                </span>
              </div>
            </CardHeader>
            <CardContent className="dashboard-stat-card-content">
              <strong>{item.value}</strong>
              <small>{item.description}</small>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="dashboard-analysis-grid">
        <div className="dashboard-column">
          <Card className="dashboard-panel">
            <CardHeader>
              <CardTitle>Total Requests Overview</CardTitle>
            </CardHeader>
            <div className="overview-body">
              <div className="overview-donut" style={{ background: donutBackground }}>
                <strong>{my.length}</strong>
                <span>Total</span>
              </div>
              <div className="overview-legend">
                {overview.map((item) => (
                  <Button type="button" variant="ghost" className="overview-row" key={item.label}>
                    <span><i style={{ background: item.color }} />{item.label}</span>
                    <strong><Badge variant="secondary">{item.count}</Badge> <span className="overview-percent">{my.length ? Math.round((item.count / my.length) * 100) : 0}%</span></strong>
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="dashboard-panel dashboard-trend-card">
            <CardHeader className="dashboard-trend-header">
              <div>
                <CardTitle>Request Trends (Last 30 days)</CardTitle>
              </div>
            </CardHeader>
            <ReactLineChart data={trendData} selectedDate={selectedTrendDate} onSelectDate={setSelectedTrendDate} />
            {selectedTrend && (
              <div className="trend-result">
                <div>
                  <strong>{selectedTrend.count}</strong>
                  <span>{selectedTrend.label}</span>
                </div>
                {selectedTrend.requests.length ? (
                  <Button type="button" variant="outline" onClick={() => setPath('/requests/all')}>
                    {selectedTrend.requests.slice(0, 2).map((request) => request.requestNo).join(', ')}
                    {selectedTrend.requests.length > 2 ? ` +${selectedTrend.requests.length - 2} more` : ''}
                  </Button>
                ) : (
                  <span>No requests on this date</span>
                )}
              </div>
            )}
          </Card>

        </div>
      </div>
    </section>
  );
}

function ReactLineChart({ data, selectedDate, onSelectDate }) {
  const rawMax = Math.max(1, ...data.map((item) => item.count));
  const maxCount = Math.max(2, rawMax);
  const tickValues = [0, Math.max(1, Math.ceil(maxCount / 2)), maxCount];
  const plotLeft = 20;
  const plotRight = 300;
  const plotBottom = 170;
  const plotTop = 38;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;
  const step = plotWidth / Math.max(1, data.length - 1);
  const xPositions = data.map((_, index) => plotLeft + (index * step));
  const yFor = (value) => plotBottom - (Math.max(0, value) / maxCount) * plotHeight;
  const points = data.map((item, index) => ({
    ...item,
    x: xPositions[index] ?? plotLeft,
    y: yFor(item.count),
  }));
  const secondaryPoints = data.map((item, index) => ({
    x: xPositions[index] ?? plotLeft,
    y: yFor(Math.max(0, (item.count * 0.68) + (index % 5 === 0 ? 0.3 : 0))),
  }));

  const buildAreaPath = (seriesPoints) => {
    if (!seriesPoints.length) return '';
    const start = seriesPoints[0];
    const end = seriesPoints[seriesPoints.length - 1];
    const curve = seriesPoints.reduce((path, point, index, array) => {
      if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      const prev = array[index - 1];
      const midX = ((prev.x + point.x) / 2).toFixed(2);
      return `${path} C ${midX} ${prev.y.toFixed(2)}, ${midX} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }, '');
    return `${curve} L ${end.x.toFixed(2)} ${plotBottom} L ${start.x.toFixed(2)} ${plotBottom} Z`;
  };

  const buildLinePath = (seriesPoints) => {
    if (!seriesPoints.length) return '';
    return seriesPoints.reduce((path, point, index, array) => {
      if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      const prev = array[index - 1];
      const midX = ((prev.x + point.x) / 2).toFixed(2);
      return `${path} C ${midX} ${prev.y.toFixed(2)}, ${midX} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }, '');
  };

  const primaryAreaPath = buildAreaPath(points);
  const secondaryAreaPath = buildAreaPath(secondaryPoints);
  const primaryLinePath = buildLinePath(points);
  const secondaryLinePath = buildLinePath(secondaryPoints);
  const maxLabel = rawMax;
  return (
    <svg className="react-line-chart" viewBox="0 0 320 220" role="img" aria-label="Request trend chart for the last 30 days">
      <defs>
        <linearGradient id="trendAreaPurple" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b7cff" stopOpacity="0.82" />
          <stop offset="55%" stopColor="#7868fb" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#283149" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="trendAreaTeal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.78" />
          <stop offset="55%" stopColor="#14b8a6" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="trendLinePurple" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#6b7cff" />
          <stop offset="100%" stopColor="#8b7cff" />
        </linearGradient>
        <linearGradient id="trendLineTeal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#35d0c2" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
        <linearGradient id="trendGlowPurple" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b7cff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b7cff" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id="trendGlowTeal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="220" rx="16" className="trend-chart-bg" />
      <g opacity="0.8">
        {[0, 1, 2, 3].map((index) => {
          const y = plotTop + (index * ((plotBottom - plotTop) / 3));
          return <line key={index} className="trend-grid-line" x1={plotLeft} y1={y} x2={plotRight} y2={y} />;
        })}
      </g>
      {tickValues.map((tick) => {
        const y = plotBottom - (tick / maxCount) * plotHeight;
        return (
          <g key={tick}>
            <line className="trend-grid-line" x1={plotLeft} y1={y} x2={plotRight} y2={y} />
            <text className="trend-y-label" x="12" y={y + 4}>{tick}</text>
          </g>
        );
      })}
      <path className="trend-area trend-area-secondary" d={secondaryAreaPath} fill="url(#trendAreaTeal)" />
      <path className="trend-area trend-area-primary" d={primaryAreaPath} fill="url(#trendAreaPurple)" />
      <path className="trend-line trend-line-secondary" d={secondaryLinePath} stroke="url(#trendLineTeal)" />
      <path className="trend-line trend-line-primary" d={primaryLinePath} stroke="url(#trendLinePurple)" />
      {points.map((point) => {
        const isSelected = selectedDate === point.date;
        return (
          <g
            key={point.date}
            tabIndex="0"
            role="button"
            aria-label={`${point.label}: ${point.count} requests`}
            onClick={() => onSelectDate(point.date)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectDate(point.date);
              }
            }}
          >
            <circle className={`trend-point ${isSelected ? 'selected' : ''}`} cx={point.x} cy={point.y} r="4.4" />
            <circle className="trend-point-glow" cx={point.x} cy={point.y} r="7.4" />
          </g>
        );
      })}
      {points.length > 0 && (
        <>
          <text className="trend-y-label trend-y-max" x="12" y="44">{maxLabel}</text>
          {points.map((point, index) => {
            if (index !== 0 && index !== Math.floor((points.length - 1) / 2) && index !== points.length - 1) return null;
            return <text className="trend-x-label" key={point.date} x={point.x} y="204">{point.label}</text>;
          })}
        </>
      )}
    </svg>
  );
}

function PageTitle({ title, onBack }) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (window.__setAppPath) {
      window.__goBackAppPath?.();
      return;
    }
    window.history.back();
  };

  return <div className="page-title"><Button type="button" variant="secondary" className="back-btn" onClick={handleBack} aria-label="Go back">&lt;</Button><div><h2>{title}</h2></div></div>;
}

function NewRequest({ currentUser, requests, submitRequest, saveDraftRequest, editingRequestId, setEditingRequestId, departmentsList = [] }) {
  const initialForm = useMemo(() => ({ documentTitle: '', documentType: 'Physical', confidentialityLevel: 'Non Confidential', purpose: '', dateNeeded: today(), borrowReturnDueDate: today(), remarks: '', branch: currentUser.branch, department: currentUser.department, agreementAccepted: false }), [currentUser.branch, currentUser.department]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const editableRequest = useMemo(() => {
    if (!editingRequestId) return null;
    const request = requests.find((item) => item.id === editingRequestId) || null;
    return request && ['Draft', 'Returned'].includes(request.status) ? request : null;
  }, [editingRequestId, requests]);
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const departmentOptions = useMemo(() => {
    const values = Array.isArray(departmentsList) ? departmentsList : [];
    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
  }, [departmentsList]);
  const canSubmit = form.documentTitle && form.documentType && form.purpose && form.dateNeeded && form.borrowReturnDueDate && form.confidentialityLevel && form.agreementAccepted;
  const hasReturnDateWarning = form.borrowReturnDueDate && (form.borrowReturnDueDate < today() || form.borrowReturnDueDate < form.dateNeeded);

  React.useEffect(() => {
    if (!editableRequest) {
      setForm(initialForm);
      if (editingRequestId && editingRequestId !== editableRequest?.id) {
        setEditingRequestId(null);
      }
      return;
    }
    setForm({
      documentTitle: editableRequest.documentTitle || '',
      documentType: editableRequest.documentType || 'Physical',
      confidentialityLevel: confidentialityLevels.includes(editableRequest.confidentialityLevel) ? editableRequest.confidentialityLevel : 'Non Confidential',
      purpose: editableRequest.purpose || '',
      dateNeeded: editableRequest.dateNeeded || today(),
      borrowReturnDueDate: editableRequest.borrowReturnDueDate || editableRequest.dateNeeded || today(),
      remarks: editableRequest.remarks || '',
      branch: currentUser.branch,
      department: editableRequest.department || currentUser.department,
      agreementAccepted: Boolean(editableRequest.agreementAccepted),
    });
  }, [editableRequest, editingRequestId, initialForm, setEditingRequestId, currentUser.branch, currentUser.department]);

  const save = async () => {
    const result = await submitRequest(form, editableRequest?.id || null);
    setErrors(result || []);
  };

  const saveDraft = async () => {
    const result = await saveDraftRequest(form, editableRequest?.id || null);
    setErrors(result || []);
  };

  return (
    <section className="page">
      <PageTitle
        title={editableRequest ? (editableRequest.status === 'Returned' ? 'Respond to Clarification' : 'Edit and Resubmit Request') : 'New Document Retrieval Request'}
      subtitle={editableRequest ? (editableRequest.status === 'Returned' ? 'Update the returned request and send it back for approval.' : 'Update the draft and resend it to the assigned approver.') : 'Create a request, save it as a draft, or submit it for automatic routing to the correct approver. For electronic requests, the archivist will release the file through a secure link.'}
      />
      {errors.length > 0 && <AlertList items={errors} />}
      {hasReturnDateWarning && (
        <div className="ui-alert ui-alert--warning due-warning-banner">
          <Badge variant="warning">Warning</Badge>
          <p>The return due date is outside the allowed date range.</p>
        </div>
      )}
      <div className="form-grid">
        <Field label="Request Date" type="date" value={today()} readOnly />
        <Field label="Requestor" value={currentUser.name} readOnly />
        <label className="field">
          <span>Department</span>
          <Select value={form.department} onChange={(e) => update('department', e.target.value)}>
            {departmentOptions.length > 0 ? departmentOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            )) : <option value={form.department || currentUser.department}>{form.department || currentUser.department}</option>}
          </Select>
        </label>
        <Field label="Branch" value={currentUser.branch} readOnly />
        <Field label="Document Title / File Name" value={form.documentTitle} onChange={(v) => update('documentTitle', v)} />
        <Field label="Document Type" type="select" value={form.documentType} options={['Physical', 'Electronic']} onChange={(v) => update('documentType', v)} />
        <Field label="Confidentiality Level" type="select" value={form.confidentialityLevel} options={['Confidential', 'Non Confidential']} onChange={(v) => update('confidentialityLevel', v)} />
        <Field className="wide" label="Purpose of Retrieval" type="textarea" value={form.purpose} onChange={(v) => update('purpose', v)} />
        <Field label="Date Needed" type="date" value={form.dateNeeded} min={today()} onChange={(v) => update('dateNeeded', v)} />
        <Field label="Return Due Date" type="date" value={form.borrowReturnDueDate} min={form.dateNeeded || today()} warning={hasReturnDateWarning} className={hasReturnDateWarning ? 'date-warning' : ''} onChange={(v) => update('borrowReturnDueDate', v)} />
        <Field className="wide" label="Remarks" type="textarea" value={form.remarks} onChange={(v) => update('remarks', v)} />
      </div>
      <label className="agreement"><input type="checkbox" checked={form.agreementAccepted} onChange={(e) => update('agreementAccepted', e.target.checked)} /> I certify that the requested document will be used strictly for the approved purpose only and returned, deleted, or access-revoked on or before the approved return due date.</label>
      <div className="actions">
        <Button type="button" variant="ghost" onClick={() => { void saveDraft(); }}>Save Draft</Button>
        <Button type="button" disabled={!canSubmit} onClick={() => { void save(); }}>{editableRequest ? 'Save and Resend' : 'Submit Request'}</Button>
        {editableRequest && <Button variant="ghost" type="button" onClick={() => { setEditingRequestId(null); }}>Cancel Edit</Button>}
      </div>
      {editableRequest && <div className="alert">{editableRequest.status === 'Returned' ? 'This request was returned for clarification. Update it and submit again.' : 'This request is currently a draft. You can keep editing it until you submit it again.'}</div>}
    </section>
  );
}

function AlertList({ items }) {
  return <div className="ui-alert ui-alert--destructive error-list">{items.map((item, index) => {
    const message = readErrorMessage(item, 'Unexpected error');
    return <div key={typeof item === 'string' ? item : item?.message || index}>{message}</div>;
  })}</div>;
}
function Field({ label, value, onChange, type = 'text', options = [], readOnly = false, className = '', min, warning = false, placeholder = '' }) {
  const inputProps = { value, placeholder, readOnly, min, onChange: (e) => onChange?.(e.target.value) };
  return (
    <label className={`field ${className}`}>
      <span>
        {label}
        {warning && <Badge variant="warning" className="field-warning-badge">Warning</Badge>}
      </span>
      {type === 'textarea' ? (
        <Textarea {...inputProps} />
      ) : type === 'select' ? (
        <Select value={value} disabled={readOnly} onChange={(e) => onChange?.(e.target.value)}>
          {options.map((option) => <option key={option}>{option}</option>)}
        </Select>
      ) : (
        <Input type={type} {...inputProps} />
      )}
    </label>
  );
}

function RequestList({ title, requests, setPath, allowManage = false, onEditRequest, onWithdrawRequest, onDeleteRequest, currentUser }) {
  return <section className="page requests-page"><PageTitle title={title} subtitle="Track request status, routing, processing, and closure." /><RequestTable requests={requests} setPath={setPath} showActions={allowManage} onEditRequest={onEditRequest} onWithdrawRequest={onWithdrawRequest} onDeleteRequest={onDeleteRequest} currentUser={currentUser} /></section>;
}

function RequestTable({ title, requests, setPath, showActions = false, onEditRequest, onWithdrawRequest, onDeleteRequest, currentUser }) {
  return (
    <Card className="table-card">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request No.</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Confidentiality</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Needed</TableHead>
            <TableHead>Return Due Date</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length ? requests.map((request) => {
            const canManageRequest = canManageRequestFromList(currentUser, request);
            const primaryActionLabel = request.status === 'Returned' ? 'Respond to Clarification' : 'Continue Draft';
            const secondaryActionLabel = 'Delete';
            const dueWarning = hasDueDateWarning(request);
            const currentStatus = request.computedStatus || request.status;
            return (
              <TableRow key={request.id} onClick={() => setPath?.(`/requests/${request.id}`)}>
                <TableCell>{request.requestNo}</TableCell>
                <TableCell>{request.documentTitle}</TableCell>
                <TableCell>{request.documentType}</TableCell>
                <TableCell>{request.confidentialityLevel}</TableCell>
                <TableCell><Badge variant={getStatusBadgeVariant(currentStatus)}>{currentStatus}</Badge></TableCell>
                <TableCell>{request.dateNeeded}</TableCell>
                <TableCell className={dueWarning ? 'due-date-cell warning' : 'due-date-cell'}>
                  {dueWarning ? (
                    <div className="due-date-cell-content">
                      <Badge variant="warning">Warning</Badge>
                      <span>{request.borrowReturnDueDate || '-'}</span>
                    </div>
                  ) : (
                    request.borrowReturnDueDate || '-'
                  )}
                </TableCell>
                {showActions && (
                  <TableCell className="actions-cell" onClick={(event) => event.stopPropagation()}>
                    {canManageRequest ? (
                      <>
                        <Button variant="secondary" size="sm" type="button" onClick={() => onEditRequest?.(request)}>{primaryActionLabel}</Button>
                        {request.status === 'Draft' && <Button variant="destructive" size="sm" type="button" onClick={() => onDeleteRequest?.(request.id)}>{secondaryActionLabel}</Button>}
                      </>
                    ) : (
                      <span className="helper-text">View only</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={showActions ? 8 : 7} className="empty">No records found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
function RequestDetails({ request, users, processing, electronicReleaseLinks, closures, incidents, auditLogs, currentUser, setPath, setEditingRequestId }) {
  if (!request) return <Empty message="Request not found." />;
  const approver = request.currentApproverName || users.find((user) => user.id === request.currentApprover)?.name;
  const requestProcessing = processing[request.id] || {};
  const requestReleaseLink = electronicReleaseLinks[request.id] || null;
  const closure = closures[request.id] || {};
  const requestIncidents = incidents.filter((incident) => incident.requestId === request.id);
  const approvalLogs = auditLogs.filter((log) => log.requestId === request.id && /approved|rejected|forwarded/i.test(log.action));
  const processingItems = Object.entries(requestProcessing).filter(([key]) => key !== 'electronicReleaseReference');
  const releaseLinkItems = request.documentType === 'Electronic' && requestReleaseLink && canViewReleaseReferences(currentUser, request)
    ? [['Electronic Release Link', requestReleaseLink.electronicReleaseReference]]
    : [];
  const canProcess = ['archivist', ...adminRoles].includes(currentUser.role);
  const canClose = ['archivist', ...adminRoles].includes(currentUser.role) || request.requestorId === currentUser.id;
  const canCreateIncident = ['archivist', ...adminRoles, 'dpo', 'ceo'].includes(currentUser.role);
  const canEditDraft = ['Draft', 'Returned'].includes(request.status) && request.requestorId === currentUser.id;
  const editRequestLabel = request.status === 'Returned' ? 'Respond to Clarification' : 'Edit Draft and Resend';

  return <section className="page"><PageTitle title={request.requestNo} subtitle={request.documentTitle} /><div className="detail-grid"><InfoCard title="Request Information" items={[['Requestor', request.requestorName], ['Branch', request.branch], ['Department', request.department], ['Document Type', request.documentType], ['Confidentiality', request.confidentialityLevel], ['Purpose', request.purpose], ['Date Needed', request.dateNeeded], ['Return Due Date', request.borrowReturnDueDate], ['Current Approver', approver || 'Not assigned'], ['Status', request.computedStatus || request.status]]} /><InfoCard title="Approval History" items={approvalLogs.length ? approvalLogs.map((log) => [log.createdAt, `${log.action}: ${log.remarks || log.newStatus}`]) : [['Status', 'No approval history yet']]} />{releaseLinkItems.length > 0 && <InfoCard title="Electronic Release" items={releaseLinkItems} />}<InfoCard title="Archivist Processing / Release" items={processingItems.length ? processingItems : [['Status', 'No processing record yet']]} /><InfoCard title="Return / Closure" items={Object.entries(closure).length ? Object.entries(closure) : [['Status', 'Not closed']]} /><InfoCard title="Incident Reports" items={requestIncidents.length ? requestIncidents.map((incident) => [incident.incidentType, incident.status]) : [['Status', 'No incidents']]} /></div><div className="actions">{canEditDraft && <Button variant="secondary" onClick={() => { setEditingRequestId(request.id); setPath('/requests/new'); }}>{editRequestLabel}</Button>}{canClose && <Button onClick={() => setPath(`/requests/${request.id}/closure`)}>Return / Closure</Button>}{canProcess && <Button variant="secondary" onClick={() => setPath(`/archivist/${request.id}/process`)}>Archivist Processing</Button>}{canCreateIncident && <Button variant="ghost" onClick={() => setPath('/incidents/new')}>Create Incident</Button>}</div><AuditTrailTable logs={auditLogs.filter((log) => log.requestId === request.id)} users={users} setPath={setPath} /></section>;
}
function InfoCard({ title, items }) {
  return <Card className="info-card"><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent>{items.map(([key, value]) => {
    const text = String(value || '-');
    const isLink = /^(https?:\/\/|mailto:)/i.test(text);
    return <p key={key}><span>{humanize(key)}</span><strong>{isLink ? <a className="compact-link" href={text} target="_blank" rel="noreferrer" title={text}>{text}</a> : text}</strong></p>;
  })}</CardContent></Card>;
}

function humanize(value) {
  return String(value).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

function normalizeReleaseLink(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^(https?:\/\/|mailto:)/i.test(text)) return text;
  return `https://${text}`;
}

function ApprovalQueue({ currentUser, requests, updateRequestStatus, users, setPath }) {
  const queue = currentUser.role === 'superadmin'
    ? requests.filter((request) => request.status === 'Pending Approval')
    : requests.filter((request) => request.status === 'Pending Approval' && request.currentApprover === currentUser.id);
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState([]);
  const archivist = users.find((user) => user.role === 'archivist');
  const requireRemarks = (action) => {
    if (!remarks.trim()) {
      setErrors([`${action} remarks are required.`]);
      return false;
    }
    setErrors([]);
    return true;
  };
  const approve = (request) => {
    updateRequestStatus(request.id, 'Forwarded to Archivist', 'Approved and forwarded', remarks || 'Approved', { currentApprover: '', currentApproverName: '', assignedArchivistId: archivist?.id || '', assignedArchivistName: archivist?.name || '', approvedBy: currentUser.id, approvedAt: new Date().toLocaleString(), forwardedToArchivistAt: new Date().toLocaleString() });
    setRemarks('');
  };
  const reject = (request) => {
    if (!requireRemarks('Rejection')) return;
    updateRequestStatus(request.id, 'Rejected', 'Rejected request', remarks, { rejectedBy: currentUser.id, rejectedAt: new Date().toLocaleString(), rejectionReason: remarks });
    setRemarks('');
  };
  return <section className="page approval-page"><PageTitle title="Approval Queue" subtitle="Requests appear only for the assigned approver." />{errors.length > 0 && <AlertList items={errors} />}<Textarea className="remarks-box" placeholder="Remarks required for rejection; optional for approval" value={remarks} onChange={(e) => setRemarks(e.target.value)} /><div className="queue-list">{queue.map((request) => <Card className="queue-card" key={request.id} onClick={() => setPath(`/requests/${request.id}`)}><CardContent><div><h3>{request.documentTitle}</h3><p>{request.requestNo} by {request.requestorName}</p><p>Assigned approver: {request.currentApproverName || users.find((user) => user.id === request.currentApprover)?.name || 'Not assigned'}</p><p>Reminder: bring back or revoke access by {request.borrowReturnDueDate || 'the approved due date'}.</p><Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge></div><div className="actions" onClick={(event) => event.stopPropagation()}><Button onClick={() => approve(request)}>Approve</Button><Button variant="destructive" onClick={() => reject(request)}>Reject</Button></div></CardContent></Card>)}{!queue.length && <Empty message="No approval items." />}</div></section>;
}
function ArchivistQueue({ requests, setPath }) {
  const queue = requests.filter((request) => ['Approved', 'Forwarded to Archivist', 'Processing'].includes(request.status));
  return <section className="page archivist-page"><PageTitle title="Archivist Queue" subtitle="Retrieve, prepare, release, and monitor approved requests." /><div className="queue-list">{queue.map((request) => <Card className="queue-card" key={request.id}><CardContent><div><h3>{request.documentTitle}</h3><p>{request.requestNo} - {request.documentType}</p><Badge variant={getStatusBadgeVariant(request.status)}>{request.status}</Badge></div><Button onClick={() => setPath(`/archivist/${request.id}/process`)}>Process</Button></CardContent></Card>)}{!queue.length && <Empty message="No requests waiting for processing." />}</div></section>;
}

function ArchivistProcess({ request, currentUser, processing, setProcessing, updateRequestStatus, setPath }) {
  const [form, setForm] = useState(processing[request?.id] || { dateReceived: today(), dateReleased: today(), borrowerName: request?.requestorName || '', expectedReturnDate: request?.borrowReturnDueDate || today(), physicalConditionBeforeRelease: 'Good Condition', storageLocation: '', electronicReleaseMethod: 'Link', electronicReleaseReference: '', accessExpiryDate: request?.borrowReturnDueDate || today(), deletionConfirmationRequired: false, releaseRemarks: '' });
  const [errors, setErrors] = useState([]);
  if (!request) return <Empty message="Request not found." />;
  const isReleasedViewOnly = ['Released', 'Closed', 'Returned', 'For Closure'].includes(request.status) && (request.documentType === 'Electronic' || form.physicalConditionBeforeRelease === 'Good Condition');
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const validateRelease = () => {
    const nextErrors = [];
    if (request.documentType === 'Physical') {
      if (!form.borrowerName?.trim()) nextErrors.push('Name of borrower is required.');
      if (!form.dateReceived) nextErrors.push('Date received is required.');
      if (!form.dateReleased) nextErrors.push('Date released is required.');
      if (!form.expectedReturnDate) nextErrors.push('Expected date of return is required.');
      if (form.dateReceived && form.dateReleased && form.dateReleased < form.dateReceived) nextErrors.push('Date released cannot be earlier than date received.');
      if (form.dateReleased && form.expectedReturnDate && form.expectedReturnDate < form.dateReleased) nextErrors.push('Expected date of return cannot be earlier than date released.');
      if (!form.physicalConditionBeforeRelease) nextErrors.push('Condition before release is required.');
    } else {
      if (!form.electronicReleaseMethod) nextErrors.push('Electronic release method is required.');
      if (form.electronicReleaseMethod !== 'Other' && !form.electronicReleaseReference?.trim()) nextErrors.push('Release reference or shared link is required.');
      if (!form.accessExpiryDate) nextErrors.push('Access expiry date is required.');
      if (form.accessExpiryDate && form.accessExpiryDate < today()) nextErrors.push('Access expiry date cannot be earlier than today.');
    }
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };
  const startProcessing = () => {
    if (isReleasedViewOnly) return;
    const nextRecord = { ...form, electronicReleaseReference: normalizeReleaseLink(form.electronicReleaseReference), archivistId: currentUser.id, archivistName: currentUser.name };
    setProcessing((records) => ({ ...records, [request.id]: nextRecord }));
    void saveProcessingRecord(request.id, nextRecord).catch((error) => console.error('Failed to save processing record:', error));
    updateRequestStatus(request.id, 'Processing', 'Started archivist processing', 'Retrieval is being prepared.', { assignedArchivistId: currentUser.id, assignedArchivistName: currentUser.name });
    setPath('/archivist');
  };
  const release = () => {
    if (isReleasedViewOnly) return;
    if (!validateRelease()) return;
    const electronicReleaseReference = normalizeReleaseLink(form.electronicReleaseReference);
    const nextRecord = { ...form, electronicReleaseReference, archivistId: currentUser.id, archivistName: currentUser.name };
    setProcessing((records) => ({ ...records, [request.id]: nextRecord }));
    void saveProcessingRecord(request.id, nextRecord).catch((error) => console.error('Failed to save processing record:', error));
    if (request.documentType === 'Electronic') {
      void saveElectronicReleaseLinkRecord(request.id, {
        electronicReleaseReference,
        releasedBy: currentUser.id,
        releasedByName: currentUser.name,
        releasedAt: new Date().toISOString(),
      }).catch((error) => console.error('Failed to save electronic release link:', error));
    }
    updateRequestStatus(request.id, 'Released', 'Released document', form.releaseRemarks, { assignedArchivistId: currentUser.id, assignedArchivistName: currentUser.name });
    setPath('/archivist');
  };
  return <section className="page"><PageTitle title="Archivist Processing" subtitle={`${request.requestNo} - ${request.documentType}`} />{errors.length > 0 && <AlertList items={errors} />}{isReleasedViewOnly && <div className="ui-alert">This request has already been released in good condition and is now view-only.</div>}<div className="toolbar-row"><span className="helper-text">Approved return/access deadline: {request.borrowReturnDueDate || 'Not set'}. Turnaround guide: active files same day; archived physical files 1 to 2 working days.</span>{!isReleasedViewOnly && request.status !== 'Processing' && <Button variant="secondary" type="button" onClick={startProcessing}>Start Processing</Button>}</div><div className="form-grid">{request.documentType === 'Physical' ? <><Field label="Name of Archivist" value={currentUser.name} readOnly /><Field label="Name of Borrower" value={form.borrowerName} readOnly={isReleasedViewOnly} onChange={(v) => update('borrowerName', v)} /><Field label="Date Received" type="date" value={form.dateReceived} readOnly={isReleasedViewOnly} onChange={(v) => update('dateReceived', v)} /><Field label="Date Released" type="date" value={form.dateReleased} min={form.dateReceived || today()} readOnly={isReleasedViewOnly} onChange={(v) => update('dateReleased', v)} /><Field label="Expected Date of Return" type="date" value={form.expectedReturnDate} min={form.dateReleased || today()} readOnly={isReleasedViewOnly} onChange={(v) => update('expectedReturnDate', v)} /><Field label="Condition Before Release" type="select" value={form.physicalConditionBeforeRelease} options={['Good Condition', 'With Existing Damage', 'With Missing Pages', 'With Markings', 'Other']} readOnly={isReleasedViewOnly} onChange={(v) => update('physicalConditionBeforeRelease', v)} /><Field label="Storage Location" value={form.storageLocation} readOnly={isReleasedViewOnly} onChange={(v) => update('storageLocation', v)} /></> : <><Field label="File Released Via" type="select" value={form.electronicReleaseMethod} options={['Link', 'Shared Drive', 'Cloud Platform', 'Other']} readOnly={isReleasedViewOnly} onChange={(v) => update('electronicReleaseMethod', v)} /><Field label="Electronic Release Link" type="url" value={form.electronicReleaseReference} placeholder="https://..." readOnly={isReleasedViewOnly} onChange={(v) => update('electronicReleaseReference', v)} /><p className="helper-text">For electronic requests, the archivist uploads or shares the file using this link.</p><Field label="Access Expiry Date" type="date" value={form.accessExpiryDate} min={today()} readOnly={isReleasedViewOnly} onChange={(v) => update('accessExpiryDate', v)} /><label className="agreement"><input type="checkbox" checked={form.deletionConfirmationRequired} disabled={isReleasedViewOnly} onChange={(e) => update('deletionConfirmationRequired', e.target.checked)} /> Deletion confirmation required</label></>}<Field className="wide" label="Release Remarks" type="textarea" value={form.releaseRemarks} readOnly={isReleasedViewOnly} onChange={(v) => update('releaseRemarks', v)} /></div>{!isReleasedViewOnly && <Button onClick={release}>Save and Mark Released</Button>}</section>;
}
function ClosurePage({ request, currentUser, processing, closures, incidents, setClosures, updateRequestStatus, setIncidents }) {
  const record = processing[request?.id] || {};
  const [form, setForm] = useState(closures[request?.id] || { dateReturned: today(), conditionUponReturn: 'Complete', isComplete: true, hasDamage: false, hasMarkings: false, missingPages: false, refiledLocation: '', accessRevoked: false, deletionConfirmed: false, validatedBy: currentUser.id, validationDate: today(), closureRemarks: '' });
  const [errors, setErrors] = useState([]);
  if (!request) return <Empty message="Request not found." />;
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const hasIssue = form.hasDamage || form.hasMarkings || form.missingPages || form.isComplete === false || ['With Damage', 'With Markings', 'Missing Pages', 'Other'].includes(form.conditionUponReturn);
  const validateClosure = () => {
    const nextErrors = [];
    if (request.documentType === 'Physical') {
      if (!form.dateReturned) nextErrors.push('Date returned is required.');
      if (!form.conditionUponReturn) nextErrors.push('Condition upon return is required.');
      if (!form.refiledLocation?.trim()) nextErrors.push('Refiled location is required.');
    } else {
      if (!form.accessRevoked && !form.deletionConfirmed) nextErrors.push('Access must be revoked or deletion must be confirmed before closure.');
      if (record.deletionConfirmationRequired && !form.deletionConfirmed) nextErrors.push('Deletion confirmation is required for this release.');
      if (!form.validatedBy) nextErrors.push('Validated by is required.');
      if (!form.validationDate) nextErrors.push('Validation date is required.');
    }
    if (hasOpenIncident(request, incidents)) nextErrors.push('Open incidents must be resolved before closure.');
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };
  const close = () => {
    if (!validateClosure()) return;
    const closureRecord = { ...form, validatedBy: form.validatedBy || currentUser.id, validatedByName: currentUser.name, closedBy: currentUser.id, closedByName: currentUser.name, closedAt: new Date().toLocaleString() };
    setClosures((records) => ({ ...records, [request.id]: closureRecord }));
    void saveClosureRecord(request.id, closureRecord).catch((error) => console.error('Failed to save closure record:', error));
    if (request.documentType === 'Physical' && hasIssue) {
      const incidentRecord = { id: crypto.randomUUID(), requestId: request.id, reportedBy: currentUser.id, reportedByName: currentUser.name, incidentType: form.hasDamage || form.conditionUponReturn === 'With Damage' ? 'Damaged' : form.missingPages || form.conditionUponReturn === 'Missing Pages' ? 'Missing' : 'Altered', incidentDescription: 'Issue discovered during return and closure. Archivist must review before closure.', actionTaken: 'Incident report created; closure is blocked until resolved.', status: 'Open', createdAt: new Date().toLocaleString() };
      setIncidents((items) => [incidentRecord, ...items]);
      void saveIncidentRecord(incidentRecord).catch((error) => console.error('Failed to save incident record:', error));
      updateRequestStatus(request.id, 'Incident Reported', 'Incident created during closure', form.closureRemarks);
      return;
    }
    updateRequestStatus(request.id, canCloseRequest(request, record, closureRecord, incidents) ? 'Closed' : 'For Closure', 'Closure evaluated', form.closureRemarks);
  };
  return <section className="page"><PageTitle title="Return and Closure" subtitle={request.requestNo} />{errors.length > 0 && <AlertList items={errors} />}<div className="form-grid">{request.documentType === 'Physical' ? <><Field label="Date Returned" type="date" value={form.dateReturned} onChange={(v) => update('dateReturned', v)} /><Field label="Condition Upon Return" type="select" value={form.conditionUponReturn} options={['Complete', 'With Damage', 'With Markings', 'Missing Pages', 'Other']} onChange={(v) => update('conditionUponReturn', v)} /><Field label="Refiled Location" value={form.refiledLocation} onChange={(v) => update('refiledLocation', v)} />{['isComplete', 'hasDamage', 'hasMarkings', 'missingPages'].map((key) => <label className="agreement" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} /> {humanize(key)}</label>)}</> : <>{['accessRevoked', 'deletionConfirmed'].map((key) => <label className="agreement" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} /> {humanize(key)}</label>)}<Field label="Validated By" value={currentUser.name} readOnly /><Field label="Validation Date" type="date" value={form.validationDate} onChange={(v) => update('validationDate', v)} /></>}<Field className="wide" label="Closure Remarks" type="textarea" value={form.closureRemarks} onChange={(v) => update('closureRemarks', v)} /></div>{request.documentType === 'Physical' && hasIssue && <div className="ui-alert">Return issues will create an incident report instead of closing automatically.</div>}<Button onClick={close}>Evaluate Closure</Button></section>;
}
function Incidents({ incidents, requests, setPath }) {
  return <section className="page incidents-page"><PageTitle title="Incident Reports" subtitle="Lost, missing, damaged, altered, overdue, or improperly handled records." /><div className="toolbar-row"><span className="helper-text">Incident handling is required for damage, missing pages, unauthorized sharing, overdue returns, and unrecalled access.</span><Button variant="secondary" type="button" onClick={() => setPath('/incidents/new')}>Create Incident</Button></div><IncidentTable incidents={incidents} requests={requests} setPath={setPath} /></section>;
}

function NewIncident({ requests, currentUser, setIncidents, updateRequestStatus, setPath }) {
  const [form, setForm] = useState({ requestId: requests[0]?.id || '', incidentType: 'Damaged', incidentDescription: '', actionTaken: '', status: 'Open' });
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const save = () => {
    if (!form.requestId || !form.incidentDescription.trim()) return;
    const incidentRecord = { ...form, id: crypto.randomUUID(), reportedBy: currentUser.id, reportedByName: currentUser.name, createdAt: new Date().toLocaleString() };
    setIncidents((items) => [incidentRecord, ...items]);
    void saveIncidentRecord(incidentRecord).catch((error) => console.error('Failed to save incident record:', error));
    updateRequestStatus(form.requestId, 'Incident Reported', 'Created incident report', form.incidentDescription);
    setPath('/incidents');
  };
  return <section className="page"><PageTitle title="Create Incident Report" /><div className="form-grid"><label className="field"><span>Request</span><Select value={form.requestId} onChange={(event) => update('requestId', event.target.value)}>{requests.map((request) => <option value={request.id} key={request.id}>{request.requestNo} - {request.documentTitle}</option>)}</Select></label><Field label="Reported By" value={currentUser.name} readOnly /><Field label="Incident Type" type="select" value={form.incidentType} options={['Lost', 'Missing', 'Damaged', 'Altered', 'Unauthorized Sharing', 'Overdue', 'Access Not Revoked', 'Other']} onChange={(v) => update('incidentType', v)} /><Field label="Status" type="select" value={form.status} options={['Open', 'Under Review', 'Resolved', 'Closed']} onChange={(v) => update('status', v)} /><Field className="wide" label="Incident Description" type="textarea" value={form.incidentDescription} onChange={(v) => update('incidentDescription', v)} /><Field className="wide" label="Action Taken" type="textarea" value={form.actionTaken} onChange={(v) => update('actionTaken', v)} /></div><Button disabled={!form.requestId || !form.incidentDescription} onClick={save}>Create Incident</Button></section>;
}
function Reports({ requests, incidents, auditLogs, users, setPath, branchesList, departmentsList }) {
  const [filter, setFilter] = useState({ branch: 'All', department: 'All', status: 'All', documentType: 'All', confidentialityLevel: 'All', requestorId: 'All', archivistId: 'All', dateFrom: '', dateTo: '' });
  const [activeReport, setActiveReport] = useState('Request Summary');
  const filtered = requests.filter((request) => {
    const matchesSelects = ['branch', 'department', 'status', 'documentType', 'confidentialityLevel'].every((key) => filter[key] === 'All' || request[key] === filter[key]);
    const matchesPeople = (filter.requestorId === 'All' || request.requestorId === filter.requestorId) && (filter.archivistId === 'All' || request.assignedArchivistId === filter.archivistId);
    const afterStart = !filter.dateFrom || request.requestDate >= filter.dateFrom;
    const beforeEnd = !filter.dateTo || request.requestDate <= filter.dateTo;
    return matchesSelects && matchesPeople && afterStart && beforeEnd;
  });
  const reportTabs = [
    { label: 'Request Summary', requests: filtered },
    { label: 'Pending Approval', requests: filtered.filter((request) => request.status === 'Pending Approval') },
    { label: 'Archivist Processing', requests: filtered.filter((request) => ['Forwarded to Archivist', 'Processing'].includes(request.status)) },
    { label: 'Released Physical Documents', requests: filtered.filter((request) => request.documentType === 'Physical' && request.status === 'Released') },
    { label: 'Overdue', requests: filtered.filter((request) => request.computedStatus === 'Overdue') },
    { label: 'Electronic Access Revocation', requests: filtered.filter((request) => request.documentType === 'Electronic' && request.status === 'Released') },
    { label: 'Closed Requests', requests: filtered.filter((request) => request.status === 'Closed') },
    { label: 'Incidents', count: incidents.length },
    { label: 'Audit Trail', count: auditLogs.length },
  ];
  const activeTab = reportTabs.find((tab) => tab.label === activeReport) || reportTabs[0];
  const activeRequests = activeTab.requests || [];
  const exportCsv = () => {
    const rows = [['Request No', 'Document', 'Type', 'Confidentiality', 'Status', 'Branch', 'Department', 'Date Needed', 'Return Due Date'], ...activeRequests.map((request) => [request.requestNo, request.documentTitle, request.documentType, request.confidentialityLevel, request.computedStatus || request.status, request.branch, request.department, request.dateNeeded, request.borrowReturnDueDate])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab.label.toLowerCase().replaceAll(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page reports-page">
      <PageTitle title="Reports" subtitle="Export-ready monitoring tables with branch, department, date range, status, document type, confidentiality, requestor, and archivist filters." />
      <div className="filters"><Field label="Branch" type="select" value={filter.branch} options={['All', ...branchesList]} onChange={(v) => setFilter({ ...filter, branch: v })} /><Field label="Department" type="select" value={filter.department} options={['All', ...departmentsList]} onChange={(v) => setFilter({ ...filter, department: v })} /><Field label="Date From" type="date" value={filter.dateFrom} onChange={(v) => setFilter({ ...filter, dateFrom: v })} /><Field label="Date To" type="date" value={filter.dateTo} onChange={(v) => setFilter({ ...filter, dateTo: v })} /><Field label="Status" type="select" value={filter.status} options={['All', ...statuses]} onChange={(v) => setFilter({ ...filter, status: v })} /><Field label="Document Type" type="select" value={filter.documentType} options={['All', 'Physical', 'Electronic']} onChange={(v) => setFilter({ ...filter, documentType: v })} /><Field label="Confidentiality" type="select" value={filter.confidentialityLevel} options={['All', ...confidentialityLevels]} onChange={(v) => setFilter({ ...filter, confidentialityLevel: v })} /><label className="field"><span>Requestor</span><Select value={filter.requestorId} onChange={(event) => setFilter({ ...filter, requestorId: event.target.value })}><option value="All">All</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</Select></label><label className="field"><span>Archivist</span><Select value={filter.archivistId} onChange={(event) => setFilter({ ...filter, archivistId: event.target.value })}><option value="All">All</option>{users.filter((user) => user.role === 'archivist').map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</Select></label></div>
      <div className="toolbar-row"><span className="helper-text">Current report: {activeTab.label}</span><Button variant="secondary" type="button" disabled={!activeRequests.length} onClick={exportCsv}>Export CSV</Button></div>
      <div className="report-tabs">
        {reportTabs.map((tab) => (
          <Button type="button" variant={activeReport === tab.label ? 'default' : 'secondary'} key={tab.label} onClick={() => setActiveReport(tab.label)}>
            {tab.label}: {tab.requests ? tab.requests.length : tab.count}
          </Button>
        ))}
      </div>
      {activeReport === 'Incidents' ? (
        <IncidentTable incidents={incidents} requests={requests} setPath={setPath} />
      ) : activeReport === 'Audit Trail' ? (
        <AuditTrailTable logs={auditLogs} users={users} setPath={setPath} />
      ) : (
        <RequestTable title={`${activeTab.label} Results`} requests={activeRequests} setPath={setPath} />
      )}
    </section>
  );
}
function IncidentTable({ incidents, requests, setPath }) {
  return <Card className="table-card"><Table><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Action Taken</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{incidents.map((incident) => <TableRow key={incident.id} onClick={() => setPath(`/requests/${incident.requestId}`)}><TableCell>{requests.find((request) => request.id === incident.requestId)?.requestNo}</TableCell><TableCell>{incident.incidentType}</TableCell><TableCell>{incident.incidentDescription}</TableCell><TableCell>{incident.actionTaken}</TableCell><TableCell>{incident.status}</TableCell></TableRow>)}{!incidents.length && <TableRow><TableCell colSpan="5" className="empty">No incident reports.</TableCell></TableRow>}</TableBody></Table></Card>;
}

function Users({ users, setUsers, currentUserId, currentUser, branchesList, departmentsList }) {
  const branchOptions = useMemo(() => [...new Set([
    ...(Array.isArray(branchesList) ? branchesList : []),
    ...branches,
  ].filter((value) => Boolean(value) && value !== 'Main Office' && value !== 'Head Office'))], [branchesList]);
  const departmentOptions = useMemo(() => [...new Set([
    ...(Array.isArray(departmentsList) ? departmentsList : []),
    ...departments,
  ].filter(Boolean))], [departmentsList]);
  const defaultBranch = branchOptions[0] || branches[0] || '';
  const defaultDepartment = departmentOptions[0] || departments[0] || '';
  const [userList, setUserList] = useState(users);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'requestor', branch: defaultBranch, department: defaultDepartment });
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    setUserList(users);
  }, [users]);

  const reloadUsersFromSupabase = useCallback(async () => {
    if (normalizeRole(currentUser?.role) !== 'superadmin') return false;
    if (!supabaseConfig.isConfigured || !supabase) return false;

    const { data, error } = await loadAdminDashboardData();
    if (error || !Array.isArray(data?.users)) return false;

    const nextUsers = normalizeLoadedUsers(data.users);
    setUserList(nextUsers);
    setUsers(nextUsers);
    return true;
  }, [currentUser?.role, setUsers]);

  useEffect(() => {
    let cancelled = false;

    const refreshAllUsers = async () => {
      if (cancelled) return;
      await reloadUsersFromSupabase();
    };

    void refreshAllUsers();

    return () => {
      cancelled = true;
    };
  }, [reloadUsersFromSupabase]);

  useEffect(() => {
    if (!branchOptions.length && !departmentOptions.length) return;
    setNewUser((current) => {
      const nextBranch = branchOptions.includes(current.branch) ? current.branch : (current.branch || defaultBranch || branchOptions[0] || '');
      const nextDepartment = current.role === 'ceo'
        ? 'All'
        : departmentOptions.includes(current.department)
          ? current.department
          : (current.department || defaultDepartment || departmentOptions[0] || '');
      if (nextBranch === current.branch && nextDepartment === current.department) return current;
      return { ...current, branch: nextBranch, department: nextDepartment };
    });
  }, [branchOptions, departmentOptions, defaultBranch, defaultDepartment]);

  const startEdit = (user) => {
    setEditingId(user.id);
    setErrors([]);
    setDraft({
      ...user,
      branch: user.branch || defaultBranch,
      department: user.role === 'ceo' ? 'All' : (user.department || defaultDepartment),
      password: '',
    });
    setShowEditPassword(false);
  };

  const closeEditUserModal = () => {
    setEditingId(null);
    setDraft({});
    setShowEditPassword(false);
    setErrors([]);
  };

  const saveEdit = async () => {
    const target = users.find((item) => item.id === editingId);
    if (!target) return;
    const name = draft.name?.trim() || target.name;
    const email = draft.email?.trim().toLowerCase() || target.email;
    const validationErrors = [];
    if (!name) validationErrors.push('Full name is required.');
    if (!email) validationErrors.push('Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationErrors.push('Please enter a valid email address.');
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    const avatar = draft.avatarCustom ? draft.avatar : getAvatarUrl(name);
    const nextStatus = draft.status || target.status || (target.is_active === false ? 'Inactive' : 'Active');
    const nextRole = normalizeRole(draft.role || target.role);
    const nextProfile = {
      full_name: name,
      email,
      branch: draft.branch?.trim() || target.branch,
      department: nextRole === 'ceo' ? 'All' : (draft.department?.trim() || target.department),
      role: nextRole,
      status: nextStatus,
      avatar_url: avatar,
    };

    setIsSavingEdit(true);
    try {
      if (supabaseConfig.isConfigured && supabase) {
        const { data, error } = await updateUserAccount({
          userId: editingId,
          profile: nextProfile,
        });
        if (error) {
          setErrors([readErrorMessage(error, 'Update user failed.')]);
          return;
        }

        const savedProfile = data?.profile || null;
        if (savedProfile) {
          setUsers((items) => items.map((item) => {
            if (item.id !== editingId) return item;
            return {
              ...item,
              id: savedProfile.id || item.id,
              name: savedProfile.full_name || name,
              email: savedProfile.email || email,
              avatar: savedProfile.avatar_url || avatar,
              avatarCustom: Boolean(savedProfile.avatar_url),
              status: savedProfile.status || nextStatus,
              is_active: savedProfile.is_active !== false,
              role: normalizeRole(savedProfile.role || nextRole),
              branch: savedProfile.branch ?? nextProfile.branch,
              department: savedProfile.department ?? nextProfile.department,
              position: savedProfile.position ?? item.position ?? '',
              createdAt: savedProfile.created_at || item.createdAt || item.created_at || '',
              createdBy: savedProfile.created_by || item.createdBy || item.created_by || '',
              createdByName: savedProfile.created_by_name || item.createdByName || item.created_by_name || '',
            };
          }));
          setErrors([]);
          closeEditUserModal();
          return;
        }
      }

      setUsers((items) => items.map((item) => {
        if (item.id !== editingId) return item;
        return {
          ...item,
          ...draft,
          password: undefined,
          name,
          email,
          avatar,
          status: nextStatus,
          is_active: nextStatus !== 'Inactive',
          role: nextProfile.role,
          branch: nextProfile.branch,
          department: nextProfile.department,
        };
      }));
      setErrors([]);
      closeEditUserModal();
    } finally {
      setIsSavingEdit(false);
    }
  };

  const updateNewUser = (key, value) => setNewUser((current) => ({ ...current, [key]: value }));

  const handleNewUserRoleChange = (value) => {
    setNewUser((current) => ({
      ...current,
      role: value,
      department: value === 'ceo' ? 'All' : current.department === 'All' ? defaultDepartment : current.department,
    }));
  };

  const handleDraftRoleChange = (value) => {
    setDraft((current) => ({
      ...current,
      role: value,
      department: value === 'ceo' ? 'All' : current.department === 'All' ? defaultDepartment : current.department,
    }));
  };

  const closeCreateUserModal = () => {
    setIsCreateUserModalOpen(false);
    setNewUser({ fullName: '', email: '', password: '', confirmPassword: '', role: 'requestor', branch: defaultBranch, department: defaultDepartment });
    setErrors([]);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const addUser = async () => {
    const fullName = newUser.fullName.trim();
    const email = newUser.email.trim().toLowerCase();
    const password = newUser.password.trim();
    const confirmPassword = newUser.confirmPassword.trim();
    const nextErrors = [];

    if (!fullName) nextErrors.push('Full name is required.');
    if (!email) nextErrors.push('Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.push('Please enter a valid email address.');
    if (!password) nextErrors.push('Password is required.');
    else if (password.length < 6) nextErrors.push('Password must be at least 6 characters.');
    if (!confirmPassword) nextErrors.push('Confirm password is required.');
    if (password && confirmPassword && password !== confirmPassword) nextErrors.push('Passwords do not match.');
    if (!newUser.branch) nextErrors.push('Branch is required.');
    if (!newUser.department) nextErrors.push('Department is required.');
    if (!newUser.role) nextErrors.push('Role is required.');
    if (users.some((user) => user.email.toLowerCase() === email)) nextErrors.push('Email is already used by another account.');
    if (nextErrors.length) {
      setErrors(nextErrors);
      return;
    }

    setErrors([]);
    setIsCreatingUser(true);
    try {
      const branch = String(newUser.branch || '').trim() || defaultBranch;
      const department = String(newUser.department || '').trim() || defaultDepartment;
      const avatar = getAvatarUrl(fullName);
      let next = {
        id: crypto.randomUUID(),
        name: fullName,
        email,
        role: newUser.role,
        branch,
        department,
        avatar,
        status: 'Active',
        is_active: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id || currentUserId || '',
        createdByName: currentUser?.name || users.find((user) => user.id === currentUserId)?.name || 'SUPER ADMIN - ICT',
        avatarCustom: false,
      };

      const creatorName = currentUser?.name || users.find((user) => user.id === currentUserId)?.name || 'SUPER ADMIN - ICT';

      if (supabaseConfig.isConfigured && supabase) {
        const { data, error } = await createUserAccount({
          email,
          password,
          profile: {
            full_name: fullName,
            branch,
            department,
            role: newUser.role,
            avatar_url: avatar,
            created_by: currentUser?.id || currentUserId || null,
            created_by_name: creatorName,
          },
        });

        if (error) {
          setErrors([readErrorMessage(error, 'Create user failed.')]);
          return;
        }

        const syncedId = data?.profile?.id || data?.user?.id || data?.id;
        if (syncedId) {
          next.id = syncedId;
        }
        if (data?.profile) {
          next = {
            ...next,
            ...data.profile,
            id: data.profile.id || syncedId || next.id,
            status: data.profile.status || 'Active',
            is_active: data.profile.is_active !== false,
            createdBy: data.profile.createdBy || data.profile.created_by || next.createdBy,
            createdByName: data.profile.createdByName || data.profile.created_by_name || next.createdByName,
          };
        }

        await reloadUsersFromSupabase();
      }

      setUsers((items) => {
        const existingIndex = items.findIndex((user) => user.email.toLowerCase() === email);
        if (existingIndex >= 0) {
          const cloned = [...items];
          cloned[existingIndex] = { ...cloned[existingIndex], ...next };
          return cloned;
        }
        return [next, ...items];
      });
      closeCreateUserModal();
    } finally {
      setIsCreatingUser(false);
    }
  };

  const deleteUser = async (id) => {
    if (id === currentUserId) return;
    if (supabaseConfig.isConfigured && supabase) {
      const { error } = await deleteUserAccount({ userId: id });
      if (error) {
        setErrors([readErrorMessage(error, 'Delete user failed.')]);
        return;
      }
    }
    setUsers((items) => items.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft({});
    }
  };

  return (
    <section className="page users-page">
      <PageTitle title="User Management" subtitle={`Admin view of users, roles, branches, departments, and active status. ${supabaseConfig.isConfigured ? 'Supabase sync on.' : 'Supabase sync off.'} All profiles from the database are shown here.`} />
      <div className="toolbar-row">
        <span className="helper-text">Showing {userList.length} system account{userList.length === 1 ? '' : 's'} from Supabase.</span>
      </div>
      {errors.length > 0 && <AlertList items={errors} />}
      {notice && <div className="ui-alert">{notice}</div>}
      <div className="table-card add-user-card">
        <h3>Create User Account</h3>
        <p className="helper-text">Only super admins can create accounts here. Click the button to open the account form.</p>
        <div className="actions" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button className="create-user-button" type="button" onClick={() => setIsCreateUserModalOpen(true)}>Create User</Button>
        </div>
      </div>
      <div className="table-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userList.map((user) => {
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="user-cell">
                      <img className="avatar-image" src={user.avatar || getAvatarUrl(user.name)} alt={user.name} />
                      <div>
                        <strong>{user.name}</strong>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><Badge variant={user.status === 'Inactive' ? 'destructive' : 'success'}>{user.status || (user.is_active === false ? 'Inactive' : 'Active')}</Badge></TableCell>
                  <TableCell>{roles[user.role]}</TableCell>
                  <TableCell>{user.branch}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</TableCell>
                  <TableCell className="actions-cell" onClick={(event) => event.stopPropagation()}>
                    <Button variant="secondary" size="sm" type="button" onClick={() => startEdit(user)}>Edit</Button>
                    <Button variant="destructive" size="sm" type="button" disabled={user.id === currentUserId} onClick={() => { void deleteUser(user.id); }}>Delete</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {editingId && (
        <div className="profile-editor edit-user-modal" role="dialog" aria-modal="true" aria-label="Edit user">
          <div className="profile-editor-panel edit-user-panel">
            <div className="modal-header">
              <div>
                <h2>Edit User</h2>
                <p className="helper-text">Update this workspace account stored directly in Supabase.</p>
              </div>
              <Button className="ghost modal-close-button" type="button" variant="ghost" onClick={closeEditUserModal} aria-label="Close">x</Button>
            </div>
            {errors.length > 0 && <AlertList items={errors} />}
            <div className="form-grid edit-user-grid">
              <Field label="Username" value={draft.name || ''} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
              <div className="field">
                <span>Password</span>
                <PasswordInput value={draft.password || ''} onChange={(value) => setDraft((current) => ({ ...current, password: value }))} isVisible={showEditPassword} onToggle={() => setShowEditPassword((isVisible) => !isVisible)} />
              </div>
              <Field label="Full Name" value={draft.name || ''} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
              <Field label="Branch" type="select" value={draft.branch || defaultBranch} options={branchOptions} onChange={(value) => setDraft((current) => ({ ...current, branch: value }))} />
              <Field label="Email" type="email" value={draft.email || ''} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} />
              <Field label="Role" type="select" value={draft.role || 'requestor'} options={Object.keys(roles)} onChange={handleDraftRoleChange} />
              <Field label="Status" type="select" value={draft.status || 'Active'} options={['Active', 'Inactive']} onChange={(value) => setDraft((current) => ({ ...current, status: value }))} />
              <Field label="Department" type="select" value={draft.role === 'ceo' ? 'All' : (draft.department || defaultDepartment)} options={draft.role === 'ceo' ? ['All'] : departmentOptions} readOnly={draft.role === 'ceo'} onChange={(value) => setDraft((current) => ({ ...current, department: value }))} />
            </div>
            <div className="actions edit-user-actions">
              <Button variant="ghost" type="button" onClick={closeEditUserModal}>Cancel</Button>
              <Button type="button" disabled={isSavingEdit} onClick={() => { void saveEdit(); }}>{isSavingEdit ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </div>
        </div>
      )}
      {isCreateUserModalOpen && (
        <div className="profile-editor create-user-modal" role="dialog" aria-modal="true" aria-label="Create user account">
          <div className="profile-editor-panel create-user-panel">
            <div className="modal-header">
              <div>
                <h2>Create User Account</h2>
                <p className="helper-text">Fill in the details below to create a new system account.</p>
              </div>
              <Button className="ghost" type="button" variant="ghost" onClick={closeCreateUserModal}>Close</Button>
            </div>
            {errors.length > 0 && <AlertList items={errors} />}
            <div className="form-grid create-user-grid">
              <Field label="Full Name" value={newUser.fullName} onChange={(value) => updateNewUser('fullName', value)} />
              <Field label="Email" type="email" value={newUser.email} onChange={(value) => updateNewUser('email', value)} />
              <div className="field">
                <span>Password</span>
                <PasswordInput value={newUser.password} onChange={(value) => updateNewUser('password', value)} isVisible={showNewPassword} onToggle={() => setShowNewPassword((isVisible) => !isVisible)} />
              </div>
              <div className="field">
                <span>Confirm Password</span>
                <PasswordInput value={newUser.confirmPassword} onChange={(value) => updateNewUser('confirmPassword', value)} isVisible={showConfirmPassword} onToggle={() => setShowConfirmPassword((isVisible) => !isVisible)} />
              </div>
              <Field label="Branch" type="select" value={newUser.branch} options={branchOptions} onChange={(value) => updateNewUser('branch', value)} />
              <Field label="Department" type="select" value={newUser.department} options={newUser.role === 'ceo' ? ['All', ...departmentOptions.filter((item) => item !== 'All')] : departmentOptions} onChange={(value) => updateNewUser('department', value)} />
              <Field label="Role" type="select" value={newUser.role} options={Object.keys(roles)} onChange={handleNewUserRoleChange} />
            </div>
            <div className="actions create-user-actions">
              <Button type="button" disabled={isCreatingUser} onClick={addUser}>{isCreatingUser ? 'Creating...' : 'Create User'}</Button>
              <Button variant="ghost" type="button" onClick={closeCreateUserModal}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const policyReferenceSections = [
  {
    title: 'Definitions',
    items: [
      'Confidential Document - Any document containing sensitive, restricted, proprietary, personal, financial, legal, or operational information that requires enhanced protection and limited access.',
      'Data Privacy Officer (DPO) - The officer responsible for ensuring compliance with data privacy laws, regulations, and internal policies related to the handling of personal and sensitive information.',
      'Document Custodian - The individual or office responsible for maintaining, securing, organizing, and controlling access to records and documents.',
      'Document Retrieval - The process of requesting, locating, accessing, releasing, and recording the use of physical or electronic documents.',
      'Electronic Document - Any information or record stored, transmitted, or maintained in digital format, including files, emails, scanned records, databases, cloud-stored documents, and system-generated records.',
      'Legitimate Business Need - A valid operational, administrative, legal, regulatory, audit, or business-related purpose that justifies access to a document.',
      'Physical Document - Any paper-based record, file, report, contract, application, correspondence, or document maintained in hard-copy form.',
      'Requestor - An individual who formally requests access to or retrieval of a document for an authorized business purpose.',
      'Sensitive Information - Information that may cause harm to individuals or the Cooperative if disclosed, altered, lost, or accessed without authorization.',
      'Tracking Log - A manual or electronic record used to document document retrieval activities, including request details, approvals, release dates, return dates, and status updates.',
      'Unauthorized Access - Access to, retrieval of, or use of documents without proper approval, authority, or legitimate business purpose.',
    ],
  },
  {
    title: 'Storage and Security',
    items: [
      'Designated Locations - All active and archived documents are assigned specific recorded storage areas with strict controls to prevent loss, damage, or unauthorized access.',
      'System Restrictions - Digital files must reside only in approved cooperative systems, servers, or secure cloud platforms.',
      'Custody - Only the officially assigned Branch Archivist is authorized to locate, retrieve, and physically release archived hard copies.',
    ],
  },
  {
    title: 'Request and Retrieval Procedure',
    items: [
      'Submission: The requestor submits an online Document Retrieval Request containing the document title, purpose of retrieval, date needed, and format type, either physical or electronic.',
      'Review and Approval: Requests are routed to the designated approver based on role and confidentiality before processing.',
      'Processing: Once approved, the assigned Branch Archivist retrieves and releases the files.',
    ],
  },
  {
    title: 'Formats and Turnaround Times',
    items: [
      'Physical Documents: Only the Branch Archivist can handle physical files. Turnaround time is immediate or same-day for active files, and 1 to 2 working days for archived records.',
      'Electronic Documents: Soft copies are shared through secure channels such as corporate email, shared links, or cloud platforms.',
    ],
  },
  {
    title: 'Usage, Return, and Disposal',
    items: [
      'Physical Tracking: When a physical document is borrowed, the archivist logs the borrower name, release date, and expected return date. Documents must be returned intact without markings, alterations, or damage.',
      'Digital Lifespan: Electronic copies are subject to access controls and are often time-bound. Users must securely delete shared digital copies from local storage, emails, and recycle bins once the approved task is complete.',
      'Closing Requests: A request is only considered officially Closed once the physical copy is safely refiled or the electronic access is completely revoked and deletion is confirmed.',
    ],
  },
  {
    title: 'System Guidelines',
    items: [
      'Retrieval of physical and electronic documents must be authorized, documented, and approved; access is limited to those with a legitimate business need; confidential files must be reviewed and approved by the Data Privacy Officer before release; physical documents are stored securely and released only by the authorized archivist; electronic documents are stored in approved systems and shared through secure channels; documents must be used strictly for the approved purpose; returned documents must be verified, refiled, and tracked; electronic access must be revoked and deletion confirmed when required; all retrieval and handling activities must be logged and monitored.',
    ],
  },
  {
    title: 'Procedure',
    items: [
      'Requests are submitted through the system, reviewed and approved by the authorized approvers, forwarded to the archivist for processing, released with required tracking details, and formally closed only after return, revocation, or deletion has been completed.',
    ],
  },
  {
    title: 'Roles and Responsibilities',
    items: [
      'Requestors, approving authorities, archivists, branch heads, and the Data Privacy Officer each have defined responsibilities for secure handling, approval, tracking, return, monitoring, and compliance. The Data Privacy Officer determines whether confidential files may be borrowed or released.',
    ],
  },
  {
    title: 'Policy Violations',
    items: [
      'Any breach of this manual is subject to disciplinary action according to the HRAD Policy Manual.',
      'Violations include accessing files beyond the authorized clearing level.',
      'Violations include sharing, forwarding, or duplicating documents without authorization.',
      'Violations include failing to delete digital files or return physical documents on time.',
      'Violations include storing cooperative data on personal accounts or unauthorized devices.',
    ],
  },
  {
    title: 'Lost or Missing Documents',
    items: [
      'Any lost, misplaced, or unaccounted physical or electronic document must be reported immediately and followed up through the prescribed incident and explanation process.',
    ],
  },
];

const systemProcessSteps = [
  {
    step: '1',
    title: 'Secure Storage',
    owner: 'Branch Archivist',
    status: 'Recorded Storage Location',
    description: 'Active and archived documents are assigned designated locations; digital files stay only in approved cooperative systems, servers, or secure cloud platforms.',
  },
  {
    step: '2',
    title: 'Submit Request',
    owner: 'Requestor',
    status: 'Pending Approval',
    description: 'The requestor submits an online retrieval request with document title, legitimate business purpose, date needed, file format type, and agreement confirmation.',
  },
  {
    step: '3',
    title: 'Route Approval',
    owner: 'Approving Authority',
    status: 'Approved / Rejected',
    description: 'Requests route to the designated approver based on role and confidentiality before processing.',
  },
  {
    step: '4',
    title: 'Archivist Processing',
    owner: 'Archivist',
    status: 'Forwarded to Archivist / Processing',
    description: 'Approved requests move to the archivist queue for custody-controlled lookup, release preparation, borrower recording, and storage location checks.',
  },
  {
    step: '5',
    title: 'Release and Monitor',
    owner: 'Archivist / Requestor',
    status: 'Released / Overdue / Incident Reported',
    description: 'Physical records are processed within 1 to 2 working days, with active files taking less than a day; electronic files are shared through approved secure channels.',
  },
  {
    step: '6',
    title: 'Return or Delete',
    owner: 'Archivist',
    status: 'Returned / Access Revoked / Deletion Confirmed',
    description: 'Borrowers return physical files without damage or markings, while electronic copies are revoked and securely deleted from devices, emails, local storage, and recycle bins.',
  },
  {
    step: '7',
    title: 'Close and Audit',
    owner: 'System / Admin',
    status: 'For Closure / Closed',
    description: 'Closure is completed only after inspection, refiling, revocation, deletion confirmation, and incident checks pass, with every status change written to the audit trail.',
  },
];

function Settings({ theme, setTheme, initialSettings, onSettingsChange, onSave }) {
  const [branchesList, setBranchesList] = useState(() => {
    const next = Array.isArray(initialSettings?.branches) && initialSettings.branches.length
      ? initialSettings.branches
      : branches;
    return next.map(normalizeBranchName);
  });
  const [departmentsList, setDepartmentsList] = useState(() => {
    return Array.isArray(initialSettings?.departments) && initialSettings.departments.length
      ? initialSettings.departments
      : departments;
  });
  const [categoriesList, setCategoriesList] = useState(() => {
    return Array.isArray(initialSettings?.categories) && initialSettings.categories.length
      ? initialSettings.categories
      : documentCategories;
  });
  const [editingItem, setEditingItem] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [notice, setNotice] = useState('');
  const [addingSection, setAddingSection] = useState(null);
  const [newItemValue, setNewItemValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPolicyReferenceOpen, setIsPolicyReferenceOpen] = useState(false);

  useEffect(() => {
    const nextBranches = Array.isArray(initialSettings?.branches) && initialSettings.branches.length
      ? initialSettings.branches.map(normalizeBranchName)
      : branches.map(normalizeBranchName);
    const nextDepartments = Array.isArray(initialSettings?.departments) && initialSettings.departments.length
      ? initialSettings.departments
      : departments;
    const nextCategories = Array.isArray(initialSettings?.categories) && initialSettings.categories.length
      ? initialSettings.categories
      : documentCategories;
    setBranchesList(nextBranches);
    setDepartmentsList(nextDepartments);
    setCategoriesList(nextCategories);
  }, [initialSettings]);

  const startEdit = (section, index, value) => {
    setEditingItem({ section, index });
    setDraftValue(value);
    setNotice('');
  };

  const syncSettings = async (nextSettings, successMessage = 'Changes saved in Supabase.') => {
    setIsSaving(true);
    const result = await onSave?.(nextSettings);
    setIsSaving(false);
    if (result?.error) {
      setNotice(readErrorMessage(result.error, 'Failed to save settings.'));
      return false;
    }
    onSettingsChange?.(nextSettings);
    setNotice(successMessage);
    return true;
  };

  const saveEdit = async () => {
    const value = draftValue.trim();
    if (!editingItem || !value) return;
    const nextSettings = {
      branches: branchesList.map((item, index) => (editingItem.section === 'branches' && index === editingItem.index ? value : item)),
      departments: departmentsList.map((item, index) => (editingItem.section === 'departments' && index === editingItem.index ? value : item)),
      categories: categoriesList.map((item, index) => (editingItem.section === 'categories' && index === editingItem.index ? value : item)),
    };
    if (editingItem.section === 'branches') setBranchesList(nextSettings.branches);
    if (editingItem.section === 'departments') setDepartmentsList(nextSettings.departments);
    if (editingItem.section === 'categories') setCategoriesList(nextSettings.categories);
    setEditingItem(null);
    setDraftValue('');
    await syncSettings(nextSettings, 'Changes saved in Supabase.');
  };

  const deleteItem = async (section, index) => {
    const nextSettings = {
      branches: branchesList.filter((_, itemIndex) => !(section === 'branches' && itemIndex === index)),
      departments: departmentsList.filter((_, itemIndex) => !(section === 'departments' && itemIndex === index)),
      categories: categoriesList.filter((_, itemIndex) => !(section === 'categories' && itemIndex === index)),
    };
    setBranchesList(nextSettings.branches);
    setDepartmentsList(nextSettings.departments);
    setCategoriesList(nextSettings.categories);
    await syncSettings(nextSettings, 'Item removed and saved in Supabase.');
  };

  const addItem = (section) => {
    setAddingSection(section);
    setNewItemValue('');
    setEditingItem(null);
    setDraftValue('');
    setNotice('');
  };

  const saveNewItem = async () => {
    const value = newItemValue.trim();
    if (!addingSection || !value) return;
    const nextSettings = {
      branches: addingSection === 'branches' ? [...branchesList, value] : branchesList,
      departments: addingSection === 'departments' ? [...departmentsList, value] : departmentsList,
      categories: addingSection === 'categories' ? [...categoriesList, value] : categoriesList,
    };
    setBranchesList(nextSettings.branches);
    setDepartmentsList(nextSettings.departments);
    setCategoriesList(nextSettings.categories);
    setAddingSection(null);
    setNewItemValue('');
    await syncSettings(nextSettings, 'New item added and saved in Supabase.');
  };

  const cancelNewItem = () => {
    setAddingSection(null);
    setNewItemValue('');
    setNotice('');
  };

  const saveChanges = async () => {
    setEditingItem(null);
    setDraftValue('');
    const nextSettings = { branches: branchesList, departments: departmentsList, categories: categoriesList };
    await syncSettings(nextSettings, 'Changes saved in Supabase.');
  };

  return (
    <section className={`page settings-page ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <PageTitle title="System Settings" subtitle="Branches, departments, document categories, routing, and security settings." />
      <div className="toolbar-row">
        <span className="helper-text">{notice || 'Click any item to edit, delete, or save changes.'}</span>
        <Button className="secondary" type="button" onClick={() => { void saveChanges(); }} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
      <article className="info-card process-card">
        <div className="card-header">
          <h3>System Process</h3>
          <span className="helper-text">End-to-end document retrieval workflow inside the system.</span>
        </div>
        <div className="process-flow">
          {systemProcessSteps.map((item) => (
            <div className="process-step" key={item.step}>
              <div className="process-marker">{item.step}</div>
              <div className="process-content">
                <div className="process-heading">
                  <h4>{item.title}</h4>
                  <span>{item.owner}</span>
                </div>
                <strong>{item.status}</strong>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
      <article className="info-card policy-card">
        <button
          type="button"
          className="policy-toggle"
          aria-expanded={isPolicyReferenceOpen}
          onClick={() => setIsPolicyReferenceOpen((open) => !open)}
        >
          <div className="card-header policy-card-header">
            <h3>Document Retrieval Policy Reference</h3>
            <span className="policy-toggle-label">{isPolicyReferenceOpen ? 'Hide reference' : 'Show reference'}</span>
          </div>
        </button>
        {isPolicyReferenceOpen && (
          <div className="policy-content">
            {policyReferenceSections.map((section) => (
              <div className="policy-section" key={section.title}>
                <h4>{section.title}</h4>
                <ul>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </article>
      <div className="detail-grid">
        <EditableListCard title="Branches" items={branchesList} section="branches" editingItem={editingItem} draftValue={draftValue} onStartEdit={startEdit} onSaveEdit={saveEdit} onDelete={deleteItem} onAdd={addItem} onDraftChange={setDraftValue} onCancel={() => { setEditingItem(null); setDraftValue(''); }} addingSection={addingSection} newItemValue={newItemValue} onNewItemChange={setNewItemValue} onSaveNewItem={saveNewItem} onCancelNewItem={cancelNewItem} />
        <EditableListCard title="Departments" items={departmentsList} section="departments" editingItem={editingItem} draftValue={draftValue} onStartEdit={startEdit} onSaveEdit={saveEdit} onDelete={deleteItem} onAdd={addItem} onDraftChange={setDraftValue} onCancel={() => { setEditingItem(null); setDraftValue(''); }} addingSection={addingSection} newItemValue={newItemValue} onNewItemChange={setNewItemValue} onSaveNewItem={saveNewItem} onCancelNewItem={cancelNewItem} />
        <EditableListCard title="Document Categories" items={categoriesList} section="categories" editingItem={editingItem} draftValue={draftValue} onStartEdit={startEdit} onSaveEdit={saveEdit} onDelete={deleteItem} onAdd={addItem} onDraftChange={setDraftValue} onCancel={() => { setEditingItem(null); setDraftValue(''); }} addingSection={addingSection} newItemValue={newItemValue} onNewItemChange={setNewItemValue} onSaveNewItem={saveNewItem} onCancelNewItem={cancelNewItem} />
      </div>
    </section>
  );
}

function EditableListCard({ title, items, section, editingItem, draftValue, onStartEdit, onSaveEdit, onDelete, onAdd, onDraftChange, onCancel, addingSection, newItemValue, onNewItemChange, onSaveNewItem, onCancelNewItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const visibleItems = items || [];

  const handleStartEdit = (itemIndex, value) => {
    onStartEdit(section, itemIndex, value);
  };

  return (
    <article className="info-card">
      <button
        type="button"
        className="card-header settings-dropdown-header"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <div>
          <h3>{title}</h3>
          <span className="helper-text">{items.length} item{items.length === 1 ? '' : 's'}</span>
        </div>
        <span className="settings-dropdown-label">{isOpen ? 'Hide all' : 'Show all'}</span>
      </button>
      {isOpen && (
        <>
          <div className="add-inline-form">
            <Button className="secondary" type="button" onClick={() => onAdd(section)}>+ Add</Button>
            {addingSection === section && (
              <>
                <Input value={newItemValue} onChange={(event) => onNewItemChange(event.target.value)} placeholder={`New ${title}`} />
                <Button className="secondary" type="button" onClick={onSaveNewItem}>Save</Button>
                <Button variant="ghost" type="button" onClick={onCancelNewItem}>Cancel</Button>
              </>
            )}
          </div>
          <div className="stacked-list settings-scroll-list">
            {visibleItems.map((item, index) => {
              const isEditing = editingItem?.section === section && editingItem.index === index;
              return (
                <div className="list-item" key={`${section}-${index}`} onClick={() => !isEditing && handleStartEdit(index, item)}>
                  {isEditing ? <Input value={draftValue} onChange={(event) => onDraftChange(event.target.value)} /> : <span>{item}</span>}
                  <div className="action-group" onClick={(event) => event.stopPropagation()}>
                    {isEditing ? (
                      <>
                        <Button className="secondary" type="button" onClick={onSaveEdit}>Save</Button>
                        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button className="secondary" type="button" onClick={() => handleStartEdit(index, item)}>Edit</Button>
                        <Button variant="destructive" type="button" onClick={() => onDelete(section, index)}>Delete</Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {!visibleItems.length && <div className="settings-empty">No {title.toLowerCase()} yet.</div>}
          </div>
        </>
      )}
    </article>
  );
}

function AuditTrailTable({ logs, users, setPath }) {
  return <Card className="table-card"><CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Old</TableHead><TableHead>New</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader><TableBody>{logs.map((log) => <TableRow key={log.id} onClick={() => setPath?.(`/requests/${log.requestId}`)}><TableCell>{log.createdAt}</TableCell><TableCell>{users.find((user) => user.id === log.userId)?.name}</TableCell><TableCell>{log.action}</TableCell><TableCell>{log.oldStatus}</TableCell><TableCell>{log.newStatus}</TableCell><TableCell>{log.remarks}</TableCell></TableRow>)}{!logs.length && <TableRow><TableCell className="empty" colSpan="6">No audit events yet.</TableCell></TableRow>}</TableBody></Table></Card>;
}

function AuditLogsPage({ logs, users, requests, setPath }) {
  return <section className="page audit-logs-page"><PageTitle title="Audit Logs" subtitle="Admin-only monitoring for every important request status change and action." /><Card className="table-card"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Request</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Old Status</TableHead><TableHead>New Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader><TableBody>{logs.map((log) => <TableRow key={log.id} onClick={() => setPath(`/requests/${log.requestId}`)}><TableCell>{log.createdAt}</TableCell><TableCell>{requests.find((request) => request.id === log.requestId)?.requestNo || '-'}</TableCell><TableCell>{users.find((user) => user.id === log.userId)?.name || '-'}</TableCell><TableCell>{log.action}</TableCell><TableCell>{log.oldStatus}</TableCell><TableCell>{log.newStatus}</TableCell><TableCell>{log.remarks}</TableCell></TableRow>)}{!logs.length && <TableRow><TableCell className="empty" colSpan="7">No audit logs yet.</TableCell></TableRow>}</TableBody></Table></Card></section>;
}

function Empty({ message }) {
  return <div className="empty-state">{message}</div>;
}

function RoleDenied({ setPath }) {
  return <section className="page"><div className="empty-state"><h3>Access restricted</h3><p>Your current role cannot open this page.</p><button type="button" onClick={() => setPath('/dashboard')}>Back to Dashboard</button></div></section>;
}

export default App;
