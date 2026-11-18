import csv
import math

def test_samples():
    print("=== TESTING APEX AUTO COMPONENTS LIMITED (Manufacturing) ===")
    with open('sample-data/sample_tb_manufacturing_2yr.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        data_rows = []
        started = False
        for r in reader:
            if not r:
                continue
            if len(r) == 6 and r[0] == 'Account Code':
                started = True
                continue
            if started and len(r) == 6 and r[0] != 'TOTAL':
                data_rows.append(r)

    cy_dr = sum(float(r[2]) for r in data_rows)
    cy_cr = sum(float(r[3]) for r in data_rows)
    py_dr = sum(float(r[4]) for r in data_rows)
    py_cr = sum(float(r[5]) for r in data_rows)

    print(f"Manufacturing Ledgers Count: {len(data_rows)}")
    print(f"CY Dr Total: Rs {cy_dr:,.2f} | CY Cr Total: Rs {cy_cr:,.2f} | Diff: Rs {cy_dr - cy_cr:,.2f}")
    print(f"PY Dr Total: Rs {py_dr:,.2f} | PY Cr Total: Rs {py_cr:,.2f} | Diff: Rs {py_dr - py_cr:,.2f}")
    assert math.isclose(cy_dr, cy_cr, abs_tol=0.01), "CY Trial balance not balanced!"
    assert math.isclose(py_dr, py_cr, abs_tol=0.01), "PY Trial balance not balanced!"
    print("Apex Auto TB is 100% balanced!")

    print("\n=== TESTING BHARAT FINANCIAL SERVICES LIMITED (NBFC) ===")
    with open('sample-data/sample_tb_nbfc_lending_2yr.csv', 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        data_rows2 = []
        started2 = False
        for r in reader:
            if not r:
                continue
            if len(r) == 6 and r[0] == 'Account Code':
                started2 = True
                continue
            if started2 and len(r) == 6 and r[0] != 'TOTAL':
                data_rows2.append(r)

    cy_dr2 = sum(float(r[2]) for r in data_rows2)
    cy_cr2 = sum(float(r[3]) for r in data_rows2)
    py_dr2 = sum(float(r[4]) for r in data_rows2)
    py_cr2 = sum(float(r[5]) for r in data_rows2)

    print(f"NBFC Ledgers Count: {len(data_rows2)}")
    print(f"CY Dr Total: Rs {cy_dr2:,.2f} | CY Cr Total: Rs {cy_cr2:,.2f} | Diff: Rs {cy_dr2 - cy_cr2:,.2f}")
    print(f"PY Dr Total: Rs {py_dr2:,.2f} | PY Cr Total: Rs {py_cr2:,.2f} | Diff: Rs {py_dr2 - py_cr2:,.2f}")
    assert math.isclose(cy_dr2, cy_cr2, abs_tol=0.01), "NBFC CY Trial balance not balanced!"
    assert math.isclose(py_dr2, py_cr2, abs_tol=0.01), "NBFC PY Trial balance not balanced!"
    print("Bharat Financial Services TB is 100% balanced!")
    print("\nSUCCESS: All Trial Balance test cases are balanced to the exact rupee!")

if __name__ == '__main__':
    test_samples()
