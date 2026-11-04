const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKEND_PORT = process.env.PORT || 5030;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const AI_URL = process.env.AI_SERVER_URL || 'http://127.0.0.1:5000';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@safestreets.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'ownerpassword123';

const SAMPLE_IMAGE_PATH = path.join(__dirname, 'sample.jpg');

let passedSteps = 0;
let totalSteps = 12;

function pass(stepNum, description, details = '') {
  passedSteps++;
  console.log(`[PASS] Step ${stepNum}: ${description}${details ? ` -> ${details}` : ''}`);
}

function fail(stepNum, description, error) {
  const errMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || error;
  console.error(`[FAIL] Step ${stepNum}: ${description}`);
  console.error(`       Details:`, errMsg);
  if (error?.response?.data) {
    console.error(`       Response:`, JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
}

async function runSmokeTest() {
  console.log('================================================================');
  console.log('       SafeStreets Full Flow End-to-End Smoke Test              ');
  console.log('================================================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`AI Server URL: ${AI_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------\n');

  // Pre-flight check
  if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
    console.error(`Error: sample.jpg not found at ${SAMPLE_IMAGE_PATH}`);
    process.exit(1);
  }

  let ownerToken;
  let adminData;
  let adminToken;
  let workerData;
  let workerToken;
  let analyzeData;
  let aiReportId;
  let damageReportId;
  let damageReportCode;

  // STEP 1: Owner login
  try {
    const res = await axios.post(`${BACKEND_URL}/api/admin/auth/login`, {
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD
    });
    ownerToken = res.data.token;
    if (!ownerToken) throw new Error('No token returned in owner login response');
    pass(1, 'Owner login', `Logged in as ${OWNER_EMAIL}`);
  } catch (err) {
    fail(1, 'Owner login', err);
  }

  // STEP 2: Create admin
  try {
    const timestamp = Date.now();
    const adminEmail = `smoke.admin.${timestamp}@safestreets.com`;
    const adminPassword = `SmokeAdmin${timestamp.toString().slice(-4)}!`;

    const createRes = await axios.post(`${BACKEND_URL}/api/admin/team/admins`, {
      name: `Smoke Admin ${timestamp.toString().slice(-4)}`,
      email: adminEmail,
      password: adminPassword
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });

    adminData = createRes.data;
    if (!adminData?._id) throw new Error('No admin ID returned from create admin');

    // Also login as the newly created admin to test credentials and get adminToken
    const loginRes = await axios.post(`${BACKEND_URL}/api/admin/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });
    adminToken = loginRes.data.token;
    if (!adminToken) throw new Error('No token returned for newly created admin');

    pass(2, 'Create admin', `Created and authenticated admin: ${adminEmail}`);
  } catch (err) {
    fail(2, 'Create admin', err);
  }

  // STEP 3: Create field worker
  try {
    const timestamp = Date.now();
    const workerId = `SW${timestamp.toString().slice(-5)}`;
    const workerName = `Smoke Worker ${timestamp.toString().slice(-4)}`;

    const createWorkerRes = await axios.post(`${BACKEND_URL}/api/admin/team/field-workers`, {
      name: workerName,
      workerId: workerId,
      specialization: 'Pothole & Surface Repair',
      region: 'Central District'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    workerData = createWorkerRes.data;
    if (!workerData?._id || !workerData?.email || !workerData?.generatedPassword) {
      throw new Error('Incomplete worker credentials returned');
    }
    pass(3, 'Create field worker', `Created worker ${workerId} (${workerData.email})`);
  } catch (err) {
    fail(3, 'Create field worker', err);
  }

  // STEP 4: Worker login
  try {
    const workerLoginRes = await axios.post(`${BACKEND_URL}/api/fieldworker/auth/login`, {
      email: workerData.email,
      password: workerData.generatedPassword
    });

    workerToken = workerLoginRes.data.token;
    if (!workerToken) throw new Error('No worker token returned');
    pass(4, 'Worker login', `Logged in as worker ${workerData.workerId}`);
  } catch (err) {
    fail(4, 'Worker login', err);
  }

  // STEP 5: POST analyze with backend/scripts/sample.jpg
  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(SAMPLE_IMAGE_PATH));

    const analyzeRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/analyze`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${workerToken}`
      },
      timeout: 60000
    });

    analyzeData = analyzeRes.data;
    if (!analyzeData.success) {
      throw new Error(`Analyze returned success=false: ${JSON.stringify(analyzeData)}`);
    }

    const detectedType = analyzeData.primary?.damageType || analyzeData.damageType || 'Road Surface';
    const severity = analyzeData.severity || 'UNKNOWN';
    const priority = analyzeData.priority || 0;

    pass(5, 'POST analyze with sample.jpg', `isRoad: ${analyzeData.isRoad}, type: ${detectedType}, severity: ${severity}, priority: ${priority}`);
  } catch (err) {
    fail(5, 'POST analyze with sample.jpg', err);
  }

  // STEP 6: Worker submits AI report
  try {
    const damageType = analyzeData.primary?.damageType || analyzeData.damageType || 'Pothole';
    const severity = analyzeData.severity || 'HIGH';
    const priority = analyzeData.priority || 8;
    const predictionClass = analyzeData.primary?.class || 'D30';

    const reportPayload = {
      damageType,
      severity,
      priority,
      location: {
        coordinates: [-89.6501, 39.7817],
        address: '100 Smoke Test Blvd, Springfield'
      },
      description: `Automated smoke test detection: ${damageType} (${severity})`,
      predictionClass,
      annotatedImageBase64: analyzeData.annotated_image,
      yoloDetections: analyzeData.detections || [],
      yoloDetectionCount: analyzeData.detections?.length || 0
    };

    const submitRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/ai-reports`, reportPayload, {
      headers: {
        Authorization: `Bearer ${workerToken}`,
        'Content-Type': 'application/json'
      }
    });

    aiReportId = submitRes.data.report?._id || submitRes.data._id || submitRes.data.reportId;
    if (!aiReportId) throw new Error('No AI report ID returned from submission');
    pass(6, 'Worker submits AI report', `Report saved with AI Report ID: ${aiReportId}`);
  } catch (err) {
    fail(6, 'Worker submits AI report', err);
  }

  // STEP 7: Admin lists AI reports
  try {
    const listRes = await axios.get(`${BACKEND_URL}/api/images/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const reports = listRes.data.reports || listRes.data;
    if (!Array.isArray(reports)) throw new Error('Reports response is not an array');

    const matching = reports.find(r => (r.id || r._id)?.toString() === aiReportId.toString());
    if (!matching) {
      throw new Error(`Submitted AI report ${aiReportId} not found in admin report list (total: ${reports.length})`);
    }
    pass(7, 'Admin lists AI reports', `Verified report ${aiReportId} among ${reports.length} total AI reports`);
  } catch (err) {
    fail(7, 'Admin lists AI reports', err);
  }

  // STEP 8: Admin creates damage report from it
  try {
    const createDamageRes = await axios.post(`${BACKEND_URL}/api/damage/reports/create-from-ai`, {
      region: 'Central District',
      location: '100 Smoke Test Blvd, Springfield',
      damageType: analyzeData.primary?.damageType || analyzeData.damageType || 'Pothole',
      severity: analyzeData.severity || 'HIGH',
      priority: analyzeData.priority || 8,
      reporter: workerData.name,
      aiReportId: aiReportId,
      description: 'Formal repair ticket created from AI inspection',
      action: 'Emergency Repair'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    damageReportId = createDamageRes.data.report?.id || createDamageRes.data.report?._id;
    damageReportCode = createDamageRes.data.report?.reportId;
    if (!damageReportId) throw new Error('No damage report ID returned from create-from-ai');

    pass(8, 'Admin creates damage report from it', `Damage report created: ${damageReportCode} (ID: ${damageReportId})`);
  } catch (err) {
    fail(8, 'Admin creates damage report from it', err);
  }

  // STEP 9: Admin assigns worker
  try {
    const assignRes = await axios.patch(`${BACKEND_URL}/api/damage/reports/${damageReportId}/assign`, {
      workerId: workerData._id
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (!assignRes.data.success && assignRes.status !== 200) {
      throw new Error(`Assignment unsuccessful: ${JSON.stringify(assignRes.data)}`);
    }

    pass(9, 'Admin assigns worker', `Assigned ${damageReportCode} to worker ${workerData.workerId} (${workerData.name})`);
  } catch (err) {
    fail(9, 'Admin assigns worker', err);
  }

  // STEP 10: Worker sets in_progress then completed
  try {
    // 10a: Set in_progress
    const inProgressRes = await axios.patch(`${BACKEND_URL}/api/fieldworker/damage/reports/${damageReportId}/status`, {
      status: 'in_progress',
      notes: 'Field worker has arrived on site; commencing asphalt patch'
    }, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });

    if (inProgressRes.data.report?.repairStatus !== 'in_progress') {
      throw new Error(`Expected repairStatus 'in_progress', got '${inProgressRes.data.report?.repairStatus}'`);
    }

    // 10b: Set completed
    const completedRes = await axios.patch(`${BACKEND_URL}/api/fieldworker/damage/reports/${damageReportId}/status`, {
      status: 'completed',
      notes: 'Asphalt compaction and edge sealing completed'
    }, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });

    if (completedRes.data.report?.repairStatus !== 'completed') {
      throw new Error(`Expected repairStatus 'completed', got '${completedRes.data.report?.repairStatus}'`);
    }

    pass(10, 'Worker sets in_progress then completed', `Status transitioned: in_progress -> completed`);
  } catch (err) {
    fail(10, 'Worker sets in_progress then completed', err);
  }

  // STEP 11: Worker uploads after-image
  try {
    const afterForm = new FormData();
    afterForm.append('afterImage', fs.createReadStream(SAMPLE_IMAGE_PATH));

    const uploadRes = await axios.post(`${BACKEND_URL}/api/fieldworker/damage/reports/${damageReportId}/after-image`, afterForm, {
      headers: {
        ...afterForm.getHeaders(),
        Authorization: `Bearer ${workerToken}`
      }
    });

    if (uploadRes.status !== 200) {
      throw new Error(`Upload returned status ${uploadRes.status}`);
    }

    pass(11, 'Worker uploads after-image', `Uploaded post-repair proof image`);
  } catch (err) {
    fail(11, 'Worker uploads after-image', err);
  }

  // STEP 12: Report status is Resolved
  try {
    const reportCheckRes = await axios.get(`${BACKEND_URL}/api/fieldworker/damage/reports/${damageReportId}`, {
      headers: { Authorization: `Bearer ${workerToken}` }
    });

    const currentStatus = reportCheckRes.data.status;
    const resolvedAt = reportCheckRes.data.resolvedAt;

    if (currentStatus !== 'Resolved') {
      throw new Error(`Expected report status 'Resolved', but found '${currentStatus}'`);
    }

    pass(12, 'Report status is Resolved', `Status: ${currentStatus}, ResolvedAt: ${resolvedAt}`);
  } catch (err) {
    fail(12, 'Report status is Resolved', err);
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`SMOKE TEST RESULT: ${passedSteps}/${totalSteps} STEPS PASSED`);
  console.log('================================================================');
  process.exit(0);
}

runSmokeTest();
