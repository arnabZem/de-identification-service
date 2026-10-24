import { Rule } from '../models/detection';
import { scan } from './scan';

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'; // 0-255, no leading zeros
const IPV4 = new RegExp(`(?<!\\d)(?<!\\d\\.)${OCTET}(?:\\.${OCTET}){3}(?!\\d)(?!\\.\\d)`, 'g');

/** IPv4 dotted quad. Rejects extra octets (`1.2.3.4.5`), leading zeros and out-of-range values. */
export const ipv4Rule: Rule = { entity: 'IP_ADDRESS', find: (text) => scan(text, IPV4, 'IP_ADDRESS') };
