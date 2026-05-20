import { payrollSettingsStore } from './payrollSettingsStore';

describe('payrollSettingsStore history and country isolation', () => {
  beforeEach(() => {
    localStorage.removeItem('ivos_payroll_settings_v1');
    payrollSettingsStore.reset();
  });

  it('keeps country settings isolated between SN and GN', () => {
    const before = payrollSettingsStore.load();
    const gnInitial = before.countries.GN.ipresGeneral;

    payrollSettingsStore.updateCountry(
      'SN',
      { ipresGeneral: 0.061 },
      { effectiveDate: '2026-05-01' }
    );

    const after = payrollSettingsStore.load();
    expect(after.countries.SN.ipresGeneral).toBe(0.061);
    expect(after.countries.GN.ipresGeneral).toBe(gnInitial);
  });

  it('persists fiscal history entries with effective dates', () => {
    payrollSettingsStore.updateCountryWithEffectiveDate('GN', { tfpEmployer: 0.035 }, '2026-06-01');
    payrollSettingsStore.updateCountryWithEffectiveDate('GN', { tfpEmployer: 0.04 }, '2026-09-01');

    const settings = payrollSettingsStore.load();
    const timeline = settings.countries.GN.fiscalHistory.rateTimeline;
    const first = timeline.find((entry) => entry.startDate === '2026-06-01');
    const second = timeline.find((entry) => entry.startDate === '2026-09-01');

    expect(first?.value.tfpEmployer).toBe(0.035);
    expect(first?.endDate).toBe('2026-08-31');
    expect(second?.value.tfpEmployer).toBe(0.04);
  });
});
