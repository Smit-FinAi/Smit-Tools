# PaySplit – UPI Payment Splitter PWA

**Created by Smit Parekh** · [youtube.com/@TheParekhShow](https://www.youtube.com/@TheParekhShow)

A production-quality Progressive Web App that lets you split any UPI payment into multiple individual QR codes — each with the exact allocated amount, fully transparent and user-authorised.

---

## 📁 Project Structure

```
PaySplit project/
├── index.html            # Main app (all UI)
├── manifest.json         # PWA manifest
├── service-worker.js     # Offline caching
├── css/
│   └── style.css         # All styles (light + dark mode)
├── js/
│   ├── app.js            # Full application logic
│   ├── qrcode.min.js     # QR code generation library
│   └── jszip.min.js      # ZIP download library
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png       # Also used as Apple touch icon
    ├── icon-384.png
    └── icon-512.png
```

---

## 🚀 GitHub Pages Deployment

### Step 1 — Push to GitHub
```bash
cd "PaySplit project"
git init
git add .
git commit -m "Initial commit: PaySplit PWA"
git remote add origin https://github.com/YOUR_USERNAME/paysplit.git
git push -u origin main
```

### Step 2 — Enable GitHub Pages
1. Go to your repository → **Settings** → **Pages**
2. Under **Source**, select branch: `main`, folder: `/ (root)`
3. Click **Save**
4. Your app will be live at: `https://YOUR_USERNAME.github.io/paysplit/`

> **Note:** GitHub Pages uses HTTPS by default, which is required for PWA Service Worker and Clipboard API.

---

## 🧪 Testing Instructions

### Local Testing (Python simple server)
```bash
# Python 3
python -m http.server 8080
# Then open: http://localhost:8080
```

### Functional Checks
| Test | Expected Result |
|------|----------------|
| Enter ₹1000, 3 splits (Auto) | QR 1: ₹333.34, QR 2: ₹333.33, QR 3: ₹333.33 (sum = ₹1000) |
| Enter ₹100, 2 manual splits: ₹60 + ₹40 | Perfectly allocated, QR generated |
| Enter ₹100, 2 manual splits: ₹60 + ₹50 | Error: "Exceeds by ₹10.00" |
| Invalid UPI: `notavalidupi` | Error: "Enter a valid UPI ID" |
| Click Download (single QR) | PNG file downloaded |
| Click Download All (ZIP) | ZIP with all PNGs + summary TXT |
| Toggle dark mode | UI switches to dark theme |
| Press Reset | Form clears, QR section hidden |
| Offline (disable network) | App loads from cache |

### UPI QR Validation
Scan any generated QR with:
- **Google Pay** (GPay)
- **PhonePe**
- **Paytm**
- **BHIM**
- **Any UPI-compatible app**

The QR encodes a standard `upi://pay?` URI. The payment amount shown in the UPI app must match the QR card amount exactly.

### PWA Installation
1. Open in Chrome/Edge on Android or desktop
2. Look for the "Install" banner or the install icon in the browser address bar
3. Click Install → app opens in standalone window

---

## ⚙️ Features

- ✅ Equal auto-split with paise-accurate remainder distribution
- ✅ Manual allocation with real-time balance checker
- ✅ Standard UPI deep-link QR codes (`upi://pay?...`)
- ✅ Individual PNG download per QR
- ✅ Download all QR codes as ZIP (with summary TXT)
- ✅ Print-friendly layout
- ✅ Copy UPI ID to clipboard
- ✅ Web Share API integration
- ✅ Light / Dark mode with persistence
- ✅ Session auto-save via localStorage
- ✅ PWA: installable, offline-capable, standalone mode
- ✅ No backend, no database, no signup

---

## ⚠️ Important Disclaimer

> **QR code generation does NOT verify or confirm payment settlement.**
> Scanning a QR code initiates a payment in a UPI app — it does not guarantee that the payment has been completed or received.
> Always verify payment status through your authorised UPI application or bank statement.

---

## 📄 Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| [QRCode.js](https://github.com/davidshimjs/qrcodejs) | 1.0.0 | Client-side QR generation |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | In-browser ZIP creation |
| [Inter](https://fonts.google.com/specimen/Inter) | Google Fonts | Typography |

No React, Vue, Angular, Node.js, or backend dependencies.

---

*PaySplit by Smit Parekh · [youtube.com/@TheParekhShow](https://www.youtube.com/@TheParekhShow)*


for git push


git init && git add . && git commit -m "PaySplit PWA"
git remote add origin https://github.com/YOUR_USERNAME/paysplit.git
git push -u origin main
# Then: Repo Settings → Pages → main branch → Save

















