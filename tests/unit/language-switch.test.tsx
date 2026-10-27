// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LanguageSwitch } from '@/components/language-switch';
import { LocaleProvider } from '@/components/locale-provider';

const saveLocale = vi.fn(async (_locale: string) => {});
vi.mock('@/app/language/actions', () => ({
  setLocale: vi.fn(),
  saveLocale: (locale: string) => saveLocale(locale),
}));

afterEach(() => {
  cleanup();
  saveLocale.mockClear();
});

function Welcome() {
  const t = useTranslations('home');
  return <h1>{t('welcome', { name: 'Sen' })}</h1>;
}

const tree = (initialLocale: 'en' | 'vi') => (
  <LocaleProvider initialLocale={initialLocale}>
    <LanguageSwitch returnTo="/" />
    <Welcome />
  </LocaleProvider>
);

function show() {
  return render(tree('en'));
}

describe('the language switch', () => {
  const summary = (code: string) => screen.getByText(code).closest('summary') as HTMLElement;
  const list = () => document.querySelector('form') as HTMLFormElement;

  test('closed: a globe and the current code, named "Language: English"', () => {
    show();
    expect(summary('EN')).not.toBeNull();
    expect(summary('EN').getAttribute('aria-label')).toBe('Language: English');
    expect((summary('EN').closest('details') as HTMLDetailsElement).open).toBe(false);
  });

  test('open: three full names in their own language, the current one checked and inert', () => {
    show();
    fireEvent.click(summary('EN'));
    expect((summary('EN').closest('details') as HTMLDetailsElement).open).toBe(true);
    const names = within(list())
      .getAllByRole('button')
      .map((b) => [b.textContent, b.getAttribute('lang')]);
    expect(names).toEqual([
      ['Tiếng Việt', 'vi'],
      ['Bahasa Indonesia', 'id'],
    ]);
    const current = within(list()).getByText('English').closest('[aria-current="true"]');
    expect(current?.getAttribute('lang')).toBe('en');
    const order = [...list().querySelectorAll('[lang]')].map((el) => el.getAttribute('lang'));
    expect(order).toEqual(['en', 'vi', 'id']);
  });

  test('picking Tiếng Việt switches the screen at once, saves it, and closes the list', async () => {
    show();
    fireEvent.click(summary('EN'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    });
    expect(screen.getByRole('heading').textContent).toBe('Chào mừng, Sen');
    expect(document.documentElement.lang).toBe('vi');
    expect(saveLocale).toHaveBeenCalledWith('vi');
    expect(summary('VI').getAttribute('aria-label')).toBe('Ngôn ngữ: Tiếng Việt');
    expect((summary('VI').closest('details') as HTMLDetailsElement).open).toBe(false);
  });

  test('without JavaScript each language is a submit button of the form', () => {
    show();
    const vi = screen.getByRole('button', { name: 'Tiếng Việt' });
    expect(vi.getAttribute('type')).toBe('submit');
    expect(vi.getAttribute('name')).toBe('locale');
    expect(vi.getAttribute('value')).toBe('vi');
    expect(vi.closest('form')?.querySelector('input[name="returnTo"]')?.getAttribute('value')).toBe(
      '/',
    );
  });

  test('Escape closes the list and gives focus back to the button', () => {
    show();
    fireEvent.click(summary('EN'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect((summary('EN').closest('details') as HTMLDetailsElement).open).toBe(false);
    expect(document.activeElement).toBe(summary('EN'));
  });

  test('a tap outside closes the list', () => {
    show();
    fireEvent.click(summary('EN'));
    fireEvent.pointerDown(screen.getByRole('heading'));
    expect((summary('EN').closest('details') as HTMLDetailsElement).open).toBe(false);
  });

  test("a server render from an earlier tap doesn't switch the screen back", async () => {
    const view = show();
    fireEvent.click(summary('EN'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    });
    fireEvent.click(summary('VI'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'English' }));
    });
    // The first save's answer re-renders the layout with the cookie it set.
    view.rerender(tree('vi'));
    expect(screen.getByRole('heading').textContent).toBe('Welcome, Sen');
  });

  test('a save that fails offline is tried again once the phone is back', async () => {
    saveLocale.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    show();
    fireEvent.click(summary('EN'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    });
    expect(saveLocale).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    expect(saveLocale).toHaveBeenCalledTimes(2);
    expect(saveLocale).toHaveBeenLastCalledWith('vi');
  });
});
