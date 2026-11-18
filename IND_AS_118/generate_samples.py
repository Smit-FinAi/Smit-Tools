import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import csv

def generate_samples():
    os.makedirs('sample-data', exist_ok=True)

    # -------------------------------------------------------------
    # SAMPLE 1: APEX AUTO COMPONENTS LIMITED (Manufacturing)
    # -------------------------------------------------------------
    # Format: Code, Name, Debit CY, Credit CY, Debit PY, Credit PY
    mfg_rows = [
        # Non-Current Assets
        ("1001", "Freehold Land", 25000000, 0, 25000000, 0),
        ("1002", "Factory Buildings", 82000000, 0, 85000000, 0),
        ("1003", "Plant and Machinery", 148000000, 0, 132000000, 0),
        ("1004", "Furniture and Fixtures", 7500000, 0, 8000000, 0),
        ("1005", "Vehicles", 11000000, 0, 12000000, 0),
        ("1006", "Computers and Office Equipment", 6500000, 0, 5500000, 0),
        ("1007", "Capital Work-in-Progress (Machinery under installation)", 12000000, 0, 9000000, 0),
        ("1008", "Right-of-Use Asset - Office Lease (Ind AS 116)", 18000000, 0, 22000000, 0),
        ("1009", "Investment Property - Commercial Office Unit", 35000000, 0, 35000000, 0),
        ("1010", "Computer Software & ERP License", 9000000, 0, 11000000, 0),
        ("1011", "Non-Current Investments in Associate Equity Shares", 45000000, 0, 40000000, 0),
        ("1012", "Security Deposits with Electricity Board (Non-Current)", 4500000, 0, 4200000, 0),
        ("1013", "Deferred Tax Assets (Net)", 5500000, 0, 4800000, 0),
        ("1014", "Capital Advance for Plant Machinery", 6000000, 0, 4000000, 0),

        # Current Assets
        ("1101", "Raw Materials Inventory - Steel & Alloys", 38000000, 0, 32000000, 0),
        ("1102", "Work-in-Progress Inventory", 16000000, 0, 14000000, 0),
        ("1103", "Finished Goods Inventory - Auto Parts", 42000000, 0, 39000000, 0),
        ("1104", "Stores and Spare Parts", 4500000, 0, 4000000, 0),
        ("1105", "Current Investments in Liquid Mutual Funds", 25000000, 0, 18000000, 0),
        ("1106", "Trade Receivables - Domestic OEMs", 94000000, 0, 81000000, 0),
        ("1107", "Trade Receivables - Export Customers", 28000000, 0, 21000000, 0),
        ("1108", "Cash on Hand", 850000, 0, 650000, 0),
        ("1109", "HDFC Bank Current Account", 21500000, 0, 17500000, 0),
        ("1110", "SBI Fixed Deposit with Bank (6 months maturity)", 30000000, 0, 25000000, 0),
        ("1111", "Unpaid Dividend Bank Account", 1200000, 0, 1000000, 0),
        ("1112", "Short-term Loans to Employees", 1800000, 0, 1500000, 0),
        ("1113", "Interest Accrued on Bank Fixed Deposits", 1650000, 0, 1400000, 0),
        ("1114", "Advance Income Tax and TDS (Current Year)", 11500000, 0, 9500000, 0),
        ("1115", "Prepaid Insurance and Rates", 3800000, 0, 3200000, 0),
        ("1116", "GST Input Tax Credit Balance", 8200000, 0, 7500000, 0),
        ("1117", "Advances to Suppliers for Raw Materials", 6400000, 0, 5500000, 0),

        # Equity
        ("2001", "Equity Share Capital (Face Value Rs 10)", 0, 100000000, 0, 100000000),
        ("2002", "Securities Premium Reserve", 0, 150000000, 0, 150000000),
        ("2003", "General Reserve", 0, 50000000, 0, 40000000),
        ("2004", "Surplus in Statement of Profit & Loss (Opening Retained Earnings)", 0, 115450000, 0, 81900000),

        # Non-Current Liabilities
        ("2101", "Term Loan from Bank (HDFC Bank Long-Term)", 0, 65000000, 0, 78000000),
        ("2102", "Non-Convertible Debentures (NCDs 8.5% Non-Current)", 0, 40000000, 0, 40000000),
        ("2103", "Lease Liabilities Non-Current (Ind AS 116)", 0, 14000000, 0, 18000000),
        ("2104", "Provision for Gratuity (Non-Current)", 0, 8500000, 0, 7200000),
        ("2105", "Provision for Leave Encashment (Non-Current)", 0, 4200000, 0, 3600000),
        ("2106", "Deferred Government Grant (Capital Subsidy)", 0, 5000000, 0, 6000000),

        # Current Liabilities
        ("2201", "Working Capital Borrowing (Cash Credit from SBI)", 0, 36000000, 0, 29000000),
        ("2202", "Current Maturities of Term Loan", 0, 13000000, 0, 13000000),
        ("2203", "Current Lease Liabilities (Ind AS 116)", 0, 4500000, 0, 4000000),
        ("2204", "Trade Payables - Micro & Small Enterprises (MSME)", 0, 18500000, 0, 16000000),
        ("2205", "Trade Payables - Creditors Other than MSME", 0, 47500000, 0, 42000000),
        ("2206", "Unpaid Dividend Account", 0, 1200000, 0, 1000000),
        ("2207", "Interest Accrued but Not Due on Borrowings", 0, 1850000, 0, 1500000),
        ("2208", "Creditors for Capital Goods", 0, 4800000, 0, 3500000),
        ("2209", "Statutory Dues Payable (TDS, GST, PF, ESI)", 0, 6200000, 0, 5400000),
        ("2210", "Advances Received from Customers", 0, 7500000, 0, 6000000),
        ("2211", "Provision for Employee Bonus", 0, 4500000, 0, 3800000),
        ("2212", "Provision for Income Tax (Current Year)", 0, 5500000, 0, 4500000),

        # P&L - Operating Revenues (Cr)
        ("3001", "Domestic Sale of Manufactured Goods", 0, 584000000, 0, 498000000),
        ("3002", "Export Sales of Automotive Components", 0, 142000000, 0, 115000000),
        ("3003", "Sale of Scrap and Waste", 0, 8500000, 0, 7200000),
        ("3004", "Duty Drawback & Export Incentives", 0, 6500000, 0, 5400000),

        # P&L - Investing Incomes (Cr)
        ("3101", "Interest Income on Bank Fixed Deposits", 0, 2450000, 0, 2100000),
        ("3102", "Dividend Income from Mutual Funds", 0, 1200000, 0, 950000),
        ("3103", "Net Gain on Redemption of Liquid Mutual Funds", 0, 1850000, 0, 1400000),
        ("3104", "Rental Income from Investment Property", 0, 2800000, 0, 2500000),
        ("3105", "Share of Profit of Associate under Equity Method", 0, 3500000, 0, 2800000),

        # P&L - Operating Expenses (Dr)
        ("4001", "Cost of Raw Material Consumed - Steel & Alloys", 315000000, 0, 272000000, 0),
        ("4002", "Components and Fasteners Consumed", 68000000, 0, 59000000, 0),
        ("4003", "Packing Materials Consumed", 14500000, 0, 12500000, 0),
        ("4004", "Changes in Inventories of Finished Goods and WIP", 0, 5000000, 0, 4000000), # Net credit reduction
        ("4005", "Salaries, Wages and Allowances", 76000000, 0, 65000000, 0),
        ("4006", "Contribution to Provident Fund and ESI", 6800000, 0, 5800000, 0),
        ("4007", "Staff Welfare Expenses", 4200000, 0, 3600000, 0),
        ("4008", "Gratuity and Leave Encashment Expense", 3800000, 0, 3200000, 0),
        ("4009", "Managerial Remuneration to Directors", 12000000, 0, 10500000, 0),
        ("4010", "Depreciation on Property, Plant and Equipment", 24000000, 0, 21500000, 0),
        ("4011", "Depreciation on Right-of-Use Assets (Ind AS 116)", 4000000, 0, 4000000, 0),
        ("4012", "Amortisation of Computer Software", 2000000, 0, 2000000, 0),
        ("4013", "Power and Fuel Charges", 31000000, 0, 27500000, 0),
        ("4014", "Repairs and Maintenance - Plant & Machinery", 8500000, 0, 7400000, 0),
        ("4015", "Repairs and Maintenance - Factory Building", 2400000, 0, 2100000, 0),
        ("4016", "Rent and Short-term Lease Charges", 1800000, 0, 1600000, 0),
        ("4017", "Insurance Charges", 3200000, 0, 2800000, 0),
        ("4018", "Rates and Taxes", 1500000, 0, 1400000, 0),
        ("4019", "Statutory Audit and Tax Audit Fees", 1600000, 0, 1400000, 0),
        ("4020", "Legal and Professional Fees", 4200000, 0, 3500000, 0),
        ("4021", "Travelling and Conveyance Expenses", 5400000, 0, 4600000, 0),
        ("4022", "Freight Outward and Transportation", 11200000, 0, 9500000, 0),
        ("4023", "Advertising and Business Promotion", 6500000, 0, 5200000, 0),
        ("4024", "Corporate Social Responsibility (CSR) Expenses", 2200000, 0, 1800000, 0),
        ("4025", "Allowance for Expected Credit Loss on Debtors", 1800000, 0, 1500000, 0),
        ("4026", "Miscellaneous Office Expenses", 2850000, 0, 2450000, 0),

        # P&L - Financing Costs (Dr)
        ("5001", "Interest Expense on Bank Term Loans", 6800000, 0, 8200000, 0),
        ("5002", "Interest on Cash Credit & Working Capital Limits", 3200000, 0, 2800000, 0),
        ("5003", "Interest on Non-Convertible Debentures (NCDs)", 3600000, 0, 3600000, 0),
        ("5004", "Interest Expense on Lease Liabilities (Ind AS 116)", 1850000, 0, 2200000, 0),
        ("5005", "Bank Loan Processing and Financial Charges", 650000, 0, 550000, 0),

        # Taxes & OCI
        ("6001", "Current Income Tax Expense", 20500000, 0, 16500000, 0),
        ("6002", "Deferred Tax Charge / (Credit)", 0, 700000, 0, 500000), # Net credit
        ("7001", "Remeasurements of Defined Benefit Plans (OCI)", 0, 450000, 0, 350000)
    ]

    # Verify balance
    tot_dr_cy = sum(r[2] for r in mfg_rows)
    tot_cr_cy = sum(r[3] for r in mfg_rows)
    tot_dr_py = sum(r[4] for r in mfg_rows)
    tot_cr_py = sum(r[5] for r in mfg_rows)

    diff_cy = tot_dr_cy - tot_cr_cy
    diff_py = tot_dr_py - tot_cr_py

    # Adjust rounding in Retained Earnings if any diff
    if diff_cy != 0 or diff_py != 0:
        for i, r in enumerate(mfg_rows):
            if r[0] == "2004": # Retained earnings
                mfg_rows[i] = (r[0], r[1], r[2], r[3] + diff_cy, r[4], r[5] + diff_py)
                break

    # Write CSV
    csv_path_mfg = os.path.join('sample-data', 'sample_tb_manufacturing_2yr.csv')
    with open(csv_path_mfg, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["APEX AUTO COMPONENTS LIMITED"])
        writer.writerow(["CIN: L28920MH2008PLC184321"])
        writer.writerow(["TRIAL BALANCE AS AT 31ST MARCH 2026 AND 31ST MARCH 2025"])
        writer.writerow([])
        writer.writerow(["Account Code", "Ledger Name", "Debit CY (Rs)", "Credit CY (Rs)", "Debit PY (Rs)", "Credit PY (Rs)"])
        for r in mfg_rows:
            writer.writerow(r)

    # Write XLSX with formatting
    xlsx_path_mfg = os.path.join('sample-data', 'sample_tb_manufacturing_2yr.xlsx')
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Trial Balance"
    ws.append(["APEX AUTO COMPONENTS LIMITED"])
    ws.append(["CIN: L28920MH2008PLC184321"])
    ws.append(["TRIAL BALANCE AS AT 31ST MARCH 2026 AND 31ST MARCH 2025"])
    ws.append([])
    ws.append(["Account Code", "Ledger Name", "Debit CY (Rs)", "Credit CY (Rs)", "Debit PY (Rs)", "Credit PY (Rs)"])

    # Header style
    font_bold = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    fill_header = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")

    for col_num in range(1, 7):
        cell = ws.cell(row=5, column=col_num)
        cell.font = font_bold
        cell.fill = fill_header

    for r in mfg_rows:
        ws.append(r)

    # Add total row
    tot_row_idx = len(mfg_rows) + 6
    ws.append(["TOTAL", "Trial Balance Grand Total", f"=SUM(C6:C{tot_row_idx-1})", f"=SUM(D6:D{tot_row_idx-1})", f"=SUM(E6:E{tot_row_idx-1})", f"=SUM(F6:F{tot_row_idx-1})"])
    for col_num in range(1, 7):
        cell = ws.cell(row=tot_row_idx, column=col_num)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    ws.column_dimensions['A'].width = 16
    ws.column_dimensions['B'].width = 50
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 20
    ws.column_dimensions['E'].width = 20
    ws.column_dimensions['F'].width = 20
    wb.save(xlsx_path_mfg)

    # -------------------------------------------------------------
    # SAMPLE 2: BHARAT FINANCIAL SERVICES LIMITED (NBFC / Lending)
    # -------------------------------------------------------------
    nbfc_rows = [
        # Assets
        ("1001", "Freehold Office Premises", 150000000, 0, 150000000, 0),
        ("1002", "Office Furniture and Fixtures", 12000000, 0, 14000000, 0),
        ("1003", "Computers and Tech Servers", 25000000, 0, 22000000, 0),
        ("1004", "Right-of-Use Asset - Branch Leases", 45000000, 0, 52000000, 0),
        ("1005", "Core Banking Software & Digital App", 35000000, 0, 42000000, 0),
        ("1006", "Non-Current Investments in Government G-Sec Bonds", 180000000, 0, 150000000, 0),
        ("1007", "Security Deposits for Branch Premises", 8500000, 0, 8000000, 0),
        ("1008", "Deferred Tax Assets (Net)", 22000000, 0, 18000000, 0),
        ("1101", "Retail Loans and Customer Advances - Current", 850000000, 0, 720000000, 0),
        ("1102", "MSME & Business Loans to Customers - Current", 420000000, 0, 360000000, 0),
        ("1103", "Cash in Hand (Branch Tills)", 15000000, 0, 12000000, 0),
        ("1104", "Bank Current Account Balances with Scheduled Banks", 85000000, 0, 68000000, 0),
        ("1105", "Short-term Bank Deposits with Banks", 120000000, 0, 95000000, 0),
        ("1106", "Interest Accrued on Customer Loans", 28000000, 0, 22000000, 0),
        ("1107", "Advance Tax and TDS Receivable", 32000000, 0, 26000000, 0),
        ("1108", "Prepaid IT and Cloud Hosting Charges", 6500000, 0, 5000000, 0),

        # Equity
        ("2001", "Equity Share Capital (Face Value Rs 10)", 0, 250000000, 0, 250000000),
        ("2002", "Securities Premium Reserve", 0, 300000000, 0, 300000000),
        ("2003", "Statutory Reserve u/s 45-IC of RBI Act", 0, 95000000, 0, 72000000),
        ("2004", "Retained Earnings / Surplus in P&L", 0, 168000000, 0, 122000000),

        # Liabilities
        ("2101", "Term Loans from Banks for Lending Operations", 0, 480000000, 0, 420000000),
        ("2102", "Secured Redeemable Non-Convertible Debentures (NCDs)", 0, 350000000, 0, 300000000),
        ("2103", "Lease Liabilities Non-Current (Ind AS 116)", 0, 32000000, 0, 38000000),
        ("2104", "Provision for Gratuity and Leave (Non-Current)", 0, 18000000, 0, 15000000),
        ("2201", "Commercial Papers Issued (Short-term)", 0, 180000000, 0, 140000000),
        ("2202", "Current Maturities of Term Loans", 0, 85000000, 0, 70000000),
        ("2203", "Current Lease Liabilities", 0, 14000000, 0, 14000000),
        ("2204", "Trade Payables to Technology Vendors & Service Providers", 0, 24000000, 0, 21000000),
        ("2205", "Interest Accrued on Borrowings and Debentures", 0, 16500000, 0, 13500000),
        ("2206", "Statutory Dues Payable (TDS, GST, PF)", 0, 11500000, 0, 9500000),

        # Operating Revenues (Under Ind AS 118 MBA - Lending: Interest is OPERATING!)
        ("3001", "Interest Income on Retail & MSME Customer Loans", 0, 195000000, 0, 162000000),
        ("3002", "Processing Fees & Loan Administration Charges", 0, 22000000, 0, 18500000),
        ("3003", "Interest Income on G-Sec Bonds & Bank Deposits", 0, 18500000, 0, 15000000),

        # Operating Expenses (Under Ind AS 118 MBA - Lending: Borrowing costs are OPERATING!)
        ("4001", "Interest Expense on Term Loans & Debentures Borrowed", 92000000, 0, 78000000, 0),
        ("4002", "Discount on Commercial Paper Issued", 14500000, 0, 11500000, 0),
        ("4003", "Employee Benefits Expense - Loan Officers & Credit Staff", 45000000, 0, 38000000, 0),
        ("4004", "Depreciation on Office Premises, Tech & ROU Assets", 18500000, 0, 17500000, 0),
        ("4005", "IT Software & Cloud Hosting Charges", 12000000, 0, 9500000, 0),
        ("4006", "Credit Rating & Loan Processing Costs", 4200000, 0, 3500000, 0),
        ("4007", "Legal and Recovery Verification Fees", 6800000, 0, 5200000, 0),
        ("4008", "Rent, Rates and Office Running Expenses", 11500000, 0, 9800000, 0),
        ("4009", "Allowance for Expected Credit Loss on Customer Loans (ECL)", 16500000, 0, 13500000, 0),

        # Financing Category (Other items not directly lending)
        ("5001", "Interest Expense on Lease Liabilities (Branch Leases)", 3800000, 0, 4200000, 0),
        ("5002", "Bank Facility Renewal & Guarantee Commission", 1200000, 0, 1000000, 0),

        # Income Taxes
        ("6001", "Current Income Tax Expense", 24000000, 0, 19500000, 0),
        ("6002", "Deferred Tax Charge / (Credit)", 0, 4000000, 0, 3500000)
    ]

    # Verify balance
    tot_dr_cy2 = sum(r[2] for r in nbfc_rows)
    tot_cr_cy2 = sum(r[3] for r in nbfc_rows)
    tot_dr_py2 = sum(r[4] for r in nbfc_rows)
    tot_cr_py2 = sum(r[5] for r in nbfc_rows)

    diff_cy2 = tot_dr_cy2 - tot_cr_cy2
    diff_py2 = tot_dr_py2 - tot_cr_py2

    if diff_cy2 != 0 or diff_py2 != 0:
        for i, r in enumerate(nbfc_rows):
            if r[0] == "2004": # Retained earnings
                nbfc_rows[i] = (r[0], r[1], r[2], r[3] + diff_cy2, r[4], r[5] + diff_py2)
                break

    # Write CSV
    csv_path_nbfc = os.path.join('sample-data', 'sample_tb_nbfc_lending_2yr.csv')
    with open(csv_path_nbfc, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["BHARAT FINANCIAL SERVICES LIMITED"])
        writer.writerow(["CIN: L65920DL2012PLC238910"])
        writer.writerow(["TRIAL BALANCE AS AT 31ST MARCH 2026 AND 31ST MARCH 2025"])
        writer.writerow([])
        writer.writerow(["Account Code", "Ledger Name", "Debit CY (Rs)", "Credit CY (Rs)", "Debit PY (Rs)", "Credit PY (Rs)"])
        for r in nbfc_rows:
            writer.writerow(r)

    # Write XLSX
    xlsx_path_nbfc = os.path.join('sample-data', 'sample_tb_nbfc_lending_2yr.xlsx')
    wb2 = openpyxl.Workbook()
    ws2 = wb2.active
    ws2.title = "Trial Balance"
    ws2.append(["BHARAT FINANCIAL SERVICES LIMITED"])
    ws2.append(["CIN: L65920DL2012PLC238910"])
    ws2.append(["TRIAL BALANCE AS AT 31ST MARCH 2026 AND 31ST MARCH 2025"])
    ws2.append([])
    ws2.append(["Account Code", "Ledger Name", "Debit CY (Rs)", "Credit CY (Rs)", "Debit PY (Rs)", "Credit PY (Rs)"])

    for col_num in range(1, 7):
        cell = ws2.cell(row=5, column=col_num)
        cell.font = font_bold
        cell.fill = fill_header

    for r in nbfc_rows:
        ws2.append(r)

    tot_row_idx2 = len(nbfc_rows) + 6
    ws2.append(["TOTAL", "Trial Balance Grand Total", f"=SUM(C6:C{tot_row_idx2-1})", f"=SUM(D6:D{tot_row_idx2-1})", f"=SUM(E6:E{tot_row_idx2-1})", f"=SUM(F6:F{tot_row_idx2-1})"])
    for col_num in range(1, 7):
        cell = ws2.cell(row=tot_row_idx2, column=col_num)
        cell.font = Font(bold=True)
        cell.fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    ws2.column_dimensions['A'].width = 16
    ws2.column_dimensions['B'].width = 52
    ws2.column_dimensions['C'].width = 20
    ws2.column_dimensions['D'].width = 20
    ws2.column_dimensions['E'].width = 20
    ws2.column_dimensions['F'].width = 20
    wb2.save(xlsx_path_nbfc)

    print("Sample datasets generated successfully in sample-data/ directory.")

if __name__ == '__main__':
    generate_samples()
