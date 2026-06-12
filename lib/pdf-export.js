import PDFDocument from 'pdfkit';

export function buildPdf(r) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 54, right: 54 } });
    const chunks = [];
    doc.on('data', (d) => chunks.push(d));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const heading = (text) => {
      doc.moveDown(0.6);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#222222').text(text.toUpperCase());
      const y = doc.y + 2;
      doc.moveTo(doc.x, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor('#999999').lineWidth(0.5).stroke();
      doc.moveDown(0.4);
    };

    // Header
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000').text(r.name || '', { align: 'center' });
    const c = r.contact || {};
    const contactBits = [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean);
    if (contactBits.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#444444').text(contactBits.join('   |   '), { align: 'center' });
    }
    doc.fillColor('#000000');

    if (r.summary) {
      heading('Professional Summary');
      doc.fontSize(10.5).font('Helvetica').text(r.summary);
    }

    if (r.skills?.length) {
      heading('Skills');
      doc.fontSize(10.5).font('Helvetica').text(r.skills.join('  •  '));
    }

    if (r.experience?.length) {
      heading('Experience');
      for (const job of r.experience) {
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica-Bold').text(`${job.title || ''}${job.company ? '  —  ' + job.company : ''}`);
        const meta = [job.location, job.dates].filter(Boolean).join('   |   ');
        if (meta) doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555').text(meta);
        doc.fillColor('#000000').fontSize(10.5).font('Helvetica');
        for (const b of job.bullets || []) {
          doc.text(`•  ${b}`, { indent: 10, paragraphGap: 2 });
        }
      }
    }

    if (r.education?.length) {
      heading('Education');
      for (const e of r.education) {
        doc.moveDown(0.2);
        doc.fontSize(11).font('Helvetica-Bold').text(`${e.degree || ''}${e.institution ? '  —  ' + e.institution : ''}`);
        const meta = [e.location, e.dates, e.details].filter(Boolean).join('   |   ');
        if (meta) doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555').text(meta);
        doc.fillColor('#000000');
      }
    }

    if (r.certifications?.length) {
      heading('Certifications');
      doc.fontSize(10.5).font('Helvetica');
      for (const cert of r.certifications) doc.text(`•  ${cert}`, { indent: 10, paragraphGap: 2 });
    }

    doc.end();
  });
}
