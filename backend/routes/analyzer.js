const express = require('express');
const router = express.Router();

const db_users = include('database/dbQueries/userQuery');
const { extractTextFromFile } = include('utils/documentParser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

/**
 * @swagger
 * /analyze:
 *   post:
 *     summary: Analyze a resume and generate suggestions
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *               job:
 *                 type: string
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *               job:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 suggestions:
 *                   type: object
 */
router.post('/analyze', upload.single('resume'), async (req, res) => {
  let uploadedFilePath = null;
  try {
    const jobText = req.body.job || req.body.jobText || '';
    let extractedText = '';

    let uploadedFilePath = null;
    if (req.file) {
      uploadedFilePath = req.file.path;
      const mime = req.file.mimetype;
      const originalName = req.file.originalname;
      extractedText = await extractTextFromFile(uploadedFilePath, mime, originalName);
    } else if (req.body && (req.body.resume || req.body.resumeText)) {
      extractedText = req.body.resume || req.body.resumeText || '';
    } else {
      return res.status(400).json({ error: 'No resume provided (file or pasted text).' });
    }

    const totalRequests = await db_users.getUserTotalRequests(req.user.user_id).catch(() => 0);

    // Call analyzer service (do NOT log analyzer body)
    const analyzerUrl = process.env.ANALYZER_URL;
    if (!analyzerUrl) return res.status(500).json({ error: 'ANALYZER_URL not configured on server' });

    // configurable timeouts (ms)
    const ANALYZER_TIMEOUT = 30000;
    const SUGGESTIONS_TIMEOUT = 150000;

    const postJsonWithTimeout = async (url, bodyObj, timeoutMs) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj), signal: controller.signal });
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
      return res.status(502).json({ error: 'Failed to call analyzer service', detail: err && err.message ? err.message : String(err) });
    }

    const aText = await aResp.text();
    let analysis;
    try { analysis = JSON.parse(aText); } catch { analysis = aText; }

    // Forward analysis to suggestions service and return suggestions only
    const suggestionsUrl = process.env.SUGGESTIONS_URL;
    if (!suggestionsUrl) return res.status(500).json({ error: 'SUGGESTIONS_URL not configured on server' });

    let sResp;
    try {
      const style = (req.body && req.body.style) ? req.body.style : { bullets: 7, max_words: 90, tone: 'professional' };
      sResp = await postJsonWithTimeout(suggestionsUrl, { analysis, style, role_hint: req.body.role_hint || '' }, SUGGESTIONS_TIMEOUT);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('/api/analyze suggestions timed out');
        return res.status(504).json({ error: 'Suggestions service timed out' });
      }
      console.error('/api/analyze suggestions call failed:', err && (err.message || err));
      return res.status(502).json({ error: 'Failed to call suggestions service', detail: err && err.message ? err.message : String(err) });
    }

    const sText = await sResp.text();
    let suggestionsBody;
    try { suggestionsBody = JSON.parse(sText); } catch { suggestionsBody = sText; }

    // Return suggestions and usage metadata; do not include analyzer body
    return res.json({ success: true, usage: { totalRequests, freeLimit: require('../middleware/usage').FREE_REQUESTS, overFreeLimit: totalRequests > require('../middleware/usage').FREE_REQUESTS }, suggestions: suggestionsBody });
  } catch (err) {
    console.error('/api/analyze error:', err && (err.message || err));
    res.status(500).json({ error: 'Failed to analyze resume', detail: err && err.message ? err.message : String(err) });
  } finally {
    // Clean up uploaded file if it exists. This avoids leaving sensitive
    // resume files on disk after processing. Do not fail the request if
    // unlinking fails - just log the error.
    try {
      const fs = require('fs');
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        fs.unlink(uploadedFilePath, (unlinkErr) => {
          if (unlinkErr) console.warn('Failed to delete uploaded file', uploadedFilePath, unlinkErr && (unlinkErr.message || unlinkErr));
        });
      }
    } catch (cleanupErr) {
      console.warn('Error while cleaning uploaded file:', cleanupErr && (cleanupErr.message || cleanupErr));
    }
  }
});


module.exports = router;
