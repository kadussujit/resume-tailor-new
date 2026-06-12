const $ = (sel) => document.querySelector(sel);

const resumeInput = $('#resume');
const jdInput = $('#jd');
const tailorBtn = $('#tailor-btn');
const statusEl = $('#status');
const inputSection = $('#input-section');
const resultSection = $('#result-section');
const form = $('#resume-form');
const insights = $('#insights');

let currentResume = null;
let isProcessing = false;

const dropzone = $('#dropzone');

const ALLOWED_EXT = ['.pdf', '.docx', '.txt'];
const fileNameEl = $('#file-name');

function showFile() {
  const f = resumeInput.files[0];
  if (!f) {
    fileNameEl.textContent = '';
    fileNameEl.classList.remove('file-error');
    dropzone.classList.remove('has-file', 'has-error');
    return;
  }
  const valid = ALLOWED_EXT.some((ext) => f.name.toLowerCase().endsWith(ext));
  if (valid) {
    fileNameEl.textContent = `✓ ${f.name}`;
    fileNameEl.classList.remove('file-error');
    dropzone.classList.add('has-file');
    dropzone.classList.remove('has-error');
  } else {
    fileNameEl.textContent = `✕ ${f.name} — unsupported type (use PDF, DOCX, or TXT)`;
    fileNameEl.classList.add('file-error');
    dropzone.classList.add('has-error');
    dropzone.classList.remove('has-file');
  }
}

resumeInput.addEventListener('change', showFile);

// drag & drop
['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
dropzone.addEventListener('drop', (e) => {
  const f = e.dataTransfer.files[0];
  if (f) { resumeInput.files = e.dataTransfer.files; showFile(); }
});

// Render a safe subset of markdown (bold, italic, line breaks) for AI-generated notes.
function renderInlineMarkdown(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (type ? ' ' + type : '');
}

// ---------- Tailor ----------
tailorBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  const file = resumeInput.files[0];
  const jd = jdInput.value.trim();
  if (!file) return setStatus('Please choose a resume file.', 'error');
  if (!ALLOWED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return setStatus('Unsupported file type. Please upload a PDF, DOCX, or TXT resume.', 'error');
  }
  if (!jd) return setStatus('Please paste a job description.', 'error');

  isProcessing = true;
  tailorBtn.disabled = true;
  tailorBtn.classList.add('loading');
  setStatus('Tailoring your resume… this can take 10–30 seconds.', 'working');

  try {
    const fd = new FormData();
    fd.append('resume', file);
    fd.append('jobDescription', jd);
    fd.append('additionalInstructions', $('#instructions').value.trim());

    const res = await fetch('/api/tailor', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed.');

    currentResume = data;
    renderResult(data);
    setStatus('');
    inputSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    setStatus(err.message, 'error');
  } finally {
    isProcessing = false;
    tailorBtn.disabled = false;
    tailorBtn.classList.remove('loading');
  }
});

// ---------- Render editable form ----------
function field(label, value, key, multiline = false) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const lab = document.createElement('label');
  lab.textContent = label;
  const input = document.createElement(multiline ? 'textarea' : 'input');
  if (!multiline) input.type = 'text';
  else input.rows = 3;
  input.value = value || '';
  input.dataset.key = key;
  wrap.append(lab, input);
  return wrap;
}

function sectionBlock(title) {
  const div = document.createElement('div');
  div.className = 'section-block';
  const h = document.createElement('h3');
  h.textContent = title;
  div.appendChild(h);
  return div;
}

function renderResult(r) {
  // insights panel
  insights.innerHTML = '';
  const ih = document.createElement('h3');
  ih.textContent = 'What changed';
  insights.appendChild(ih);
  if (r.changeNotes) {
    const p = document.createElement('p');
    p.innerHTML = renderInlineMarkdown(r.changeNotes);
    p.style.margin = '0 0 8px';
    insights.appendChild(p);
  }
  if (r.matchedKeywords?.length) {
    const kwTitle = document.createElement('div');
    kwTitle.innerHTML = '<strong>Matched keywords:</strong> ';
    r.matchedKeywords.forEach((k) => {
      const span = document.createElement('span');
      span.className = 'kw';
      span.textContent = k;
      kwTitle.appendChild(span);
    });
    insights.appendChild(kwTitle);
  }

  form.innerHTML = '';

  // Basics
  const basics = sectionBlock('Basics');
  basics.appendChild(field('Full name', r.name, 'name'));
  const c = r.contact || {};
  const cg = document.createElement('div');
  cg.className = 'exp-grid';
  cg.append(
    field('Email', c.email, 'contact.email'),
    field('Phone', c.phone, 'contact.phone'),
    field('Location', c.location, 'contact.location'),
    field('LinkedIn', c.linkedin, 'contact.linkedin'),
    field('Website', c.website, 'contact.website'),
  );
  basics.appendChild(cg);
  form.appendChild(basics);

  // Summary
  const sum = sectionBlock('Professional Summary');
  sum.appendChild(field('Summary', r.summary, 'summary', true));
  form.appendChild(sum);

  // Skills
  const sk = sectionBlock('Skills');
  sk.appendChild(field('Skills (comma-separated)', (r.skills || []).join(', '), 'skills', true));
  form.appendChild(sk);

  // Experience
  const exp = sectionBlock('Experience');
  const expList = document.createElement('div');
  expList.id = 'exp-list';
  (r.experience || []).forEach((job) => expList.appendChild(expItem(job)));
  exp.appendChild(expList);
  const addExp = document.createElement('button');
  addExp.type = 'button';
  addExp.className = 'add-btn';
  addExp.textContent = '+ Add experience';
  addExp.onclick = () => expList.appendChild(expItem({ bullets: [''] }));
  exp.appendChild(addExp);
  form.appendChild(exp);

  // Education
  const edu = sectionBlock('Education');
  const eduList = document.createElement('div');
  eduList.id = 'edu-list';
  (r.education || []).forEach((e) => eduList.appendChild(eduItem(e)));
  edu.appendChild(eduList);
  const addEdu = document.createElement('button');
  addEdu.type = 'button';
  addEdu.className = 'add-btn';
  addEdu.textContent = '+ Add education';
  addEdu.onclick = () => eduList.appendChild(eduItem({}));
  edu.appendChild(addEdu);
  form.appendChild(edu);

  // Certifications
  const cert = sectionBlock('Certifications');
  cert.appendChild(field('Certifications (one per line)', (r.certifications || []).join('\n'), 'certifications', true));
  form.appendChild(cert);
}

function expItem(job) {
  const box = document.createElement('div');
  box.className = 'exp-item';
  const grid = document.createElement('div');
  grid.className = 'exp-grid';
  grid.append(
    field('Title', job.title, 'title'),
    field('Company', job.company, 'company'),
    field('Location', job.location, 'location'),
    field('Dates', job.dates, 'dates'),
  );
  box.appendChild(grid);

  const bl = document.createElement('div');
  bl.className = 'bullets-list';
  (job.bullets || []).forEach((b) => bl.appendChild(bulletRow(b)));
  box.appendChild(bl);

  const addB = document.createElement('button');
  addB.type = 'button';
  addB.className = 'add-btn';
  addB.textContent = '+ Add bullet';
  addB.onclick = () => bl.appendChild(bulletRow(''));
  box.appendChild(addB);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'del-btn';
  del.textContent = 'Remove job';
  del.style.marginLeft = '8px';
  del.onclick = () => box.remove();
  box.appendChild(del);
  return box;
}

function bulletRow(text) {
  const row = document.createElement('div');
  row.className = 'bullet-row';
  const ta = document.createElement('textarea');
  ta.rows = 2;
  ta.value = text || '';
  ta.dataset.key = 'bullet';
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'del-btn';
  del.textContent = '✕';
  del.onclick = () => row.remove();
  row.append(ta, del);
  return row;
}

function eduItem(e) {
  const box = document.createElement('div');
  box.className = 'edu-item';
  const grid = document.createElement('div');
  grid.className = 'exp-grid';
  grid.append(
    field('Degree', e.degree, 'degree'),
    field('Institution', e.institution, 'institution'),
    field('Location', e.location, 'location'),
    field('Dates', e.dates, 'dates'),
  );
  box.appendChild(grid);
  box.appendChild(field('Details', e.details, 'details'));
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'del-btn';
  del.textContent = 'Remove';
  del.onclick = () => box.remove();
  box.appendChild(del);
  return box;
}

// ---------- Collect form back into JSON ----------
function collectResume() {
  const get = (key) => {
    const el = form.querySelector(`[data-key="${key}"]`);
    return el ? el.value.trim() : '';
  };

  const r = {
    name: get('name'),
    contact: {
      email: get('contact.email'),
      phone: get('contact.phone'),
      location: get('contact.location'),
      linkedin: get('contact.linkedin'),
      website: get('contact.website'),
    },
    summary: get('summary'),
    skills: get('skills').split(',').map((s) => s.trim()).filter(Boolean),
    experience: [],
    education: [],
    certifications: get('certifications').split('\n').map((s) => s.trim()).filter(Boolean),
    matchedKeywords: currentResume?.matchedKeywords || [],
  };

  form.querySelectorAll('#exp-list .exp-item').forEach((box) => {
    const f = (k) => box.querySelector(`[data-key="${k}"]`)?.value.trim() || '';
    const bullets = [...box.querySelectorAll('[data-key="bullet"]')].map((b) => b.value.trim()).filter(Boolean);
    r.experience.push({ title: f('title'), company: f('company'), location: f('location'), dates: f('dates'), bullets });
  });

  form.querySelectorAll('#edu-list .edu-item').forEach((box) => {
    const f = (k) => box.querySelector(`[data-key="${k}"]`)?.value.trim() || '';
    r.education.push({ degree: f('degree'), institution: f('institution'), location: f('location'), dates: f('dates'), details: f('details') });
  });

  return r;
}

// ---------- Download ----------
async function download(format) {
  const resume = collectResume();

  // Warn if critical sections are empty before exporting.
  const missing = [];
  if (!resume.name) missing.push('Full name');
  if (!resume.summary) missing.push('Professional summary');
  if (!resume.experience.length) missing.push('Experience');
  if (missing.length &&
      !confirm(`These sections are empty:\n\n• ${missing.join('\n• ')}\n\nDownload anyway?`)) {
    return;
  }

  try {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, format }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed.');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(resume.name || 'resume').replace(/[^a-z0-9]+/gi, '_')}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
}

$('#download-docx').addEventListener('click', () => download('docx'));
$('#download-pdf').addEventListener('click', () => download('pdf'));
$('#restart').addEventListener('click', () => {
  // Reset all inputs so the user truly starts fresh.
  resumeInput.value = '';
  jdInput.value = '';
  $('#instructions').value = '';
  currentResume = null;
  showFile();
  setStatus('');
  form.innerHTML = '';
  insights.innerHTML = '';

  resultSection.classList.add('hidden');
  inputSection.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
