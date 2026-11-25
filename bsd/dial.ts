/**
The slice of a DOM element the dial reads, so it runs in the page and against a stand-in in the suite
*/
type Frame = Readonly<{
  addEventListener: (type: string, listener: () => void) => void;
  dataset: Readonly<{ step?: string; t?: string }>;
  setAttribute: (name: string, value: string) => void;
}>;

/**
The range input and the readout, whose value and text the dial writes
*/
type Field = Frame & { textContent: string | null; value: string };

/**
A `[data-dial]` root: its range input, its readout, its `[data-t]` frames and `[data-step]` buttons
*/
type Dial = Readonly<{
  // the figure's markup always holds its input and output, so the page never meets a miss
  querySelector: (selector: string) => Field;
  querySelectorAll: (selector: string) => Iterable<Frame>;
}>;

/**
Show the frame of the input's value, stepped by the buttons and clamped to the frames there are
*/
const wire = (root: Dial): void => {
  const [input, output] = [root.querySelector('input'), root.querySelector('output')];
  const frames = [...root.querySelectorAll('[data-t]')];
  const ts = frames.map((frame) => Number(frame.dataset.t));
  const [lo, hi] = [Math.min(...ts), Math.max(...ts)];
  const show = (t: number): void => {
    const shown = String(Math.min(Math.max(t, lo), hi));
    input.value = shown;
    output.textContent = `t = ${shown.replace('-', '−')}`;
    for (const frame of frames) {
      frame.setAttribute('display', frame.dataset.t === shown ? 'inline' : 'none');
    }
  };
  input.addEventListener('input', () => {
    show(Number(input.value));
  });
  for (const button of root.querySelectorAll('[data-step]')) {
    button.addEventListener('click', () => {
      show(Number(input.value) + Number(button.dataset.step));
    });
  }
  show(Number(input.value));
};

export { type Dial, type Field, type Frame, wire };
