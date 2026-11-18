# Smit FinStat PRO
### Ind AS 118 Financial Statement Generator & CA Workstation
**Compliant with MCA-Notified Ind AS 118 (Presentation and Disclosure in Financial Statements)**
*Replaces applicable presentation requirements of Ind AS 1*

---

## 🏛️ Executive Summary

**Smit FinStat PRO** is a professional, client-side, single-page application and Progressive Web App (PWA) tailored specifically for Indian Chartered Accountants (CAs), CFOs, financial controllers, and statutory auditors. 

It imports two-year comparative Trial Balance data (CSV, XLS, XLSX) and compiles compliant financial statements under the newly notified standard: **Ind AS 118 – Presentation and Disclosure in Financial Statements** (the Indian equivalent of IFRS 18), fully replacing the presentation architecture of Ind AS 1.

---

## ⚖️ Key Accounting Architecture under Ind AS 118

Ind AS 118 introduces profound changes to financial reporting, especially the Statement of Profit and Loss and related disaggregation:

### 1. Categories of Income and Expenses (Statement of Profit and Loss)
1. **Operating Category (Default / Residual):**
   - Income and expenses from the entity's core ongoing operations.
   - Includes: Revenue from operations, Cost of materials consumed, Purchases of stock-in-trade, Changes in inventories, Employee benefits expense, Depreciation and amortisation, and Other operating expenses (Power, repairs, rent, insurance, legal, CSR, allowances for credit losses).
2. **Investing Category:**
   - Income and expenses from assets that generate a return individually and largely independently of other resources.
   - Includes: Interest income on bank deposits/bonds, dividend income, fair value gains/losses on financial instruments through FVTPL, rental income from investment properties, and share of profit/loss of associates and joint ventures under the equity method.
3. **Financing Category:**
   - Income and expenses from liabilities that arise from transactions that involve the raising of finance.
   - Includes: Interest expense on term loans, debentures, working capital credit, interest expense on lease liabilities under Ind AS 116, bank borrowing processing fees amortised, and unwinding of discount on long-term provisions.
4. **Income Taxes:**
   - Current tax expense and deferred tax charge / (credit) under Ind AS 12.
5. **Discontinued Operations:**
   - Net profit or loss from discontinued operations under Ind AS 105.
6. **Other Comprehensive Income (OCI):**
   - Segregated into: (i) items that will not be reclassified to profit or loss, and (ii) items that will be reclassified to profit or loss.

---

### 2. Mandatory Prescribed Subtotals in P&L
Ind AS 118 eliminates disparate non-GAAP definitions by requiring three consistent statutory subtotals:
1. **Operating Profit or Loss** (Operating Revenue minus Operating Expenses).
2. **Profit or Loss before Financing and Income Taxes** (Operating Profit ± Investing Category).
3. **Profit or Loss before Income Taxes** (Profit before Financing & Tax minus Financing Category Costs).
4. **Profit or Loss for the Period (PAT)**.
5. **Total Comprehensive Income for the Period** (PAT + Total OCI).

---

### 3. Specified Main Business Activity (MBA) Exceptions
Ind AS 118 mandates special classification when an entity's primary business activity involves financing or investing:

| Entity Type / Main Business Activity | Standard Treatment | Ind AS 118 Mandatory Adaptation |
| :--- | :--- | :--- |
| **Standard Commercial & Industrial** | Segregated into Operating, Investing, and Financing | Default three-way classification |
| **Financial Services & Lending (NBFC / Lenders)** | Interest income in Investing; Borrowing interest in Financing | **Both Interest Income from customers and Borrowing Costs funding lending are classified in the OPERATING Category** (Reflecting Net Interest Margin). |
| **Investment Holding / Asset Management** | Returns on investments in Investing | **Dividend, Interest, Rental Income, and Fair Value Gains are classified in the OPERATING Category**. |

*Smit FinStat PRO includes an interactive selector on the Setup tab to toggle this framework instantly, re-indexing all line items and subtotals in real time.*

---

### 4. Management-defined Performance Measures (MPMs)
Ind AS 118 requires disclosure of non-GAAP measures used in public communications (e.g., **Operating EBITDA** = Operating Profit + Depreciation/Amortisation), including a transparent reconciliation to the nearest statutory subtotal and tax effect disclosure.

---

## 🛠️ Features & Workstation Modules

### Module 1: Setup & Entity Profile
- Company Name, Corporate Identification Number (CIN), Reporting Year labels (CY & PY).
- Reporting Scale: **Absolute Figures (₹ 1)**, **Thousands (₹ '000)**, **Lakhs (₹ Lakhs)**, or **Crores (₹ Crores)**.
- Specified Main Business Activity selector (`STANDARD`, `FINANCING`, `INVESTING`).

### Module 2: Import & Data Ingestion
- Ingests **CSV, XLS, and XLSX** spreadsheets.
- Supports dual comparative trial balances: single workbook with CY/PY columns or separate CY/PY files.
- Smart header recognition: Automatically detects `Account Code`, `Ledger Name`, `Debit CY`, `Credit CY`, `Net CY`, `Debit PY`, `Credit PY`, `Net PY`.
- Interactive Column Mapping modal with 5-row live preview before ingestion.

### Module 3: Intelligent Auto-Classification & Manual Overrides
- Proprietary regex rules engine covering 150+ Indian accounting keywords and Schedule III classifications.
- Assigns a confidence score (0% to 100%) to every ledger.
- Instant in-place dropdown override for every ledger.
- Add CA Working Paper notes / audit memos per ledger.
- Full audit trail logging of all manual modifications with timestamps.

### Module 4: CA Audit & Reconciliation Engine
- **Trial Balance Verification:** Confirms CY Total Debits equal Credits ($\Delta = 0$).
- **Balance Sheet Equation Check:** Verifies Total Assets = Total Equity + Total Liabilities ($\Delta = 0$).
- **P&L to Equity Roll-Forward:** Reconciles P&L Comprehensive Income against closing Retained Earnings / Other Equity.
- **Anomaly Detection:** Flags credit balances in Cash/Bank, credit debtors without provisioning, and debit creditors.

### Module 5: Financial Statement Previews
- Interactive preview of **Statement of Profit and Loss** (Ind AS 118 format).
- Interactive preview of **Statement of Financial Position** (Balance Sheet).
- Expandable **Supporting Schedules (Notes 1 to 45)** with drill-down to constituent ledgers.

### Module 6: Export & Reporting
- **Multi-Sheet Excel (.xlsx):** Generates a multi-tab workbook with P&L, Balance Sheet, Supporting Schedules, Mapped TB, and Audit Findings using SheetJS.
- **Client-Ready PDF (.pdf):** Client-side PDF generation formatted with Director and Auditor Signatures and UDIN blocks.
- **CSV Export:** Clean CSV with all mapped accounts, balances, and Ind AS 118 tags.
- **Printable HTML:** Formatted layout optimized for A4 physical printing or browser PDF output.

---

## 📁 Sample Test Datasets Included

Two sample datasets are provided in the `sample-data/` directory and embedded directly into the application for 1-click loading:

### 1. `sample_tb_manufacturing_2yr.xlsx` & `.csv`
- **Entity:** Apex Auto Components Limited (`CIN: L28920MH2008PLC184321`)
- **Profile:** Indian auto parts manufacturing entity with domestic sales, export sales, scrap sales, export incentives, raw materials (steel/alloys), ROU Assets under Ind AS 116, Investment Property under Ind AS 40, Associate under Ind AS 28, Term Loans, NCDs, MSME trade payables, and OCI items.
- **Balance Status:** 96 ledgers; **CY & PY Trial Balances are 100% balanced to ₹ 0.00 difference.**

### 2. `sample_tb_nbfc_lending_2yr.xlsx` & `.csv`
- **Entity:** Bharat Financial Services Limited (`CIN: L65920DL2012PLC238910`)
- **Profile:** Systemically Important NBFC illustrating Ind AS 118's specified main business activity where customer loan interest income and debenture/term loan borrowing costs are reclassified from Investing/Financing into **Operating Category**.
- **Balance Status:** 46 ledgers; **CY & PY Trial Balances are 100% balanced to ₹ 0.00 difference.**

---

## 🔒 100% Client-Side Confidentiality & Security

In compliance with the Code of Ethics of the Institute of Chartered Accountants of India (ICAI):
- **Zero Cloud Leakage:** All spreadsheet parsing, ledger classification, financial compilation, and PDF/Excel generation execute **100% locally in the user's browser sandbox**.
- No financial figures, ledger descriptions, or client credentials are ever transmitted to any external server, API, or third-party cloud.
- Works offline in air-gapped workstations or corporate firewalled environments.

---

## 📱 Progressive Web App (PWA) & Offline Installability

- Built with `manifest.json` and a dedicated `service-worker.js`.
- Caches all local scripts (`xlsx.full.min.js`, `jspdf.umd.min.js`, `jspdf.plugin.autotable.min.js`, styles, icons, and sample data).
- Installable as a native standalone application on **Windows, macOS, Linux, ChromeOS, Android, and iOS**:
  - In Chrome / Edge: Click the **Install** icon in the address bar.
  - In Safari / iOS: Tap **Share** → **Add to Home Screen**.

---

## 🚀 GitHub Pages Deployment Instructions

This repository is built with standard relative paths and requires **zero build steps or Node.js server dependencies**.

To deploy to GitHub Pages:
1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** → **Pages**.
3. Under **Build and deployment**:
   - **Source:** Deploy from a branch.
   - **Branch:** `main` (or `master`) / Root (`/`).
4. Click **Save**.
5. Your application will be live at:
   `https://<your-username>.github.io/<repository-name>/`

---

## 📂 Project Directory Structure

```text
├── index.html                   # Main single-page application
├── manifest.json                # PWA manifest
├── service-worker.js            # PWA offline cache service worker
├── README.md                    # CA documentation and user guide
├── css/
│   └── styles.css               # CA workstation styling & print CSS
├── js/
│   ├── xlsx.full.min.js         # Local SheetJS library (v0.20.1)
│   ├── jspdf.umd.min.js         # Local jsPDF library (v2.5.1)
│   ├── jspdf.plugin.autotable.min.js # Local AutoTable PDF plugin
│   ├── indas118-rules.js        # Ind AS 118 Master Taxonomy & MBA Rules
│   ├── importer.js              # Multi-format parser & column mapper
│   ├── engine.js                # Statement compiler & CA audit engine
│   ├── exporter.js              # Multi-sheet Excel, PDF & CSV generator
│   ├── sample-data-embedded.js  # Embedded datasets for 1-click test drive
│   └── app.js                   # Application controller & state manager
├── sample-data/
│   ├── sample_tb_manufacturing_2yr.csv   # Manufacturing TB (CSV)
│   ├── sample_tb_manufacturing_2yr.xlsx  # Manufacturing TB (Excel)
│   ├── sample_tb_nbfc_lending_2yr.csv    # NBFC / Lending TB (CSV)
│   └── sample_tb_nbfc_lending_2yr.xlsx   # NBFC / Lending TB (Excel)
└── icons/
    ├── favicon.svg              # Vector favicon
    ├── icon-192.png             # PWA 192x192 icon
    ├── icon-512.png             # PWA 512x512 icon
    └── apple-touch-icon.png     # iOS touch icon
```

---

## ⚖️ Disclaimer

*Smit FinStat PRO is a financial statement presentation and disaggregation accelerator compliant with Ind AS 118. While the tool automates classification and mathematical validations, statutory presentation remains subject to professional CA judgment, accounting policies, and note disclosures under applicable Schedule III and ICAI Guidance Notes.*
