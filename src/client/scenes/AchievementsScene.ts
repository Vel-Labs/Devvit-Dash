import * as Phaser from 'phaser';
import { ACHIEVEMENTS } from '../../shared/game/achievements';
import type { PlayerProfile } from '../../shared/game/types';
import { session } from '../state/session';
import { COLORS, FONT_FAMILY } from '../theme';
import { createButton, setButtonEnabled, setButtonLabel } from '../ui/button';
import { apiClient } from '../api/client';
import { DATA_DELETION_CONFIRMATION } from '../dataDeletionCopy';
import { announceSemanticStatus, setSemanticScene } from '../ui/semanticActions';
import { applyViewportLayout, LANDSCAPE_LAYOUT, type ViewportLayout } from '../layout';

const statLabel = (
  profile: PlayerProfile | undefined,
  stat: keyof PlayerProfile['stats']
): string => String(profile?.stats[stat] ?? 0);

export class AchievementsScene extends Phaser.Scene {
  private deleteConfirmationArmed = false;
  private dataDeleted = false;
  private deleteButton: Phaser.GameObjects.Container | undefined;
  private deleteStatus: Phaser.GameObjects.Text | undefined;
  private layout: ViewportLayout = LANDSCAPE_LAYOUT;

  constructor() {
    super('Achievements');
  }

  create(): void {
    setSemanticScene(
      'Achievements',
      'Review milestones and saved progress. Signed-in players can also request deletion of their Daily Dash data.'
    );
    this.layout = applyViewportLayout(this.scale);
    if (this.layout.mode === 'portrait') {
      this.createPortrait();
      return;
    }
    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(38, 30, 1204, 660, 30);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(38, 30, 1204, 660, 30);

    this.add.text(78, 60, 'ACHIEVEMENT POSTCARD', {
      fontFamily: FONT_FAMILY,
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.add.text(
      80,
      111,
      'Ranked saves advance fair-building, clean-delivery, and community-impact progress.',
      {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#49626d',
      }
    );

    const profile = session.profile;
    const unlocked = new Set(profile?.unlocked.map((entry) => entry.id) ?? []);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 80 + column * 575;
      const y = 165 + row * 105;
      const isUnlocked = unlocked.has(achievement.id);
      graphics
        .fillStyle(isUnlocked ? COLORS.reward : COLORS.white, isUnlocked ? 0.7 : 0.52)
        .fillRoundedRect(x, y, 535, 83, 16);
      graphics
        .lineStyle(3, COLORS.ink, isUnlocked ? 0.86 : 0.24)
        .strokeRoundedRect(x, y, 535, 83, 16);
      graphics
        .fillStyle(isUnlocked ? COLORS.secondary : COLORS.muted, 1)
        .fillCircle(x + 40, y + 41, 23);
      this.add
        .text(x + 40, y + 40, isUnlocked ? '✓' : '·', {
          fontFamily: FONT_FAMILY,
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(0.5);
      this.add.text(x + 78, y + 12, achievement.name.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#243642',
      });
      this.add.text(x + 78, y + 39, achievement.description, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#49626d',
        wordWrap: { width: 340 },
      });
      this.add
        .text(x + 497, y + 27, `${statLabel(profile, achievement.stat)}/${achievement.target}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(1, 0);
    });

    this.add.text(
      80,
      580,
      profile
        ? `Best streak ${profile.stats.bestStreak} · ${profile.stats.uniqueRoutesCompleted} unique routes · ${profile.stats.tilesCertified} certified tiles`
        : 'Practice mode: sign in through Reddit playtest to persist progress.',
      {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#49626d',
      }
    );

    this.deleteStatus = this.add
      .text(670, 640, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#8f332d',
        align: 'center',
        wordWrap: { width: 560 },
      })
      .setOrigin(0.5);
    if (profile) this.renderDeleteButton();

    createButton(this, 1090, 640, 240, 58, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.primary,
      fontSize: 20,
    });
  }

  private createPortrait(): void {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.paper, 1).fillRoundedRect(20, 20, 680, 1240, 28);
    graphics.lineStyle(4, COLORS.ink, 1).strokeRoundedRect(20, 20, 680, 1240, 28);

    this.add.text(42, 42, 'ACHIEVEMENT POSTCARD', {
      fontFamily: FONT_FAMILY,
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#243642',
    });
    this.add.text(44, 94, 'Ranked saves advance achievement progress; practice results do not.', {
      fontFamily: FONT_FAMILY,
      fontSize: '19px',
      color: '#49626d',
      wordWrap: { width: 630 },
    });

    const profile = session.profile;
    const unlocked = new Set(profile?.unlocked.map((entry) => entry.id) ?? []);
    ACHIEVEMENTS.forEach((achievement, index) => {
      const x = 42;
      const y = 148 + index * 100;
      const isUnlocked = unlocked.has(achievement.id);
      graphics
        .fillStyle(isUnlocked ? COLORS.reward : COLORS.white, isUnlocked ? 0.7 : 0.52)
        .fillRoundedRect(x, y, 636, 82, 16);
      graphics
        .lineStyle(3, COLORS.ink, isUnlocked ? 0.86 : 0.24)
        .strokeRoundedRect(x, y, 636, 82, 16);
      graphics
        .fillStyle(isUnlocked ? COLORS.secondary : COLORS.muted, 1)
        .fillCircle(x + 38, y + 41, 22);
      this.add
        .text(x + 38, y + 40, isUnlocked ? '✓' : '·', {
          fontFamily: FONT_FAMILY,
          fontSize: '27px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(0.5);
      this.add.text(x + 74, y + 11, achievement.name.toUpperCase(), {
        fontFamily: FONT_FAMILY,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#243642',
      });
      this.add.text(x + 74, y + 38, achievement.description, {
        fontFamily: FONT_FAMILY,
        fontSize: '14px',
        color: '#49626d',
        wordWrap: { width: 420 },
      });
      this.add
        .text(x + 604, y + 27, `${statLabel(profile, achievement.stat)}/${achievement.target}`, {
          fontFamily: FONT_FAMILY,
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#243642',
        })
        .setOrigin(1, 0);
    });

    this.add.text(
      44,
      958,
      profile
        ? `Best streak ${profile.stats.bestStreak} · ${profile.stats.uniqueRoutesCompleted} unique routes · ${profile.stats.tilesCertified} certified tiles`
        : 'Practice mode: sign in through Reddit playtest to persist progress.',
      {
        fontFamily: FONT_FAMILY,
        fontSize: '18px',
        color: '#49626d',
        wordWrap: { width: 630 },
      }
    );

    this.deleteStatus = this.add
      .text(360, 1062, '', {
        fontFamily: FONT_FAMILY,
        fontSize: '15px',
        color: '#8f332d',
        align: 'center',
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5);
    if (profile) this.renderDeleteButton();

    createButton(this, 560, 1188, 240, 58, 'BACK', () => this.scene.start('Menu'), {
      fill: COLORS.primary,
      fontSize: 20,
    });
  }

  private renderDeleteButton(): void {
    if (this.deleteButton) {
      const background = this.deleteButton.getAt<Phaser.GameObjects.GameObject>(1);
      const label = this.deleteButton.getAt<Phaser.GameObjects.GameObject>(2);
      if (background instanceof Phaser.GameObjects.Rectangle) {
        background.setFillStyle(
          this.dataDeleted ? COLORS.muted : this.deleteConfirmationArmed ? 0xf2a69e : COLORS.white
        );
      }
      if (label instanceof Phaser.GameObjects.Text) {
        setButtonLabel(
          this.deleteButton,
          this.dataDeleted
            ? 'DATA DELETED'
            : this.deleteConfirmationArmed
              ? 'CONFIRM DELETE'
              : 'DELETE MY DATA'
        );
      }
      return;
    }
    this.deleteButton = createButton(
      this,
      this.layout.mode === 'portrait' ? 188 : 225,
      this.layout.mode === 'portrait' ? 1188 : 640,
      300,
      58,
      this.deleteConfirmationArmed ? 'CONFIRM DELETE' : 'DELETE MY DATA',
      () => void this.requestDataDeletion(),
      {
        fill: this.deleteConfirmationArmed ? 0xf2a69e : COLORS.white,
        fontSize: 18,
      }
    );
  }

  private async requestDataDeletion(): Promise<void> {
    if (!this.deleteConfirmationArmed) {
      this.deleteConfirmationArmed = true;
      this.deleteStatus?.setText(DATA_DELETION_CONFIRMATION);
      announceSemanticStatus(DATA_DELETION_CONFIRMATION);
      this.renderDeleteButton();
      return;
    }

    if (this.deleteButton) setButtonEnabled(this.deleteButton, false);
    this.deleteStatus?.setText('Deleting your Daily Dash data…');
    try {
      const result = await apiClient.deleteMyData();
      delete session.profile;
      if (session.bootstrap) session.bootstrap = { ...session.bootstrap, profile: null };
      this.dataDeleted = true;
      this.deleteConfirmationArmed = false;
      this.renderDeleteButton();
      this.deleteStatus?.setText(
        `Deleted ${result.tilesDeleted} tile(s), repaired ${result.routesRepaired} route(s), and removed your progress.`
      );
      announceSemanticStatus('Your Daily Dash data has been deleted.');
    } catch (caught) {
      this.deleteConfirmationArmed = false;
      const message = caught instanceof Error ? caught.message : 'Data deletion failed.';
      this.deleteStatus?.setText(message);
      if (this.deleteButton) setButtonEnabled(this.deleteButton, true);
      announceSemanticStatus(`Data deletion failed. ${message}`);
      this.renderDeleteButton();
    }
  }
}
