import { Injectable } from '@nestjs/common';
import { scoreMessage, type ModerationResult } from './rules.constant';
import { assembleDigitFragments, containsAssembledPhone } from './digit-fragment.util';

export interface GuardResult {
  status: 'ALLOW' | 'BLOCKED';
  reason?: 'CONTACT_INFORMATION' | 'CONTACT_SOLICITATION';
  action?: 'CONTACT_UNLOCK_REQUIRED';
}

export interface ContactGuardContext {
  /** Prior outbound texts from the same sender in this thread (oldest first). */
  recentSenderMessages?: string[];
}

const CONTACT_DATA_CATEGORIES = new Set([
  'phone',
  'email',
  'upi',
  'socialUrl',
  'socialHandle',
  'address',
  'pinCodeOnly',
]);

@Injectable()
export class ContactGuardService {
  public async checkMessage(message: string, context?: ContactGuardContext): Promise<GuardResult> {
    const result = scoreMessage(message ?? '');
    if (result.severity === 'block') {
      return this.toBlocked(result);
    }

    const recent = context?.recentSenderMessages ?? [];
    const digitStream = assembleDigitFragments([...recent, message ?? '']);
    if (containsAssembledPhone(digitStream)) {
      return {
        status: 'BLOCKED',
        reason: 'CONTACT_INFORMATION',
        action: 'CONTACT_UNLOCK_REQUIRED',
      };
    }

    return { status: 'ALLOW' };
  }

  private toBlocked(result: ModerationResult): GuardResult {
    const sharesContactData = result.matchedCategories.some((category) =>
      CONTACT_DATA_CATEGORIES.has(category),
    );

    return {
      status: 'BLOCKED',
      reason: sharesContactData ? 'CONTACT_INFORMATION' : 'CONTACT_SOLICITATION',
      action: 'CONTACT_UNLOCK_REQUIRED',
    };
  }
}
