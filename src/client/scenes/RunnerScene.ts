import * as Phaser from 'phaser';
import { apiClient } from '../api/client';
import { kenneyTextureKey } from '../art/kenney';
import type { BuilderEntryData } from '../builderReentry';
import { verticalGestureDirection } from '../runnerGesture';
import { session } from '../state/session';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton } from '../ui/button';
import {
  applyViewportLayout,
  getRunnerViewportGeometry,
  LANDSCAPE_LAYOUT,
  type RunnerViewportGeometry,
  type ViewportLayout,
} from '../layout';
import { FOUNDING_TILES } from '../../shared/game/foundingTiles';
import { generateRoute, countRouteParcels } from '../../shared/game/generator';
import { scoreRun } from '../../shared/game/scoring';
import { dateKeyUtc } from '../../shared/game/seed';
import { flattenRouteColumns } from '../../shared/game/tile';
import { appendReplaySafeLaneEvent } from '../../shared/game/replay';
import { clampDistanceColumns } from '../../shared/game/runOutcome';
import type {
  CourseTile,
  Feature,
  Lane,
  LaneInputEvent,
  RouteBundle,
  RunResult,
  RunSubmission,
} from '../../shared/game/types';
import type { KenneyRole } from '../art/kenney';

type RunnerMode = 'daily' | 'random' | 'preview';

type RunnerSceneData = {
  route?: RouteBundle;
  previewTile?: CourseTile;
  mode?: RunnerMode;
  builderReturn?: BuilderEntryData;
};

type ActiveRun = {
  token: string;
  routeRevision: number;
  startedAtMs: number;
};

const BASE_COLUMNS_PER_SECOND = 2.75;
const BOOST_COLUMNS_PER_SECOND = 4.1;
const LANE_TWEEN_MS = 210;
const FOUNDING_AUTHOR = 'daily-dash-founders';
const SWIPE_THRESHOLD_PX = 34;

const makePreviewRoute = (tile: CourseTile): RouteBundle => {
  const flankA = FOUNDING_TILES[0];
  const flankB = FOUNDING_TILES[1];
  const tiles = [flankA, tile, flankB].filter((entry): entry is CourseTile => Boolean(entry));
  return generateRoute({
    tenant: { id: 'preview', name: 'Builder Preview' },
    dateKey: dateKeyUtc(),
    communityTiles: tiles,
    length: 3,
    seedSalt: `preview:${tile.id}`,
  });
};

const makeLocalRoute = (): RouteBundle =>
  generateRoute({
    tenant: { id: 'local-demo', name: 'Local Demo' },
    dateKey: dateKeyUtc(),
    communityTiles: [],
  });

export class RunnerScene extends Phaser.Scene {
  private route: RouteBundle = makeLocalRoute();
  private mode: RunnerMode = 'daily';
  private columns = flattenRouteColumns(this.route.tiles);
  private activeRun: ActiveRun = { token: 'local-run', routeRevision: 1, startedAtMs: 0 };
  private lane: Lane = 1;
  private targetLane: Lane = 1;
  private positionColumns = 0;
  private processedColumn = -1;
  private integrity = 3;
  private parcelsCollected = 0;
  private boostsTriggered = 0;
  private boostUntilMs = 0;
  private invulnerableUntilMs = 0;
  private complete = false;
  private player: Phaser.GameObjects.Container | undefined;
  private courseGraphics: Phaser.GameObjects.Graphics | undefined;
  private sceneryGraphics: Phaser.GameObjects.Graphics | undefined;
  private touchGuideGraphics: Phaser.GameObjects.Graphics | undefined;
  private pipGraphics: Phaser.GameObjects.Graphics | undefined;
  private statsText: Phaser.GameObjects.Text | undefined;
  private controlsText: Phaser.GameObjects.Text | undefined;
  private keyboard: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private pointerStartY: number | undefined;
  private pointerStartedInPlayfield = false;
  private pointerMovedLane = false;
  private builderReturn: BuilderEntryData | undefined;
  private wheelA: Phaser.GameObjects.Arc | undefined;
  private wheelB: Phaser.GameObjects.Arc | undefined;
  private parcelVisual: Phaser.GameObjects.Rectangle | undefined;
  private tileLabels = new Map<number, Phaser.GameObjects.Text>();
  private routeSprites = new Map<string, Phaser.GameObjects.Image>();
  private finishLabel: Phaser.GameObjects.Text | undefined;
  private feedbackText: Phaser.GameObjects.Text | undefined;
  private feedbackTween: Phaser.Tweens.Tween | undefined;
  private laneEvents: LaneInputEvent[] = [];
  private rankedStartFailure: string | undefined;
  private layout: ViewportLayout = LANDSCAPE_LAYOUT;
  private geometry: RunnerViewportGeometry = getRunnerViewportGeometry('landscape');

  constructor() {
    super('Runner');
  }

  init(data: RunnerSceneData): void {
    this.mode = data.mode ?? 'daily';
    this.builderReturn = data.builderReturn;
    if (data.previewTile) {
      this.route = makePreviewRoute(data.previewTile);
    } else if (data.route) {
      this.route = data.route;
    } else if (session.lastRoute) {
      this.route = session.lastRoute;
    } else {
      this.route = makeLocalRoute();
    }
    this.columns = flattenRouteColumns(this.route.tiles);
    this.lane = 1;
    this.targetLane = 1;
    this.positionColumns = 0;
    this.processedColumn = -1;
    this.integrity = 3;
    this.parcelsCollected = 0;
    this.boostsTriggered = 0;
    this.boostUntilMs = 0;
    this.invulnerableUntilMs = 0;
    this.complete = false;
    this.laneEvents = [];
    this.rankedStartFailure = undefined;
    this.activeRun = {
      token: 'local-run',
      routeRevision: this.route.recipe.revision,
      startedAtMs: 0,
    };
  }

  create(): void {
    this.resetSceneObjects();
    this.layout = applyViewportLayout(this.scale);
    this.geometry = getRunnerViewportGeometry(this.layout.mode);
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.drawStaticFrame();
    this.sceneryGraphics = this.add.graphics().setDepth(0);
    this.courseGraphics = this.add.graphics().setDepth(2);
    this.touchGuideGraphics = this.add.graphics().setDepth(8);
    this.pipGraphics = this.add.graphics().setDepth(10);
    this.tileLabels.clear();
    this.player = this.createCourier().setDepth(5);
    this.player.setPosition(this.geometry.playerX, this.geometry.laneYs[this.lane]);

    this.keyboard = this.input.keyboard?.createCursorKeys();
    this.input.keyboard?.on('keydown-W', () => this.requestLane(-1));
    this.input.keyboard?.on('keydown-S', () => this.requestLane(1));
    this.createTouchControls();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pointerStartY = pointer.y;
      this.pointerStartedInPlayfield = this.isPlayfieldPointer(pointer);
      this.pointerMovedLane = false;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || this.pointerStartY === undefined || !this.pointerStartedInPlayfield) {
        return;
      }
      const direction = verticalGestureDirection(this.pointerStartY, pointer.y, SWIPE_THRESHOLD_PX);
      if (direction === 0) return;
      this.requestLane(direction);
      this.pointerMovedLane = true;
      this.pointerStartY = pointer.y;
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.pointerStartY === undefined) return;
      const startY = this.pointerStartY;
      const startedInPlayfield = this.pointerStartedInPlayfield;
      const movedLane = this.pointerMovedLane;
      this.pointerStartY = undefined;
      this.pointerStartedInPlayfield = false;
      this.pointerMovedLane = false;
      if (!startedInPlayfield || movedLane) return;
      const direction = verticalGestureDirection(startY, pointer.y, SWIPE_THRESHOLD_PX);
      if (direction !== 0) {
        this.requestLane(direction);
        return;
      }
      this.requestLaneToward(this.laneFromPointerY(pointer.y));
    });

    this.createHud();
    this.feedbackText = this.createFeedbackText();

    this.updateHud();
    this.renderCourse();
    this.activeRun = {
      token: 'local-run',
      routeRevision: this.route.recipe.revision,
      startedAtMs: this.time.now,
    };
    if (this.mode !== 'preview') void this.beginServerRun();
  }

  override update(_time: number, delta: number): void {
    if (this.complete) return;
    if (this.keyboard?.up && Phaser.Input.Keyboard.JustDown(this.keyboard.up)) this.requestLane(-1);
    if (this.keyboard?.down && Phaser.Input.Keyboard.JustDown(this.keyboard.down))
      this.requestLane(1);

    const speed =
      this.time.now < this.boostUntilMs ? BOOST_COLUMNS_PER_SECOND : BASE_COLUMNS_PER_SECOND;
    this.positionColumns += (delta / 1000) * speed;

    const currentColumn = Math.floor(this.positionColumns);
    if (currentColumn > this.processedColumn) {
      for (let column = this.processedColumn + 1; column <= currentColumn; column += 1) {
        this.processColumn(column);
        if (this.complete) return;
      }
      this.processedColumn = currentColumn;
    }

    this.animateCourier(delta, speed);
    this.renderCourse();
    this.updateHud();

    if (this.positionColumns >= this.columns.length - 0.15) {
      void this.finishRun(true);
    }
  }

  private createHud(): void {
    const portrait = this.layout.mode === 'portrait';
    this.add
      .text(portrait ? 28 : 46, portrait ? 24 : 28, this.routeTitle(), {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '22px' : '28px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setDepth(9);
    if (portrait) {
      this.add
        .text(28, 54, this.routeTenantLabel(), {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setDepth(9);
    }
    this.add
      .text(portrait ? 28 : 420, portrait ? 138 : 70, this.routeMetaLabel(), {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '13px' : '15px',
        fontStyle: 'bold',
        color: '#49626d',
        ...(portrait ? { wordWrap: { width: 660 } } : {}),
      })
      .setDepth(9);
    this.add
      .text(portrait ? 28 : 46, portrait ? 94 : 66, 'PACKAGE INTEGRITY', {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '14px' : '18px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setDepth(9);
    this.statsText = this.add
      .text(portrait ? 692 : 1018, portrait ? 28 : 28, '', {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '17px' : '20px',
        color: '#243642',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(9);
    this.add
      .text(
        portrait ? 360 : 640,
        portrait ? 202 : 104,
        'Swipe up/down on the road, or tap a lane to move toward it.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: portrait ? '18px' : '17px',
          fontStyle: 'bold',
          color: '#243642',
          align: 'center',
          ...(portrait ? { wordWrap: { width: 650 } } : {}),
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(9);
    this.controlsText = this.add
      .text(portrait ? 690 : 965, portrait ? 98 : 70, '', {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '15px' : '16px',
        fontStyle: 'bold',
        color: '#49626d',
        align: 'right',
      })
      .setOrigin(1, 0)
      .setDepth(9);
    this.add
      .text(portrait ? 184 : 425, portrait ? 1004 : 608, 'AVOID\nCRATE · GAP  -1', {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '17px' : '17px',
        fontStyle: 'bold',
        color: '#8f332d',
        align: 'center',
        backgroundColor: '#fde0dacc',
        padding: { x: portrait ? 18 : 16, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setDepth(9);
    this.add
      .text(portrait ? 526 : 775, portrait ? 1004 : 608, 'COLLECT\nPARCEL +350 · BOOST +75', {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '17px' : '17px',
        fontStyle: 'bold',
        color: '#5f4814',
        align: 'center',
        backgroundColor: '#fff0bacc',
        padding: { x: portrait ? 18 : 16, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setDepth(9);

    createButton(
      this,
      portrait ? 360 : 1120,
      portrait ? 1172 : 661,
      portrait ? 560 : 250,
      portrait ? 70 : 58,
      'EXIT RUN',
      () => this.scene.start('Menu'),
      { fill: COLORS.muted, fontSize: portrait ? 20 : 18 }
    );
  }

  private requestLane(direction: -1 | 1): void {
    if (this.complete || !this.player) return;
    const next = Phaser.Math.Clamp(this.targetLane + direction, 0, 2) as Lane;
    if (next === this.targetLane) return;
    const column = Math.max(0, Math.floor(this.positionColumns));
    const nextEvents = appendReplaySafeLaneEvent(this.laneEvents, column, next);
    if (nextEvents === this.laneEvents) return;
    this.laneEvents = [...nextEvents];
    this.targetLane = next;
    this.tweens.killTweensOf(this.player);
    this.tweens.add({
      targets: this.player,
      y: this.geometry.laneYs[next],
      duration: LANE_TWEEN_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.lane = next;
      },
    });
  }

  private requestLaneToward(lane: Lane): void {
    if (lane === this.targetLane) return;
    this.requestLane(lane < this.targetLane ? -1 : 1);
  }

  private laneFromPointerY(y: number): Lane {
    const [top, middle, bottom] = this.geometry.laneYs;
    if (y < (top + middle) / 2) return 0;
    if (y > (middle + bottom) / 2) return 2;
    return 1;
  }

  private isPlayfieldPointer(pointer: Phaser.Input.Pointer): boolean {
    const { left, right, top, bottom } = this.geometry.playfield;
    return pointer.x >= left && pointer.x <= right && pointer.y >= top && pointer.y <= bottom;
  }

  private processColumn(column: number): void {
    const cells = this.columns[column];
    if (!cells) return;
    const activeLane = this.targetLane;
    const cell = cells[activeLane];
    if (!cell) return;

    if (cell.terrain === 'gap') {
      this.takeDamage('GAP RECOVERY -1', 900);
    } else if (cell.feature === 'obstacle') {
      this.takeDamage('CRATE HIT -1', 540);
    } else if (cell.feature === 'boost') {
      this.boostUntilMs = Math.max(this.boostUntilMs, this.time.now + 1100);
      this.boostsTriggered += 1;
      this.flashMessage('BOOST + SPEED', COLORS.secondary);
    } else if (cell.feature === 'parcel') {
      this.parcelsCollected += 1;
      this.flashMessage('PARCEL +350', COLORS.reward);
    }
  }

  private takeDamage(message: string, slowdownMs: number): void {
    if (this.time.now < this.invulnerableUntilMs || this.complete) return;
    this.integrity -= 1;
    this.invulnerableUntilMs = this.time.now + 760;
    this.boostUntilMs = 0;
    this.cameras.main.shake(160, 0.006);
    this.flashMessage(`${message} · ${Math.max(0, this.integrity)} LEFT`, COLORS.warning);
    if (this.player) {
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        yoyo: true,
        repeat: 3,
        duration: 90,
      });
    }
    this.time.delayedCall(slowdownMs, () => undefined);
    if (this.integrity <= 0) void this.finishRun(false);
  }

  private animateCourier(delta: number, speed: number): void {
    if (!this.player) return;
    const rotationDelta = (delta / 1000) * speed * 4.4;
    if (this.wheelA) this.wheelA.rotation += rotationDelta;
    if (this.wheelB) this.wheelB.rotation += rotationDelta;
    if (this.parcelVisual) this.parcelVisual.rotation = Math.sin(this.time.now / 120) * 0.035;
  }

  private renderCourse(): void {
    const graphics = this.courseGraphics;
    const scenery = this.sceneryGraphics;
    if (!graphics || !scenery) return;
    graphics.clear();
    scenery.clear();
    this.hideTileLabels();
    this.hideRouteSprites();
    this.finishLabel?.setVisible(false);

    this.drawProceduralScenery(scenery);
    const startColumn = Math.max(0, Math.floor(this.positionColumns) - 3);
    const { columnWidth, playerX, visibleColumns, laneYs, playfield } = this.geometry;
    for (let offset = 0; offset < visibleColumns; offset += 1) {
      const columnIndex = startColumn + offset;
      const cells = this.columns[columnIndex];
      if (!cells) continue;
      const x = playerX + (columnIndex - this.positionColumns) * columnWidth;
      for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
        const cell = cells[laneIndex];
        if (!cell) continue;
        const y = laneYs[laneIndex as Lane];
        if (cell.terrain === 'road') {
          graphics
            .fillStyle(COLORS.ground, 1)
            .fillRect(x - columnWidth / 2, y + 24, columnWidth, 76);
          this.showRouteSprite(`road:${columnIndex}:${laneIndex}`, 'road-surface', x, y + 50, {
            width: columnWidth,
            height: 58,
            alpha: 0.94,
            depth: 2.2,
          });
          graphics
            .fillStyle(COLORS.road, 1)
            .fillRoundedRect(x - columnWidth / 2, y + 14, columnWidth + 1, 18, 8);
          graphics
            .lineStyle(2, COLORS.ink, 0.45)
            .strokeRoundedRect(x - columnWidth / 2, y + 14, columnWidth + 1, 18, 8);
        } else {
          graphics.fillStyle(COLORS.skyDark, 0.15).fillRoundedRect(x - 35, y + 18, 70, 22, 6);
        }

        if (cell.feature === 'obstacle') {
          graphics.fillStyle(COLORS.warning, 0.28).fillRoundedRect(x - 36, y - 39, 72, 72, 12);
          graphics.lineStyle(4, COLORS.warning, 0.95).strokeRoundedRect(x - 36, y - 39, 72, 72, 12);
          graphics.lineStyle(2, COLORS.white, 0.92).strokeRoundedRect(x - 30, y - 33, 60, 60, 9);
          if (!this.showFeatureSprite(columnIndex, laneIndex as Lane, cell.feature, x, y - 3)) {
            graphics.fillStyle(COLORS.warning, 1).fillRoundedRect(x - 19, y - 20, 38, 38, 6);
            graphics.lineStyle(3, COLORS.ink, 1).strokeRoundedRect(x - 19, y - 20, 38, 38, 6);
            graphics.lineStyle(2, COLORS.ink, 0.55).lineBetween(x - 15, y - 16, x + 15, y + 14);
          }
        } else if (cell.feature === 'boost') {
          if (!this.showFeatureSprite(columnIndex, laneIndex as Lane, cell.feature, x, y - 1)) {
            graphics
              .fillStyle(COLORS.secondary, 1)
              .fillTriangle(x - 26, y + 15, x + 26, y + 15, x, y - 17);
            graphics
              .lineStyle(2, COLORS.ink, 0.75)
              .strokeTriangle(x - 26, y + 15, x + 26, y + 15, x, y - 17);
          }
        } else if (cell.feature === 'parcel') {
          graphics.fillStyle(COLORS.reward, 0.32).fillCircle(x, y - 11, 36);
          graphics.lineStyle(4, COLORS.reward, 1).strokeCircle(x, y - 11, 36);
          graphics.lineStyle(2, COLORS.white, 0.94).strokeCircle(x, y - 11, 29);
          if (!this.showFeatureSprite(columnIndex, laneIndex as Lane, cell.feature, x, y - 11)) {
            graphics.fillStyle(COLORS.reward, 1).fillRoundedRect(x - 16, y - 25, 32, 29, 5);
            graphics.lineStyle(2, COLORS.ink, 1).strokeRoundedRect(x - 16, y - 25, 32, 29, 5);
            graphics.lineStyle(2, COLORS.ink, 0.55).lineBetween(x, y - 23, x, y + 2);
          }
        }
      }

      const tileWidth = this.route.tiles[0]?.width ?? 18;
      if (columnIndex === this.columns.length - 1) {
        this.drawFinishMarker(graphics, x);
      }
      if (columnIndex > 0 && columnIndex % tileWidth === 0) {
        graphics
          .lineStyle(3, COLORS.ink, 0.24)
          .lineBetween(x, playfield.top + 18, x, playfield.bottom - 18);
        const tileIndex = Math.floor(columnIndex / tileWidth);
        const tile = this.route.tiles[tileIndex];
        if (tile) {
          const authorLabel =
            tile.authorId === 'daily-dash-founders'
              ? 'FOUNDING TILE'
              : `BY ${tile.authorName.toUpperCase()}`;
          this.showTileLabel(tileIndex, authorLabel, x);
        }
      }
    }
  }

  private drawProceduralScenery(graphics: Phaser.GameObjects.Graphics): void {
    const seed = this.route.recipe.visualSeed;
    const portrait = this.layout.mode === 'portrait';
    const width = this.layout.width;
    const { top, bottom } = this.geometry.playfield;
    graphics.fillStyle(COLORS.paper, 0.28).fillRect(0, top - 18, width, bottom - top + 36);
    graphics.fillStyle(0xffffff, 0.34);
    for (let index = 0; index < 7; index += 1) {
      const x = ((index * 229 + seed) % (width + 140)) - 70 - ((this.positionColumns * 10) % 140);
      const y = top + 10 + ((index * 47 + seed) % (portrait ? 150 : 75));
      graphics
        .fillCircle(x, y, 32)
        .fillCircle(x + 34, y + 7, 26)
        .fillCircle(x - 30, y + 9, 23);
    }
    if (portrait) {
      graphics
        .fillStyle(COLORS.secondary, 0.18)
        .fillTriangle(0, bottom, 190, top + 90, 380, bottom);
      graphics
        .fillStyle(COLORS.skyDark, 0.16)
        .fillTriangle(250, bottom, 490, top + 55, 720, bottom);
    } else {
      graphics.fillStyle(COLORS.secondary, 0.22).fillTriangle(0, 370, 280, 160, 560, 370);
      graphics.fillStyle(COLORS.skyDark, 0.18).fillTriangle(420, 370, 760, 145, 1100, 370);
    }
  }

  private hideTileLabels(): void {
    for (const text of this.tileLabels.values()) {
      text.setVisible(false);
    }
  }

  private hideRouteSprites(): void {
    for (const sprite of this.routeSprites.values()) {
      sprite.setVisible(false);
    }
  }

  private showFeatureSprite(
    column: number,
    lane: Lane,
    feature: Feature,
    x: number,
    y: number
  ): boolean {
    if (feature === 'obstacle') {
      return this.showRouteSprite(`feature:${column}:${lane}`, 'obstacle-crate', x, y, {
        width: 58,
        height: 58,
        depth: 3.5,
      });
    }
    if (feature === 'boost') {
      return this.showRouteSprite(`feature:${column}:${lane}`, 'boost-marker', x, y, {
        width: 50,
        height: 50,
        depth: 3.5,
      });
    }
    if (feature === 'parcel') {
      return this.showRouteSprite(`feature:${column}:${lane}`, 'collectible-stamp', x, y, {
        width: 50,
        height: 50,
        depth: 3.5,
      });
    }
    return false;
  }

  private showRouteSprite(
    id: string,
    role: KenneyRole,
    x: number,
    y: number,
    options: { width: number; height: number; alpha?: number; depth?: number }
  ): boolean {
    const textureKey = kenneyTextureKey(role);
    if (!this.textures.exists(textureKey)) return false;
    const key = `${role}:${id}`;
    let sprite = this.routeSprites.get(key);
    if (!sprite) {
      sprite = this.add.image(x, y, textureKey);
      this.routeSprites.set(key, sprite);
    }
    sprite
      .setPosition(x, y)
      .setDisplaySize(options.width, options.height)
      .setAlpha(options.alpha ?? 1)
      .setDepth(options.depth ?? 3)
      .setVisible(true);
    return true;
  }

  private showTileLabel(tileIndex: number, label: string, x: number): void {
    if (x < 0 || x > this.layout.width) return;
    const y = this.geometry.playfield.top - 12;
    let text = this.tileLabels.get(tileIndex);
    if (!text) {
      text = this.add
        .text(x + 8, y, label, {
          fontFamily: FONT_FAMILY,
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#49626d',
        })
        .setDepth(4);
      this.tileLabels.set(tileIndex, text);
    }
    text
      .setText(label)
      .setPosition(x + 8, y)
      .setVisible(true);
  }

  private drawFinishMarker(graphics: Phaser.GameObjects.Graphics, x: number): void {
    if (x < -80 || x > this.layout.width + 80) return;
    const { top, bottom } = this.geometry.playfield;
    graphics.lineStyle(5, COLORS.ink, 0.72).lineBetween(x + 46, top + 18, x + 46, bottom - 18);
    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const dark = (row + column) % 2 === 0;
        graphics
          .fillStyle(dark ? COLORS.ink : COLORS.white, dark ? 0.92 : 0.82)
          .fillRect(x + 48 + column * 18, top + 26 + row * 18, 18, 18);
      }
    }
    graphics
      .fillStyle(COLORS.paper, 0.94)
      .fillRoundedRect(x - 34, top + 4, 132, 34, 8)
      .lineStyle(2, COLORS.ink, 0.6)
      .strokeRoundedRect(x - 34, top + 4, 132, 34, 8);
    if (!this.finishLabel) {
      this.finishLabel = this.add
        .text(x + 32, top + 12, 'FINISH', {
          fontFamily: FONT_FAMILY,
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(0.5, 0)
        .setDepth(4);
    }
    this.finishLabel.setPosition(x + 32, top + 12).setVisible(true);
  }

  private resetSceneObjects(): void {
    this.player = undefined;
    this.courseGraphics = undefined;
    this.sceneryGraphics = undefined;
    this.touchGuideGraphics = undefined;
    this.pipGraphics = undefined;
    this.statsText = undefined;
    this.controlsText = undefined;
    this.keyboard = undefined;
    this.pointerStartY = undefined;
    this.pointerStartedInPlayfield = false;
    this.pointerMovedLane = false;
    this.wheelA = undefined;
    this.wheelB = undefined;
    this.parcelVisual = undefined;
    this.tileLabels.clear();
    this.routeSprites.clear();
    this.finishLabel = undefined;
    this.feedbackText = undefined;
    this.feedbackTween = undefined;
  }

  private createFeedbackText(): Phaser.GameObjects.Text {
    const x = this.layout.mode === 'portrait' ? 360 : 580;
    const y = this.layout.mode === 'portrait' ? 250 : 112;
    return this.add
      .text(x, y, 'READY', {
        fontFamily: FONT_FAMILY,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#72bf9b',
        backgroundColor: '#fff7dfdd',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setDepth(12)
      .setVisible(false);
  }

  private createTouchControls(): void {
    const graphics = this.touchGuideGraphics;
    if (!graphics) return;
    graphics.clear();
    graphics.lineStyle(2, COLORS.white, 0.18);
    const { left, right } = this.geometry.playfield;
    const guideHeight = this.layout.mode === 'portrait' ? 184 : 118;
    for (const y of this.geometry.laneYs) {
      graphics.strokeRoundedRect(
        left + 12,
        y - guideHeight / 2,
        right - left - 24,
        guideHeight,
        16
      );
    }
  }

  private flashMessage(message: string, color: number = COLORS.secondary): void {
    const text = this.feedbackText?.active
      ? this.feedbackText
      : (this.feedbackText = this.createFeedbackText());
    const x = this.layout.mode === 'portrait' ? 360 : 580;
    const y = this.layout.mode === 'portrait' ? 250 : 112;
    this.feedbackTween?.stop();
    text
      .setText(message)
      .setColor(`#${color.toString(16).padStart(6, '0')}`)
      .setPosition(x, y)
      .setAlpha(1)
      .setVisible(true);
    this.feedbackTween = this.tweens.add({
      targets: text,
      alpha: 0,
      y: y - 24,
      delay: 550,
      duration: 350,
      onComplete: () => {
        text.setVisible(false).setPosition(x, y);
      },
    });
  }

  private createCourier(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const body = this.add.rectangle(0, -8, 76, 38, COLORS.primary).setStrokeStyle(3, COLORS.ink);
    const cab = this.add.rectangle(24, -30, 30, 24, COLORS.paper).setStrokeStyle(3, COLORS.ink);
    const parcel = this.add
      .rectangle(-13, -43, 32, 28, COLORS.reward)
      .setStrokeStyle(3, COLORS.ink)
      .setName('parcel');
    const wheelA = this.add.circle(-24, 18, 14, COLORS.ink).setName('wheel');
    const wheelB = this.add.circle(24, 18, 14, COLORS.ink).setName('wheel');
    this.parcelVisual = parcel;
    this.wheelA = wheelA;
    this.wheelB = wheelB;
    const hubA = this.add.circle(-24, 18, 5, COLORS.paper);
    const hubB = this.add.circle(24, 18, 5, COLORS.paper);
    container.add([body, cab, parcel, wheelA, wheelB, hubA, hubB]);
    return container;
  }

  private drawStaticFrame(): void {
    const frame = this.add.graphics().setDepth(7);
    const portrait = this.layout.mode === 'portrait';
    const width = portrait ? 680 : 1045;
    const height = portrait ? 178 : 90;
    frame.fillStyle(COLORS.paper, 0.92).fillRoundedRect(20, 15, width, height, 20);
    frame.lineStyle(3, COLORS.ink, 0.65).strokeRoundedRect(20, 15, width, height, 20);
  }

  private updateHud(): void {
    this.drawIntegrityPips();
    const total = Math.max(1, this.columns.length);
    const progress = Phaser.Math.Clamp(Math.floor((this.positionColumns / total) * 100), 0, 100);
    const columnsLeft = Phaser.Math.Clamp(Math.ceil(total - this.positionColumns), 0, total);
    this.statsText?.setText(
      `TO FINISH ${100 - progress}%\nPARCELS ${this.parcelsCollected}/${countRouteParcels(this.route)}`
    );
    const laneName = this.targetLane === 0 ? 'TOP' : this.targetLane === 1 ? 'MIDDLE' : 'BOTTOM';
    this.controlsText?.setText(`LANE ${laneName} · ${columnsLeft} COL LEFT`);
  }

  private drawIntegrityPips(): void {
    const graphics = this.pipGraphics;
    if (!graphics) return;
    graphics.clear();
    const startX = this.layout.mode === 'portrait' ? 172 : 240;
    const y = this.layout.mode === 'portrait' ? 103 : 76;
    for (let index = 0; index < 3; index += 1) {
      const x = startX + index * 42;
      const filled = index < this.integrity;
      graphics
        .fillStyle(filled ? COLORS.reward : COLORS.white, filled ? 1 : 0.3)
        .fillCircle(x, y, 15)
        .lineStyle(3, filled ? COLORS.ink : COLORS.warning, filled ? 0.95 : 0.75)
        .strokeCircle(x, y, 15);
      if (!filled) {
        graphics
          .lineStyle(3, COLORS.warning, 0.85)
          .lineBetween(x - 8, y - 8, x + 8, y + 8)
          .lineBetween(x + 8, y - 8, x - 8, y + 8);
      }
    }
  }

  private routeTitle(): string {
    const prefix =
      this.mode === 'preview'
        ? 'BUILDER TEST'
        : this.mode === 'random'
          ? 'ROADBOOK RIDE'
          : 'DAILY DASH';
    return this.layout.mode === 'portrait' ? prefix : `${prefix} · ${this.route.recipe.tenantName}`;
  }

  private routeTenantLabel(): string {
    const value = this.route.recipe.tenantName.replace(/^r\//i, '');
    const maximum = 32;
    return `r/${value.length > maximum ? `${value.slice(0, maximum - 1)}…` : value}`;
  }

  private routeMetaLabel(): string {
    const communityTiles = this.route.tiles.filter((tile) => tile.authorId !== FOUNDING_AUTHOR);
    const communityPercent =
      this.route.tiles.length === 0
        ? 0
        : Math.round((communityTiles.length / this.route.tiles.length) * 100);
    const difficultyValues: number[] = [];
    for (const tile of this.route.tiles) {
      if (typeof tile.metrics?.difficulty === 'number') {
        difficultyValues.push(tile.metrics.difficulty);
      }
    }
    const routeDifficulty =
      difficultyValues.length === 0
        ? 'TBD'
        : `${Math.max(
            1,
            Math.round(
              difficultyValues.reduce((total, difficulty) => total + difficulty, 0) /
                difficultyValues.length
            )
          )}/5`;
    return `${this.route.recipe.dateKey} · VERSION ${this.route.recipe.revision} · DIFFICULTY ${routeDifficulty} · ${communityPercent}% COMMUNITY-BUILT`;
  }

  private async beginServerRun(): Promise<void> {
    try {
      const response = await apiClient.startRun(this.route.recipe.id);
      this.activeRun = {
        token: response.run.token,
        routeRevision: response.run.routeRevision,
        startedAtMs: this.time.now,
      };
    } catch (caught) {
      this.rankedStartFailure =
        caught instanceof Error ? caught.message : 'Ranked run could not start.';
      this.activeRun = {
        token: 'local-run',
        routeRevision: this.route.recipe.revision,
        startedAtMs: this.time.now,
      };
    }
  }

  private async finishRun(completed: boolean): Promise<void> {
    if (this.complete) return;
    this.complete = true;
    const elapsedMs = Math.max(1, Math.round(this.time.now - this.activeRun.startedAtMs));
    const submission: RunSubmission = {
      token: this.activeRun.token,
      routeId: this.route.recipe.id,
      routeRevision: this.activeRun.routeRevision,
      elapsedMs,
      damageTaken: 3 - this.integrity,
      parcelsCollected: this.parcelsCollected,
      boostsTriggered: this.boostsTriggered,
      completed,
      laneEvents: [...this.laneEvents],
    };

    let result: RunResult = {
      ...submission,
      userId: 'local-player',
      username: 'Local Player',
      score: scoreRun(submission),
      distanceColumns: completed
        ? this.columns.length
        : clampDistanceColumns(Math.floor(this.positionColumns) + 1, this.columns.length),
      completedAt: new Date().toISOString(),
    };

    let persistence: 'ranked' | 'practice' = 'practice';
    let persistenceMessage =
      this.mode === 'preview'
        ? 'PRACTICE TEST · NOT RANKED'
        : `PRACTICE RESULT · ${this.rankedStartFailure ?? 'RANKED SAVE UNAVAILABLE'}`;

    if (this.mode !== 'preview' && this.activeRun.token !== 'local-run') {
      try {
        const response = await apiClient.completeRun(submission);
        result = response.result;
        session.profile = response.profile;
        persistence = 'ranked';
        persistenceMessage = 'RANKED RESULT SAVED';
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Ranked save failed.';
        persistenceMessage = `PRACTICE RESULT · ${message}`;
      }
    }

    this.scene.start('Result', {
      result,
      route: this.route,
      mode: this.mode,
      persistence,
      persistenceMessage,
      ...(this.builderReturn ? { builderReturn: this.builderReturn } : {}),
    });
  }
}
