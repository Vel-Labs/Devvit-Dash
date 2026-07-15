import * as Phaser from 'phaser';
import { medalForScore } from '../../shared/game/scoring';
import { formatDistanceKilometers } from '../../shared/game/runOutcome';
import { flattenRouteColumns } from '../../shared/game/tile';
import type { RouteBundle, RunResult } from '../../shared/game/types';
import type { BuilderEntryData } from '../builderReentry';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton } from '../ui/button';
import { applyViewportLayout } from '../layout';

type ResultSceneData = {
  result: RunResult;
  route: RouteBundle;
  mode: 'daily' | 'random' | 'preview';
  persistence: 'ranked' | 'practice';
  persistenceMessage: string;
  builderReturn?: BuilderEntryData;
};

export class ResultScene extends Phaser.Scene {
  private dataValue?: ResultSceneData;

  constructor() {
    super('Result');
  }

  init(data: ResultSceneData): void {
    this.dataValue = data;
  }

  create(): void {
    const data = this.dataValue;
    if (!data) {
      this.scene.start('Menu');
      return;
    }

    if (applyViewportLayout(this.scale).mode === 'portrait') {
      this.createPortrait(data);
      return;
    }

    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(110, 50, 1060, 620, 30);
    graphics.lineStyle(5, COLORS.ink, 1).strokeRoundedRect(110, 50, 1060, 620, 30);

    const successful = data.result.completed;
    const medal = medalForScore(data.result.score);
    this.add
      .text(640, 90, successful ? 'DELIVERY COMPLETE' : 'PACKAGE LOST', {
        fontFamily: FONT_FAMILY,
        fontSize: '52px',
        fontStyle: 'bold',
        color: successful ? '#243642' : '#b83d37',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 154, `${medal.toUpperCase()} MEDAL`, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        fontStyle: 'bold',
        color:
          medal === 'gold'
            ? '#b87910'
            : medal === 'silver'
              ? '#68777c'
              : medal === 'bronze'
                ? '#995f32'
                : '#8d9a9d',
      })
      .setOrigin(0.5);

    const ranked = data.persistence === 'ranked';
    graphics
      .fillStyle(ranked ? COLORS.secondary : COLORS.warning, ranked ? 0.24 : 0.18)
      .fillRoundedRect(365, 190, 550, 38, 12);
    graphics
      .lineStyle(2, ranked ? COLORS.secondary : COLORS.warning, 0.85)
      .strokeRoundedRect(365, 190, 550, 38, 12);
    this.add
      .text(640, 199, data.persistenceMessage, {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        fontStyle: 'bold',
        color: ranked ? '#2f6f56' : '#8f332d',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    const seconds = (data.result.elapsedMs / 1000).toFixed(2);
    const totalColumns = flattenRouteColumns(data.route.tiles).length;
    const rows = [
      ['SCORE', data.result.score.toLocaleString()],
      ['TIME', `${seconds}s`],
      ['DISTANCE', formatDistanceKilometers(data.result.distanceColumns, totalColumns)],
      ['PACKAGE DAMAGE', `${data.result.damageTaken}/3`],
      ['PARCEL STAMPS', String(data.result.parcelsCollected)],
      ['BOOSTS', String(data.result.boostsTriggered)],
      ['ROUTE', data.route.recipe.dateKey],
    ];

    rows.forEach(([label, value], index) => {
      const y = 244 + index * 46;
      this.add.text(270, y, label ?? '', {
        fontFamily: FONT_FAMILY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#49626d',
      });
      this.add
        .text(1005, y, value ?? '', {
          fontFamily: FONT_FAMILY,
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(1, 0);
      graphics.lineStyle(2, COLORS.ink, 0.14).lineBetween(270, y + 37, 1005, y + 37);
    });

    const authored = data.route.tiles.filter(
      (tile) => tile.authorId !== 'daily-dash-founders'
    ).length;
    this.add
      .text(
        640,
        575,
        `${authored}/${data.route.tiles.length} route tiles were community-authored`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '19px',
          color: '#49626d',
        }
      )
      .setOrigin(0.5);

    createButton(
      this,
      330,
      625,
      300,
      64,
      data.mode === 'preview' ? 'BACK TO BUILDER' : 'RIDE AGAIN',
      () => {
        if (data.mode === 'preview') {
          this.scene.start('Builder', data.builderReturn ?? {});
        } else {
          this.scene.start('Runner', { route: data.route, mode: data.mode });
        }
      },
      { fill: COLORS.secondary, fontSize: 20 }
    );

    createButton(this, 640, 625, 250, 64, 'MENU', () => this.scene.start('Menu'), {
      fill: COLORS.primary,
      fontSize: 20,
    });

    createButton(this, 950, 625, 300, 64, 'ACHIEVEMENTS', () => this.scene.start('Achievements'), {
      fill: COLORS.reward,
      fontSize: 20,
    });
  }

  private createPortrait(data: ResultSceneData): void {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(22, 22, 676, 1236, 28);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(22, 22, 676, 1236, 28);

    const successful = data.result.completed;
    const medal = medalForScore(data.result.score);
    this.add
      .text(360, 82, successful ? 'DELIVERY COMPLETE' : 'PACKAGE LOST', {
        fontFamily: FONT_FAMILY,
        fontSize: '43px',
        fontStyle: 'bold',
        color: successful ? '#243642' : '#b83d37',
        align: 'center',
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5);
    this.add
      .text(360, 158, `${medal.toUpperCase()} MEDAL`, {
        fontFamily: FONT_FAMILY,
        fontSize: '28px',
        fontStyle: 'bold',
        color:
          medal === 'gold'
            ? '#b87910'
            : medal === 'silver'
              ? '#68777c'
              : medal === 'bronze'
                ? '#995f32'
                : '#8d9a9d',
      })
      .setOrigin(0.5);

    const ranked = data.persistence === 'ranked';
    graphics
      .fillStyle(ranked ? COLORS.secondary : COLORS.warning, ranked ? 0.24 : 0.18)
      .fillRoundedRect(82, 198, 556, 48, 12);
    graphics
      .lineStyle(2, ranked ? COLORS.secondary : COLORS.warning, 0.85)
      .strokeRoundedRect(82, 198, 556, 48, 12);
    this.add
      .text(360, 208, data.persistenceMessage, {
        fontFamily: FONT_FAMILY,
        fontSize: '16px',
        fontStyle: 'bold',
        color: ranked ? '#2f6f56' : '#8f332d',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);

    const seconds = (data.result.elapsedMs / 1000).toFixed(2);
    const totalColumns = flattenRouteColumns(data.route.tiles).length;
    const rows = [
      ['SCORE', data.result.score.toLocaleString()],
      ['TIME', `${seconds}s`],
      ['DISTANCE', formatDistanceKilometers(data.result.distanceColumns, totalColumns)],
      ['PACKAGE DAMAGE', `${data.result.damageTaken}/3`],
      ['PARCEL STAMPS', String(data.result.parcelsCollected)],
      ['BOOSTS', String(data.result.boostsTriggered)],
      ['ROUTE', data.route.recipe.dateKey],
    ];

    rows.forEach(([label, value], index) => {
      const y = 270 + index * 74;
      this.add.text(74, y, label ?? '', {
        fontFamily: FONT_FAMILY,
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#49626d',
      });
      this.add
        .text(646, y, value ?? '', {
          fontFamily: FONT_FAMILY,
          fontSize: '23px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(1, 0);
      graphics.lineStyle(2, COLORS.ink, 0.14).lineBetween(74, y + 48, 646, y + 48);
    });

    const authored = data.route.tiles.filter(
      (tile) => tile.authorId !== 'daily-dash-founders'
    ).length;
    this.add
      .text(
        360,
        810,
        `${authored}/${data.route.tiles.length} route tiles were community-authored`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: '19px',
          color: '#49626d',
          align: 'center',
          wordWrap: { width: 600 },
        }
      )
      .setOrigin(0.5);

    createButton(
      this,
      360,
      945,
      560,
      72,
      data.mode === 'preview' ? 'BACK TO BUILDER' : 'RIDE AGAIN',
      () => {
        if (data.mode === 'preview') this.scene.start('Builder', data.builderReturn ?? {});
        else this.scene.start('Runner', { route: data.route, mode: data.mode });
      },
      { fill: COLORS.secondary, fontSize: 21 }
    );
    createButton(this, 360, 1045, 560, 72, 'MENU', () => this.scene.start('Menu'), {
      fill: COLORS.primary,
      fontSize: 21,
    });
    createButton(this, 360, 1145, 560, 72, 'ACHIEVEMENTS', () => this.scene.start('Achievements'), {
      fill: COLORS.reward,
      fontSize: 21,
    });
  }
}
