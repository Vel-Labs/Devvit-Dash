import { describe, expect, it } from 'vitest';
import {
  builderPageStartForColumn,
  getBuilderPageRange,
  getRunnerViewportGeometry,
  getViewportLayout,
  isCompactLandscapeViewport,
  mapVisibleBuilderColumn,
} from '../../src/client/layout';

describe('client viewport layout', () => {
  it('selects a tall portrait stage for a phone', () => {
    expect(getViewportLayout(390, 844)).toMatchObject({
      mode: 'portrait',
      width: 720,
      height: 1280,
    });
  });

  it('selects the established landscape stage for landscape phone and desktop', () => {
    expect(getViewportLayout(844, 390).mode).toBe('landscape');
    expect(getViewportLayout(1440, 900)).toMatchObject({
      mode: 'landscape',
      width: 1280,
      height: 720,
    });
  });

  it('handles invalid dimensions without producing an invalid profile', () => {
    expect(getViewportLayout(0, Number.NaN)).toMatchObject({
      mode: 'landscape',
      width: 1280,
      height: 720,
    });
  });

  it('gates short landscape editing without classifying portrait or desktop as compact', () => {
    expect(isCompactLandscapeViewport(844, 390)).toBe(true);
    expect(isCompactLandscapeViewport(844, 590)).toBe(true);
    expect(isCompactLandscapeViewport(390, 844)).toBe(false);
    expect(isCompactLandscapeViewport(1280, 720)).toBe(false);
    expect(isCompactLandscapeViewport(1440, 900)).toBe(false);
  });

  it('derives the compact boundary from fitted scale and the touch-target floor', () => {
    expect(isCompactLandscapeViewport(1042, 720)).toBe(true);
    expect(isCompactLandscapeViewport(1043, 720)).toBe(false);
  });
});

describe('responsive Runner geometry', () => {
  it('uses the full portrait stage instead of shrinking the landscape playfield', () => {
    const portrait = getRunnerViewportGeometry('portrait');
    expect(portrait.playfield.right).toBeLessThanOrEqual(720);
    expect(portrait.playfield.bottom).toBeGreaterThan(900);
    expect(portrait.laneYs[2] - portrait.laneYs[0]).toBeGreaterThan(400);
    expect(portrait.visibleColumns).toBeLessThan(14);
  });

  it('preserves the established landscape course geometry', () => {
    expect(getRunnerViewportGeometry('landscape')).toMatchObject({
      laneYs: [224, 356, 488],
      playerX: 250,
      columnWidth: 96,
      visibleColumns: 14,
    });
  });
});

describe('portrait Builder pages', () => {
  it('returns three six-column pages for an eighteen-column tile', () => {
    expect(getBuilderPageRange('portrait', 18, 0)).toEqual({
      start: 0,
      endExclusive: 6,
      count: 6,
    });
    expect(getBuilderPageRange('portrait', 18, 6)).toEqual({
      start: 6,
      endExclusive: 12,
      count: 6,
    });
    expect(getBuilderPageRange('portrait', 18, 12)).toEqual({
      start: 12,
      endExclusive: 18,
      count: 6,
    });
  });

  it('clamps requests to the first and last complete page', () => {
    expect(getBuilderPageRange('portrait', 18, -20).start).toBe(0);
    expect(getBuilderPageRange('portrait', 18, 200).start).toBe(12);
  });

  it('maps visible cells to absolute tile columns', () => {
    const range = getBuilderPageRange('portrait', 18, 6);
    expect(mapVisibleBuilderColumn(range, 0)).toBe(6);
    expect(mapVisibleBuilderColumn(range, 5)).toBe(11);
    expect(mapVisibleBuilderColumn(range, 6)).toBeUndefined();
  });

  it('opens the page containing a validation issue', () => {
    expect(builderPageStartForColumn('portrait', 18, 2)).toBe(0);
    expect(builderPageStartForColumn('portrait', 18, 9)).toBe(6);
    expect(builderPageStartForColumn('portrait', 18, 17)).toBe(12);
  });

  it('keeps the complete tile visible in landscape', () => {
    expect(getBuilderPageRange('landscape', 18, 12)).toEqual({
      start: 0,
      endExclusive: 18,
      count: 18,
    });
  });
});
