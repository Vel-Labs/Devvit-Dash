import * as Phaser from 'phaser';
import { AchievementsScene } from './scenes/AchievementsScene';
import { BootScene } from './scenes/BootScene';
import { BuilderScene } from './scenes/BuilderScene';
import { CreatorScene } from './scenes/CreatorScene';
import { MenuScene } from './scenes/MenuScene';
import { ResultScene } from './scenes/ResultScene';
import { RoadbookScene } from './scenes/RoadbookScene';
import { RunnerScene } from './scenes/RunnerScene';
import { getCurrentViewportLayout } from './layout';

const initialLayout = getCurrentViewportLayout();
const preserveQaCaptureBuffer =
  new URLSearchParams(window.location.search).get('qaCapture') === '1';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#aedfd8',
  width: initialLayout.width,
  height: initialLayout.height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    preserveDrawingBuffer: preserveQaCaptureBuffer,
  },
  scene: [
    BootScene,
    MenuScene,
    BuilderScene,
    CreatorScene,
    RoadbookScene,
    RunnerScene,
    ResultScene,
    AchievementsScene,
  ],
};

document.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});
