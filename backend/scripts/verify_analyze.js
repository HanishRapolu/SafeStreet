const fs = require('fs');
const path = require('path');

async function testAI() {
  const samplePath = path.join(__dirname, 'sample.jpg');
  if (!fs.existsSync(samplePath)) {
    console.error('sample.jpg not found at', samplePath);
    return;
  }

  const b64 = fs.readFileSync(samplePath).toString('base64');
  console.log(`Sending image of size ${b64.length} base64 chars to AI server /analyze...`);

  const res = await fetch('http://127.0.0.1:5000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: b64 })
  });

  const data = await res.json();
  const display = { ...data };
  if (display.annotated_image) {
    display.annotated_image = `<base64 image truncated: ${display.annotated_image.length} chars>`;
  }
  console.log('AI server /analyze response:');
  console.log(JSON.stringify(display, null, 2));
}

testAI().catch(console.error);
