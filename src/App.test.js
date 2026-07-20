import { act } from 'react';
import { render, screen } from '@testing-library/react';
import App, { getAvatarUrl } from './App';

describe('avatar selection', () => {
  test('generates inline SVG avatars for female and male users', () => {
    expect(getAvatarUrl('Mara Dela Cruz', 'female')).toContain('data:image/svg+xml');
    expect(decodeURIComponent(getAvatarUrl('Mara Dela Cruz', 'female'))).toContain('#f7b7d8');
    expect(decodeURIComponent(getAvatarUrl('Ramon Salazar', 'male'))).toContain('#8bd3ff');
  });
});

describe('settings policy content', () => {
  test('renders the document retrieval policy reference in settings', async () => {
    render(<App />);
    act(() => {
      window.__setAppPath('/settings');
    });
    expect(await screen.findByText(/Document Retrieval Policy Reference/i)).toBeInTheDocument();
    expect(screen.getByText(/Definitions/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidential Document/i)).toBeInTheDocument();
  });
});
