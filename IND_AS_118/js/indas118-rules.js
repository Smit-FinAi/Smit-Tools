/**
 * Smit FinStat PRO - Ind AS 118 Accounting Rules Engine & Master Taxonomy
 * Compliant with MCA-notified Ind AS 118 (Presentation and Disclosure in Financial Statements)
 * Replaces Ind AS 1 presentation requirements.
 */

const IndAS118Rules = {
  // Main Business Activities (MBA) definitions under Ind AS 118
  BUSINESS_ACTIVITIES: {
    STANDARD: {
      id: 'STANDARD',
      label: 'Standard Commercial & Industrial (Manufacturing, Trading & Services)',
      description: 'Default framework: Operating, Investing and Financing categories strictly segregated.'
    },
    FINANCING: {
      id: 'FINANCING',
      label: 'Financial Services & Lending (NBFC / Lending Entity)',
      description: 'Provides financing to customers: Interest income and financing expenses related to customer loans are classified in OPERATING category.'
    },
    INVESTING: {
      id: 'INVESTING',
      label: 'Investment Holding / Asset Management / Real Estate Holding',
      description: 'Invests in assets: Dividend, interest, rental income and fair value gains are classified in OPERATING category.'
    }
  },

  // Ind AS 118 Statement Categories
  STATEMENT_TYPES: {
    SPL: 'Statement of Profit and Loss',
    BS: 'Statement of Financial Position (Balance Sheet)',
    OCI: 'Other Comprehensive Income'
  },

  // Sub-categories within P&L
  SPL_CATEGORIES: {
    OPERATING: { id: 'OPERATING', label: 'Operating Category', order: 1 },
    INVESTING: { id: 'INVESTING', label: 'Investing Category', order: 2 },
    FINANCING: { id: 'FINANCING', label: 'Financing Category', order: 3 },
    INCOME_TAXES: { id: 'INCOME_TAXES', label: 'Income Taxes', order: 4 },
    DISCONTINUED: { id: 'DISCONTINUED', label: 'Discontinued Operations', order: 5 }
  },

  // Master Line Item Taxonomy with default statement, category, schedule note mapping and regex rules
  LINE_ITEMS: {
    // ==========================================
    // STATEMENT OF PROFIT AND LOSS - OPERATING
    // ==========================================
    'REV_OPS': {
      code: 'REV_OPS',
      name: 'Revenue from Operations',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 18',
      normalBalance: 'CREDIT',
      description: 'Sale of products, sale of services, export sales, scrap sales, service fees',
      keywords: [
        /revenue\s+from\s+operations/i,
        /sales?\s*(account|revenue|income|turnover)?$/i,
        /sale\s+of\s+(goods|products|services|finished|scrap|power|software)/i,
        /gross\s+turnover/i,
        /service\s+revenue/i,
        /consulting\s+fees?\s+income/i,
        /contract\s+revenue/i,
        /domestic\s+sales/i,
        /export\s+sales/i,
        /operating\s+revenue/i
      ]
    },
    'REV_OTHER_OP': {
      code: 'REV_OTHER_OP',
      name: 'Other Operating Revenue',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 18.1',
      normalBalance: 'CREDIT',
      description: 'Export incentives, duty drawback, government operating grants, scrap sales',
      keywords: [
        /other\s+operating\s+revenue/i,
        /duty\s+drawback/i,
        /export\s+incentive/i,
        /scrap\s+sales?/i,
        /service\s+tax\s+refund/i,
        /government\s+grant.*operating/i,
        /subsidy.*operating/i
      ]
    },
    'COST_MAT': {
      code: 'COST_MAT',
      name: 'Cost of Materials Consumed',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 19',
      normalBalance: 'DEBIT',
      description: 'Raw materials, components, packing materials consumed',
      keywords: [
        /cost\s+of\s+materials?\s+consumed/i,
        /raw\s+material.*consumed/i,
        /consumption\s+of\s+raw\s+material/i,
        /raw\s+material\s+purchases?/i,
        /direct\s+material/i,
        /packing\s+material\s+consumed/i,
        /components?\s+consumed/i
      ]
    },
    'PURCH_STOCK': {
      code: 'PURCH_STOCK',
      name: 'Purchases of Stock-in-Trade',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 20',
      normalBalance: 'DEBIT',
      description: 'Purchases of finished goods for trading / resale',
      keywords: [
        /purchases?\s+of\s+stock[- ]in[- ]trade/i,
        /trading\s+goods\s+purchase/i,
        /merchandise\s+purchases?/i,
        /traded\s+goods/i
      ]
    },
    'CHG_INV': {
      code: 'CHG_INV',
      name: 'Changes in Inventories of FG, WIP and Stock-in-Trade',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 21',
      normalBalance: 'DEBIT',
      description: 'Opening inventory minus closing inventory for finished goods, WIP and trading stock',
      keywords: [
        /changes?\s+in\s+inventor(y|ies)/i,
        /increase\s*\/\s*decrease\s+in\s+stock/i,
        /accretion\s*\/\s*decretion/i,
        /variation\s+in\s+stock/i,
        /inventory\s+variation/i
      ]
    },
    'EMP_BEN': {
      code: 'EMP_BEN',
      name: 'Employee Benefits Expense',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 22',
      normalBalance: 'DEBIT',
      description: 'Salaries, wages, bonus, PF contribution, gratuity, staff welfare',
      keywords: [
        /employee\s+benefits?\s+expense/i,
        /salaries?((\s+and|\s*&|\s+or)?\s+wages)?/i,
        /wages?((\s+and|\s*&|\s+or)?\s+salaries)?/i,
        /staff\s+welfare/i,
        /provident\s+fund\s+contribution/i,
        /contribution\s+to\s+(pf|esi|superannuation)/i,
        /gratuity\s+expense/i,
        /leave\s+encashment\s+expense/i,
        /bonus\s+(to\s+staff|expense)/i,
        /director.*remuneration/i,
        /managerial\s+remuneration/i,
        /esop\s+expense/i,
        /share[- ]based\s+payment/i
      ]
    },
    'DEP_AMORT': {
      code: 'DEP_AMORT',
      name: 'Depreciation and Amortisation Expense',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 23',
      normalBalance: 'DEBIT',
      description: 'Depreciation on PPE, amortisation of intangibles, depreciation on ROU assets',
      keywords: [
        /depreciation\s*(and|&)?\s*amortis?ation/i,
        /depreciation\s+expense/i,
        /depreciation\s+on\s+(fixed\s+assets|ppe|plant|machinery|building|furniture|vehicles)/i,
        /amortis?ation\s+of\s+(intangibles?|software|patents?|goodwill)/i,
        /depreciation\s+on\s+rou\s+assets?/i
      ]
    },
    'OTHER_OP_EXP': {
      code: 'OTHER_OP_EXP',
      name: 'Other Operating Expenses',
      statement: 'SPL',
      category: 'OPERATING',
      scheduleNote: 'Note 24',
      normalBalance: 'DEBIT',
      description: 'Power & fuel, repairs, rent, rates & taxes, insurance, freight, legal, audit fee, CSR, marketing, bad debts',
      keywords: [
        /other\s+operating\s+expenses?/i,
        /other\s+expenses?/i,
        /power(\s+and|\s*&)?\s*fuel/i,
        /electricity\s+charges/i,
        /rent\s+(expense|paid|charges)/i,
        /repairs?\s*(and|&)?\s*maintenance/i,
        /insurance\s+charges?/i,
        /rates\s*(and|&)?\s*taxes/i,
        /auditor.*remuneration/i,
        /statutory\s+audit\s+fee/i,
        /legal\s*(and|&)?\s*professional/i,
        /travelling\s*(and|&)?\s*conveyance/i,
        /printing\s*(and|&)?\s*stationery/i,
        /communication\s+expenses?/i,
        /telephone\s*(and|&)?\s*internet/i,
        /freight\s+outward/i,
        /carriage\s+outward/i,
        /selling\s*(and|&)?\s*distribution/i,
        /advertising\s*(and|&)?\s*publicity/i,
        /business\s+promotion/i,
        /csr\s+expenses?/i,
        /corporate\s+social\s+responsibility/i,
        /bad\s+debts?\s*(written\s+off)?/i,
        /allowance\s+for\s+(expected\s+credit\s+loss|bad\s+debts)/i,
        /provision\s+for\s+doubtful\s+debts/i,
        /loss\s+on\s+sale\s+of\s+(fixed\s+assets|ppe)/i,
        /miscellaneous\s+expenses?/i,
        /general\s+expenses?/i,
        /office\s+expenses?/i,
        /security\s+charges?/i,
        /sub[- ]contracting\s+charges?/i
      ]
    },

    // ==========================================
    // STATEMENT OF PROFIT AND LOSS - INVESTING
    // ==========================================
    'INV_INTEREST': {
      code: 'INV_INTEREST',
      name: 'Interest Income from Investments and Deposits',
      statement: 'SPL',
      category: 'INVESTING',
      scheduleNote: 'Note 25',
      normalBalance: 'CREDIT',
      description: 'Interest on fixed deposits with banks, government securities, bonds, inter-corporate deposits',
      keywords: [
        /interest\s+(income|received)\s+on\s+(fd|fixed\s+deposit|bank|deposit|bonds|g-sec|debenture)/i,
        /interest\s+income\s+from\s+investments?/i,
        /bank\s+interest\s+income/i,
        /interest\s+on\s+icd/i,
        /interest\s+on\s+loans\s+given/i
      ]
    },
    'INV_DIVIDEND': {
      code: 'INV_DIVIDEND',
      name: 'Dividend Income',
      statement: 'SPL',
      category: 'INVESTING',
      scheduleNote: 'Note 25.1',
      normalBalance: 'CREDIT',
      description: 'Dividends from subsidiaries, associates, mutual funds, listed/unlisted equity shares',
      keywords: [
        /dividend\s+income/i,
        /dividend\s+received/i,
        /dividend\s+from\s+(subsidiary|mutual\s+fund|shares|equity)/i
      ]
    },
    'INV_GAIN_LOSS': {
      code: 'INV_GAIN_LOSS',
      name: 'Net Gain / (Loss) on Financial Assets at FVTPL & Sale of Investments',
      statement: 'SPL',
      category: 'INVESTING',
      scheduleNote: 'Note 25.2',
      normalBalance: 'CREDIT',
      description: 'Fair value gains/losses on mutual funds, shares, bonds; profit/loss on sale of investments',
      keywords: [
        /gain\s+on\s+sale\s+of\s+(investments?|mutual\s+funds?|shares)/i,
        /loss\s+on\s+sale\s+of\s+(investments?|mutual\s+funds?)/i,
        /fair\s+value\s+(gain|loss)\s+on\s+(investments?|financial\s+instruments?|fvtpl)/i,
        /mark\s+to\s+market\s+(gain|loss)\s+on\s+investments/i,
        /net\s+gain\s+on\s+redemption\s+of\s+mutual\s+funds/i
      ]
    },
    'INV_PROP_INC': {
      code: 'INV_PROP_INC',
      name: 'Income from Investment Property',
      statement: 'SPL',
      category: 'INVESTING',
      scheduleNote: 'Note 25.3',
      normalBalance: 'CREDIT',
      description: 'Rental income from investment property and net gain/loss on fair valuation/sale of investment property',
      keywords: [
        /rental\s+income\s+from\s+investment\s+propert(y|ies)/i,
        /rent\s+from\s+investment\s+property/i,
        /gain\s+on\s+sale\s+of\s+investment\s+property/i
      ]
    },
    'EQUITY_METHOD_PL': {
      code: 'EQUITY_METHOD_PL',
      name: 'Share of Profit / (Loss) of Associates and Joint Ventures',
      statement: 'SPL',
      category: 'INVESTING',
      scheduleNote: 'Note 25.4',
      normalBalance: 'CREDIT',
      description: 'Share of net profit or loss of associates and joint ventures accounted for using equity method',
      keywords: [
        /share\s+of\s+(profit|loss)\s+of\s+associates?/i,
        /share\s+of\s+(profit|loss)\s+of\s+joint\s+ventures?/i,
        /equity\s+method\s+profit/i
      ]
    },

    // ==========================================
    // STATEMENT OF PROFIT AND LOSS - FINANCING
    // ==========================================
    'FIN_COST_BORROW': {
      code: 'FIN_COST_BORROW',
      name: 'Interest Expense on Borrowings',
      statement: 'SPL',
      category: 'FINANCING',
      scheduleNote: 'Note 26',
      normalBalance: 'DEBIT',
      description: 'Interest on term loans, working capital loans, cash credit, debentures, commercial paper',
      keywords: [
        /interest\s+(expense|paid)\s+on\s+(term\s+loan|borrowings?|debentures?|cash\s+credit|working\s+capital|bank\s+loan)/i,
        /finance\s+costs?/i,
        /borrowing\s+costs?/i,
        /interest\s+on\s+bank\s+overdraft/i,
        /interest\s+on\s+inter[- ]corporate\s+deposits?\s+borrowed/i
      ]
    },
    'FIN_COST_LEASE': {
      code: 'FIN_COST_LEASE',
      name: 'Interest Expense on Lease Liabilities (Ind AS 116)',
      statement: 'SPL',
      category: 'FINANCING',
      scheduleNote: 'Note 26.1',
      normalBalance: 'DEBIT',
      description: 'Interest on lease liability recognised in accordance with Ind AS 116',
      keywords: [
        /interest\s+expense\s+on\s+lease\s+liabilit(y|ies)/i,
        /lease\s+interest\s+expense/i,
        /finance\s+charge\s+on\s+leases?/i,
        /ind\s*as\s*116\s*interest/i
      ]
    },
    'FIN_OTHER': {
      code: 'FIN_OTHER',
      name: 'Other Finance Costs & Unwinding of Discount',
      statement: 'SPL',
      category: 'FINANCING',
      scheduleNote: 'Note 26.2',
      normalBalance: 'DEBIT',
      description: 'Bank loan processing fees, debt syndication costs, unwinding of discount on provisions',
      keywords: [
        /other\s+borrowing\s+costs?/i,
        /unwinding\s+of\s+discount/i,
        /loan\s+processing\s+fees?/i,
        /bank\s+charges\s+related\s+to\s+financing/i,
        /debt\s+issue\s+expenses?\s+amorti[sz]ed/i,
        /exchange\s+difference\s+treated\s+as\s+borrowing\s+cost/i
      ]
    },

    // ==========================================
    // STATEMENT OF PROFIT AND LOSS - TAXES & DISCONTINUED
    // ==========================================
    'TAX_CURRENT': {
      code: 'TAX_CURRENT',
      name: 'Current Tax Expense',
      statement: 'SPL',
      category: 'INCOME_TAXES',
      scheduleNote: 'Note 27',
      normalBalance: 'DEBIT',
      description: 'Income tax provision for current year under Income Tax Act, 1961 (including MAT if applicable)',
      keywords: [
        /current\s+tax\s+(expense|provision)?/i,
        /provision\s+for\s+income\s+tax/i,
        /income\s+tax\s+for\s+the\s+year/i,
        /tax\s+expense.*current/i
      ]
    },
    'TAX_DEFERRED': {
      code: 'TAX_DEFERRED',
      name: 'Deferred Tax Charge / (Credit)',
      statement: 'SPL',
      category: 'INCOME_TAXES',
      scheduleNote: 'Note 27.1',
      normalBalance: 'DEBIT',
      description: 'Deferred tax expense / credit under Ind AS 12',
      keywords: [
        /deferred\s+tax\s+(expense|charge|credit|provision)/i,
        /deferred\s+tax\s+liability\s+created/i,
        /deferred\s+tax\s+asset\s+reversal/i
      ]
    },
    'DISC_OPS': {
      code: 'DISC_OPS',
      name: 'Profit / (Loss) from Discontinued Operations (Net of Tax)',
      statement: 'SPL',
      category: 'DISCONTINUED',
      scheduleNote: 'Note 28',
      normalBalance: 'CREDIT',
      description: 'Discontinued operations net profit / loss under Ind AS 105',
      keywords: [
        /discontinued\s+operations?/i,
        /profit\s*\/\s*loss\s+from\s+discontinued/i
      ]
    },

    // ==========================================
    // OTHER COMPREHENSIVE INCOME (OCI)
    // ==========================================
    'OCI_NO_RECLASS': {
      code: 'OCI_NO_RECLASS',
      name: 'OCI: Items that will not be reclassified to profit or loss',
      statement: 'OCI',
      category: 'OCI_NO_RECLASS',
      scheduleNote: 'Note 29',
      normalBalance: 'CREDIT',
      description: 'Remeasurements of defined benefit plans, equity instruments through FVOCI, tax impact',
      keywords: [
        /remeasurements?\s+of\s+(defined\s+benefit|gratuity)/i,
        /actuarial\s+(gain|loss)/i,
        /fvoci\s+equity\s+instruments?/i,
        /revaluation\s+surplus\s+through\s+oci/i
      ]
    },
    'OCI_RECLASS': {
      code: 'OCI_RECLASS',
      name: 'OCI: Items that will be reclassified to profit or loss',
      statement: 'OCI',
      category: 'OCI_RECLASS',
      scheduleNote: 'Note 30',
      normalBalance: 'CREDIT',
      description: 'Debt instruments through FVOCI, effective cash flow hedge portion, foreign currency translation reserve',
      keywords: [
        /debt\s+instruments?\s+through\s+fvoci/i,
        /cash\s+flow\s+hedg(e|ing)\s+reserve/i,
        /foreign\s+currency\s+translation\s+reserve/i,
        /fctr\s+gain\s*\/\s*loss/i
      ]
    },

    // ==========================================
    // BALANCE SHEET - NON-CURRENT ASSETS
    // ==========================================
    'PPE': {
      code: 'PPE',
      name: 'Property, Plant and Equipment',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 1',
      normalBalance: 'DEBIT',
      description: 'Freehold land, buildings, plant & equipment, furniture & fixtures, vehicles, computers & office equipment',
      keywords: [
        /property,?\s+plant\s*(and|&)?\s*equipment/i,
        /fixed\s+assets?(\s+gross|\s+net)?$/i,
        /tangible\s+assets?/i,
        /plant\s*(and|&)?\s*machinery/i,
        /factory\s+building/i,
        /office\s+equipment/i,
        /furniture\s*(and|&)?\s*fixtures?/i,
        /vehicles?/i,
        /computers?((\s+and|\s*&)?\s+printers)?/i,
        /freehold\s+land/i,
        /leasehold\s+land/i
      ]
    },
    'CWIP': {
      code: 'CWIP',
      name: 'Capital Work-in-Progress',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 1.1',
      normalBalance: 'DEBIT',
      description: 'Assets under construction, machinery under installation',
      keywords: [
        /capital\s+work[- ]in[- ]progress/i,
        /cwip/i,
        /assets?\s+under\s+construction/i,
        /building\s+under\s+construction/i,
        /machinery\s+under\s+installation/i
      ]
    },
    'INV_PROP': {
      code: 'INV_PROP',
      name: 'Investment Property',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 2',
      normalBalance: 'DEBIT',
      description: 'Land or building held to earn rentals or for capital appreciation under Ind AS 40',
      keywords: [
        /investment\s+propert(y|ies)/i,
        /commercial\s+property\s+held\s+for\s+rental/i
      ]
    },
    'ROU_ASSET': {
      code: 'ROU_ASSET',
      name: 'Right-of-Use Assets',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 3',
      normalBalance: 'DEBIT',
      description: 'Right-of-use assets recognised under Ind AS 116 for leased properties and equipment',
      keywords: [
        /right[- ]of[- ]use\s+assets?/i,
        /rou\s+assets?/i,
        /leased\s+assets?\s+under\s+ind\s*as\s*116/i
      ]
    },
    'INTANGIBLE': {
      code: 'INTANGIBLE',
      name: 'Goodwill and Other Intangible Assets',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 4',
      normalBalance: 'DEBIT',
      description: 'Goodwill on consolidation, computer software, ERP licenses, patents, trademarks, technical know-how',
      keywords: [
        /goodwill/i,
        /intangible\s+assets?/i,
        /computer\s+software/i,
        /erp\s+licen[sc]e/i,
        /patents?\s*(and|&)?\s*trademarks?/i,
        /technical\s+know[- ]how/i,
        /brands?\s*(and|&)?\s*copyrights?/i
      ]
    },
    'INTANGIBLE_DEV': {
      code: 'INTANGIBLE_DEV',
      name: 'Intangible Assets Under Development',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 4.1',
      normalBalance: 'DEBIT',
      description: 'Software and tech developments in progress',
      keywords: [
        /intangible\s+assets?\s+under\s+development/i,
        /software\s+under\s+development/i,
        /r&d\s+project\s+development/i
      ]
    },
    'NC_FIN_INV': {
      code: 'NC_FIN_INV',
      name: 'Non-Current Financial Assets - Investments',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 5',
      normalBalance: 'DEBIT',
      description: 'Investments in subsidiaries, associates, joint ventures, government securities, equity/preference shares held long-term',
      keywords: [
        /non[- ]current\s+investments?/i,
        /investments?\s+in\s+subsidiaries?/i,
        /investments?\s+in\s+associates?/i,
        /investments?\s+in\s+joint\s+ventures?/i,
        /long[- ]term\s+investments?/i,
        /investments?\s+in\s+equity\s+shares\s*\(non[- ]current\)/i,
        /investments?\s+in\s+bonds/i
      ]
    },
    'NC_FIN_LOANS': {
      code: 'NC_FIN_LOANS',
      name: 'Non-Current Financial Assets - Loans',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 6',
      normalBalance: 'DEBIT',
      description: 'Security deposits with government / utilities / landlords (long-term), loans to employees (long-term)',
      keywords: [
        /non[- ]current\s+loans?/i,
        /security\s+deposits?\s*\(long[- ]term|non[- ]current\)/i,
        /security\s+deposits?\s+with\s+(electricity|water|telephone|landlord|customs)/i,
        /long[- ]term\s+loans\s+to\s+employees/i
      ]
    },
    'NC_FIN_OTHER_ASSET': {
      code: 'NC_FIN_OTHER_ASSET',
      name: 'Other Non-Current Financial Assets',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 7',
      normalBalance: 'DEBIT',
      description: 'Bank deposits with maturity > 12 months, interest accrued on long-term investments',
      keywords: [
        /other\s+non[- ]current\s+financial\s+assets?/i,
        /bank\s+deposits?\s+with\s+more\s+than\s+12\s+months?\s+maturity/i,
        /fixed\s+deposits?\s*\(non[- ]current\)/i,
        /margin\s+money\s+deposits?\s*\(non[- ]current\)/i
      ]
    },
    'DTA': {
      code: 'DTA',
      name: 'Deferred Tax Assets (Net)',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 8',
      normalBalance: 'DEBIT',
      description: 'Deferred tax asset recognized under Ind AS 12',
      keywords: [
        /deferred\s+tax\s+assets?/i,
        /dta\s*\(net\)/i
      ]
    },
    'NC_TAX_ASSET': {
      code: 'NC_TAX_ASSET',
      name: 'Non-Current Tax Assets (Net)',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 9',
      normalBalance: 'DEBIT',
      description: 'Advance tax and TDS relating to prior years / disputed matters',
      keywords: [
        /non[- ]current\s+tax\s+assets?/i,
        /advance\s+tax\s+and\s+tds\s*\(non[- ]current\)/i,
        /income\s+tax\s+paid\s+under\s+protest/i
      ]
    },
    'OTHER_NC_ASSET': {
      code: 'OTHER_NC_ASSET',
      name: 'Other Non-Current Assets',
      statement: 'BS',
      category: 'NON_CURRENT_ASSETS',
      scheduleNote: 'Note 10',
      normalBalance: 'DEBIT',
      description: 'Capital advances to vendors for machinery/building, prepaid lease rent non-current',
      keywords: [
        /other\s+non[- ]current\s+assets?/i,
        /capital\s+advances?/i,
        /prepaid\s+expenses?\s*\(non[- ]current\)/i,
        /advance\s+for\s+capital\s+goods/i
      ]
    },

    // ==========================================
    // BALANCE SHEET - CURRENT ASSETS
    // ==========================================
    'INVENTORIES': {
      code: 'INVENTORIES',
      name: 'Inventories',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 11',
      normalBalance: 'DEBIT',
      description: 'Raw materials, work-in-progress, finished goods, stock-in-trade, stores and spares, loose tools',
      keywords: [
        /inventor(y|ies)/i,
        /stock\s+of\s+raw\s+materials?/i,
        /stock\s+of\s+finished\s+goods/i,
        /work[- ]in[- ]progress\s+stock/i,
        /stores?\s*(and|&)?\s*spares?/i,
        /loose\s+tools/i,
        /closing\s+stock/i,
        /goods\s+in\s+transit\s*\(inventory\)/i
      ]
    },
    'CUR_FIN_INV': {
      code: 'CUR_FIN_INV',
      name: 'Current Financial Assets - Investments',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 12',
      normalBalance: 'DEBIT',
      description: 'Mutual funds, treasury bills, commercial papers, listed equity held for trading (liquid)',
      keywords: [
        /current\s+investments?/i,
        /investments?\s+in\s+liquid\s+mutual\s+funds?/i,
        /treasury\s+bills?/i,
        /commercial\s+paper\s+investment/i,
        /short[- ]term\s+investments?/i
      ]
    },
    'TRADE_REC': {
      code: 'TRADE_REC',
      name: 'Current Financial Assets - Trade Receivables',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 13',
      normalBalance: 'DEBIT',
      description: 'Sundry debtors, trade receivables from customers (secured, unsecured, less ECL/provision)',
      keywords: [
        /trade\s+receivables?/i,
        /sundry\s+debtors?/i,
        /book\s+debts/i,
        /accounts?\s+receivable/i,
        /customer\s+balances?/i,
        /bills?\s+receivable/i
      ]
    },
    'CASH_BANK': {
      code: 'CASH_BANK',
      name: 'Cash and Cash Equivalents',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 14',
      normalBalance: 'DEBIT',
      description: 'Cash on hand, balances with banks in current accounts, deposits with maturity < 3 months',
      keywords: [
        /cash\s*(and|&)?\s*cash\s+equivalents?/i,
        /cash\s+in\s+hand/i,
        /cash\s+on\s+hand/i,
        /petty\s+cash/i,
        /balance\s+with\s+banks?\s*\(current\s+account\)/i,
        /current\s+account\s+balance/i,
        /bank\s+balance\s*-\s*current/i,
        /short[- ]term\s+bank\s+deposits?\s*\(<3\s*months?\)/i
      ]
    },
    'OTHER_BANK_BAL': {
      code: 'OTHER_BANK_BAL',
      name: 'Bank Balances Other Than Cash and Cash Equivalents',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 14.1',
      normalBalance: 'DEBIT',
      description: 'Earmarked bank accounts (unpaid dividend account), margin money deposits, fixed deposits with maturity 3-12 months',
      keywords: [
        /bank\s+balances?\s+other\s+than\s+cash/i,
        /other\s+bank\s+balances?/i,
        /earmarked\s+balances?\s+with\s+banks?/i,
        /unpaid\s+dividend\s+bank\s+account/i,
        /margin\s+money\s+deposits?\s*\(current\)/i,
        /fixed\s+deposits?\s+with\s+banks?\s*\(3[- ]12\s*months?\)/i
      ]
    },
    'CUR_FIN_LOANS': {
      code: 'CUR_FIN_LOANS',
      name: 'Current Financial Assets - Loans',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 15',
      normalBalance: 'DEBIT',
      description: 'Loans and advances to employees, inter-corporate deposits given (repayable within 12 months)',
      keywords: [
        /current\s+loans?/i,
        /short[- ]term\s+loans\s+and\s+advances?/i,
        /loans\s+to\s+employees\s*\(current\)/i,
        /icd\s+given/i,
        /inter[- ]corporate\s+deposits?\s+given/i
      ]
    },
    'CUR_FIN_OTHER_ASSET': {
      code: 'CUR_FIN_OTHER_ASSET',
      name: 'Other Current Financial Assets',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 16',
      normalBalance: 'DEBIT',
      description: 'Interest accrued on bank deposits / investments, derivative financial assets current, claim receivables',
      keywords: [
        /other\s+current\s+financial\s+assets?/i,
        /interest\s+accrued\s+on\s+(deposits?|investments?)/i,
        /insurance\s+claim\s+receivable/i,
        /derivative\s+financial\s+assets?\s*\(current\)/i
      ]
    },
    'CUR_TAX_ASSET': {
      code: 'CUR_TAX_ASSET',
      name: 'Current Tax Assets (Net)',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 17',
      normalBalance: 'DEBIT',
      description: 'Advance tax and TDS for current year (net of current tax provision if asset)',
      keywords: [
        /current\s+tax\s+assets?/i,
        /advance\s+tax\s*(paid)?\s*\(current\s+year\)/i,
        /tds\s+receivable\s*\(current\s+year\)/i,
        /tax\s+deducted\s+at\s+source\s*\(current\)/i
      ]
    },
    'OTHER_CUR_ASSET': {
      code: 'OTHER_CUR_ASSET',
      name: 'Other Current Assets',
      statement: 'BS',
      category: 'CURRENT_ASSETS',
      scheduleNote: 'Note 17.1',
      normalBalance: 'DEBIT',
      description: 'Prepaid expenses, advances to suppliers/vendors, GST input tax credits, export incentives receivable',
      keywords: [
        /other\s+current\s+assets?/i,
        /prepaid\s+expenses?/i,
        /advance\s+to\s+suppliers?/i,
        /advance\s+to\s+vendors?/i,
        /gst\s+input\s+tax\s+credit/i,
        /gst\s+receivable/i,
        /itc\s+receivable/i,
        /cenvat\s+credit/i,
        /vat\s+credit/i,
        /customs\s+duty\s+recoverable/i,
        /export\s+incentive\s+receivable/i,
        /balances?\s+with\s+government\s+authorities/i
      ]
    },

    // ==========================================
    // BALANCE SHEET - EQUITY
    // ==========================================
    'EQUITY_CAP': {
      code: 'EQUITY_CAP',
      name: 'Equity Share Capital',
      statement: 'BS',
      category: 'EQUITY',
      scheduleNote: 'Note 31',
      normalBalance: 'CREDIT',
      description: 'Authorised, issued, subscribed and paid-up equity share capital',
      keywords: [
        /equity\s+share\s+capital/i,
        /share\s+capital(\s+account)?$/i,
        /paid[- ]up\s+equity\s+capital/i,
        /issued\s+and\s+subscribed\s+capital/i,
        /equity\s+shares\s+of\s+rs/i
      ]
    },
    'OTHER_EQUITY': {
      code: 'OTHER_EQUITY',
      name: 'Other Equity',
      statement: 'BS',
      category: 'EQUITY',
      scheduleNote: 'Note 32',
      normalBalance: 'CREDIT',
      description: 'Securities premium, general reserve, retained earnings (surplus), capital reserve, debenture redemption reserve, OCI reserves',
      keywords: [
        /other\s+equity/i,
        /retained\s+earnings?/i,
        /surplus\s+in\s+statement\s+of\s+profit\s*(and|&)?\s*loss/i,
        /profit\s*(and|&)?\s*loss\s+balance\s*\(opening\)/i,
        /general\s+reserve/i,
        /securities?\s+premium(\s+reserve)?/i,
        /capital\s+reserve/i,
        /capital\s+redemption\s+reserve/i,
        /debenture\s+redemption\s+reserve/i,
        /share\s+options?\s+outstanding\s+account/i,
        /effective\s+portion\s+of\s+cash\s+flow\s+hedges/i,
        /foreign\s+currency\s+monetary\s+item\s+translation/i
      ]
    },

    // ==========================================
    // BALANCE SHEET - NON-CURRENT LIABILITIES
    // ==========================================
    'NC_BORROW': {
      code: 'NC_BORROW',
      name: 'Non-Current Financial Liabilities - Borrowings',
      statement: 'BS',
      category: 'NON_CURRENT_LIABILITIES',
      scheduleNote: 'Note 33',
      normalBalance: 'CREDIT',
      description: 'Term loans from banks and financial institutions, non-convertible debentures (NCDs), external commercial borrowings (ECBs)',
      keywords: [
        /non[- ]current\s+borrowings?/i,
        /term\s+loans?\s+from\s+banks?\s*\(non[- ]current\)/i,
        /term\s+loans?\s+from\s+financial\s+institutions?/i,
        /rupee\s+term\s+loan/i,
        /foreign\s+currency\s+term\s+loan/i,
        /debentures?\s*\(long[- ]term|non[- ]current\)/i,
        /external\s+commercial\s+borrowings?/i,
        /ecb\s+loan/i,
        /long[- ]term\s+borrowings?/i
      ]
    },
    'NC_LEASE_LIAB': {
      code: 'NC_LEASE_LIAB',
      name: 'Non-Current Financial Liabilities - Lease Liabilities',
      statement: 'BS',
      category: 'NON_CURRENT_LIABILITIES',
      scheduleNote: 'Note 34',
      normalBalance: 'CREDIT',
      description: 'Lease liabilities payable after 12 months under Ind AS 116',
      keywords: [
        /non[- ]current\s+lease\s+liabilit(y|ies)/i,
        /lease\s+liabilit(y|ies)\s*\(non[- ]current\)/i,
        /long[- ]term\s+lease\s+liabilit(y|ies)/i,
        /ind\s*as\s*116\s*lease\s*liability\s*\(non[- ]current\)/i
      ]
    },
    'NC_FIN_OTHER_LIAB': {
      code: 'NC_FIN_OTHER_LIAB',
      name: 'Other Non-Current Financial Liabilities',
      statement: 'BS',
      category: 'NON_CURRENT_LIABILITIES',
      scheduleNote: 'Note 35',
      normalBalance: 'CREDIT',
      description: 'Security deposits received (long-term), retention money payable, long-term payables for capital goods',
      keywords: [
        /other\s+non[- ]current\s+financial\s+liabilities?/i,
        /security\s+deposits?\s+received\s*\(long[- ]term\)/i,
        /retention\s+money\s+payable\s*\(non[- ]current\)/i
      ]
    },
    'NC_PROV': {
      code: 'NC_PROV',
      name: 'Non-Current Provisions',
      statement: 'BS',
      category: 'NON_CURRENT_LIABILITIES',
      scheduleNote: 'Note 36',
      normalBalance: 'CREDIT',
      description: 'Provision for employee benefits - gratuity (long-term), leave encashment (long-term)',
      keywords: [
        /non[- ]current\s+provisions?/i,
        /provision\s+for\s+gratuity\s*\(non[- ]current\)/i,
        /provision\s+for\s+leave\s+encashment\s*\(non[- ]current\)/i,
        /long[- ]term\s+provision\s+for\s+employee\s+benefits/i,
        /provision\s+for\s+decommissioning\s+liabilit(y|ies)/i
      ]
    },
    'DTL': {
      code: 'DTL',
      name: 'Deferred Tax Liabilities (Net)',
      statement: 'BS',
      category: 'NON_CURRENT_LIABILITIES',
      scheduleNote: 'Note 37',
      normalBalance: 'CREDIT',
      description: 'Deferred tax liabilities recognized under Ind AS 12',
      keywords: [
        /deferred\s+tax\s+liabilit(y|ies)/i,
        /dtl\s*\(net\)/i
      ]
    },
    'OTHER_NC_LIAB': {
      code: 'OTHER_NC_LIAB',
      name: 'Other Non-Current Liabilities',
      statement: 'BS',
      category: 'NON_CURRENT_LIABILITIES',
      scheduleNote: 'Note 38',
      normalBalance: 'CREDIT',
      description: 'Deferred government grants (non-current portion), advance received from customers long-term',
      keywords: [
        /other\s+non[- ]current\s+liabilities?/i,
        /deferred\s+government\s+grants?\s*\(non[- ]current\)/i,
        /capital\s+subsidy\s*\(deferred\)/i
      ]
    },

    // ==========================================
    // BALANCE SHEET - CURRENT LIABILITIES
    // ==========================================
    'CUR_BORROW': {
      code: 'CUR_BORROW',
      name: 'Current Financial Liabilities - Borrowings',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 39',
      normalBalance: 'CREDIT',
      description: 'Cash credit, working capital demand loans, overdrafts, buyers credit, current maturities of long term debt',
      keywords: [
        /current\s+borrowings?/i,
        /short[- ]term\s+borrowings?/i,
        /cash\s+credit\s+(account|facility|limit)/i,
        /bank\s+overdraft/i,
        /working\s+capital\s+demand\s+loan/i,
        /wc\s+limit/i,
        /buyers?\s+credit/i,
        /commercial\s+papers?\s*\(issued\)/i,
        /current\s+maturities\s+of\s+long[- ]term\s+debt/i
      ]
    },
    'CUR_LEASE_LIAB': {
      code: 'CUR_LEASE_LIAB',
      name: 'Current Financial Liabilities - Lease Liabilities',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 40',
      normalBalance: 'CREDIT',
      description: 'Lease liabilities payable within 12 months under Ind AS 116',
      keywords: [
        /current\s+lease\s+liabilit(y|ies)/i,
        /lease\s+liabilit(y|ies)\s*\(current\)/i,
        /current\s+maturities\s+of\s+lease\s+liabilit(y|ies)/i
      ]
    },
    'TRADE_PAY_MSME': {
      code: 'TRADE_PAY_MSME',
      name: 'Trade Payables - Micro & Small Enterprises (MSME)',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 41',
      normalBalance: 'CREDIT',
      description: 'Dues to micro and small enterprises under MSMED Act, 2006',
      keywords: [
        /trade\s+payables?.*msme/i,
        /dues\s+to\s+micro\s*(and|&)?\s*small\s+enterprises/i,
        /sundry\s+creditors?.*msme/i,
        /msmed\s+creditors/i
      ]
    },
    'TRADE_PAY_OTHER': {
      code: 'TRADE_PAY_OTHER',
      name: 'Trade Payables - Other than MSME',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 41.1',
      normalBalance: 'CREDIT',
      description: 'Sundry creditors for goods and services other than MSME',
      keywords: [
        /trade\s+payables?.*(other|non[- ]msme)/i,
        /sundry\s+creditors?(\s+for\s+goods|\s+for\s+services)?$/i,
        /trade\s+payables?$/i,
        /accounts?\s+payable/i,
        /creditors?\s+for\s+raw\s+materials/i,
        /bills?\s+payable/i
      ]
    },
    'CUR_FIN_OTHER_LIAB': {
      code: 'CUR_FIN_OTHER_LIAB',
      name: 'Other Current Financial Liabilities',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 42',
      normalBalance: 'CREDIT',
      description: 'Unpaid dividends, interest accrued on borrowings, payables for capital goods, retention money current',
      keywords: [
        /other\s+current\s+financial\s+liabilities?/i,
        /unpaid\s+dividends?/i,
        /unclaimed\s+dividends?/i,
        /interest\s+accrued\s*(and|&)?\s*due\s+on\s+borrowings/i,
        /interest\s+accrued\s+but\s+not\s+due/i,
        /creditors?\s+for\s+capital\s+goods/i,
        /payables?\s+for\s+capital\s+expenditure/i,
        /security\s+deposits?\s+received\s*\(current\)/i
      ]
    },
    'OTHER_CUR_LIAB': {
      code: 'OTHER_CUR_LIAB',
      name: 'Other Current Liabilities',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 43',
      normalBalance: 'CREDIT',
      description: 'Statutory dues (TDS, GST, PF, ESI, Profession Tax), advances from customers, deferred revenue current',
      keywords: [
        /other\s+current\s+liabilities?/i,
        /advances?\s+from\s+customers?/i,
        /statutory\s+dues?\s+payable/i,
        /tds\s+payable/i,
        /gst\s+payable/i,
        /pf\s+payable/i,
        /esi\s+payable/i,
        /profession\s+tax\s+payable/i,
        /tcs\s+payable/i,
        /duties\s*(and|&)?\s*taxes\s+payable/i,
        /deferred\s+revenue\s*\(current\)/i,
        /contract\s+liabilit(y|ies)/i
      ]
    },
    'CUR_PROV': {
      code: 'CUR_PROV',
      name: 'Current Provisions',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 44',
      normalBalance: 'CREDIT',
      description: 'Provision for employee benefits (leave encashment, bonus, gratuity current portion), warranty provisions',
      keywords: [
        /current\s+provisions?/i,
        /provision\s+for\s+leave\s+encashment\s*\(current\)/i,
        /provision\s+for\s+gratuity\s*\(current\)/i,
        /provision\s+for\s+bonus/i,
        /provision\s+for\s+warrant(y|ies)/i,
        /short[- ]term\s+provisions?/i
      ]
    },
    'CUR_TAX_LIAB': {
      code: 'CUR_TAX_LIAB',
      name: 'Current Tax Liabilities (Net)',
      statement: 'BS',
      category: 'CURRENT_LIABILITIES',
      scheduleNote: 'Note 45',
      normalBalance: 'CREDIT',
      description: 'Income tax payable net of advance tax and TDS for current year',
      keywords: [
        /current\s+tax\s+liabilit(y|ies)/i,
        /provision\s+for\s+taxation\s*\(net\)/i,
        /income\s+tax\s+payable/i
      ]
    }
  },

  /**
   * Determine classification based on Main Business Activity (MBA)
   * under Ind AS 118 specified rules.
   */
  adaptClassificationForMBA(lineItemCode, businessActivity) {
    if (businessActivity === 'FINANCING') {
      // If entity provides financing to customers (e.g. NBFC/Lender):
      // Interest income and financing expenses are moved to OPERATING category!
      if (lineItemCode === 'INV_INTEREST') {
        return {
          category: 'OPERATING',
          note: 'Ind AS 118 MBA Exception: Interest income classified as OPERATING for lending entity.'
        };
      }
      if (lineItemCode === 'FIN_COST_BORROW') {
        return {
          category: 'OPERATING',
          note: 'Ind AS 118 MBA Exception: Borrowing costs for funding customer loans classified as OPERATING.'
        };
      }
    } else if (businessActivity === 'INVESTING') {
      // If entity invests in assets (e.g. Investment / Holding co):
      // Dividend, interest and fair value changes are moved to OPERATING category!
      if (['INV_INTEREST', 'INV_DIVIDEND', 'INV_GAIN_LOSS', 'INV_PROP_INC'].includes(lineItemCode)) {
        return {
          category: 'OPERATING',
          note: 'Ind AS 118 MBA Exception: Return on investments classified as OPERATING for investment holding entity.'
        };
      }
    }
    return null; // Keep default
  },

  /**
   * Classify a single ledger using name, code, balance type
   */
  classifyLedger(ledgerName, balanceType = null, businessActivity = 'STANDARD') {
    const cleanName = (ledgerName || '').trim();
    if (!cleanName) {
      return {
        lineItemCode: 'OTHER_OP_EXP',
        confidence: 0,
        matchedKeyword: null,
        isCustom: false
      };
    }

    let bestMatch = null;
    let highestScore = 0;

    for (const [code, item] of Object.entries(this.LINE_ITEMS)) {
      for (const pattern of item.keywords) {
        if (pattern.test(cleanName)) {
          let score = 80;
          // Exact regex match boosts confidence
          if (cleanName.toLowerCase() === item.name.toLowerCase()) {
            score = 100;
          } else if (pattern.source.length > 10) {
            score = 90;
          }

          // Bonus if balance direction aligns with normal balance
          if (balanceType && item.normalBalance === balanceType) {
            score += 5;
          }

          if (score > highestScore) {
            highestScore = Math.min(score, 100);
            bestMatch = {
              lineItemCode: code,
              confidence: highestScore,
              matchedKeyword: pattern.toString(),
              isCustom: false
            };
          }
        }
      }
    }

    if (!bestMatch) {
      // Fallback heuristic based on generic tokens & balance
      if (balanceType === 'CREDIT') {
        bestMatch = {
          lineItemCode: 'OTHER_CUR_LIAB',
          confidence: 30,
          matchedKeyword: 'Default Credit Liability Heuristic',
          isCustom: false
        };
      } else {
        bestMatch = {
          lineItemCode: 'OTHER_OP_EXP',
          confidence: 30,
          matchedKeyword: 'Default Debit Expense Heuristic',
          isCustom: false
        };
      }
    }

    // Apply Ind AS 118 MBA transformation if applicable
    const mbaOverride = this.adaptClassificationForMBA(bestMatch.lineItemCode, businessActivity);
    if (mbaOverride) {
      bestMatch.mbaNote = mbaOverride.note;
    }

    return bestMatch;
  }
};

if (typeof window !== 'undefined') {
  window.IndAS118Rules = IndAS118Rules;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IndAS118Rules;
}
