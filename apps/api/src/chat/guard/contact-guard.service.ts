import { Injectable } from '@nestjs/common';
import { normalizeText } from './normalizer.util';
import { CONTACT_DATA_RULES, CONTACT_SOLICITATION_RULES } from './rules.constant';

export interface GuardResult {
  status: 'ALLOW' | 'BLOCKED';
  reason?: 'CONTACT_INFORMATION' | 'CONTACT_SOLICITATION';
  action?: 'CONTACT_UNLOCK_REQUIRED';
}

@Injectable()
export class ContactGuardService {
  public async checkMessage(message: string): Promise<GuardResult> {
    const normalizedText = normalizeText(message);

    // Layer 1 Check - Solicitation
    for (const rule of CONTACT_SOLICITATION_RULES) {
      if (rule.test(normalizedText) || rule.test(message)) {
        return {
          status: 'BLOCKED',
          reason: 'CONTACT_SOLICITATION',
          action: 'CONTACT_UNLOCK_REQUIRED',
        };
      }
    }

    // Layer 1 Check - Data
    for (const rule of CONTACT_DATA_RULES) {
      if (rule.test(normalizedText) || rule.test(message)) {
        return {
          status: 'BLOCKED',
          reason: 'CONTACT_INFORMATION',
          action: 'CONTACT_UNLOCK_REQUIRED',
        };
      }
    }

    // Layer 3 (Contextual/ML) scaffolding - to be implemented with AWS Bedrock if needed later
    // For MVP, relying on Layers 1 and 2.

    return { status: 'ALLOW' };
  }
}
