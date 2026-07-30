import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const roles = {
  requestor: 'Staff - Requestor',
  branch_head: 'Manager - Approver of Requestor',
  department_head: 'Head - Approver of Requestors and Managers',
  dpo: 'Admin - DPO',
  ceo: 'Admin - CEO',
  archivist: 'Archivist - Process Approved Docs',
  admin: 'Admin - ICT',
  superadmin: 'Super Admin - ICT',
};

const adminRoles = ['admin', 'superadmin'];

const branches = ['Main Office', 'Culasi', 'Sibalom', 'San Jose', 'Balasan', 'Barotac Viejo', 'Molo', 'Janiuay', 'Caticlan', 'Kalibo', 'San Remigio'];
const departments = ['ICT Department', 'HRAD', 'Accounting', 'Audit', 'SACD', 'Lending', 'Savings', 'Broadband Division', 'Records / Archive'];
const statuses = ['Draft', 'Pending Approval', 'Rejected', 'Approved', 'Forwarded to Archivist', 'Processing', 'Released', 'Returned', 'Access Revoked', 'Deletion Confirmed', 'For Closure', 'Closed', 'Incident Reported', 'Overdue'];
const confidentialityLevels = ['Non Confidential', 'Confidential'];
const branchAliases = {
  'Head Office': 'Main Office',
  Barbaza: 'Culasi',
  Hamtic: 'Balasan',
  'Laua-an': 'Janiuay',
};

function normalizeBranchName(branch) {
  return branchAliases[branch] || branch || branches[0];
}

export function getAvatarUrl(name, gender) {
  const isFemale = gender === 'female';
  const palette = isFemale
    ? { bg1: '#f7b7d8', bg2: '#8b5cf6', hair: '#3b1d52', shirt: '#be185d', accent: '#f9a8d4' }
    : { bg1: '#8bd3ff', bg2: '#0f766e', hair: '#172554', shirt: '#1757a7', accent: '#93c5fd' };
  const hair = isFemale
    ? '<path d="M35 62c0-22 12-38 29-38s29 16 29 38v30H35V62z" fill="' + palette.hair + '"/><path d="M29 95c7-19 16-27 35-27s28 8 35 27v16H29V95z" fill="' + palette.hair + '" opacity=".92"/>'
    : '<path d="M35 50c5-18 21-28 39-21 11 4 18 12 20 25-15-5-30-7-59-4z" fill="' + palette.hair + '"/>';
  const face = '<circle cx="64" cy="61" r="26" fill="#ffd7ba"/><circle cx="54" cy="61" r="3" fill="#1f2937"/><circle cx="74" cy="61" r="3" fill="#1f2937"/><path d="M55 75c6 5 13 5 19 0" stroke="#9f1239" stroke-width="4" stroke-linecap="round" fill="none"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${palette.bg1}"/><stop offset="1" stop-color="${palette.bg2}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#bg)"/><circle cx="98" cy="28" r="12" fill="${palette.accent}" opacity=".72"/>${hair}${face}<path d="M26 126c6-25 20-39 38-39s32 14 38 39H26z" fill="${palette.shirt}"/><path d="M53 90h22l-11 14-11-14z" fill="#fff" opacity=".88"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const initialUsers = [
  { id: 'u1', name: 'NAIH MAERCHESSA', email: 'naih@gmail.com', password: '@naih123', gender: 'female', role: 'requestor', branch: 'Culasi', department: 'Savings', position: 'Staff', avatar: getAvatarUrl('NAIH MAERCHESSA', 'female') },
  { id: 'u2', name: 'LEIGH ENRILE', email: 'leigh@gmail.com', password: '@leigh123', gender: 'male', role: 'branch_head', branch: 'Culasi', department: 'Branch Operations', position: 'Manager', avatar: getAvatarUrl('LEIGH ENRILE', 'male') },
  { id: 'u4', name: 'MAXWON MOON', email: 'maxwon@gmail.com', password: '@maxwon132', gender: 'male', role: 'department_head', branch: 'Main Office', department: 'ICT Department', position: 'Head', avatar: getAvatarUrl('MAXWON MOON', 'male') },
  { id: 'u5', name: 'DEIB ENRILE', email: 'deib@gmail.com', password: '@deib123', gender: 'male', role: 'dpo', branch: 'Main Office', department: 'Compliance', position: 'Data Privacy Officer', avatar: getAvatarUrl('DEIB ENRILE', 'male') },
  { id: 'u6', name: 'MAXPEIN MOON', email: 'maxspein@gmail.com', password: '@maxspein123', gender: 'male', role: 'ceo', branch: 'Main Office', department: 'Executive', position: 'CEO', avatar: getAvatarUrl('MAXPEIN MOON', 'male') },
  { id: 'u7', name: 'LEE GOZON', email: 'lee@gmail.com', password: '@lee123', gender: 'male', role: 'archivist', branch: 'Main Office', department: 'Records / Archive', position: 'Archivist', avatar: getAvatarUrl('LEE GOZON', 'male') },
  { id: 'u9', name: 'RANDAL ECHAVEZ', email: 'randal@gmail.com', password: '@randal123', gender: 'male', role: 'superadmin', branch: 'Main Office', department: 'ICT Department', position: 'Super Admin', avatar: getAvatarUrl('RANDAL ECHAVEZ', 'male') },
];

const usersStorageKey = 'bmpc-document-retrieval-users';
const requestsStorageKey = 'bmpc-document-retrieval-requests';
const processingStorageKey = 'bmpc-document-retrieval-processing';
const closuresStorageKey = 'bmpc-document-retrieval-closures';
const incidentsStorageKey = 'bmpc-document-retrieval-incidents';
const auditLogsStorageKey = 'bmpc-document-retrieval-audit-logs';
const settingsStorageKey = 'bmpc-document-retrieval-settings';

function loadStoredValue(key, fallbackValue) {
  if (typeof window === 'undefined') return fallbackValue;
  try {
    const storedValue = JSON.parse(window.localStorage.getItem(key) || 'null');
    return storedValue === null ? fallbackValue : storedValue;
  } catch {
    return fallbackValue;
  }
}

function saveStoredValue(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-session update even if browser storage is full or unavailable.
  }
}

function getDefaultUsers() {
  return initialUsers.map((user) => ({ ...user }));
}

function loadStoredUsers() {
  const fallbackUsers = getDefaultUsers();
  const storedUsers = loadStoredValue(usersStorageKey, []).filter((user) => user.id !== 'u3' && user.name !== 'Lina Reyes' && user.role !== 'sacd_head' && user.id !== 'u8' && user.name !== 'MAXSPAUN ENRILE' && user.email !== 'maxspaun@gmail.com');
  if (!Array.isArray(storedUsers) || storedUsers.length === 0) return fallbackUsers;
  const storedById = new Map(storedUsers.map((user) => [user.id, user]));
  const mergedUsers = fallbackUsers.map((user) => {
    const storedUser = storedById.get(user.id);
    return {
      ...storedUser,
      ...user,
      branch: normalizeBranchName(user.branch || storedUser?.branch),
      department: user.department || storedUser?.department,
      position: user.position || storedUser?.position,
    };
  });
  const newUsers = storedUsers
    .filter((user) => !fallbackUsers.some((fallbackUser) => fallbackUser.id === user.id))
    .map((user) => ({ ...user, branch: normalizeBranchName(user.branch) }));
  return [...mergedUsers, ...newUsers];
}

const seedRequests = [
  {
    id: 'r1',
    requestNo: 'DRR-20260708-0001',
    requestorId: 'u1',
    requestorName: 'Mara Dela Cruz',
    requestDate: '2026-07-08',
    documentTitle: 'Member Loan Ledger 2025',
    documentType: 'Physical',
    confidentialityLevel: 'Non Confidential',
    purpose: 'Account verification for member inquiry.',
    dateNeeded: '2026-07-09',
    borrowReturnDueDate: '2026-07-13',
    remarks: 'Original ledger needed for review.',
    branch: 'Culasi',
    department: 'Savings',
    position: 'Member Services Associate',
    status: 'Forwarded to Archivist',
    currentApprover: 'u2',
    assignedArchivistId: 'u7',
    agreementAccepted: true,
  },
  {
    id: 'r2',
    requestNo: 'DRR-20260708-0002',
    requestorId: 'u4',
    requestorName: 'Ana Villanueva',
    requestDate: '2026-07-08',
    documentTitle: 'Payroll Register Q2',
    documentType: 'Electronic',
    confidentialityLevel: 'Confidential',
    purpose: 'Internal audit reconciliation.',
    dateNeeded: '2026-07-10',
    borrowReturnDueDate: '2026-07-14',
    remarks: 'Read-only copy preferred.',
    branch: 'Main Office',
    department: 'ICT Department',
    position: 'Department Head',
    status: 'Pending Approval',
    currentApprover: 'u5',
    assignedArchivistId: '',
    agreementAccepted: true,
  },
  {
    id: 'r3',
    requestNo: 'DRR-20260709-0001',
    requestorId: 'u4',
    requestorName: 'Ana Villanueva',
    requestDate: '2026-07-09',
    documentTitle: 'Board Resolution Book 2024',
    documentType: 'Physical',
    confidentialityLevel: 'Confidential',
    purpose: 'Validate cooperative policy reference for SACD review.',
    dateNeeded: '2026-07-11',
    borrowReturnDueDate: '2026-07-13',
    remarks: 'Release only inside records room.',
    branch: 'Sibalom',
    department: 'ICT Department',
    position: 'Head Approver',
    status: 'Processing',
    currentApprover: 'u5',
    assignedArchivistId: 'u7',
    agreementAccepted: true,
  },
  {
    id: 'r4',
    requestNo: 'DRR-20260709-0002',
    requestorId: 'u5',
    requestorName: 'Joel Santos',
    requestDate: '2026-07-09',
    documentTitle: 'Member KYC Verification Pack',
    documentType: 'Electronic',
    confidentialityLevel: 'Confidential',
    purpose: 'Privacy compliance validation for an account update.',
    dateNeeded: '2026-07-12',
    borrowReturnDueDate: '2026-07-12',
    remarks: 'Temporary encrypted access requested.',
    branch: 'Main Office',
    department: 'Compliance',
    position: 'Data Privacy Officer',
    status: 'Released',
    currentApprover: 'u5',
    assignedArchivistId: 'u7',
    agreementAccepted: true,
  },
  {
    id: 'r5',
    requestNo: 'DRR-20260710-0001',
    requestorId: 'u1',
    requestorName: 'Mara Dela Cruz',
    requestDate: '2026-07-10',
    documentTitle: 'Savings Dormant Account Register',
    documentType: 'Electronic',
    confidentialityLevel: 'Confidential',
    purpose: 'Prepare branch-level reactivation report.',
    dateNeeded: '2026-07-13',
    borrowReturnDueDate: '2026-07-17',
    remarks: 'Branch-only copy.',
    branch: 'Kalibo',
    department: 'Savings',
    position: 'Member Services Associate',
    status: 'Pending Approval',
    currentApprover: 'u5',
    assignedArchivistId: '',
    agreementAccepted: true,
  },
  {
    id: 'r6',
    requestNo: 'DRR-20260710-0002',
    requestorId: 'u4',
    requestorName: 'Ana Villanueva',
    requestDate: '2026-07-10',
    documentTitle: 'ICT Asset Warranty File',
    documentType: 'Physical',
    confidentialityLevel: 'Non Confidential',
    purpose: 'Warranty validation before replacement procurement.',
    dateNeeded: '2026-07-10',
    borrowReturnDueDate: '2026-07-10',
    remarks: 'Folder includes supplier invoices.',
    branch: 'Main Office',
    department: 'ICT Department',
    position: 'Department Head',
    status: 'Closed',
    currentApprover: 'u4',
    assignedArchivistId: 'u7',
    agreementAccepted: true,
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function generateRequestNo(requests) {
  const date = today().replaceAll('-', '');
  const count = requests.filter((request) => request.requestNo.includes(date)).length + 1;
  return `DRR-${date}-${String(count).padStart(4, '0')}`;
}

function determineApprover(profile, request, users) {
  const requestBranch = request.branch || profile.branch;
  if (request.confidentialityLevel === 'Confidential') return users.find((user) => user.role === 'dpo')?.id || users.find((user) => user.role === 'ceo')?.id || '';
  if (profile.role === 'requestor') return users.find((user) => user.role === 'branch_head' && user.branch === requestBranch)?.id || users.find((user) => user.role === 'branch_head')?.id || '';
  if (profile.role === 'branch_head') return users.find((user) => user.role === 'department_head')?.id || '';
  if (['department_head', 'dpo', 'ceo'].includes(profile.role)) return users.find((user) => adminRoles.includes(user.role))?.id || '';
  return users.find((user) => adminRoles.includes(user.role))?.id || '';
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

function loadStoredRequests() {
  const storedRequests = loadStoredValue(requestsStorageKey, seedRequests);
  if (!Array.isArray(storedRequests)) return seedRequests;
  return storedRequests.map((request) => ({
    ...request,
    branch: normalizeBranchName(request.branch),
    confidentialityLevel: request.confidentialityLevel === 'Confidential' || request.confidentialityLevel === 'Highly Sensitive' ? 'Confidential' : 'Non Confidential',
  }));
}

function statusClass(status) {
  const key = status.toLowerCase().replaceAll(' ', '-');
  return `badge status-${key}`;
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
    { test: /^\/requests\/new$/, roles: ['requestor', 'branch_head', 'department_head', 'admin', 'superadmin'] },
    { test: /^\/requests\/my$/, roles: ['requestor', 'branch_head', 'department_head'] },
    { test: /^\/requests\/all$/, roles: ['admin', 'superadmin', 'ceo', 'dpo'] },
    { test: /^\/requests\/[^/]+(\/closure)?$/, roles: Object.keys(roles) },
    { test: /^\/approvals$/, roles: ['branch_head', 'department_head', 'dpo', 'ceo', 'admin', 'superadmin'] },
    { test: /^\/archivist(\/[^/]+\/process)?$/, roles: ['archivist', 'admin', 'superadmin'] },
    { test: /^\/incidents(\/new)?$/, roles: ['archivist', 'admin', 'superadmin', 'dpo', 'ceo'] },
    { test: /^\/reports$/, roles: ['branch_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin', 'superadmin'] },
    { test: /^\/users$/, roles: ['admin', 'superadmin'] },
    { test: /^\/settings$/, roles: ['admin', 'superadmin'] },
    { test: /^\/audit-logs$/, roles: ['admin', 'superadmin'] },
  ];
  return rules.some((rule) => rule.test.test(path) && rule.roles.includes(role));
}

function canViewReleaseReferences(user, request) {
  return request.requestorId === user.id || request.assignedArchivistId === user.id || adminRoles.includes(user.role) || ['dpo', 'ceo'].includes(user.role);
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

function App() {
  const [users, setUsers] = useState(loadStoredUsers);
  const [currentUserId, setCurrentUserId] = useState('u9');
  const [path, setPathState] = useState('/dashboard');
  const [theme, setTheme] = useState('dark');
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathHistoryRef = useRef([]);
  const [requests, setRequests] = useState(loadStoredRequests);
  const [processing, setProcessing] = useState(() => loadStoredValue(processingStorageKey, {
    r3: {
      dateReceived: '2026-07-10',
      dateReleased: '',
      borrowerName: 'Ana Villanueva',
      expectedReturnDate: '2026-07-13',
      physicalConditionBeforeRelease: 'Good Condition',
      storageLocation: 'Records Room A / Cabinet 2',
      releaseRemarks: 'Pulled from board files; awaiting controlled release.',
      archivistId: 'u7',
    },
    r4: {
      electronicReleaseMethod: 'Link',
      electronicReleaseReference: 'https://cnorkbyngylonroqmkef.supabase.co/storage/v1/object/public/releases/EXP-20260712',
      accessExpiryDate: '2026-07-12',
      deletionConfirmationRequired: true,
      accessRevoked: false,
      releaseRemarks: 'Read-only access granted to DPO.',
      archivistId: 'u7',
    },
    r6: {
      dateReceived: '2026-07-10',
      dateReleased: '2026-07-10',
      borrowerName: 'Ana Villanueva',
      expectedReturnDate: '2026-07-10',
      physicalConditionBeforeRelease: 'Good Condition',
      storageLocation: 'Archive Bay 1 / ICT Box 04',
      releaseRemarks: 'Released and returned same day.',
      archivistId: 'u7',
    },
  }));
  const [closures, setClosures] = useState(() => loadStoredValue(closuresStorageKey, {
    r6: {
      dateReturned: '2026-07-10',
      conditionUponReturn: 'Complete',
      isComplete: true,
      hasDamage: false,
      hasMarkings: false,
      missingPages: false,
      refiledLocation: 'Archive Bay 1 / ICT Box 04',
      closedBy: 'u7',
      closedAt: '2026-07-10 16:45',
      closureRemarks: 'Verified complete and refiled.',
    },
  }));
  const [incidents, setIncidents] = useState(() => loadStoredValue(incidentsStorageKey, [
    {
      id: 'i1',
      requestId: 'r1',
      reportedBy: 'u7',
      incidentType: 'Overdue',
      incidentDescription: 'Physical ledger was not returned by the expected date during follow-up.',
      actionTaken: 'Requestor notified; branch head copied for monitoring.',
      status: 'Open',
      createdAt: '2026-07-10 10:15',
    },
  ]));
  const [auditLogs, setAuditLogs] = useState(() => loadStoredValue(auditLogsStorageKey, [
    { id: 'a1', requestId: 'r1', userId: 'u2', action: 'Approved and forwarded', oldStatus: 'Pending Approval', newStatus: 'Forwarded to Archivist', remarks: 'Business purpose validated.', createdAt: '2026-07-08 09:20' },
    { id: 'a2', requestId: 'r3', userId: 'u5', action: 'Approved for controlled processing', oldStatus: 'Pending Approval', newStatus: 'Processing', remarks: 'Confidential material may be reviewed in records room only.', createdAt: '2026-07-10 08:40' },
    { id: 'a3', requestId: 'r4', userId: 'u7', action: 'Released electronic access', oldStatus: 'Forwarded to Archivist', newStatus: 'Released', remarks: 'Read-only encrypted link issued.', createdAt: '2026-07-10 11:05' },
    { id: 'a4', requestId: 'r6', userId: 'u7', action: 'Closure evaluated', oldStatus: 'Returned', newStatus: 'Closed', remarks: 'Folder complete and refiled.', createdAt: '2026-07-10 16:45' },
  ]));
  const currentUser = users.find((user) => user.id === currentUserId) || users[0];
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
    saveStoredValue(usersStorageKey, users);
  }, [users]);

  useEffect(() => {
    saveStoredValue(requestsStorageKey, requests);
  }, [requests]);

  useEffect(() => {
    saveStoredValue(processingStorageKey, processing);
  }, [processing]);

  useEffect(() => {
    saveStoredValue(closuresStorageKey, closures);
  }, [closures]);

  useEffect(() => {
    saveStoredValue(incidentsStorageKey, incidents);
  }, [incidents]);

  useEffect(() => {
    saveStoredValue(auditLogsStorageKey, auditLogs);
  }, [auditLogs]);

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

  const addAuditLog = (requestId, action, oldStatus, newStatus, remarks = '') => {
    setAuditLogs((logs) => [
      { id: crypto.randomUUID(), requestId, userId: currentUser.id, action, oldStatus, newStatus, remarks, createdAt: new Date().toLocaleString() },
      ...logs,
    ]);
  };

  const updateRequestStatus = (requestId, newStatus, action, remarks = '', patch = {}) => {
    setRequests((items) => items.map((item) => {
      if (item.id !== requestId) return item;
      addAuditLog(requestId, action, item.status, newStatus, remarks);
      return { ...item, ...patch, status: newStatus };
    }));
  };

  const submitRequest = (form, requestId = null) => {
    const validationErrors = validateRequestForm(form);
    if (validationErrors.length) return validationErrors;

    if (requestId) {
      const approver = determineApprover(currentUser, { ...form, branch: currentUser.branch }, users);
      setRequests((items) => items.map((item) => (item.id === requestId ? { ...item, ...form, requestorId: currentUser.id, requestorName: currentUser.name, branch: currentUser.branch, department: form.department || currentUser.department, position: currentUser.position, status: 'Pending Approval', currentApprover: approver, assignedArchivistId: '' } : item)));
      setAuditLogs((logs) => [{ id: crypto.randomUUID(), requestId, userId: currentUser.id, action: 'Updated request', oldStatus: 'Updated', newStatus: 'Pending Approval', remarks: form.purpose, createdAt: new Date().toLocaleString() }, ...logs]);
      setEditingRequestId(null);
      setPath(`/requests/${requestId}`);
      return [];
    }

    const approver = determineApprover(currentUser, form, users);
    const next = {
      ...form,
      id: crypto.randomUUID(),
      requestNo: generateRequestNo(requests),
      requestorId: currentUser.id,
      requestorName: currentUser.name,
      requestDate: today(),
      branch: currentUser.branch,
      department: form.department || currentUser.department,
      position: currentUser.position,
      currentApprover: approver,
      assignedArchivistId: '',
      status: 'Pending Approval',
    };
    setRequests((items) => [next, ...items]);
    setAuditLogs((logs) => [{ id: crypto.randomUUID(), requestId: next.id, userId: currentUser.id, action: 'Submitted request', oldStatus: 'Draft', newStatus: 'Pending Approval', remarks: next.purpose, createdAt: new Date().toLocaleString() }, ...logs]);
    setPath(`/requests/${next.id}`);
    return [];
  };

  const saveDraftRequest = (form, requestId = null) => {
    const draftPayload = {
      ...form,
      requestorId: currentUser.id,
      requestorName: currentUser.name,
      branch: currentUser.branch,
      department: form.department || currentUser.department,
      position: currentUser.position,
      currentApprover: determineApprover(currentUser, { ...form, branch: currentUser.branch }, users),
      assignedArchivistId: '',
      status: 'Draft',
    };

    if (requestId) {
      setRequests((items) => items.map((item) => (item.id === requestId ? { ...item, ...draftPayload } : item)));
      setAuditLogs((logs) => [{ id: crypto.randomUUID(), requestId, userId: currentUser.id, action: 'Saved draft', oldStatus: 'Draft', newStatus: 'Draft', remarks: form.purpose || 'Draft saved', createdAt: new Date().toLocaleString() }, ...logs]);
      setEditingRequestId(null);
      setPath('/requests/my');
      return [];
    }

    const next = {
      ...draftPayload,
      id: crypto.randomUUID(),
      requestNo: generateRequestNo(requests),
      requestDate: today(),
    };
    setRequests((items) => [next, ...items]);
    setAuditLogs((logs) => [{ id: crypto.randomUUID(), requestId: next.id, userId: currentUser.id, action: 'Saved draft', oldStatus: 'Draft', newStatus: 'Draft', remarks: next.purpose || 'Draft saved', createdAt: new Date().toLocaleString() }, ...logs]);
    setPath('/requests/my');
    return [];
  };

  const withdrawRequest = (requestId) => {
    const target = requests.find((item) => item.id === requestId);
    if (!target || !['Draft', 'Pending Approval'].includes(target.status)) return;
    updateRequestStatus(requestId, 'Draft', 'Returned to draft by requestor', target.documentTitle || 'Request kept for audit trail');
    setEditingRequestId(null);
    setPath('/requests/my');
  };

  const deleteOwnRequest = (requestId) => {
    const target = requests.find((item) => item.id === requestId);
    if (!target || target.requestorId !== currentUser.id) return;
    setRequests((items) => items.filter((item) => item.id !== requestId));
    setProcessing((records) => Object.fromEntries(Object.entries(records).filter(([id]) => id !== requestId)));
    setClosures((records) => Object.fromEntries(Object.entries(records).filter(([id]) => id !== requestId)));
    setIncidents((items) => items.filter((item) => item.requestId !== requestId));
    setAuditLogs((logs) => [{ id: crypto.randomUUID(), requestId, userId: currentUser.id, action: 'Deleted own request', oldStatus: target.status, newStatus: 'Deleted', remarks: target.documentTitle, createdAt: new Date().toLocaleString() }, ...logs.filter((log) => log.requestId !== requestId)]);
    if (editingRequestId === requestId) setEditingRequestId(null);
    setPath('/requests/my');
  };

  const updateCurrentUserProfile = (patch) => {
    const email = patch.email.trim().toLowerCase();
    if (!email) return ['Email is required.'];
    if (patch.password && patch.password.length < 6) return ['Password must be at least 6 characters.'];
    if (users.some((user) => user.id !== currentUser.id && user.email.toLowerCase() === email)) return ['Email is already used by another account.'];
    setUsers((items) => items.map((user) => {
      if (user.id !== currentUser.id) return user;
      const generatedAvatar = getAvatarUrl(patch.name || user.name, patch.gender || user.gender);
      const avatar = patch.avatarCustom ? patch.avatar : generatedAvatar;
      return { ...user, ...patch, email, avatar, avatarCustom: Boolean(patch.avatarCustom) };
    }));
    return [];
  };

  const visibleRequests = useMemo(() => requests.map((request) => {
    const record = processing[request.id];
    return isOverdue(request, record) ? { ...request, computedStatus: 'Overdue' } : request;
  }), [requests, processing]);

  const route = path.split('/').filter(Boolean);
  const selectedRequest = requests.find((request) => request.id === route[1] || request.id === route[0]);
  const allowedPath = isPathAllowed(path, currentUser.role);

  if (path === '/login') {
    return <Login users={users} currentUserId={currentUserId} onLogin={(id) => { setCurrentUserId(id); setPath('/dashboard', { replace: true }); }} />;
  }

  const pageProps = { currentUser, users, requests: visibleRequests, rawRequests: requests, processing, closures, incidents, auditLogs, setPath, submitRequest, updateRequestStatus, addAuditLog, setProcessing, setClosures, setIncidents, editingRequestId, setEditingRequestId };

  return (
    <div className={`app-shell ${theme} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <Sidebar user={currentUser} users={users} setCurrentUserId={setCurrentUserId} path={path} setPath={setPath} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="workspace">
        <Header user={currentUser} users={users} setCurrentUserId={setCurrentUserId} onLogout={() => setPath('/login')} onUpdateProfile={updateCurrentUserProfile} theme={theme} setTheme={setTheme} isMobileMenuOpen={isMobileMenuOpen} onMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)} />
        {!allowedPath && <RoleDenied setPath={setPath} />}
        {allowedPath && path === '/dashboard' && <Dashboard {...pageProps} />}
        {allowedPath && path === '/requests/new' && <NewRequest {...pageProps} editingRequestId={editingRequestId} setEditingRequestId={setEditingRequestId} saveDraftRequest={saveDraftRequest} />}
        {allowedPath && path === '/requests/my' && <RequestList title="My Requests" requests={visibleRequests.filter((request) => request.requestorId === currentUser.id)} setPath={setPath} currentUser={currentUser} allowManage={currentUser.role === 'requestor'} onEditRequest={(request) => { setEditingRequestId(request.id); setPath('/requests/new'); }} onWithdrawRequest={withdrawRequest} onDeleteRequest={deleteOwnRequest} />}
        {allowedPath && path === '/requests/all' && <RequestList title="All Requests" requests={visibleRequests} setPath={setPath} />}
        {allowedPath && route[0] === 'requests' && route[1] && route[2] !== 'closure' && <RequestDetails request={selectedRequest} {...pageProps} />}
        {allowedPath && route[0] === 'requests' && route[2] === 'closure' && <ClosurePage request={selectedRequest} {...pageProps} />}
        {allowedPath && path === '/approvals' && <ApprovalQueue {...pageProps} />}
        {allowedPath && path === '/archivist' && <ArchivistQueue {...pageProps} />}
        {allowedPath && route[0] === 'archivist' && route[2] === 'process' && <ArchivistProcess request={requests.find((request) => request.id === route[1])} {...pageProps} />}
        {allowedPath && path === '/incidents' && <Incidents {...pageProps} />}
        {allowedPath && path === '/incidents/new' && <NewIncident {...pageProps} />}
        {allowedPath && path === '/reports' && <Reports {...pageProps} />}
        {allowedPath && path === '/users' && <Users users={users} setUsers={setUsers} currentUserId={currentUser.id} />}
        {allowedPath && path === '/settings' && <Settings theme={theme} setTheme={setTheme} />}
        {allowedPath && path === '/audit-logs' && <AuditLogsPage logs={auditLogs} users={users} requests={requests} setPath={setPath} />}
      </main>
    </div>
  );
}

function SidebarIcon({ name }) {
  const commonProps = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' };
  switch (name) {
    case 'dashboard':
      return <svg {...commonProps}><rect className="icon-shape-a" x="4" y="4" width="7" height="7" rx="1.5" /><rect className="icon-shape-b" x="13" y="4" width="7" height="7" rx="1.5" /><rect className="icon-shape-c" x="4" y="13" width="7" height="7" rx="1.5" /><rect className="icon-shape-a" x="13" y="13" width="7" height="7" rx="1.5" opacity=".8" /></svg>;
    case 'request':
      return <svg {...commonProps}><path className="icon-shape-a" d="M6 3h8l5 5v13H6z" /><path className="icon-shape-b" d="M14 3v5h5" /><path className="icon-cutout" d="M9 12h6v1.6H9zm0 3.8h5v1.6H9z" /></svg>;
    case 'approval':
      return <svg {...commonProps}><circle className="icon-shape-a" cx="12" cy="12" r="9" /><path className="icon-shape-b" d="M12 3a9 9 0 0 1 9 9h-9z" opacity=".8" /><path className="icon-cutout" d="m8 12.3 2.3 2.3 5.7-6.1 1.8 1.7-7.5 7.7-4.1-4z" /></svg>;
    case 'archive':
      return <svg {...commonProps}><path className="icon-shape-a" d="M4 8h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" /><path className="icon-shape-b" d="M3 4h18v5H3z" /><path className="icon-cutout" d="M8.5 12h7v1.8h-7z" /></svg>;
    case 'alert':
      return <svg {...commonProps}><path className="icon-shape-a" d="m12 3 10 18H2z" /><path className="icon-shape-b" d="m12 3 10 18H12z" opacity=".72" /><path className="icon-cutout" d="M11 8.5h2v6h-2zm0 7.5h2v2h-2z" /></svg>;
    case 'reports':
      return <svg {...commonProps}><path className="icon-shape-a" d="M5 20V9h4v11z" /><path className="icon-shape-b" d="M10 20V4h4v16z" /><path className="icon-shape-c" d="M15 20v-8h4v8z" /></svg>;
    case 'users':
      return <svg {...commonProps}><circle className="icon-shape-a" cx="9" cy="8" r="4" /><circle className="icon-shape-b" cx="16" cy="9" r="3" /><path className="icon-shape-c" d="M3 20c.8-4.2 3.1-6.4 6-6.4s5.2 2.2 6 6.4z" /><path className="icon-shape-b" d="M13 20c.5-2.8 2-4.4 4-4.4s3.5 1.6 4 4.4z" opacity=".78" /></svg>;
    case 'settings':
      return <svg {...commonProps}><path className="icon-shape-a" d="M12 2 15 6l5-.4-1.4 4.8L22 14l-4.7 1.7L16 21l-4-3-4 3-1.3-5.3L2 14l3.4-3.6L4 5.6 9 6z" /><circle className="icon-cutout" cx="12" cy="12" r="3.4" /></svg>;
    case 'audit':
      return <svg {...commonProps}><path className="icon-shape-a" d="M6 3h10l4 4v14H6z" /><path className="icon-shape-b" d="M16 3v5h4" /><path className="icon-cutout" d="M9 11h7v1.6H9zm0 3.5h5v1.6H9z" /><path className="icon-shape-c" d="m15 17 1.1 1.1 2.5-3" /></svg>;
    default:
      return <svg {...commonProps}><circle className="icon-shape-a" cx="12" cy="12" r="9" /><circle className="icon-cutout" cx="12" cy="12" r="4" /></svg>;
  }
}

function ThemeIcon({ theme }) {
  const commonProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (theme === 'dark') {
    return <svg {...commonProps} aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" /><path d="M17 4h.01" /></svg>;
  }
  return <svg {...commonProps} aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2" /><path d="M12 19.5v2" /><path d="M4.5 12h-2" /><path d="M21.5 12h-2" /><path d="m5.6 5.6-1.4-1.4" /><path d="m19.8 19.8-1.4-1.4" /><path d="m18.4 5.6 1.4-1.4" /><path d="m4.2 19.8 1.4-1.4" /></svg>;
}

function Sidebar({ user, users, setCurrentUserId, path, setPath, isOpen, onClose }) {
  const items = [
    ['Dashboard', '/dashboard', ['requestor', 'branch_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin'], 'dashboard'],
    ['Approval Queue', '/approvals', ['branch_head', 'department_head', 'dpo', 'ceo', 'admin'], 'approval'],
    ['Archivist Queue', '/archivist', ['archivist', 'admin'], 'archive'],
    ['All Requests', '/requests/all', ['admin', 'superadmin', 'ceo', 'dpo'], 'request'],
    ['Incidents', '/incidents', ['archivist', 'admin', 'dpo', 'ceo'], 'alert'],
    ['Reports', '/reports', ['branch_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin'], 'reports'],
    ['Users', '/users', ['admin', 'superadmin'], 'users'],
    ['Settings', '/settings', ['admin', 'superadmin'], 'settings'],
    ['Audit Logs', '/audit-logs', ['admin', 'superadmin'], 'audit'],
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
      <nav>{items.filter(([, , allowed]) => allowed.includes(user.role)).map(([label, href, , icon]) => <button className={path === href ? 'active' : ''} key={href} onClick={() => { setPath(href); onClose(); }}><span className="nav-icon" aria-hidden="true"><SidebarIcon name={icon} /></span><span>{label}</span></button>)}</nav>
      <section className="sidebar-user-switcher" aria-label="Open user account">
        <h3>User Accounts</h3>
        {users.map((item) => (
          <button className={item.id === user.id ? 'active-user' : ''} type="button" key={item.id} onClick={() => { setCurrentUserId(item.id); setPath('/dashboard', { replace: true }); onClose(); }}>
            <img className="avatar-image mini" src={item.avatar || getAvatarUrl(item.name, item.gender)} alt={item.name} />
            <span>
              <strong>{item.name}</strong>
              <small>{roles[item.role]}</small>
            </span>
          </button>
        ))}
      </section>
      </aside>
    </>
  );
}

function Header({ user, users, setCurrentUserId, onLogout, onUpdateProfile, theme, setTheme, isMobileMenuOpen, onMenuToggle }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: user.name, email: user.email, password: user.password || '', gender: user.gender, avatar: user.avatarCustom ? user.avatar : '', avatarCustom: Boolean(user.avatarCustom) });
  const [profileErrors, setProfileErrors] = useState([]);

  useEffect(() => {
    setProfileDraft({ name: user.name, email: user.email, password: user.password || '', gender: user.gender, avatar: user.avatarCustom ? user.avatar : '', avatarCustom: Boolean(user.avatarCustom) });
    setProfileErrors([]);
  }, [user]);

  const currentAvatar = profileDraft.avatar || getAvatarUrl(profileDraft.name, profileDraft.gender);
  const notifications = [
    {
      id: 'n1',
      title: 'Document retrieval update',
      message: `${roles[user.role]} dashboard has request activity ready to review.`,
    },
  ];

  const uploadProfileImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileErrors(['Please choose an image file for the profile picture.']);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfileDraft((draft) => ({ ...draft, avatar: reader.result, avatarCustom: true }));
      onUpdateProfile({ ...profileDraft, avatar: reader.result, avatarCustom: true });
      setProfileErrors([]);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const errors = onUpdateProfile(profileDraft);
    setProfileErrors(errors);
    if (!errors.length) setIsProfileOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <button type="button" className={`hamburger-button ${isMobileMenuOpen ? 'active' : ''}`} aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isMobileMenuOpen} onClick={onMenuToggle}>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        <div><h1>Welcome back, {user.name}!</h1><p>Here is what is happening with your document requests today.</p></div>
      </div>
      <div className="profile-tools">
        <button className="user-chip" type="button" onClick={() => setIsProfileOpen(true)} aria-label="Edit profile">
          <img className="avatar-image compact" src={user.avatar || getAvatarUrl(user.name, user.gender)} alt={user.name} />
          <div>
            <strong>{user.name}</strong>
            <span>{roles[user.role]} / {user.department}</span>
          </div>
        </button>
        <select className="role-switch" aria-label="Switch user account" value={user.id} onChange={(event) => setCurrentUserId(event.target.value)}>{users.map((item) => <option value={item.id} key={item.id}>{item.name} - {roles[item.role]}</option>)}</select>
        <div className="notification-wrap">
          <button type="button" className="topbar-icon-button" aria-label="Notifications" aria-expanded={isNotificationsOpen} onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}>
            <span className="notification-dot">{notifications.length}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
          </button>
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
        <button type="button" className="topbar-icon-button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <span className="theme-toggle-dot"><ThemeIcon theme={theme} /></span>
        </button>
        <button className="ghost" onClick={onLogout}>Logout</button>
      </div>
      {isProfileOpen && (
        <div className="profile-editor" role="dialog" aria-modal="true" aria-label="Edit profile">
          <div className="profile-editor-panel">
            <h2>Edit Profile</h2>
            {profileErrors.length > 0 && <AlertList items={profileErrors} />}
            <div className="profile-avatar-preview">
              <img className="avatar-image" src={currentAvatar} alt={profileDraft.name || user.name} />
              <div>
                <span>Profile picture</span>
                <label className="upload-avatar-button">
                  Choose Image
                  <input type="file" accept="image/*" onChange={uploadProfileImage} />
                </label>
              </div>
            </div>
            <Field label="Name" value={profileDraft.name} onChange={(value) => setProfileDraft((draft) => ({ ...draft, name: value }))} />
            <div className="actions">
              <button type="button" onClick={saveProfile}>Save Profile</button>
              <button className="ghost" type="button" onClick={() => setIsProfileOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Login({ users, currentUserId, onLogin }) {
  const [errors, setErrors] = useState([]);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const selectedUser = users.find((user) => user.id === currentUserId) || users[0];
  const [loginForm, setLoginForm] = useState({ email: selectedUser?.email || '', password: selectedUser?.password || '' });
  useEffect(() => {
    setLoginForm({ email: selectedUser?.email || '', password: selectedUser?.password || '' });
  }, [selectedUser]);
  const updateLogin = (key, value) => setLoginForm((draft) => ({ ...draft, [key]: value }));
  const submitLogin = () => {
    const email = loginForm.email.trim().toLowerCase();
    const matchedUser = users.find((user) => user.email.toLowerCase() === email && user.password === loginForm.password);
    if (!matchedUser) {
      setErrors(['Email or password is incorrect.']);
      return;
    }
    setErrors([]);
    onLogin(matchedUser.id);
  };
  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Digital archive storage visual">
        <img src="/login-archive-visual.png" alt="Cloud archive and file storage" />
      </section>
      <section className="login-panel">
        <img src="/bmpc-logo.png" alt="Barbaza Multi-Purpose Cooperative logo" />
        <h1>BMPC Document Retrieval</h1>
        <p>Controlled archive request, approval, release, return, and audit monitoring for Barbaza Multi-Purpose Cooperative.</p>
        {errors.length > 0 && <AlertList items={errors} />}
        <label>Email</label>
        <input value={loginForm.email} onChange={(event) => updateLogin('email', event.target.value)} />
        <label>Password</label>
        <PasswordInput value={loginForm.password} onChange={(value) => updateLogin('password', value)} isVisible={showLoginPassword} onToggle={() => setShowLoginPassword((isVisible) => !isVisible)} />
        <button onClick={submitLogin}>Login</button>
      </section>
    </main>
  );
}

function PasswordInput({ value, onChange, isVisible, onToggle }) {
  return (
    <div className="password-input-wrap">
      <input value={value} type={isVisible ? 'text' : 'password'} onChange={(event) => onChange(event.target.value)} />
      <button className="password-toggle" type="button" aria-label={isVisible ? 'Hide password' : 'Show password'} onClick={onToggle}>
        {isVisible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.5 5.3A8.9 8.9 0 0 1 12 5c5 0 8.5 4.5 9.5 7a11.8 11.8 0 0 1-2.3 3.4" /><path d="M6.6 6.6A12.2 12.2 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a8.8 8.8 0 0 0 4.3-1.1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12c1-2.5 4.5-7 9.5-7s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7s-8.5-4.5-9.5-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}

function DashboardIcon({ name }) {
  const commonProps = { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' };
  if (name === 'pending') return <svg {...commonProps}><circle className="icon-shape-a" cx="12" cy="12" r="9" /><path className="icon-cutout" d="M11 6h2v6.3l4.1 2.4-1 1.8-5.1-3z" /></svg>;
  if (name === 'approved') return <svg {...commonProps}><circle className="icon-shape-a" cx="12" cy="12" r="9" /><path className="icon-cutout" d="m8 12.3 2.6 2.6L16.8 8l1.8 1.7-7.9 8.1-4.5-4.3z" /></svg>;
  if (name === 'released') return <svg {...commonProps}><path className="icon-shape-a" d="M4 8h16v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" /><path className="icon-shape-b" d="M5 4h7l2 4H3z" /><path className="icon-cutout" d="M9 13h6v2H9z" /></svg>;
  if (name === 'alert') return <svg {...commonProps}><path className="icon-shape-a" d="m12 3 10 18H2z" /><path className="icon-cutout" d="M11 9h2v5h-2zm0 7h2v2h-2z" /></svg>;
  if (name === 'branch') return <svg {...commonProps}><path className="icon-shape-a" d="M10 3h4v18h-4z" /><circle className="icon-shape-b" cx="18" cy="9" r="4" /><circle className="icon-shape-c" cx="6" cy="16" r="4" /></svg>;
  return <svg {...commonProps}><path className="icon-shape-a" d="M6 3h8l5 5v13H6z" /><path className="icon-shape-b" d="M14 3v5h5" /><path className="icon-cutout" d="M9 12h6v2H9zm0 4h5v2H9z" /></svg>;
}

function Dashboard({ currentUser, requests, processing, incidents, setPath }) {
  const [selectedTrendDate, setSelectedTrendDate] = useState('');
  const my = adminRoles.includes(currentUser.role) ? requests : requests.filter((request) => request.requestorId === currentUser.id || request.currentApprover === currentUser.id || request.assignedArchivistId === currentUser.id || ['ceo', 'dpo'].includes(currentUser.role));
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
  return (
    <section className="page dashboard-page">
      <div className="dashboard-stat-grid">
        <button type="button" className="dashboard-stat-card total" onClick={() => setPath('/requests/all')}>
          <span className="dashboard-stat-icon"><DashboardIcon name="file" /></span>
          <span>Total Requests</span>
          <strong>{my.length}</strong>
          <small>All time requests</small>
        </button>
        <button type="button" className="dashboard-stat-card pending" onClick={() => setPath('/approvals')}>
          <span className="dashboard-stat-icon"><DashboardIcon name="pending" /></span>
          <span>Pending Approval</span>
          <strong>{pendingRequests.length}</strong>
          <small>For your approval</small>
        </button>
        <button type="button" className="dashboard-stat-card approved" onClick={() => setPath('/approvals')}>
          <span className="dashboard-stat-icon"><DashboardIcon name="approved" /></span>
          <span>Approved Requests</span>
          <strong>{approvedRequests.length}</strong>
          <small>Successfully approved</small>
        </button>
        <button type="button" className="dashboard-stat-card released" onClick={() => setPath('/archivist')}>
          <span className="dashboard-stat-icon"><DashboardIcon name="released" /></span>
          <span>Released Documents</span>
          <strong>{releasedRequests.length}</strong>
          <small>Released to requesters</small>
        </button>
      </div>

      <div className="dashboard-analysis-grid">
        <div className="dashboard-column">
          <article className="dashboard-panel">
            <div className="card-header">
              <h3>Total Requests Overview</h3>
            </div>
            <div className="overview-body">
              <div className="overview-donut" style={{ background: `radial-gradient(circle, #fff 0 47%, transparent 48%), conic-gradient(${donutStops || '#e2e8f0 0% 100%'})` }}>
                <strong>{my.length}</strong>
                <span>Total</span>
              </div>
              <div className="overview-legend">
                {overview.map((item) => (
                  <button type="button" className="overview-row" key={item.label}>
                    <span><i style={{ background: item.color }} />{item.label}</span>
                    <strong>{item.count} ({my.length ? Math.round((item.count / my.length) * 100) : 0}%)</strong>
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="dashboard-panel dashboard-trend-card">
            <div className="card-header">
              <h3>Request Trends (Last 30 days)</h3>
              <span className="helper-text">Click a point</span>
            </div>
            <ReactLineChart data={trendData} selectedDate={selectedTrendDate} onSelectDate={setSelectedTrendDate} />
            {selectedTrend && (
              <div className="trend-result">
                <div>
                  <strong>{selectedTrend.count}</strong>
                  <span>{selectedTrend.label}</span>
                </div>
                {selectedTrend.requests.length ? (
                  <button type="button" onClick={() => setPath('/requests/all')}>
                    {selectedTrend.requests.slice(0, 2).map((request) => request.requestNo).join(', ')}
                    {selectedTrend.requests.length > 2 ? ` +${selectedTrend.requests.length - 2} more` : ''}
                  </button>
                ) : (
                  <span>No requests on this date</span>
                )}
              </div>
            )}
          </article>

        </div>
      </div>
    </section>
  );
}

function ReactLineChart({ data, selectedDate, onSelectDate }) {
  const rawMax = Math.max(1, ...data.map((item) => item.count));
  const maxCount = Math.max(2, rawMax);
  const tickValues = maxCount <= 4
    ? Array.from({ length: maxCount + 1 }, (_, index) => index)
    : [0, Math.ceil(maxCount / 2), maxCount];
  const plotLeft = 34;
  const plotRight = 306;
  const plotBottom = 140;
  const plotTop = 18;
  const plotHeight = plotBottom - plotTop;
  const slotWidth = (plotRight - plotLeft) / Math.max(1, data.length);
  const xTicks = [
    { point: data[0], index: 0 },
    { point: data[Math.floor((data.length - 1) / 2)], index: Math.floor((data.length - 1) / 2) },
    { point: data[data.length - 1], index: data.length - 1 },
  ];
  return (
    <svg className="react-line-chart" viewBox="0 0 320 180" role="img" aria-label="Request trend chart for the last 30 days">
      <defs>
        <linearGradient id="trendBarFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7f9dff" />
          <stop offset="52%" stopColor="#355df0" />
          <stop offset="100%" stopColor="#163fbf" />
        </linearGradient>
        <linearGradient id="trendBarHighlight" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="180" rx="10" className="trend-chart-bg" />
      {tickValues.map((tick) => {
        const y = plotBottom - (tick / maxCount) * plotHeight;
        return (
          <g key={tick}>
            <line className="trend-grid-line" x1={plotLeft} y1={y} x2={plotRight} y2={y} />
            <text className="trend-y-label" x="26" y={y + 4}>{tick}</text>
          </g>
        );
      })}
      {data.map((item, index) => {
        const rawHeight = (item.count / maxCount) * plotHeight;
        const barHeight = Math.max(item.count > 0 ? 8 : 2, rawHeight);
        const x = plotLeft + index * slotWidth + 0.15;
        const y = plotBottom - barHeight;
        const isSelected = selectedDate === item.date;
        return (
          <g key={item.date} tabIndex="0" role="button" aria-label={`${item.label}: ${item.count} requests`} onClick={() => onSelectDate(item.date)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectDate(item.date); } }}>
            <rect className={`trend-bar ${isSelected ? 'selected' : ''}`} x={x} y={y} width={Math.max(8, slotWidth - 0.4)} height={barHeight} rx="2.5" fill="url(#trendBarFill)" stroke="#132f8f" strokeWidth="1.2" />
            <rect className="trend-bar-highlight" x={x} y={y} width={Math.max(8, slotWidth - 0.4)} height={Math.max(8, barHeight * 0.44)} rx="2.5" fill="url(#trendBarHighlight)" />
          </g>
        );
      })}
      {xTicks.map((item) => item.point && <text className="trend-x-label" key={item.point.date} x={plotLeft + item.index * slotWidth + slotWidth / 2} y="164">{item.point.label}</text>)}
    </svg>
  );
}

function PageTitle({ title, subtitle, onBack }) {
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

  return <div className="page-title"><button type="button" className="back-btn" onClick={handleBack} aria-label="Go back">&lt;</button><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>;
}

function NewRequest({ currentUser, requests, submitRequest, saveDraftRequest, editingRequestId, setEditingRequestId }) {
  const initialForm = useMemo(() => ({ documentTitle: '', documentType: 'Physical', confidentialityLevel: 'Non Confidential', purpose: '', dateNeeded: today(), borrowReturnDueDate: today(), remarks: '', branch: currentUser.branch, department: currentUser.department, agreementAccepted: false }), [currentUser.branch, currentUser.department]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const canSubmit = form.documentTitle && form.documentType && form.purpose && form.dateNeeded && form.borrowReturnDueDate && form.confidentialityLevel && form.agreementAccepted;
  const hasReturnDateWarning = form.borrowReturnDueDate && (form.borrowReturnDueDate < today() || form.borrowReturnDueDate < form.dateNeeded);

  React.useEffect(() => {
    if (!editingRequestId) {
      setForm(initialForm);
      setEditingRequest(null);
      return;
    }
    const editingRequest = requests.find((request) => request.id === editingRequestId);
    setEditingRequest(editingRequest || null);
    if (editingRequest) {
      setForm({
        documentTitle: editingRequest.documentTitle || '',
        documentType: editingRequest.documentType || 'Physical',
        confidentialityLevel: confidentialityLevels.includes(editingRequest.confidentialityLevel) ? editingRequest.confidentialityLevel : 'Non Confidential',
        purpose: editingRequest.purpose || '',
        dateNeeded: editingRequest.dateNeeded || today(),
        borrowReturnDueDate: editingRequest.borrowReturnDueDate || editingRequest.dateNeeded || today(),
        remarks: editingRequest.remarks || '',
        branch: currentUser.branch,
        department: editingRequest.department || currentUser.department,
        agreementAccepted: Boolean(editingRequest.agreementAccepted),
      });
    }
  }, [editingRequestId, initialForm, requests, currentUser.branch, currentUser.department]);

  const save = () => {
    const result = submitRequest(form, editingRequestId);
    setErrors(result || []);
  };

  return (
    <section className="page">
      <PageTitle
        title={editingRequestId ? 'Edit and Resubmit Request' : 'New Document Retrieval Request'}
        subtitle={editingRequestId ? 'Update the draft or approved request, then resend it to the assigned approver.' : 'Create a request, save it as a draft, or submit it for automatic routing to the correct approver.'}
      />
      {errors.length > 0 && <AlertList items={errors} />}
      {hasReturnDateWarning && <div className="alert due-warning">Warning: the return due date is outside the allowed date range.</div>}
      <div className="form-grid">
        <Field label="Request Date" type="date" value={today()} readOnly />
        <Field label="Requestor" value={currentUser.name} readOnly />
        <Field label="Department" value={form.department} onChange={(v) => update('department', v)} readOnly={!adminRoles.includes(currentUser.role)} />
        <Field label="Branch" value={currentUser.branch} readOnly />
        <Field label="Position" value={currentUser.position} readOnly />
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
        <button type="button" className="ghost" onClick={() => { setErrors(saveDraftRequest(form, editingRequestId) || []); }}>{editingRequestId ? 'Save Draft' : 'Save Draft'}</button>
        <button type="button" disabled={!canSubmit} onClick={save}>{editingRequestId ? 'Save and Resend' : 'Submit Request'}</button>
        {editingRequestId && <button className="ghost" type="button" onClick={() => { setEditingRequestId(null); }}>Cancel Edit</button>}
      </div>
      {editingRequest && editingRequest.status === 'Draft' && <div className="alert">This request is currently a draft. You can keep editing it until you submit it again.</div>}
    </section>
  );
}

function AlertList({ items }) {
  return <div className="alert error-list">{items.map((item) => <div key={item}>{item}</div>)}</div>;
}
function Field({ label, value, onChange, type = 'text', options = [], readOnly = false, className = '', min, warning = false, placeholder = '' }) {
  return <label className={`field ${className}`}><span>{label}{warning && <strong className="warning-mark" aria-hidden="true"> !</strong>}</span>{type === 'textarea' ? <textarea value={value} placeholder={placeholder} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} /> : type === 'select' ? <select value={value} disabled={readOnly} onChange={(e) => onChange?.(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} value={value} min={min} placeholder={placeholder} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />}</label>;
}

function RequestList({ title, requests, setPath, allowManage = false, onEditRequest, onWithdrawRequest, onDeleteRequest }) {
  return <section className="page"><PageTitle title={title} subtitle="Track request status, routing, processing, and closure." /><RequestTable requests={requests} setPath={setPath} showActions={allowManage} onEditRequest={onEditRequest} onWithdrawRequest={onWithdrawRequest} onDeleteRequest={onDeleteRequest} /></section>;
}

function RequestTable({ title, requests, setPath, showActions = false, onEditRequest, onWithdrawRequest, onDeleteRequest }) {
  return <div className="table-card">{title && <h3>{title}</h3>}<table><thead><tr><th>Request No.</th><th>Document</th><th>Type</th><th>Confidentiality</th><th>Status</th><th>Date Needed</th><th>Return Due Date</th>{showActions && <th>Actions</th>}</tr></thead><tbody>{requests.length ? requests.map((request) => {
    const canManageRequest = ['Draft', 'Pending Approval', 'Rejected'].includes(request.status);
    const primaryActionLabel = request.status === 'Draft' ? 'Continue Draft' : request.status === 'Rejected' ? 'Revise' : 'Edit';
    const secondaryActionLabel = request.status === 'Pending Approval' ? 'Save Draft' : 'Delete';
    const dueWarning = hasDueDateWarning(request);
    return <tr key={request.id} onClick={() => setPath?.(`/requests/${request.id}`)}><td>{request.requestNo}</td><td>{request.documentTitle}</td><td>{request.documentType}</td><td>{request.confidentialityLevel}</td><td><span data-variant={getStatusBadgeVariant(request.computedStatus || request.status)} className={statusClass(request.computedStatus || request.status)}>{request.computedStatus || request.status}</span></td><td>{request.dateNeeded}</td><td className={dueWarning ? 'due-date-cell warning' : 'due-date-cell'}>{dueWarning ? 'Warning ! ' : ''}{request.borrowReturnDueDate || '-'}</td>{showActions && <td className="actions-cell" onClick={(event) => event.stopPropagation()}>{canManageRequest ? <><button className="secondary small" type="button" onClick={() => onEditRequest?.(request)}>{primaryActionLabel}</button><button className="danger small" type="button" onClick={() => request.status === 'Pending Approval' ? onWithdrawRequest?.(request.id) : onDeleteRequest?.(request.id)}>{secondaryActionLabel}</button></> : <span className="helper-text">View only</span>}</td>}</tr>;
  }) : <tr><td colSpan={showActions ? 8 : 7} className="empty">No records found.</td></tr>}</tbody></table></div>;
}
function RequestDetails({ request, users, processing, closures, incidents, auditLogs, currentUser, setPath, setEditingRequestId }) {
  if (!request) return <Empty message="Request not found." />;
  const approver = users.find((user) => user.id === request.currentApprover);
  const requestProcessing = processing[request.id] || {};
  const closure = closures[request.id] || {};
  const requestIncidents = incidents.filter((incident) => incident.requestId === request.id);
  const approvalLogs = auditLogs.filter((log) => log.requestId === request.id && /approved|rejected|forwarded/i.test(log.action));
  const processingItems = Object.entries(requestProcessing).map(([key, value]) => {
    if (key === 'electronicReleaseReference' && !canViewReleaseReferences(currentUser, request)) return [key, 'Restricted'];
    return [key, value];
  });
  const canProcess = ['archivist', ...adminRoles].includes(currentUser.role);
  const canClose = ['archivist', ...adminRoles].includes(currentUser.role) || request.requestorId === currentUser.id;
  const canCreateIncident = ['archivist', ...adminRoles, 'dpo', 'ceo'].includes(currentUser.role);
  const canEditDraft = request.status === 'Draft' && request.requestorId === currentUser.id;

  return <section className="page"><PageTitle title={request.requestNo} subtitle={request.documentTitle} /><div className="detail-grid"><InfoCard title="Request Information" items={[['Requestor', request.requestorName], ['Branch', request.branch], ['Department', request.department], ['Document Type', request.documentType], ['Confidentiality', request.confidentialityLevel], ['Purpose', request.purpose], ['Date Needed', request.dateNeeded], ['Return Due Date', request.borrowReturnDueDate], ['Current Approver', approver?.name || 'Not assigned'], ['Status', request.computedStatus || request.status]]} /><InfoCard title="Approval History" items={approvalLogs.length ? approvalLogs.map((log) => [log.createdAt, `${log.action}: ${log.remarks || log.newStatus}`]) : [['Status', 'No approval history yet']]} /><InfoCard title="Archivist Processing / Release" items={processingItems.length ? processingItems : [['Status', 'No processing record yet']]} /><InfoCard title="Return / Closure" items={Object.entries(closure).length ? Object.entries(closure) : [['Status', 'Not closed']]} /><InfoCard title="Incident Reports" items={requestIncidents.length ? requestIncidents.map((incident) => [incident.incidentType, incident.status]) : [['Status', 'No incidents']]} /></div><div className="actions">{canEditDraft && <button className="secondary" onClick={() => { setEditingRequestId(request.id); setPath('/requests/new'); }}>Edit Draft and Resend</button>}{canClose && <button onClick={() => setPath(`/requests/${request.id}/closure`)}>Return / Closure</button>}{canProcess && <button className="secondary" onClick={() => setPath(`/archivist/${request.id}/process`)}>Archivist Processing</button>}{canCreateIncident && <button className="ghost" onClick={() => setPath('/incidents/new')}>Create Incident</button>}</div><AuditTrailTable logs={auditLogs.filter((log) => log.requestId === request.id)} users={users} setPath={setPath} /></section>;
}
function InfoCard({ title, items }) {
  return <article className="info-card"><h3>{title}</h3>{items.map(([key, value]) => {
    const text = String(value || '-');
    const isLink = /^(https?:\/\/|mailto:)/i.test(text);
    return <p key={key}><span>{humanize(key)}</span><strong>{isLink ? <a className="compact-link" href={text} target="_blank" rel="noreferrer" title={text}>{text}</a> : text}</strong></p>;
  })}</article>;
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
  const isSharedPrivacyApprover = ['dpo', 'ceo'].includes(currentUser.role);
  const queue = adminRoles.includes(currentUser.role)
    ? requests.filter((request) => request.status === 'Pending Approval')
    : requests.filter((request) => {
      if (request.status !== 'Pending Approval') return false;
      if (request.currentApprover === currentUser.id) return true;
      return isSharedPrivacyApprover && request.confidentialityLevel === 'Confidential';
    });
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
    updateRequestStatus(request.id, 'Forwarded to Archivist', 'Approved and forwarded', remarks || 'Approved', { currentApprover: '', assignedArchivistId: archivist?.id, approvedBy: currentUser.id, approvedAt: new Date().toLocaleString(), forwardedToArchivistAt: new Date().toLocaleString() });
    setRemarks('');
  };
  const reject = (request) => {
    if (!requireRemarks('Rejection')) return;
    updateRequestStatus(request.id, 'Rejected', 'Rejected request', remarks, { rejectedBy: currentUser.id, rejectedAt: new Date().toLocaleString(), rejectionReason: remarks });
    setRemarks('');
  };
  return <section className="page"><PageTitle title="Approval Queue" subtitle="Requests appear here only for the assigned approver, except confidential requests also appear to Admin DPO/CEO." />{errors.length > 0 && <AlertList items={errors} />}<textarea className="remarks-box" placeholder="Remarks required for rejection; optional for approval" value={remarks} onChange={(e) => setRemarks(e.target.value)} /><div className="queue-list">{queue.map((request) => <article className="queue-card" key={request.id} onClick={() => setPath(`/requests/${request.id}`)}><div><h3>{request.documentTitle}</h3><p>{request.requestNo} by {request.requestorName}</p><p>Assigned approver: {users.find((user) => user.id === request.currentApprover)?.name || (request.confidentialityLevel === 'Confidential' ? 'Admin DPO / CEO' : 'Not assigned')}</p><p>Reminder: bring back or revoke access by {request.borrowReturnDueDate || 'the approved due date'}.</p><span className={statusClass(request.status)}>{request.status}</span></div><div className="actions" onClick={(event) => event.stopPropagation()}><button onClick={() => approve(request)}>Approve</button><button className="danger" onClick={() => reject(request)}>Reject</button></div></article>)}{!queue.length && <Empty message="No approval items." />}</div></section>;
}
function ArchivistQueue({ requests, setPath }) {
  const queue = requests.filter((request) => ['Approved', 'Forwarded to Archivist', 'Processing'].includes(request.status));
  return <section className="page"><PageTitle title="Archivist Queue" subtitle="Retrieve, prepare, release, and monitor approved requests." /><div className="queue-list">{queue.map((request) => <article className="queue-card" key={request.id}><div><h3>{request.documentTitle}</h3><p>{request.requestNo} - {request.documentType}</p><span className={statusClass(request.status)}>{request.status}</span></div><button onClick={() => setPath(`/archivist/${request.id}/process`)}>Process</button></article>)}{!queue.length && <Empty message="No requests waiting for processing." />}</div></section>;
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
    setProcessing((records) => ({ ...records, [request.id]: { ...form, electronicReleaseReference: normalizeReleaseLink(form.electronicReleaseReference), archivistId: currentUser.id } }));
    updateRequestStatus(request.id, 'Processing', 'Started archivist processing', 'Retrieval is being prepared.', { assignedArchivistId: currentUser.id });
    setPath('/archivist');
  };
  const release = () => {
    if (isReleasedViewOnly) return;
    if (!validateRelease()) return;
    const electronicReleaseReference = normalizeReleaseLink(form.electronicReleaseReference);
    setProcessing((records) => ({ ...records, [request.id]: { ...form, electronicReleaseReference, archivistId: currentUser.id } }));
    updateRequestStatus(request.id, 'Released', 'Released document', form.releaseRemarks, { assignedArchivistId: currentUser.id });
    setPath('/archivist');
  };
  return <section className="page"><PageTitle title="Archivist Processing" subtitle={`${request.requestNo} - ${request.documentType}`} />{errors.length > 0 && <AlertList items={errors} />}{isReleasedViewOnly && <div className="alert">This request has already been released in good condition and is now view-only.</div>}<div className="toolbar-row"><span className="helper-text">Approved return/access deadline: {request.borrowReturnDueDate || 'Not set'}. Turnaround guide: active files same day; archived physical files 1 to 2 working days.</span>{!isReleasedViewOnly && request.status !== 'Processing' && <button className="secondary" type="button" onClick={startProcessing}>Start Processing</button>}</div><div className="form-grid">{request.documentType === 'Physical' ? <><Field label="Name of Archivist" value={currentUser.name} readOnly /><Field label="Name of Borrower" value={form.borrowerName} readOnly={isReleasedViewOnly} onChange={(v) => update('borrowerName', v)} /><Field label="Date Received" type="date" value={form.dateReceived} readOnly={isReleasedViewOnly} onChange={(v) => update('dateReceived', v)} /><Field label="Date Released" type="date" value={form.dateReleased} min={form.dateReceived || today()} readOnly={isReleasedViewOnly} onChange={(v) => update('dateReleased', v)} /><Field label="Expected Date of Return" type="date" value={form.expectedReturnDate} min={form.dateReleased || today()} readOnly={isReleasedViewOnly} onChange={(v) => update('expectedReturnDate', v)} /><Field label="Condition Before Release" type="select" value={form.physicalConditionBeforeRelease} options={['Good Condition', 'With Existing Damage', 'With Missing Pages', 'With Markings', 'Other']} readOnly={isReleasedViewOnly} onChange={(v) => update('physicalConditionBeforeRelease', v)} /><Field label="Storage Location" value={form.storageLocation} readOnly={isReleasedViewOnly} onChange={(v) => update('storageLocation', v)} /></> : <><Field label="File Released Via" type="select" value={form.electronicReleaseMethod} options={['Link', 'Shared Drive', 'Cloud Platform', 'Other']} readOnly={isReleasedViewOnly} onChange={(v) => update('electronicReleaseMethod', v)} /><Field label="Electronic Release Link" type="url" value={form.electronicReleaseReference} placeholder="https://..." readOnly={isReleasedViewOnly} onChange={(v) => update('electronicReleaseReference', v)} /><Field label="Access Expiry Date" type="date" value={form.accessExpiryDate} min={today()} readOnly={isReleasedViewOnly} onChange={(v) => update('accessExpiryDate', v)} /><label className="agreement"><input type="checkbox" checked={form.deletionConfirmationRequired} disabled={isReleasedViewOnly} onChange={(e) => update('deletionConfirmationRequired', e.target.checked)} /> Deletion confirmation required</label></>}<Field className="wide" label="Release Remarks" type="textarea" value={form.releaseRemarks} readOnly={isReleasedViewOnly} onChange={(v) => update('releaseRemarks', v)} /></div>{!isReleasedViewOnly && <button onClick={release}>Save and Mark Released</button>}</section>;
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
    const closureRecord = { ...form, validatedBy: form.validatedBy || currentUser.id, closedBy: currentUser.id, closedAt: new Date().toLocaleString() };
    setClosures((records) => ({ ...records, [request.id]: closureRecord }));
    if (request.documentType === 'Physical' && hasIssue) {
      setIncidents((items) => [{ id: crypto.randomUUID(), requestId: request.id, reportedBy: currentUser.id, incidentType: form.hasDamage || form.conditionUponReturn === 'With Damage' ? 'Damaged' : form.missingPages || form.conditionUponReturn === 'Missing Pages' ? 'Missing' : 'Altered', incidentDescription: 'Issue discovered during return and closure. Archivist must review before closure.', actionTaken: 'Incident report created; closure is blocked until resolved.', status: 'Open', createdAt: new Date().toLocaleString() }, ...items]);
      updateRequestStatus(request.id, 'Incident Reported', 'Incident created during closure', form.closureRemarks);
      return;
    }
    updateRequestStatus(request.id, canCloseRequest(request, record, closureRecord, incidents) ? 'Closed' : 'For Closure', 'Closure evaluated', form.closureRemarks);
  };
  return <section className="page"><PageTitle title="Return and Closure" subtitle={request.requestNo} />{errors.length > 0 && <AlertList items={errors} />}<div className="form-grid">{request.documentType === 'Physical' ? <><Field label="Date Returned" type="date" value={form.dateReturned} onChange={(v) => update('dateReturned', v)} /><Field label="Condition Upon Return" type="select" value={form.conditionUponReturn} options={['Complete', 'With Damage', 'With Markings', 'Missing Pages', 'Other']} onChange={(v) => update('conditionUponReturn', v)} /><Field label="Refiled Location" value={form.refiledLocation} onChange={(v) => update('refiledLocation', v)} />{['isComplete', 'hasDamage', 'hasMarkings', 'missingPages'].map((key) => <label className="agreement" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} /> {humanize(key)}</label>)}</> : <>{['accessRevoked', 'deletionConfirmed'].map((key) => <label className="agreement" key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => update(key, e.target.checked)} /> {humanize(key)}</label>)}<Field label="Validated By" value={currentUser.name} readOnly /><Field label="Validation Date" type="date" value={form.validationDate} onChange={(v) => update('validationDate', v)} /></>}<Field className="wide" label="Closure Remarks" type="textarea" value={form.closureRemarks} onChange={(v) => update('closureRemarks', v)} /></div>{request.documentType === 'Physical' && hasIssue && <div className="alert">Return issues will create an incident report instead of closing automatically.</div>}<button onClick={close}>Evaluate Closure</button></section>;
}
function Incidents({ incidents, requests, setPath }) {
  return <section className="page"><PageTitle title="Incident Reports" subtitle="Lost, missing, damaged, altered, overdue, or improperly handled records." /><div className="toolbar-row"><span className="helper-text">Incident handling is required for damage, missing pages, unauthorized sharing, overdue returns, and unrecalled access.</span><button className="secondary" type="button" onClick={() => setPath('/incidents/new')}>Create Incident</button></div><IncidentTable incidents={incidents} requests={requests} setPath={setPath} /></section>;
}

function NewIncident({ requests, currentUser, setIncidents, updateRequestStatus, setPath }) {
  const [form, setForm] = useState({ requestId: requests[0]?.id || '', incidentType: 'Damaged', incidentDescription: '', actionTaken: '', status: 'Open' });
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const save = () => {
    if (!form.requestId || !form.incidentDescription.trim()) return;
    setIncidents((items) => [{ ...form, id: crypto.randomUUID(), reportedBy: currentUser.id, createdAt: new Date().toLocaleString() }, ...items]);
    updateRequestStatus(form.requestId, 'Incident Reported', 'Created incident report', form.incidentDescription);
    setPath('/incidents');
  };
  return <section className="page"><PageTitle title="Create Incident Report" /><div className="form-grid"><label className="field"><span>Request</span><select value={form.requestId} onChange={(event) => update('requestId', event.target.value)}>{requests.map((request) => <option value={request.id} key={request.id}>{request.requestNo} - {request.documentTitle}</option>)}</select></label><Field label="Reported By" value={currentUser.name} readOnly /><Field label="Incident Type" type="select" value={form.incidentType} options={['Lost', 'Missing', 'Damaged', 'Altered', 'Unauthorized Sharing', 'Overdue', 'Access Not Revoked', 'Other']} onChange={(v) => update('incidentType', v)} /><Field label="Status" type="select" value={form.status} options={['Open', 'Under Review', 'Resolved', 'Closed']} onChange={(v) => update('status', v)} /><Field className="wide" label="Incident Description" type="textarea" value={form.incidentDescription} onChange={(v) => update('incidentDescription', v)} /><Field className="wide" label="Action Taken" type="textarea" value={form.actionTaken} onChange={(v) => update('actionTaken', v)} /></div><button disabled={!form.requestId || !form.incidentDescription} onClick={save}>Create Incident</button></section>;
}
function Reports({ requests, incidents, auditLogs, users, setPath }) {
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
      <div className="filters"><Field label="Branch" type="select" value={filter.branch} options={['All', ...branches]} onChange={(v) => setFilter({ ...filter, branch: v })} /><Field label="Department" type="select" value={filter.department} options={['All', ...departments]} onChange={(v) => setFilter({ ...filter, department: v })} /><Field label="Date From" type="date" value={filter.dateFrom} onChange={(v) => setFilter({ ...filter, dateFrom: v })} /><Field label="Date To" type="date" value={filter.dateTo} onChange={(v) => setFilter({ ...filter, dateTo: v })} /><Field label="Status" type="select" value={filter.status} options={['All', ...statuses]} onChange={(v) => setFilter({ ...filter, status: v })} /><Field label="Document Type" type="select" value={filter.documentType} options={['All', 'Physical', 'Electronic']} onChange={(v) => setFilter({ ...filter, documentType: v })} /><Field label="Confidentiality" type="select" value={filter.confidentialityLevel} options={['All', ...confidentialityLevels]} onChange={(v) => setFilter({ ...filter, confidentialityLevel: v })} /><label className="field"><span>Requestor</span><select value={filter.requestorId} onChange={(event) => setFilter({ ...filter, requestorId: event.target.value })}><option value="All">All</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Archivist</span><select value={filter.archivistId} onChange={(event) => setFilter({ ...filter, archivistId: event.target.value })}><option value="All">All</option>{users.filter((user) => user.role === 'archivist').map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label></div>
      <div className="toolbar-row"><span className="helper-text">Current report: {activeTab.label}</span><button className="secondary" type="button" disabled={!activeRequests.length} onClick={exportCsv}>Export CSV</button></div>
      <div className="report-tabs">
        {reportTabs.map((tab) => (
          <button type="button" className={activeReport === tab.label ? 'active' : ''} key={tab.label} onClick={() => setActiveReport(tab.label)}>
            {tab.label}: {tab.requests ? tab.requests.length : tab.count}
          </button>
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
  return <div className="table-card"><table><thead><tr><th>Request</th><th>Type</th><th>Description</th><th>Action Taken</th><th>Status</th></tr></thead><tbody>{incidents.map((incident) => <tr key={incident.id} onClick={() => setPath(`/requests/${incident.requestId}`)}><td>{requests.find((request) => request.id === incident.requestId)?.requestNo}</td><td>{incident.incidentType}</td><td>{incident.incidentDescription}</td><td>{incident.actionTaken}</td><td>{incident.status}</td></tr>)}{!incidents.length && <tr><td colSpan="5" className="empty">No incident reports.</td></tr>}</tbody></table></div>;
}

function Users({ users, setUsers, currentUserId }) {
  const [userList, setUserList] = useState(users);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newUser, setNewUser] = useState({ name: '', email: '', password: 'temporary123', gender: 'male', role: 'requestor', branch: 'Main Office', department: 'Savings', position: 'Staff' });

  useEffect(() => {
    setUserList(users);
  }, [users]);

  const startEdit = (user) => {
    setEditingId(user.id);
    setDraft(user);
  };

  const saveEdit = () => {
    setUsers((items) => items.map((item) => {
      if (item.id !== editingId) return item;
      const name = draft.name?.trim() || item.name;
      const gender = draft.gender || item.gender;
      const avatar = draft.avatarCustom ? draft.avatar : getAvatarUrl(name, gender);
      return { ...item, ...draft, name, email: draft.email?.trim().toLowerCase() || item.email, avatar };
    }));
    setEditingId(null);
    setDraft({});
  };

  const updateNewUser = (key, value) => setNewUser((current) => ({ ...current, [key]: value }));

  const addUser = () => {
    const name = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    if (!name || !email || !newUser.password) return;
    if (users.some((user) => user.email.toLowerCase() === email)) return;
    const next = {
      ...newUser,
      id: crypto.randomUUID(),
      name,
      email,
      branch: normalizeBranchName(newUser.branch),
      avatar: getAvatarUrl(name, newUser.gender),
    };
    setUsers((items) => [...items, next]);
    setNewUser({ name: '', email: '', password: 'temporary123', gender: 'male', role: 'requestor', branch: 'Main Office', department: 'Savings', position: 'Staff' });
  };

  const deleteUser = (id) => {
    if (id === currentUserId) return;
    setUsers((items) => items.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft({});
    }
  };

  return (
    <section className="page users-page">
      <PageTitle title="User Management" subtitle="Admin view of users, roles, branches, departments, and active status." />
      <div className="table-card add-user-card">
        <h3>Add New User</h3>
        <div className="form-grid">
          <Field label="Name" value={newUser.name} onChange={(value) => updateNewUser('name', value)} />
          <Field label="Gmail / Email" type="email" value={newUser.email} onChange={(value) => updateNewUser('email', value)} />
          <Field label="Password" value={newUser.password} onChange={(value) => updateNewUser('password', value)} />
          <Field label="Role" type="select" value={newUser.role} options={Object.keys(roles)} onChange={(value) => updateNewUser('role', value)} />
          <Field label="Branch" type="select" value={newUser.branch} options={branches} onChange={(value) => updateNewUser('branch', value)} />
          <Field label="Department" type="select" value={newUser.department} options={departments} onChange={(value) => updateNewUser('department', value)} />
        </div>
        <button type="button" disabled={!newUser.name.trim() || !newUser.email.trim() || !newUser.password} onClick={addUser}>Add User</button>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Password</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => {
              const isEditing = editingId === user.id;
              return (
                <tr key={user.id} className={isEditing ? 'editing-row' : ''} onClick={() => !isEditing && startEdit(user)}>
                  <td>
                    <div className="user-cell">
                      <img className="avatar-image" src={(isEditing ? draft.avatar : user.avatar) || getAvatarUrl(isEditing ? draft.name : user.name, isEditing ? draft.gender : user.gender)} alt={user.name} />
                      <div>
                        {isEditing ? <input value={draft.name || ''} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /> : <strong>{user.name}</strong>}
                        {!isEditing && <div className="user-meta">{user.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{isEditing ? <input value={draft.email || ''} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /> : user.email}</td>
                  <td>{isEditing ? <input value={draft.password || ''} onChange={(event) => setDraft((current) => ({ ...current, password: event.target.value }))} /> : (user.password || '-')}</td>
                  <td>{isEditing ? <select value={draft.role || ''} onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}>{Object.entries(roles).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select> : roles[user.role]}</td>
                  <td>{isEditing ? <input value={draft.branch || ''} onChange={(event) => setDraft((current) => ({ ...current, branch: event.target.value }))} /> : user.branch}</td>
                  <td>{isEditing ? <input value={draft.department || ''} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))} /> : user.department}</td>
                  <td className="actions-cell" onClick={(event) => event.stopPropagation()}>
                    {isEditing ? (
                      <>
                        <button className="secondary" type="button" onClick={saveEdit}>Save</button>
                        <button className="ghost" type="button" onClick={() => { setEditingId(null); setDraft({}); }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="secondary" type="button" onClick={() => startEdit(user)}>Edit</button>
                        <button className="danger" type="button" disabled={user.id === currentUserId} onClick={() => deleteUser(user.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

function Settings({ theme, setTheme }) {
  const storedSettings = useMemo(() => loadStoredValue(settingsStorageKey, {}), []);
  const [branchesList, setBranchesList] = useState(() => {
    const storedBranches = Array.isArray(storedSettings.branches) ? storedSettings.branches.map(normalizeBranchName) : [];
    const mergedBranches = [...branches, ...storedBranches].filter((branch, index, list) => list.indexOf(branch) === index);
    return mergedBranches;
  });
  const [departmentsList, setDepartmentsList] = useState(() => storedSettings.departments || departments);
  const [categoriesList, setCategoriesList] = useState(() => storedSettings.categories || ['Member Records', 'Finance Records', 'HR Records', 'Board Records']);
  const [editingItem, setEditingItem] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [notice, setNotice] = useState('');
  const [addingSection, setAddingSection] = useState(null);
  const [newItemValue, setNewItemValue] = useState('');

  useEffect(() => {
    saveStoredValue(settingsStorageKey, {
      branches: branchesList,
      departments: departmentsList,
      categories: categoriesList,
    });
  }, [branchesList, departmentsList, categoriesList]);

  const startEdit = (section, index, value) => {
    setEditingItem({ section, index });
    setDraftValue(value);
    setNotice('');
  };

  const saveEdit = () => {
    const value = draftValue.trim();
    if (!editingItem || !value) return;
    if (editingItem.section === 'branches') setBranchesList((items) => items.map((item, index) => (index === editingItem.index ? value : item)));
    if (editingItem.section === 'departments') setDepartmentsList((items) => items.map((item, index) => (index === editingItem.index ? value : item)));
    if (editingItem.section === 'categories') setCategoriesList((items) => items.map((item, index) => (index === editingItem.index ? value : item)));
    setEditingItem(null);
    setDraftValue('');
    setNotice('Changes saved permanently');
  };

  const deleteItem = (section, index) => {
    if (section === 'branches') setBranchesList((items) => items.filter((_, itemIndex) => itemIndex !== index));
    if (section === 'departments') setDepartmentsList((items) => items.filter((_, itemIndex) => itemIndex !== index));
    if (section === 'categories') setCategoriesList((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setNotice('Item removed permanently');
  };

  const addItem = (section) => {
    setAddingSection(section);
    setNewItemValue('');
    setEditingItem(null);
    setDraftValue('');
    setNotice('');
  };

  const saveNewItem = () => {
    const value = newItemValue.trim();
    if (!addingSection || !value) return;
    if (addingSection === 'branches') setBranchesList((items) => [...items, value]);
    if (addingSection === 'departments') setDepartmentsList((items) => [...items, value]);
    if (addingSection === 'categories') setCategoriesList((items) => [...items, value]);
    setAddingSection(null);
    setNewItemValue('');
    setNotice('New item added permanently');
  };

  const cancelNewItem = () => {
    setAddingSection(null);
    setNewItemValue('');
    setNotice('');
  };

  return (
    <section className={`page settings-page ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <PageTitle title="System Settings" subtitle="Branches, departments, document categories, routing, and security settings." />
      <div className="toolbar-row">
        <span className="helper-text">{notice || 'Click any item to edit, delete, or save changes.'}</span>
        <button className="secondary" type="button" onClick={() => { setEditingItem(null); setDraftValue(''); saveStoredValue(settingsStorageKey, { branches: branchesList, departments: departmentsList, categories: categoriesList }); setNotice('Changes saved permanently'); }}>Save Changes</button>
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
        <div className="card-header">
          <h3>Document Retrieval Policy Reference</h3>
        </div>
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
  return (
    <article className="info-card">
      <div className="card-header">
        <h3>{title}</h3>
        <button className="secondary" type="button" onClick={() => onAdd(section)}>+ Add</button>
      </div>
      {addingSection === section && (
        <div className="add-inline-form">
          <input value={newItemValue} onChange={(event) => onNewItemChange(event.target.value)} placeholder={`New ${title}`} />
          <div className="action-group">
            <button className="secondary" type="button" onClick={onSaveNewItem}>Save</button>
            <button className="ghost" type="button" onClick={onCancelNewItem}>Cancel</button>
          </div>
        </div>
      )}
      <div className="stacked-list">
        {items.map((item, index) => {
          const isEditing = editingItem?.section === section && editingItem.index === index;
          return (
            <div className="list-item" key={`${section}-${index}`} onClick={() => !isEditing && onStartEdit(section, index, item)}>
              {isEditing ? <input value={draftValue} onChange={(event) => onDraftChange(event.target.value)} /> : <span>{item}</span>}
              <div className="action-group" onClick={(event) => event.stopPropagation()}>
                {isEditing ? (
                  <>
                    <button className="secondary" type="button" onClick={onSaveEdit}>Save</button>
                    <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="secondary" type="button" onClick={() => onStartEdit(section, index, item)}>Edit</button>
                    <button className="danger" type="button" onClick={() => onDelete(section, index)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function AuditTrailTable({ logs, users, setPath }) {
  return <div className="table-card"><h3>Audit Trail</h3><table><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Old</th><th>New</th><th>Remarks</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} onClick={() => setPath?.(`/requests/${log.requestId}`)}><td>{log.createdAt}</td><td>{users.find((user) => user.id === log.userId)?.name}</td><td>{log.action}</td><td>{log.oldStatus}</td><td>{log.newStatus}</td><td>{log.remarks}</td></tr>)}{!logs.length && <tr><td className="empty" colSpan="6">No audit events yet.</td></tr>}</tbody></table></div>;
}

function AuditLogsPage({ logs, users, requests, setPath }) {
  return <section className="page"><PageTitle title="Audit Logs" subtitle="Admin-only monitoring for every important request status change and action." /><div className="table-card"><table><thead><tr><th>Date</th><th>Request</th><th>User</th><th>Action</th><th>Old Status</th><th>New Status</th><th>Remarks</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} onClick={() => setPath(`/requests/${log.requestId}`)}><td>{log.createdAt}</td><td>{requests.find((request) => request.id === log.requestId)?.requestNo || '-'}</td><td>{users.find((user) => user.id === log.userId)?.name || '-'}</td><td>{log.action}</td><td>{log.oldStatus}</td><td>{log.newStatus}</td><td>{log.remarks}</td></tr>)}{!logs.length && <tr><td className="empty" colSpan="7">No audit logs yet.</td></tr>}</tbody></table></div></section>;
}

function Empty({ message }) {
  return <div className="empty-state">{message}</div>;
}

function RoleDenied({ setPath }) {
  return <section className="page"><div className="empty-state"><h3>Access restricted</h3><p>Your current role cannot open this page.</p><button type="button" onClick={() => setPath('/dashboard')}>Back to Dashboard</button></div></section>;
}

export default App;
