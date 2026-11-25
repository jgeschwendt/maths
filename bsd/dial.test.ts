import { describe, expect, test } from 'bun:test';
import { type Field, wire } from './dial.ts';
import { familyDial } from './figure-family.ts';

/**
A stand-in element that records its attributes and listeners
*/
const control = (
  dataset: Field['dataset'] = {},
  value = '',
): Field & Readonly<{ fire: () => void; shown: () => string | undefined }> => {
  const attributes: { display?: string } = {};
  const listeners: (() => void)[] = [];
  return {
    addEventListener: (_, next) => {
      listeners.push(next);
    },
    dataset,
    fire: () => {
      for (const next of listeners) {
        next();
      }
    },
    setAttribute: (_, v) => {
      attributes.display = v;
    },
    shown: () => attributes.display,
    textContent: '',
    value,
  };
};

describe('the dial', () => {
  const input = control({}, '0');
  const output = control();
  const frames: readonly Readonly<ReturnType<typeof control>>[] = [-1, 0, 1].map((t) =>
    control({ t: String(t) }),
  );
  const [down, up] = ['-1', '1'].map((step) => control({ step }));
  wire({
    querySelector: (s) => (s === 'input' ? input : output),
    querySelectorAll: (s) => (s === '[data-t]' ? frames : [down, up]),
  });
  const visible = (): readonly (string | undefined)[] => frames.map((f) => f.shown());

  test('shows the frame of the input’s value and reads it out', () => {
    expect(visible()).toEqual(['none', 'inline', 'none']);
    expect(output.textContent).toBe('t = 0');
  });

  test('steps with the buttons and stops at the ends', () => {
    down.fire();
    down.fire();
    expect([input.value, output.textContent, visible()]).toEqual([
      '-1',
      't = −1',
      ['inline', 'none', 'none'],
    ]);
    up.fire();
    up.fire();
    up.fire();
    expect([input.value, visible()]).toEqual(['1', ['none', 'none', 'inline']]);
  });

  test('follows the slider', () => {
    input.value = '0';
    input.fire();
    expect(visible()).toEqual(['none', 'inline', 'none']);
  });
});

describe('the family figure', () => {
  const html = familyDial();

  test('one frame per member, only t = −5 shown before the script runs', () => {
    expect(html.match(/data-t='-?\d'/gu)?.length).toBe(11);
    expect(html.match(/display='inline'/gu)?.length).toBe(1);
    expect(html).toContain("data-t='-5' display='inline'");
  });

  test('the script is dial.ts as JavaScript, wired to the page', () => {
    expect(html).toContain('const wire = ');
    expect(html).not.toContain(': Dial');
  });
});
