import { describe, expect, it } from 'vitest';
import { DATA_DELETION_CONFIRMATION } from '../../src/client/dataDeletionCopy';

describe('owner data deletion consent copy', () => {
  it('states every irreversible consequence before the second press', () => {
    const copy = DATA_DELETION_CONFIRMATION.toLowerCase();

    expect(copy).toContain('cannot be undone');
    expect(copy).toContain('published tile content');
    expect(copy).toContain('progress');
    expect(copy).toContain('rankings');
    expect(copy).toContain('active runs');
    expect(copy).toContain('current routes may be rebuilt');
    expect(DATA_DELETION_CONFIRMATION.length).toBeLessThanOrEqual(160);
  });
});
