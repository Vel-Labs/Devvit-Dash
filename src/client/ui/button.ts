import type * as Phaser from 'phaser';
import { COLORS, FONT_FAMILY } from '../theme';
import { registerSemanticAction, type SemanticActionHandle } from './semanticActions';

export type ButtonOptions = {
  fill?: number;
  textColor?: string;
  stroke?: number;
  fontSize?: number;
  depth?: number;
  textWrapWidth?: number;
  semanticLabel?: string;
  shadowOffset?: number;
};

const semanticActions = new WeakMap<Phaser.GameObjects.Container, SemanticActionHandle>();

export const setButtonLabel = (container: Phaser.GameObjects.Container, label: string): void => {
  const text = container.getAt<Phaser.GameObjects.GameObject>(2);
  if (text && 'setText' in text && typeof text.setText === 'function') text.setText(label);
  semanticActions.get(container)?.setLabel(label);
};

export const setButtonEnabled = (
  container: Phaser.GameObjects.Container,
  enabled: boolean
): void => {
  if (enabled) container.setInteractive({ useHandCursor: true });
  else container.disableInteractive();
  semanticActions.get(container)?.setEnabled(enabled);
};

export const setButtonVisible = (
  container: Phaser.GameObjects.Container,
  visible: boolean
): void => {
  container.setVisible(visible);
  semanticActions.get(container)?.setVisible(visible);
};

export const createButton = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {}
): Phaser.GameObjects.Container => {
  const fill = options.fill ?? COLORS.primary;
  const stroke = options.stroke ?? COLORS.ink;
  const shadow = scene.add
    .rectangle(0, options.shadowOffset ?? 6, width, height, COLORS.shadow, 0.25)
    .setOrigin(0.5);
  const background = scene.add
    .rectangle(0, 0, width, height, fill)
    .setStrokeStyle(3, stroke)
    .setOrigin(0.5);
  const text = scene.add
    .text(0, 0, label, {
      color: options.textColor ?? '#243642',
      fontFamily: FONT_FAMILY,
      fontSize: `${options.fontSize ?? 24}px`,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: {
        width: options.textWrapWidth ?? Math.max(40, width - 18),
        useAdvancedWrap: true,
      },
      maxLines: 2,
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [shadow, background, text]);
  container.setSize(width, height).setInteractive({ useHandCursor: true });
  container.setDepth(options.depth ?? 10);
  container.on('pointerover', () => background.setFillStyle(fill, 0.86));
  container.on('pointerout', () => background.setFillStyle(fill, 1));
  container.on('pointerdown', () => container.setY(y + 4));
  container.on('pointerup', () => {
    container.setY(y);
    onClick();
  });
  const semanticAction = registerSemanticAction(options.semanticLabel ?? label, onClick);
  semanticActions.set(container, semanticAction);
  container.once('destroy', () => {
    semanticAction.destroy();
    semanticActions.delete(container);
  });
  return container;
};
