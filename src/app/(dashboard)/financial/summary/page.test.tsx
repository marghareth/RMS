// FILE: src/app/(dashboard)/financial/summary/page.test.tsx
//
// Regression test: the page used to request limit=500 (the API allows 100),
// got a 400, and showed ₱0.00 / "No transactions" for a year full of records.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import FinancialSummaryPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

const year = new Date().getFullYear();

describe('Financial Summary page', () => {
  it('asks the API for the year summary and shows its totals and months', async () => {
    const fetchMock = mockFetch({
      year, income: 4437950, expense: 3444100, balance: 993850, count: 225, years: [year, year - 1],
      months: [
        { key: `${year}-10`, label: `October ${year}`, income: 420000, expense: 280000 },
        { key: `${year}-09`, label: `September ${year}`, income: 415000, expense: 390000 },
      ],
    });
    render(<FinancialSummaryPage />);

    expect((await screen.findAllByText(`October ${year}`)).length).toBe(2); // chart + table
    expect(screen.getAllByText(/4,437,950\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/993,850\.00/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No transactions recorded/)).not.toBeInTheDocument();

    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('view=summary');
    expect(url).not.toContain('limit=');
    expect(screen.getByRole('option', { name: String(year - 1) })).toBeInTheDocument();
  });

  it('shows the reason instead of ₱0.00 when the request fails', async () => {
    mockFetch({ error: 'Forbidden' }, 403);
    render(<FinancialSummaryPage />);
    expect(await screen.findByText(`Couldn't load the summary for ${year}`)).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.queryByText(/No transactions recorded/)).not.toBeInTheDocument();
  });
});