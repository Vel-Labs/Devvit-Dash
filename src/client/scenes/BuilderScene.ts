import * as Phaser from 'phaser';
import { apiClient } from '../api/client';
import {
  builderRestartData,
  resolveBuilderEntry,
  type BuilderEntryData,
  type BuilderEntryResolution,
} from '../builderReentry';
import {
  applyBuilderTool,
  getBuilderToolUsage,
  type BuilderEditLimitReason,
  type BuilderTool,
} from '../builderEditing';
import {
  applyViewportLayout,
  builderPageStartForColumn,
  getBuilderPageRange,
  getCurrentViewportLayout,
  isCompactLandscapeViewport,
  LANDSCAPE_LAYOUT,
  mapVisibleBuilderColumn,
  type BuilderPageRange,
  type ViewportLayout,
} from '../layout';
import { session } from '../state/session';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton, setButtonEnabled, setButtonLabel, setButtonVisible } from '../ui/button';
import { announceSemanticStatus, setSemanticScene } from '../ui/semanticActions';
import {
  LANE_COUNT,
  MAX_BOOSTS,
  MAX_BUILD_BUDGET,
  MAX_GAPS,
  MAX_OBSTACLES,
  MAX_PARCELS,
} from '../../shared/game/constants';
import { generateRoute } from '../../shared/game/generator';
import { dateKeyUtc } from '../../shared/game/seed';
import {
  calculateBuildBudget,
  cloneTile,
  createDraftTile,
  isBufferColumn,
  setTileCell,
} from '../../shared/game/tile';
import type {
  CourseTile,
  Feature,
  Lane,
  RouteBundle,
  SafePath,
  Terrain,
  TileValidationResult,
  ValidationIssue,
} from '../../shared/game/types';
import { findFairCleanPathsByEntrance, validateCourseTile } from '../../shared/game/validator';

type IssueHighlight = { lane: Lane; column: number };

const MAX_HISTORY_STATES = 50;

const TOOL_META: Record<
  BuilderTool,
  { label: string; fill: number; terrain: Terrain; feature: Feature }
> = {
  road: { label: 'ROAD', fill: COLORS.roadLight, terrain: 'road', feature: 'none' },
  gap: { label: 'GAP', fill: COLORS.skyDark, terrain: 'gap', feature: 'none' },
  obstacle: { label: 'OBSTACLE', fill: COLORS.warning, terrain: 'road', feature: 'obstacle' },
  boost: { label: 'BOOST', fill: COLORS.secondary, terrain: 'road', feature: 'boost' },
  parcel: { label: 'PARCEL', fill: COLORS.reward, terrain: 'road', feature: 'parcel' },
};

export class BuilderScene extends Phaser.Scene {
  private tile: CourseTile = createDraftTile();
  private entry: BuilderEntryResolution = resolveBuilderEntry();
  private tool: BuilderTool = 'obstacle';
  private grid: Phaser.GameObjects.Graphics | undefined;
  private statusText?: Phaser.GameObjects.Text;
  private repairText?: Phaser.GameObjects.Text;
  private budgetText?: Phaser.GameObjects.Text;
  private toolText?: Phaser.GameObjects.Text;
  private historyText?: Phaser.GameObjects.Text;
  private pageText?: Phaser.GameObjects.Text;
  private paintedCellsThisGesture = new Set<string>();
  private undoStack: CourseTile[] = [];
  private redoStack: CourseTile[] = [];
  private safePaths: SafePath[] = [];
  private repairIssues: ValidationIssue[] = [];
  private repairIssueIndex = 0;
  private highlightedIssue: IssueHighlight | undefined;
  private postPublishObjects: Phaser.GameObjects.GameObject[] = [];
  private repairButtons: Phaser.GameObjects.Container[] = [];
  private certifiedButtons: Phaser.GameObjects.Container[] = [];
  private certifyButton: Phaser.GameObjects.Container | undefined;
  private certificationHint: Phaser.GameObjects.Text | undefined;
  private layout: ViewportLayout = LANDSCAPE_LAYOUT;
  private compactLandscape = false;
  private visibleColumnStart = 0;
  private gridX = 88;
  private gridY = 142;
  private cellWidth = 60;
  private cellHeight = 92;

  constructor() {
    super('Builder');
  }

  init(data: BuilderEntryData = {}): void {
    this.entry = resolveBuilderEntry(data);
    this.tile = this.entry.mode === 'build' ? this.entry.tile : createDraftTile();
    this.tool = 'obstacle';
    this.clearHistory();
    this.visibleColumnStart = 0;
  }

  create(): void {
    this.layout = applyViewportLayout(this.scale);
    this.compactLandscape = isCompactLandscapeViewport(window.innerWidth, window.innerHeight);
    this.bindViewportRestart();
    this.grid = undefined;
    this.postPublishObjects = [];
    this.repairButtons = [];
    this.certifiedButtons = [];
    this.certifyButton = undefined;
    this.certificationHint = undefined;
    this.cameras.main.setBackgroundColor(COLORS.sky);
    setSemanticScene(
      'Builder',
      'Paint a three-lane tile, check that every starting lane has a safe path, then publish.'
    );
    if (this.entry.mode === 'choose') {
      this.createExistingTileChoice(this.entry.existingTile);
      return;
    }
    if (this.compactLandscape) {
      this.createCompactLandscapeGate();
      return;
    }
    this.configureGridGeometry();
    if (this.layout.mode === 'portrait') this.createPortraitLayout();
    else this.createLandscapeLayout();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.postPublishObjects.length > 0) return;
      this.paintedCellsThisGesture.clear();
      this.paintFromPointer(pointer);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.postPublishObjects.length > 0) return;
      if (pointer.isDown) this.paintFromPointer(pointer);
    });
    this.input.on('pointerup', () => {
      this.paintedCellsThisGesture.clear();
    });

    this.renderGrid();
    this.updateReadout();
    this.showEntryStatus();
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
    this.restartPreservingEntry();
  }

  private restartPreservingEntry(): void {
    this.scene.restart(builderRestartData(this.entry, this.tile));
  }

  private createExistingTileChoice(existingTile: CourseTile): void {
    const portrait = this.layout.mode === 'portrait';
    const centerX = portrait ? 360 : 640;
    const centerY = portrait ? 640 : 360;
    const panelWidth = portrait ? 660 : 1040;
    const panelHeight = portrait ? 1040 : 590;
    const panel = this.add.graphics();
    panel
      .fillStyle(COLORS.paper, 1)
      .fillRoundedRect(
        centerX - panelWidth / 2,
        centerY - panelHeight / 2,
        panelWidth,
        panelHeight,
        30
      )
      .lineStyle(4, COLORS.ink, 1)
      .strokeRoundedRect(
        centerX - panelWidth / 2,
        centerY - panelHeight / 2,
        panelWidth,
        panelHeight,
        30
      );
    this.add
      .text(centerX, portrait ? 250 : 155, 'YOU ALREADY BUILT TODAY', {
        fontFamily: FONT_FAMILY,
        fontSize: portrait ? '38px' : '44px',
        fontStyle: 'bold',
        color: '#243642',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(
        centerX,
        portrait ? 380 : 245,
        'Edit your submitted tile, or begin with a blank draft. Nothing changes online until you press Publish. Publishing again updates today’s same submission.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: portrait ? '23px' : '24px',
          color: '#49626d',
          align: 'center',
          wordWrap: { width: portrait ? 550 : 820 },
        }
      )
      .setOrigin(0.5);

    if (portrait) {
      createButton(
        this,
        centerX,
        580,
        540,
        88,
        'EDIT TODAY’S TILE',
        () =>
          this.scene.restart({
            todaySubmission: existingTile,
            choice: 'edit',
          } satisfies BuilderEntryData),
        { fill: COLORS.secondary, fontSize: 25 }
      );
      createButton(
        this,
        centerX,
        700,
        540,
        88,
        'START FRESH',
        () =>
          this.scene.restart({
            todaySubmission: existingTile,
            choice: 'fresh',
          } satisfies BuilderEntryData),
        { fill: COLORS.reward, fontSize: 25 }
      );
      createButton(this, centerX, 820, 540, 78, 'BACK', () => this.scene.start('Menu'), {
        fill: COLORS.muted,
        fontSize: 23,
      });
    } else {
      createButton(
        this,
        390,
        420,
        390,
        84,
        'EDIT TODAY’S TILE',
        () =>
          this.scene.restart({
            todaySubmission: existingTile,
            choice: 'edit',
          } satisfies BuilderEntryData),
        { fill: COLORS.secondary, fontSize: 23 }
      );
      createButton(
        this,
        890,
        420,
        390,
        84,
        'START FRESH',
        () =>
          this.scene.restart({
            todaySubmission: existingTile,
            choice: 'fresh',
          } satisfies BuilderEntryData),
        { fill: COLORS.reward, fontSize: 23 }
      );
      createButton(this, centerX, 535, 360, 72, 'BACK', () => this.scene.start('Menu'), {
        fill: COLORS.muted,
        fontSize: 21,
      });
    }
    setSemanticScene(
      'Builder re-entry',
      'Choose Edit Today’s Tile, Start Fresh, or Back. Neither Builder choice changes the published tile until Publish.'
    );
  }

  private showEntryStatus(): void {
    if (this.entry.mode !== 'build') return;
    if (this.entry.source === 'edit') {
      this.statusText?.setText(
        'Editing today’s submitted tile. Publish saves changes to the same daily submission.'
      );
      return;
    }
    if (this.entry.source === 'fresh') {
      this.statusText?.setText(
        'Fresh draft started. Today’s submitted tile is unchanged until you publish this replacement.'
      );
    }
  }

  private createCompactLandscapeGate(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(120, 72, 1040, 576, 32);
    panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(120, 72, 1040, 576, 32);

    this.add
      .text(640, 158, 'ROTATE TO BUILD', {
        fontFamily: FONT_FAMILY,
        fontSize: '54px',
        fontStyle: 'bold',
        color: '#243642',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(
        640,
        268,
        'Portrait keeps every cell and action comfortably tappable. Your full 18-column draft is safe.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          color: '#49626d',
          align: 'center',
          wordWrap: { width: 820 },
        }
      )
      .setOrigin(0.5);

    createButton(this, 400, 470, 360, 96, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 28,
    });
    createButton(this, 880, 470, 460, 96, 'ROTATED? RECHECK', () => this.restartPreservingEntry(), {
      fill: COLORS.primary,
      fontSize: 28,
    });
  }

  private configureGridGeometry(): void {
    if (this.layout.mode === 'portrait') {
      this.gridX = 78;
      this.gridY = 456;
      this.cellWidth = 94;
      this.cellHeight = 110;
      this.visibleColumnStart = getBuilderPageRange(
        this.layout.mode,
        this.tile.width,
        this.visibleColumnStart
      ).start;
      return;
    }
    this.gridX = 88;
    this.gridY = 276;
    this.cellWidth = 60;
    this.cellHeight = 78;
    this.visibleColumnStart = 0;
  }

  private createLandscapeLayout(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(35, 28, 1210, 664, 28);
    panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(35, 28, 1210, 664, 28);
    this.drawSectionCard(64, 134, 1152, 96, COLORS.secondary);
    this.drawSectionCard(64, 246, 1152, 274, COLORS.ink);

    this.add.text(76, 54, 'BUILD TODAY’S TILE', {
      fontFamily: FONT_FAMILY,
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.add.text(77, 105, 'Paint a fair route. The first and last three columns stay clear.', {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      color: '#49626d',
    });

    this.addSectionLabel(82, 142, '1 · CHOOSE A TOOL', '#2f7d62');
    this.addSectionLabel(82, 256, '2 · DRAW YOUR TILE', '#243642');

    this.grid = this.add.graphics();
    this.statusText = this.add.text(82, 535, 'Choose a tool, paint a tile, then certify it.', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      wordWrap: { width: 760 },
    });
    this.repairText = this.add.text(82, 559, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#49626d',
      wordWrap: { width: 760 },
    });
    this.budgetText = this.add.text(446, 258, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.toolText = this.add.text(248, 146, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#49626d',
    });
    this.historyText = this.add.text(660, 260, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#49626d',
    });

    const tools = Object.keys(TOOL_META) as BuilderTool[];
    tools.forEach((tool, index) => {
      const meta = TOOL_META[tool];
      createButton(
        this,
        154 + index * 188,
        196,
        168,
        52,
        meta.label,
        () => {
          this.tool = tool;
          this.updateReadout();
        },
        { fill: meta.fill, fontSize: 17, shadowOffset: 4 }
      );
    });

    createButton(this, 142, 660, 180, 52, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 17,
    });
    this.certifyButton = createButton(
      this,
      445,
      660,
      360,
      58,
      'CERTIFY TILE',
      () => this.certify(),
      {
        fill: COLORS.reward,
        fontSize: 20,
      }
    );
    const testRide = createButton(this, 790, 660, 250, 52, 'TEST RIDE', () => this.testRide(), {
      fill: COLORS.secondary,
      fontSize: 17,
    });
    const publish = createButton(this, 1080, 660, 250, 52, 'PUBLISH', () => void this.publish(), {
      fill: COLORS.primary,
      fontSize: 17,
    });
    this.certifiedButtons = [testRide, publish];
    createButton(this, 1094, 166, 180, 32, 'UNDO', () => this.undo(), {
      fill: COLORS.muted,
      fontSize: 12,
      shadowOffset: 3,
    });
    createButton(this, 1094, 202, 180, 32, 'REDO', () => this.redo(), {
      fill: COLORS.muted,
      fontSize: 12,
      shadowOffset: 3,
    });
    const nextFix = createButton(
      this,
      1094,
      542,
      180,
      36,
      'NEXT FIX',
      () => this.selectNextIssue(),
      {
        fill: COLORS.warning,
        fontSize: 12,
      }
    );
    const eraseFix = createButton(
      this,
      1094,
      580,
      180,
      34,
      'ERASE FIX',
      () => this.eraseHighlightedCell(),
      {
        fill: COLORS.paper,
        fontSize: 12,
      }
    );
    this.repairButtons = [nextFix, eraseFix];
  }

  private createPortraitLayout(): void {
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.paper, 1).fillRoundedRect(18, 18, 684, 1244, 28);
    panel.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(18, 18, 684, 1244, 28);
    this.drawSectionCard(44, 150, 632, 190, COLORS.secondary);
    this.drawSectionCard(44, 358, 632, 500, COLORS.ink);
    this.drawSectionCard(44, 876, 632, 100, COLORS.reward);

    this.add.text(44, 42, 'BUILD TODAY’S TILE', {
      fontFamily: FONT_FAMILY,
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.add.text(
      46,
      96,
      'Paint six columns at a time. The first and last three columns are locked connectors.',
      {
        fontFamily: FONT_FAMILY,
        fontSize: '19px',
        color: '#49626d',
        wordWrap: { width: 620 },
      }
    );

    this.addSectionLabel(64, 164, '1 · CHOOSE A TOOL', '#2f7d62');
    this.addSectionLabel(64, 372, '2 · DRAW YOUR TILE', '#243642');
    this.addSectionLabel(64, 890, 'NEXT STEP', '#8f6517');
    this.addSectionLabel(80, 990, '3 · CERTIFY IT', '#8f6517');

    this.budgetText = this.add.text(64, 402, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.toolText = this.add.text(236, 166, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#49626d',
    });
    this.historyText = this.add.text(300, 406, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#49626d',
    });

    this.grid = this.add.graphics();
    createButton(this, 140, 826, 154, 44, 'PREVIOUS', () => this.changePage(-1), {
      fill: COLORS.muted,
      fontSize: 14,
      shadowOffset: 3,
    });
    this.pageText = this.add
      .text(360, 826, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#243642',
        align: 'center',
      })
      .setOrigin(0.5);
    createButton(this, 580, 826, 154, 44, 'NEXT', () => this.changePage(1), {
      fill: COLORS.muted,
      fontSize: 14,
      shadowOffset: 3,
    });

    this.statusText = this.add.text(64, 914, 'Choose a tool, paint a tile, then certify it.', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      wordWrap: { width: 340 },
    });
    this.repairText = this.add.text(64, 940, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#49626d',
      wordWrap: { width: 340 },
    });

    const tools = Object.keys(TOOL_META) as BuilderTool[];
    const toolPositions = [
      { x: 144, y: 226 },
      { x: 360, y: 226 },
      { x: 576, y: 226 },
      { x: 252, y: 300 },
      { x: 468, y: 300 },
    ];
    tools.forEach((tool, index) => {
      const meta = TOOL_META[tool];
      const position = toolPositions[index];
      if (!position) return;
      createButton(
        this,
        position.x,
        position.y,
        172,
        54,
        meta.label,
        () => {
          this.tool = tool;
          this.updateReadout();
        },
        { fill: meta.fill, fontSize: 17, shadowOffset: 4 }
      );
    });

    createButton(this, 520, 410, 88, 40, 'UNDO', () => this.undo(), {
      fill: COLORS.muted,
      fontSize: 12,
      shadowOffset: 3,
    });
    createButton(this, 624, 410, 88, 40, 'REDO', () => this.redo(), {
      fill: COLORS.muted,
      fontSize: 12,
      shadowOffset: 3,
    });
    const nextFix = createButton(
      this,
      598,
      918,
      132,
      34,
      'NEXT FIX',
      () => this.selectNextIssue(),
      {
        fill: COLORS.warning,
        fontSize: 11,
        shadowOffset: 3,
      }
    );
    const eraseFix = createButton(
      this,
      598,
      956,
      132,
      30,
      'ERASE FIX',
      () => this.eraseHighlightedCell(),
      {
        fill: COLORS.paper,
        fontSize: 11,
        shadowOffset: 3,
      }
    );
    this.repairButtons = [nextFix, eraseFix];

    this.certifyButton = createButton(
      this,
      360,
      1040,
      560,
      64,
      'CERTIFY TILE',
      () => this.certify(),
      {
        fill: COLORS.reward,
        fontSize: 21,
      }
    );
    this.certificationHint = this.add
      .text(360, 1120, 'Certification unlocks Test Ride and Publish.', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#49626d',
        align: 'center',
      })
      .setOrigin(0.5);
    const testRide = createButton(this, 210, 1120, 270, 56, 'TEST RIDE', () => this.testRide(), {
      fill: COLORS.secondary,
      fontSize: 17,
    });
    const publish = createButton(this, 510, 1120, 270, 56, 'PUBLISH', () => void this.publish(), {
      fill: COLORS.primary,
      fontSize: 17,
    });
    this.certifiedButtons = [testRide, publish];

    createButton(this, 360, 1206, 280, 50, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 16,
    });
  }

  private drawSectionCard(
    x: number,
    y: number,
    width: number,
    height: number,
    accent: number
  ): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.white, 0.24).fillRoundedRect(x, y, width, height, 18);
    graphics.lineStyle(4, accent, 1).strokeRoundedRect(x, y, width, height, 18);
    graphics
      .lineStyle(1, accent, 0.52)
      .strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, 13);
  }

  private addSectionLabel(x: number, y: number, label: string, color: string): void {
    this.add.text(x, y, label, {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      fontStyle: 'bold',
      color,
      letterSpacing: 1,
    });
  }

  private setConditionalButton(button: Phaser.GameObjects.Container, visible: boolean): void {
    setButtonVisible(button, visible);
    setButtonEnabled(button, visible);
  }

  private updateActionVisibility(validation: TileValidationResult): void {
    const hasRepairIssues = validation.issues.some((issue) => issue.severity === 'error');
    this.repairButtons.forEach((button) => this.setConditionalButton(button, hasRepairIssues));

    const certified = validation.ok && this.safePaths.length === LANE_COUNT;
    this.certifiedButtons.forEach((button) => this.setConditionalButton(button, certified));
    this.certificationHint?.setVisible(!certified);
    if (this.certifyButton) {
      setButtonLabel(this.certifyButton, certified ? 'CERTIFIED ✓' : 'CERTIFY TILE');
      setButtonEnabled(this.certifyButton, !certified);
    }
  }

  private paintFromPointer(pointer: Phaser.Input.Pointer): void {
    const range = this.getVisibleRange();
    const visibleColumn = Math.floor((pointer.x - this.gridX) / this.cellWidth);
    const column = mapVisibleBuilderColumn(range, visibleColumn);
    const laneIndex = Math.floor((pointer.y - this.gridY) / this.cellHeight);
    if (column === undefined || laneIndex < 0 || laneIndex >= 3) return;
    if (isBufferColumn(column, this.tile.width)) {
      this.statusText?.setText(
        'Start and finish columns stay clear so community tiles join safely.'
      );
      return;
    }
    const key = `${laneIndex}:${column}`;
    if (this.paintedCellsThisGesture.has(key)) return;
    this.paintedCellsThisGesture.add(key);

    const edit = applyBuilderTool(this.tile, laneIndex as Lane, column, this.tool);
    if (!edit.changed) {
      if (edit.reason !== 'unchanged') {
        const message = this.builderLimitMessage(edit.reason);
        this.statusText?.setText(message);
        announceSemanticStatus(message);
      }
      return;
    }
    this.pushUndoState();
    this.tile = edit.tile;
    this.safePaths = [];
    this.clearPostPublishPrompt();
    const action =
      edit.action === 'removed'
        ? 'Removed'
        : edit.action === 'replaced'
          ? 'Replaced with'
          : 'Added';
    this.statusText?.setText(`${action} ${TOOL_META[this.tool].label.toLowerCase()}.`);
    this.updateReadout();
    this.renderGrid();
  }

  private builderLimitMessage(reason: BuilderEditLimitReason): string {
    const messages: Record<BuilderEditLimitReason, string> = {
      'build-budget': `Build budget is ${MAX_BUILD_BUDGET} points. Remove or replace something first.`,
      'obstacle-limit': `Obstacle limit is ${MAX_OBSTACLES}. Remove or replace one first.`,
      'gap-limit': `Gap limit is ${MAX_GAPS}. Remove or replace one first.`,
      'boost-limit': `Boost limit is ${MAX_BOOSTS}. Remove or replace one first.`,
      'parcel-limit': `Parcel limit is ${MAX_PARCELS}. Remove or replace one first.`,
    };
    return messages[reason];
  }

  private pushUndoState(): void {
    this.undoStack.push(cloneTile(this.tile));
    if (this.undoStack.length > MAX_HISTORY_STATES) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) {
      this.statusText?.setText('Nothing to undo yet.');
      return;
    }
    this.redoStack.push(cloneTile(this.tile));
    this.tile = previous;
    this.safePaths = [];
    this.paintedCellsThisGesture.clear();
    this.clearPostPublishPrompt();
    this.statusText?.setText('Undid the last Builder edit.');
    this.updateReadout();
    this.renderGrid();
  }

  private redo(): void {
    const next = this.redoStack.pop();
    if (!next) {
      this.statusText?.setText('Nothing to redo yet.');
      return;
    }
    this.undoStack.push(cloneTile(this.tile));
    this.tile = next;
    this.safePaths = [];
    this.paintedCellsThisGesture.clear();
    this.clearPostPublishPrompt();
    this.statusText?.setText('Redid the Builder edit.');
    this.updateReadout();
    this.renderGrid();
  }

  private clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.paintedCellsThisGesture.clear();
    this.safePaths = [];
    this.repairIssues = [];
    this.repairIssueIndex = 0;
    this.highlightedIssue = undefined;
  }

  private getVisibleRange(): BuilderPageRange {
    return getBuilderPageRange(this.layout.mode, this.tile.width, this.visibleColumnStart);
  }

  private changePage(direction: -1 | 1): void {
    if (this.layout.mode !== 'portrait') return;
    const current = this.getVisibleRange();
    const next = getBuilderPageRange(
      this.layout.mode,
      this.tile.width,
      current.start + direction * current.count
    );
    if (next.start === current.start) {
      this.statusText?.setText(
        direction < 0 ? 'You are on the first columns.' : 'You are on the final columns.'
      );
      return;
    }
    this.visibleColumnStart = next.start;
    this.paintedCellsThisGesture.clear();
    this.clearPostPublishPrompt();
    this.renderGrid();
    this.updatePageReadout();
  }

  private revealColumn(column: number): void {
    const nextStart = builderPageStartForColumn(this.layout.mode, this.tile.width, column);
    if (nextStart === this.visibleColumnStart) return;
    this.visibleColumnStart = nextStart;
    this.paintedCellsThisGesture.clear();
    this.updatePageReadout();
  }

  private updatePageReadout(): void {
    const range = this.getVisibleRange();
    this.pageText?.setText(
      `COLUMNS ${range.start + 1}–${range.endExclusive} OF ${this.tile.width}`
    );
  }

  private renderGrid(): void {
    const graphics = this.grid;
    if (!graphics) return;
    graphics.clear();

    const range = this.getVisibleRange();
    for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
      for (let column = range.start; column < range.endExclusive; column += 1) {
        const visibleColumn = column - range.start;
        const x = this.gridX + visibleColumn * this.cellWidth;
        const y = this.gridY + laneIndex * this.cellHeight;
        const cell = this.tile.lanes[laneIndex]?.[column];
        if (!cell) continue;
        const locked = isBufferColumn(column, this.tile.width);
        graphics.fillStyle(locked ? COLORS.muted : COLORS.white, locked ? 0.28 : 0.58);
        graphics.fillRoundedRect(x + 2, y + 2, this.cellWidth - 4, this.cellHeight - 4, 8);
        graphics.lineStyle(2, COLORS.ink, locked ? 0.32 : 0.62);
        graphics.strokeRoundedRect(x + 2, y + 2, this.cellWidth - 4, this.cellHeight - 4, 8);

        const roadY = y + this.cellHeight * 0.62;
        if (cell.terrain === 'road') {
          graphics
            .fillStyle(COLORS.road, 1)
            .fillRoundedRect(
              x + 4,
              roadY,
              this.cellWidth - 8,
              Math.max(12, this.cellHeight * 0.16),
              6
            );
        } else {
          graphics
            .fillStyle(COLORS.skyDark, 0.28)
            .fillRect(x + 5, roadY - 5, this.cellWidth - 10, Math.max(24, this.cellHeight * 0.29));
        }

        const featureSize = Math.min(34, this.cellWidth * 0.46);
        const featureX = x + (this.cellWidth - featureSize) / 2;
        const featureY = y + this.cellHeight * 0.31;
        if (cell.feature === 'obstacle') {
          graphics
            .fillStyle(COLORS.warning, 1)
            .fillRoundedRect(featureX, featureY, featureSize, featureSize, 5);
          graphics
            .lineStyle(2, COLORS.ink, 1)
            .strokeRoundedRect(featureX, featureY, featureSize, featureSize, 5);
        } else if (cell.feature === 'boost') {
          graphics
            .fillStyle(COLORS.secondary, 1)
            .fillTriangle(
              featureX,
              roadY + 4,
              featureX + featureSize,
              roadY + 4,
              featureX + featureSize / 2,
              featureY
            );
        } else if (cell.feature === 'parcel') {
          graphics
            .fillStyle(COLORS.reward, 1)
            .fillRoundedRect(featureX + 3, featureY, featureSize - 6, featureSize - 4, 4);
          graphics
            .lineStyle(2, COLORS.ink, 1)
            .strokeRoundedRect(featureX + 3, featureY, featureSize - 6, featureSize - 4, 4);
        }
      }
    }

    graphics.lineStyle(4, COLORS.secondary, 0.8);
    const connectorGroups = [
      { start: 0, endExclusive: 3 },
      { start: this.tile.width - 3, endExclusive: this.tile.width },
    ];
    for (const connector of connectorGroups) {
      const visibleStart = Math.max(connector.start, range.start);
      const visibleEnd = Math.min(connector.endExclusive, range.endExclusive);
      if (visibleStart >= visibleEnd) continue;
      graphics.strokeRoundedRect(
        this.gridX + (visibleStart - range.start) * this.cellWidth,
        this.gridY,
        (visibleEnd - visibleStart) * this.cellWidth,
        this.cellHeight * 3,
        12
      );
    }

    this.renderSafePathOverlay(graphics);
    this.renderIssueOverlay(graphics);
    this.updatePageReadout();
  }

  private renderIssueOverlay(graphics: Phaser.GameObjects.Graphics): void {
    const issue = this.highlightedIssue;
    if (issue?.lane === undefined || issue.column === undefined) return;
    if (issue.column < 0 || issue.column >= this.tile.width) return;

    const range = this.getVisibleRange();
    if (issue.column < range.start || issue.column >= range.endExclusive) return;
    const x = this.gridX + (issue.column - range.start) * this.cellWidth;
    const y = this.gridY + issue.lane * this.cellHeight;
    graphics
      .fillStyle(COLORS.warning, 0.26)
      .fillRoundedRect(x + 4, y + 4, this.cellWidth - 8, this.cellHeight - 8, 10);
    graphics
      .lineStyle(5, COLORS.warning, 1)
      .strokeRoundedRect(x + 5, y + 5, this.cellWidth - 10, this.cellHeight - 10, 10);
    graphics
      .lineStyle(2, COLORS.ink, 0.9)
      .strokeRoundedRect(x + 10, y + 10, this.cellWidth - 20, this.cellHeight - 20, 8);
  }

  private renderSafePathOverlay(graphics: Phaser.GameObjects.Graphics): void {
    if (this.safePaths.length === 0) return;

    const range = this.getVisibleRange();
    this.safePaths.forEach((path) => {
      const offsetY = (path.entranceLane - 1) * 7;
      const visiblePoints = path.points.filter(
        (point) => point.column >= range.start && point.column < range.endExclusive
      );
      if (visiblePoints.length === 0) return;
      graphics.lineStyle(6, COLORS.secondary, 0.88);
      visiblePoints.forEach((point, index) => {
        const x = this.gridX + (point.column - range.start) * this.cellWidth + this.cellWidth / 2;
        const y = this.gridY + point.lane * this.cellHeight + this.cellHeight / 2 + 4 + offsetY;
        if (index === 0) {
          graphics.beginPath();
          graphics.moveTo(x, y);
        } else {
          graphics.lineTo(x, y);
        }
      });
      graphics.strokePath();

      for (const point of visiblePoints) {
        const x = this.gridX + (point.column - range.start) * this.cellWidth + this.cellWidth / 2;
        const y = this.gridY + point.lane * this.cellHeight + this.cellHeight / 2 + 4 + offsetY;
        graphics.fillStyle(COLORS.reward, 0.92).fillCircle(x, y, 5);
      }
    });
  }

  private updateReadout(): void {
    const budget = calculateBuildBudget(this.tile);
    this.budgetText?.setText(`BUILD POINTS ${budget}/${MAX_BUILD_BUDGET}`);
    const toolPrefix = this.layout.mode === 'portrait' ? 'ACTIVE TOOL:' : 'TOOL';
    const usage = getBuilderToolUsage(this.tile, this.tool);
    const usageLabel = usage.limit === null ? '' : ` · ${usage.count}/${usage.limit}`;
    this.toolText?.setText(`${toolPrefix} ${TOOL_META[this.tool].label}${usageLabel}`);
    this.historyText?.setText(`UNDO ${this.undoStack.length} · REDO ${this.redoStack.length}`);
    this.updatePageReadout();
    this.refreshRepairSummary();
  }

  private refreshRepairSummary(selectFirst = false): TileValidationResult {
    const validation = validateCourseTile(this.tile);
    const errors = validation.issues.filter((issue) => issue.severity === 'error');
    this.repairIssues = errors;

    if (errors.length === 0) {
      this.repairIssueIndex = 0;
      this.highlightedIssue = undefined;
      this.repairText?.setText('Safety checks pass. Certify when your design is ready.');
      this.updateActionVisibility(validation);
      return validation;
    }

    if (selectFirst) {
      this.repairIssueIndex = 0;
    } else {
      this.repairIssueIndex = Phaser.Math.Clamp(this.repairIssueIndex, 0, errors.length - 1);
    }

    const selectedIssue =
      selectFirst || this.highlightedIssue ? errors[this.repairIssueIndex] : undefined;
    this.highlightedIssue = this.toIssueHighlight(selectedIssue);
    if (selectedIssue?.column !== undefined) this.revealColumn(selectedIssue.column);
    this.repairText?.setText(
      `${errors.length} fix${errors.length === 1 ? '' : 'es'} needed. Tap NEXT FIX to highlight one.`
    );
    this.updateActionVisibility(validation);
    return validation;
  }

  private selectNextIssue(): void {
    const validation = this.refreshRepairSummary();
    if (validation.ok || this.repairIssues.length === 0) {
      this.safePaths = findFairCleanPathsByEntrance(this.tile);
      this.highlightedIssue = undefined;
      this.renderGrid();
      this.statusText?.setText('CERTIFIED · No repair issues left.');
      this.updateActionVisibility(validation);
      return;
    }

    if (this.highlightedIssue) {
      this.repairIssueIndex = (this.repairIssueIndex + 1) % this.repairIssues.length;
    }
    const issue = this.repairIssues[this.repairIssueIndex];
    if (!issue) return;
    this.highlightedIssue = this.toIssueHighlight(issue);
    if (issue.column !== undefined) this.revealColumn(issue.column);
    this.safePaths = [];
    this.renderGrid();
    this.statusText?.setText(
      `FIX ${this.repairIssueIndex + 1}/${this.repairIssues.length} · ${this.issueLocation(issue)}`
    );
    this.repairText?.setText('Change the highlighted cell, then continue.');
    announceSemanticStatus(
      `Repair ${this.repairIssueIndex + 1} of ${this.repairIssues.length}. ${this.describeIssue(issue)}`
    );
  }

  private eraseHighlightedCell(): void {
    const issue = this.highlightedIssue;
    if (!issue) {
      this.statusText?.setText('Select an issue first, then erase the highlighted cell.');
      return;
    }
    if (isBufferColumn(issue.column, this.tile.width)) {
      this.statusText?.setText(
        'Highlighted connector cells are locked. Fix nearby editable cells.'
      );
      return;
    }
    this.pushUndoState();
    this.tile = setTileCell(this.tile, issue.lane, issue.column, 'road', 'none');
    this.safePaths = [];
    this.clearPostPublishPrompt();
    this.statusText?.setText(
      `Erased lane ${issue.lane + 1}, column ${issue.column + 1}. Recheck the next issue.`
    );
    this.refreshRepairSummary(true);
    this.renderGrid();
    this.updateReadout();
  }

  private toIssueHighlight(issue: ValidationIssue | undefined): IssueHighlight | undefined {
    if (issue?.lane === undefined || issue.column === undefined) return undefined;
    return { lane: issue.lane, column: issue.column };
  }

  private describeIssue(issue: ValidationIssue): string {
    const location =
      issue.lane !== undefined && issue.column !== undefined
        ? ` Lane ${issue.lane + 1}, column ${issue.column + 1}.`
        : '';
    return `${issue.message}${location}`;
  }

  private issueLocation(issue: ValidationIssue): string {
    if (issue.lane === undefined || issue.column === undefined)
      return 'Review the highlighted rule.';
    return `Lane ${issue.lane + 1}, column ${issue.column + 1}.`;
  }

  private certify(): boolean {
    const validation = this.refreshRepairSummary(true);
    this.tile = { ...this.tile, metrics: validation.metrics };
    if (validation.ok) {
      this.safePaths = findFairCleanPathsByEntrance(this.tile);
      this.highlightedIssue = undefined;
      this.renderGrid();
      const warnings = validation.issues.filter((issue) => issue.severity === 'warning');
      this.statusText?.setText(
        this.layout.mode === 'portrait'
          ? `CERTIFIED · All ${this.safePaths.length} starting lanes are safe.`
          : `CERTIFIED · Safe from all ${this.safePaths.length}/${LANE_COUNT} starting lanes · difficulty ${validation.metrics.difficulty}/5${warnings.length ? ` · ${warnings[0]?.message ?? ''}` : ''}`
      );
      if (this.layout.mode === 'portrait') {
        this.repairText?.setText(
          `Difficulty ${validation.metrics.difficulty}/5 · Ready to test or publish.`
        );
      }
      announceSemanticStatus(
        `Tile certified. Safe from all ${this.safePaths.length} starting lanes. Difficulty ${validation.metrics.difficulty} of 5.`
      );
      this.updateActionVisibility(validation);
      return true;
    }
    this.safePaths = [];
    const firstError = this.repairIssues[0];
    this.highlightedIssue = this.toIssueHighlight(firstError);
    if (firstError?.column !== undefined) this.revealColumn(firstError.column);
    this.renderGrid();
    this.statusText?.setText(
      `NOT CERTIFIED · ${this.repairIssues.length} fix${this.repairIssues.length === 1 ? '' : 'es'} needed.`
    );
    this.repairText?.setText('Tap NEXT FIX to highlight the first blocker.');
    if (firstError) announceSemanticStatus(`Tile not certified. ${this.describeIssue(firstError)}`);
    this.updateActionVisibility(validation);
    return false;
  }

  private testRide(): void {
    if (!this.certify()) return;
    this.startResponsiveScene('Runner', {
      previewTile: this.tile,
      mode: 'preview',
      builderReturn: builderRestartData(this.entry, this.tile),
    });
  }

  private async publish(): Promise<void> {
    if (!this.certify()) return;
    this.statusText?.setText('Publishing certified tile…');
    announceSemanticStatus('Publishing your certified tile.');
    try {
      const response = await apiClient.submitTile(this.tile);
      this.tile = response.tile;
      if (session.bootstrap) {
        session.bootstrap = { ...session.bootstrap, todaySubmission: response.tile };
      }
      this.clearHistory();
      this.renderGrid();
      this.updateReadout();
      this.statusText?.setText(
        response.disposition === 'updated'
          ? 'UPDATED TODAY’S TILE · The same daily submission now uses this design.'
          : 'PUBLISHED · Your tile is eligible for a future community route.'
      );
      announceSemanticStatus(
        `${response.disposition === 'updated' ? 'Today’s tile updated.' : 'Tile published.'} You can open your share card, test the tile, ride a Daily Route, or open the Roadbook.`
      );
      this.showPostPublishPrompt(response.tile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Publish failed.';
      this.statusText?.setText(`Practice tile saved only in this session · ${message}`);
      announceSemanticStatus(
        'Publishing is unavailable. Your tile remains in this practice session.'
      );
    }
  }

  private showPostPublishPrompt(tile: CourseTile): void {
    this.clearPostPublishPrompt();
    if (this.layout.mode === 'portrait') {
      this.showPortraitPostPublishPrompt(tile);
      return;
    }
    const panel = this.add.graphics().setDepth(18);
    panel
      .fillStyle(COLORS.paper, 0.97)
      .fillRoundedRect(206, 472, 868, 126, 18)
      .lineStyle(3, COLORS.ink, 0.75)
      .strokeRoundedRect(206, 472, 868, 126, 18);
    const title = this.add
      .text(234, 486, 'PUBLISHED · SHARE OR RIDE', {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setDepth(19);
    const note = this.add
      .text(
        234,
        512,
        'Your player + creator card is ready now. Featured-tile results join it as rides arrive.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '14px',
          color: '#49626d',
          wordWrap: { width: 820 },
        }
      )
      .setDepth(19);

    const creatorCard = createButton(
      this,
      290,
      566,
      150,
      44,
      'MY SHARE CARD',
      () => this.openCreatorCardFromPublish(),
      { fill: COLORS.reward, fontSize: 12, depth: 20 }
    );
    const testTile = createButton(
      this,
      450,
      566,
      150,
      44,
      'TEST MY TILE',
      () =>
        this.startResponsiveScene('Runner', {
          previewTile: tile,
          mode: 'preview',
          builderReturn: builderRestartData(this.entry, tile),
        }),
      { fill: COLORS.secondary, fontSize: 13, depth: 20 }
    );
    const rideToday = createButton(
      this,
      610,
      566,
      150,
      44,
      'RIDE TODAY',
      () => void this.rideToday(),
      { fill: COLORS.primary, fontSize: 13, depth: 20 }
    );
    const tryYesterday = createButton(
      this,
      770,
      566,
      150,
      44,
      'TRY YESTERDAY',
      () => void this.tryYesterday(),
      { fill: COLORS.reward, fontSize: 12, depth: 20 }
    );
    const roadbook = createButton(
      this,
      930,
      566,
      150,
      44,
      'ROADBOOK',
      () => this.startResponsiveScene('Roadbook'),
      { fill: COLORS.muted, fontSize: 13, depth: 20 }
    );
    this.postPublishObjects = [
      panel,
      title,
      note,
      creatorCard,
      testTile,
      rideToday,
      tryYesterday,
      roadbook,
    ];
  }

  private showPortraitPostPublishPrompt(tile: CourseTile): void {
    const panel = this.add.graphics().setDepth(18);
    panel
      .fillStyle(COLORS.paper, 0.98)
      .fillRoundedRect(54, 300, 612, 680, 24)
      .lineStyle(4, COLORS.ink, 0.82)
      .strokeRoundedRect(54, 300, 612, 680, 24);
    const title = this.add
      .text(92, 344, 'PUBLISHED', {
        fontFamily: FONT_FAMILY,
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#243642',
      })
      .setDepth(19);
    const note = this.add
      .text(
        92,
        400,
        'Your tile is saved. Your player + creator card is ready now; featured-tile results join it as rides arrive.',
        {
          fontFamily: FONT_FAMILY,
          fontSize: '20px',
          color: '#49626d',
          wordWrap: { width: 536 },
        }
      )
      .setDepth(19);
    const creatorCard = createButton(
      this,
      360,
      510,
      500,
      72,
      'MY SHARE CARD',
      () => this.openCreatorCardFromPublish(),
      { fill: COLORS.reward, fontSize: 21, depth: 20 }
    );
    const testTile = createButton(
      this,
      360,
      600,
      500,
      72,
      'TEST MY TILE',
      () =>
        this.startResponsiveScene('Runner', {
          previewTile: tile,
          mode: 'preview',
          builderReturn: builderRestartData(this.entry, tile),
        }),
      { fill: COLORS.secondary, fontSize: 21, depth: 20 }
    );
    const rideToday = createButton(
      this,
      360,
      690,
      500,
      72,
      'RIDE TODAY',
      () => void this.rideToday(),
      { fill: COLORS.primary, fontSize: 21, depth: 20 }
    );
    const tryYesterday = createButton(
      this,
      360,
      780,
      500,
      72,
      'TRY YESTERDAY',
      () => void this.tryYesterday(),
      { fill: COLORS.reward, fontSize: 21, depth: 20 }
    );
    const roadbook = createButton(
      this,
      360,
      870,
      500,
      72,
      'ROADBOOK',
      () => this.startResponsiveScene('Roadbook'),
      { fill: COLORS.muted, fontSize: 21, depth: 20 }
    );
    this.postPublishObjects = [
      panel,
      title,
      note,
      creatorCard,
      testTile,
      rideToday,
      tryYesterday,
      roadbook,
    ];
  }

  private clearPostPublishPrompt(): void {
    for (const object of this.postPublishObjects) object.destroy();
    this.postPublishObjects = [];
  }

  private openCreatorCardFromPublish(): void {
    this.paintedCellsThisGesture.clear();
    this.clearPostPublishPrompt();
    this.startResponsiveScene('Creator');
  }

  private createLocalRoute(): RouteBundle {
    return generateRoute({
      tenant: { id: 'local-demo', name: 'Local Demo' },
      dateKey: dateKeyUtc(),
      communityTiles: [],
    });
  }

  private startResponsiveScene(key: string, data?: object): void {
    this.scene.start(key, data);
  }

  private async rideToday(): Promise<void> {
    try {
      const response = await apiClient.dailyRoute();
      session.lastRoute = response.route;
      this.startResponsiveScene('Runner', { route: response.route, mode: 'daily' });
    } catch {
      const route = session.bootstrap?.dailyRoute ?? session.lastRoute ?? this.createLocalRoute();
      session.lastRoute = route;
      this.startResponsiveScene('Runner', { route, mode: 'daily' });
    }
  }

  private async tryYesterday(): Promise<void> {
    try {
      const response = await apiClient.routes();
      const yesterday = dateKeyUtc(new Date(Date.now() - 86_400_000));
      const route =
        response.routes.find((entry) => entry.recipe.dateKey === yesterday) ??
        response.routes.find((entry) => entry.recipe.dateKey < dateKeyUtc());
      if (!route) {
        this.statusText?.setText(
          'No previous Roadbook route yet. Open Roadbook for available runs.'
        );
        return;
      }
      session.lastRoute = route;
      this.startResponsiveScene('Runner', { route, mode: 'random' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Roadbook unavailable.';
      this.statusText?.setText(`Try Yesterday unavailable · ${message}`);
    }
  }
}
