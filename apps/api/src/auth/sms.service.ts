import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<void> {
    const provider = this.configService.get<string>('auth.smsProvider');

    if (provider === 'msg91') {
      await this.sendViaMsg91(phone, otp);
      return;
    }

    if (provider === 'apitxt') {
      await this.sendViaApitxt(phone, otp);
      return;
    }

    throw new Error(
      'No SMS provider configured. Set SMS_PROVIDER=apitxt (with APITXT_AUTH_KEY) or SMS_PROVIDER=msg91 (with MSG91_AUTH_KEY and MSG91_TEMPLATE_ID).',
    );
  }

  private toE164India(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return `91${digits.slice(-10)}`;
  }

  private async sendViaApitxt(phone: string, otp: string): Promise<void> {
    const authKey = this.configService.get<string>('auth.apitxtAuthKey');
    if (!authKey) {
      throw new Error('apitxt credentials are incomplete (APITXT_AUTH_KEY)');
    }

    const channel = this.configService.get<string>('auth.apitxtChannel') || 'sms';
    const country = this.configService.get<string>('auth.apitxtCountry') || '91';
    const templateId = this.configService.get<string>('auth.apitxtTemplateId');
    const templateName = this.configService.get<string>('auth.apitxtTemplateName');
    const projectRefId = this.configService.get<string>('auth.apitxtProjectRefId');

    // apitxt accepts an international number or a 10-digit number (country code auto-prepended)
    const digits = phone.replace(/\D/g, '');
    const mobile = digits.length > 10 ? digits : `${country}${digits}`;

    const params = new URLSearchParams({
      authkey: authKey,
      mobile,
      otp,
      channel,
      country,
    });
    if (channel === 'whatsapp') {
      if (templateName) params.set('template_name', templateName);
      if (projectRefId) params.set('project_ref_id', projectRefId);
    } else if (templateId) {
      params.set('template_id', templateId);
    }

    const res = await fetch('https://apitxt.com/api/sendOTP', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const body = await res.text().catch(() => '');
    let parsed: { status?: string; message?: string; data?: { request_id?: string; mobile?: string } } = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      // Non-JSON response - handled below
    }

    if (!res.ok || parsed.status !== 'success') {
      this.logger.error(`apitxt send failed (${res.status}): ${body.slice(0, 300)}`);
      throw new Error(parsed.message || 'SMS delivery failed');
    }

    this.logger.log(`[OTP] apitxt accepted: ${parsed.data?.request_id || 'no request_id'} -> ${parsed.data?.mobile || mobile}`);
  }

  private async sendViaMsg91(phone: string, otp: string): Promise<void> {
    const authKey = this.configService.get<string>('auth.msg91AuthKey');
    const templateId = this.configService.get<string>('auth.msg91TemplateId');
    const senderId = this.configService.get<string>('auth.msg91SenderId');

    if (!authKey || !templateId) {
      throw new Error('MSG91 credentials are incomplete (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID)');
    }

    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: '0',
        ...(senderId ? { sender: senderId } : {}),
        recipients: [{ mobiles: this.toE164India(phone), OTP: otp }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`MSG91 send failed (${res.status}): ${body.slice(0, 300)}`);
      throw new Error('SMS delivery failed');
    }
  }
}
