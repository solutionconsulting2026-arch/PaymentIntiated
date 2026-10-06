/**
 * Vercel Serverless Function: /api/update-lead
 */
const https = require('https');

function httpsPost(targetUrl, headers, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
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
          resolve({ status: res.statusCode, data: JSON.parse(body) });
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

function buildPayload(leadId, status) {
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
        StatusCode: status
      }
    }
  ]);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const leadId = String(req.body?.leadId || req.body?.leadid || req.query?.leadid || '20964').trim();

    // 1. Login
    const loginRes = await httpsPost(
      'https://presales.businessbywire.com/restapigb8/oauth2/token',
      {},
      JSON.stringify({
        userName: 'james@crmnext.com',
        password: 'Chief@admin2025'
      })
    );

    if (loginRes.status !== 200 || !loginRes.data?.access_token) {
      return res.status(500).json({ error: 'Failed to obtain access token', details: loginRes });
    }

    const accessToken = loginRes.data.access_token;

    // 2. Update Lead
    let saveRes = await httpsPost(
      'https://presales.businessbywire.com/restapigb8/crmWebApi/saveObject',
      { 'Authorization': `Bearer ${accessToken}` },
      buildPayload(leadId, "Intial Fund Collected")
    );

    const msg = JSON.stringify(saveRes.data || '');
    if (msg.includes('Invalid data of SN_STATUSCODE')) {
      saveRes = await httpsPost(
        'https://presales.businessbywire.com/restapigb8/crmWebApi/saveObject',
        { 'Authorization': `Bearer ${accessToken}` },
        buildPayload(leadId, "Initial Fund Collected")
      );
    }

    return res.status(200).json({
      success: true,
      leadId,
      crmResponse: saveRes.data || saveRes.raw
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
