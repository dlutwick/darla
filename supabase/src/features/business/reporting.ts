type DatedRow = { month?: string | null, date?: string | null, status?: 'active' | 'voided' | null };

type SalesRow = DatedRow & {
  totalSale?: number | null,
  estimatedProfit?: number | null,
  quantitySold?: number | null,
  businessType?: 'bakery' | 'craft' | null,
  productType?: 'my-product' | 'third-party' | null,
  commissionEarned?: number | null,
  vendorShare?: number | null,
};
type ExpenseRow = DatedRow & { amount?: number | null, businessType?: 'bakery' | 'craft' | null, expenseType?: 'expense' | 'vendor-payment' | null };
type GiveawayRow = DatedRow & { estimatedSaleValue?: number | null, estimatedCost?: number | null, businessType?: 'bakery' | 'craft' | null };

export const ALL_MONTHS_KEY = 'all';

function isActiveRow(row: DatedRow) {
  return row.status !== 'voided';
}

function isThirdPartySale(row: SalesRow) {
  return row.productType === 'third-party';
}

function isVendorPayment(row: ExpenseRow) {
  return row.expenseType === 'vendor-payment';
}

export function getMonthKeyFromRow(row: DatedRow) {
  return String(row.month ?? row.date ?? '').slice(0, 7);
}

export function getAvailableReportMonths(input: { monthlySummaries?: Array<{ month: string }>, sales?: DatedRow[], expenses?: DatedRow[], giveaways?: DatedRow[] } | null | undefined) {
  const months = new Set<string>();
  (input?.monthlySummaries ?? []).forEach((item) => { if (item.month) months.add(item.month); });
  (input?.sales ?? []).forEach((item) => { const month = getMonthKeyFromRow(item); if (month) months.add(month); });
  (input?.expenses ?? []).forEach((item) => { const month = getMonthKeyFromRow(item); if (month) months.add(month); });
  (input?.giveaways ?? []).forEach((item) => { const month = getMonthKeyFromRow(item); if (month) months.add(month); });
  return [...months].sort((a, b) => b.localeCompare(a));
}

export function filterRowsByMonth<T extends DatedRow>(rows: T[], selectedMonth: string) {
  if (selectedMonth === ALL_MONTHS_KEY) {
    return rows;
  }

  return rows.filter((row) => getMonthKeyFromRow(row) === selectedMonth);
}

export function sumSales(rows: SalesRow[]) {
  return Number(rows.filter(isActiveRow).reduce((sum, row) => sum + Number(row.totalSale || 0), 0).toFixed(2));
}

export function sumMyProductSales(rows: SalesRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && !isThirdPartySale(row)).reduce((sum, row) => sum + Number(row.totalSale || 0), 0).toFixed(2));
}

export function sumThirdPartySales(rows: SalesRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && isThirdPartySale(row)).reduce((sum, row) => sum + Number(row.totalSale || 0), 0).toFixed(2));
}

export function sumProfit(rows: SalesRow[]) {
  return Number(rows.filter(isActiveRow).reduce((sum, row) => sum + Number(row.estimatedProfit || 0), 0).toFixed(2));
}

export function sumMyProductProfit(rows: SalesRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && !isThirdPartySale(row)).reduce((sum, row) => sum + Number(row.estimatedProfit || 0), 0).toFixed(2));
}

export function sumThirdPartyCommission(rows: SalesRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && isThirdPartySale(row)).reduce((sum, row) => sum + Number((row.commissionEarned ?? row.estimatedProfit) || 0), 0).toFixed(2));
}

export function sumVendorOwed(rows: SalesRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && isThirdPartySale(row)).reduce((sum, row) => sum + Number(row.vendorShare || 0), 0).toFixed(2));
}

export function sumQuantity(rows: SalesRow[]) {
  return Number(rows.filter(isActiveRow).reduce((sum, row) => sum + Number(row.quantitySold || 0), 0).toFixed(0));
}

export function sumExpenses(rows: ExpenseRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && !isVendorPayment(row)).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
}

export function sumVendorPayments(rows: ExpenseRow[]) {
  return Number(rows.filter((row) => isActiveRow(row) && isVendorPayment(row)).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
}

export function sumGiveawayValue(rows: GiveawayRow[]) {
  return Number(rows.filter(isActiveRow).reduce((sum, row) => sum + Number(row.estimatedSaleValue || 0), 0).toFixed(2));
}

export function sumGiveawayCost(rows: GiveawayRow[]) {
  return Number(rows.filter(isActiveRow).reduce((sum, row) => sum + Number(row.estimatedCost || 0), 0).toFixed(2));
}

export function getScopeLabel(selectedMonth: string, availableMonths: string[]) {
  if (selectedMonth === ALL_MONTHS_KEY) {
    return availableMonths.length ? `All imported months (${availableMonths[availableMonths.length - 1]} to ${availableMonths[0]})` : 'All months';
  }

  return selectedMonth || 'Current month';
}

export function buildReconciliationRows(input: { monthlySummaries?: Array<{ month: string, sales: number, myProductSales?: number, thirdPartySales?: number, expenses: number, vendorOwed?: number, vendorPayments?: number, giveawayValue: number, giveawayCost: number, profit: number, myProductProfit?: number, thirdPartyCommissionEarned?: number, net: number, trueNet: number }> } | null | undefined, selectedMonth: string) {
  const rows = input?.monthlySummaries ?? [];
  if (selectedMonth === ALL_MONTHS_KEY) {
    return rows;
  }
  return rows.filter((row) => row.month === selectedMonth);
}
