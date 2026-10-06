/**
 * IndusInd Bank Payment Gateway & CRMnext Proxy Server
 * Zero external dependencies (uses native Node http/https/fs)
 * Run locally or in Docker: `node server.js`
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const CRM_CONFIG = {
  tokenUrl: 'https://presales.businessbywire.com/restapigb8/oauth2/token',
  saveUrl: 'https://presales.businessbywire.com/restapigb8/crmWebApi/saveObject',
  userName: 'james@crmnext.com',
  password: 'Chief@admin2025'
};

function httpsPost(targetUrl, headers, data) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function buildSavePayload(leadId, statusCode) {
  return JSON.stringify([
    {
      ItemId: "0",
      ItemType: "Lead",
      ProcessMode: "Update",
      OutputFieldList: ["LeadId", "ItemId"],
      Condition: [
        {
          FieldName: "LeadId",
          Operation: "0",
          Value: String(leadId)
        }
      ],
      ObjectData: {
        StatusCode: statusCode
      }
    }
  ]);
}

async function handleUpdateLead(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const leadId = String(payload.leadId || payload.leadid || '20964').trim();

      console.log(`[CRM Integration] Received lead update request for LeadId: ${leadId}`);

      // Step 1: Login API
      console.log(`[CRM Integration] Calling login API: ${CRM_CONFIG.tokenUrl}`);
      const loginPayload = JSON.stringify({
        userName: CRM_CONFIG.userName,
        password: CRM_CONFIG.password
      });

      const loginRes = await httpsPost(CRM_CONFIG.tokenUrl, {}, loginPayload);
      if (loginRes.status !== 200 || !loginRes.data || !loginRes.data.access_token) {
        console.error('[CRM Integration] Login failed:', loginRes);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Failed to obtain access token from CRMnext',
          details: loginRes
        }));
      }

      const accessToken = loginRes.data.access_token;
      console.log('[CRM Integration] Access token generated successfully.');

      // Step 2: Save / Update Object API with "Intial Fund Collected"
      console.log(`[CRM Integration] Calling update API for Lead ${leadId}`);
      let saveRes = await httpsPost(CRM_CONFIG.saveUrl, {
        'Authorization': `Bearer ${accessToken}`
      }, buildSavePayload(leadId, "Intial Fund Collected"));

      // Auto-retry with "Initial Fund Collected" if CRM picklist spelling requires it
      const responseMsg = JSON.stringify(saveRes.data || '');
      if (responseMsg.includes('Invalid data of SN_STATUSCODE')) {
        console.log('[CRM Integration] Picklist mismatch detected, retrying with "Initial Fund Collected"...');
        saveRes = await httpsPost(CRM_CONFIG.saveUrl, {
          'Authorization': `Bearer ${accessToken}`
        }, buildSavePayload(leadId, "Initial Fund Collected"));
      }

      console.log('[CRM Integration] Save API response:', saveRes);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: true,
        leadId: leadId,
        crmResponse: saveRes.data || saveRes.raw
      }));

    } catch (err) {
      console.error('[CRM Integration] Exception:', err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // CORS headers for preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // API Route
  if (parsedUrl.pathname === '/api/update-lead' && req.method === 'POST') {
    return handleUpdateLead(req, res);
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.json': 'application/json'
  };

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`IndusInd Bank Payment portal running at http://localhost:${PORT}`);
  console.log(`Test with URL param: http://localhost:${PORT}?leadid=20964`);
});
