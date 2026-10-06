# IndusInd Bank - Digital Account Opening Initial Funding & Payment

A responsive payment gateway interface tailored for IndusInd Bank account opening initial funding, initiated directly from CRM (CRMnext).

## Features

- **IndusInd Bank Official Branding**: Burgundy (`#801438`) & Ochre (`#F49C14`) color palette with official logo.
- **Dynamic Lead ID from URL**: Reads `?leadid=<id>` (e.g. `?leadid=20964`) from the CRM payment link and binds it across the UI and API payload.
- **Pre-set Initial Funding & Transparent Fee Breakdown**:
  - Initial Account Funding: ₹10,000.00 (100% credited to customer balance)
  - Debit Card Issuance Fee: ₹500.00
  - GST (18% on Card Fee): ₹90.00
  - **Total Amount Payable: ₹10,590.00**
- **Indian Payment Modes**:
  - **UPI**: Real logos for Google Pay, PhonePe, Paytm, BHIM, CRED, VPA verification, and dynamic QR Code with timer.
  - **Debit Card**: Blank fields ready for input with real-time detection for RuPay, Visa, and Mastercard.
  - **Net Banking**: Fast-select tiles for SBI, HDFC, ICICI, Axis, Kotak, PNB + search dropdown for all scheduled banks.
- **CRMnext Real-Time Integration**:
  - Generates OAuth token from `POST /restapigb8/oauth2/token`
  - Updates Lead status to `"Intial Fund Collected"` via `POST /restapigb8/crmWebApi/saveObject`
- **Thank You / Confirmation Screen**: Displays official digital receipt with Transaction ID, UTR number, and CRM Lead confirmation.

---

## Deployment & Running

### 1. Local Testing
```bash
node server.js
```
Open in browser:
```
http://localhost:8080/?leadid=20964
```

### 2. Docker & GCP Deployment
Build container:
```bash
docker build -t payment-initiated .
docker run -p 8080:8080 payment-initiated
```

### 3. Vercel Deployment
Deploy directly to Vercel. The serverless function in `api/update-lead.js` handles the CRM API updates.

---

## Repository
`https://github.com/solutionconsulting2026-arch/PaymentIntiated`
