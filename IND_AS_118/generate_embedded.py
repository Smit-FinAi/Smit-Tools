import csv
import json

def embed_samples():
    def read_csv_data(filepath):
        rows = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            for r in reader:
                rows.append(r)
        return rows

    mfg_rows = read_csv_data('sample-data/sample_tb_manufacturing_2yr.csv')
    nbfc_rows = read_csv_data('sample-data/sample_tb_nbfc_lending_2yr.csv')

    content = f"""/**
 * Smit FinStat PRO - Embedded Sample Datasets for instant 1-click test drive
 */

const EmbeddedSamples = {{
  manufacturing: {{
    companyName: "Apex Auto Components Limited",
    cin: "L28920MH2008PLC184321",
    cyLabel: "31st March 2026",
    pyLabel: "31st March 2025",
    businessActivity: "STANDARD",
    rows: {json.dumps(mfg_rows, indent=2)}
  }},
  nbfc: {{
    companyName: "Bharat Financial Services Limited",
    cin: "L65920DL2012PLC238910",
    cyLabel: "31st March 2026",
    pyLabel: "31st March 2025",
    businessActivity: "FINANCING",
    rows: {json.dumps(nbfc_rows, indent=2)}
  }}
}};

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = EmbeddedSamples;
}}
"""
    with open('js/sample-data-embedded.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Embedded samples generated successfully in js/sample-data-embedded.js")

if __name__ == '__main__':
    embed_samples()
