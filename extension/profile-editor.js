/**
 * Jobinko extension — the editable tabs of "Your Autofill information" (Personal, Education, Work Experience, Skill,
 * Equal Employment, Preference).
 *
 * Every tab edits the SAME data the Profile page edits, and saves through the same server actions (the extension reaches them
 * via /api/extension/profile), so the same rules apply here as there: the fields Jobright marks mandatory are mandatory, a
 * declined voluntary question is stored as declined, and the server's own message is shown if it refuses something. This file
 * draws the forms and decides the ORDER of writes; it validates nothing the server will not validate again.
 *
 * ORDER MATTERS for Education and Work Experience: an entry is addressed by its position in the résumé, and adding one pushes
 * the others down. So existing entries are updated first (positions unchanged), then removed from the highest position down,
 * and new entries are added last, in reverse, so they land in the order shown.
 *
 * Attached to a global (MV3 content scripts are not modules); tested through it.
 */
;(function (root) {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const clone = (x) => JSON.parse(JSON.stringify(x))
  const star = (on) => (on ? '<span style="color:#f87171"> *</span>' : '')

  const input = (k, v, o = {}) => `<input class="afm-in" data-k="${k}" ${o.type ? `type="${o.type}"` : ''} ${o.ro ? 'readonly' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''} value="${esc(v)}">`
  const field = (label, html, req) => `<div><label class="afm-l">${esc(label)}${star(req)}</label>${html}</div>`
  const select = (k, v, options, ph) => `<select class="afm-in" data-k="${k}"><option value="">${esc(ph || 'Select…')}</option>${options.map((o) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
  const months = (k, v) => `<select class="afm-in" data-k="${k}"><option value="">Month</option>${MONTHS.map((m, i) => `<option value="${i + 1}" ${Number(v) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>`
  const year = (k, v) => `<input class="afm-in" data-k="${k}" type="number" min="1950" max="2100" placeholder="Year" value="${v ?? ''}">`

  /** Read a card's/ pane's inputs (data-k) back into an object. Numbers for months and years; booleans for checkboxes. */
  function collect(host) {
    const out = {}
    host.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k
      if (el.type === 'checkbox') out[k] = el.checked
      else if (/Month$|Year$/.test(k)) out[k] = el.value === '' ? null : Number(el.value)
      else out[k] = el.value
    })
    return out
  }

  const datesHtml = (r, nowLabel) => `<div class="afm-grid">
    ${field('Start Month', months('startMonth', r.startMonth))}${field('Start Year', year('startYear', r.startYear))}
    ${field('End Month', months('endMonth', r.endMonth))}${field('End Year', year('endYear', r.endYear))}</div>
    <label class="afm-row" style="margin-top:10px"><input type="checkbox" data-k="current" ${r.current ? 'checked' : ''}><span>${esc(nowLabel)}</span></label>`

  // ------------------------------------------------------------------ personal
  const PERSONAL = [
    ['firstName', 'First Name', true], ['middleName', 'Middle Name'], ['lastName', 'Last Name', true], ['preferredName', 'Preferred Name'],
    ['suffixName', 'Suffix'], ['birthday', 'Date of birth', false, 'date'], ['phone', 'Phone', true], ['phoneType', 'Phone Type', false, 'select'],
    ['address1', 'Address Line', true], ['address2', 'Address 2'], ['address3', 'Address 3'], ['country', 'Country/Region', true],
    ['state', 'State/Province', true], ['city', 'City', true], ['county', 'County'], ['postalCode', 'Postal Code', true],
    ['linkedinUrl', 'LinkedIn URL', true], ['githubUrl', 'GitHub URL'], ['portfolioUrl', 'Portfolio URL'], ['otherUrl', 'Other URL'],
  ]

  function personal(pane, c) {
    const p = c.ed.personal
    pane.innerHTML = `<h3>Personal</h3><p class="afm-sub">Used to fill name, contact and address boxes. Your email is your Jobinko sign-in.</p>
      <div class="afm-grid" id="ed-form">${PERSONAL.map(([k, l, req, kind]) => field(l, kind === 'select' ? select(k, p[k], c.ed.choices.phoneTypes, 'Phone type') : input(k, p[k], { type: kind === 'date' ? 'date' : undefined, max: 300 }), req)).join('')}
      ${field('Email Address', input('email', c.ed.email, { ro: true }), true).replace('data-k="email"', '')}</div><div class="afm-note" id="ed-msg"></div>`
    const form = pane.querySelector('#ed-form'); const msg = pane.querySelector('#ed-msg')
    const was = JSON.stringify(collect(form))
    const check = () => c.dirty(JSON.stringify(collect(form)) !== was, save)
    const save = async () => {
      const r = await c.write('personal', collect(form))
      if (!r.ok) { msg.textContent = r.error || 'We could not save that.'; return }
      await c.saved('Saved.')
    }
    form.addEventListener('input', check); form.addEventListener('change', check); c.dirty(false)
  }

  // ------------------------------------------------------------------ education / work
  const EDU_EMPTY = { index: null, institution: '', major: '', qualification: '', gpa: '', startMonth: null, startYear: null, endMonth: null, endYear: null, current: false }
  const JOB_EMPTY = { index: null, title: '', employer: '', employmentType: '', location: '', summary: '', description: '', startMonth: null, startYear: null, endMonth: null, endYear: null, current: false }

  const eduCard = (r, i, c) => `<div class="afm-card2" data-row="${i}"><div style="display:flex;justify-content:space-between;align-items:center"><h4>Education ${i + 1}</h4><button type="button" class="afm-ghost" data-del="${i}" style="padding:4px 12px;font-size:12px">Remove</button></div>
    <div class="afm-grid">${field('School Name', input('institution', r.institution), true)}${field('Major', input('major', r.major), true)}${field('Degree Type', input('qualification', r.qualification, { ph: 'MBA, General Management' }), true)}${field('GPA', input('gpa', r.gpa, { ph: '8.4' }))}</div>
    <div style="margin-top:10px">${datesHtml(r, 'I currently study here')}</div></div>`
  const jobCard = (r, i, c) => `<div class="afm-card2" data-row="${i}"><div style="display:flex;justify-content:space-between;align-items:center"><h4>Work Experience ${i + 1}</h4><button type="button" class="afm-ghost" data-del="${i}" style="padding:4px 12px;font-size:12px">Remove</button></div>
    <div class="afm-grid">${field('Job Title', input('title', r.title), true)}${field('Company', input('employer', r.employer), true)}${field('Job Type', select('employmentType', r.employmentType, c.ed.choices.employmentTypes, 'Job type'), true)}${field('Location', input('location', r.location))}</div>
    <div style="margin-top:10px">${datesHtml(r, 'I currently work here')}</div>
    <label class="afm-l" style="margin-top:12px">Experience Summary</label><textarea class="afm-in" data-k="summary" rows="2" maxlength="1000">${esc(r.summary)}</textarea>
    <label class="afm-l" style="margin-top:12px">Job Description <span class="muted">(one achievement per line)</span></label><textarea class="afm-in" data-k="description" rows="5">${esc(r.description)}</textarea></div>`

  function entries(pane, c, kind) {
    const edu = kind === 'education'
    const label = edu ? 'Education' : 'Work Experience'
    const empty = edu ? EDU_EMPTY : JOB_EMPTY
    const source = edu ? c.ed.education : c.ed.experience
    let rows = clone(source).map((r) => ({ ...r, deleted: false }))
    const draw = () => {
      pane.innerHTML = `<h3>${label}</h3><p class="afm-sub">Saved to your main résumé on Jobinko and used to fill applications. Starred fields are required.</p>
        <div id="ed-rows">${rows.map((r, i) => (r.deleted ? '' : (edu ? eduCard : jobCard)(r, i, c))).join('') || '<div class="muted">Nothing here yet.</div>'}</div>
        <button type="button" class="afm-ghost" id="ed-add" style="margin-top:6px">+ Add ${edu ? 'Education' : 'Work Experience'}</button><div class="afm-note" id="ed-msg"></div>`
      pane.querySelectorAll('[data-row]').forEach((card) => { const i = Number(card.dataset.row); card.addEventListener('input', () => { Object.assign(rows[i], collect(card)); check() }); card.addEventListener('change', () => { Object.assign(rows[i], collect(card)); check() }) })
      pane.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.del); if (rows[i].index === null) rows.splice(i, 1); else rows[i].deleted = true; draw(); check() }))
      pane.querySelector('#ed-add').addEventListener('click', () => { rows.unshift({ ...empty, deleted: false }); draw(); check() })
    }
    const fingerprint = () => JSON.stringify(rows.map((r) => ({ ...r })))
    let was = fingerprint()
    const check = () => c.dirty(fingerprint() !== was, save)
    const payload = (r) => {
      const dates = { startMonth: r.startMonth ?? null, startYear: r.startYear ?? null, endMonth: r.current ? null : (r.endMonth ?? null), endYear: r.current ? null : (r.endYear ?? null), current: !!r.current }
      return edu
        ? { kind: 'education', index: r.index, institution: r.institution, major: r.major, qualification: r.qualification, gpa: r.gpa, ...dates }
        : { kind: 'experience', index: r.index, title: r.title, employer: r.employer, location: r.location, employmentType: r.employmentType, summary: r.summary, description: r.description, ...dates }
    }
    const save = async () => {
      const msg = pane.querySelector('#ed-msg')
      const fail = (r) => { msg.textContent = r.error || 'We could not save that.' }
      const existing = rows.filter((r) => r.index !== null && !r.deleted)
      for (const r of existing) { const res = await c.write('entry', payload(r), false); if (!res.ok) return fail(res) }
      for (const r of rows.filter((x) => x.index !== null && x.deleted).sort((a, b) => b.index - a.index)) { const res = await c.write('deleteEntry', { kind: payload(r).kind, index: r.index }, false); if (!res.ok) return fail(res) }
      for (const r of rows.filter((x) => x.index === null).reverse()) { const res = await c.write('entry', payload(r), false); if (!res.ok) return fail(res) }
      await c.saved('Saved.')
    }
    draw(); c.dirty(false)
  }

  // ------------------------------------------------------------------ skills
  function skills(pane, c) {
    let list = [...c.ed.skills]
    const was = JSON.stringify(list)
    const draw = () => {
      pane.innerHTML = `<h3>Skills</h3><p class="afm-sub">Press Enter to add one. They change which jobs score well for you, so saving rebuilds your matches.</p>
        <div class="afm-chips" id="sk-chips">${list.map((s, i) => `<span>${esc(s)} <a href="#" data-x="${i}" aria-label="Remove ${esc(s)}" style="text-decoration:none">×</a></span>`).join('')}</div>
        <input class="afm-in" id="sk-add" placeholder="Add a skill" maxlength="40" style="margin-top:12px"><div class="afm-note" id="ed-msg">${list.length} of 40</div>`
      pane.querySelectorAll('[data-x]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); list.splice(Number(a.dataset.x), 1); draw(); check() }))
      const add = pane.querySelector('#sk-add')
      add.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        const v = add.value.trim()
        if (v && list.length < 40 && !list.some((s) => s.toLowerCase() === v.toLowerCase())) { list.push(v); draw(); check(); pane.querySelector('#sk-add').focus() }
      })
    }
    const check = () => c.dirty(JSON.stringify(list) !== was, save)
    const save = async () => {
      const r = await c.write('skills', { skills: list, favourites: c.ed.favourites.filter((f) => list.some((s) => s.toLowerCase() === f.toLowerCase())) })
      const msg = pane.querySelector('#ed-msg')
      if (!r.ok) { msg.textContent = r.error || 'We could not save that.'; return }
      await c.saved('Saved.')
    }
    draw(); c.dirty(false)
  }

  // ------------------------------------------------------------------ equal employment
  const WORK_QUESTIONS = [
    ['authorisedToWork', 'Are you legally authorised to work in India?', true, false],
    ['needsSponsorship', 'Will you now or in the future require sponsorship for an employment visa?', true, false],
    ['willingToRelocate', 'Are you willing to relocate?', false, true],
  ]
  const DECLINED = 'decline'

  function equal(pane, c) {
    const self = { ...c.ed.selfId }; const work = { ...c.ed.work }
    const was = JSON.stringify([self, work])
    const chips = (name, options, value, clearValue, clearLabel) => `<div class="afm-chips" data-q="${name}">${options.map(([v, l]) => `<button type="button" class="afm-ghost ${value === v ? 'on' : ''}" data-v="${esc(v)}" style="padding:7px 14px;font-size:13px;${value === v ? 'border-color:var(--accent);background:var(--chip)' : ''}">${esc(l)}</button>`).join('')}${clearLabel ? `<button type="button" class="afm-ghost ${value === clearValue ? 'on' : ''}" data-v="${esc(clearValue)}" data-clear="1" style="padding:7px 14px;font-size:13px;${value === clearValue ? 'border-color:var(--accent);background:var(--chip)' : ''}">${esc(clearLabel)}</button>` : ''}</div>`
    const YN = [['yes', 'Yes'], ['no', 'No']]
    const draw = () => {
      const q = (key, label, required, html) => `<div class="afm-card2" style="padding:12px 16px"><label class="afm-l" style="margin:0 0 8px">${esc(label)}${star(required)}</label>${html}</div>`
      pane.innerHTML = `<h3>Equal Employment</h3><p class="afm-sub">Answer, or choose “Decline to state”. Only what you answer is ever filled; a question marked <span style="color:#f87171">*</span> needs one or the other.</p>
        ${WORK_QUESTIONS.map(([k, l, req, optionalDecline]) => q(k, l, req, chips('w:' + k, YN, work[k] || '', '', optionalDecline ? 'Decline to state' : ''))).join('')}
        ${c.ed.selfIdFields.map((f) => {
          const opts = f.kind === 'yesno' ? YN : (f.options || []).map((o) => [o, o])
          const html = opts.length ? chips('s:' + f.key, opts, self[f.key] || '', f.required ? DECLINED : '', 'Decline to state') : `<input class="afm-in" data-s="${f.key}" maxlength="60" placeholder="Decline to state" value="${esc(self[f.key] === DECLINED ? '' : self[f.key] || '')}">`
          return q(f.key, f.label, f.required, html)
        }).join('')}<div class="afm-note" id="ed-msg"></div>`
      pane.querySelectorAll('[data-q]').forEach((g) => g.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return
        const [scope, key] = g.dataset.q.split(':'); const store = scope === 'w' ? work : self
        const cur = store[key] || ''; const next = b.dataset.v
        if (cur === next) delete store[key]; else store[key] = next
        // An optional question's Decline simply empties it.
        if (b.dataset.clear && next === '') delete store[key]
        draw(); check()
      }))
      pane.querySelectorAll('[data-s]').forEach((i) => i.addEventListener('input', () => { if (i.value.trim()) self[i.dataset.s] = i.value.trim(); else delete self[i.dataset.s]; check() }))
    }
    const check = () => c.dirty(JSON.stringify([self, work]) !== was, save)
    const save = async () => {
      const msg = pane.querySelector('#ed-msg')
      const missing = [...WORK_QUESTIONS.filter(([k, , req]) => req && !work[k]).map(([, l]) => l), ...c.ed.selfIdFields.filter((f) => f.required && !self[f.key]).map((f) => f.label)]
      if (missing.length) { msg.textContent = `Please answer ${missing.length === 1 ? 'this question' : `these ${missing.length} questions`}, marked *: ${missing.join(' · ')}`; return }
      const a = await c.write('selfId', Object.fromEntries(Object.entries(self).filter(([, v]) => v)), false)
      if (!a.ok) { msg.textContent = a.error || 'We could not save that.'; return }
      const b = await c.write('extras', { authorisedToWork: work.authorisedToWork || '', needsSponsorship: work.needsSponsorship || '', willingToRelocate: work.willingToRelocate || '' }, false)
      if (!b.ok) { msg.textContent = b.error || 'We could not save that.'; return }
      await c.saved('Saved.')
    }
    draw(); c.dirty(false)
  }

  // ------------------------------------------------------------------ preference
  function preference(pane, c) {
    const profile = c.profile
    pane.innerHTML = `<h3>Preference</h3><p class="afm-sub">Filled into salary and start-date questions. Pay figures are yours — Jobinko never guesses one.</p>
      ${field('What is your expected annual salary? (lakhs)', input('expectedCtcLakhs', profile.expectedCtcLakhs || '', { ph: 'e.g. 18' }))}
      ${field('What is your current annual salary? (lakhs)', input('currentCtcLakhs', profile.currentCtcLakhs || '', { ph: 'e.g. 12' }))}
      ${field('When can you start your next job?', input('noticePeriod', profile.noticePeriod || '', { ro: true, ph: '—' }))}<div class="afm-note">Notice period comes from your Jobinko profile.</div>
      <label class="afm-l" style="margin-top:14px">Anything else we should know?</label>
      <div class="afm-note" style="margin:0 0 6px">Your own notes. Jobinko never fills them in by itself — next to a free-text question you can choose to insert them.</div>
      <textarea class="afm-in" data-k="anythingElse" rows="6" maxlength="1000">${esc(c.ed.anythingElse)}</textarea><div class="afm-note"><span id="pf-count">0</span> / 1000</div><div class="afm-note" id="ed-msg"></div>`
    const get = () => ({ expectedCtcLakhs: pane.querySelector('[data-k=expectedCtcLakhs]').value.trim(), currentCtcLakhs: pane.querySelector('[data-k=currentCtcLakhs]').value.trim(), anythingElse: pane.querySelector('[data-k=anythingElse]').value })
    const was = JSON.stringify(get())
    const ok = (v) => v === '' || /^\d+(\.\d+)?$/.test(v)
    const check = () => {
      const v = get(); pane.querySelector('#pf-count').textContent = v.anythingElse.length
      const bad = !ok(v.expectedCtcLakhs) || !ok(v.currentCtcLakhs)
      pane.querySelector('#ed-msg').textContent = bad ? 'Pay figures are numbers, in lakhs.' : ''
      c.dirty(!bad && JSON.stringify(v) !== was, save)
    }
    const save = async () => {
      const v = get(); const msg = pane.querySelector('#ed-msg')
      const { profile: p = {} } = await chrome.storage.local.get('profile')
      p.expectedCtcLakhs = v.expectedCtcLakhs; p.currentCtcLakhs = v.currentCtcLakhs
      await chrome.storage.local.set({ profile: p })
      const r = await c.write('extras', { anythingElse: v.anythingElse }, true)
      if (!r.ok) { msg.textContent = r.error || 'Pay saved here; the notes could not be saved.'; return }
      await c.saved('Saved.')
    }
    pane.addEventListener('input', check); check(); c.dirty(false)
  }

  /** Draw one tab. `c` = { ed, profile, dirty(on, fn), write(op, input, refresh), saved() }. */
  function render(key, pane, c) {
    if (key === 'personal') return personal(pane, c)
    if (key === 'education') return entries(pane, c, 'education')
    if (key === 'work') return entries(pane, c, 'work')
    if (key === 'skill') return skills(pane, c)
    if (key === 'equal') return equal(pane, c)
    if (key === 'pref') return preference(pane, c)
  }

  root.SaafEditor = { render, collect, MONTHS }
})(typeof globalThis !== 'undefined' ? globalThis : window)
