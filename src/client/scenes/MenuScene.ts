import * as Phaser from 'phaser';
import { apiClient } from '../api/client';
import { applyViewportLayout, LANDSCAPE_LAYOUT, type ViewportLayout } from '../layout';
import { session } from '../state/session';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton, setButtonEnabled } from '../ui/button';
import { announceSemanticStatus, setSemanticScene } from '../ui/semanticActions';
import { generateRoute } from '../../shared/game/generator';
import { dateKeyUtc } from '../../shared/game/seed';

export class MenuScene extends Phaser.Scene {
  private tenantText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private builderButton: Phaser.GameObjects.Container | undefined;
  private layout: ViewportLayout = LANDSCAPE_LAYOUT;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.builderButton = undefined;
    setSemanticScene(
      'Daily Dash menu',
      'Build a fair course tile, ride today’s community route, open the Roadbook, or see your share card.'
    );
    this.layout = applyViewportLayout(this.scale);
    if (this.layout.mode === 'portrait') this.createPortrait();
    else this.createLandscape();
    void this.loadBootstrap();
  }

  private createPortrait(): void {
    this.drawPortraitBackground();
    this.add
      .text(48, 42, 'DAILY DASH', {
        fontFamily: FONT_FAMILY,
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setDepth(2);
    this.add
      .text(50, 108, 'Build a tile today. Ride the community route forever.', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: '#243642',
        wordWrap: { width: 610 },
      })
      .setDepth(2);

    this.tenantText = this.add.text(50, 180, 'Opening today’s route…', {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      color: '#49626d',
      wordWrap: { width: 610 },
    });

    createButton(this, 360, 606, 580, 84, 'RIDE TODAY’S ROUTE', () => {
      const route = session.bootstrap?.dailyRoute ?? this.createLocalRoute();
      session.lastRoute = route;
      this.scene.start('Runner', { route, mode: 'daily' });
    });

    this.builderButton = createButton(
      this,
      360,
      710,
      580,
      84,
      'BUILD A COURSE TILE',
      () => this.openBuilder(),
      { fill: COLORS.secondary }
    );
    setButtonEnabled(this.builderButton, false);

    createButton(this, 360, 814, 580, 84, 'ROADBOOK', () => this.scene.start('Roadbook'), {
      fill: COLORS.primary,
      fontSize: 24,
    });

    createButton(this, 205, 918, 270, 76, 'SHARE CARD', () => this.scene.start('Creator'), {
      fill: COLORS.reward,
      fontSize: 22,
    });

    createButton(this, 515, 918, 270, 76, 'BADGES', () => this.scene.start('Achievements'), {
      fill: COLORS.reward,
      fontSize: 22,
    });

    this.statusText = this.add
      .text(360, 1042, 'Three lanes. Three integrity pips. Every tile must have a clean path.', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        color: '#243642',
        wordWrap: { width: 600 },
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private createLandscape(): void {
    this.drawLandscapeBackground();
    this.add
      .text(86, 74, 'DAILY DASH', {
        fontFamily: FONT_FAMILY,
        fontSize: '72px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setDepth(2);
    this.add
      .text(92, 153, 'Build a tile today. Ride the community route forever.', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        color: '#243642',
      })
      .setDepth(2);

    this.tenantText = this.add.text(94, 202, 'Opening today’s route…', {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      color: '#49626d',
    });

    createButton(this, 300, 300, 360, 72, 'RIDE TODAY’S ROUTE', () => {
      const route = session.bootstrap?.dailyRoute ?? this.createLocalRoute();
      session.lastRoute = route;
      this.scene.start('Runner', { route, mode: 'daily' });
    });

    this.builderButton = createButton(
      this,
      300,
      390,
      360,
      72,
      'BUILD A COURSE TILE',
      () => this.openBuilder(),
      { fill: COLORS.secondary }
    );
    setButtonEnabled(this.builderButton, false);

    createButton(this, 300, 480, 360, 72, 'ROADBOOK', () => this.scene.start('Roadbook'), {
      fill: COLORS.primary,
      fontSize: 22,
    });

    createButton(this, 300, 570, 170, 64, 'SHARE CARD', () => this.scene.start('Creator'), {
      fill: COLORS.reward,
      fontSize: 18,
    });

    createButton(this, 493, 570, 174, 64, 'BADGES', () => this.scene.start('Achievements'), {
      fill: COLORS.reward,
      fontSize: 18,
    });

    this.statusText = this.add
      .text(905, 590, 'Three lanes. Three integrity pips. Every tile must have a clean path.', {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#243642',
        wordWrap: { width: 470 },
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private createLocalRoute() {
    return generateRoute({
      tenant: { id: 'local-demo', name: 'Local Demo' },
      dateKey: dateKeyUtc(),
      communityTiles: [],
    });
  }

  private async loadBootstrap(): Promise<void> {
    try {
      const bootstrap = await apiClient.bootstrap();
      session.bootstrap = bootstrap;
      if (bootstrap.profile) session.profile = bootstrap.profile;
      else delete session.profile;
      session.lastRoute = bootstrap.dailyRoute;
      this.tenantText?.setText(
        `Today in r/${bootstrap.tenant.name} · ${bootstrap.authenticated ? `signed in as ${bootstrap.username}` : 'practice mode'}`
      );
      this.statusText?.setText(
        bootstrap.worldTourEnabled
          ? 'Today’s community route is ready, including connected community courses.'
          : 'Today’s community route is ready. Build a fair tile or protect your packages on the run.'
      );
      announceSemanticStatus(
        `Today’s route in r/${bootstrap.tenant.name} is ready. ${bootstrap.authenticated ? `Signed in as ${bootstrap.username}.` : 'Practice mode.'}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Server unavailable';
      delete session.bootstrap;
      delete session.profile;
      this.tenantText?.setText(`Local demo mode · ${message}`);
      announceSemanticStatus('Server unavailable. Daily Dash is running in local practice mode.');
    } finally {
      if (this.builderButton) setButtonEnabled(this.builderButton, true);
    }
  }

  private openBuilder(): void {
    const todaySubmission = session.bootstrap?.todaySubmission;
    if (todaySubmission) {
      this.scene.start('Builder', { todaySubmission });
      return;
    }
    this.scene.start('Builder');
  }

  private drawPortraitBackground(): void {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(22, 22, 676, 1236, 28);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(22, 22, 676, 1236, 28);

    graphics.fillStyle(COLORS.skyDark, 0.18).fillRoundedRect(48, 246, 624, 286, 24);
    const laneYs = [318, 388, 458];
    for (const [index, y] of laneYs.entries()) {
      graphics.fillStyle(COLORS.road, 1).fillRoundedRect(82, y, 554, 16, 8);
      graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(82, y, 554, 16, 8);
      if (index === 0) {
        graphics.fillStyle(COLORS.warning, 1).fillRoundedRect(468, y - 34, 30, 34, 5);
      }
      if (index === 1) {
        graphics.fillStyle(COLORS.secondary, 1).fillTriangle(292, y, 322, y, 307, y - 27);
        graphics.fillStyle(COLORS.reward, 1).fillCircle(554, y - 24, 13);
      }
      if (index === 2) {
        graphics.fillStyle(COLORS.skyDark, 0.2).fillRect(360, y - 5, 92, 28);
      }
    }

    graphics.fillStyle(COLORS.primary, 1).fillRoundedRect(130, 425, 76, 44, 12);
    graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(130, 425, 76, 44, 12);
    graphics.fillStyle(COLORS.ink, 1).fillCircle(149, 474, 15).fillCircle(189, 474, 15);
    graphics.fillStyle(COLORS.reward, 1).fillRoundedRect(153, 397, 32, 31, 4);
  }

  private drawLandscapeBackground(): void {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(40, 34, 1200, 650, 30);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(40, 34, 1200, 650, 30);

    graphics.fillStyle(COLORS.skyDark, 0.18).fillRoundedRect(628, 74, 555, 470, 26);
    const laneYs = [190, 320, 450];
    for (const [index, y] of laneYs.entries()) {
      graphics.fillStyle(COLORS.road, 1).fillRoundedRect(680, y, 440, 18, 9);
      graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(680, y, 440, 18, 9);
      if (index === 0) {
        graphics.fillStyle(COLORS.warning, 1).fillRoundedRect(955, y - 38, 34, 38, 5);
      }
      if (index === 1) {
        graphics.fillStyle(COLORS.secondary, 1).fillTriangle(825, y, 852, y, 838, y - 25);
        graphics.fillStyle(COLORS.reward, 1).fillCircle(1050, y - 25, 13);
      }
      if (index === 2) {
        graphics.fillStyle(COLORS.skyDark, 0.18).fillRect(870, y - 6, 90, 32);
      }
    }

    graphics.fillStyle(COLORS.primary, 1).fillRoundedRect(735, 402, 72, 42, 12);
    graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(735, 402, 72, 42, 12);
    graphics.fillStyle(COLORS.ink, 1).fillCircle(752, 449, 15).fillCircle(793, 449, 15);
    graphics.fillStyle(COLORS.reward, 1).fillRoundedRect(755, 374, 35, 31, 4);
  }
}
