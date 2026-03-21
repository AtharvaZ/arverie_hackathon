const fs = require('fs');
let code = fs.readFileSync('src/pages/CanvasPage.jsx', 'utf8');

code = code.replace(/import \{ Tldraw, exportToBlob \} from "tldraw";/, 'import { Tldraw } from "tldraw";');
code = code.replace(/const blob = await exportToBlob\(\{\n\s*editor,\n\s*ids: shapeIds,\n\s*format: "png",\n\s*opts: \{ background: true, padding: 16 \},\n\s*\}\);/, 'const { blob } = await editor.toImage(shapeIds, { format: "png", background: true, padding: 16 });');

fs.writeFileSync('src/pages/CanvasPage.jsx', code);
