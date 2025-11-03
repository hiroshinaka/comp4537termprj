const path = require('path');

// make include() resolve from the backend root (one level up from /utils)
const baseDir = path.resolve(__dirname, '..');
global.include = (p) => require(path.join(baseDir, p));