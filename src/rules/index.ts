import { Rule } from '../models/detection';
import { emailRule } from './email.rule';

/** Registry of active detection rules. Add new rules here. */
export const RULES: Rule[] = [emailRule];
