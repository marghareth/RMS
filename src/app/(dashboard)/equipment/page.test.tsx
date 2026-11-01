// FILE: src/app/(dashboard)/equipment/page.test.tsx
//
// Regression test: when /api/equipment fails, the page used to store the
// { error } body as the list and crash with "equipment.map is not a function".
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import EquipmentPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/equipment' }));
vi.mock('@/components/equipment/EquipmentDetailSheet', () => ({ default: () => null }));

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

function mockFetch(body: unknown, status: number) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as unknown as typeof fetch;
}

describe('Equipment page', () => {
  it('shows the reason instead of crashing when the API returns an error', async () => {
    mockFetch({ error: 'Forbidden' }, 403);
    render(<EquipmentPage />);
    expect(await screen.findByText("Couldn't load equipment")).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('lists equipment when the API succeeds', async () => {
    mockFetch([{ id: 1, name: 'Monobloc Chairs', quantity: 120, condition: 'FAIR', status: 'SERVICEABLE', asset_type: 'Furniture', borrowings: [] }], 200);
    render(<EquipmentPage />);
    expect((await screen.findAllByText('Monobloc Chairs')).length).toBeGreaterThan(0);
    expect(screen.queryByText("Couldn't load equipment")).not.toBeInTheDocument();
  });
});