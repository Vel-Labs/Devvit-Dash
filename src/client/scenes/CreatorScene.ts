import { navigateTo, showShareSheet } from '@devvit/web/client';
import * as Phaser from 'phaser';
import { apiClient } from '../api/client';
import { kenneyTextureKey } from '../art/kenney';
import {
  createCreatorCardModel,
  createCreatorShareSheetOptions,
  createCreatorShareText,
  saveCreatorCardImage,
  type CreatorCardModel,
} from '../creatorCard';
import {
  applyViewportLayout,
  getCurrentViewportLayout,
  isCompactLandscapeViewport,
  LANDSCAPE_LAYOUT,
  type ViewportLayout,
} from '../layout';
import { session } from '../state/session';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton } from '../ui/button';
import { announceSemanticStatus, setSemanticScene } from '../ui/semanticActions';

const SHARE_TEXTURES = {
  seal: 'share:route-passport-seal',
  cleanParcel: 'share:clean-delivery-parcel',
  failedParcel: 'share:failed-delivery-parcel',
} as const;

type PassportPanel = {
  label: string;
  value: string;
  accent: number;
  texture: string;
};

export class CreatorScene extends Phaser.Scene {
  private layout: ViewportLayout = LANDSCAPE_LAYOUT;
  private compactLandscape = false;
  private statusText: Phaser.GameObjects.Text | undefined;
  private model: CreatorCardModel | undefined;
  private cardObjects: Phaser.GameObjects.GameObject[] = [];
  private actionObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Creator');
  }

  preload(): void {
    this.load.image(SHARE_TEXTURES.seal, '/assets/share/route-passport-seal.png');
    this.load.image(SHARE_TEXTURES.cleanParcel, '/assets/share/clean-delivery-parcel.png');
    this.load.image(SHARE_TEXTURES.failedParcel, '/assets/share/failed-delivery-parcel.png');
  }

  create(): void {
    this.layout = applyViewportLayout(this.scale);
    this.compactLandscape = isCompactLandscapeViewport(window.innerWidth, window.innerHeight);
    this.bindViewportRestart();
    this.cardObjects = [];
    this.actionObjects = [];
    this.statusText = undefined;
    this.cameras.main.setBackgroundColor(COLORS.sky);
    setSemanticScene(
      'Daily Dash Route Passport',
      'Review four lifetime player and creator metrics, share the passport, or ride today’s Daily Route.'
    );

    if (this.compactLandscape) {
      this.createCompactLandscapeGate();
      return;
    }
    if (this.layout.mode === 'portrait') this.createPortraitShell();
    else this.createLandscapeShell();

    if (this.model) this.renderCard(this.model);
    else void this.loadOutcome();
  }

  private bindViewportRestart(): void {
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleViewportResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleViewportResize, this);
    });
  }

  private handleViewportResize(): void {
    const nextLayout = getCurrentViewportLayout();
    const nextCompact = isCompactLandscapeViewport(window.innerWidth, window.innerHeight);
    if (nextLayout.mode === this.layout.mode && nextCompact === this.compactLandscape) return;
    this.scene.restart();
  }

  private createCompactLandscapeGate(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(120, 72, 1040, 576, 32);
    panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(120, 72, 1040, 576, 32);
    this.add
      .text(640, 158, 'ROTATE TO SHARE', {
        fontFamily: FONT_FAMILY,
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 268, 'Portrait keeps the creator card and share actions comfortably tappable.', {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        color: '#49626d',
        align: 'center',
        wordWrap: { width: 820 },
      })
      .setOrigin(0.5);
    createButton(this, 400, 470, 360, 96, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 28,
    });
    createButton(this, 880, 470, 460, 96, 'ROTATED? RECHECK', () => this.scene.restart(), {
      fill: COLORS.primary,
      fontSize: 28,
    });
  }

  private createLandscapeShell(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(34, 26, 1212, 668, 30);
    panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(34, 26, 1212, 668, 30);
    this.add.text(72, 48, 'ROUTE PASSPORT', {
      fontFamily: FONT_FAMILY,
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.statusText = this.add.text(72, 92, 'Loading your creator card…', {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      color: '#49626d',
      wordWrap: { width: 1090 },
    });
    createButton(this, 1080, 648, 250, 60, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 20,
    });
  }

  private createPortraitShell(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(18, 18, 684, 1244, 28);
    panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(18, 18, 684, 1244, 28);
    this.add.text(42, 42, 'ROUTE PASSPORT', {
      fontFamily: FONT_FAMILY,
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.statusText = this.add.text(44, 94, 'Loading your creator card…', {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      color: '#49626d',
      wordWrap: { width: 628 },
    });
    createButton(this, 360, 1200, 300, 70, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 22,
    });
  }

  private async loadOutcome(): Promise<void> {
    try {
      const response = await apiClient.creatorOutcome();
      session.profile = response.profile;
      session.lastRoute = response.dailyRoute;
      const model = createCreatorCardModel(response);
      this.model = model;
      this.renderCard(model);
    } catch {
      this.statusText?.setText('Open Daily Dash inside Reddit to load your creator card.');
      this.renderMessageCard(
        'CARD UNAVAILABLE',
        'We could not load your saved creator result.',
        'Try again inside Reddit.'
      );
      announceSemanticStatus('Creator card unavailable. Open Daily Dash inside Reddit and retry.');
    }
  }

  private renderMessageCard(title: string, body: string, footer: string): void {
    this.clearCardObjects();
    const portrait = this.layout.mode === 'portrait';
    const x = portrait ? 44 : 72;
    const y = portrait ? 180 : 132;
    const width = portrait ? 632 : 1136;
    const height = portrait ? 780 : 430;
    const graphics = this.add.graphics();
    graphics.fillStyle(0x12131d, 1).fillRoundedRect(x, y, width, height, 28);
    graphics.lineStyle(4, COLORS.ink, 0.5).strokeRoundedRect(x, y, width, height, 28);
    const headline = this.add.text(x + 38, y + 70, title, {
      fontFamily: FONT_FAMILY,
      fontSize: portrait ? '38px' : '46px',
      fontStyle: 'bold',
      color: '#f2bf56',
      wordWrap: { width: width - 76 },
    });
    const message = this.add.text(x + 40, y + (portrait ? 210 : 170), body, {
      fontFamily: FONT_FAMILY,
      fontSize: portrait ? '25px' : '28px',
      color: '#fff7df',
      wordWrap: { width: width - 80 },
      lineSpacing: 10,
    });
    const scope = this.add.text(x + 40, y + height - 90, footer, {
      fontFamily: FONT_FAMILY,
      fontSize: portrait ? '18px' : '20px',
      color: '#72bf9b',
      wordWrap: { width: width - 80 },
    });
    this.cardObjects.push(graphics, headline, message, scope);
  }

  private renderCard(model: CreatorCardModel): void {
    this.clearCardObjects();
    this.clearActionObjects();
    this.statusText?.setText('Your player + creator lifetime snapshot.');
    announceSemanticStatus(
      `Route Passport loaded. Distance traveled: ${model.distanceLabel}. Featured tiles: ${model.featuredTiles}. Clean deliveries: ${model.cleanDeliveries}. Failed deliveries: ${model.failedDeliveries}.`
    );
    if (this.layout.mode === 'portrait') this.renderPortraitCard(model);
    else this.renderLandscapeCard(model);
    this.createCardActions(model);
  }

  private renderLandscapeCard(model: CreatorCardModel): void {
    const x = 72;
    const y = 132;
    const width = 1136;
    const height = 430;
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, width, height, 26);
    graphics.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, y, width, height, 26);
    graphics.fillStyle(COLORS.sky, 1).fillRoundedRect(x + 14, y + 14, 300, height - 28, 20);
    graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x + 14, y + 14, 300, height - 28, 20);
    const seal = this.add.image(x + 164, y + 128, SHARE_TEXTURES.seal).setDisplaySize(160, 160);
    const header = this.add
      .text(x + 164, y + 224, 'DAILY DASH', {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setOrigin(0.5, 0);
    const identity = this.add.text(
      x + 164,
      y + 286,
      `${model.creatorLabel}\n${model.communityLabel}`,
      { fontFamily: FONT_FAMILY, fontSize: '20px', color: '#49626d', align: 'center' }
    );
    identity.setOrigin(0.5, 0);
    this.makeProfileLink(identity, model);
    const panels = this.passportPanels(model);
    panels.forEach((panel, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.renderPassportPanel(panel, x + 336 + column * 392, y + 18 + row * 198, 370, 184, false);
    });
    this.cardObjects.push(graphics, seal, header, identity);
  }

  private renderPortraitCard(model: CreatorCardModel): void {
    const x = 44;
    const y = 170;
    const width = 632;
    const height = 760;
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, width, height, 28);
    graphics.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(x, y, width, height, 28);
    graphics.fillStyle(COLORS.sky, 1).fillRoundedRect(x + 12, y + 12, width - 24, 154, 20);
    graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x + 12, y + 12, width - 24, 154, 20);
    const seal = this.add.image(x + 92, y + 89, SHARE_TEXTURES.seal).setDisplaySize(124, 124);
    const header = this.add.text(x + 174, y + 38, 'DAILY DASH', {
      fontFamily: FONT_FAMILY,
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#243642',
    });
    const identity = this.add.text(
      x + 176,
      y + 92,
      `${model.creatorLabel}\n${model.communityLabel}`,
      {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        color: '#49626d',
        lineSpacing: 3,
        wordWrap: { width: 270 },
      }
    );
    this.makeProfileLink(identity, model);
    graphics
      .lineStyle(4, COLORS.reward, 1)
      .strokeRoundedRect(x + width - 154, y + 32, 136, 114, 14);
    const routeStamp = this.add
      .image(x + width - 86, y + 89, kenneyTextureKey('background-far'))
      .setDisplaySize(128, 112);
    const panels = this.passportPanels(model);
    panels.forEach((panel, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      this.renderPassportPanel(panel, x + 14 + column * 306, y + 184 + row * 278, 292, 260, true);
    });
    this.cardObjects.push(graphics, seal, header, identity, routeStamp);
  }

  private passportPanels(model: CreatorCardModel): PassportPanel[] {
    return [
      {
        label: 'DISTANCE TRAVELED',
        value: model.distanceLabel,
        accent: 0x4c9b6a,
        texture: kenneyTextureKey('background-far'),
      },
      {
        label: 'FEATURED TILES',
        value: String(model.featuredTiles),
        accent: 0xd99a12,
        texture: kenneyTextureKey('collectible-stamp'),
      },
      {
        label: 'CLEAN DELIVERIES',
        value: String(model.cleanDeliveries),
        accent: 0x4c9b6a,
        texture: SHARE_TEXTURES.cleanParcel,
      },
      {
        label: 'FAILED DELIVERIES',
        value: String(model.failedDeliveries),
        accent: 0xd85243,
        texture: SHARE_TEXTURES.failedParcel,
      },
    ];
  }

  private renderPassportPanel(
    panel: PassportPanel,
    x: number,
    y: number,
    width: number,
    height: number,
    portrait: boolean
  ): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(x, y, width, height, 18);
    graphics.lineStyle(5, panel.accent, 1).strokeRoundedRect(x, y, width, height, 18);
    graphics
      .lineStyle(2, panel.accent, 0.65)
      .strokeRoundedRect(x + 10, y + 10, width - 20, height - 20, 12);
    const label = this.add
      .text(x + width / 2, y + (portrait ? 24 : 17), panel.label, {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '20px' : '18px',
        fontStyle: 'bold',
        color: '#243642',
        align: 'center',
        wordWrap: { width: width - 24 },
      })
      .setOrigin(0.5, 0);
    const value = this.add
      .text(x + width / 2, y + (portrait ? 78 : 54), panel.value, {
        fontFamily: FONT_FAMILY,
        fontSize: portrait
          ? panel.value.length > 5
            ? '46px'
            : '62px'
          : panel.value.length > 5
            ? '38px'
            : '48px',
        fontStyle: 'bold',
        color: `#${panel.accent.toString(16).padStart(6, '0')}`,
        align: 'center',
      })
      .setOrigin(0.5, 0);
    const art = this.add
      .image(x + width / 2, y + height - (portrait ? 62 : 43), panel.texture)
      .setDisplaySize(portrait ? 132 : 82, portrait ? 96 : 62);
    this.cardObjects.push(graphics, label, value, art);
  }

  private createCardActions(model: CreatorCardModel): void {
    if (this.layout.mode === 'portrait') {
      this.actionObjects.push(
        createButton(this, 190, 1015, 300, 72, 'SHARE TO REDDIT', () => void this.share(model), {
          fill: COLORS.primary,
          fontSize: 21,
        }),
        createButton(this, 530, 1015, 300, 72, 'SAVE IMAGE', () => void this.save(model), {
          fill: COLORS.secondary,
          fontSize: 21,
        }),
        createButton(this, 360, 1100, 500, 70, 'RIDE DAILY ROUTE', () => this.rideDailyRoute(), {
          fill: COLORS.reward,
          fontSize: 21,
        })
      );
      return;
    }
    this.actionObjects.push(
      createButton(this, 210, 648, 250, 60, 'SHARE TO REDDIT', () => void this.share(model), {
        fill: COLORS.primary,
        fontSize: 20,
      }),
      createButton(this, 480, 648, 240, 60, 'SAVE IMAGE', () => void this.save(model), {
        fill: COLORS.secondary,
        fontSize: 20,
      }),
      createButton(this, 740, 648, 240, 60, 'RIDE DAILY ROUTE', () => this.rideDailyRoute(), {
        fill: COLORS.reward,
        fontSize: 18,
      })
    );
  }

  private async share(model: CreatorCardModel): Promise<void> {
    const text = createCreatorShareText(model);
    try {
      await showShareSheet(createCreatorShareSheetOptions(model));
      this.statusText?.setText('Reddit share opened. The link returns to this Daily Dash post.');
      announceSemanticStatus('Reddit share opened for this Daily Dash post.');
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        this.statusText?.setText('Share is unavailable here. The card text is on your clipboard.');
        announceSemanticStatus('Share unavailable. Creator card text copied to the clipboard.');
      } catch {
        this.statusText?.setText('Share unavailable. Save the card PNG or retry inside Reddit.');
        announceSemanticStatus('Share unavailable. Save the card image or retry inside Reddit.');
      }
    }
  }

  private async save(model: CreatorCardModel): Promise<void> {
    try {
      await saveCreatorCardImage(model);
      this.statusText?.setText('Route Passport image saved. Share it with the Reddit post link.');
      announceSemanticStatus('Route Passport image saved.');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Card image save failed.';
      this.statusText?.setText(`${message} Try the Reddit share action instead.`);
    }
  }

  private clearCardObjects(): void {
    this.cardObjects.forEach((object) => object.destroy());
    this.cardObjects = [];
  }

  private makeProfileLink(text: Phaser.GameObjects.Text, model: CreatorCardModel): void {
    const profileUrl = model.profileUrl;
    if (!profileUrl) return;
    text.setInteractive({ useHandCursor: true }).on('pointerup', () => navigateTo(profileUrl));
  }

  private clearActionObjects(): void {
    this.actionObjects.forEach((object) => object.destroy());
    this.actionObjects = [];
  }

  private rideDailyRoute(): void {
    if (!session.lastRoute) {
      this.statusText?.setText('Today’s Daily Route is unavailable. Return to the menu and retry.');
      return;
    }
    this.scene.start('Runner', { route: session.lastRoute, mode: 'daily' });
  }
}
