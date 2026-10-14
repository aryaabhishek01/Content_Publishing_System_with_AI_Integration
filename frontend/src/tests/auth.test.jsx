import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock API
vi.mock('../api', () => ({
  authApi: {
    register: vi.fn(),
    verifyOtp: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const renderWithProviders = (ui) =>
  render(<AuthProvider><MemoryRouter>{ui}</MemoryRouter></AuthProvider>);

// ─────────────────────────────────────────────────────────────
// VALIDATION TESTS
// ─────────────────────────────────────────────────────────────

describe('Registration Validation', () => {
  beforeEach(() => {
    renderWithProviders(<RegisterPage />);
  });

  it('renders registration form', () => {
    expect(screen.getByPlaceholderText('Full Name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Gmail Address')).toBeTruthy();
  });

  it('shows error for name with numbers', async () => {
    const nameInput = screen.getByPlaceholderText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'John123' } });
    fireEvent.blur(nameInput);
    await waitFor(() => {
      expect(screen.getByText(/Name must contain only/i)).toBeTruthy();
    });
  });

  it('shows error for invalid username (less than 4 chars)', async () => {
    const input = screen.getByPlaceholderText('Username');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText(/Username must start with/i)).toBeTruthy();
    });
  });

  it('shows error for email without 3 chars before @gmail.com', async () => {
    const input = screen.getByPlaceholderText('Gmail Address');
    fireEvent.change(input, { target: { value: 'ab@gmail.com' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText(/Must be a valid @gmail\.com/i)).toBeTruthy();
    });
  });

  it('accepts valid email', async () => {
    const input = screen.getByPlaceholderText('Gmail Address');
    fireEvent.change(input, { target: { value: 'john@gmail.com' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.queryByText(/Must be a valid @gmail\.com/i)).toBeNull();
    });
  });

  it('shows error for password under 8 chars', async () => {
    const input = screen.getByPlaceholderText('Password');
    fireEvent.change(input, { target: { value: 'short' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByText(/Password must be at least/i)).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────
// LOGIN TESTS
// ─────────────────────────────────────────────────────────────

describe('Login Page', () => {
  beforeEach(() => {
    renderWithProviders(<LoginPage />);
  });

  it('renders login form', () => {
    expect(screen.getByPlaceholderText(/username or email/i)).toBeTruthy();
    expect(screen.getByPlaceholderText('Your password')).toBeTruthy();
  });

  it('has forgot password link', () => {
    expect(screen.getByText(/forgot password/i)).toBeTruthy();
  });

  it('switches to forgot password mode', async () => {
    const forgotBtn = screen.getByText(/forgot password/i);
    await userEvent.click(forgotBtn);
    await waitFor(() => {
      expect(screen.getByText(/receive an otp/i)).toBeTruthy();
    });
  });

  it('shows sign-in button', () => {
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// USERNAME VALIDATION UNIT TESTS
// ─────────────────────────────────────────────────────────────

describe('Username validation rules', () => {
  const validateUsername = (v) => /^[A-Za-z]{4,}[^\s]*$/.test(v);

  it('rejects username with fewer than 4 letters', () => {
    expect(validateUsername('abc')).toBe(false);
    expect(validateUsername('ab1')).toBe(false);
  });

  it('rejects username with spaces', () => {
    expect(validateUsername('john doe')).toBe(false);
    expect(validateUsername('john  doe')).toBe(false);
  });

  it('accepts valid username', () => {
    expect(validateUsername('john')).toBe(true);
    expect(validateUsername('johndoe123')).toBe(true);
    expect(validateUsername('user_name')).toBe(true);
  });
});

describe('Email validation rules', () => {
  const validateEmail = (v) => /^[A-Za-z0-9._%+\-]{3,}@gmail\.com$/.test(v);

  it('rejects email with < 3 chars before @gmail.com', () => {
    expect(validateEmail('ab@gmail.com')).toBe(false);
    expect(validateEmail('a@gmail.com')).toBe(false);
  });

  it('rejects non-gmail domains', () => {
    expect(validateEmail('john@yahoo.com')).toBe(false);
    expect(validateEmail('john@outlook.com')).toBe(false);
  });

  it('accepts valid gmail', () => {
    expect(validateEmail('john@gmail.com')).toBe(true);
    expect(validateEmail('john.doe@gmail.com')).toBe(true);
  });
});

describe('Name validation rules', () => {
  const validateName = (v) => /^[A-Za-z][A-Za-z ]*$/.test(v);

  it('rejects name with numbers', () => {
    expect(validateName('John123')).toBe(false);
    expect(validateName('123john')).toBe(false);
  });

  it('accepts name with only alphabets and spaces', () => {
    expect(validateName('John')).toBe(true);
    expect(validateName('John Doe')).toBe(true);
    expect(validateName('Mary Jane Watson')).toBe(true);
  });
});
