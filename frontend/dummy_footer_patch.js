const fs = require('fs');
let code = fs.readFileSync('src/pages/LandingPage.jsx', 'utf8');

const footerCode = `
function Footer() {
  return (
    <div style={{ height: '300px', backgroundColor: '#1A383B', color: '#D9C396', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem', marginBottom: '20px' }}>Features</h2>
      <div style={{ display: 'flex', gap: '40px' }}>
        <div>Interactive Canvas</div>
        <div>AI Companion</div>
        <div>Mood Journal</div>
      </div>
    </div>
  )
}
`;

code = code.replace('<DeskSection />', '<DeskSection />\n      <Footer />');
code = code.replace('import DeskSection from \'./DeskSection\'', 'import DeskSection from \'./DeskSection\'\n' + footerCode);

fs.writeFileSync('src/pages/LandingPage.jsx', code);
