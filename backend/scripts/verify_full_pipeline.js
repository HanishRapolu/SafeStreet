const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:5030';
const AI_URL = 'http://localhost:5000';

async function main() {
  console.log('=== STEP 1: Verify Direct AI Server /analyze Endpoint ===');
  const samplePath = path.join(__dirname, 'sample.jpg');
  if (!fs.existsSync(samplePath)) {
    throw new Error('sample.jpg missing at ' + samplePath);
  }

  const imageBuffer = fs.readFileSync(samplePath);
  const base64Image = imageBuffer.toString('base64');
  console.log(`Sending image (${(imageBuffer.length / 1024).toFixed(1)} KB, ${base64Image.length} b64 chars) to ${AI_URL}/analyze...`);

  const aiRes = await axios.post(`${AI_URL}/analyze`, {
    image: base64Image
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  });

  const aiDisplay = { ...aiRes.data };
  if (aiDisplay.annotated_image) {
    aiDisplay.annotated_image = `<base64 image truncated: ${aiDisplay.annotated_image.length} chars>`;
  }
  console.log('AI Server response status:', aiRes.status);
  console.log('AI Server response body:\n', JSON.stringify(aiDisplay, null, 2));

  console.log('\n=== STEP 2: Login Owner & Create Test Field Worker via Team API ===');
  // Login Owner
  const ownerLoginRes = await axios.post(`${BACKEND_URL}/api/admin/auth/login`, {
    email: 'owner@safestreets.com',
    password: 'ownerpassword123'
  });
  const ownerToken = ownerLoginRes.data.token;
  console.log('Owner logged in successfully. Token obtained.');

  // Create Test Worker via team API
  const testWorkerId = `FW${Date.now().toString().slice(-5)}`;
  console.log(`Creating test field worker with workerId: ${testWorkerId}...`);

  const createWorkerRes = await axios.post(`${BACKEND_URL}/api/admin/team/field-workers`, {
    name: 'Verification Worker',
    workerId: testWorkerId,
    specialization: 'Road Repair',
    region: 'North Sector'
  }, {
    headers: {
      'Authorization': `Bearer ${ownerToken}`,
      'Content-Type': 'application/json'
    }
  });

  const workerInfo = createWorkerRes.data;
  console.log('Test field worker created successfully:');
  console.log(`  Name: ${workerInfo.name}`);
  console.log(`  Worker ID: ${workerInfo.workerId}`);
  console.log(`  Email: ${workerInfo.email}`);
  console.log(`  Password: ${workerInfo.generatedPassword}`);

  console.log('\n=== STEP 3: Login Field Worker ===');
  const workerLoginRes = await axios.post(`${BACKEND_URL}/api/fieldworker/auth/login`, {
    email: workerInfo.email,
    password: workerInfo.generatedPassword
  });

  const workerToken = workerLoginRes.data.token;
  console.log('Field worker logged in successfully. Worker token obtained.');

  console.log('\n=== STEP 4: Call Backend Proxy POST /api/fieldworker/damage/analyze ===');
  const form = new FormData();
  form.append('image', fs.createReadStream(samplePath));

  const backendWorkerRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/analyze`, form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${workerToken}`
    },
    timeout: 60000
  });

  const backendDisplay = { ...backendWorkerRes.data };
  if (backendDisplay.annotated_image) {
    backendDisplay.annotated_image = `<base64 image truncated: ${backendDisplay.annotated_image.length} chars>`;
  }
  console.log('Backend FieldWorker /analyze status:', backendWorkerRes.status);
  console.log('Backend FieldWorker /analyze body:\n', JSON.stringify(backendDisplay, null, 2));

  console.log('\n=== STEP 5: Call Admin Proxy POST /api/images/analyze ===');
  const adminForm = new FormData();
  adminForm.append('image', fs.createReadStream(samplePath));

  const adminRes = await axios.post(`${BACKEND_URL}/api/images/analyze`, adminForm, {
    headers: {
      ...adminForm.getHeaders(),
      'Authorization': `Bearer ${ownerToken}`
    },
    timeout: 60000
  });

  const adminDisplay = { ...adminRes.data };
  if (adminDisplay.annotated_image) {
    adminDisplay.annotated_image = `<base64 image truncated: ${adminDisplay.annotated_image.length} chars>`;
  }
  console.log('Backend Admin /analyze status:', adminRes.status);
  console.log('Backend Admin /analyze body:\n', JSON.stringify(adminDisplay, null, 2));

  console.log('\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Verification error:', err.response?.data || err.message || err);
  process.exit(1);
});
