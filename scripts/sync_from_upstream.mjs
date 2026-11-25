#!/usr/bin/env node
/**
 * Converts upstream HRuiCcc/RuiC-PoseAtlas data/*.json into
 * Handraw Standard Gallery Manifest v1 (format: 1) JSON files.
 *
 * Usage: node scripts/sync_from_upstream.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'galleries');

const UPSTREAM_GITHUB = 'https://github.com/HRuiCcc/RuiC-PoseAtlas';
const IMAGE_MIRRORS = {
  gitee: 'https://gitee.com/mingtian2018/RuiC-PoseAtlas/raw/main/',
  github: 'https://raw.githubusercontent.com/HRuiCcc/RuiC-PoseAtlas/main/',
};

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function cleanRel(p) {
  return String(p || '').replace(/^\/+/, '').trim();
}

async function fetchUpstreamJSON(relPath) {
  const urls = [IMAGE_MIRRORS.gitee + relPath, IMAGE_MIRRORS.github + relPath];
  let lastErr;
  for (const u of urls) {
    try {
      const resp = await fetch(u, {
        headers: { 'User-Agent': 'handraw-gallery-sync/1.0' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${u}`);
      return await resp.json();
    } catch (err) {
      lastErr = err;
      console.warn(`[warn] fetch failed for ${u}: ${err.message}`);
    }
  }
  throw lastErr || new Error(`Failed to fetch ${relPath}`);
}

function buildPoses(doc) {
  const angleZh = { front: '正面', diagonal: '斜侧', side: '侧面', high: '俯视', low: '仰视' };
  const angleEn = { front: 'Front', diagonal: 'Three-quarter', side: 'Side', high: 'High angle', low: 'Low angle' };
  for (const a of doc.angles || []) {
    if (a.names?.zh?.trim()) angleZh[a.key] = a.names.zh.trim();
    if (a.names?.en?.trim()) angleEn[a.key] = a.names.en.trim();
  }
  const angleOrder = { front: 0, diagonal: 1, side: 2, high: 3, low: 4 };

  const seriesName = {};
  const seriesShort = {};
  for (const s of doc.series || []) {
    seriesName[s.key] = firstNonEmpty(s.names?.zh, s.short?.zh, s.key);
    seriesShort[s.key] = firstNonEmpty(s.short?.zh, s.names?.zh, s.key);
  }

  const items = [];
  for (const p of doc.poses || []) {
    const id = String(p.id || '').trim();
    if (!id || !Array.isArray(p.variants) || p.variants.length === 0) continue;
    const nameZh = firstNonEmpty(p.names?.zh, p.names?.en, id);
    const nameEn = firstNonEmpty(p.names?.en);
    const sShort = firstNonEmpty(seriesShort[p.series], p.series);
    const sFull = firstNonEmpty(seriesName[p.series], sShort);
    const cat = firstNonEmpty(p.category, '其他');

    const variants = [];
    for (const v of p.variants) {
      const key = String(v.angle || '').trim();
      if (!key) continue;
      variants.push({
        key,
        label: firstNonEmpty(angleZh[key], key),
        labelEn: firstNonEmpty(angleEn[key], key),
        remoteThumb: cleanRel(v.thumb),
        remoteImage: cleanRel(v.full),
      });
    }
    variants.sort((a, b) => (angleOrder[a.key] ?? 99) - (angleOrder[b.key] ?? 99));
    if (variants.length === 0) continue;

    const tags = [sShort, cat].filter(Boolean);
    if (p.no) tags.push(String(p.no));

    items.push({
      id,
      name: nameZh,
      ...(nameEn ? { nameEn } : {}),
      category: cat,
      categoryName: cat,
      tags,
      traits: `${sShort} · ${cat} · ${variants.length}视角`,
      promptZh: `参考人物姿态：${nameZh}（${sFull}，${cat}）`,
      ...(nameEn ? { promptEn: nameEn } : {}),
      remoteThumb: variants[0].remoteThumb,
      remoteImage: variants[0].remoteImage,
      variants,
      source: 'third-party',
      author: 'RuiC-PoseAtlas (MIT)',
      meta: {
        series: p.series,
        seriesName: sFull,
        seriesShort: sShort,
        no: p.no || '',
        localOnly: true,
      },
    });
  }

  return {
    format: 1,
    id: 'ruic-poses',
    version: '1.0.0',
    name: '姿态图鉴',
    nameEn: 'RuiC Poses',
    description: '288 组人体姿态 × 5 视角（正面/斜侧/侧面/俯视/仰视）人台线稿参考，支持精确选角度入图。',
    icon: '🧍',
    author: 'HRuiCcc',
    license: 'MIT',
    upstreamUrl: UPSTREAM_GITHUB,
    source: 'third-party',
    promptRole: 'pose',
    supportsRefImage: true,
    localOnly: true,
    multiVariant: true,
    imageMirrors: IMAGE_MIRRORS,
    items,
  };
}

function buildCostumes(doc) {
  const catName = {};
  for (const c of doc.categories || []) {
    catName[c.key] = firstNonEmpty(c.names?.zh, c.names?.en, c.key);
  }
  const grpName = {};
  for (const g of doc.groups || []) {
    grpName[g.key] = firstNonEmpty(g.names?.zh, g.names?.en, g.key);
  }

  const items = [];
  for (const c of doc.costumes || []) {
    const id = String(c.id || '').trim();
    if (!id) continue;
    const cZh = firstNonEmpty(catName[c.cat], c.cat, '其他');
    const gZh = firstNonEmpty(grpName[c.group], c.group, '服饰');
    const tags = [cZh, gZh];
    if (c.color) tags.push(c.color);
    if (c.main) tags.push(c.main);
    for (const t of c.tags || []) {
      if (tags.length >= 8) break;
      const s = String(t || '').trim();
      if (s) tags.push(s);
    }
    const traitsParts = [cZh, gZh, c.color, c.main].filter(Boolean);
    const rawTags = (c.tags || []).map((t) => String(t || '').trim()).filter(Boolean);

    items.push({
      id,
      name: `${gZh} · ${id}`,
      category: firstNonEmpty(c.cat, 'other'),
      categoryName: cZh,
      tags,
      traits: traitsParts.join(' · '),
      promptZh: `参考服装穿搭：${gZh}（${cZh}${rawTags.length ? '，' + rawTags.join(', ') : ''}）`,
      ...(rawTags.length ? { promptEn: rawTags.join(', ') } : {}),
      remoteThumb: cleanRel(c.thumb),
      remoteImage: cleanRel(c.image),
      source: 'third-party',
      author: 'RuiC-PoseAtlas (MIT)',
      meta: {
        group: c.group || '',
        groupName: gZh,
        color: c.color || '',
        main: c.main || '',
        localOnly: true,
      },
    });
  }

  return {
    format: 1,
    id: 'ruic-costumes',
    version: '1.0.0',
    name: '衣装图鉴',
    nameEn: 'RuiC Costumes',
    description: '1,407 套无人物服饰单品图鉴 × 8 季节与风格分类，适合固定穿搭、服饰材质与廓形参考。',
    icon: '👗',
    author: 'HRuiCcc',
    license: 'MIT',
    upstreamUrl: UPSTREAM_GITHUB,
    source: 'third-party',
    promptRole: 'costume',
    supportsRefImage: true,
    localOnly: true,
    imageMirrors: IMAGE_MIRRORS,
    items,
  };
}

function buildFaces(doc) {
  const secName = { face: '脸部', styling: '造型' };
  for (const s of doc.sections || []) {
    secName[s.key] = firstNonEmpty(s.names?.zh, s.names?.en, s.key);
  }
  const hairName = { short: '短发', medium: '中发', semilong: '中长发', long: '长发' };
  for (const h of doc.hairs || []) {
    hairName[h.key] = firstNonEmpty(h.names?.zh, h.names?.en, h.key);
  }

  const items = [];
  for (const f of doc.images || []) {
    const id = String(f.id || '').trim();
    if (!id) continue;
    const secKey = firstNonEmpty(f.sec, 'face');
    const hairKey = firstNonEmpty(f.hair, 'short');
    const sZh = firstNonEmpty(secName[secKey], secKey);
    const hZh = firstNonEmpty(hairName[hairKey], hairKey);
    const catKey = `${secKey}_${hairKey}`;
    const catLabel = `${sZh} · ${hZh}`;
    const relThumb = cleanRel(f.thumb);
    const remoteFull = firstNonEmpty(f.full_remote, cleanRel(f.full), relThumb);
    const tags = [sZh, hZh];
    if (f.style && String(f.style).trim()) tags.push(String(f.style).trim());

    items.push({
      id,
      name: `${catLabel} · ${id.slice(0, 6)}`,
      category: catKey,
      categoryName: catLabel,
      tags,
      traits: catLabel,
      promptZh: `参考人物面部与发型气质（${catLabel}）`,
      remoteThumb: relThumb,
      remoteImage: remoteFull,
      source: 'third-party',
      author: 'RuiC-PoseAtlas (MIT)',
      meta: {
        section: secKey,
        hair: hairKey,
        localOnly: true,
      },
    });
  }

  return {
    format: 1,
    id: 'ruic-faces',
    version: '1.0.0',
    name: '人像图鉴',
    nameEn: 'RuiC Faces',
    description: '1,499 张正面脸部与造型参考，按脸部/造型与 4 种发长分类，适合固定角色颜值与发型气质。',
    icon: '🙂',
    author: 'HRuiCcc',
    license: 'MIT',
    upstreamUrl: UPSTREAM_GITHUB,
    source: 'third-party',
    promptRole: 'face',
    supportsRefImage: true,
    localOnly: true,
    imageMirrors: IMAGE_MIRRORS,
    items,
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const [posesRaw, costumesRaw, facesRaw] = await Promise.all([
    fetchUpstreamJSON('data/poses.json'),
    fetchUpstreamJSON('data/costumes.json'),
    fetchUpstreamJSON('data/faces.json'),
  ]);

  const packs = [
    ['ruic-poses.json', buildPoses(posesRaw)],
    ['ruic-costumes.json', buildCostumes(costumesRaw)],
    ['ruic-faces.json', buildFaces(facesRaw)],
  ];

  for (const [file, data] of packs) {
    const outPath = path.join(OUT_DIR, file);
    const jsonText = JSON.stringify(data);
    await fs.writeFile(outPath, jsonText + '\n', 'utf8');
    console.log(`[ok] ${file}: ${data.items.length} items (${(Buffer.byteLength(jsonText) / 1024).toFixed(1)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
