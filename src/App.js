import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const roles = {
  requestor: 'Requestor',
  branch_head: 'Branch Head',
  sacd_head: 'SACD Head',
  department_head: 'Department Head',
  dpo: 'Data Privacy Officer',
  ceo: 'CEO',
  archivist: 'Archivist',
  admin: 'Admin / ICT',
};

const branches = ['Head Office', 'Barbaza', 'San Jose', 'Hamtic', 'Sibalom', 'Laua-an', 'San Remigio'];
const departments = ['ICT Department', 'HRAD', 'Accounting', 'Audit', 'SACD', 'Lending', 'Savings', 'Broadband Division', 'Records / Archive'];
const statuses = ['Draft', 'Pending Approval', 'Needs Clarification', 'Rejected', 'Approved', 'Forwarded to Archivist', 'Processing', 'Released', 'Returned', 'Access Revoked', 'Deletion Confirmed', 'For Closure', 'Closed', 'Incident Reported', 'Overdue'];

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
  { id: 'u1', name: 'Mara Dela Cruz', email: 'mara@bmpc.local', gender: 'female', role: 'requestor', branch: 'Barbaza', department: 'Savings', position: 'Member Services Associate', avatar: getAvatarUrl('Mara Dela Cruz', 'female') },
  { id: 'u2', name: 'Ramon Salazar', email: 'ramon@bmpc.local', gender: 'male', role: 'branch_head', branch: 'Barbaza', department: 'Branch Operations', position: 'Branch Head', avatar: getAvatarUrl('Ramon Salazar', 'male') },
  { id: 'u3', name: 'Lina Reyes', email: 'lina@bmpc.local', gender: 'female', role: 'sacd_head', branch: 'Head Office', department: 'SACD', position: 'SACD Head', avatar: getAvatarUrl('Lina Reyes', 'female') },
  { id: 'u4', name: 'Ana Villanueva', email: 'ana@bmpc.local', gender: 'female', role: 'department_head', branch: 'Head Office', department: 'ICT Department', position: 'Department Head', avatar: getAvatarUrl('Ana Villanueva', 'female') },
  { id: 'u5', name: 'Joel Santos', email: 'joel@bmpc.local', gender: 'male', role: 'dpo', branch: 'Head Office', department: 'Compliance', position: 'Data Privacy Officer', avatar: getAvatarUrl('Joel Santos', 'male') },
  { id: 'u6', name: 'Leonil M. Alabado', email: 'leonil@bmpc.local', gender: 'male', role: 'ceo', branch: 'Head Office', department: 'Executive', position: 'CEO', avatar: getAvatarUrl('Leonil M. Alabado', 'male') },
  { id: 'u7', name: 'Nico Flores', email: 'nico@bmpc.local', gender: 'male', role: 'archivist', branch: 'Head Office', department: 'Records / Archive', position: 'Archivist', avatar: getAvatarUrl('Nico Flores', 'male') },
  { id: 'u8', name: 'Ivy Mendoza', email: 'ivy@bmpc.local', gender: 'female', role: 'admin', branch: 'Head Office', department: 'ICT Department', position: 'System Admin', avatar: getAvatarUrl('Ivy Mendoza', 'female') },
];

const seedRequests = [
  {
    id: 'r1',
    requestNo: 'DRR-20260708-0001',
    requestorId: 'u1',
    requestorName: 'Mara Dela Cruz',
    requestDate: '2026-07-08',
    documentTitle: 'Member Loan Ledger 2025',
    referenceNo: 'MLL-2025-014',
    documentType: 'Physical',
    confidentialityLevel: 'Normal',
    purpose: 'Account verification for member inquiry.',
    dateNeeded: '2026-07-09',
    borrowReturnDueDate: '2026-07-13',
    remarks: 'Original ledger needed for review.',
    branch: 'Barbaza',
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
    referenceNo: 'PAY-Q2-2026',
    documentType: 'Electronic',
    confidentialityLevel: 'Highly Sensitive',
    purpose: 'Internal audit reconciliation.',
    dateNeeded: '2026-07-10',
    borrowReturnDueDate: '2026-07-14',
    remarks: 'Read-only copy preferred.',
    branch: 'Head Office',
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
    requestorId: 'u3',
    requestorName: 'Lina Reyes',
    requestDate: '2026-07-09',
    documentTitle: 'Board Resolution Book 2024',
    referenceNo: 'BRB-2024-009',
    documentType: 'Physical',
    confidentialityLevel: 'Confidential',
    purpose: 'Validate cooperative policy reference for SACD review.',
    dateNeeded: '2026-07-11',
    borrowReturnDueDate: '2026-07-13',
    remarks: 'Release only inside records room.',
    branch: 'Head Office',
    department: 'SACD',
    position: 'SACD Head',
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
    referenceNo: 'KYC-2026-044',
    documentType: 'Electronic',
    confidentialityLevel: 'Highly Sensitive',
    purpose: 'Privacy compliance validation for an account update.',
    dateNeeded: '2026-07-12',
    borrowReturnDueDate: '2026-07-12',
    remarks: 'Temporary encrypted access requested.',
    branch: 'Head Office',
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
    referenceNo: 'SAR-2026-018',
    documentType: 'Electronic',
    confidentialityLevel: 'Confidential',
    purpose: 'Prepare branch-level reactivation report.',
    dateNeeded: '2026-07-13',
    borrowReturnDueDate: '2026-07-17',
    remarks: 'Branch-only copy.',
    branch: 'Barbaza',
    department: 'Savings',
    position: 'Member Services Associate',
    status: 'Needs Clarification',
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
    referenceNo: 'ICT-WAR-2025',
    documentType: 'Physical',
    confidentialityLevel: 'Normal',
    purpose: 'Warranty validation before replacement procurement.',
    dateNeeded: '2026-07-10',
    borrowReturnDueDate: '2026-07-10',
    remarks: 'Folder includes supplier invoices.',
    branch: 'Head Office',
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
  if (request.confidentialityLevel === 'Highly Sensitive') return users.find((user) => user.role === 'dpo')?.id || users.find((user) => user.role === 'ceo')?.id || '';
  if (request.confidentialityLevel === 'Confidential') return users.find((user) => user.role === 'dpo')?.id || users.find((user) => user.role === 'ceo')?.id || '';
  if (profile.role === 'branch_head') return users.find((user) => user.role === 'sacd_head')?.id || '';
  if (requestBranch !== 'Head Office') return users.find((user) => user.role === 'branch_head' && user.branch === requestBranch)?.id || '';
  if (requestBranch === 'Head Office') {
    return users.find((user) => user.role === 'department_head' && user.department === profile.department)?.id || users.find((user) => user.role === 'department_head')?.id || '';
  }
  return users.find((user) => user.role === 'sacd_head')?.id || '';
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

function statusClass(status) {
  const key = status.toLowerCase().replaceAll(' ', '-');
  return `badge status-${key}`;
}

function getStatusBadgeVariant(status) {
  if (['Pending Approval', 'Needs Clarification', 'For Closure'].includes(status)) return 'warning';
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
    { test: /^\/requests\/new$/, roles: ['requestor', 'branch_head', 'department_head', 'admin'] },
    { test: /^\/requests\/my$/, roles: ['requestor', 'branch_head', 'department_head'] },
    { test: /^\/requests\/all$/, roles: ['admin', 'ceo', 'dpo'] },
    { test: /^\/requests\/[^/]+(\/closure)?$/, roles: Object.keys(roles) },
    { test: /^\/approvals$/, roles: ['branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'admin'] },
    { test: /^\/archivist(\/[^/]+\/process)?$/, roles: ['archivist', 'admin'] },
    { test: /^\/incidents(\/new)?$/, roles: ['archivist', 'admin', 'dpo', 'ceo'] },
    { test: /^\/reports$/, roles: ['branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin'] },
    { test: /^\/users$/, roles: ['admin'] },
    { test: /^\/settings$/, roles: ['admin'] },
    { test: /^\/audit-logs$/, roles: ['admin'] },
  ];
  return rules.some((rule) => rule.test.test(path) && rule.roles.includes(role));
}

function canViewReleaseReferences(user, request) {
  return request.requestorId === user.id || request.assignedArchivistId === user.id || ['admin', 'dpo', 'ceo'].includes(user.role);
}

function validateRequestForm(form) {
  const errors = [];
  if (!form.documentTitle?.trim()) errors.push('Document title is required.');
  if (!form.documentType) errors.push('Document type is required.');
  if (!form.purpose?.trim()) errors.push('Purpose of retrieval is required.');
  if (!form.dateNeeded) errors.push('Date needed is required.');
  if (!form.borrowReturnDueDate) errors.push('Return due date is required.');
  if (form.dateNeeded && form.borrowReturnDueDate && form.borrowReturnDueDate < form.dateNeeded) errors.push('Return due date cannot be earlier than date needed.');
  if (!form.confidentialityLevel) errors.push('Confidentiality level is required.');
  if (!form.agreementAccepted) errors.push('Agreement checkbox must be accepted.');
  return errors;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateTick(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function buildRequestTrend(requests, dayCount = 30) {
  const latestRequestDate = requests.reduce((latest, request) => {
    if (!request.requestDate) return latest;
    return request.requestDate > latest ? request.requestDate : latest;
  }, today());
  const endDate = new Date(`${latestRequestDate}T00:00:00`);
  const startDate = addDays(endDate, -(dayCount - 1));
  const countsByDate = requests.reduce((counts, request) => {
    if (!request.requestDate) return counts;
    counts[request.requestDate] = (counts[request.requestDate] || 0) + 1;
    return counts;
  }, {});

  return Array.from({ length: dayCount }, (_, index) => {
    const dateKey = toDateKey(addDays(startDate, index));
    return { date: dateKey, count: countsByDate[dateKey] || 0 };
  });
}

function App() {
  const [users, setUsers] = useState(() => initialUsers.map((user) => ({ ...user, password: 'demo-password' })));
  const [currentUserId, setCurrentUserId] = useState('u8');
  const [path, setPathState] = useState('/dashboard');
  const [theme, setTheme] = useState('dark');
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathHistoryRef = useRef([]);
  const [requests, setRequests] = useState(seedRequests);
  const [processing, setProcessing] = useState({
    r3: {
      dateReceived: '2026-07-10',
      dateReleased: '',
      borrowerName: 'Lina Reyes',
      expectedReturnDate: '2026-07-13',
      physicalConditionBeforeRelease: 'Good Condition',
      storageLocation: 'Records Room A / Cabinet 2',
      releaseRemarks: 'Pulled from board files; awaiting controlled release.',
      archivistId: 'u7',
    },
    r4: {
      electronicReleaseMethod: 'Shared Link',
      electronicReleaseReference: 'Encrypted SharePoint link EXP-20260712',
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
  });
  const [closures, setClosures] = useState({
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
  });
  const [incidents, setIncidents] = useState([
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
  ]);
  const [auditLogs, setAuditLogs] = useState([
    { id: 'a1', requestId: 'r1', userId: 'u2', action: 'Approved and forwarded', oldStatus: 'Pending Approval', newStatus: 'Forwarded to Archivist', remarks: 'Business purpose validated.', createdAt: '2026-07-08 09:20' },
    { id: 'a2', requestId: 'r3', userId: 'u5', action: 'Approved for controlled processing', oldStatus: 'Pending Approval', newStatus: 'Processing', remarks: 'Confidential material may be reviewed in records room only.', createdAt: '2026-07-10 08:40' },
    { id: 'a3', requestId: 'r4', userId: 'u7', action: 'Released electronic access', oldStatus: 'Forwarded to Archivist', newStatus: 'Released', remarks: 'Read-only encrypted link issued.', createdAt: '2026-07-10 11:05' },
    { id: 'a4', requestId: 'r6', userId: 'u7', action: 'Closure evaluated', oldStatus: 'Returned', newStatus: 'Closed', remarks: 'Folder complete and refiled.', createdAt: '2026-07-10 16:45' },
  ]);
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
      setRequests((items) => items.map((item) => (item.id === requestId ? { ...item, ...form, requestorId: currentUser.id, requestorName: currentUser.name, branch: form.branch || currentUser.branch, department: form.department || currentUser.department, position: currentUser.position } : item)));
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
      branch: form.branch || currentUser.branch,
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

  const withdrawRequest = (requestId) => {
    const target = requests.find((item) => item.id === requestId);
    if (!target || !['Draft', 'Needs Clarification', 'Pending Approval'].includes(target.status)) return;
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

  const createAccount = (form) => {
    const email = form.email.trim().toLowerCase();
    if (!form.name.trim()) return ['Full name is required.'];
    if (!email) return ['Email is required.'];
    if (users.some((user) => user.email.toLowerCase() === email)) return ['Email is already registered.'];
    if (!form.password || form.password.length < 6) return ['Password must be at least 6 characters.'];
    const nextUser = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      email,
      password: form.password,
      gender: form.gender,
      role: 'requestor',
      branch: form.branch,
      department: form.department,
      position: form.position || 'Requestor',
      avatar: getAvatarUrl(form.name.trim(), form.gender),
    };
    setUsers((items) => [...items, nextUser]);
    setCurrentUserId(nextUser.id);
    setPath('/dashboard', { replace: true });
    return [];
  };

  const resetPassword = (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return ['Email is required.'];
    if (!password || password.length < 6) return ['New password must be at least 6 characters.'];
    if (!users.some((user) => user.email.toLowerCase() === normalizedEmail)) return ['No account found for that email.'];
    setUsers((items) => items.map((user) => (user.email.toLowerCase() === normalizedEmail ? { ...user, password } : user)));
    return [];
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
    return <Login users={users} currentUserId={currentUserId} onLogin={(id) => { setCurrentUserId(id); setPath('/dashboard', { replace: true }); }} onCreateAccount={createAccount} onResetPassword={resetPassword} />;
  }

  const pageProps = { currentUser, users, requests: visibleRequests, rawRequests: requests, processing, closures, incidents, auditLogs, setPath, submitRequest, updateRequestStatus, addAuditLog, setProcessing, setClosures, setIncidents };

  return (
    <div className={`app-shell ${theme} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <Sidebar user={currentUser} path={path} setPath={setPath} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="workspace">
        <Header user={currentUser} users={users} setCurrentUserId={setCurrentUserId} onLogout={() => setPath('/login')} onUpdateProfile={updateCurrentUserProfile} theme={theme} setTheme={setTheme} isMobileMenuOpen={isMobileMenuOpen} onMenuToggle={() => setIsMobileMenuOpen((isOpen) => !isOpen)} />
        {!allowedPath && <RoleDenied setPath={setPath} />}
        {allowedPath && path === '/dashboard' && <Dashboard {...pageProps} />}
        {allowedPath && path === '/requests/new' && <NewRequest {...pageProps} editingRequestId={editingRequestId} setEditingRequestId={setEditingRequestId} />}
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
        {allowedPath && path === '/users' && <Users users={users} />}
        {allowedPath && path === '/settings' && <Settings theme={theme} setTheme={setTheme} />}
        {allowedPath && path === '/audit-logs' && <AuditLogsPage logs={auditLogs} users={users} requests={requests} setPath={setPath} />}
      </main>
    </div>
  );
}

function SidebarIcon({ name }) {
  const commonProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'dashboard':
      return <svg {...commonProps}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="13" width="7" height="8" rx="1" /><rect x="3" y="13" width="7" height="8" rx="1" /></svg>;
    case 'request':
      return <svg {...commonProps}><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M9 12h6" /><path d="M9 16h6" /></svg>;
    case 'approval':
      return <svg {...commonProps}><path d="M5 12l4 4 10-10" /><path d="M5 19h14" /></svg>;
    case 'archive':
      return <svg {...commonProps}><path d="M3 6h18" /><path d="M5 6v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6" /><path d="M9 10h6" /><path d="M9 14h6" /></svg>;
    case 'reports':
      return <svg {...commonProps}><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /></svg>;
    case 'users':
      return <svg {...commonProps}><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" /><circle cx="10" cy="7" r="3" /><path d="M17 8a3 3 0 1 1 0 6" /></svg>;
    case 'settings':
      return <svg {...commonProps}><circle cx="12" cy="12" r="3" /><path d="M19 12a7.2 7.2 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.9 7.9 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7.9 7.9 0 0 0-1.7 1L5 6l-2 3.5 2 1.5a7.2 7.2 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.9 7.9 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7.9 7.9 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" /></svg>;
    case 'audit':
      return <svg {...commonProps}><path d="M7 3h10l3 3v14H7z" /><path d="M17 3v4h4" /><path d="M9 11h8" /><path d="M9 15h5" /></svg>;
    default:
      return <svg {...commonProps}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;
  }
}

function ThemeIcon({ theme }) {
  const commonProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (theme === 'dark') {
    return <svg {...commonProps} aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z" /></svg>;
  }
  return <svg {...commonProps} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>;
}

function Sidebar({ user, path, setPath, isOpen, onClose }) {
  const items = [
    ['Dashboard', '/dashboard', ['requestor', 'branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin'], 'dashboard'],
    ['New Request', '/requests/new', ['requestor', 'branch_head', 'department_head'], 'request'],
    ['My Requests', '/requests/my', ['requestor', 'branch_head', 'department_head'], 'request'],
    ['Approval Queue', '/approvals', ['branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'admin'], 'approval'],
    ['Archivist Queue', '/archivist', ['archivist', 'admin'], 'archive'],
    ['All Requests', '/requests/all', ['admin', 'ceo', 'dpo'], 'request'],
    ['Incidents', '/incidents', ['archivist', 'admin', 'dpo', 'ceo'], 'archive'],
    ['Reports', '/reports', ['branch_head', 'sacd_head', 'department_head', 'dpo', 'ceo', 'archivist', 'admin'], 'reports'],
    ['Users', '/users', ['admin'], 'users'],
    ['Settings', '/settings', ['admin'], 'settings'],
    ['Audit Logs', '/audit-logs', ['admin'], 'audit'],
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
      </aside>
    </>
  );
}

function Header({ user, users, setCurrentUserId, onLogout, onUpdateProfile, theme, setTheme, isMobileMenuOpen, onMenuToggle }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: user.name, email: user.email, password: user.password || '', gender: user.gender, avatar: user.avatarCustom ? user.avatar : '', avatarCustom: Boolean(user.avatarCustom) });
  const [profileErrors, setProfileErrors] = useState([]);

  useEffect(() => {
    setProfileDraft({ name: user.name, email: user.email, password: user.password || '', gender: user.gender, avatar: user.avatarCustom ? user.avatar : '', avatarCustom: Boolean(user.avatarCustom) });
    setProfileErrors([]);
  }, [user]);

  const currentAvatar = profileDraft.avatar || getAvatarUrl(profileDraft.name, profileDraft.gender);

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
        <div><h1>Document Retrieval Request System</h1><p>Secure request, approval, release, return, and audit monitoring.</p></div>
      </div>
      <div className="profile-tools">
        <button className="user-chip" type="button" onClick={() => setIsProfileOpen(true)} aria-label="Edit profile">
          <img className="avatar-image compact" src={user.avatar || getAvatarUrl(user.name, user.gender)} alt={user.name} />
          <div>
            <strong>{user.name}</strong>
            <span>{roles[user.role]}</span>
          </div>
        </button>
        <select value={user.id} onChange={(event) => setCurrentUserId(event.target.value)}>{users.map((item) => <option value={item.id} key={item.id}>{item.name} - {roles[item.role]}</option>)}</select>
        <button type="button" className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <span className="theme-toggle-dot"><ThemeIcon theme={theme} /></span>
          <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
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

function Login({ users, currentUserId, onLogin, onCreateAccount, onResetPassword }) {
  const [selected, setSelected] = useState(currentUserId);
  const [mode, setMode] = useState('login');
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const selectedUser = users.find((user) => user.id === selected) || users[0];
  const [loginForm, setLoginForm] = useState({ email: selectedUser?.email || '', password: selectedUser?.password || '' });
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '', gender: 'male', branch: 'Head Office', department: 'Savings', position: 'Requestor' });
  const [resetForm, setResetForm] = useState({ email: '', password: '' });
  useEffect(() => {
    setLoginForm({ email: selectedUser?.email || '', password: selectedUser?.password || '' });
  }, [selectedUser]);
  const updateAccount = (key, value) => setAccountForm((draft) => ({ ...draft, [key]: value }));
  const updateReset = (key, value) => setResetForm((draft) => ({ ...draft, [key]: value }));
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
  const submitAccount = () => {
    const nextErrors = onCreateAccount(accountForm);
    setErrors(nextErrors);
  };
  const submitReset = () => {
    const nextErrors = onResetPassword(resetForm.email, resetForm.password);
    setErrors(nextErrors);
    if (!nextErrors.length) {
      setNotice('Password updated. You can log in with the new password.');
      setMode('login');
    }
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
        {notice && <div className="alert">{notice}</div>}
        {mode === 'login' && (
          <>
            <label>Email</label>
            <input value={loginForm.email} onChange={(event) => updateLogin('email', event.target.value)} />
            <label>Password</label>
            <PasswordInput value={loginForm.password} onChange={(value) => updateLogin('password', value)} isVisible={showLoginPassword} onToggle={() => setShowLoginPassword((isVisible) => !isVisible)} />
            <div className="login-actions-row">
              <button className="text-button" type="button" onClick={() => { setMode('forgot'); setErrors([]); setNotice(''); }}>Forgot Password?</button>
              <button className="text-button" type="button" onClick={() => { setMode('create'); setErrors([]); setNotice(''); }}>Create an Account</button>
            </div>
            <label>Demo role</label>
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>{users.map((user) => <option value={user.id} key={user.id}>{user.name} - {roles[user.role]}</option>)}</select>
            <button onClick={submitLogin}>Login</button>
          </>
        )}
        {mode === 'create' && (
          <>
            <Field label="Full Name" value={accountForm.name} onChange={(value) => updateAccount('name', value)} />
            <Field label="Email" type="email" value={accountForm.email} onChange={(value) => updateAccount('email', value)} />
            <Field label="Password" type="password" value={accountForm.password} onChange={(value) => updateAccount('password', value)} />
            <Field label="Gender" type="select" value={accountForm.gender} options={['male', 'female']} onChange={(value) => updateAccount('gender', value)} />
            <Field label="Branch" type="select" value={accountForm.branch} options={branches} onChange={(value) => updateAccount('branch', value)} />
            <Field label="Department" type="select" value={accountForm.department} options={departments} onChange={(value) => updateAccount('department', value)} />
            <button type="button" onClick={submitAccount}>Create Account</button>
            <button className="ghost" type="button" onClick={() => setMode('login')}>Back to Login</button>
          </>
        )}
        {mode === 'forgot' && (
          <>
            <Field label="Email" type="email" value={resetForm.email} onChange={(value) => updateReset('email', value)} />
            <label>New Password</label>
            <PasswordInput value={resetForm.password} onChange={(value) => updateReset('password', value)} isVisible={showResetPassword} onToggle={() => setShowResetPassword((isVisible) => !isVisible)} />
            <button type="button" onClick={submitReset}>Update Password</button>
            <button className="ghost" type="button" onClick={() => setMode('login')}>Back to Login</button>
          </>
        )}
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

function Dashboard({ currentUser, requests, processing, incidents, setPath }) {
  const [selectedMetric, setSelectedMetric] = useState('Total Requests');
  const [selectedTrendDate, setSelectedTrendDate] = useState(null);
  const [requestSearch, setRequestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const my = currentUser.role === 'admin' ? requests : requests.filter((request) => request.requestorId === currentUser.id || request.currentApprover === currentUser.id || request.assignedArchivistId === currentUser.id || ['ceo', 'dpo'].includes(currentUser.role));

  const metricDefinitions = [
    { label: 'Total Requests', filter: () => true },
    { label: 'Pending Approval', filter: (request) => request.status === 'Pending Approval' },
    { label: 'Approved Requests', filter: (request) => ['Approved', 'Forwarded to Archivist'].includes(request.status) },
    { label: 'For Archivist Processing', filter: (request) => ['Forwarded to Archivist', 'Processing'].includes(request.status) },
    { label: 'Released Documents', filter: (request) => request.status === 'Released' },
    { label: 'Overdue Physical Documents', filter: (request) => request.computedStatus === 'Overdue' },
    { label: 'Electronic Access Pending Revocation', filter: (request) => request.documentType === 'Electronic' && request.status === 'Released' && !processing[request.id]?.accessRevoked },
    { label: 'Closed Requests', filter: (request) => request.status === 'Closed' },
    { label: 'Incident Reports (Open)', filter: () => true },
  ];

  const metrics = metricDefinitions.map((metric) => ({
    ...metric,
    value: metric.label === 'Incident Reports (Open)' ? incidents.filter((incident) => incident.status === 'Open').length : my.filter(metric.filter).length,
  }));

  const activeMetric = metrics.find((metric) => metric.label === selectedMetric) || metrics[0];
  const openIncidents = incidents.filter((incident) => incident.status === 'Open');
  const detailRequests = activeMetric.label === 'Incident Reports (Open)'
    ? my.filter((request) => openIncidents.some((incident) => incident.requestId === request.id))
    : my.filter(activeMetric.filter);
  const trendDateRequests = selectedTrendDate ? my.filter((request) => request.requestDate === selectedTrendDate) : [];
  const dashboardStatuses = ['All', 'Pending Approval', 'Forwarded to Archivist', 'Processing', 'Released', 'Closed', 'Rejected'];
  const pendingCount = my.filter((request) => request.status === 'Pending Approval').length;
  const approvedCount = my.filter((request) => ['Approved', 'Forwarded to Archivist', 'Processing', 'Released', 'Closed'].includes(request.status)).length;
  const rejectedCount = my.filter((request) => request.status === 'Rejected').length;
  const trendData = buildRequestTrend(my);
  const trendMax = Math.max(1, ...trendData.map((point) => point.count));
  const trendYLabels = Array.from({ length: 6 }, (_, index) => Math.round((trendMax / 5) * (5 - index)));
  const chartLeft = 44;
  const chartRight = 354;
  const chartTop = 20;
  const chartBottom = 132;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const trendPoints = trendData.map((point, index) => {
    const x = chartLeft + (trendData.length === 1 ? 0 : (index / (trendData.length - 1)) * chartWidth);
    const y = chartBottom - (point.count / trendMax) * chartHeight;
    return { ...point, x, y };
  });
  const trendPath = trendPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const trendFillPath = `${trendPath} L${chartRight} ${chartBottom} L${chartLeft} ${chartBottom} Z`;
  const trendAxisLabels = [0, 7, 14, 21, 29].map((index) => trendData[index]).filter(Boolean);

  return (
    <section className="page dashboard-page">
      <PageTitle title="Dashboard" subtitle={`Role view for ${roles[currentUser.role]}`} />
      <div className="dashboard-reference">
        <div className="dashboard-controls">
          <label className="dashboard-search">
            <span aria-hidden="true">?</span>
            <input value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="Search by request ID or document name" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
            {dashboardStatuses.map((status) => <option value={status} key={status}>{status === 'All' ? 'Pending' : status}</option>)}
          </select>
        </div>
        <div className="dashboard-content-layout">
          <aside className="dashboard-side-panel">
            <article className="dashboard-total-card">
              <div className="card-header">
                <h3>Total Requests:</h3>
                <button type="button" className="plus-button" onClick={() => setPath('/requests/new')}>+</button>
              </div>
              <div className="dashboard-total-grid">
                <div>
                  <span>Pending:</span>
                  <strong>{pendingCount}</strong>
                  <button type="button" onClick={() => setStatusFilter('Pending Approval')}>Pending:</button>
                </div>
                <div>
                  <span>Approved:</span>
                  <strong>{approvedCount}</strong>
                  <div className="dashboard-pill-row">
                    <button type="button" onClick={() => setStatusFilter('Approved')}>Approved:</button>
                    <button type="button" className="rejected-pill" onClick={() => setStatusFilter('Rejected')}>Rejected: {rejectedCount}</button>
                  </div>
                </div>
              </div>
            </article>
            <article className="dashboard-trend-card">
              <div className="card-header">
                <h3>Request Trends (Last 30 Days)</h3>
                <span aria-hidden="true">v</span>
              </div>
              <svg viewBox="0 0 370 175" role="img" aria-label="Request trends line chart">
                {trendYLabels.map((label, index) => (
                  <g key={`${label}-${index}`}>
                    <text className="trend-y-label" x="22" y={24 + index * 22}>{label}</text>
                    <line x1="44" x2="354" y1={20 + index * 22} y2={20 + index * 22} />
                  </g>
                ))}
                <path className="trend-fill" d={trendFillPath} />
                <path className="trend-line" d={trendPath} />
                {trendPoints.filter((point) => point.count > 0).map((point) => (
                  <circle
                    className={`trend-point ${selectedTrendDate === point.date ? 'selected' : ''}`}
                    key={point.date}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    role="button"
                    tabIndex="0"
                    aria-label={`Show ${point.count} request${point.count === 1 ? '' : 's'} created on ${point.date}`}
                    onClick={() => setSelectedTrendDate(point.date)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedTrendDate(point.date);
                      }
                    }}
                  >
                    <title>{point.date}: {point.count} request{point.count === 1 ? '' : 's'}</title>
                  </circle>
                ))}
                {trendAxisLabels.map((point) => (
                  <text className="trend-x-label" key={point.date} x={point.x} y="164">{formatDateTick(point.date)}</text>
                ))}
              </svg>
            </article>
          </aside>
          <div className="dashboard-main-metrics">
            <div className="metric-grid">
              {metrics.map(({ label, value }) => (
                <button type="button" className={`metric ${selectedMetric === label && !selectedTrendDate ? 'active' : ''}`} key={label} onClick={() => { setSelectedMetric(label); setSelectedTrendDate(null); }}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <article className="info-card metric-detail-card">
        <div className="card-header">
          <h3>{selectedTrendDate ? `Graph Results for ${selectedTrendDate}` : activeMetric.label}</h3>
          <span className="helper-text">{selectedTrendDate ? trendDateRequests.length : detailRequests.length} item{(selectedTrendDate ? trendDateRequests.length : detailRequests.length) === 1 ? '' : 's'}</span>
        </div>
        {selectedTrendDate ? (
          <RequestTable requests={trendDateRequests} setPath={setPath} />
        ) : activeMetric.label === 'Incident Reports (Open)' ? (
          openIncidents.length ? (
            <div className="stacked-list">
              {openIncidents.map((incident) => {
                const incidentRequest = requests.find((request) => request.id === incident.requestId);
                return (
                <button type="button" className="list-item result-item" key={incident.id} onClick={() => setPath(`/requests/${incident.requestId}`)}>
                  <span>{incidentRequest?.requestNo || 'Request'} - {incident.incidentType}</span>
                  <span className="helper-text">{incident.incidentDescription}</span>
                </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">No open incident reports.</div>
          )
        ) : (
          <RequestTable title={`${activeMetric.label} Results`} requests={detailRequests.slice(0, 10)} setPath={setPath} />
        )}
      </article>
      <RequestTable title="Recent Requests" requests={my.slice(0, 5)} setPath={setPath} />
    </section>
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

function NewRequest({ currentUser, submitRequest, editingRequestId, setEditingRequestId }) {
  const initialForm = useMemo(() => ({ documentTitle: '', referenceNo: '', documentType: 'Physical', confidentialityLevel: 'Normal', purpose: '', dateNeeded: today(), borrowReturnDueDate: today(), remarks: '', branch: currentUser.branch, department: currentUser.department, agreementAccepted: false }), [currentUser.branch, currentUser.department]);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState([]);
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const canSubmit = form.documentTitle && form.documentType && form.purpose && form.dateNeeded && form.borrowReturnDueDate && form.confidentialityLevel && form.agreementAccepted;

  React.useEffect(() => {
    if (!editingRequestId) {
      setForm(initialForm);
      return;
    }
  }, [editingRequestId, initialForm]);

  const save = () => {
    const result = submitRequest(form, editingRequestId);
    setErrors(result || []);
  };

  return <section className="page"><PageTitle title={editingRequestId ? 'Respond / Edit Request' : 'New Document Retrieval Request'} subtitle="Confidential files are reviewed by the Data Privacy Officer before release." />{errors.length > 0 && <AlertList items={errors} />}<div className="alert">Reminder: borrowed files or documents must be brought back, returned to Records, or have access revoked on or before the approved return due date.</div><div className="form-grid"><Field label="Request Date" type="date" value={today()} readOnly /><Field label="Requestor" value={currentUser.name} readOnly /><Field label="Department" value={form.department} onChange={(v) => update('department', v)} readOnly={currentUser.role !== 'admin'} /><Field label="Branch" type="select" value={form.branch} options={branches} onChange={(v) => update('branch', v)} /><Field label="Position" value={currentUser.position} readOnly /><Field label="Document Title / File Name" value={form.documentTitle} onChange={(v) => update('documentTitle', v)} /><Field label="Document Reference No." value={form.referenceNo} onChange={(v) => update('referenceNo', v)} /><Field label="Document Type" type="select" value={form.documentType} options={['Physical', 'Electronic']} onChange={(v) => update('documentType', v)} /><Field label="Confidentiality Level" type="select" value={form.confidentialityLevel} options={['Normal', 'Confidential', 'Highly Sensitive']} onChange={(v) => update('confidentialityLevel', v)} /><Field className="wide" label="Purpose of Retrieval" type="textarea" value={form.purpose} onChange={(v) => update('purpose', v)} /><Field label="Date Needed" type="date" value={form.dateNeeded} onChange={(v) => update('dateNeeded', v)} /><Field label="Return Due Date" type="date" value={form.borrowReturnDueDate} onChange={(v) => update('borrowReturnDueDate', v)} /><Field className="wide" label="Remarks" type="textarea" value={form.remarks} onChange={(v) => update('remarks', v)} /></div><label className="agreement"><input type="checkbox" checked={form.agreementAccepted} onChange={(e) => update('agreementAccepted', e.target.checked)} /> I certify that the requested document will be used strictly for the approved purpose only and brought back, returned, deleted, or access-revoked on or before the approved return due date. I understand that unauthorized use, reproduction, distribution, failure to return physical documents, or failure to delete/revoke electronic copies may be subject to disciplinary action.</label><div className="actions"><button disabled={!canSubmit} onClick={save}>Save Request</button>{editingRequestId && <button className="ghost" type="button" onClick={() => { setEditingRequestId(null); }}>Cancel Edit</button>}</div></section>;
}

function AlertList({ items }) {
  return <div className="alert error-list">{items.map((item) => <div key={item}>{item}</div>)}</div>;
}
function Field({ label, value, onChange, type = 'text', options = [], readOnly = false, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{type === 'textarea' ? <textarea value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} /> : type === 'select' ? <select value={value} disabled={readOnly} onChange={(e) => onChange?.(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input type={type} value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />}</label>;
}

function RequestList({ title, requests, setPath, allowManage = false, onEditRequest, onWithdrawRequest, onDeleteRequest }) {
  return <section className="page"><PageTitle title={title} subtitle="Track request status, routing, processing, and closure." /><RequestTable requests={requests} setPath={setPath} showActions={allowManage} onEditRequest={onEditRequest} onWithdrawRequest={onWithdrawRequest} onDeleteRequest={onDeleteRequest} /></section>;
}

function RequestTable({ title, requests, setPath, showActions = false, onEditRequest, onWithdrawRequest, onDeleteRequest }) {
  return <div className="table-card">{title && <h3>{title}</h3>}<table><thead><tr><th>Request No.</th><th>Document</th><th>Type</th><th>Confidentiality</th><th>Status</th><th>Date Needed</th><th>Return Due Date</th>{showActions && <th>Actions</th>}</tr></thead><tbody>{requests.length ? requests.map((request) => <tr key={request.id} onClick={() => setPath?.(`/requests/${request.id}`)}><td>{request.requestNo}</td><td>{request.documentTitle}</td><td>{request.documentType}</td><td>{request.confidentialityLevel}</td><td><span data-variant={getStatusBadgeVariant(request.computedStatus || request.status)} className={statusClass(request.computedStatus || request.status)}>{request.computedStatus || request.status}</span></td><td>{request.dateNeeded}</td><td>{request.borrowReturnDueDate || '-'}</td>{showActions && <td className="actions-cell" onClick={(event) => event.stopPropagation()}><button className="secondary small" type="button" onClick={() => onEditRequest?.(request)}>Edit</button>{['Draft', 'Needs Clarification', 'Pending Approval'].includes(request.status) && <button className="ghost small" type="button" onClick={() => onWithdrawRequest?.(request.id)}>Return to Draft</button>}<button className="danger small" type="button" onClick={() => onDeleteRequest?.(request.id)}>Delete</button></td>}</tr>) : <tr><td colSpan={showActions ? 8 : 7} className="empty">No records found.</td></tr>}</tbody></table></div>;
}
function RequestDetails({ request, users, processing, closures, incidents, auditLogs, currentUser, setPath }) {
  if (!request) return <Empty message="Request not found." />;
  const approver = users.find((user) => user.id === request.currentApprover);
  const requestProcessing = processing[request.id] || {};
  const closure = closures[request.id] || {};
  const requestIncidents = incidents.filter((incident) => incident.requestId === request.id);
  const approvalLogs = auditLogs.filter((log) => log.requestId === request.id && /approved|rejected|clarification|forwarded/i.test(log.action));
  const processingItems = Object.entries(requestProcessing).map(([key, value]) => {
    if (key === 'electronicReleaseReference' && !canViewReleaseReferences(currentUser, request)) return [key, 'Restricted'];
    return [key, value];
  });

  return <section className="page"><PageTitle title={request.requestNo} subtitle={request.documentTitle} /><div className="detail-grid"><InfoCard title="Request Information" items={[['Requestor', request.requestorName], ['Branch', request.branch], ['Department', request.department], ['Document Type', request.documentType], ['Confidentiality', request.confidentialityLevel], ['Purpose', request.purpose], ['Date Needed', request.dateNeeded], ['Return Due Date', request.borrowReturnDueDate], ['Current Approver', approver?.name || 'Not assigned'], ['Status', request.computedStatus || request.status]]} /><InfoCard title="Approval History" items={approvalLogs.length ? approvalLogs.map((log) => [log.createdAt, `${log.action}: ${log.remarks || log.newStatus}`]) : [['Status', 'No approval history yet']]} /><InfoCard title="Archivist Processing / Release" items={processingItems.length ? processingItems : [['Status', 'No processing record yet']]} /><InfoCard title="Return / Closure" items={Object.entries(closure).length ? Object.entries(closure) : [['Status', 'Not closed']]} /><InfoCard title="Incident Reports" items={requestIncidents.length ? requestIncidents.map((incident) => [incident.incidentType, incident.status]) : [['Status', 'No incidents']]} /></div><div className="actions"><button onClick={() => setPath(`/requests/${request.id}/closure`)}>Return / Closure</button><button className="secondary" onClick={() => setPath(`/archivist/${request.id}/process`)}>Archivist Processing</button><button className="ghost" onClick={() => setPath('/incidents/new')}>Create Incident</button></div><AuditTrailTable logs={auditLogs.filter((log) => log.requestId === request.id)} users={users} setPath={setPath} /></section>;
}
function InfoCard({ title, items }) {
  return <article className="info-card"><h3>{title}</h3>{items.map(([key, value]) => <p key={key}><span>{humanize(key)}</span><strong>{String(value || '-')}</strong></p>)}</article>;
}

function humanize(value) {
  return String(value).replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}

function ApprovalQueue({ currentUser, requests, updateRequestStatus, users, setPath }) {
  const queue = currentUser.role === 'admin' ? requests.filter((request) => request.status === 'Pending Approval') : requests.filter((request) => request.currentApprover === currentUser.id && request.status === 'Pending Approval');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState([]);
  const archivist = users.find((user) => user.role === 'archivist');
  const sacdHead = users.find((user) => user.role === 'sacd_head');
  const requireRemarks = (action) => {
    if (!remarks.trim()) {
      setErrors([`${action} remarks are required.`]);
      return false;
    }
    setErrors([]);
    return true;
  };
  const approve = (request) => {
    if (currentUser.role === 'branch_head' && request.branch !== 'Head Office') {
      updateRequestStatus(request.id, 'Pending Approval', 'Branch Head endorsed to SACD Head', remarks || 'Endorsed for SACD Head approval', { currentApprover: sacdHead?.id || '', branchHeadRequestedBy: currentUser.id, branchHeadRequestedAt: new Date().toLocaleString() });
      setRemarks('');
      return;
    }
    updateRequestStatus(request.id, 'Forwarded to Archivist', 'Approved and forwarded', remarks || 'Approved', { currentApprover: '', assignedArchivistId: archivist?.id, approvedBy: currentUser.id, approvedAt: new Date().toLocaleString(), forwardedToArchivistAt: new Date().toLocaleString() });
    setRemarks('');
  };
  const reject = (request) => {
    if (!requireRemarks('Rejection')) return;
    updateRequestStatus(request.id, 'Rejected', 'Rejected request', remarks, { rejectedBy: currentUser.id, rejectedAt: new Date().toLocaleString(), rejectionReason: remarks });
    setRemarks('');
  };
  const clarify = (request) => {
    if (!requireRemarks('Clarification')) return;
    updateRequestStatus(request.id, 'Needs Clarification', 'Requested clarification', remarks, { clarificationRemarks: remarks });
    setRemarks('');
  };
  return <section className="page"><PageTitle title="Approval Queue" subtitle="Confidential files require Data Privacy Officer approval before release." />{errors.length > 0 && <AlertList items={errors} />}<textarea className="remarks-box" placeholder="Remarks required for rejection or clarification" value={remarks} onChange={(e) => setRemarks(e.target.value)} /><div className="queue-list">{queue.map((request) => <article className="queue-card" key={request.id} onClick={() => setPath(`/requests/${request.id}`)}><div><h3>{request.documentTitle}</h3><p>{request.requestNo} by {request.requestorName}</p><p>Reminder: bring back or revoke access by {request.borrowReturnDueDate || 'the approved due date'}.</p><span className={statusClass(request.status)}>{request.status}</span></div><div className="actions" onClick={(event) => event.stopPropagation()}><button onClick={() => approve(request)}>{currentUser.role === 'branch_head' && request.branch !== 'Head Office' ? 'Endorse to SACD' : 'Approve'}</button><button className="danger" onClick={() => reject(request)}>Reject</button><button className="secondary" onClick={() => clarify(request)}>Clarify</button></div></article>)}{!queue.length && <Empty message="No approval items." />}</div></section>;
}
function ArchivistQueue({ requests, setPath }) {
  const queue = requests.filter((request) => ['Approved', 'Forwarded to Archivist', 'Processing'].includes(request.status));
  return <section className="page"><PageTitle title="Archivist Queue" subtitle="Retrieve, prepare, release, and monitor approved requests." /><div className="queue-list">{queue.map((request) => <article className="queue-card" key={request.id}><div><h3>{request.documentTitle}</h3><p>{request.requestNo} - {request.documentType}</p><span className={statusClass(request.status)}>{request.status}</span></div><button onClick={() => setPath(`/archivist/${request.id}/process`)}>Process</button></article>)}{!queue.length && <Empty message="No requests waiting for processing." />}</div></section>;
}

function ArchivistProcess({ request, currentUser, processing, setProcessing, updateRequestStatus, setPath }) {
  const [form, setForm] = useState(processing[request?.id] || { dateReceived: today(), dateReleased: today(), borrowerName: request?.requestorName || '', expectedReturnDate: request?.borrowReturnDueDate || today(), physicalConditionBeforeRelease: 'Good Condition', storageLocation: '', electronicReleaseMethod: 'Email', electronicReleaseReference: '', accessExpiryDate: request?.borrowReturnDueDate || today(), deletionConfirmationRequired: false, releaseRemarks: '' });
  const [errors, setErrors] = useState([]);
  if (!request) return <Empty message="Request not found." />;
  const update = (key, value) => setForm((draft) => ({ ...draft, [key]: value }));
  const validateRelease = () => {
    const nextErrors = [];
    if (request.documentType === 'Physical') {
      if (!form.borrowerName?.trim()) nextErrors.push('Name of borrower is required.');
      if (!form.dateReleased) nextErrors.push('Date released is required.');
      if (!form.expectedReturnDate) nextErrors.push('Expected date of return is required.');
      if (!form.physicalConditionBeforeRelease) nextErrors.push('Condition before release is required.');
    } else {
      if (!form.electronicReleaseMethod) nextErrors.push('Electronic release method is required.');
      if (form.electronicReleaseMethod !== 'Other' && !form.electronicReleaseReference?.trim()) nextErrors.push('Release reference or shared link is required.');
      if (request.confidentialityLevel !== 'Normal' && !form.accessExpiryDate) nextErrors.push('Access expiry date is required for confidential records.');
    }
    setErrors(nextErrors);
    return nextErrors.length === 0;
  };
  const startProcessing = () => {
    setProcessing((records) => ({ ...records, [request.id]: { ...form, archivistId: currentUser.id } }));
    updateRequestStatus(request.id, 'Processing', 'Started archivist processing', 'Retrieval is being prepared.', { assignedArchivistId: currentUser.id });
    setPath('/archivist');
  };
  const release = () => {
    if (!validateRelease()) return;
    setProcessing((records) => ({ ...records, [request.id]: { ...form, archivistId: currentUser.id } }));
    updateRequestStatus(request.id, 'Released', 'Released document', form.releaseRemarks, { assignedArchivistId: currentUser.id });
    setPath('/archivist');
  };
  return <section className="page"><PageTitle title="Archivist Processing" subtitle={`${request.requestNo} - ${request.documentType}`} />{errors.length > 0 && <AlertList items={errors} />}<div className="toolbar-row"><span className="helper-text">Approved return/access deadline: {request.borrowReturnDueDate || 'Not set'}. Turnaround guide: active files same day; archived physical files 1 to 2 working days.</span>{request.status !== 'Processing' && <button className="secondary" type="button" onClick={startProcessing}>Start Processing</button>}</div><div className="form-grid">{request.documentType === 'Physical' ? <><Field label="Name of Archivist" value={currentUser.name} readOnly /><Field label="Name of Borrower" value={form.borrowerName} onChange={(v) => update('borrowerName', v)} /><Field label="Date Received" type="date" value={form.dateReceived} onChange={(v) => update('dateReceived', v)} /><Field label="Date Released" type="date" value={form.dateReleased} onChange={(v) => update('dateReleased', v)} /><Field label="Expected Date of Return" type="date" value={form.expectedReturnDate} onChange={(v) => update('expectedReturnDate', v)} /><Field label="Condition Before Release" type="select" value={form.physicalConditionBeforeRelease} options={['Good Condition', 'With Existing Damage', 'With Missing Pages', 'With Markings', 'Other']} onChange={(v) => update('physicalConditionBeforeRelease', v)} /><Field label="Storage Location" value={form.storageLocation} onChange={(v) => update('storageLocation', v)} /></> : <><Field label="File Released Via" type="select" value={form.electronicReleaseMethod} options={['Email', 'Shared Drive', 'Shared Link', 'Cloud Platform', 'Other']} onChange={(v) => update('electronicReleaseMethod', v)} /><Field label="Release Reference / Shared Link" value={form.electronicReleaseReference} onChange={(v) => update('electronicReleaseReference', v)} /><Field label="Access Expiry Date" type="date" value={form.accessExpiryDate} onChange={(v) => update('accessExpiryDate', v)} /><label className="agreement"><input type="checkbox" checked={form.deletionConfirmationRequired} onChange={(e) => update('deletionConfirmationRequired', e.target.checked)} /> Deletion confirmation required</label></>}<Field className="wide" label="Release Remarks" type="textarea" value={form.releaseRemarks} onChange={(v) => update('releaseRemarks', v)} /></div><button onClick={release}>Save and Mark Released</button></section>;
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
      <div className="filters"><Field label="Branch" type="select" value={filter.branch} options={['All', ...branches]} onChange={(v) => setFilter({ ...filter, branch: v })} /><Field label="Department" type="select" value={filter.department} options={['All', ...departments]} onChange={(v) => setFilter({ ...filter, department: v })} /><Field label="Date From" type="date" value={filter.dateFrom} onChange={(v) => setFilter({ ...filter, dateFrom: v })} /><Field label="Date To" type="date" value={filter.dateTo} onChange={(v) => setFilter({ ...filter, dateTo: v })} /><Field label="Status" type="select" value={filter.status} options={['All', ...statuses]} onChange={(v) => setFilter({ ...filter, status: v })} /><Field label="Document Type" type="select" value={filter.documentType} options={['All', 'Physical', 'Electronic']} onChange={(v) => setFilter({ ...filter, documentType: v })} /><Field label="Confidentiality" type="select" value={filter.confidentialityLevel} options={['All', 'Normal', 'Confidential', 'Highly Sensitive']} onChange={(v) => setFilter({ ...filter, confidentialityLevel: v })} /><label className="field"><span>Requestor</span><select value={filter.requestorId} onChange={(event) => setFilter({ ...filter, requestorId: event.target.value })}><option value="All">All</option>{users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label className="field"><span>Archivist</span><select value={filter.archivistId} onChange={(event) => setFilter({ ...filter, archivistId: event.target.value })}><option value="All">All</option>{users.filter((user) => user.role === 'archivist').map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label></div>
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

function Users({ users }) {
  const [userList, setUserList] = useState(users);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const startEdit = (user) => {
    setEditingId(user.id);
    setDraft(user);
  };

  const saveEdit = () => {
    setUserList((items) => items.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
    setEditingId(null);
    setDraft({});
  };

  const deleteUser = (id) => {
    setUserList((items) => items.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft({});
    }
  };

  return (
    <section className="page">
      <PageTitle title="User Management" subtitle="Admin view of users, roles, branches, departments, and active status." />
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Gender</th>
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
                      <img className="avatar-image" src={getAvatarUrl(isEditing ? draft.name : user.name, isEditing ? draft.gender : user.gender)} alt={user.name} />
                      <div>
                        {isEditing ? <input value={draft.name || ''} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /> : <strong>{user.name}</strong>}
                        {!isEditing && <div className="user-meta">{user.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{isEditing ? <input value={draft.email || ''} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /> : user.email}</td>
                  <td>{isEditing ? <select value={draft.gender || 'male'} onChange={(event) => setDraft((current) => ({ ...current, gender: event.target.value }))}><option value="female">Girl</option><option value="male">Boy</option></select> : user.gender === 'female' ? 'Girl' : 'Boy'}</td>
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
                        <button className="danger" type="button" onClick={() => deleteUser(user.id)}>Delete</button>
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
      'Review and Approval: The request is routed to designated approvers depending on the user role, including Branch Heads for branch staff, Department Heads for head office staff, and the Data Privacy Officer or CEO for confidential records.',
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
    status: 'Approved / Needs Clarification / Rejected',
    description: 'Staff requests route to Branch Heads, Branch Head requests to SACD, Head Office requests to Department Heads, and sensitive records to the DPO or CEO.',
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
  const [branchesList, setBranchesList] = useState(branches);
  const [departmentsList, setDepartmentsList] = useState(departments);
  const [categoriesList, setCategoriesList] = useState(['Member Records', 'Finance Records', 'HR Records', 'Board Records']);
  const [editingItem, setEditingItem] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [notice, setNotice] = useState('');
  const [addingSection, setAddingSection] = useState(null);
  const [newItemValue, setNewItemValue] = useState('');

  const startEdit = (section, index, value) => {
    setEditingItem({ section, index });
    setDraftValue(value);
    setNotice('');
  };

  const saveEdit = () => {
    const value = draftValue.trim();
    if (!editingItem || !value) return;
    if (editingItem.section === 'branches') {
      setBranchesList((items) => items.map((item, index) => (index === editingItem.index ? value : item)));
    }
    if (editingItem.section === 'departments') {
      setDepartmentsList((items) => items.map((item, index) => (index === editingItem.index ? value : item)));
    }
    if (editingItem.section === 'categories') {
      setCategoriesList((items) => items.map((item, index) => (index === editingItem.index ? value : item)));
    }
    setEditingItem(null);
    setDraftValue('');
    setNotice('Changes saved');
  };

  const deleteItem = (section, index) => {
    if (section === 'branches') setBranchesList((items) => items.filter((_, itemIndex) => itemIndex !== index));
    if (section === 'departments') setDepartmentsList((items) => items.filter((_, itemIndex) => itemIndex !== index));
    if (section === 'categories') setCategoriesList((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setNotice('Item removed');
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
    setNotice('New item added');
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
        <button className="secondary" type="button" onClick={() => { setEditingItem(null); setDraftValue(''); setNotice('Changes saved'); }}>Save Changes</button>
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
