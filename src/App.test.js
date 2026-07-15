import { act } from 'react';
import { render, screen } from '@testing-library/react';
import App, { getAvatarUrl } from './App';

describe('avatar selection', () => {
  test('uses Zhao Lusi for female users and Chen Zeyuan for male users', () => {
    expect(getAvatarUrl('Mara Dela Cruz', 'female')).toContain('Zhao_Lusi');
    expect(getAvatarUrl('Ramon Salazar', 'male')).toContain('Chen_Zheyuan');
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
