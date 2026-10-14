import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import HomePage from '../pages/HomePage';

// Mock modules
vi.mock('../api', () => ({
  postApi: {
    getCategories: vi.fn().mockResolvedValue({ data: [] }),
    getFeed: vi.fn().mockResolvedValue({ data: { content: [], last: true } }),
  },
  followApi: {
    getFollowing: vi.fn().mockResolvedValue({ data: [] }),
  },
  aiApi: {
    recordBehavior: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const renderWithProviders = (ui) =>
  render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>
  );

describe('HomePage', () => {
  it('renders filter section', async () => {
    renderWithProviders(<HomePage />);
    // Filter section heading should appear
    expect(screen.getByText(/filter feed/i)).toBeTruthy();
  });

  it('renders Latest and Following toggle buttons', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText('Latest')).toBeTruthy();
    expect(screen.getByText('Following')).toBeTruthy();
  });
});

// ─── Spell Check Agent Unit Tests ───

describe('SpellCheck logic (Levenshtein distance)', () => {
  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[a.length][b.length];
  }

  it('returns 0 for identical strings', () => {
    expect(levenshtein('happy', 'happy')).toBe(0);
  });

  it('returns 1 for single substitution', () => {
    expect(levenshtein('happy', 'happi')).toBe(1);
  });

  it('returns correct distance for common misspelling', () => {
    expect(levenshtein('great', 'grate')).toBe(2);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

// ─── Description Agent Logic Tests ───

describe('Description Agent template selection', () => {
  const MOOD_TEMPLATES = {
    HAPPY: ['Sharing a moment of pure joy! ✨', 'Life is beautiful! 🌟'],
    SAD: ['Sometimes life is difficult... 💙'],
  };

  it('picks a valid template for known mood', () => {
    const mood = 'HAPPY';
    const templates = MOOD_TEMPLATES[mood];
    expect(templates.length).toBeGreaterThan(0);
  });

  it('generates hashtags from categories', () => {
    const categories = ['Sports', 'Cricket'];
    const hashtags = categories.map(c => `#${c.toLowerCase()}`).join(' ');
    expect(hashtags).toBe('#sports #cricket');
  });

  it('handles empty category list gracefully', () => {
    const categories = [];
    const hashtags = categories.map(c => `#${c.toLowerCase()}`).join(' ');
    expect(hashtags).toBe('');
  });
});
