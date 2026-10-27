// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { OfferSheet } from '@/components/posts/offer-sheet';
import { DEFAULT_ANSWERS, type OfferAnswers } from '@/lib/posts/offer';
import messages from '@/messages/en.json';

// The special offer's sheet (docs/specs/posts/special-offer, "The sheet"),
// on Sunday 25 October 2026, phone time.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 25, 16, 0));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function show(over: { treatments?: string[]; answers?: OfferAnswers } = {}): {
  onDone: ReturnType<typeof vi.fn>;
  onAddTreatments: ReturnType<typeof vi.fn>;
} {
  const onDone = vi.fn();
  const onAddTreatments = vi.fn();
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <OfferSheet
        open
        onOpenChange={() => {}}
        treatments={over.treatments ?? ['Thai Massage', 'Foot Reflexology']}
        answers={over.answers ?? DEFAULT_ANSWERS}
        onDone={onDone}
        onAddTreatments={onAddTreatments}
      />
    </NextIntlClientProvider>,
  );
  return { onDone, onAddTreatments };
}

const done = () => screen.getByRole('button', { name: 'Done' }) as HTMLButtonElement;
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));

describe('the offer sheet', () => {
  test('opens on a 10% discount, nothing ticked, until today', () => {
    show();
    expect(screen.getByRole('radio', { name: 'A discount' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: '10%' }).getAttribute('aria-pressed')).toBe('true');
    expect(done().disabled).toBe(true);
    expect(screen.getByText('until Sun 25 Oct')).toBeTruthy();
  });

  test('ticking a treatment enables Done and hands back the answers', () => {
    const { onDone } = show();
    tick('Thai Massage');
    expect(done().disabled).toBe(false);
    fireEvent.click(done());
    expect(onDone).toHaveBeenCalledWith({ ...DEFAULT_ANSWERS, treatments: ['Thai Massage'] });
  });

  test('"Other %" keeps digits only and allows 1 to 90', () => {
    show();
    tick('Thai Massage');
    const other = screen.getByRole('textbox', { name: 'Other %' }) as HTMLInputElement;
    fireEvent.change(other, { target: { value: '100k' } });
    expect(other.value).toBe('100');
    expect(done().disabled).toBe(true);
    fireEvent.change(other, { target: { value: '15' } });
    expect(done().disabled).toBe(false);
    expect(screen.getByRole('button', { name: '10%' }).getAttribute('aria-pressed')).toBe('false');
  });

  test('3 days shows the date two days on', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: '3 days' }));
    expect(screen.getByText('until Tue 27 Oct')).toBeTruthy();
  });

  test('a free extra asks for its gift among the treatments', () => {
    const { onDone } = show();
    fireEvent.click(screen.getByRole('radio', { name: 'A free extra' }));
    expect(screen.queryByRole('button', { name: '10%' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Foot Reflexology' }));
    expect(screen.getByText('Free Foot Reflexology with a 90-minute session')).toBeTruthy();
    tick('Thai Massage');
    fireEvent.click(done());
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'freeExtra',
        gift: 'Foot Reflexology',
        treatments: ['Thai Massage'],
      }),
    );
  });

  test('the gift is greyed and unticked in the list', () => {
    show();
    tick('Foot Reflexology');
    fireEvent.click(screen.getByRole('radio', { name: 'A free extra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Foot Reflexology' }));
    const box = screen.getByRole('checkbox', { name: 'Foot Reflexology' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(true);
  });

  test('no treatments: one line, a button, no Done', () => {
    const { onAddTreatments } = show({ treatments: [] });
    expect(screen.getByText('Add your treatments on Your business first.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add treatments' }));
    expect(onAddTreatments).toHaveBeenCalled();
  });

  test('the rule line is always there', () => {
    show();
    expect(screen.getByText('The offer is on 90-minute sessions or longer.')).toBeTruthy();
  });

  test('reopens on the answers given', () => {
    show({ answers: { ...DEFAULT_ANSWERS, percent: 20, treatments: ['Thai Massage'] } });
    expect(screen.getByRole('button', { name: '20%' }).getAttribute('aria-pressed')).toBe('true');
    expect(
      (screen.getByRole('checkbox', { name: 'Thai Massage' }) as HTMLInputElement).checked,
    ).toBe(true);
  });
});
