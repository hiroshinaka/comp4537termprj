const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');


async function extractTextFromFile(filePath, mimeType = '', originalName = '') {
  const lowerName = (originalName || '').toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  // Helper to read txt
  const readTextFile = (p) => fs.readFileSync(p, 'utf8');

  try {
    // PDF
    if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
      const data = fs.readFileSync(filePath);
      const parsed = await pdfParse(data);
      return (parsed && parsed.text) ? String(parsed.text).trim() : '';
    }

    // DOCX (OpenXML)
    if (lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return (result && result.value) ? String(result.value).trim() : '';
    }

    // Plain text
    if (lowerMime.startsWith('text/') || lowerName.endsWith('.txt')) {
      return readTextFile(filePath);
    }

    // Old binary .doc: try to fall back by file extension. NOTE: mammoth doesn't support .doc.
    if (lowerName.endsWith('.doc')) {
      // Best-effort: try to use mammoth by converting externally, or inform the caller
      throw new Error('Legacy .doc files are not supported by this parser. Convert to .docx or use a server-side converter.');
    }

    // Unknown type: try to read as text as a last resort
    try {
      return readTextFile(filePath);
    } catch (err) {
      throw new Error('Unsupported file type for text extraction');
    }
  } catch (err) {
    // Bubble up errors with helpful message
    throw new Error(`extractTextFromFile failed: ${err && err.message ? err.message : String(err)}`);
  }
}

module.exports = {
  extractTextFromFile,
};
