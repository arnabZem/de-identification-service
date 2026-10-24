import { Rule } from '../models/detection';
import { creditCardRule } from './creditCard.rule';
import { dobRule } from './dob.rule';
import { emailRule } from './email.rule';
import { ipv4Rule } from './ipv4.rule';
import { nameRule } from './name.rule';
import { phoneRule } from './phone.rule';
import { ssnRule } from './ssn.rule';

/** Registry of active detection rules. Add new rules here. */
export const RULES: Rule[] = [emailRule, ssnRule, ipv4Rule, creditCardRule, dobRule, phoneRule, nameRule];
