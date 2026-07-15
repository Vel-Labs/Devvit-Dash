import type { CreatorOutcomeResponse } from '../shared/api';

const METERS_PER_ROUTE_COLUMN = 10;

const CARD_ASSETS = {
  seal: '/assets/share/route-passport-seal.png',
  cleanParcel: '/assets/share/clean-delivery-parcel.png',
  failedParcel: '/assets/share/failed-delivery-parcel.png',
  background: '/assets/kenney/backgrounds/blue-grass.png',
  featured: '/assets/kenney/items/coin-gold.png',
} as const;

export type CreatorCardModel = {
  creatorLabel: string;
  communityLabel: string;
  profileUrl?: string;
  dailyRouteDateKey: string;
  distanceColumnsTraveled: number;
  distanceLabel: string;
  featuredTiles: number;
  cleanDeliveries: number;
  failedDeliveries: number;
};

const safeSegment = (value: string, fallback: string): string => {
  const normalized = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, 40);
  return normalized || fallback;
};

const nonNegative = (value: number): number => Math.max(0, Math.floor(value));

const plural = (value: number, singular: string, pluralForm = `${singular}s`): string =>
  `${value} ${value === 1 ? singular : pluralForm}`;

export const formatLifetimeDistance = (distanceColumns: number): string => {
  const kilometers = (nonNegative(distanceColumns) * METERS_PER_ROUTE_COLUMN) / 1_000;
  return `${kilometers
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')} KM`;
};

export const createCreatorCardModel = (outcome: CreatorOutcomeResponse): CreatorCardModel => {
  const stats = outcome.profile.stats;
  const distanceColumnsTraveled = nonNegative(stats.distanceColumnsTraveled);
  return {
    creatorLabel: `u/${safeSegment(outcome.creatorName, 'creator')}`,
    communityLabel: `r/${safeSegment(outcome.communityName.replace(/^r\//i, ''), 'community')}`,
    ...(outcome.profileUrl ? { profileUrl: outcome.profileUrl } : {}),
    dailyRouteDateKey: outcome.dailyRoute.recipe.dateKey,
    distanceColumnsTraveled,
    distanceLabel: formatLifetimeDistance(distanceColumnsTraveled),
    featuredTiles: nonNegative(stats.tilesFeatured),
    cleanDeliveries: nonNegative(stats.cleanRuns),
    failedDeliveries: nonNegative(stats.failedDeliveries),
  };
};

export const createCreatorShareText = (model: CreatorCardModel): string =>
  `My Daily Dash Route Passport in ${model.communityLabel}: ${model.distanceLabel.toLowerCase()} traveled, ${plural(
    model.featuredTiles,
    'featured tile'
  )}, ${plural(model.cleanDeliveries, 'clean delivery', 'clean deliveries')}, and ${plural(
    model.failedDeliveries,
    'failed delivery',
    'failed deliveries'
  )}. Ride the ${model.dailyRouteDateKey} Daily Route from this post. Build today. Ride forever.`;

export const createCreatorShareSheetOptions = (
  model: CreatorCardModel
): { title: string; text: string; data: string } => {
  const text = createCreatorShareText(model);
  return { title: 'My Daily Dash Route Passport', text, data: text };
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
};

const loadImage = async (source: string): Promise<HTMLImageElement> =>
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Share-card asset failed to load: ${source}`));
    image.src = source;
  });

const drawCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(
    image,
    (image.width - sourceWidth) / 2,
    (image.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height
  );
};

type PassportStat = {
  label: string;
  value: string;
  accent: string;
  asset: HTMLImageElement;
};

const drawPassportStat = (
  context: CanvasRenderingContext2D,
  stat: PassportStat,
  x: number,
  y: number,
  width: number,
  height: number
): void => {
  roundedRect(context, x, y, width, height, 22);
  context.fillStyle = '#fff7df';
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = stat.accent;
  context.stroke();
  context.setLineDash([15, 10]);
  context.lineWidth = 3;
  roundedRect(context, x + 14, y + 14, width - 28, height - 28, 15);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = '#243642';
  context.font = '800 28px Trebuchet MS, Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(stat.label, x + width / 2, y + 48, width - 48);
  context.fillStyle = stat.accent;
  context.font = '800 82px Trebuchet MS, Arial, sans-serif';
  context.fillText(stat.value, x + width / 2, y + 142, width - 44);

  const maxAssetWidth = width * 0.36;
  const maxAssetHeight = height * 0.31;
  const scale = Math.min(maxAssetWidth / stat.asset.width, maxAssetHeight / stat.asset.height);
  const assetWidth = stat.asset.width * scale;
  const assetHeight = stat.asset.height * scale;
  context.drawImage(
    stat.asset,
    x + (width - assetWidth) / 2,
    y + height - assetHeight - 26,
    assetWidth,
    assetHeight
  );
};

export const renderCreatorCardCanvas = async (
  model: CreatorCardModel
): Promise<HTMLCanvasElement> => {
  const [seal, cleanParcel, failedParcel, background, featured] = await Promise.all([
    loadImage(CARD_ASSETS.seal),
    loadImage(CARD_ASSETS.cleanParcel),
    loadImage(CARD_ASSETS.failedParcel),
    loadImage(CARD_ASSETS.background),
    loadImage(CARD_ASSETS.featured),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Card image canvas is unavailable.');

  context.fillStyle = '#aedfd8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  roundedRect(context, 42, 42, 996, 996, 38);
  context.fillStyle = '#fff7df';
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = '#243642';
  context.stroke();

  roundedRect(context, 72, 72, 936, 212, 28);
  context.fillStyle = '#aedfd8';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = '#243642';
  context.stroke();
  context.drawImage(seal, 92, 85, 180, 180);
  context.fillStyle = '#243642';
  context.font = '800 58px Trebuchet MS, Arial, sans-serif';
  context.textAlign = 'left';
  context.fillText('DAILY DASH', 300, 152, 430);
  context.font = '700 31px Trebuchet MS, Arial, sans-serif';
  context.fillText(model.creatorLabel, 302, 202, 420);
  context.fillStyle = '#49626d';
  context.font = '600 22px Trebuchet MS, Arial, sans-serif';
  context.fillText(model.communityLabel, 303, 239, 420);

  context.save();
  roundedRect(context, 762, 92, 214, 172, 18);
  context.clip();
  drawCover(context, background, 762, 92, 214, 172);
  context.restore();
  roundedRect(context, 762, 92, 214, 172, 18);
  context.lineWidth = 5;
  context.strokeStyle = '#f2bf56';
  context.stroke();

  const panels: [PassportStat, PassportStat, PassportStat, PassportStat] = [
    {
      label: 'DISTANCE TRAVELED',
      value: model.distanceLabel,
      accent: '#4c9b6a',
      asset: background,
    },
    {
      label: 'FEATURED TILES',
      value: String(model.featuredTiles),
      accent: '#d99a12',
      asset: featured,
    },
    {
      label: 'CLEAN DELIVERIES',
      value: String(model.cleanDeliveries),
      accent: '#4c9b6a',
      asset: cleanParcel,
    },
    {
      label: 'FAILED DELIVERIES',
      value: String(model.failedDeliveries),
      accent: '#d85243',
      asset: failedParcel,
    },
  ];
  drawPassportStat(context, panels[0], 76, 318, 446, 320);
  drawPassportStat(context, panels[1], 558, 318, 446, 320);
  drawPassportStat(context, panels[2], 76, 670, 446, 320);
  drawPassportStat(context, panels[3], 558, 670, 446, 320);

  context.fillStyle = '#243642';
  context.font = '700 20px Trebuchet MS, Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText(`TODAY’S ROUTE · ${model.dailyRouteDateKey}`, 540, 1023);
  context.textAlign = 'left';
  return canvas;
};

export const saveCreatorCardImage = async (model: CreatorCardModel): Promise<void> => {
  const canvas = await renderCreatorCardCanvas(model);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Card image encoding failed.'));
    }, 'image/png');
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `daily-dash-route-passport-${model.creatorLabel.replace(/^u\//, '')}.png`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
};
