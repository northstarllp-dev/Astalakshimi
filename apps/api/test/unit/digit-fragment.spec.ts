import {
  assembleDigitFragments,
  containsAssembledPhone,
  extractDigits,
  isDigitFragment,
} from '../../src/chat/guard/digit-fragment.util';

describe('digit-fragment util', () => {
  it('treats single digits and short digit groups as fragments', () => {
    expect(isDigitFragment('9')).toBe(true);
    expect(isDigitFragment('87')).toBe(true);
    expect(isDigitFragment('98765')).toBe(true);
    expect(isDigitFragment('98 76')).toBe(true);
    expect(isDigitFragment('nine')).toBe(true);
  });

  it('does not treat normal chat as a digit fragment', () => {
    expect(isDigitFragment('Namaste! Glad to connect with you.')).toBe(false);
    expect(isDigitFragment('I am 28 years old')).toBe(false);
    expect(isDigitFragment('sector 12 block 4')).toBe(false);
  });

  it('assembles split phone numbers across messages', () => {
    const fragments = ['98765', '43210'];
    expect(assembleDigitFragments(fragments)).toBe('9876543210');
    expect(containsAssembledPhone(assembleDigitFragments(fragments))).toBe(true);
  });

  it('assembles one-digit-at-a-time phone sharing', () => {
    const fragments = ['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'];
    expect(assembleDigitFragments(fragments)).toBe('9876543210');
    expect(containsAssembledPhone(assembleDigitFragments(fragments))).toBe(true);
  });

  it('assembles two-digit-at-a-time phone sharing', () => {
    const fragments = ['98', '76', '54', '32', '10'];
    expect(assembleDigitFragments(fragments)).toBe('9876543210');
    expect(containsAssembledPhone(assembleDigitFragments(fragments))).toBe(true);
  });

  it('still assembles digits when normal chat sits between digit shards', () => {
    const allMessages = ['98', '76', 'ok thanks', '54', '32', '10'];
    expect(assembleDigitFragments(allMessages)).toBe('9876543210');
    expect(containsAssembledPhone(assembleDigitFragments(allMessages))).toBe(true);
  });

  it('does not assemble unrelated small numbers into a phone', () => {
    expect(containsAssembledPhone(extractDigits('12'))).toBe(false);
    expect(containsAssembledPhone(assembleDigitFragments(['12', '34']))).toBe(false);
  });
});
