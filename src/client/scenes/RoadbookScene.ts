import * as Phaser from 'phaser';
import { apiClient } from '../api/client';
import { applyViewportLayout, LANDSCAPE_LAYOUT, type ViewportLayout } from '../layout';
import { session } from '../state/session';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton } from '../ui/button';
import { announceSemanticStatus, setSemanticScene } from '../ui/semanticActions';
import { generateRoute } from '../../shared/game/generator';
import { dateKeyUtc } from '../../shared/game/seed';
import type {
  CourseTile,
  LeaderboardEntry,
  RouteBundle,
  TileReportReason,
} from '../../shared/game/types';

const FOUNDING_AUTHOR = 'daily-dash-founders';
const REPORT_REASONS: { reason: TileReportReason; label: string }[] = [
  { reason: 'unfair-layout', label: 'FAIRNESS' },
  { reason: 'broken-route', label: 'BROKEN ROUTE' },
  { reason: 'unsafe-content', label: 'SAFETY' },
  { reason: 'wrong-attribution', label: 'ATTRIBUTION' },
];

const localRoute = (): RouteBundle =>
  generateRoute({
    tenant: { id: 'local-demo', name: 'Local Demo' },
    dateKey: dateKeyUtc(),
    communityTiles: [],
  });

const communityPercent = (route: RouteBundle): number => {
  if (route.tiles.length === 0) return 0;
  const communityTiles = route.tiles.filter((tile) => tile.authorId !== FOUNDING_AUTHOR).length;
  return Math.round((communityTiles / route.tiles.length) * 100);
};

const contributorCount = (route: RouteBundle): number =>
  new Set(
    route.tiles.filter((tile) => tile.authorId !== FOUNDING_AUTHOR).map((tile) => tile.authorId)
  ).size;

export class RoadbookScene extends Phaser.Scene {
  private routes: RouteBundle[] = [];
  private selectedIndex = 0;
  private routeText?: Phaser.GameObjects.Text;
  private detailText?: Phaser.GameObjects.Text;
  private leaderboardText?: Phaser.GameObjects.Text;
  private tileText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private selectedTileIndex = 0;
  private selectedReportReasonIndex = 0;
  private layout: ViewportLayout = LANDSCAPE_LAYOUT;

  constructor() {
    super('Roadbook');
  }

  create(): void {
    setSemanticScene(
      'Roadbook',
      'Choose a saved Daily Route, review its community stops and leaderboard, or ride it again.'
    );
    this.layout = applyViewportLayout(this.scale);
    if (this.layout.mode === 'portrait') this.createPortrait();
    else this.createLandscape();
    void this.loadRoutes();
  }

  private createLandscape(): void {
    this.drawLandscapeFrame();
    this.add.text(76, 54, 'ROADBOOK', {
      fontFamily: FONT_FAMILY,
      fontSize: '50px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.add.text(78, 108, 'Replay community-built Daily Routes and see who set the pace.', {
      fontFamily: FONT_FAMILY,
      fontSize: '19px',
      color: '#49626d',
    });

    this.addSectionLabel(84, 158, 'SAVED ROUTES', '#243642');
    this.addSectionLabel(690, 158, 'ROUTE SNAPSHOT', '#2f7d62');
    this.addSectionLabel(946, 158, 'LEADERBOARD', '#8f6517');
    this.addSectionLabel(690, 370, 'STOP REVIEW', '#243642');

    this.routeText = this.add.text(84, 194, 'Loading routes...', {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      color: '#243642',
      lineSpacing: 8,
      wordWrap: { width: 516 },
    });
    this.detailText = this.add.text(690, 194, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      lineSpacing: 7,
      wordWrap: { width: 222 },
    });
    this.leaderboardText = this.add.text(946, 194, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      lineSpacing: 7,
      wordWrap: { width: 210 },
    });
    this.tileText = this.add.text(690, 406, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#243642',
      lineSpacing: 5,
      wordWrap: { width: 466 },
    });
    this.statusText = this.add
      .text(640, 598, 'Roadbook falls back to local founding routes when Devvit is unavailable.', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#49626d',
        align: 'center',
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5);

    createButton(this, 170, 650, 180, 52, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 17,
    });
    createButton(this, 375, 528, 220, 46, 'PREVIOUS DAY', () => this.selectOffset(-1), {
      fill: COLORS.paper,
      fontSize: 15,
    });
    createButton(this, 545, 528, 100, 46, 'NEXT', () => this.selectOffset(1), {
      fill: COLORS.paper,
      fontSize: 15,
    });
    createButton(this, 585, 650, 390, 60, 'RIDE THIS ROUTE', () => this.playSelected(), {
      fill: COLORS.primary,
      fontSize: 20,
    });
    createButton(this, 1045, 650, 260, 52, 'SURPRISE ME', () => void this.shuffle(), {
      fill: COLORS.secondary,
      fontSize: 17,
    });
    createButton(this, 737, 548, 116, 40, 'NEXT STOP', () => this.selectNextTile(), {
      fill: COLORS.paper,
      fontSize: 12,
    });
    createButton(this, 866, 548, 116, 40, 'REASON', () => this.cycleReportReason(), {
      fill: COLORS.paper,
      fontSize: 12,
    });
    createButton(this, 995, 548, 116, 40, 'REPORT', () => void this.reportSelectedTile(), {
      fill: COLORS.reward,
      fontSize: 12,
    });
    createButton(this, 1124, 548, 116, 40, 'REMOVE', () => void this.removeSelectedTile(), {
      fill: COLORS.warning,
      fontSize: 12,
    });
  }

  private createPortrait(): void {
    this.drawPortraitFrame();
    this.add.text(42, 42, 'ROADBOOK', {
      fontFamily: FONT_FAMILY,
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.add.text(
      44,
      94,
      'Your community route archive. Pick a date, check the pace, ride again.',
      {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#49626d',
        wordWrap: { width: 630 },
      }
    );

    this.addSectionLabel(64, 176, 'SAVED ROUTES', '#243642');
    this.addSectionLabel(64, 456, 'ROUTE SNAPSHOT', '#2f7d62');
    this.addSectionLabel(380, 456, 'LEADERBOARD', '#8f6517');
    this.addSectionLabel(64, 688, 'STOP REVIEW', '#243642');

    this.routeText = this.add.text(64, 210, 'Loading routes...', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      lineSpacing: 5,
      wordWrap: { width: 592 },
    });
    this.detailText = this.add.text(64, 492, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      lineSpacing: 7,
      wordWrap: { width: 258 },
    });
    this.leaderboardText = this.add.text(380, 492, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      lineSpacing: 7,
      wordWrap: { width: 272 },
    });
    this.tileText = this.add.text(64, 724, '', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#243642',
      lineSpacing: 7,
      wordWrap: { width: 592 },
    });
    this.statusText = this.add
      .text(360, 978, 'Roadbook falls back to local founding routes when Devvit is unavailable.', {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        color: '#49626d',
        align: 'center',
        wordWrap: { width: 630 },
      })
      .setOrigin(0.5);

    createButton(this, 240, 390, 330, 48, 'PREVIOUS DAY', () => this.selectOffset(-1), {
      fill: COLORS.paper,
      fontSize: 15,
    });
    createButton(this, 548, 390, 250, 48, 'NEXT DAY', () => this.selectOffset(1), {
      fill: COLORS.paper,
      fontSize: 15,
    });
    createButton(this, 360, 1060, 560, 66, 'RIDE THIS ROUTE', () => this.playSelected(), {
      fill: COLORS.primary,
      fontSize: 21,
    });
    createButton(this, 530, 1152, 280, 56, 'SURPRISE ME', () => void this.shuffle(), {
      fill: COLORS.secondary,
      fontSize: 17,
    });
    createButton(this, 190, 1152, 280, 56, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.muted,
      fontSize: 17,
    });
    createButton(this, 120, 900, 132, 46, 'NEXT STOP', () => this.selectNextTile(), {
      fill: COLORS.paper,
      fontSize: 13,
    });
    createButton(this, 280, 900, 132, 46, 'REASON', () => this.cycleReportReason(), {
      fill: COLORS.paper,
      fontSize: 13,
    });
    createButton(this, 440, 900, 132, 46, 'REPORT', () => void this.reportSelectedTile(), {
      fill: COLORS.reward,
      fontSize: 13,
    });
    createButton(this, 600, 900, 132, 46, 'REMOVE', () => void this.removeSelectedTile(), {
      fill: COLORS.warning,
      fontSize: 13,
      semanticLabel: 'Remove selected stop from this route',
    });
  }

  private async loadRoutes(): Promise<void> {
    try {
      const response = await apiClient.routes();
      this.routes = response.routes.length > 0 ? response.routes : [localRoute()];
      this.statusText?.setText(`Loaded ${this.routes.length} saved Daily Route(s).`);
      announceSemanticStatus(`Roadbook loaded with ${this.routes.length} saved Daily Routes.`);
    } catch (error) {
      const route = session.bootstrap?.dailyRoute ?? session.lastRoute ?? localRoute();
      this.routes = [route];
      const message = error instanceof Error ? error.message : 'Server unavailable';
      this.statusText?.setText(`Showing a practice route · ${message}`);
      announceSemanticStatus('Saved routes are unavailable. Showing a practice route.');
    }
    this.selectedIndex = 0;
    this.selectedTileIndex = 0;
    this.renderRoutes();
    await this.loadLeaderboard();
  }

  private renderRoutes(): void {
    const visibleRoutes =
      this.layout.mode === 'portrait'
        ? this.routes.slice(
            Math.max(0, Math.min(this.selectedIndex - 1, this.routes.length - 3)),
            Math.max(0, Math.min(this.selectedIndex - 1, this.routes.length - 3)) + 3
          )
        : this.routes;
    const visibleStart = this.routes.indexOf(visibleRoutes[0] ?? (this.routes[0] as RouteBundle));
    const lines = visibleRoutes.map((route, visibleIndex) => {
      const index = visibleStart + visibleIndex;
      const marker = index === this.selectedIndex ? '>' : ' ';
      const recipe = route.recipe;
      return `${marker} ${recipe.dateKey}\n  ${communityPercent(route)}% community-built · ${contributorCount(route)} creator${contributorCount(route) === 1 ? '' : 's'}`;
    });
    this.routeText?.setText(lines.join('\n\n'));

    const selected = this.routes[this.selectedIndex];
    if (!selected) {
      this.detailText?.setText('No route selected.');
      this.tileText?.setText('No tile selected.');
      return;
    }
    this.selectedTileIndex = Phaser.Math.Clamp(
      this.selectedTileIndex,
      0,
      Math.max(0, selected.tiles.length - 1)
    );
    const contributors = contributorCount(selected);
    this.detailText?.setText(
      [
        `DATE  ${selected.recipe.dateKey}`,
        `r/${selected.recipe.tenantName}`,
        `${selected.tiles.length} stops`,
        `${communityPercent(selected)}% community-built`,
        `${contributors} contributor${contributors === 1 ? '' : 's'}`,
      ].join('\n')
    );
    this.renderTileInfo(selected);
  }

  private selectOffset(offset: -1 | 1): void {
    if (this.routes.length === 0) return;
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + offset, 0, this.routes.length);
    this.selectedTileIndex = 0;
    this.renderRoutes();
    void this.loadLeaderboard();
  }

  private renderTileInfo(route: RouteBundle): void {
    const tile = route.tiles[this.selectedTileIndex];
    if (!tile) {
      this.tileText?.setText('No stop selected.');
      return;
    }
    const reason = REPORT_REASONS[this.selectedReportReasonIndex]?.label ?? 'FAIRNESS';
    this.tileText?.setText(
      [
        `STOP ${this.selectedTileIndex + 1} OF ${route.tiles.length}`,
        `Source: ${this.tileSource(tile)}`,
        `Course version: ${route.recipe.revision}`,
        `Report reason: ${reason}`,
        'Reports go privately to community moderators.',
      ].join('\n')
    );
  }

  private tileSource(tile: CourseTile): string {
    return tile.authorId === FOUNDING_AUTHOR ? 'Daily Dash fallback' : `u/${tile.authorName}`;
  }

  private selectNextTile(): void {
    const selected = this.routes[this.selectedIndex];
    if (!selected || selected.tiles.length === 0) return;
    this.selectedTileIndex = Phaser.Math.Wrap(this.selectedTileIndex + 1, 0, selected.tiles.length);
    this.renderRoutes();
  }

  private cycleReportReason(): void {
    this.selectedReportReasonIndex = Phaser.Math.Wrap(
      this.selectedReportReasonIndex + 1,
      0,
      REPORT_REASONS.length
    );
    this.renderRoutes();
  }

  private async reportSelectedTile(): Promise<void> {
    const selected = this.routes[this.selectedIndex];
    const tile = selected?.tiles[this.selectedTileIndex];
    const reason = REPORT_REASONS[this.selectedReportReasonIndex]?.reason;
    if (!selected || !tile || !reason) return;
    try {
      await apiClient.reportTile({
        routeId: selected.recipe.id,
        routeRevision: selected.recipe.revision,
        tileId: tile.id,
        reason,
      });
      this.statusText?.setText('Report saved for moderator review.');
      announceSemanticStatus('Report saved privately for community moderator review.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Report failed.';
      this.statusText?.setText(`Report unavailable · ${message}`);
    }
  }

  private async removeSelectedTile(): Promise<void> {
    const selected = this.routes[this.selectedIndex];
    const tile = selected?.tiles[this.selectedTileIndex];
    if (!selected || !tile) return;
    try {
      const response = await apiClient.removeRouteTile(tile.id, {
        routeId: selected.recipe.id,
        routeRevision: selected.recipe.revision,
      });
      this.statusText?.setText(`Tile removed. Repaired ${response.repairedRoutes} route(s).`);
      announceSemanticStatus(
        `Tile removed. ${response.repairedRoutes} saved route${response.repairedRoutes === 1 ? '' : 's'} repaired.`
      );
      await this.loadRoutes();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Removal failed.';
      this.statusText?.setText(`Removal unavailable · ${message}`);
    }
  }

  private async loadLeaderboard(): Promise<void> {
    const selected = this.routes[this.selectedIndex];
    if (!selected) {
      this.leaderboardText?.setText('No route selected.');
      return;
    }
    try {
      const response = await apiClient.leaderboard(selected.recipe.id, selected.recipe.revision);
      this.leaderboardText?.setText(this.formatLeaderboard(response.entries));
    } catch {
      this.leaderboardText?.setText(`No ranked rides yet.\nPractice results stay on this device.`);
    }
  }

  private formatLeaderboard(entries: LeaderboardEntry[]): string {
    if (entries.length === 0) return 'No ranked rides yet.';
    return entries
      .slice(0, 6)
      .map((entry) => `${entry.rank}. ${entry.username} · ${entry.score.toLocaleString()}`)
      .join('\n');
  }

  private playSelected(): void {
    const selected = this.routes[this.selectedIndex] ?? localRoute();
    session.lastRoute = selected;
    this.scene.start('Runner', { route: selected, mode: 'random' });
  }

  private async shuffle(): Promise<void> {
    try {
      const response = await apiClient.randomRoute();
      session.lastRoute = response.route;
      this.scene.start('Runner', { route: response.route, mode: 'random' });
    } catch {
      this.playSelected();
    }
  }

  private drawLandscapeFrame(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(40, 34, 1200, 650, 30);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(40, 34, 1200, 650, 30);
    graphics.fillStyle(COLORS.sky, 0.72).fillRoundedRect(64, 146, 560, 430, 18);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(64, 146, 560, 430, 18);
    graphics.fillStyle(COLORS.white, 0.72).fillRoundedRect(668, 146, 244, 196, 16);
    graphics.lineStyle(4, COLORS.secondary, 1).strokeRoundedRect(668, 146, 244, 196, 16);
    graphics.fillStyle(COLORS.white, 0.72).fillRoundedRect(928, 146, 248, 196, 16);
    graphics.lineStyle(4, COLORS.reward, 1).strokeRoundedRect(928, 146, 248, 196, 16);
    graphics.fillStyle(COLORS.white, 0.8).fillRoundedRect(668, 358, 508, 218, 16);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(668, 358, 508, 218, 16);
    graphics.fillStyle(COLORS.warning, 0.12).fillRoundedRect(676, 366, 492, 34, 10);
  }

  private drawPortraitFrame(): void {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(18, 18, 684, 1244, 28);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(18, 18, 684, 1244, 28);
    graphics.fillStyle(COLORS.sky, 0.72).fillRoundedRect(44, 156, 632, 266, 20);
    graphics.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(44, 156, 632, 266, 20);
    graphics.lineStyle(1, COLORS.ink, 0.45).strokeRoundedRect(52, 164, 616, 250, 15);
    graphics.fillStyle(COLORS.white, 0.72).fillRoundedRect(44, 440, 300, 210, 18);
    graphics.lineStyle(4, COLORS.secondary, 1).strokeRoundedRect(44, 440, 300, 210, 18);
    graphics.lineStyle(1, COLORS.secondary, 0.75).strokeRoundedRect(52, 448, 284, 194, 13);
    graphics.fillStyle(COLORS.white, 0.72).fillRoundedRect(360, 440, 316, 210, 18);
    graphics.lineStyle(4, COLORS.reward, 1).strokeRoundedRect(360, 440, 316, 210, 18);
    graphics.lineStyle(1, COLORS.reward, 0.75).strokeRoundedRect(368, 448, 300, 194, 13);
    graphics.fillStyle(COLORS.white, 0.82).fillRoundedRect(44, 668, 632, 280, 18);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(44, 668, 632, 280, 18);
    graphics.fillStyle(COLORS.warning, 0.12).fillRoundedRect(52, 676, 616, 42, 11);
    graphics.lineStyle(2, COLORS.ink, 0.14).lineBetween(64, 1018, 656, 1018);
  }

  private addSectionLabel(x: number, y: number, label: string, color: string): void {
    this.add.text(x, y, label, {
      fontFamily: FONT_FAMILY,
      fontSize: '17px',
      fontStyle: 'bold',
      color,
    });
  }
}
