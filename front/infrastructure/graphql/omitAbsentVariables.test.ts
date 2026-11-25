import { describe, expect, it } from 'vitest';
import { omitAbsentVariables } from './omitAbsentVariables';

describe('omitAbsentVariables', () => {
  it('stops forwarding absent variables', () => {
    const result = omitAbsentVariables('request({ variables, requestHeaders: h })');

    expect(result).toBe(
      'request({ ...(variables === undefined ? {} : { variables }), requestHeaders: h })',
    );
  });

  it('fails when the generated template no longer has the expected shape', () => {
    expect(() => omitAbsentVariables('request({ document })')).toThrow('template changed');
  });
});
