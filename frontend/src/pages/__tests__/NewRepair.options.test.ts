import { describe, expect, it } from 'vitest';
import { buildDeviceOptions } from '../NewRepair';

describe('buildDeviceOptions', () => {
  it('includes newly created rate-card brand and model values', () => {
    const { brandOptions, modelsByBrand } = buildDeviceOptions([
      { brand: 'Motorola', model: 'G54' },
      { brand: 'Apple', model: 'iPhone 16' }
    ]);

    expect(brandOptions).toContain('Motorola');
    expect(brandOptions).toContain('Apple');
    expect(modelsByBrand.Motorola).toContain('G54');
    expect(modelsByBrand.Apple).toContain('iPhone 16');
  });
});
