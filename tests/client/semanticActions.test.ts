import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerSemanticAction, setSemanticScene } from '../../src/client/ui/semanticActions';

type FakeButton = {
  type: string;
  className: string;
  textContent: string;
  disabled: boolean;
  hidden: boolean;
  removed: boolean;
  attributes: Map<string, string>;
  setAttribute: (name: string, value: string) => void;
  addEventListener: (name: string, listener: () => void) => void;
  click: () => void;
  remove: () => void;
};

const createFakeButton = (): FakeButton => {
  const listeners = new Map<string, () => void>();
  const button: FakeButton = {
    type: '',
    className: '',
    textContent: '',
    disabled: false,
    hidden: false,
    removed: false,
    attributes: new Map(),
    setAttribute: (name, value) => button.attributes.set(name, value),
    addEventListener: (name, listener) => listeners.set(name, listener),
    click: () => listeners.get('click')?.(),
    remove: () => {
      button.removed = true;
    },
  };
  return button;
};

describe('semantic action mirror', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mirrors labels, native activation, disabled state, scene context, and teardown', () => {
    const appended: FakeButton[] = [];
    const rootAttributes = new Map<string, string>();
    const root = {
      append: (button: FakeButton) => appended.push(button),
      setAttribute: (name: string, value: string) => rootAttributes.set(name, value),
    };
    const status = { textContent: '' };
    const fakeDocument = {
      getElementById: (id: string) => {
        if (id === 'game-actions') return root;
        if (id === 'game-status') return status;
        return null;
      },
      createElement: () => createFakeButton(),
    };
    vi.stubGlobal('document', fakeDocument);

    const activated = vi.fn();
    const action = registerSemanticAction('My Share Card', activated);
    const button = appended[0];
    expect(button).toBeDefined();
    expect(button?.attributes.get('aria-label')).toBe('My Share Card');
    button?.click();
    expect(activated).toHaveBeenCalledOnce();

    action.setLabel('Open Roadbook');
    action.setEnabled(false);
    action.setVisible(false);
    expect(button?.textContent).toBe('Open Roadbook');
    expect(button?.attributes.get('aria-label')).toBe('Open Roadbook');
    expect(button?.disabled).toBe(true);
    expect(button?.hidden).toBe(true);
    expect(button?.attributes.get('aria-hidden')).toBe('true');

    setSemanticScene('Creator card', 'Share it or open the Roadbook.');
    expect(rootAttributes.get('aria-label')).toBe('Creator card. Share it or open the Roadbook.');
    expect(status.textContent).toBe('Creator card. Share it or open the Roadbook.');

    action.destroy();
    expect(button?.removed).toBe(true);
  });
});
