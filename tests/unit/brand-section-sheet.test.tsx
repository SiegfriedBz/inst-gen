// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SectionSheet } from '@/components/brand/section-sheet';
import type { SectionId } from '@/lib/brand/edit';
import type { FieldKey } from '@/lib/brand/missing';
import type { Profile } from '@/lib/brand/profile';
import messages from '@/messages/en.json';
import { ABOUT, svargaProfile } from './helpers/brand';

afterEach(cleanup);

function renderSheet(
  section: SectionId,
  profile: Profile = svargaProfile(),
  focus: FieldKey | null = null,
) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SectionSheet
        profile={profile}
        section={section}
        focus={focus}
        onSave={onSave}
        onClose={onClose}
      />
    </NextIntlClientProvider>,
  );
  return { onSave, onClose };
}

const saved = (onSave: ReturnType<typeof vi.fn>): Profile => onSave.mock.calls[0]?.[0];

describe('SectionSheet', () => {
  test('saving a valid change calls onSave with the applied profile', async () => {
    const { onSave } = renderSheet('place');
    fireEvent.change(screen.getByLabelText('Opening hours'), {
      target: { value: '9am to midnight' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(saved(onSave).hours).toEqual({ value: '9am to midnight', source: 'owner' });
  });

  test('a 30-word summary keeps the sheet open with the message', async () => {
    const { onSave } = renderSheet('business');
    const summary = screen.getByLabelText('What you offer');
    expect(screen.getByText('Up to 25 words')).toBeTruthy();
    fireEvent.change(summary, { target: { value: Array(30).fill('word').join(' ') } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const error = await screen.findByText('That is too many words.');
    expect(onSave).not.toHaveBeenCalled();
    expect(summary.getAttribute('aria-invalid')).toBe('true');
    expect(summary.getAttribute('aria-describedby')).toContain(error.id);
  });

  test('a number without a country code asks for one', async () => {
    const p = svargaProfile();
    renderSheet('contact', {
      ...p,
      location: { town: null, area: null, address: null, serviceArea: null },
    });
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '0812 3456 7891' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Start with your country code, like +84 or +62.')).toBeTruthy();
  });

  test('cancel with no change closes at once', () => {
    const { onClose } = renderSheet('place');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard your changes?')).toBeNull();
  });

  test('cancel after a change asks to discard', async () => {
    const { onClose } = renderSheet('place');
    fireEvent.change(screen.getByLabelText('Opening hours'), { target: { value: 'Noon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Discard your changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('an offering can be added, moved up and removed', async () => {
    const p = svargaProfile();
    const { onSave } = renderSheet('business', {
      ...p,
      offerings: [...p.offerings, { name: 'Foot reflexology', source: ABOUT }],
    });
    const list = screen.getByRole('group', { name: 'Services and prices' });
    fireEvent.click(within(list).getAllByRole('button', { name: 'Move up' })[1] as HTMLElement);
    fireEvent.click(within(list).getByRole('button', { name: 'Add a service' }));
    const names = within(list).getAllByLabelText('Service');
    fireEvent.change(names[2] as HTMLElement, { target: { value: 'Hot stone massage' } });
    fireEvent.click(within(list).getAllByRole('button', { name: 'Remove' })[1] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(saved(onSave).offerings.map((o) => [o.name, o.source])).toEqual([
      ['Foot reflexology', ABOUT],
      ['Hot stone massage', 'owner'],
    ]);
  });

  test('a tone word can be added as a chip and removed', async () => {
    const { onSave } = renderSheet('feeling');
    const tone = screen.getByRole('group', { name: 'Your tone' });
    fireEvent.change(within(tone).getByRole('textbox'), { target: { value: 'playful' } });
    fireEvent.keyDown(within(tone).getByRole('textbox'), { key: 'Enter' });
    fireEvent.click(within(tone).getByRole('button', { name: 'Remove calm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(saved(onSave).tone).toEqual(['warm', 'caring', 'playful']);
  });

  test('a search term can be added as a chip', async () => {
    const { onSave } = renderSheet('feeling');
    const terms = screen.getByRole('group', { name: 'What people search for' });
    expect(within(terms).getByText('Up to 8')).toBeTruthy();
    fireEvent.change(within(terms).getByRole('textbox'), {
      target: { value: 'massage canggu' },
    });
    fireEvent.keyDown(within(terms).getByRole('textbox'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(saved(onSave).essence.searchTerms).toEqual(['massage canggu']);
  });

  test('the logo can be removed', async () => {
    const { onSave } = renderSheet('look');
    fireEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(saved(onSave).logoUrl).toBeNull();
  });

  test('the English hint is shown', () => {
    renderSheet('feeling');
    expect(screen.getByText('Write in English: your posts are in English.')).toBeTruthy();
  });
});

describe('a form opened for one field', () => {
  test('a text field is focused', async () => {
    renderSheet('contact', svargaProfile(), 'phone');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Phone')));
  });

  test("a word list's add field is focused", async () => {
    renderSheet('feeling', svargaProfile(), 'senses');
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(
        /Scents, textures and light/,
      ),
    );
  });

  test("a list's add button is focused", async () => {
    renderSheet('business', svargaProfile(), 'highlights');
    await waitFor(() =>
      expect(
        document.activeElement?.closest('fieldset')?.querySelector('legend')?.textContent,
      ).toBe('What your site says about you'),
    );
  });
});
