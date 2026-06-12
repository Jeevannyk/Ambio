import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

beforeEach(() => localStorage.clear());

test('renders the heading and empty state', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /todo list/i })).toBeInTheDocument();
  expect(screen.getByText(/no tasks to show/i)).toBeInTheDocument();
});

test('adds a task and ignores whitespace-only input', () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/enter a task/i);
  const add = screen.getByRole('button', { name: /add/i });

  fireEvent.change(input, { target: { value: 'Buy milk' } });
  fireEvent.click(add);
  expect(screen.getByText('Buy milk')).toBeInTheDocument();

  fireEvent.change(input, { target: { value: '   ' } });
  fireEvent.click(add);
  // Still exactly one task — whitespace was rejected.
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('toggles a task complete and updates the counter', () => {
  render(<App />);
  fireEvent.change(screen.getByPlaceholderText(/enter a task/i), {
    target: { value: 'Write report' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add/i }));

  const item = screen.getByRole('listitem');
  fireEvent.click(within(item).getByRole('checkbox'));
  expect(within(item).getByRole('checkbox')).toBeChecked();
  expect(screen.getByText(/0 of 1 left/i)).toBeInTheDocument();
});
