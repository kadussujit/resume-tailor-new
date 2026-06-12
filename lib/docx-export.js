import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle,
} from 'docx';

const FONT = 'Calibri';

function heading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { color: '999999', size: 6, style: BorderStyle.SINGLE, space: 1 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, font: FONT, color: '222222' })],
  });
}

function line(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 0 },
    alignment: opts.align,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size ?? 22, font: FONT, color: opts.color })],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  });
}

export async function buildDocx(r) {
  const children = [];

  // Header: name + contact
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: r.name || '', bold: true, size: 36, font: FONT })],
  }));

  const c = r.contact || {};
  const contactBits = [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean);
  if (contactBits.length) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: contactBits.join('  |  '), size: 20, font: FONT, color: '444444' })],
    }));
  }

  if (r.summary) {
    children.push(heading('Professional Summary'));
    children.push(line(r.summary, { after: 60 }));
  }

  if (r.skills?.length) {
    children.push(heading('Skills'));
    children.push(line(r.skills.join(' • '), { after: 60 }));
  }

  if (r.experience?.length) {
    children.push(heading('Experience'));
    for (const job of r.experience) {
      children.push(new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({ text: job.title || '', bold: true, size: 22, font: FONT }),
          new TextRun({ text: job.company ? `  —  ${job.company}` : '', size: 22, font: FONT }),
        ],
      }));
      const meta = [job.location, job.dates].filter(Boolean).join('  |  ');
      if (meta) children.push(line(meta, { italic: true, size: 20, color: '555555', after: 40 }));
      for (const b of job.bullets || []) children.push(bullet(b));
    }
  }

  if (r.education?.length) {
    children.push(heading('Education'));
    for (const e of r.education) {
      children.push(new Paragraph({
        spacing: { before: 60 },
        children: [
          new TextRun({ text: e.degree || '', bold: true, size: 22, font: FONT }),
          new TextRun({ text: e.institution ? `  —  ${e.institution}` : '', size: 22, font: FONT }),
        ],
      }));
      const meta = [e.location, e.dates, e.details].filter(Boolean).join('  |  ');
      if (meta) children.push(line(meta, { italic: true, size: 20, color: '555555' }));
    }
  }

  if (r.certifications?.length) {
    children.push(heading('Certifications'));
    for (const cert of r.certifications) children.push(bullet(cert));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children,
    }],
  });

  return Packer.toBuffer(doc);
}
