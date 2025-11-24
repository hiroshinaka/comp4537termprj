const express = require('express');
const router = express.Router();

// Accept either an `analysis` object in the body, or `resume_text` + `job_text` and call the analyzer.
router.post('/suggest', async (req, res) => {
  const analyzerUrl = process.env.ANALYZER_URL;
  const suggestionsUrl = process.env.SUGGESTIONS_URL;
  if (!suggestionsUrl) return res.status(500).json({ error: 'SUGGESTIONS_URL not configured on server' });

  try {
    let analysis = req.body.analysis;

    // If no analysis provided, call analyzer
    if (!analysis) {
      if (!analyzerUrl) return res.status(400).json({ error: 'No analysis provided and ANALYZER_URL not configured' });
      const payload = { resume_text: req.body.resume_text || req.body.resume || '', job_text: req.body.job_text || req.body.job || '' };
      const aResp = await fetch(analyzerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const aText = await aResp.text();
      try { analysis = JSON.parse(aText); } catch { analysis = aText; }
    }

    // Call suggestions service
    const outgoingStyle = (req.body && req.body.style) ? req.body.style : { bullets: 7, max_words: 1000, tone: 'professional' };
    const sResp = await fetch(suggestionsUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis, style: outgoingStyle, role_hint: req.body.role_hint || '' })
    });

    const sText = await sResp.text();
    let suggestionsBody;
    try { suggestionsBody = JSON.parse(sText); } catch { suggestionsBody = sText; }
    return res.json({ success: true, suggestions: suggestionsBody });
  } catch (err) {
    console.error('/suggestions/suggest error:', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Failed to obtain suggestions', detail: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;
