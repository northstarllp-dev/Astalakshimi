describe('payments.config fail-fast', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    jest.resetModules();
  });

  it('throws when client id or secret is missing', async () => {
    process.env.CASHFREE_CLIENT_ID = '';
    process.env.CASHFREE_CLIENT_SECRET = '';
    const { default: register } = await import('../../src/config/payments.config');
    expect(() => register()).toThrow(/CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET are required/);
  });

  it('throws when environment is invalid', async () => {
    process.env.CASHFREE_CLIENT_ID = 'id';
    process.env.CASHFREE_CLIENT_SECRET = 'secret';
    process.env.CASHFREE_ENVIRONMENT = 'stage';
    const { default: register } = await import('../../src/config/payments.config');
    expect(() => register()).toThrow('CASHFREE_ENVIRONMENT must be "sandbox" or "production".');
  });

  it('loads sandbox defaults when keys are present', async () => {
    process.env.CASHFREE_CLIENT_ID = 'id';
    process.env.CASHFREE_CLIENT_SECRET = 'secret';
    process.env.CASHFREE_ENVIRONMENT = 'sandbox';
    process.env.CASHFREE_API_VERSION = '2025-01-01';
    const { default: register } = await import('../../src/config/payments.config');
    const cfg = register();
    expect(cfg.cashfreeClientId).toBe('id');
    expect(cfg.cashfreeApiVersion).toBe('2025-01-01');
    expect(cfg.cashfreeEnvironment).toBe('sandbox');
  });
});
