// FILE: src/app/(dashboard)/equipment/page.test.tsx
//
// Regression test: when /api/equipment fails, the page used to store the
// { error } body as the list and crash with "equipment.map is not a function".
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import EquipmentPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/equipment' }));
vi.mock('@/components/equipment/EquipmentDetailSheet', () => ({ default: () => null }));

// Who is signed in — the page hides Add / Edit / Borrow for roles that can't use them.
let role = 'ADMIN';
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role } } }) }));

const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; role = 'ADMIN'; });

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

  const ITEM = { id: 1, name: 'Monobloc Chairs', quantity: 120, condition: 'FAIR', status: 'SERVICEABLE', asset_type: 'Furniture', borrowings: [] };

  it('shows Add Equipment to roles that can edit equipment (Admin)', async () => {
    mockFetch([ITEM], 200);
    render(<EquipmentPage />);
    await screen.findAllByText('Monobloc Chairs');
    expect(screen.getByRole('button', { name: /Add Equipment/i })).toBeInTheDocument();
  });

  it('hides Add Equipment, Edit and Borrow from view-only roles (Kagawad), but still lists items', async () => {
    role = 'KAGAWAD';
    mockFetch([ITEM], 200);
    render(<EquipmentPage />);
    expect((await screen.findAllByText('Monobloc Chairs')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Add Equipment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Borrow/i })).not.toBeInTheDocument();
    // Read-only actions stay available.
    expect(screen.getByRole('button', { name: /View Borrow History/i })).toBeInTheDocument();
  });
});