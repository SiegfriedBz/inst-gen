// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { BrandPanel, type SearchState } from '@/components/brand/panel';
import type { PartialProfile, Profile } from '@/lib/brand/profile';
import messages from '@/messages/en.json';
import { svargaProfile } from './helpers/brand';

afterEach(cleanup);

function renderPanel(
  profile: PartialProfile,
  editable = true,
  ownerEdited: string[] = [],
  search: SearchState = null,
) {
  const onEdit = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BrandPanel
        profile={profile}
        editable={editable}
        onEdit={onEdit}
        ownerEdited={ownerEdited}
        search={search}
      />
    </NextIntlClientProvider>,
  );
  return onEdit;
}

const searchRow = () =>
  screen.getByText('What people search for').closest('[data-field]') as HTMLElement;

const withContact = (change: Partial<Profile['contact']>): Profile => {
  const p = svargaProfile();
  return { ...p, contact: { ...p.contact, ...change } };
};

describe('BrandPanel', () => {
  test('shows the five sections in order', () => {
    renderPanel(svargaProfile());
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Your business',
      'Where and when',
      'How people reach you',
      'Your look',
      'Your feeling',
    ]);
  });

  test('shows the WhatsApp number with "from /contact"', () => {
    renderPanel(
      withContact({
        whatsapp: { value: '+6281234567890', source: 'https://svargabalimassage.com/contact' },
      }),
    );
    const number = screen.getByText('+6281234567890').closest('[data-field]') as HTMLElement;
    const link = within(number).getByRole('link', { name: 'from /contact' });
    expect(link.getAttribute('href')).toBe('https://svargabalimassage.com/contact');
  });

  test('a colour read from the site code says "from your website", without a link', () => {
    renderPanel(svargaProfile());
    const colour = screen.getByText('#1f6f5c').closest('[data-field]') as HTMLElement;
    expect(within(colour).getByText('from your website')).toBeTruthy();
    expect(within(colour).queryByRole('link')).toBeNull();
  });

  test('shows the visual style as our guess from your photos', () => {
    renderPanel(svargaProfile());
    const style = screen
      .getByText('warm tropical, soft light, natural textures')
      .closest('[data-field]') as HTMLElement;
    expect(within(style).getByText('our guess from your photos')).toBeTruthy();
  });

  test("an owner's visual style says added by you, not our guess", () => {
    renderPanel(svargaProfile(), true, ['visualStyle']);
    const style = screen
      .getByText('warm tropical, soft light, natural textures')
      .closest('[data-field]') as HTMLElement;
    expect(within(style).getByText('added by you')).toBeTruthy();
    expect(within(style).queryByText('our guess from your photos')).toBeNull();
  });

  test("an owner's value says added by you", () => {
    renderPanel(withContact({ email: { value: 'book@svarga.com', source: 'owner' } }));
    const email = screen.getByText('book@svarga.com').closest('[data-field]') as HTMLElement;
    expect(within(email).getByText('added by you')).toBeTruthy();
  });

  test('warns when WhatsApp is missing, with an Add link', () => {
    const onEdit = renderPanel(withContact({ whatsapp: null }));
    expect(screen.getByText('Add your WhatsApp number: every post ends with it.')).toBeTruthy();
    const field = screen
      .getByText('Add your WhatsApp number: every post ends with it.')
      .closest('[data-field]') as HTMLElement;
    fireEvent.click(within(field).getByRole('button', { name: 'Add' }));
    expect(onEdit).toHaveBeenCalledWith('contact');
  });

  test('warns when the town is missing', () => {
    const p = svargaProfile();
    renderPanel({ ...p, location: { ...p.location, town: null } });
    expect(screen.getByText('Add your town: posts and hashtags use it.')).toBeTruthy();
  });

  test('an empty field says it was not found', () => {
    renderPanel(withContact({ phone: null }));
    expect(screen.getAllByText('Not found on your site').length).toBeGreaterThan(0);
  });

  test('shows the thin notice', () => {
    renderPanel({ ...svargaProfile(), thin: true });
    expect(
      screen.getByText(
        "We couldn't read much from your website. Fill in what's missing so your posts are right.",
      ),
    ).toBeTruthy();
  });

  test('renders a half-filled partial without crashing', () => {
    renderPanel(
      {
        name: { value: 'Se' },
        location: { town: { value: 'Da' } },
        offerings: [{ price: '300k' }],
      },
      false,
    );
    expect(screen.getByText('Se')).toBeTruthy();
    expect(screen.getByText('Da')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
    expect(screen.queryByText('Add your WhatsApp number: every post ends with it.')).toBeNull();
  });

  test('each Edit button names its section and reports it', () => {
    const onEdit = renderPanel(svargaProfile());
    fireEvent.click(screen.getByRole('button', { name: 'Edit How people reach you' }));
    expect(onEdit).toHaveBeenCalledWith('contact');
  });

  test('shows search terms as chips with their note', () => {
    const p = svargaProfile();
    p.essence.searchTerms = ['hotel massage canggu', 'massage after surfing'];
    renderPanel(p);
    const row = searchRow();
    expect(within(row).getByText('hotel massage canggu')).toBeTruthy();
    expect(within(row).getByText('massage after surfing')).toBeTruthy();
    expect(within(row).getByText('from what people search for')).toBeTruthy();
  });

  test('shows Not found yet with Add for empty search terms, and no warning', () => {
    const onEdit = renderPanel(svargaProfile());
    const row = searchRow();
    expect(within(row).getByText('Not found yet')).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: 'Add' }));
    expect(onEdit).toHaveBeenCalledWith('feeling');
    expect(row.querySelector('.text-error')).toBeNull();
  });

  test('shows the searching line while search runs', () => {
    renderPanel(svargaProfile(), true, [], 'running');
    expect(within(searchRow()).getByText('Looking up what people search for…')).toBeTruthy();
  });

  test('shows the failed and the empty line', () => {
    renderPanel(svargaProfile(), true, [], 'failed');
    expect(
      within(searchRow()).getByText("We couldn't look this up today. We'll try again next time."),
    ).toBeTruthy();
    cleanup();
    renderPanel(svargaProfile(), true, [], 'empty');
    expect(within(searchRow()).getByText('Nothing found for your town.')).toBeTruthy();
  });

  test('a moment from search says seen on its host, with a link', () => {
    const p = svargaProfile();
    p.essence.moments.push({
      value: 'after a Mount Batur hike',
      source: 'https://bali.travel/batur',
    });
    renderPanel(p);
    const link = screen.getByRole('link', { name: 'seen on bali.travel' });
    expect(link.getAttribute('href')).toBe('https://bali.travel/batur');
  });
});
