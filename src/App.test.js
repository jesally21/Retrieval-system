import { act } from 'react';
import { render, screen } from '@testing-library/react';
import App, { getAvatarUrl } from './App';

describe('avatar selection', () => {
  test('generates inline SVG avatars for users', () => {
    const avatar = getAvatarUrl('Mara Dela Cruz');
    expect(avatar).toContain('data:image/svg+xml');
    expect(decodeURIComponent(avatar)).toContain('<svg');
  });
});

describe('settings policy content', () => {
  test('renders the document retrieval policy reference in settings', async () => {
    window.__TEST_SESSION_PROFILE__ = {
      id: 'test-superadmin',
      email: 'superadmin@example.com',
      name: 'Test Super Admin',
      role: 'superadmin',
      branch: 'Head Office',
      department: 'ICT',
      position: 'Administrator',
      avatar: '',
      avatarCustom: false,
    };
    render(<App />);
    act(() => {
      window.__setAppPath('/settings');
    });
    const policyToggle = await screen.findByRole('button', { name: /Document Retrieval Policy Reference/i });
    expect(policyToggle).toBeInTheDocument();
    act(() => {
      policyToggle.click();
    });
    expect(screen.getByText(/Definitions/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidential Document/i)).toBeInTheDocument();
    delete window.__TEST_SESSION_PROFILE__;
  });
});
