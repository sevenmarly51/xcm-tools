import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors';
import { assertSafeWsUrl } from './assertSafeWsUrl';

describe('assertSafeWsUrl', () => {
  it('accepts public wss endpoints', () => {
    expect(() => assertSafeWsUrl('wss://rpc.polkadot.io')).not.toThrow();
    expect(() => assertSafeWsUrl('wss://rpc.polkadot.io:443')).not.toThrow();
    expect(() => assertSafeWsUrl('wss://a.b.example.com/some/path')).not.toThrow();
    expect(() => assertSafeWsUrl('wss://8.8.8.8')).not.toThrow();
    expect(() => assertSafeWsUrl('wss://rpc.polkadot.io.')).not.toThrow();
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeWsUrl('not a url')).toThrow(ValidationError);
  });

  it('rejects endpoints with credentials', () => {
    expect(() => assertSafeWsUrl('wss://user:pass@rpc.polkadot.io')).toThrow(ValidationError);
  });

  it('rejects non-wss protocols', () => {
    expect(() => assertSafeWsUrl('http://rpc.polkadot.io')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('ws://rpc.polkadot.io')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('https://rpc.polkadot.io')).toThrow(ValidationError);
  });

  it('rejects loopback and internal hostnames', () => {
    expect(() => assertSafeWsUrl('wss://localhost')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://node.local')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://service.internal')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://host.lan')).toThrow(ValidationError);
  });

  it('rejects private and reserved IPv4 ranges', () => {
    expect(() => assertSafeWsUrl('wss://127.0.0.1')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://10.0.0.1')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://172.16.0.1')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://172.31.255.255')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://192.168.1.1')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://169.254.169.254')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://100.64.0.1')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://0.0.0.0')).toThrow(ValidationError);
  });

  it('rejects loopback and private IPv6 ranges', () => {
    expect(() => assertSafeWsUrl('wss://[::1]:9944')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://[fc00::1]')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://[fd12:3456::1]')).toThrow(ValidationError);
    expect(() => assertSafeWsUrl('wss://[fe80::1]')).toThrow(ValidationError);
  });

  it('allows local nodes only in development mode', () => {
    expect(() => assertSafeWsUrl('ws://localhost:9944', true)).not.toThrow();
    expect(() => assertSafeWsUrl('ws://127.0.0.1:9944', true)).not.toThrow();
    expect(() => assertSafeWsUrl('ws://192.168.1.5:9944', true)).not.toThrow();
  });
});
