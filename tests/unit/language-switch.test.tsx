// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  test('three codes in the order EN, VI, ID, each named in its own language', () => {
    show();
    const nav = screen.getByRole('navigation', { name: 'Language' });
    const current = nav.querySelector('[aria-current="true"]');
    expect(current?.textContent).toContain('EN');
    expect(current?.textContent).toContain('English');
    expect(screen.getByRole('button', { name: 'Tiếng Việt' }).textContent).toBe('VI');
    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' }).textContent).toBe('ID');
    const order = [...nav.querySelectorAll('[lang]')].map((el) => el.getAttribute('lang'));
    expect(order).toEqual(['en', 'vi', 'id']);
  });

  test('a tap switches the screen at once and saves the choice in the background', async () => {
    show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    });
    expect(screen.getByRole('heading').textContent).toBe('Chào mừng, Sen');
    expect(document.documentElement.lang).toBe('vi');
    expect(saveLocale).toHaveBeenCalledWith('vi');
    const nav = screen.getByRole('navigation', { name: 'Ngôn ngữ' });
    expect(nav.querySelector('[aria-current="true"]')?.textContent).toContain('VI');
  });

  test("a server render from an earlier tap doesn't switch the screen back", async () => {
    const view = show();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }));
    });
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
