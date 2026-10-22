import { aProject, aSection, aTranslation, anImage, anItem } from '@/test/builders';
import { buildExport, exportFileName, slugify } from './buildExport';
import { csvExporter, csvField } from './csv';
import { jsonExporter } from './json';
import { EXPORTERS, getExporter } from './registry';

function fixture() {
  const project = aProject({ name: 'Moonfall', code: 'MOON-2026', targetLanguages: ['es', 'fr'] });
  const act1 = aSection(project.id, { name: 'Act 1 - Opening', order: 0 });
  const act2 = aSection(project.id, { name: 'Act 1: Opening', order: 1 }); // same slug
  const gate = anItem(act1, { name: 'North Gate', order: 0 });
  const later = anItem(act2, { name: 'Café', order: 0 });
  const image = (item: typeof gate, order: number, text: string) =>
    anImage(item, {
      order,
      source: {
        ...anImage(item).source,
        text,
        speaker: order === 0 ? 'Mira' : null,
        type: 'Dialogue',
        contextNote: null,
      },
    });
  const g2 = image(gate, 1, 'Bring the lantern, "now".');
  const g1 = image(gate, 0, 'Meet me at the gate!');
  const c1 = image(later, 0, 'Line,\nwith a break');
  return {
    data: {
      project,
      sections: [act2, act1],
      items: [later, gate],
      images: [g2, c1, g1],
      translations: [
        aTranslation(g1, 'es', 'completed', { text: '¡Nos vemos en la puerta!' }),
        aTranslation(g1, 'fr', 'in-progress', { text: 'Rendez-vous' }),
        aTranslation(g2, 'es', 'under-review', { text: 'Trae la linterna' }),
      ],
    },
    ids: { g1: g1.id },
  };
}

const at = new Date('2026-10-22T10:00:00.000Z');

describe('buildExport', () => {
  it('lists every image in order with readable, unique keys', () => {
    const { data, ids } = fixture();
    const result = buildExport(data, { languages: ['es', 'fr'], include: 'completed' }, at);
    expect(result.strings.map((s) => s.key)).toEqual([
      'act-1-opening.north-gate.01',
      'act-1-opening.north-gate.02',
      'act-1-opening-2.cafe.01',
    ]);
    expect(result.strings[0]).toMatchObject({
      id: ids.g1,
      section: 'Act 1 - Opening',
      item: 'North Gate',
      position: 1,
      speaker: 'Mira',
      type: 'Dialogue',
      source: 'Meet me at the gate!',
    });
    expect(result).toMatchObject({
      project: { name: 'Moonfall', code: 'MOON-2026', sourceLanguage: 'en' },
      exportedAt: '2026-10-22T10:00:00.000Z',
      languages: ['es', 'fr'],
    });
  });

  it('keeps only completed translations unless asked for everything', () => {
    const completed = buildExport(
      fixture().data,
      { languages: ['es', 'fr'], include: 'completed' },
      at,
    );
    expect(completed.strings.map((s) => s.translations)).toEqual([
      { es: '¡Nos vemos en la puerta!', fr: null },
      { es: null, fr: null },
      { es: null, fr: null },
    ]);
    const all = buildExport(fixture().data, { languages: ['fr'], include: 'all' }, at);
    expect(all.languages).toEqual(['fr']);
    expect(all.strings[0]!.translations).toEqual({ fr: 'Rendez-vous' });
  });

  it('slugs names and file names', () => {
    expect(slugify('  Ça, c’est Noël! ')).toBe('ca-c-est-noel');
    expect(slugify('!!!')).toBe('untitled');
    expect(exportFileName('smp-alpha 2026', 'csv')).toBe('SMP-ALPHA-2026-translations.csv');
  });
});

describe('exporters', () => {
  const data = buildExport(fixture().data, { languages: ['es', 'fr'], include: 'all' }, at);

  it('writes versioned JSON that parses back', () => {
    const parsed = JSON.parse(jsonExporter.serialize(data));
    expect(parsed).toMatchObject({ format: 'translator-export', version: 1, include: 'all' });
    expect(parsed.strings).toHaveLength(3);
    expect(parsed.strings[1].translations).toEqual({ es: 'Trae la linterna', fr: null });
  });

  it('writes RFC 4180 CSV with a BOM and one column per language', () => {
    const csv = csvExporter.serialize(data);
    expect(
      csv.startsWith('﻿key,id,section,item,position,speaker,type,context,source,es,fr\r\n'),
    ).toBe(true);
    expect(csv).toContain('"Bring the lantern, ""now"".",Trae la linterna,');
    expect(csv).toContain('"Line,\nwith a break"');
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csvField(null)).toBe('');
    expect(csvField(3)).toBe('3');
  });

  it('registers JSON then CSV', () => {
    expect(EXPORTERS.map((e) => e.id)).toEqual(['json', 'csv']);
    expect(getExporter('csv')).toBe(csvExporter);
    expect(() => getExporter('po')).toThrow();
  });
});
