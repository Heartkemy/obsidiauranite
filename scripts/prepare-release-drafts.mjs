import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const draftsRoot = path.join(root, 'drafts');
const output = path.join(draftsRoot, 'release-assets');
const repository = 'https://github.com/Heartkemy/obsidiauranite';
const releases = [
  { tag: 'v1.0.0', version: '1.0.0' },
  { tag: 'v1.1.0', version: '1.1.0' },
  { tag: 'v1.2.0', version: '1.2.0' },
  { tag: 'v1.2.1', version: '1.2.1' },
  { tag: '1.2.2', version: '1.2.2' },
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function comment(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line ? ' * ' + line : ' *'))
    .join('\n');
}

function draftNotice(license, thirdParty) {
  return [
    '/**',
    ' * REVIEW-ONLY replacement draft. This file has not been uploaded to a GitHub Release.',
    ' * Full original and upstream notices follow.',
    ' *',
    comment(license),
    ' *',
    comment(thirdParty),
    ' */',
    '',
  ].join('\n');
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch ' + url + ': ' + response.status);
  return Buffer.from(await response.arrayBuffer());
}

async function writeDraft(directory, finalDirectory, relativePath, value) {
  const target = path.join(directory, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, value);
  return { path: path.relative(root, path.join(finalDirectory, relativePath)), sha256: sha256(value) };
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

const license = await readFile(path.join(root, 'LICENSE'), 'utf8');
const thirdParty = await readFile(path.join(root, 'THIRD_PARTY_LICENSES.md'), 'utf8');
const notice = Buffer.from(draftNotice(license, thirdParty));
const currentCss = await readFile(path.join(root, 'theme.css'));
const currentManifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));

if (output !== path.join(root, 'drafts', 'release-assets')) {
  throw new Error('Refusing to replace an unexpected output path');
}
await mkdir(draftsRoot, { recursive: true });
const backup = path.join(draftsRoot, '.release-assets-backup');
if (!(await exists(output)) && (await exists(backup))) {
  await rename(backup, output);
}
if ((await exists(output)) && (await exists(backup))) {
  await rm(backup, { recursive: true, force: true });
}
const staging = await mkdtemp(path.join(draftsRoot, '.release-assets-'));

try {
  const replacements = [];
  for (const release of releases) {
    const base = repository + '/releases/download/' + release.tag;
    const [sourceCss, sourceManifest] = await Promise.all([
      fetchBuffer(base + '/theme.css'),
      fetchBuffer(base + '/manifest.json'),
    ]);
    const manifest = JSON.parse(sourceManifest.toString('utf8'));
    if (manifest.version !== release.version) {
      throw new Error(release.tag + ' manifest version is ' + manifest.version + ', expected ' + release.version);
    }
    manifest.authorUrl = repository;
    const directory = path.join(staging, release.tag);
    const finalDirectory = path.join(output, release.tag);
    const css = Buffer.concat([notice, Buffer.from(sourceCss.toString('utf8').replace(/\n{2,}$/, '\n'))]);
    const draftCss = await writeDraft(directory, finalDirectory, 'theme.css', css);
    const draftManifest = await writeDraft(
      directory,
      finalDirectory,
      'manifest.json',
      Buffer.from(JSON.stringify(manifest, null, 2) + '\n'),
    );
    replacements.push({
      release_tag: release.tag,
      version: release.version,
      review_only: true,
      source: {
        theme_css: { url: base + '/theme.css', sha256: sha256(sourceCss) },
        manifest: { url: base + '/manifest.json', sha256: sha256(sourceManifest) },
      },
      proposed: { theme_css: draftCss, manifest: draftManifest },
    });
  }

  const currentDirectory = path.join(staging, currentManifest.version);
  const currentFinalDirectory = path.join(output, currentManifest.version);
  const currentDraft = {
    version: currentManifest.version,
    review_only: true,
    source: { workspace_build: { path: 'theme.css', sha256: sha256(currentCss) } },
    proposed: {
      theme_css: await writeDraft(currentDirectory, currentFinalDirectory, 'theme.css', currentCss),
      manifest: await writeDraft(
        currentDirectory,
        currentFinalDirectory,
        'manifest.json',
        Buffer.from(JSON.stringify(currentManifest, null, 2) + '\n'),
      ),
    },
  };

  const manifest = {
    status: 'review-only drafts; no release, tag, or uploaded asset was created or changed',
    canonical_repository: repository,
    replacements,
    current_unreleased_draft: currentDraft,
    known_gaps: [
      'v1.2.6 has a GitHub Release with no uploaded manifest.json or theme.css.',
      'v1.2.7 has a Git tag but no GitHub Release or uploaded assets.',
    ],
  };
  await writeFile(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  let movedExisting = false;
  if (await exists(output)) {
    await rename(output, backup);
    movedExisting = true;
  }
  try {
    await rename(staging, output);
  } catch (error) {
    if (movedExisting) {
      await rm(output, { recursive: true, force: true });
      await rename(backup, output);
    }
    throw error;
  }
  await rm(backup, { recursive: true, force: true });
  console.log('Prepared ' + replacements.length + ' historical replacement pairs and ' + currentManifest.version + ' review draft');
} catch (error) {
  await rm(staging, { recursive: true, force: true });
  throw error;
}
