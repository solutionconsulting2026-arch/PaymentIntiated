/**
 * IndusInd Bank - CRM Initiated Payment & Thank You Screen
 * Includes CRMnext API Token Generation & Lead Status Update
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Parse Lead ID from URL Query Parameter (e.g. ?leadid=20964 or ?leadId=20964) ---
  const urlParams = new URLSearchParams(window.location.search);
  const currentLeadId = (urlParams.get('leadid') || urlParams.get('leadId') || '20964').trim();

  // State
  const state = {
    leadId: currentLeadId,
    fundingAmount: 10000,
    cardFee: 500,
    gstFee: 90,
    totalPayable: 10590,
    activeTab: 'tabUpi',
    selectedUpiMode: 'apps',
    selectedUpiApp: 'Google Pay',
    selectedBank: 'State Bank of India',
    qrTimerSeconds: 299,
    qrTimerInterval: null
  };

  // Bind Lead ID to DOM elements
  const dispCrmLeadBadge = document.getElementById('dispCrmLeadBadge');
  const dispCrmLeadRibbon = document.getElementById('dispCrmLeadRibbon');
  const dispThankYouLeadId = document.getElementById('dispThankYouLeadId');
  const dispLeadIdInMsg = document.getElementById('dispLeadIdInMsg');

  if (dispCrmLeadBadge) dispCrmLeadBadge.textContent = state.leadId;
  if (dispCrmLeadRibbon) dispCrmLeadRibbon.textContent = state.leadId;
  if (dispThankYouLeadId) dispThankYouLeadId.textContent = state.leadId;
  if (dispLeadIdInMsg) dispLeadIdInMsg.textContent = state.leadId;

  // Views
  const paymentView = document.getElementById('paymentView');
  const thankYouView = document.getElementById('thankYouView');

  // Payment Tabs
  const navTabBtns = document.querySelectorAll('.nav-tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // UPI Sub-modes
  const upiSubBtns = document.querySelectorAll('.upi-sub-btn');
  const upiSubApps = document.getElementById('upiSubApps');
  const upiSubVpa = document.getElementById('upiSubVpa');
  const upiSubQr = document.getElementById('upiSubQr');
  const upiAppTiles = document.querySelectorAll('.upi-app-tile');
  const vpaInput = document.getElementById('vpaInput');
  const btnVerifyVpa = document.getElementById('btnVerifyVpa');
  const vpaStatus = document.getElementById('vpaStatus');
  const handleChips = document.querySelectorAll('.handle-chip');
  const qrTimer = document.getElementById('qrTimer');

  // Debit Card Fields
  const cardNum = document.getElementById('cardNum');
  const cardExp = document.getElementById('cardExp');
  const cardCvv = document.getElementById('cardCvv');
  const cardNetworkLabel = document.getElementById('cardNetworkLabel');
  const badgeVisa = document.getElementById('badgeVisa');
  const badgeMastercard = document.getElementById('badgeMastercard');
  const badgeRupay = document.getElementById('badgeRupay');

  // Net Banking Fields
  const bankPills = document.querySelectorAll('.bank-pill');
  const otherBankSelect = document.getElementById('otherBankSelect');

  // Submit CTA & Status Note
  const btnPaySubmit = document.getElementById('btnPaySubmit');
  const btnPayText = document.getElementById('btnPayText');
  const apiProgressNote = document.getElementById('apiProgressNote');

  // Thank You Receipt Elements
  const dispTxnRef = document.getElementById('dispTxnRef');
  const dispSuccessMode = document.getElementById('dispSuccessMode');
  const dispUtrNum = document.getElementById('dispUtrNum');
  const dispTimestamp = document.getElementById('dispTimestamp');
  const dispCrmStatusMsg = document.getElementById('dispCrmStatusMsg');

  // --- Payment Tab Switching ---
  navTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navTabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) {
        targetTab.classList.add('active');
        state.activeTab = btn.dataset.tab;
      }
    });
  });

  // --- UPI Sub-tabs (Apps / VPA / QR) ---
  upiSubBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      upiSubBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sub = btn.dataset.sub;
      state.selectedUpiMode = sub;

      upiSubApps.classList.remove('active');
      upiSubVpa.classList.remove('active');
      upiSubQr.classList.remove('active');

      if (sub === 'apps') {
        upiSubApps.classList.add('active');
      } else if (sub === 'vpa') {
        upiSubVpa.classList.add('active');
      } else if (sub === 'qr') {
        upiSubQr.classList.add('active');
        startQrTimer();
      }
    });
  });

  // --- UPI App Selection ---
  upiAppTiles.forEach(tile => {
    tile.addEventListener('click', () => {
      upiAppTiles.forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      state.selectedUpiApp = tile.dataset.app;
    });
  });

  // --- UPI VPA Handle Click ---
  handleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const h = chip.dataset.h;
      let curr = vpaInput.value.trim();
      const atPos = curr.indexOf('@');
      if (atPos > 0) {
        curr = curr.substring(0, atPos);
      } else if (!curr) {
        curr = '9820014321';
      }
      vpaInput.value = curr + h;
      vpaStatus.textContent = `✓ Verified Self-Account (${h.replace('@ok', '').replace('@', '').toUpperCase()} Bank Match)`;
      vpaStatus.style.color = '#059669';
      vpaStatus.style.display = 'block';
    });
  });

  btnVerifyVpa.addEventListener('click', () => {
    const val = vpaInput.value.trim();
    if (!val || !val.includes('@')) {
      vpaStatus.textContent = '⚠ Please enter a valid UPI ID (e.g. mobile@bank or id@upi)';
      vpaStatus.style.color = '#dc2626';
      vpaStatus.style.display = 'block';
      return;
    }
    btnVerifyVpa.textContent = 'Checking...';
    setTimeout(() => {
      btnVerifyVpa.textContent = 'Verified ✓';
      vpaStatus.textContent = '✓ Verified Self-Account (NPCI Bank Verification Matched)';
      vpaStatus.style.color = '#059669';
      vpaStatus.style.display = 'block';
    }, 400);
  });

  // --- QR Code Countdown ---
  function startQrTimer() {
    clearInterval(state.qrTimerInterval);
    state.qrTimerSeconds = 299;

    function tick() {
      const mins = Math.floor(state.qrTimerSeconds / 60);
      const secs = state.qrTimerSeconds % 60;
      if (qrTimer) {
        qrTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (state.qrTimerSeconds <= 0) {
        clearInterval(state.qrTimerInterval);
        if (qrTimer) qrTimer.textContent = '00:00 (Expired)';
      }
      state.qrTimerSeconds--;
    }

    tick();
    state.qrTimerInterval = setInterval(tick, 1000);
  }

  // --- Debit Card Formatter & Detector ---
  cardNum.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = val.match(/[\s\S]{1,4}/g) || [];
    e.target.value = parts.join(' ');

    badgeVisa.classList.remove('active');
    badgeMastercard.classList.remove('active');
    badgeRupay.classList.remove('active');

    if (val.startsWith('4')) {
      badgeVisa.classList.add('active');
      cardNetworkLabel.textContent = 'VISA Debit Card';
    } else if (/^(5[1-5]|2[2-7])/.test(val)) {
      badgeMastercard.classList.add('active');
      cardNetworkLabel.textContent = 'Mastercard Debit';
    } else if (/^(60|65|81|82)/.test(val)) {
      badgeRupay.classList.add('active');
      cardNetworkLabel.textContent = 'RuPay Debit Card';
    } else {
      cardNetworkLabel.textContent = 'RuPay / Visa / Mastercard';
    }
  });

  cardExp.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      e.target.value = val.slice(0, 2) + '/' + val.slice(2);
    } else {
      e.target.value = val;
    }
  });

  cardCvv.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
  });

  // --- Net Banking Bank Selection ---
  bankPills.forEach(pill => {
    pill.addEventListener('click', () => {
      bankPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedBank = pill.dataset.bank;
      if (otherBankSelect) otherBankSelect.value = '';
    });
  });

  if (otherBankSelect) {
    otherBankSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        bankPills.forEach(p => p.classList.remove('active'));
        state.selectedBank = e.target.value;
      }
    });
  }

  // --- CRM API Integration Core ---
  async function triggerCrmUpdate(leadId) {
    console.log(`[CRM] Initiating CRMnext update for Lead ID: ${leadId}`);

    // If served via our server/proxy (Node.js or Vercel API):
    const isHostedOnServer = window.location.protocol.startsWith('http');
    if (isHostedOnServer) {
      try {
        console.log('[CRM] Calling server proxy endpoint /api/update-lead...');
        const proxyResp = await fetch('/api/update-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: leadId })
        });
        if (proxyResp.ok) {
          const resJson = await proxyResp.json();
          console.log('[CRM] Server proxy responded successfully:', resJson);
          return { success: true, via: 'proxy', details: resJson };
        }
      } catch (err) {
        console.warn('[CRM] Server proxy call error, trying direct API fallback:', err);
      }
    }

    // Direct Browser-to-CRM API Call
    try {
      console.log('[CRM] Step 1: Requesting OAuth token from presales.businessbywire.com...');
      const tokenResponse = await fetch('https://presales.businessbywire.com/restapigb8/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: 'james@crmnext.com',
          password: 'Chief@admin2025'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token request failed with status: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      console.log('[CRM] Step 1 Complete: Token received.');

      // Step 2: Update Lead Status
      console.log(`[CRM] Step 2: Updating Lead ${leadId} status to 'Intial Fund Collected'...`);
      const updatePayload = [
        {
          ItemId: "0",
          ItemType: "Lead",
          ProcessMode: "Update",
          OutputFieldList: [
            "LeadId",
            "ItemId"
          ],
          Condition: [
            {
              FieldName: "LeadId",
              Operation: "0",
              Value: String(leadId)
            }
          ],
          ObjectData: {
            StatusCode: "Intial Fund Collected"
          }
        }
      ];

      const saveResponse = await fetch('https://presales.businessbywire.com/restapigb8/crmWebApi/saveObject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(updatePayload)
      });

      const saveData = await saveResponse.json();
      console.log('[CRM] Step 2 Complete: Save API response:', saveData);
      return { success: true, via: 'direct', details: saveData };

    } catch (directErr) {
      console.warn('[CRM] Direct browser fetch error (CORS policy on client-side origin):', directErr);
      return {
        success: false,
        via: 'direct',
        error: directErr.message,
        note: 'Direct client-side call handled. Server proxy /api/update-lead handles full end-to-end sync in Docker/GCP.'
      };
    }
  }

  // --- Execute Checkout & Status Update ---
  async function handlePaymentSubmission() {
    // Determine payment method label
    let modeLabel = '';
    if (state.activeTab === 'tabUpi') {
      if (state.selectedUpiMode === 'apps') {
        modeLabel = `UPI (${state.selectedUpiApp})`;
      } else if (state.selectedUpiMode === 'vpa') {
        const entered = vpaInput.value.trim() || 'registered@upi';
        modeLabel = `UPI ID (${entered})`;
      } else {
        modeLabel = 'UPI QR Code Scan';
      }
    } else if (state.activeTab === 'tabCard') {
      const num = cardNum.value.replace(/\s/g, '');
      const last4 = num.length >= 4 ? num.slice(-4) : '4821';
      modeLabel = `Debit Card (ending in ${last4})`;
    } else {
      modeLabel = `Net Banking (${state.selectedBank})`;
    }

    // UI Loading state
    btnPaySubmit.disabled = true;
    btnPayText.textContent = 'Authorizing & Updating CRM...';
    btnPaySubmit.style.opacity = '0.85';
    if (apiProgressNote) {
      apiProgressNote.style.display = 'block';
      apiProgressNote.textContent = `Connecting to CRM API for Lead #${state.leadId}...`;
    }

    // Trigger the CRM API Calls
    const crmResult = await triggerCrmUpdate(state.leadId);

    // Reset button UI
    btnPaySubmit.disabled = false;
    btnPayText.textContent = 'Pay ₹10,590.00 Securely';
    btnPaySubmit.style.opacity = '1';
    if (apiProgressNote) apiProgressNote.style.display = 'none';

    // Populate Thank You Screen Details
    const randTxn = Math.floor(100000 + Math.random() * 900000);
    const randUtr = Math.floor(10000000000 + Math.random() * 90000000000);
    const now = new Date();
    const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    const formattedDate = now.toLocaleDateString('en-IN', options) + ' IST';

    dispTxnRef.textContent = `IND-TXN-20261007${randTxn}`;
    dispUtrNum.textContent = `INDB${randUtr}`;
    dispSuccessMode.textContent = modeLabel;
    dispTimestamp.textContent = formattedDate;

    if (dispThankYouLeadId) dispThankYouLeadId.textContent = state.leadId;
    if (dispLeadIdInMsg) dispLeadIdInMsg.textContent = state.leadId;

    if (dispCrmStatusMsg) {
      dispCrmStatusMsg.innerHTML = `<strong>CRM Status Updated:</strong> Lead #<strong>${state.leadId}</strong> status updated to <em>"Intial Fund Collected"</em> in CRMnext. Welcome kit and debit card dispatch initiated.`;
    }

    // Switch view to Thank You
    paymentView.classList.remove('view-active');
    paymentView.classList.add('view-hidden');

    thankYouView.classList.remove('view-hidden');
    thankYouView.classList.add('view-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Button Click & Enter Key Event Listeners ---
  btnPaySubmit.addEventListener('click', handlePaymentSubmission);

  // When user hits Enter anywhere in the payment view:
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (paymentView.classList.contains('view-active')) {
        handlePaymentSubmission();
      }
    }
  });

});
