const fs = require('fs');
const path = require('path');

// Setup canvas for pdf-parse (provides DOMMatrix, ImageData, Path2D, etc.)
try {
    const { createCanvas, ImageData, DOMMatrix } = require('canvas');
    
    // Polyfill DOMMatrix
    if (!global.DOMMatrix) {
        global.DOMMatrix = DOMMatrix || class DOMMatrix {
            constructor() {
                this.m = [1, 0, 0, 1, 0, 0];
            }
        };
    }
    
    // Polyfill ImageData
    if (!global.ImageData) {
        global.ImageData = ImageData || class ImageData {
            constructor(width, height) {
                this.width = width;
                this.height = height;
                this.data = new Uint8ClampedArray(width * height * 4);
            }
        };
    }
    
    // Polyfill Path2D
    if (!global.Path2D) {
        global.Path2D = class Path2D {
            constructor() {}
            moveTo() {}
            lineTo() {}
            closePath() {}
        };
    }
} catch (err) {
    console.warn('Canvas not available, PDF parsing may not work:', err.message);
}

// `pdf-parse` may export the parser function as the module or as the `default` property
let pdfParse = require('pdf-parse');
// Normalize possible shapes of the export:
// - legacy: function(buffer)
// - new: { PDFParse: class PDFParse }
// - ESM default wrapper: { default: { PDFParse: ... } }
if (pdfParse && typeof pdfParse !== 'function') {
  if (pdfParse.default && typeof pdfParse.default === 'function') {
    pdfParse = pdfParse.default;
  }
}
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
      // Several pdf-parse versions provide different APIs. Try common patterns:
      // 1) legacy: pdfParse(buffer) -> { text }
      if (typeof pdfParse === 'function') {
        const parsed = await pdfParse(data);
        return (parsed && parsed.text) ? String(parsed.text).trim() : '';
      }

      // 2) modern: pdfParse.PDFParse is a class we can instantiate
      const PDFParseClass = (pdfParse && (pdfParse.PDFParse || (pdfParse.default && pdfParse.default.PDFParse)));
      if (typeof PDFParseClass === 'function') {
        const parser = new PDFParseClass({ data });
        try {
          const textResult = await parser.getText();
          return (textResult && textResult.text) ? String(textResult.text).trim() : '';
        } finally {
          if (typeof parser.destroy === 'function') await parser.destroy();
        }
      }

      throw new Error('pdf-parse import is not a recognized callable or PDFParse class; check installed version and CommonJS/ESM interop');
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
    // Log the original error for server diagnostics and bubble up a clearer message
    console.error('extractTextFromFile error:', err && (err.stack || err.message || err));
    throw new Error(`extractTextFromFile failed: ${err && err.message ? err.message : String(err)}`);
  }
}

module.exports = {
  extractTextFromFile,
};
