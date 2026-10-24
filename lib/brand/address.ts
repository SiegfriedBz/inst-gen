import { promises as dns } from 'node:dns';
import type { LookupFunction } from 'node:net';
import ipaddr from 'ipaddr.js';

// Guards against server-side request forgery: the brand read only ever
// connects to public unicast addresses.
export function isPublicAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  let address = ipaddr.parse(ip);
  if (address.kind() === 'ipv6') {
    const v6 = address as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) address = v6.toIPv4Address();
  }
  return address.range() === 'unicast';
}

// The address when the URL's host is an IP literal. The URL parser has
// already turned forms like `2130706433` or `0x7f.1` into dotted IPv4.
export function hostIsIpLiteral(url: URL): string | null {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  return ipaddr.isValid(host) ? host : null;
}

type Resolve = (host: string) => Promise<{ address: string; family: 4 | 6 }[]>;

const systemResolve: Resolve = async (host) =>
  (await dns.lookup(host, { all: true })) as { address: string; family: 4 | 6 }[];

function blocked(host: string): NodeJS.ErrnoException {
  const error: NodeJS.ErrnoException = new Error(`${host} resolves to a non-public address`);
  error.code = 'BLOCKED_ADDRESS';
  return error;
}

// A lookup for the socket: every address the host resolves to must be public,
// and the socket connects to the address that was checked, so a second DNS
// answer can't swap it.
export function checkedLookup(resolve: Resolve = systemResolve): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname).then(
      (addresses) => {
        if (addresses.length === 0) {
          const error: NodeJS.ErrnoException = new Error(`${hostname} has no address`);
          error.code = 'ENOTFOUND';
          callback(error, '', 4);
          return;
        }
        if (!addresses.every((a) => isPublicAddress(a.address))) {
          callback(blocked(hostname), '', 4);
          return;
        }
        const [first] = addresses;
        if ((options as { all?: boolean }).all) {
          callback(null, [first] as never, first.family);
        } else {
          callback(null, first.address, first.family);
        }
      },
      (error: NodeJS.ErrnoException) => callback(error, '', 4),
    );
  };
}
