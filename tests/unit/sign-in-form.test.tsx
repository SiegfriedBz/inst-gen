// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SignInFormView } from '@/app/enter/sign-in-form';
import messages from '@/messages/en.json';

afterEach(cleanup);

function renderForm(state: { error: boolean; attempt: number }) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SignInFormView state={state} formAction={vi.fn()} pending={false} />
    </NextIntlClientProvider>,
  );
}

describe('SignInFormView', () => {
  test('shows no error at first', () => {
    renderForm({ error: false, attempt: 0 });
    expect(screen.queryByText("That passphrase isn't right. Try again.")).toBeNull();
    expect(screen.getByLabelText('Passphrase').getAttribute('aria-invalid')).toBeNull();
  });

  test('shows the error linked to the field', () => {
    renderForm({ error: true, attempt: 1 });
    const message = screen.getByText("That passphrase isn't right. Try again.");
    const field = screen.getByLabelText('Passphrase') as HTMLInputElement;
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe(message.id);
    expect(field.value).toBe('');
    expect(document.activeElement).toBe(field);
  });

  test('field is safe for phone keyboards', () => {
    renderForm({ error: false, attempt: 0 });
    const field = screen.getByLabelText('Passphrase');
    expect(field.getAttribute('autocomplete')).toBe('current-password');
    expect(field.getAttribute('autocapitalize')).toBe('none');
    expect(field.getAttribute('autocorrect')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
    expect(field.getAttribute('name')).toBe('passphrase');
  });

  test('the passphrase is always visible: a text field, never dots', () => {
    renderForm({ error: false, attempt: 0 });
    const field = screen.getByLabelText('Passphrase') as HTMLInputElement;
    expect(field.type).toBe('text');
    fireEvent.change(field, { target: { value: 'lotus-river-moon-sen' } });
    expect(field.value).toBe('lotus-river-moon-sen');
    expect(field.type).toBe('text');
    expect(screen.queryByRole('button', { name: /show|hide/i })).toBeNull();
  });

  test('has an Enter button', () => {
    renderForm({ error: false, attempt: 0 });
    expect(screen.getByRole('button', { name: 'Enter' }).getAttribute('type')).toBe('submit');
  });
});
