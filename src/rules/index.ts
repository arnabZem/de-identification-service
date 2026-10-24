import { config } from '../config/config';
import { Rule } from '../models/detection';
import { ENTITY_TYPES, EntityType } from '../models/entity';
import { creditCardRule } from './creditCard.rule';
import { loadCustomRules } from './custom';
import { dobRule } from './dob.rule';
import { emailRule } from './email.rule';
import { ipv4Rule } from './ipv4.rule';
import { nameRule } from './name.rule';
import { phoneRule } from './phone.rule';
import { ssnRule } from './ssn.rule';

const CUSTOM_RULES = loadCustomRules(config.customRulesFile);

/** Registry of active detection rules: built-ins (add new ones here), then custom rules from config. */
export const RULES: Rule[] = [emailRule, ssnRule, ipv4Rule, creditCardRule, dobRule, phoneRule, nameRule, ...CUSTOM_RULES];

/** Every known entity type, in overlap priority order: built-ins first, then custom rules in file order. */
export const ENTITIES: readonly EntityType[] = [...ENTITY_TYPES, ...CUSTOM_RULES.map((rule) => rule.entity)];
