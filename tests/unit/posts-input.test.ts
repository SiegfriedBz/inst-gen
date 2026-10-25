import { describe, expect, it } from 'vitest';
import { ctaFor, postsModelInput, profileHash } from '@/lib/posts/input';
import { svargaProfile } from './helpers/brand';

function withContact() {
  const profile = svargaProfile();
  profile.contact.phone = { value: '+62361555123', source: profile.siteUrl };
  profile.location.address = { value: 'Jl. Pantai Batu Bolong 12', source: profile.siteUrl };
  profile.essence.searchTerms = ['massage canggu'];
  return profile;
}

describe('postsModelInput', () => {
  it('holds no contact field and no address', () => {
    const profile = withContact();
    const text = JSON.stringify(postsModelInput(profile));
    expect(text).not.toContain('+6281234567890');
    expect(text).not.toContain('+62361555123');
    expect(text).not.toContain('hello@svargabalimassage.com');
    expect(text).not.toContain('svarga.bali');
    expect(text).not.toContain('Batu Bolong');
    expect(text).toContain('Svarga');
    expect(text).toContain('IDR 450,000');
    expect(text).toContain('massage canggu');
  });
});

describe('profileHash', () => {
  it('changes on a summary edit, not on a WhatsApp edit', () => {
    const base = svargaProfile();
    const hash = profileHash(base);
    const whatsapp = svargaProfile();
    whatsapp.contact.whatsapp = { value: '+6289999999999', source: 'owner' };
    expect(profileHash(whatsapp)).toBe(hash);
    const summary = svargaProfile();
    summary.summary = { value: 'Massage at your villa', source: 'owner' };
    expect(profileHash(summary)).not.toBe(hash);
  });

  it('is stable across key order', () => {
    const a = svargaProfile();
    const { name, ...rest } = a;
    const b = { ...rest, name } as typeof a;
    expect(profileHash(b)).toBe(profileHash(a));
    expect(profileHash(a)).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('ctaFor', () => {
  it('ends every post with the WhatsApp number', () => {
    const profile = svargaProfile();
    profile.contact.whatsapp = { value: '+84 905 123 456', source: profile.siteUrl };
    expect(ctaFor(profile)).toBe('Book on WhatsApp: +84 905 123 456');
  });

  it('is null without WhatsApp', () => {
    const profile = svargaProfile();
    profile.contact.whatsapp = null;
    expect(ctaFor(profile)).toBeNull();
  });
});
