import { access, readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('assets/kenney-manifest.json', 'utf8'));
if (manifest.version !== 1) throw new Error('Unsupported art manifest version.');
if (!Array.isArray(manifest.requiredRoles) || manifest.requiredRoles.length < 8)
  throw new Error('Art role list is incomplete.');
if (manifest.mode === 'kenney') {
  if (!Array.isArray(manifest.packs) || manifest.packs.length === 0)
    throw new Error('Kenney mode requires at least one source pack record.');
  for (const pack of manifest.packs) {
    if (!pack.licenseFile)
      throw new Error(`Pack ${pack.name ?? '(unknown)'} is missing a licenseFile.`);
    await access(pack.licenseFile);
  }
  for (const [role, path] of Object.entries(manifest.mappings ?? {})) {
    if (!manifest.requiredRoles.includes(role)) throw new Error(`Unknown art role: ${role}`);
    await access(`public/assets/kenney/${path}`);
  }
}
for (const asset of manifest.generatedAssets ?? []) {
  if (!asset.role || !asset.path || !asset.generator || !asset.provenance)
    throw new Error('Generated art provenance is incomplete.');
  await access(`public/assets/${asset.path}`);
}
console.log(`Art manifest valid in ${manifest.mode} mode.`);
