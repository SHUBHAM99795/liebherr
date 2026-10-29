/**
 * Generates placeholder fixture PDFs referenced by src/data/fixtures.ts:
 *   public/fixtures/bsh_liefervorschriften_Auszug250414_50_A19.pdf (50 pages)
 *   public/fixtures/mae_liefervorschrift_Auszug240312_A17.pdf      (20 pages)
 *
 * Run: npm run generate:fixtures
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'fixtures');
mkdirSync(outDir, { recursive: true });

const LOREM =
  'Der Auftragnehmer verpflichtet sich, diese Liefervorschrift einzuhalten. Abweichungen von der ' +
  'Liefervorschrift, die nicht schriftlich genehmigt wurden, muessen in kuerzester Frist vom Auftragnehmer ' +
  'kostenlos geaendert werden. Geraete und Betriebsmittel, die nicht in den Lieferantenfreigabelisten ' +
  'aufgefuehrt sind, duerfen nur mit Zustimmung des Auftraggebers verwendet werden. Der Auftragnehmer hat ' +
  'den Stand der Technik zum Zeitpunkt der Bestellung zu beruecksichtigen und sich zu vergewissern, dass er ' +
  'alle Gesetze, Normen und Richtlinien in der neuesten Fassung beachtet. Die Risikobeurteilung gehoert zum ' +
  'Lieferumfang und ist dem Auftraggeber spaetestens zur Endabnahme auszuhaendigen.';

async function generate(fileName, title, pageCount) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (let p = 1; p <= pageCount; p++) {
    const page = doc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    // header
    page.drawText(title, { x: 40, y: height - 40, size: 9, font: bold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Seite ${p} von ${pageCount}`, { x: width - 120, y: height - 40, size: 9, font });
    page.drawLine({ start: { x: 40, y: height - 50 }, end: { x: width - 40, y: height - 50 }, color: rgb(0.8, 0.8, 0.8) });

    // chapter heading
    page.drawText(`Kapitel ${Math.ceil(p / 4)}.${(p % 4) + 1} — Anforderungen (Auszug)`, {
      x: 40,
      y: height - 80,
      size: 13,
      font: bold,
    });

    // body paragraphs
    const words = LOREM.split(' ');
    let y = height - 110;
    let line = '';
    for (const w of words.concat(words)) {
      if ((line + ' ' + w).length > 88) {
        page.drawText(line, { x: 40, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
        y -= 15;
        line = w;
        if (y < 70) break;
      } else {
        line = line ? line + ' ' + w : w;
      }
    }
    if (y >= 70 && line) page.drawText(line, { x: 40, y, size: 10, font, color: rgb(0.1, 0.1, 0.1) });

    // footer
    page.drawText('Urheberrechtlich geschuetzt. Status: Released', { x: 40, y: 40, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
  }

  const bytes = await doc.save();
  writeFileSync(join(outDir, fileName), bytes);
  console.log(`generated ${fileName} (${pageCount} pages, ${bytes.length} bytes)`);
}

await generate('bsh_liefervorschriften_Auszug250414_50_A19.pdf', 'B/S/H Liefervorschrift MAE - 5750 0000007063 Rev. C,1', 50);
await generate('mae_liefervorschrift_Auszug240312_A17.pdf', 'MAE Liefervorschrift - Auszug 03.24 Rev. B.2', 20);
