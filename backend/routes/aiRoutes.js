// backend/routes/aiRoutes.js
import express from "express";
import axios from "axios";

const router = express.Router();

// Base URLs for your Spaces
const ANALYZER_URL = "https://hiroshinl-analyzer.hf.space/analyze";
const SUGGESTIONS_URL = "https://hiroshinl-suggestions.hf.space/suggest";

router.post("/process-resume", async (req, res) => {
  const { resume_text, job_text } = req.body;

  try {
    // 1️⃣ Call Analyzer microservice
    const analyzeRes = await axios.post(ANALYZER_URL, { resume_text, job_text });
    const analysis = analyzeRes.data;

    // 2️⃣ Call Suggestions microservice
    const suggestRes = await axios.post(SUGGESTIONS_URL, {
      analysis,
      style: { bullets: 3, max_words: 90, tone: "professional" },
      role_hint: "Data Analyst Co-op"
    });

    // 3️⃣ Return combined response
    return res.json({
      analysis,
      suggestions: suggestRes.data.suggestions
    });
  } catch (err) {
    console.error("Error calling AI services:", err.message);
    return res.status(500).json({ error: "Failed to process resume" });
  }
});

export default router;