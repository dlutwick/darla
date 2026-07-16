import { Platform } from 'react-native';
import { BUSINESS_STORAGE_KEY, exportBusinessBackup, getBusinessStorageDetails, getDashboardSnapshot, getProductPackSize, getProductSellUnitDescription } from './store';

type CsvCell = string | number | null | undefined;

type CsvResult = {
  filename: string;
  content: string;
};

function escapeCsvCell(value: CsvCell) {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers: string[], rows: CsvCell[][]) {
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
}

export async function buildSalesCsv(): Promise<CsvResult> {
  const [state, snapshot] = await Promise.all([exportBusinessBackup(), getDashboardSnapshot()]);
  const productsById = new Map(state.products.map((product) => [product.productId, product]));
  const rows = snapshot.sales.map((sale) => {
    const product = productsById.get(sale.productId);
    return [
      sale.month,
      sale.itemName ?? sale.productName ?? product?.name,
      sale.productType ?? product?.productType ?? 'my-product',
      sale.vendorName ?? product?.vendorName ?? '',
      sale.commissionPercent ?? product?.commissionPercent ?? '',
      sale.quantity ?? sale.quantitySold,
      sale.unitPrice ?? sale.sellingPrice,
      sale.subtotal ?? sale.totalSale,
      sale.commissionEarned ?? '',
      sale.vendorShare ?? '',
      sale.businessLine ?? sale.businessType ?? product?.businessLine ?? product?.businessType,
      sale.category ?? product?.category ?? '',
      sale.notes ?? sale.note ?? '',
      sale.costPerItem ?? product?.cost ?? '',
      sale.profit ?? sale.estimatedProfit,
      sale.date,
      getProductSellUnitDescription(sale),
      getProductPackSize(sale) > 1 ? getProductPackSize(sale) : '',
    ];
  });

  return {
    filename: 'sales.csv',
    content: buildCsv(
      ['month', 'item_name', 'product_type', 'vendor_name', 'commission_percent', 'quantity', 'unit_price', 'subtotal', 'commission_earned', 'vendor_share', 'business_line', 'category', 'notes', 'cost_per_item', 'profit_or_earned', 'date', 'sell_unit', 'pack_size'],
      rows,
    ),
  };
}

export async function buildExpensesCsv(): Promise<CsvResult> {
  const snapshot = await getDashboardSnapshot();
  const rows = snapshot.expenses.map((expense) => [
    expense.date,
    expense.month,
    expense.expenseType ?? 'expense',
    expense.expenseCategory,
    expense.vendor,
    expense.businessLine ?? expense.businessType,
    expense.amount,
    expense.notes ?? expense.note ?? '',
  ]);

  return {
    filename: 'expenses.csv',
    content: buildCsv(['date', 'month', 'expense_type', 'expense_category', 'vendor', 'business_line', 'amount', 'notes'], rows),
  };
}

export async function buildGiveawaysCsv(): Promise<CsvResult> {
  const snapshot = await getDashboardSnapshot();
  const rows = snapshot.giveaways.map((giveaway) => [
    giveaway.date,
    giveaway.month,
    giveaway.productName,
    giveaway.businessLine ?? giveaway.businessType,
    giveaway.category,
    getProductSellUnitDescription(giveaway),
    giveaway.quantityGivenAway ?? giveaway.quantity,
    giveaway.estimatedSaleValue,
    giveaway.estimatedCost,
    giveaway.notes ?? giveaway.note ?? giveaway.reason ?? '',
  ]);

  return {
    filename: 'giveaways.csv',
    content: buildCsv(['date', 'month', 'product_name', 'business_line', 'category', 'sell_unit', 'quantity_given_away', 'estimated_sale_value', 'estimated_cost', 'reason_or_note'], rows),
  };
}

export async function buildProductsCsv(): Promise<CsvResult> {
  const snapshot = await getDashboardSnapshot();
  const rows = snapshot.productSnapshots.map((product) => [
    product.name,
    product.businessLine ?? product.businessType,
    product.productType ?? 'my-product',
    product.vendorName ?? '',
    product.commissionPercent ?? '',
    product.category,
    getProductSellUnitDescription(product),
    product.sellUnitType === 'pack' ? getProductPackSize(product) : '',
    product.cost,
    product.sellingPrice,
    product.startingInventory,
    product.reorderLevel,
    product.quantityOnHand,
  ]);

  return {
    filename: 'products.csv',
    content: buildCsv(
      ['product_name', 'business_line', 'product_type', 'vendor_name', 'commission_percent', 'category', 'sell_unit', 'pack_size', 'cost_per_item', 'sale_price_per_sell_unit', 'starting_inventory', 'reorder_level', 'current_inventory'],
      rows,
    ),
  };
}

export async function buildInventoryCsv(): Promise<CsvResult> {
  const snapshot = await getDashboardSnapshot();
  const rows = snapshot.productSnapshots.map((product) => [
    product.name,
    product.businessLine ?? product.businessType,
    product.category,
    getProductSellUnitDescription(product),
    product.sellUnitType === 'pack' ? getProductPackSize(product) : '',
    product.startingInventory,
    product.quantitySold,
    product.quantityOnHand,
    product.reorderLevel,
    product.lowStock ? 'yes' : 'no',
  ]);

  return {
    filename: 'inventory.csv',
    content: buildCsv(
      ['product_name', 'business_line', 'category', 'sell_unit', 'pack_size', 'starting_inventory', 'quantity_sold', 'current_inventory', 'reorder_level', 'low_stock'],
      rows,
    ),
  };
}

export async function buildSummaryCsv(): Promise<CsvResult> {
  const snapshot = await getDashboardSnapshot();
  const rows: CsvCell[][] = [
    ['today_sales', snapshot.todaySales],
    ['week_sales', snapshot.weekSales],
    ['month_sales', snapshot.monthSales],
    ['month_my_product_sales', snapshot.monthMyProductSales],
    ['month_third_party_sales', snapshot.monthThirdPartySales],
    ['month_my_product_profit', snapshot.monthMyProductProfit],
    ['month_third_party_commission_earned', snapshot.monthThirdPartyCommissionEarned],
    ['month_total_earned_before_expenses', snapshot.monthTotalEarnedBeforeExpenses],
    ['month_vendor_owed', snapshot.monthVendorOwed],
    ['month_vendor_paid', snapshot.monthVendorPaid],
    ['month_vendor_outstanding', snapshot.monthVendorOutstanding],
    ['today_expenses', snapshot.todayExpenses],
    ['week_expenses', snapshot.weekExpenses],
    ['month_expenses', snapshot.monthExpenses],
    ['month_giveaway_value', snapshot.monthGiveawayValue],
    ['month_giveaway_cost', snapshot.monthGiveawayCost],
    ['total_expenses', snapshot.totalExpenses],
    ['month_net_after_expenses', snapshot.monthNet],
    ['month_true_net_after_giveaways', snapshot.monthTrueNet],
    ['sales_rows_saved', snapshot.sales.length],
    ['expense_rows_saved', snapshot.expenses.length],
    ['giveaway_rows_saved', snapshot.giveaways.length],
    ['products_saved', snapshot.productSnapshots.length],
    ['low_stock_items', snapshot.lowStockItems.length],
    ['bakery_sales', snapshot.bakerySales],
    ['bakery_profit', snapshot.bakeryProfit],
    ['bakery_my_product_sales', snapshot.bakeryMyProductSales],
    ['bakery_third_party_sales', snapshot.bakeryThirdPartySales],
    ['bakery_my_product_profit', snapshot.bakeryMyProductProfit],
    ['bakery_third_party_commission_earned', snapshot.bakeryThirdPartyCommissionEarned],
    ['bakery_items_sold', snapshot.bakeryItemsSold],
    ['craft_sales', snapshot.craftSales],
    ['craft_profit', snapshot.craftProfit],
    ['craft_my_product_sales', snapshot.craftMyProductSales],
    ['craft_third_party_sales', snapshot.craftThirdPartySales],
    ['craft_my_product_profit', snapshot.craftMyProductProfit],
    ['craft_third_party_commission_earned', snapshot.craftThirdPartyCommissionEarned],
    ['craft_items_sold', snapshot.craftItemsSold],
  ];

  return {
    filename: 'summary.csv',
    content: buildCsv(['metric', 'value'], rows),
  };
}

export async function downloadCsvFile(file: CsvResult) {
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const blob = new Blob([file.content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return { delivered: true, mode: 'download' as const };
  }

  return { delivered: false, mode: Platform.OS };
}

export async function getBusinessHistorySnapshot() {
  const [state, dashboard] = await Promise.all([exportBusinessBackup(), getDashboardSnapshot()]);
  const details = getBusinessStorageDetails();

  const newestSale = dashboard.sales[0] ?? null;
  const newestExpense = dashboard.expenses[0] ?? null;
  const newestGiveaway = dashboard.giveaways[0] ?? null;
  const newestProduct = [...state.products].sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`))[0] ?? null;

  return {
    storageKey: BUSINESS_STORAGE_KEY,
    storageRuntime: details.runtimeStore,
    singleSourceOfTruth: details.singleSourceOfTruth,
    salesHistorySource: details.salesHistorySource,
    expensesSource: details.expensesSource,
    giveawaysSource: details.giveawaysSource,
    inventorySource: details.inventorySource,
    counts: {
      products: state.products.length,
      archivedProducts: (dashboard.archivedProducts ?? []).length,
      sales: dashboard.sales.length,
      expenses: dashboard.expenses.length,
      giveaways: dashboard.giveaways.length,
      helperCommissions: (dashboard.helperCommissions ?? []).length,
      voidedSales: (dashboard.auditSales ?? []).filter((item) => item.status === 'voided').length,
      voidedExpenses: (dashboard.auditExpenses ?? []).filter((item) => item.status === 'voided').length,
      voidedGiveaways: (dashboard.auditGiveaways ?? []).filter((item) => item.status === 'voided').length,
      restocks: (dashboard.restocks ?? []).length,
      inventoryItems: dashboard.productSnapshots.length,
      lowStockItems: dashboard.lowStockItems.length,
    },
    newestSale,
    newestExpense,
    newestGiveaway,
    newestProduct,
  };
}
