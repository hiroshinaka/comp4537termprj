require('dotenv').config();
const express = require('express');
const router = express.Router();

const SUGGESTIONS_TIMEOUT = 120000;

const postJsonWithTimeout = async (url, bodyObj, timeoutMs) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj),
      signal: controller.signal,
    });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

router.post('/suggestions', async (req, res) => {
  try {
    const suggestionsUrl = process.env.SUGGESTIONS_URL;
    if (!suggestionsUrl) {
      return res
        .status(500)
        .json({ error: 'SUGGESTIONS_URL not configured on server' });
    }

    const { analysis, style, role_hint } = req.body || {};

    if (!analysis) {
      return res
        .status(400)
        .json({ error: 'Missing analysis in request body. Call /analyze first.' });
    }

    const outgoingStyle =
      style ||
      {
        bullets: 5,
        max_words: 180,
        tone: 'professional',
      };

    let sResp;
    try {
      sResp = await postJsonWithTimeout(
        suggestionsUrl,
        {
          analysis,
          style: outgoingStyle,
          role_hint: role_hint || '',
        },
        SUGGESTIONS_TIMEOUT
      );
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('/suggest timed out calling suggestions service');
        return res
          .status(504)
          .json({ error: 'Suggestions service timed out' });
      }
      console.error(
        '/suggest suggestions call failed:',
        err && (err.stack || err.message || err)
      );
      return res.status(502).json({
        error: 'Failed to call suggestions service',
        detail: err && err.message ? err.message : String(err),
      });
    }

    const sText = await sResp.text();
    let suggestionsBody;
    try {
      suggestionsBody = JSON.parse(sText);
    } catch {
      suggestionsBody = sText;
    }

    return res.json({ success: true, suggestions: suggestionsBody });
  } catch (err) {
    console.error(
      '/suggest error:',
      err && (err.stack || err.message || err)
    );
    return res.status(500).json({
      error: 'Failed to obtain suggestions',
      detail: err && err.message ? err.message : String(err),
    });
  }
});

module.exports = router;
