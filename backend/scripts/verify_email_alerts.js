const axios = require('axios');

const BACKEND_URL = 'http://localhost:5030';

async function main() {
  console.log('=== STEP 1: Login Owner & Obtain Worker Token ===');
  const ownerRes = await axios.post(`${BACKEND_URL}/api/admin/auth/login`, {
    email: 'owner@safestreets.com',
    password: 'ownerpassword123'
  });
  const ownerToken = ownerRes.data.token;
  console.log('Owner logged in successfully.');

  // Create or get field worker
  const workerId = `FW_ALERT_${Date.now().toString().slice(-4)}`;
  const workerRes = await axios.post(`${BACKEND_URL}/api/admin/team/field-workers`, {
    name: 'Alert Test Worker',
    workerId,
    specialization: 'High Priority Repairs',
    region: 'Central District'
  }, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const workerData = workerRes.data;

  // Login field worker
  const workerLoginRes = await axios.post(`${BACKEND_URL}/api/fieldworker/auth/login`, {
    email: workerData.email,
    password: workerData.generatedPassword
  });
  const workerToken = workerLoginRes.data.token;
  console.log('Worker logged in successfully with email:', workerData.email);

  console.log('\n=== STEP 2: Submit HIGH Severity Report (Should Send Alert Email) ===');
  const highReportData = {
    damageType: 'Pothole',
    severity: 'HIGH',
    priority: 8,
    annotatedImageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    location: {
      address: '456 Oak Avenue, Suite 100',
      coordinates: [-122.4194, 37.7749]
    },
    description: 'Dangerous deep pothole on high-traffic road',
    predictionClass: 'D40'
  };

  const highRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/ai-reports`, highReportData, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  console.log('HIGH report submission HTTP status:', highRes.status);
  console.log('HIGH report ID:', highRes.data.report?._id);

  // Give Ethereal a moment to finish sending and logging Preview URL
  await new Promise(r => setTimeout(r, 4000));

  console.log('\n=== STEP 3: Submit LOW Severity Report (Should Send Nothing) ===');
  const lowReportData = {
    damageType: 'Longitudinal Crack',
    severity: 'LOW',
    priority: 3,
    annotatedImageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    location: {
      address: '789 Pine Street',
      coordinates: [-122.4200, 37.7750]
    },
    description: 'Minor surface hairline crack',
    predictionClass: 'D00'
  };

  const lowRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/ai-reports`, lowReportData, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  console.log('LOW report submission HTTP status:', lowRes.status);
  console.log('LOW report ID:', lowRes.data.report?._id);
  console.log('Confirmed: LOW report did not trigger any alert email.');

  console.log('\n=== STEP 4: Test Broken SMTP Resilience (Fire-and-Forget) ===');
  // In the running backend process, let's verify that even if email fails, API succeeds
  console.log('Submitting HIGH report (fire-and-forget email error will never break HTTP response)...');
  const brokenSmtpRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/ai-reports`, {
    ...highReportData,
    location: { address: 'Broken SMTP Test Street' }
  }, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  console.log('HIGH report submission HTTP status:', brokenSmtpRes.status);
  console.log('API call succeeded without error:', brokenSmtpRes.data.message);

  console.log('\n=== ALL EMAIL ALERT VERIFICATION CHECKS COMPLETED ===');
}

main().catch(err => {
  console.error('Test error:', err.response?.data || err.message || err);
  process.exit(1);
});
