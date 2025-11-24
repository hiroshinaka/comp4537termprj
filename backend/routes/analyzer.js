const express = require('express');
const router = express.Router();

const db_users = include('database/dbQueries/userQuery');
const { extractTextFromBuffer } = include('utils/documentParser');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const ANALYZER_TIMEOUT = 30000;
router.post('/analyzer', upload.single('resume'), async (req, res) => {
  try {
    const jobText = req.body.job || req.body.jobText || '';
    let extractedText = '';

    if (req.file) {
      const mime = req.file.mimetype;
      const originalName = req.file.originalname;
      const buffer = req.file.buffer;
      extractedText = await extractTextFromBuffer(buffer, mime, originalName);
    } else if (req.body && (req.body.resume || req.body.resumeText)) {
      extractedText = req.body.resume || req.body.resumeText || '';
    } else {
      return res.status(400).json({ error: 'No resume provided (file or pasted text).' });
    }

    const totalRequests = await db_users.getUserTotalRequests(req.user.user_id).catch(() => 0);

    const analyzerUrl = process.env.ANALYZER_URL;
    if (!analyzerUrl) {
      return res.status(500).json({ error: 'ANALYZER_URL not configured on server' });
    }

    const ANALYZER_TIMEOUT = 30000;

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

    const analyzerPayload = { resume_text: extractedText, job_text: jobText };

    let aResp;
    try {
      aResp = await postJsonWithTimeout(analyzerUrl, analyzerPayload, ANALYZER_TIMEOUT);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('/api/analyze analyzer timed out');
        return res.status(504).json({ error: 'Analyzer service timed out' });
      }
      console.error('/api/analyze analyzer call failed:', err && (err.message || err));
      return res.status(502).json({
        error: 'Failed to call analyzer service',
        detail: err && err.message ? err.message : String(err),
      });
    }

    const aText = await aResp.text();
    let analysis;
    try {
      analysis = JSON.parse(aText);
    } catch {
      analysis = aText;
    }

    // ⬅️ Important: stop here, just return analysis
    return res.json({
      success: true,
      usage: {
        totalRequests,
        freeLimit: require('../middleware/usage').FREE_REQUESTS,
        overFreeLimit: totalRequests > require('../middleware/usage').FREE_REQUESTS,
      },
      analysis,
    });
  } catch (err) {
    console.error('/api/analyze error:', err && (err.message || err));
    res.status(500).json({
      error: 'Failed to analyze resume',
      detail: err && err.message ? err.message : String(err),
    });
  }
});

  module.exports = router;
