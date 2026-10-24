import { ipv4Rule } from '../../src/rules/ipv4.rule';
import { found } from './helpers';

describe('ipv4Rule', () => {
  describe('detects', () => {
    test.each([
      '192.168.1.1',
      '10.0.0.1',
      '127.0.0.1',
      '0.0.0.0',
      '255.255.255.255',
      '8.8.8.8',
      '172.16.254.1',
      '1.2.3.4',
    ])('%s', (ip) => {
      expect(found(ipv4Rule, `from ${ip} to host`)).toEqual([ip]);
    });

    test('returns exact offsets and entity', () => {
      expect(ipv4Rule.find('ip 1.2.3.4')).toEqual([{ start: 3, end: 10, entity: 'IP_ADDRESS' }]);
    });
  });

  describe('rejects', () => {
    test.each([
      ['octet above 255', '256.1.1.1'],
      ['last octet above 255', '10.0.0.256'],
      ['leading zero', '01.2.3.4'],
      ['leading zero in last octet', '1.2.3.04'],
      ['three octets', '1.2.3'],
      ['five octets', '1.2.3.4.5'],
      ['empty octet', '1..2.3'],
      ['IPv6', '::1'],
      ['IPv6 full', '2001:db8::ff00:42:8329'],
      ['letters', '1.2.3.x'],
      ['version-like triple', 'v1.2.3'],
    ])('%s: %s', (_n, text) => {
      expect(found(ipv4Rule, text)).toEqual([]);
    });
  });

  describe('boundaries', () => {
    test.each([
      ['Host 1.2.3.4.', '1.2.3.4'],
      ['(1.2.3.4)', '1.2.3.4'],
      ['1.2.3.4:8080', '1.2.3.4'],
      ['1.2.3.4/24', '1.2.3.4'],
      ['http://1.2.3.4/path', '1.2.3.4'],
      ['1.2.3.4, 5.6.7.8', '1.2.3.4'],
      ['ip=1.2.3.4;', '1.2.3.4'],
    ])('%s', (text, expected) => {
      expect(found(ipv4Rule, text)).toContain(expected);
    });

    test.each(['11.2.3.4.5', '1.2.3.4.5.6', '1.2.3.45678', '1234.5.6.7'])('no partial match inside longer dotted numbers: %s', (text) => {
      expect(found(ipv4Rule, text)).toEqual([]);
    });
  });

  describe('multiple occurrences', () => {
    test('finds every address, including repeats', () => {
      expect(found(ipv4Rule, '1.1.1.1 2.2.2.2\n1.1.1.1')).toEqual(['1.1.1.1', '2.2.2.2', '1.1.1.1']);
    });
  });

  describe('unicode', () => {
    test('offsets stay correct after astral characters', () => {
      expect(found(ipv4Rule, '😀 1.2.3.4 😀')).toEqual(['1.2.3.4']);
    });
  });
});
