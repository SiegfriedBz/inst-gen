import { describe, expect, test } from 'vitest';
import { checkedLookup, hostIsIpLiteral, isPublicAddress } from '@/lib/brand/address';

describe('isPublicAddress', () => {
  test.each([
    '10.0.0.5',
    '127.0.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '192.168.1.1',
    '172.16.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    'fd00::1',
    'fe80::1',
    'not an address',
  ])('%s is not public', (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  test.each(['8.8.8.8', '2606:4700::1111', '::ffff:8.8.8.8'])('%s is public', (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe('hostIsIpLiteral', () => {
  test.each([
    ['http://2130706433/', '127.0.0.1'],
    ['http://0x7f.1/', '127.0.0.1'],
    ['http://[::1]/', '::1'],
    ['http://10.0.0.5/', '10.0.0.5'],
  ])('%s is %s', (url, ip) => {
    expect(hostIsIpLiteral(new URL(url))).toBe(ip);
  });

  test('a host name is not', () => {
    expect(hostIsIpLiteral(new URL('http://example.com/'))).toBeNull();
  });
});

type Answer = { address: string; family: 4 | 6 }[];

function lookupWith(answer: Answer) {
  const lookup = checkedLookup(async () => answer);
  return new Promise<{ err: NodeJS.ErrnoException | null; address?: string; family?: number }>(
    (resolve) => {
      lookup('example.com', {}, (err, address, family) =>
        resolve({ err, address: address as string, family }),
      );
    },
  );
}

describe('checkedLookup', () => {
  test('refuses a host with one public and one private address', async () => {
    const result = await lookupWith([
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ]);
    expect(result.err?.code).toBe('BLOCKED_ADDRESS');
  });

  test('answers the checked address', async () => {
    const result = await lookupWith([{ address: '8.8.8.8', family: 4 }]);
    expect(result.err).toBeNull();
    expect(result).toMatchObject({ address: '8.8.8.8', family: 4 });
  });

  test('a host with no address fails', async () => {
    const result = await lookupWith([]);
    expect(result.err).not.toBeNull();
  });
});
