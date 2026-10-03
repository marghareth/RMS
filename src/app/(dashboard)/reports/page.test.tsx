// FILE: src/app/(dashboard)/reports/page.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent, cleanup } from '@testing-library/react';
import ReportsPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Charts need real layout sizes that jsdom doesn't have; the page logic is
// what's under test, not recharts.
vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  const Nothing = () => null;
  return {
    BarChart: Pass, ResponsiveContainer: Pass, PieChart: Pass, Pie: Pass,
    Bar: Nothing, XAxis: Nothing, YAxis: Nothing, Tooltip: Nothing, Cell: Nothing,
  };
});

type Handler = () => Response;
const json = (body: unknown, status = 200, extra: Record<string, unknown> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    redirected: false,
    url: 'http://localhost/api/x',
    json: async () => body,
    ...extra,
  }) as unknown as Response;

const HEALTHY: Record<string, Handler> = {
  '/api/dashboard': () => json({ totalResidents: 22, activeCases: 3, residentsByPurok: [{ purok_id: 1, _count: 12 }, { purok_id: 2, _count: 10 }] }),
  '/api/puroks': () => json([{ id: 1, name: 'Purok 1' }, { id: 2, name: 'Purok 2' }]),
  'type=certificates': () => json({ totalThisMonth: 5, byType: [{ type: 'Residency', count: 3 }, { type: 'Clearance', count: 2 }] }),
  'type=blotter': () => json({ filed: 2, ongoing: 1, resolved: 0, dismissed: 0 }),
  'type=financial': () => json({ totalIncome: 10000, totalExpense: 4000 }),
  'type=inventory': () => json({ total: 18 }),
  'type=registries': () => json({ seniors: { total: 4 }, pwd: { total: 2 }, fourPs: { total: 6 } }),
};

/** Routes fetch() by URL substring; `overrides` replace individual endpoints. */
function mockApi(overrides: Record<string, Handler> = {}) {
  const table = { ...HEALTHY, ...overrides };
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const key = Object.keys(table).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected request: ${url}`);
    return table[key]();
  }));
}

const forbidden = () => json({ error: 'MFA_SETUP_REQUIRED', message: 'Two-factor authentication must be enabled.' }, 403);

beforeEach(() => vi.clearAllMocks());
// Vitest globals are off in this project, so Testing Library can't register
// its automatic cleanup — without this, each test would see the last one's DOM.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Reports overview', () => {
  it('shows the real figures when every request succeeds, with no warning', async () => {
    mockApi();
    render(<ReportsPage />);

    expect(await screen.findByText('22 residents')).toBeInTheDocument();
    expect(screen.getByText('5 issued this month')).toBeInTheDocument();
    expect(screen.getByText('3 active cases')).toBeInTheDocument();
    expect(screen.getByText('\u20B16,000 net')).toBeInTheDocument();
    expect(screen.getByText('18 total items')).toBeInTheDocument();
    expect(screen.getByText('12 registered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('REGRESSION: when every request is refused it shows "—" and explains why — never a fake 0', async () => {
    mockApi(Object.fromEntries(Object.keys(HEALTHY).map((k) => [k, forbidden])));
    render(<ReportsPage />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/couldn.t be loaded/i)).toBeInTheDocument();
    expect(within(alert).getAllByText(/Two-factor authentication must be enabled/)).toHaveLength(7);

    expect(screen.getByText('\u2014 residents')).toBeInTheDocument();
    expect(screen.getByText('\u2014 issued this month')).toBeInTheDocument();
    expect(screen.queryByText('0 residents')).not.toBeInTheDocument();
    expect(screen.queryByText(/^0 /)).not.toBeInTheDocument();
  });

  it('REGRESSION: one failing endpoint no longer wipes out the others', async () => {
    mockApi({ '/api/puroks': forbidden }); // this used to throw inside load() and zero every card
    render(<ReportsPage />);

    expect(await screen.findByText('22 residents')).toBeInTheDocument();
    expect(screen.getByText('18 total items')).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Purok names/)).toBeInTheDocument();
  });

  it('marks only the failed section as unknown', async () => {
    mockApi({ 'type=inventory': () => json({ error: 'boom' }, 500) });
    render(<ReportsPage />);

    expect(await screen.findByText('\u2014 total items')).toBeInTheDocument();
    expect(screen.getByText('22 residents')).toBeInTheDocument();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Inventory/)).toBeInTheDocument();
    expect(within(alert).getByText(/HTTP 500/)).toBeInTheDocument();
  });

  it('a genuine zero is still shown as 0 (unknown and zero are different things)', async () => {
    mockApi({ '/api/dashboard': () => json({ totalResidents: 0, activeCases: 0, residentsByPurok: [] }) });
    render(<ReportsPage />);

    expect(await screen.findByText('0 residents')).toBeInTheDocument();
    expect(screen.getByText('0 active cases')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains an expired session instead of crashing on the login page HTML', async () => {
    mockApi({ '/api/dashboard': () => json(undefined, 200, { redirected: true, url: 'http://localhost/login?callbackUrl=%2Freports' }) });
    render(<ReportsPage />);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/session has expired/i)).toBeInTheDocument();
  });

  it('shows the database-unreachable message when a request keeps returning 503', async () => {
    mockApi({ 'type=financial': () => json({ error: 'DATABASE_UNAVAILABLE', message: 'The database is currently unreachable. Please try again in a moment.' }, 503) });
    render(<ReportsPage />);

    const alert = await screen.findByRole('alert', {}, { timeout: 4000 });
    expect(within(alert).getByText(/database is currently unreachable/)).toBeInTheDocument();
    expect(screen.getByText('\u2014 net')).toBeInTheDocument();
  }, 8000);

  it('quietly recovers from a one-off 503 via the automatic retry', async () => {
    let calls = 0;
    mockApi({
      'type=inventory': () => (++calls === 1 ? json({ message: 'busy' }, 503) : json({ total: 18 })),
    });
    render(<ReportsPage />);

    expect(await screen.findByText('18 total items', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  }, 8000);

  it('Retry reloads and clears the warning once the problem is fixed', async () => {
    mockApi({ '/api/dashboard': forbidden });
    render(<ReportsPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    mockApi(); // the problem is fixed
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('22 residents')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('never has more than 3 requests in flight at once', async () => {
    let active = 0;
    let peak = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      active++; peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 15));
      active--;
      const key = Object.keys(HEALTHY).find((k) => url.includes(k))!;
      return HEALTHY[key]();
    }));
    render(<ReportsPage />);

    expect(await screen.findByText('22 residents')).toBeInTheDocument();
    expect(await screen.findByText('12 registered')).toBeInTheDocument();
    expect(peak).toBeLessThanOrEqual(3);
  });
});