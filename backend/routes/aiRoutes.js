// backend/routes/aiRoutes.js
import express from "express";
import axios from "axios";

const router = express.Router();

// Base URLs for your Spaces
const ANALYZER_URL = process.env.ANALYZER_URL;
const SUGGESTIONS_URL = process.env.SUGGESTIONS_URL;

router.post("/process-resume", async (req, res) => {
  const { resume_text, job_text } = req.body;

  try {
    
    const analyzeRes = await axios.post(ANALYZER_URL, { resume_text, job_text });
    const analysis = analyzeRes.data;

    const suggestRes = await axios.post(SUGGESTIONS_URL, {
      analysis,
      style: { bullets: 3, max_words: 90, tone: "professional" },
      role_hint: "Software Engineer, Backend Developer, Full Stack Developer, DevOps Engineer"
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