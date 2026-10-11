import http from 'node:http'
const JD = 'Customer Success Manager. You will own a book of enterprise accounts, drive adoption and renewals, run quarterly business reviews, partner with sales on expansion, and act as the voice of the customer inside the company. We are looking for 3+ years of experience in customer success, account management or a similar role, strong stakeholder management, comfort with Excel and CRM tools such as Salesforce, and excellent communication. You will report to the Head of Customer Success and work closely with product and support teams across Bengaluru.'
const html = `<!doctype html><html><head><title>Customer Success Manager – Acme</title>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'JobPosting', title: 'Customer Success Manager', description: JD, hiringOrganization: { '@type': 'Organization', name: 'Acme Robotics' }, jobLocation: { '@type': 'Place', address: { addressLocality: 'Bengaluru', addressCountry: 'IN' } } })}</script>
<style>body{font:16px sans-serif;max-width:640px;margin:30px auto;padding:0 20px}label{display:block;margin-top:12px;font-weight:600}input,select,textarea{width:100%;padding:8px}</style></head>
<body><h1>Customer Success Manager</h1><p>Acme Robotics · Bengaluru</p><p>${JD}</p>
<form id="app"><h2>Apply for this job</h2>
<label for="fn">First Name *</label><input id="fn" name="first_name" required>
<label for="ln">Last Name *</label><input id="ln" name="last_name" required>
<label for="em">Email *</label><input id="em" type="email" name="email" required>
<label for="ph">Phone</label><input id="ph" type="tel" name="phone">
<label for="rs">Resume/CV *</label><input id="rs" type="file" name="resume" required>
<label for="li">LinkedIn Profile</label><input id="li" name="linkedin">
<label for="hear">How did you hear about us? *</label><select id="hear" name="hear" required><option value="">Select…</option><option>LinkedIn</option><option>Referral</option><option>Other</option></select>
<fieldset><legend>Are you currently authorized to work in India? *</legend><label><input type="radio" name="auth" value="yes" required> Yes</label><label><input type="radio" name="auth" value="no"> No</label></fieldset>
<label for="why">Why do you want to work here? *</label><textarea id="why" name="why" required></textarea>
<button type="submit" onclick="return false">Submit application</button></form></body></html>`
export function serve(port = 4100) {
  const srv = http.createServer((q, s) => { s.setHeader('content-type', 'text/html'); s.end(html) }).listen(port)
  return srv
}
