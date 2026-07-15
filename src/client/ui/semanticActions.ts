export type SemanticActionHandle = {
  setLabel: (label: string) => void;
  setEnabled: (enabled: boolean) => void;
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

const ACTION_ROOT_ID = 'game-actions';
const STATUS_ROOT_ID = 'game-status';

const getDocument = (): Document | undefined =>
  typeof document === 'undefined' ? undefined : document;

export const registerSemanticAction = (
  label: string,
  onActivate: () => void
): SemanticActionHandle => {
  const currentDocument = getDocument();
  const root = currentDocument?.getElementById(ACTION_ROOT_ID);
  if (!currentDocument || !root) {
    return {
      setLabel: () => undefined,
      setEnabled: () => undefined,
      setVisible: () => undefined,
      destroy: () => undefined,
    };
  }

  const button = currentDocument.createElement('button');
  button.type = 'button';
  button.className = 'game-semantic-action';
  button.textContent = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onActivate);
  root.append(button);

  return {
    setLabel: (nextLabel) => {
      button.textContent = nextLabel;
      button.setAttribute('aria-label', nextLabel);
    },
    setEnabled: (enabled) => {
      button.disabled = !enabled;
    },
    setVisible: (visible) => {
      button.hidden = !visible;
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
    },
    destroy: () => button.remove(),
  };
};

export const setSemanticScene = (name: string, description: string): void => {
  const currentDocument = getDocument();
  const root = currentDocument?.getElementById(ACTION_ROOT_ID);
  if (root) root.setAttribute('aria-label', `${name}. ${description}`);
  announceSemanticStatus(`${name}. ${description}`);
};

export const announceSemanticStatus = (message: string): void => {
  const status = getDocument()?.getElementById(STATUS_ROOT_ID);
  if (status) status.textContent = message;
};
