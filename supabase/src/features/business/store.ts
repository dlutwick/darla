import type { ISODate } from '../../types/health';
import { APP_TIME_ZONE, getLocalDay } from '../../lib/date';
import { formatNumber } from '../../lib/format';
import { MASTER_IMPORT_STATE } from './master-import-data';

export type BusinessType = 'bakery' | 'craft';
export type ProductType = 'my-product' | 'third-party';
export type HelperCommissionType = 'percentage' | 'flat';
export type PaymentType = 'cash' | 'e-transfer' | 'card' | 'other';
export type HelperPaymentMethod = 'cash' | 'e-transfer' | 'card' | 'supplies' | 'product' | 'other';
export type OrderStatus = 'new' | 'in progress' | 'ready' | 'picked up' | 'paid';
export type SellUnitType = 'each' | 'loaf' | 'pack' | 'custom';
export type RowStatus = 'active' | 'voided';
export type ProductStatus = 'active' | 'archived';
export type ExpenseType = 'expense' | 'vendor-payment';

export type HelperCommissionRecord = {
  helperCommissionId: string;
  businessType: BusinessType;
  helperName: string;
  showName: string;
  showDate: ISODate;
  totalShowSales: number;
  commissionType: HelperCommissionType;
  commissionRate: number;
  commissionAmount: number;
  paymentMethod: HelperPaymentMethod;
  paymentDescription: string | null;
  paymentValue: number;
  paid: boolean;
  datePaid: string | null;
  notes: string | null;
  linkedExpenseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductRecord = {
  productId: string;
  businessType: BusinessType;
  businessLine: BusinessType;
  productType: ProductType;
  name: string;
  category: string;
  cost: number;
  sellingPrice: number;
  vendorName: string | null;
  commissionPercent: number;
  sellUnitType: SellUnitType;
  customUnitName: string | null;
  packSize: number | null;
  startingInventory: number;
  reorderLevel: number;
  notes: string | null;
  batchSize: number | null;
  batchCost: number | null;
  status?: ProductStatus;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaleRecord = {
  saleId: string;
  businessType: BusinessType;
  businessLine: BusinessType;
  productType: ProductType;
  productId: string;
  productName: string;
  vendorName: string | null;
  commissionPercent: number;
  month: string;
  itemName: string;
  sellUnitType: SellUnitType;
  customUnitName: string | null;
  packSize: number | null;
  quantitySold: number;
  quantity: number;
  sellingPrice: number;
  unitPrice: number;
  date: ISODate;
  note: string | null;
  notes: string | null;
  totalSale: number;
  subtotal: number;
  category: string;
  costPerItem: number;
  costMissing?: boolean;
  commissionEarned: number;
  vendorShare: number;
  helperName: string | null;
  showEvent: string | null;
  helperCommissionType: HelperCommissionType;
  helperCommissionRate: number;
  helperCommissionAmount: number;
  helperCommissionPaid: boolean;
  helperCommissionDatePaid: string | null;
  helperCommissionNotes: string | null;
  estimatedProfit: number;
  profit: number;
  paymentMethod: PaymentType;
  customerName: string | null;
  status?: RowStatus;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidReason?: string | null;
  voidedQuantity?: number | null;
  originalSaleId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type ExpenseRecord = {
  expenseId: string;
  date: ISODate;
  month: string;
  expenseType: ExpenseType;
  expenseCategory: string;
  vendor: string;
  businessType: BusinessType;
  businessLine: BusinessType;
  amount: number;
  note: string | null;
  notes: string | null;
  status?: RowStatus;
  voidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GiveawayRecord = {
  giveawayId: string;
  date: ISODate;
  month: string;
  productId: string;
  productName: string;
  businessType: BusinessType;
  businessLine: BusinessType;
  category: string;
  sellUnitType: SellUnitType;
  customUnitName: string | null;
  packSize: number | null;
  quantityGivenAway: number;
  quantity: number;
  estimatedSaleValue: number;
  estimatedCost: number;
  reason: string | null;
  note: string | null;
  notes: string | null;
  status?: RowStatus;
  voidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RestockRecord = {
  restockId: string;
  productId: string;
  productName: string;
  businessType: BusinessType;
  businessLine: BusinessType;
  category: string;
  quantityAdded: number;
  quantityBefore?: number;
  quantityAfter?: number;
  date: ISODate;
  month: string;
  note: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderRecord = {
  orderId: string;
  customerName: string;
  businessType: BusinessType;
  itemOrdered: string;
  quantity: number;
  price: number;
  depositPaid: number;
  balanceDue: number;
  dueDate: ISODate;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BusinessAppState = {
  products: ProductRecord[];
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  giveaways: GiveawayRecord[];
  restocks: RestockRecord[];
  orders: OrderRecord[];
  helperCommissions: HelperCommissionRecord[];
};

export type BusinessSummary = {
  sales: number;
  profit: number;
  itemsSold: number;
  bestSellingItems: ReturnType<typeof buildProductSnapshot>[];
};

type ProductUnitShape = {
  sellUnitType?: SellUnitType | null;
  customUnitName?: string | null;
  packSize?: number | null;
};

const LEGACY_BUSINESS_STORAGE_KEY = 'darla-business-app.v1';
export const BUSINESS_STORAGE_KEY = 'darla-business-app.v2.master-import';
export const BUSINESS_STORAGE_BACKUP_KEY = 'darla-business-app.v1.backup-before-master-import';
const STORE_UPDATED_EVENT = 'darla-business-app:updated';
const storeListeners = new Set<() => void>();
let cachedState: BusinessAppState | null = null;
let secureStoreModulePromise: Promise<{ getItemAsync: (key: string) => Promise<string | null>, setItemAsync: (key: string, value: string) => Promise<void> } | null> | null = null;

export const BAKERY_CATEGORIES = ['Butter Tarts', 'Bread', 'Cookies', 'Cinnamon Rolls', 'Pies', 'Fudge'];
export const CRAFT_CATEGORIES = ['Laser Crafts', 'Sewing', 'Sublimation', 'Wreaths', 'Ornaments', 'Jewelry Boxes', 'Towels', 'Tumblers', 'Seasonal Items'];
export const PAYMENT_TYPES: PaymentType[] = ['cash', 'e-transfer', 'card', 'other'];
export const ORDER_STATUSES: OrderStatus[] = ['new', 'in progress', 'ready', 'picked up', 'paid'];
export const SELL_UNIT_TYPES: SellUnitType[] = ['each', 'loaf', 'pack', 'custom'];
export const MARKET_FEES_EVENTS_CATEGORY = 'Market Fees/Events';
export const AUTOMATIC_MONTHLY_EXPENSES = [
  { name: 'Craft Booth Fee', amount: 70, category: MARKET_FEES_EVENTS_CATEGORY, vendor: 'Craft Booth Fee', businessType: 'craft' as const },
  { name: 'Fridge Fee', amount: 12, category: 'Supplies', vendor: 'Fridge Fee', businessType: 'bakery' as const },
  { name: 'Tax', amount: 12.30, category: 'Tax', vendor: 'Tax', businessType: 'bakery' as const },
];
export const AUTOMATIC_MONTHLY_EXPENSE_TOTAL = Number(AUTOMATIC_MONTHLY_EXPENSES.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2));
export const HARTLAND_FARM_MARKET_FEE_AMOUNT = 25;
export const HARTLAND_FARM_MARKET_FEE_VENDOR = 'Hartland Farm Market';
export const HARTLAND_FARM_MARKET_FEE_CATEGORY = MARKET_FEES_EVENTS_CATEGORY;
export const HARTLAND_FARM_MARKET_FEE_END_DATE = '2026-09-01';
const BUTTER_TARTS_PRICE_EFFECTIVE_DATE = '2026-05-01';
const BUTTER_TARTS_PACK_SIZE_FROM_EFFECTIVE_DATE = 6;
const BUTTER_TARTS_PRICE_FROM_EFFECTIVE_DATE = 10;
const WRIST_KEY_FOB_PRICE = 12;

export function getSuggestedSellUnitSetup(businessType: BusinessType, category: string) {
  const normalizedCategory = category.trim().toLowerCase();

  if (businessType === 'bakery') {
    if (normalizedCategory === 'butter tarts') return { sellUnitType: 'pack' as SellUnitType, packSize: BUTTER_TARTS_PACK_SIZE_FROM_EFFECTIVE_DATE, sellingPrice: BUTTER_TARTS_PRICE_FROM_EFFECTIVE_DATE };
    if (normalizedCategory === 'cinnamon rolls') return { sellUnitType: 'pack' as SellUnitType, packSize: 4, sellingPrice: 10 };
    if (normalizedCategory === 'cookies') return { sellUnitType: 'pack' as SellUnitType, packSize: 6 };
    if (normalizedCategory === 'bread') return { sellUnitType: 'loaf' as SellUnitType, packSize: 1 };
  }

  return { sellUnitType: 'each' as SellUnitType, packSize: 1 };
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function dispatchStoreUpdated() {
  storeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener failures so one bad subscriber does not block updates
    }
  });

  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT));
  } catch {
    // ignore dispatch failures on unsupported environments
  }
}

function normalizeState(input?: Partial<BusinessAppState> | null): BusinessAppState {
  const products = Array.isArray(input?.products)
    ? input!.products.map((product) => normalizeProductRecord(product as Partial<ProductRecord>))
    : [];

  return {
    products,
    sales: Array.isArray(input?.sales)
      ? input!.sales.map((sale) => normalizeSaleRecord(sale as Partial<SaleRecord>, products))
      : [],
    expenses: Array.isArray((input as Partial<BusinessAppState> & { expenses?: ExpenseRecord[] })?.expenses)
      ? (input as Partial<BusinessAppState> & { expenses?: ExpenseRecord[] }).expenses!.map((expense) => normalizeExpenseRecord(expense as Partial<ExpenseRecord>))
      : [],
    giveaways: Array.isArray((input as Partial<BusinessAppState> & { giveaways?: GiveawayRecord[] })?.giveaways)
      ? (input as Partial<BusinessAppState> & { giveaways?: GiveawayRecord[] }).giveaways!.map((giveaway) => normalizeGiveawayRecord(giveaway as Partial<GiveawayRecord>, products))
      : [],
    restocks: Array.isArray((input as Partial<BusinessAppState> & { restocks?: RestockRecord[] })?.restocks)
      ? (input as Partial<BusinessAppState> & { restocks?: RestockRecord[] }).restocks!.map((restock) => normalizeRestockRecord(restock as Partial<RestockRecord>, products))
      : [],
    orders: Array.isArray(input?.orders) ? input!.orders : [],
    helperCommissions: Array.isArray((input as Partial<BusinessAppState> & { helperCommissions?: HelperCommissionRecord[] })?.helperCommissions)
      ? (input as Partial<BusinessAppState> & { helperCommissions?: HelperCommissionRecord[] }).helperCommissions!.map((item) => normalizeHelperCommissionRecord(item as Partial<HelperCommissionRecord>))
      : [],
  };
}

function normalizeSellUnitType(value: unknown): SellUnitType {
  return value === 'loaf' || value === 'pack' || value === 'custom' ? value : 'each';
}

function normalizeProductType(value: unknown): ProductType {
  return value === 'third-party' ? 'third-party' : 'my-product';
}

function normalizeExpenseType(value: unknown): ExpenseType {
  return value === 'vendor-payment' ? 'vendor-payment' : 'expense';
}

function normalizePaymentType(value: unknown): PaymentType {
  return value === 'e-transfer' || value === 'card' || value === 'other' ? value : 'cash';
}

function normalizeBusinessType(value: unknown): BusinessType {
  return value === 'craft' ? 'craft' : 'bakery';
}

function normalizeCurrency(value: unknown) {
  return Number(Math.max(0, toSafeNumber(value, 0)).toFixed(2));
}

function normalizeHelperCommissionType(value: unknown): HelperCommissionType {
  return value === 'flat' ? 'flat' : 'percentage';
}

function normalizeHelperPaymentMethod(value: unknown): HelperPaymentMethod {
  return value === 'e-transfer' || value === 'card' || value === 'supplies' || value === 'product' || value === 'other'
    ? value
    : 'cash';
}

function normalizeVendorName(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeHelperCommissionRecord(input: Partial<HelperCommissionRecord>): HelperCommissionRecord {
  const showDate = String(input.showDate ?? getLocalDay()) as ISODate;
  const businessType = normalizeBusinessType(input.businessType);
  const commissionType = normalizeHelperCommissionType(input.commissionType);
  const totalShowSales = normalizeCurrency(input.totalShowSales);
  const commissionRate = commissionType === 'percentage'
    ? Number(Math.min(100, normalizeCurrency(input.commissionRate)).toFixed(2))
    : normalizeCurrency(input.commissionRate);
  const calculatedCommissionAmount = commissionType === 'flat'
    ? commissionRate
    : Number((totalShowSales * (commissionRate / 100)).toFixed(2));
  const paymentMethod = normalizeHelperPaymentMethod(input.paymentMethod);
  const paymentValue = normalizeCurrency(input.paymentValue);
  const commissionAmount = (paymentMethod === 'supplies' || paymentMethod === 'product') && paymentValue > 0
    ? paymentValue
    : calculatedCommissionAmount;

  return {
    helperCommissionId: String(input.helperCommissionId ?? createId('helper-commission')),
    businessType,
    helperName: String(input.helperName ?? '').trim(),
    showName: String(input.showName ?? '').trim(),
    showDate,
    totalShowSales,
    commissionType,
    commissionRate,
    commissionAmount,
    paymentMethod,
    paymentDescription: normalizeOptionalText(input.paymentDescription),
    paymentValue: paymentValue > 0 ? paymentValue : commissionAmount,
    paid: Boolean(input.paid),
    datePaid: Boolean(input.paid) ? normalizeOptionalText(input.datePaid) : null,
    notes: normalizeOptionalText(input.notes),
    linkedExpenseId: normalizeOptionalText(input.linkedExpenseId),
    createdAt: String(input.createdAt ?? nowIso()),
    updatedAt: String(input.updatedAt ?? input.createdAt ?? nowIso()),
  };
}

function normalizeCommissionPercent(value: unknown, fallback = 25) {
  const percent = toSafeNumber(value, fallback);
  return Number(Math.min(100, Math.max(0, percent)).toFixed(2));
}

function inferLegacyProductType(input: Partial<ProductRecord>) {
  const explicit = typeof (input as Partial<ProductRecord> & { productType?: string }).productType === 'string'
    ? normalizeProductType((input as Partial<ProductRecord> & { productType?: string }).productType)
    : null;
  if (explicit) {
    return explicit;
  }

  const category = String(input.category ?? '').trim().toLowerCase();
  const name = String(input.name ?? '').trim().toLowerCase();
  const notes = String(input.notes ?? '').trim().toLowerCase();
  if (category.includes('3rd party') || category.includes('third party') || name.includes('3rd party') || name.includes('third party') || notes.includes('3rd party') || notes.includes('third party')) {
    return 'third-party' as ProductType;
  }

  return 'my-product' as ProductType;
}

function inferLegacyVendorName(input: Partial<ProductRecord>, productType: ProductType) {
  const explicitVendor = normalizeVendorName((input as Partial<ProductRecord> & { vendorName?: string | null }).vendorName);
  if (explicitVendor) {
    return explicitVendor;
  }
  if (productType !== 'third-party') {
    return null;
  }

  const text = [input.name, input.category, input.notes].filter(Boolean).join(' ');
  const donnaMatch = text.match(/\bdonna\b/i);
  if (donnaMatch) {
    return 'Donna';
  }

  const hyphenTail = String(input.name ?? '').split('-').map((part) => part.trim()).filter(Boolean).pop() ?? '';
  if (/^[A-Za-z][A-Za-z '\.]{1,30}$/.test(hyphenTail) && !/farmhouse|crochet|laser|mesh/i.test(hyphenTail)) {
    return hyphenTail;
  }

  return null;
}

function inferLegacySellUnitType(input: Partial<ProductRecord>): SellUnitType {
  const category = String(input.category ?? '').toLowerCase();
  const name = String(input.name ?? '').toLowerCase();

  if (category.includes('bread') || name.includes('loaf')) {
    return 'loaf';
  }

  const legacyPackSize = toSafeNumber((input as Partial<ProductRecord> & { packSize?: number }).packSize ?? input.batchSize, 0);
  if (legacyPackSize > 1) {
    return 'pack';
  }

  return 'each';
}

function normalizePackSize(input: Partial<ProductRecord>, sellUnitType: SellUnitType) {
  const explicitPackSize = toSafeNumber((input as Partial<ProductRecord> & { packSize?: number }).packSize, 0);
  const legacyBatchSize = toSafeNumber(input.batchSize, 0);
  const size = explicitPackSize > 0 ? explicitPackSize : legacyBatchSize > 0 ? legacyBatchSize : 1;
  return sellUnitType === 'pack' ? Math.max(1, size) : 1;
}

function normalizeProductRecord(input: Partial<ProductRecord>): ProductRecord {
  const sellUnitType = (typeof input.sellUnitType === 'string' ? normalizeSellUnitType(input.sellUnitType) : inferLegacySellUnitType(input));
  const packSize = normalizePackSize(input, sellUnitType);
  const productType = inferLegacyProductType(input);
  const legacyItemCost = input.batchCost != null && input.batchSize != null && Number(input.batchSize) > 0
    ? Number(input.batchCost) / Number(input.batchSize)
    : Number(input.cost ?? 0);
  const normalizedCost = productType === 'third-party' ? 0 : Number(toSafeNumber(input.cost, legacyItemCost).toFixed(6));
  const productIdentity = {
    businessType: input.businessType === 'craft' ? 'craft' as const : 'bakery' as const,
    name: String(input.name ?? '').trim(),
    category: String(input.category ?? '').trim(),
  };

  return {
    productId: String(input.productId ?? createId('product')),
    businessType: productIdentity.businessType,
    businessLine: input.businessLine === 'craft' ? 'craft' : input.businessType === 'craft' ? 'craft' : 'bakery',
    productType,
    name: productIdentity.name,
    category: productIdentity.category,
    cost: normalizedCost,
    sellingPrice: isWristKeyFobProduct(productIdentity) ? WRIST_KEY_FOB_PRICE : Number(toSafeNumber(input.sellingPrice).toFixed(2)),
    vendorName: inferLegacyVendorName(input, productType),
    commissionPercent: productType === 'third-party'
      ? normalizeCommissionPercent((input as Partial<ProductRecord> & { commissionPercent?: number }).commissionPercent, 25)
      : 0,
    sellUnitType,
    customUnitName: typeof input.customUnitName === 'string' && input.customUnitName.trim() ? input.customUnitName.trim() : null,
    packSize,
    startingInventory: toSafeNumber(input.startingInventory),
    reorderLevel: toSafeNumber(input.reorderLevel),
    notes: typeof input.notes === 'string' && input.notes.trim() ? input.notes.trim() : null,
    batchSize: input.batchSize != null ? toSafeNumber(input.batchSize) : null,
    batchCost: input.batchCost != null ? Number(toSafeNumber(input.batchCost).toFixed(2)) : null,
    status: input.status === 'archived' ? 'archived' : 'active',
    archivedAt: input.status === 'archived' ? String(input.archivedAt ?? input.updatedAt ?? nowIso()) : null,
    createdAt: String(input.createdAt ?? nowIso()),
    updatedAt: String(input.updatedAt ?? nowIso()),
  };
}

function isCinnamonRollsProduct(product: ProductRecord) {
  const normalizedName = product.name.trim().toLowerCase();
  const normalizedCategory = product.category.trim().toLowerCase();
  return normalizedName === 'cinnamon rolls' || normalizedCategory === 'cinnamon rolls';
}

function isButterTartsProduct(product: Pick<ProductRecord, 'businessType' | 'name' | 'category'>) {
  const normalizedName = product.name.trim().toLowerCase();
  return product.businessType === 'bakery' && normalizedName === 'butter tarts';
}

function isWristKeyFobProduct(product: Pick<ProductRecord, 'businessType' | 'name' | 'category'>) {
  const normalizedName = product.name.trim().toLowerCase();
  return product.businessType === 'craft' && (normalizedName === 'wrist key fob' || normalizedName === 'wrist key fobs');
}

function isButterTartsSale(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null) {
  if (matchedProduct) {
    return isButterTartsProduct(matchedProduct);
  }

  const businessType = sale.businessLine === 'craft' || sale.businessType === 'craft' ? 'craft' : 'bakery';
  const normalizedName = String(sale.itemName ?? sale.productName ?? '').trim().toLowerCase();
  return businessType === 'bakery' && normalizedName === 'butter tarts';
}

function isWristKeyFobSale(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null) {
  if (matchedProduct) {
    return isWristKeyFobProduct(matchedProduct);
  }

  const businessType = sale.businessLine === 'craft' || sale.businessType === 'craft' ? 'craft' : 'bakery';
  const normalizedName = String(sale.itemName ?? sale.productName ?? '').trim().toLowerCase();
  return businessType === 'craft' && (normalizedName === 'wrist key fob' || normalizedName === 'wrist key fobs');
}

function isDateOnOrAfter(date: string | null | undefined, effectiveDate: string) {
  return String(date ?? getLocalDay()).slice(0, 10) >= effectiveDate;
}

export function getEffectiveProductSellingPrice(product: ProductRecord, date?: string | null) {
  if (isWristKeyFobProduct(product)) {
    return WRIST_KEY_FOB_PRICE;
  }

  if (isButterTartsProduct(product) && isDateOnOrAfter(date, BUTTER_TARTS_PRICE_EFFECTIVE_DATE)) {
    return BUTTER_TARTS_PRICE_FROM_EFFECTIVE_DATE;
  }

  return product.sellingPrice;
}

function getEffectiveSaleUnitPrice(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null, date: string) {
  const savedUnitPrice = toSafeNumber(sale.unitPrice ?? sale.sellingPrice ?? (matchedProduct ? getEffectiveProductSellingPrice(matchedProduct, date) : 0));
  const packSize = sale.packSize != null ? Math.max(1, toSafeNumber(sale.packSize, 1)) : matchedProduct ? getProductPackSize(matchedProduct) : 1;
  const shouldApplyButterTartsMayPrice = isButterTartsSale(sale, matchedProduct)
    && isDateOnOrAfter(date, BUTTER_TARTS_PRICE_EFFECTIVE_DATE)
    && packSize === BUTTER_TARTS_PACK_SIZE_FROM_EFFECTIVE_DATE;
  const shouldApplyWristKeyFobPrice = isWristKeyFobSale(sale, matchedProduct);

  return {
    unitPrice: shouldApplyWristKeyFobPrice ? WRIST_KEY_FOB_PRICE : shouldApplyButterTartsMayPrice ? BUTTER_TARTS_PRICE_FROM_EFFECTIVE_DATE : savedUnitPrice,
    priceRuleApplied: shouldApplyWristKeyFobPrice || shouldApplyButterTartsMayPrice,
  };
}

function shouldApplySuggestedBakeryPackaging(product: ProductRecord) {
  const suggested = getSuggestedSellUnitSetup(product.businessType, product.category || product.name);
  if (suggested.sellUnitType === 'each') {
    return false;
  }

  const isLegacyEach = product.sellUnitType === 'each' && (product.packSize == null || product.packSize === 1) && !product.customUnitName;
  const isWrongButterTartsSetup = isButterTartsProduct(product)
    && (product.sellUnitType !== 'pack'
      || product.packSize !== BUTTER_TARTS_PACK_SIZE_FROM_EFFECTIVE_DATE
      || Number(product.sellingPrice.toFixed(2)) !== BUTTER_TARTS_PRICE_FROM_EFFECTIVE_DATE);
  const isWrongCinnamonRollSetup = isCinnamonRollsProduct(product)
    && (product.sellUnitType !== 'pack' || product.packSize !== 4 || Number(product.sellingPrice.toFixed(2)) !== 10);

  return isLegacyEach || isWrongButterTartsSetup || isWrongCinnamonRollSetup;
}

function applySuggestedBakeryPackaging(product: ProductRecord) {
  if (!shouldApplySuggestedBakeryPackaging(product)) {
    return { product, changed: false };
  }

  const suggested = getSuggestedSellUnitSetup(product.businessType, product.category || product.name);
  return {
    product: {
      ...product,
      sellUnitType: suggested.sellUnitType,
      packSize: suggested.packSize,
      sellingPrice: isButterTartsProduct(product)
        ? BUTTER_TARTS_PRICE_FROM_EFFECTIVE_DATE
        : isCinnamonRollsProduct(product)
          ? 10
          : product.sellingPrice,
      updatedAt: nowIso(),
    },
    changed: true,
  };
}

function migrateSuggestedPackagedProducts(state: BusinessAppState) {
  let changed = false;
  const products = state.products.map((product) => {
    const result = applySuggestedBakeryPackaging(product);
    if (result.changed) {
      changed = true;
    }
    return result.product;
  });

  return {
    state: changed ? { ...state, products: sortProducts(products) } : state,
    changed,
  };
}

const DONNA_THIRD_PARTY_NAMES = new Set([
  'bird house-donna',
  'cutting board -farmhouse-donna',
]);

function shouldConvertDonnaThirdPartyProduct(product: ProductRecord) {
  const normalizedName = product.name.trim().toLowerCase();
  return DONNA_THIRD_PARTY_NAMES.has(normalizedName);
}

function migrateDonnaThirdPartyProducts(state: BusinessAppState) {
  const converted: ProductRecord[] = [];
  const timestamp = nowIso();
  const products = state.products.map((product) => {
    if (!shouldConvertDonnaThirdPartyProduct(product)) {
      return product;
    }

    const next = normalizeProductRecord({
      ...product,
      productType: 'third-party',
      vendorName: 'Donna',
      commissionPercent: 25,
      cost: 0,
      updatedAt: timestamp,
    });

    if (
      next.productType !== product.productType
      || next.vendorName !== product.vendorName
      || next.commissionPercent !== product.commissionPercent
      || next.cost !== product.cost
    ) {
      converted.push(next);
    }

    return next;
  });

  return {
    state: converted.length ? { ...state, products: sortProducts(products) } : state,
    changed: converted.length > 0,
    converted,
  };
}

const MASTER_IMPORT_SALE_CORRECTION_FIELDS: Array<keyof SaleRecord> = [
  'businessType',
  'businessLine',
  'productType',
  'productName',
  'vendorName',
  'commissionPercent',
  'month',
  'itemName',
  'sellUnitType',
  'customUnitName',
  'packSize',
  'quantitySold',
  'quantity',
  'sellingPrice',
  'unitPrice',
  'date',
  'note',
  'notes',
  'totalSale',
  'subtotal',
  'category',
  'costPerItem',
  'costMissing',
  'commissionEarned',
  'vendorShare',
  'estimatedProfit',
  'profit',
];

function migrateMasterImportSalesCorrections(state: BusinessAppState) {
  const canonicalSalesById = new Map(MASTER_IMPORT_STATE.sales.map((sale) => [sale.saleId, sale]));
  let changed = false;

  const sales = state.sales.map((sale) => {
    const canonical = canonicalSalesById.get(sale.saleId);
    if (!canonical) {
      return sale;
    }

    const next: SaleRecord = { ...sale };
    for (const field of MASTER_IMPORT_SALE_CORRECTION_FIELDS) {
      if (next[field] !== canonical[field]) {
        (next as Record<keyof SaleRecord, unknown>)[field] = canonical[field];
        changed = true;
      }
    }

    return next;
  });

  return {
    state: changed ? { ...state, sales: sortSales(sales) } : state,
    changed,
  };
}

function migrateMissingMasterImportSales(state: BusinessAppState) {
  const existingSaleIds = new Set(state.sales.map((sale) => sale.saleId));
  const missingSales = MASTER_IMPORT_STATE.sales.filter((sale) => !existingSaleIds.has(sale.saleId));

  return {
    state: missingSales.length ? { ...state, sales: sortSales([...state.sales, ...missingSales]) } : state,
    changed: missingSales.length > 0,
  };
}

export function getProductPackSize(product: ProductUnitShape) {
  return product.sellUnitType === 'pack' ? Math.max(1, product.packSize ?? 1) : 1;
}

export function isThirdPartyProduct(product: Pick<ProductRecord, 'productType'>) {
  return product.productType === 'third-party';
}

export function getProductCommissionRate(product: Pick<ProductRecord, 'productType' | 'commissionPercent'>) {
  return isThirdPartyProduct(product as Pick<ProductRecord, 'productType'>)
    ? normalizeCommissionPercent(product.commissionPercent, 25) / 100
    : 0;
}

export function getProductUnitBaseLabel(product: ProductUnitShape) {
  if (product.sellUnitType === 'loaf') return 'loaf';
  if (product.sellUnitType === 'custom') return product.customUnitName?.trim() || 'unit';
  if (product.sellUnitType === 'pack') return 'pack';
  return 'item';
}

export function getProductSellUnitLabel(product: ProductUnitShape, quantity = 1) {
  const base = getProductUnitBaseLabel(product);
  if (quantity === 1) {
    return base;
  }

  if (base.endsWith('s')) {
    return base;
  }

  return `${base}s`;
}

export function getProductSellUnitDescription(product: ProductUnitShape, quantity = 1) {
  if (product.sellUnitType === 'pack') {
    const packWord = quantity === 1 ? 'pack' : 'packs';
    return `${packWord} of ${formatNumber(getProductPackSize(product), 0)}`;
  }

  return getProductSellUnitLabel(product, quantity);
}

export function getPackageCost(product: ProductRecord) {
  if (isThirdPartyProduct(product)) {
    return 0;
  }
  return Number(product.cost.toFixed(6));
}

export function isProductCostMissing(product: ProductRecord) {
  if (isThirdPartyProduct(product)) {
    return false;
  }
  return !Number.isFinite(product.cost) || product.cost <= 0;
}

export function getProductCostStatusLabel(product: ProductRecord) {
  return isProductCostMissing(product) ? 'Cost Pending' : 'Cost Set';
}

export function getSaleProfitStatusLabel(sale: Pick<SaleRecord, 'costMissing' | 'estimatedProfit'>) {
  return sale.costMissing ? 'Profit not trusted yet' : 'Trusted profit';
}

export function getProfitPerSellUnit(product: ProductRecord) {
  if (isThirdPartyProduct(product)) {
    return Number((product.sellingPrice * getProductCommissionRate(product)).toFixed(2));
  }
  if (isProductCostMissing(product)) {
    return 0;
  }
  return Number((product.sellingPrice - getPackageCost(product)).toFixed(2));
}

async function getSecureStore() {
  if (!secureStoreModulePromise) {
    secureStoreModulePromise = import('expo-secure-store')
      .then((module) => ({
        getItemAsync: module.getItemAsync,
        setItemAsync: module.setItemAsync,
      }))
      .catch(() => null);
  }

  return secureStoreModulePromise;
}

async function readPersistedState(): Promise<BusinessAppState> {
  if (canUseStorage()) {
    try {
      const raw = window.localStorage.getItem(BUSINESS_STORAGE_KEY);
      if (!raw) {
        const legacyRaw = window.localStorage.getItem(LEGACY_BUSINESS_STORAGE_KEY);
        if (legacyRaw && !window.localStorage.getItem(BUSINESS_STORAGE_BACKUP_KEY)) {
          window.localStorage.setItem(BUSINESS_STORAGE_BACKUP_KEY, legacyRaw);
        }
        return normalizeState(MASTER_IMPORT_STATE);
      }
      const parsed = JSON.parse(raw) as BusinessAppState;
      const normalized = normalizeState(parsed);
      if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return normalizeState(MASTER_IMPORT_STATE);
    }
  }

  try {
    const secureStore = await getSecureStore();
    if (!secureStore) return normalizeState(MASTER_IMPORT_STATE);
    const raw = await secureStore.getItemAsync(BUSINESS_STORAGE_KEY);
    if (!raw) {
      const legacyRaw = await secureStore.getItemAsync(LEGACY_BUSINESS_STORAGE_KEY);
      if (legacyRaw) {
        await secureStore.setItemAsync(BUSINESS_STORAGE_BACKUP_KEY, legacyRaw);
      }
      return normalizeState(MASTER_IMPORT_STATE);
    }
    const parsed = JSON.parse(raw) as BusinessAppState;
    const normalized = normalizeState(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      await secureStore.setItemAsync(BUSINESS_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return normalizeState(MASTER_IMPORT_STATE);
  }
}

export async function loadBusinessState(): Promise<BusinessAppState> {
  if (cachedState) {
    const automaticExpenses = applyAutomaticExpensesToState(cachedState);
    if (automaticExpenses.added.length) {
      await saveBusinessState(automaticExpenses.state);
    }
    return cachedState;
  }

  const persistedRaw = await readPersistedState();
  cachedState = persistedRaw;
  const migrated = migrateSuggestedPackagedProducts(cachedState);
  cachedState = migrated.state;
  const donnaMigration = migrateDonnaThirdPartyProducts(cachedState);
  cachedState = donnaMigration.state;
  const masterImportSalesMigration = migrateMasterImportSalesCorrections(cachedState);
  cachedState = masterImportSalesMigration.state;
  const missingMasterImportSalesMigration = migrateMissingMasterImportSales(cachedState);
  cachedState = missingMasterImportSalesMigration.state;
  const automaticExpenses = applyAutomaticExpensesToState(cachedState);
  cachedState = automaticExpenses.state;

  if (migrated.changed || donnaMigration.changed || masterImportSalesMigration.changed || missingMasterImportSalesMigration.changed || automaticExpenses.added.length) {
    if (canUseStorage()) {
      window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(cachedState));
    } else {
      const secureStore = await getSecureStore();
      if (secureStore) {
        await secureStore.setItemAsync(BUSINESS_STORAGE_KEY, JSON.stringify(cachedState));
      }
    }
  }

  return cachedState;
}

async function saveBusinessState(state: BusinessAppState) {
  cachedState = normalizeState(state);

  if (canUseStorage()) {
    window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(cachedState));
  } else {
    const secureStore = await getSecureStore();
    if (secureStore) {
      await secureStore.setItemAsync(BUSINESS_STORAGE_KEY, JSON.stringify(cachedState));
    }
  }

  dispatchStoreUpdated();
}

export function subscribeBusinessState(listener: () => void) {
  storeListeners.add(listener);

  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {
      storeListeners.delete(listener);
    };
  }

  const handle = () => listener();
  window.addEventListener(STORE_UPDATED_EVENT, handle as EventListener);
  return () => {
    storeListeners.delete(listener);
    window.removeEventListener(STORE_UPDATED_EVENT, handle as EventListener);
  };
}

function sortProducts(products: ProductRecord[]) {
  return [...products].sort((a, b) => a.name.localeCompare(b.name));
}

function isActiveProduct(product: { status?: ProductStatus | null }) {
  return product.status !== 'archived';
}

function filterActiveProducts(products: ProductRecord[]) {
  return products.filter((product) => isActiveProduct(product));
}

function sortSales(sales: SaleRecord[]) {
  return [...sales].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
}

function sortExpenses(expenses: ExpenseRecord[]) {
  return [...expenses].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
}

function sortGiveaways(giveaways: GiveawayRecord[]) {
  return [...giveaways].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
}

function sortRestocks(restocks: RestockRecord[]) {
  return [...restocks].sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
}

function sortOrders(orders: OrderRecord[]) {
  return [...orders].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function sortHelperCommissions(items: HelperCommissionRecord[]) {
  return [...items].sort((a, b) => `${b.showDate}-${b.updatedAt}`.localeCompare(`${a.showDate}-${a.updatedAt}`) || a.helperName.localeCompare(b.helperName));
}

function isActiveRow(row: { status?: RowStatus | null }) {
  return row.status !== 'voided';
}

function filterActiveSales(sales: SaleRecord[]) {
  return sales.filter((sale) => isActiveRow(sale));
}

function filterActiveExpenses(expenses: ExpenseRecord[]) {
  return expenses.filter((expense) => isActiveRow(expense));
}

function filterActiveGiveaways(giveaways: GiveawayRecord[]) {
  return giveaways.filter((giveaway) => isActiveRow(giveaway));
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getLocalDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '0');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0');
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';

  return { year, month, day, weekday };
}

function startOfLocalWeek(date = new Date()) {
  const { year, month, day, weekday } = getLocalDateParts(date);
  const dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 0;
  const localNoonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  localNoonUtc.setUTCDate(localNoonUtc.getUTCDate() - dayIndex);
  return getLocalDay(localNoonUtc);
}

function getSaleBusinessType(sale: Partial<SaleRecord>, products: ProductRecord[]): BusinessType | null {
  const matchedProduct = products.find((product) => product.productId === sale.productId);
  if (matchedProduct) {
    return matchedProduct.businessType;
  }

  if (sale.businessType === 'bakery' || sale.businessType === 'craft') {
    return sale.businessType;
  }

  return null;
}

function getSaleProductRecord(sale: Partial<SaleRecord>, products: ProductRecord[]) {
  return products.find((product) => product.productId === sale.productId) ?? null;
}

function getDerivedSaleTotalSale(sale: Partial<SaleRecord>) {
  const quantitySold = Math.max(toSafeNumber(sale.quantitySold ?? sale.quantity, 0), 0);
  const unitPrice = toSafeNumber(sale.unitPrice ?? sale.sellingPrice, 0);
  return Number((quantitySold * unitPrice).toFixed(2));
}

function getSaleTotalSale(sale: Partial<SaleRecord>) {
  const derivedTotal = getDerivedSaleTotalSale(sale);
  const explicitTotal = sale.totalSale != null && Number.isFinite(Number(sale.totalSale))
    ? Number(Number(sale.totalSale).toFixed(2))
    : sale.subtotal != null && Number.isFinite(Number(sale.subtotal))
      ? Number(Number(sale.subtotal).toFixed(2))
      : null;

  if (explicitTotal == null) {
    return derivedTotal;
  }

  const quantitySold = Math.max(toSafeNumber(sale.quantitySold ?? sale.quantity, 0), 0);
  const unitPrice = toSafeNumber(sale.unitPrice ?? sale.sellingPrice, 0);
  const looksLikeUnitPriceWasStoredAsRowTotal = quantitySold > 1 && unitPrice > 0 && Math.abs(explicitTotal - unitPrice) < 0.01;

  if (looksLikeUnitPriceWasStoredAsRowTotal) {
    return derivedTotal;
  }

  return explicitTotal;
}

function getSaleProductType(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null) {
  return matchedProduct?.productType ?? normalizeProductType((sale as Partial<SaleRecord> & { productType?: ProductType }).productType);
}

function getSaleCommissionPercent(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null) {
  const productType = getSaleProductType(sale, matchedProduct);
  if (productType !== 'third-party') {
    return 0;
  }

  return normalizeCommissionPercent(sale.commissionPercent ?? matchedProduct?.commissionPercent ?? 25, 25);
}

function getSaleCommissionEarned(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null, totalSale: number) {
  const productType = getSaleProductType(sale, matchedProduct);
  if (productType !== 'third-party') {
    return 0;
  }

  const explicitCommissionEarned = sale.commissionEarned != null && Number.isFinite(Number(sale.commissionEarned))
    ? Number(Number(sale.commissionEarned).toFixed(2))
    : null;
  if (explicitCommissionEarned != null) {
    return explicitCommissionEarned;
  }

  return Number((totalSale * (getSaleCommissionPercent(sale, matchedProduct) / 100)).toFixed(2));
}

function saleHasHelperCommission(sale: {
  helperName?: unknown,
  showEvent?: unknown,
  helperCommissionNotes?: unknown,
  helperCommissionDatePaid?: unknown,
  helperCommissionRate?: unknown,
  helperCommissionPaid?: unknown,
}) {
  return Boolean(
    normalizeOptionalText(sale.helperName)
    || normalizeOptionalText(sale.showEvent)
    || normalizeOptionalText(sale.helperCommissionNotes)
    || normalizeOptionalText(sale.helperCommissionDatePaid)
    || toSafeNumber(sale.helperCommissionRate) > 0
    || sale.helperCommissionPaid,
  );
}

function getSaleHelperCommissionValue(sale: { helperCommissionRate?: unknown }) {
  return Number(Math.max(0, toSafeNumber(sale.helperCommissionRate, 0)).toFixed(2));
}

function getSaleHelperCommissionRate(sale: { helperCommissionRate?: unknown, helperCommissionType?: unknown }) {
  const value = getSaleHelperCommissionValue(sale);
  return normalizeHelperCommissionType(sale.helperCommissionType) === 'percentage'
    ? Number(Math.min(100, value).toFixed(2))
    : value;
}

function getSaleHelperCommissionAmount(sale: {
  helperName?: unknown,
  showEvent?: unknown,
  helperCommissionNotes?: unknown,
  helperCommissionDatePaid?: unknown,
  helperCommissionRate?: unknown,
  helperCommissionType?: unknown,
  helperCommissionPaid?: unknown,
}, totalSale: number) {
  if (!saleHasHelperCommission(sale)) {
    return 0;
  }

  if (normalizeHelperCommissionType(sale.helperCommissionType) === 'flat') {
    return getSaleHelperCommissionValue(sale);
  }

  return Number((totalSale * (getSaleHelperCommissionRate(sale) / 100)).toFixed(2));
}

function getSaleVendorShare(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null, totalSale: number) {
  const productType = getSaleProductType(sale, matchedProduct);
  if (productType !== 'third-party') {
    return 0;
  }

  const explicitVendorShare = sale.vendorShare != null && Number.isFinite(Number(sale.vendorShare))
    ? Number(Number(sale.vendorShare).toFixed(2))
    : null;
  if (explicitVendorShare != null) {
    return explicitVendorShare;
  }

  return Number((totalSale - getSaleCommissionEarned(sale, matchedProduct, totalSale)).toFixed(2));
}

function getSaleProfit(sale: Partial<SaleRecord>, matchedProduct: ProductRecord | null, totalSale: number, options?: { forceDerived?: boolean }) {
  if (getSaleProductType(sale, matchedProduct) === 'third-party') {
    return getSaleCommissionEarned(sale, matchedProduct, totalSale);
  }

  const explicitProfit = sale.profit != null && Number.isFinite(Number(sale.profit))
    ? Number(Number(sale.profit).toFixed(2))
    : sale.estimatedProfit != null && Number.isFinite(Number(sale.estimatedProfit))
      ? Number(Number(sale.estimatedProfit).toFixed(2))
      : null;

  const quantitySold = Math.max(toSafeNumber(sale.quantitySold ?? sale.quantity, 0), 0);
  const explicitSaleCost = toSafeNumber(sale.costPerItem, 0);
  const costPerItem = explicitSaleCost > 0 ? explicitSaleCost : matchedProduct ? getCostPerItem(matchedProduct) : 0;
  if (costPerItem <= 0) {
    return 0;
  }
  const derivedProfit = Number((totalSale - (quantitySold * costPerItem)).toFixed(2));
  const derivedProfitFromExplicitSaleCost = Number((totalSale - (quantitySold * explicitSaleCost)).toFixed(2));

  if (explicitProfit == null || options?.forceDerived) {
    return derivedProfit;
  }

  const derivedUnitProfitFromMatchedProduct = Number((toSafeNumber(sale.unitPrice ?? sale.sellingPrice, 0) - costPerItem).toFixed(2));
  const derivedUnitProfitFromExplicitSaleCost = Number((toSafeNumber(sale.unitPrice ?? sale.sellingPrice, 0) - explicitSaleCost).toFixed(2));
  const looksLikeSellUnitProfitWasStoredAsRowProfit = quantitySold > 1 && explicitSaleCost > 0 && Math.abs(explicitProfit - derivedUnitProfitFromExplicitSaleCost) < 0.01;
  const looksLikeUnitProfitWasStoredAsRowProfit = quantitySold > 1 && Math.abs(explicitProfit - derivedUnitProfitFromMatchedProduct) < 0.01;

  if (looksLikeSellUnitProfitWasStoredAsRowProfit) {
    return derivedProfitFromExplicitSaleCost;
  }

  if (looksLikeUnitProfitWasStoredAsRowProfit) {
    return derivedProfit;
  }

  return explicitProfit;
}

function getMonthKey(date: string) {
  return String(date).slice(0, 7);
}

function parseDateParts(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-').map((part) => Number(part));
  return { year, month, day };
}

function addDays(date: string, days: number) {
  const { year, month, day } = parseDateParts(date);
  const value = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10) as ISODate;
}

function getUtcWeekday(date: string) {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

function getNextSaturdayOnOrAfter(date: string) {
  const daysUntilSaturday = (6 - getUtcWeekday(date) + 7) % 7;
  return addDays(date, daysUntilSaturday);
}

type AutomaticExpenseDraft = {
  date: ISODate;
  month: string;
  expenseType: ExpenseType;
  expenseCategory: string;
  vendor: string;
  businessType: BusinessType;
  businessLine: BusinessType;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

function buildAutomaticExpenseDrafts(currentDate = getLocalDay()): AutomaticExpenseDraft[] {
  const today = currentDate.slice(0, 10) as ISODate;
  const currentMonth = getMonthKey(today);
  const firstOfMonth = `${currentMonth}-01` as ISODate;
  const timestamp = nowIso();
  const monthlyDrafts = today >= firstOfMonth
    ? AUTOMATIC_MONTHLY_EXPENSES.map((expense) => ({
      date: firstOfMonth,
      month: currentMonth,
      expenseType: 'expense' as const,
      expenseCategory: expense.category,
      vendor: expense.vendor,
      businessType: expense.businessType,
      businessLine: expense.businessType,
      amount: expense.amount,
      note: `Automatic monthly expense: ${expense.name}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
    : [];

  const marketDrafts: AutomaticExpenseDraft[] = [];
  if (today <= HARTLAND_FARM_MARKET_FEE_END_DATE) {
    for (let date = getNextSaturdayOnOrAfter(today); date <= HARTLAND_FARM_MARKET_FEE_END_DATE; date = addDays(date, 7)) {
      marketDrafts.push({
        date,
        month: getMonthKey(date),
        expenseType: 'expense',
        expenseCategory: HARTLAND_FARM_MARKET_FEE_CATEGORY,
        vendor: HARTLAND_FARM_MARKET_FEE_VENDOR,
        businessType: 'bakery',
        businessLine: 'bakery',
        amount: HARTLAND_FARM_MARKET_FEE_AMOUNT,
        note: `Automatic Hartland Farm Market Fee for ${date}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return [...monthlyDrafts, ...marketDrafts];
}

function automaticExpenseExists(expenses: ExpenseRecord[], draft: AutomaticExpenseDraft) {
  return expenses.some((expense) => (
    expense.date === draft.date
    && expense.expenseType === draft.expenseType
    && expense.expenseCategory === draft.expenseCategory
    && expense.vendor === draft.vendor
    && Number(expense.amount.toFixed(2)) === Number(draft.amount.toFixed(2))
    && (expense.note === draft.note || expense.notes === draft.note)
  ));
}

export function applyAutomaticExpensesToState(state: BusinessAppState, currentDate = getLocalDay()) {
  const normalizedExpenses = getNormalizedExpenses(state);
  const additions = buildAutomaticExpenseDrafts(currentDate)
    .filter((draft) => !automaticExpenseExists(normalizedExpenses, draft))
    .map((draft) => normalizeExpenseRecord(draft));

  return {
    state: additions.length ? { ...state, expenses: sortExpenses([...state.expenses, ...additions]) } : state,
    added: additions,
  };
}

function normalizeSaleRecord(sale: Partial<SaleRecord>, products: ProductRecord[]): SaleRecord {
  const matchedProduct = getSaleProductRecord(sale, products);
  const resolvedDate = String(sale.date ?? getLocalDay()) as ISODate;
  const businessLine = matchedProduct?.businessLine ?? matchedProduct?.businessType ?? getSaleBusinessType(sale, products) ?? 'bakery';
  const productType = getSaleProductType(sale, matchedProduct);
  const itemName = matchedProduct?.name ?? String(sale.itemName ?? sale.productName ?? '');
  const category = matchedProduct?.category ?? String(sale.category ?? '');
  const { unitPrice, priceRuleApplied } = getEffectiveSaleUnitPrice(sale, matchedProduct, resolvedDate);
  const saleWithEffectivePrice = { ...sale, unitPrice, sellingPrice: unitPrice };
  const totalSale = priceRuleApplied ? getDerivedSaleTotalSale(saleWithEffectivePrice) : getSaleTotalSale(saleWithEffectivePrice);
  const commissionPercent = getSaleCommissionPercent(sale, matchedProduct);
  const explicitSaleCost = toSafeNumber(sale.costPerItem);
  const costPerItem = productType === 'third-party' ? 0 : explicitSaleCost > 0 ? explicitSaleCost : matchedProduct ? getCostPerItem(matchedProduct) : 0;
  const profit = getSaleProfit(saleWithEffectivePrice, matchedProduct, totalSale, { forceDerived: priceRuleApplied });
  const commissionEarned = getSaleCommissionEarned(saleWithEffectivePrice, matchedProduct, totalSale);
  const vendorShare = getSaleVendorShare(saleWithEffectivePrice, matchedProduct, totalSale);
  const helperCommissionAmount = getSaleHelperCommissionAmount(saleWithEffectivePrice, totalSale);
  const costMissing = productType === 'third-party' ? false : costPerItem <= 0;
  const notes = typeof sale.notes === 'string' && sale.notes.trim() ? sale.notes.trim() : typeof sale.note === 'string' && sale.note.trim() ? sale.note.trim() : null;
  return {
    saleId: String(sale.saleId ?? createId('sale')),
    businessType: businessLine,
    businessLine,
    productType,
    productId: String(sale.productId ?? ''),
    productName: itemName,
    vendorName: normalizeVendorName(sale.vendorName ?? matchedProduct?.vendorName ?? null),
    commissionPercent,
    month: String(sale.month ?? getMonthKey(resolvedDate)),
    itemName,
    sellUnitType: typeof sale.sellUnitType === 'string' ? normalizeSellUnitType(sale.sellUnitType) : matchedProduct?.sellUnitType ?? 'each',
    customUnitName: typeof sale.customUnitName === 'string' && sale.customUnitName.trim() ? sale.customUnitName.trim() : matchedProduct?.customUnitName ?? null,
    packSize: sale.packSize != null ? Math.max(1, toSafeNumber(sale.packSize, 1)) : matchedProduct ? getProductPackSize(matchedProduct) : 1,
    quantitySold: toSafeNumber(sale.quantitySold),
    quantity: toSafeNumber(sale.quantity ?? sale.quantitySold),
    sellingPrice: unitPrice,
    unitPrice,
    date: resolvedDate,
    note: notes,
    notes,
    totalSale,
    subtotal: totalSale,
    category,
    costPerItem,
    costMissing,
    commissionEarned,
    vendorShare,
    helperName: saleHasHelperCommission(sale) ? normalizeOptionalText(sale.helperName) : null,
    showEvent: saleHasHelperCommission(sale) ? normalizeOptionalText(sale.showEvent) : null,
    helperCommissionType: normalizeHelperCommissionType(sale.helperCommissionType),
    helperCommissionRate: saleHasHelperCommission(sale) ? getSaleHelperCommissionRate(sale) : 0,
    helperCommissionAmount,
    helperCommissionPaid: saleHasHelperCommission(sale) ? Boolean(sale.helperCommissionPaid) : false,
    helperCommissionDatePaid: saleHasHelperCommission(sale) ? normalizeOptionalText(sale.helperCommissionDatePaid) : null,
    helperCommissionNotes: saleHasHelperCommission(sale) ? normalizeOptionalText(sale.helperCommissionNotes) : null,
    estimatedProfit: profit,
    profit,
    paymentMethod: normalizePaymentType(sale.paymentMethod),
    customerName: normalizeOptionalText(sale.customerName),
    status: sale.status === 'voided' ? 'voided' : 'active',
    voidedAt: sale.status === 'voided' ? String(sale.voidedAt ?? sale.updatedAt ?? nowIso()) : null,
    voidedBy: sale.status === 'voided' ? normalizeOptionalText(sale.voidedBy) : null,
    voidReason: sale.status === 'voided' ? normalizeOptionalText(sale.voidReason) : null,
    voidedQuantity: sale.status === 'voided' ? toSafeNumber(sale.voidedQuantity ?? sale.quantitySold) : null,
    originalSaleId: normalizeOptionalText(sale.originalSaleId),
    createdAt: String(sale.createdAt ?? nowIso()),
    updatedAt: String(sale.updatedAt ?? sale.createdAt ?? nowIso()),
  };
}

function normalizeExpenseRecord(expense: Partial<ExpenseRecord>): ExpenseRecord {
  const resolvedDate = String(expense.date ?? getLocalDay()) as ISODate;
  const businessLine = expense.businessLine === 'craft' ? 'craft' : expense.businessType === 'craft' ? 'craft' : 'bakery';
  const expenseType = normalizeExpenseType((expense as Partial<ExpenseRecord> & { expenseType?: ExpenseType }).expenseType);
  const notes = typeof expense.notes === 'string' && expense.notes.trim() ? expense.notes.trim() : typeof expense.note === 'string' && expense.note.trim() ? expense.note.trim() : null;

  return {
    expenseId: String(expense.expenseId ?? createId('expense')),
    date: resolvedDate,
    month: String(expense.month ?? getMonthKey(resolvedDate)),
    expenseType,
    expenseCategory: expenseType === 'vendor-payment' ? 'Vendor Payment' : String(expense.expenseCategory ?? '').trim(),
    vendor: String(expense.vendor ?? '').trim(),
    businessType: businessLine,
    businessLine,
    amount: Number(toSafeNumber(expense.amount).toFixed(2)),
    note: notes,
    notes,
    status: expense.status === 'voided' ? 'voided' : 'active',
    voidedAt: expense.status === 'voided' ? String(expense.voidedAt ?? expense.updatedAt ?? nowIso()) : null,
    createdAt: String(expense.createdAt ?? nowIso()),
    updatedAt: String(expense.updatedAt ?? nowIso()),
  };
}

function normalizeGiveawayRecord(giveaway: Partial<GiveawayRecord>, products: ProductRecord[]): GiveawayRecord {
  const matchedProduct = products.find((product) => product.productId === giveaway.productId) ?? null;
  const resolvedDate = String(giveaway.date ?? getLocalDay()) as ISODate;
  const businessLine = matchedProduct?.businessLine ?? matchedProduct?.businessType ?? (giveaway.businessLine === 'craft' ? 'craft' : giveaway.businessType === 'craft' ? 'craft' : 'bakery');
  const quantityGivenAway = toSafeNumber(giveaway.quantityGivenAway ?? giveaway.quantity);
  const shouldApplyWristKeyFobValue = isWristKeyFobSale({
    businessType: businessLine,
    businessLine,
    productName: giveaway.productName,
    itemName: giveaway.productName,
  }, matchedProduct);
  const estimatedSaleValue = shouldApplyWristKeyFobValue
    ? Number((quantityGivenAway * WRIST_KEY_FOB_PRICE).toFixed(2))
    : giveaway.estimatedSaleValue != null
    ? Number(toSafeNumber(giveaway.estimatedSaleValue).toFixed(2))
    : matchedProduct
      ? Number((quantityGivenAway * matchedProduct.sellingPrice).toFixed(2))
      : 0;
  const estimatedCost = giveaway.estimatedCost != null
    ? Number(toSafeNumber(giveaway.estimatedCost).toFixed(2))
    : matchedProduct
      ? Number((quantityGivenAway * getPackageCost(matchedProduct)).toFixed(2))
      : 0;
  const notes = typeof giveaway.notes === 'string' && giveaway.notes.trim()
    ? giveaway.notes.trim()
    : typeof giveaway.note === 'string' && giveaway.note.trim()
      ? giveaway.note.trim()
      : typeof giveaway.reason === 'string' && giveaway.reason.trim()
        ? giveaway.reason.trim()
        : null;

  return {
    giveawayId: String(giveaway.giveawayId ?? createId('giveaway')),
    date: resolvedDate,
    month: String(giveaway.month ?? getMonthKey(resolvedDate)),
    productId: String(giveaway.productId ?? matchedProduct?.productId ?? ''),
    productName: String(giveaway.productName ?? matchedProduct?.name ?? '').trim(),
    businessType: businessLine,
    businessLine,
    category: String(giveaway.category ?? matchedProduct?.category ?? '').trim(),
    sellUnitType: matchedProduct?.sellUnitType ?? normalizeSellUnitType(giveaway.sellUnitType),
    customUnitName: matchedProduct?.customUnitName ?? (typeof giveaway.customUnitName === 'string' && giveaway.customUnitName.trim() ? giveaway.customUnitName.trim() : null),
    packSize: matchedProduct ? getProductPackSize(matchedProduct) : toSafeNumber(giveaway.packSize, 1),
    quantityGivenAway,
    quantity: quantityGivenAway,
    estimatedSaleValue,
    estimatedCost,
    reason: notes,
    note: notes,
    notes,
    status: giveaway.status === 'voided' ? 'voided' : 'active',
    voidedAt: giveaway.status === 'voided' ? String(giveaway.voidedAt ?? giveaway.updatedAt ?? nowIso()) : null,
    createdAt: String(giveaway.createdAt ?? nowIso()),
    updatedAt: String(giveaway.updatedAt ?? nowIso()),
  };
}

function normalizeRestockRecord(restock: Partial<RestockRecord>, products: ProductRecord[]): RestockRecord {
  const matchedProduct = products.find((product) => product.productId === restock.productId) ?? null;
  const resolvedDate = String(restock.date ?? getLocalDay()) as ISODate;
  const businessLine = matchedProduct?.businessLine ?? matchedProduct?.businessType ?? (restock.businessLine === 'craft' ? 'craft' : restock.businessType === 'craft' ? 'craft' : 'bakery');
  const notes = typeof restock.notes === 'string' && restock.notes.trim() ? restock.notes.trim() : typeof restock.note === 'string' && restock.note.trim() ? restock.note.trim() : null;

  return {
    restockId: String(restock.restockId ?? createId('restock')),
    productId: String(restock.productId ?? matchedProduct?.productId ?? ''),
    productName: String(restock.productName ?? matchedProduct?.name ?? '').trim(),
    businessType: businessLine,
    businessLine,
    category: String(restock.category ?? matchedProduct?.category ?? '').trim(),
    quantityAdded: toSafeNumber(restock.quantityAdded),
    quantityBefore: toSafeNumber(restock.quantityBefore),
    quantityAfter: toSafeNumber(restock.quantityAfter),
    date: resolvedDate,
    month: String(restock.month ?? getMonthKey(resolvedDate)),
    note: notes,
    notes,
    createdAt: String(restock.createdAt ?? nowIso()),
    updatedAt: String(restock.updatedAt ?? nowIso()),
  };
}

function getNormalizedSales(state: BusinessAppState) {
  return state.sales.map((sale) => normalizeSaleRecord(sale, state.products));
}

function getNormalizedExpenses(state: BusinessAppState) {
  return state.expenses.map((expense) => normalizeExpenseRecord(expense));
}

function getNormalizedGiveaways(state: BusinessAppState) {
  return state.giveaways.map((giveaway) => normalizeGiveawayRecord(giveaway, state.products));
}

function getNormalizedRestocks(state: BusinessAppState) {
  return state.restocks.map((restock) => normalizeRestockRecord(restock, state.products));
}

export function getCostPerItem(product: ProductRecord) {
  return Number(product.cost.toFixed(6));
}

export async function listProducts(businessType?: BusinessType, options?: { includeArchived?: boolean }) {
  const state = await loadBusinessState();
  const baseItems = options?.includeArchived ? state.products : filterActiveProducts(state.products);
  const items = businessType ? baseItems.filter((item) => item.businessType === businessType) : baseItems;
  return sortProducts(items);
}

export async function listSales(businessType?: BusinessType) {
  const state = await loadBusinessState();
  const activeSales = filterActiveSales(state.sales);
  const items = businessType ? activeSales.filter((item) => item.businessType === businessType) : activeSales;
  return sortSales(items);
}

export async function listExpenses(businessType?: BusinessType) {
  const state = await loadBusinessState();
  const activeExpenses = filterActiveExpenses(state.expenses);
  const items = businessType ? activeExpenses.filter((item) => item.businessType === businessType) : activeExpenses;
  return sortExpenses(items);
}

export async function listGiveaways(businessType?: BusinessType) {
  const state = await loadBusinessState();
  const activeGiveaways = filterActiveGiveaways(state.giveaways);
  const items = businessType ? activeGiveaways.filter((item) => item.businessType === businessType) : activeGiveaways;
  return sortGiveaways(items);
}

export async function listRestocks(businessType?: BusinessType) {
  const state = await loadBusinessState();
  const items = businessType ? state.restocks.filter((item) => item.businessType === businessType) : state.restocks;
  return sortRestocks(items);
}

export async function getProductById(productId: string) {
  const state = await loadBusinessState();
  return state.products.find((item) => item.productId === productId) ?? null;
}

export async function getSaleById(saleId: string) {
  const state = await loadBusinessState();
  return state.sales.find((item) => item.saleId === saleId) ?? null;
}

export async function getExpenseById(expenseId: string) {
  const state = await loadBusinessState();
  return state.expenses.find((item) => item.expenseId === expenseId) ?? null;
}

export async function getGiveawayById(giveawayId: string) {
  const state = await loadBusinessState();
  return state.giveaways.find((item) => item.giveawayId === giveawayId) ?? null;
}

export async function listHelperCommissions() {
  const state = await loadBusinessState();
  return sortHelperCommissions(state.helperCommissions);
}

export async function getHelperCommissionById(helperCommissionId: string) {
  const state = await loadBusinessState();
  return state.helperCommissions.find((item) => item.helperCommissionId === helperCommissionId) ?? null;
}

function buildHelperCommissionExpense(record: HelperCommissionRecord, existing?: Partial<ExpenseRecord> | null): ExpenseRecord {
  const payoutDate = record.paid && record.datePaid ? record.datePaid as ISODate : record.showDate;
  const paymentDetail = record.paymentDescription ? ` · ${record.paymentDescription}` : '';
  const note = `${record.helperName} · ${record.showName} · ${record.paymentMethod}${paymentDetail}${record.notes ? ` · ${record.notes}` : ''}`;

  return normalizeExpenseRecord({
    expenseId: existing?.expenseId ?? record.linkedExpenseId ?? createId('expense'),
    date: payoutDate,
    month: getMonthKey(payoutDate),
    expenseType: 'expense',
    expenseCategory: 'Helper Commission',
    vendor: record.helperName,
    businessType: record.businessType,
    businessLine: record.businessType,
    amount: record.commissionAmount,
    note,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    status: existing?.status,
    voidedAt: existing?.voidedAt,
  });
}

export async function listOrders(status?: OrderStatus | 'open') {
  const state = await loadBusinessState();
  const items = status === 'open'
    ? state.orders.filter((item) => item.status !== 'picked up' && item.status !== 'paid')
    : status
      ? state.orders.filter((item) => item.status === status)
      : state.orders;
  return sortOrders(items);
}

export async function addProduct(input: {
  businessType: BusinessType;
  businessLine?: BusinessType;
  productType?: ProductType;
  name: string;
  category: string;
  cost: number;
  sellingPrice: number;
  vendorName?: string | null;
  commissionPercent?: number | null;
  sellUnitType?: SellUnitType;
  customUnitName?: string | null;
  packSize?: number | null;
  startingInventory: number;
  reorderLevel: number;
  notes?: string | null;
  batchSize?: number | null;
  batchCost?: number | null;
}) {
  const state = await loadBusinessState();
  const timestamp = nowIso();
  const product: ProductRecord = {
    productId: createId('product'),
    businessType: input.businessType,
    businessLine: input.businessLine ?? input.businessType,
    productType: input.productType ?? 'my-product',
    name: input.name.trim(),
    category: input.category.trim(),
    cost: Number(((input.productType ?? 'my-product') === 'third-party' ? 0 : input.cost).toFixed(2)),
    sellingPrice: Number(input.sellingPrice.toFixed(2)),
    vendorName: normalizeVendorName(input.vendorName ?? null),
    commissionPercent: (input.productType ?? 'my-product') === 'third-party' ? normalizeCommissionPercent(input.commissionPercent ?? 25, 25) : 0,
    sellUnitType: input.sellUnitType ?? 'each',
    customUnitName: input.customUnitName?.trim() ? input.customUnitName.trim() : null,
    packSize: (input.sellUnitType ?? 'each') === 'pack' ? Math.max(1, input.packSize ?? 1) : 1,
    startingInventory: input.startingInventory,
    reorderLevel: input.reorderLevel,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    batchSize: input.batchSize ?? null,
    batchCost: input.batchCost ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.products.push(product);
  await saveBusinessState({ ...state, products: sortProducts(state.products) });
  return product;
}

export async function updateProduct(productId: string, input: {
  businessType: BusinessType;
  businessLine?: BusinessType;
  productType?: ProductType;
  name: string;
  category: string;
  cost: number;
  sellingPrice: number;
  vendorName?: string | null;
  commissionPercent?: number | null;
  sellUnitType?: SellUnitType;
  customUnitName?: string | null;
  packSize?: number | null;
  startingInventory: number;
  reorderLevel: number;
  notes?: string | null;
  batchSize?: number | null;
  batchCost?: number | null;
}) {
  const state = await loadBusinessState();
  const existing = state.products.find((item) => item.productId === productId);
  if (!existing) {
    throw new Error('Product not found.');
  }

  const updatedProduct = normalizeProductRecord({
    ...existing,
    ...input,
    productId: existing.productId,
    businessLine: input.businessLine ?? input.businessType,
    commissionPercent: input.commissionPercent ?? existing.commissionPercent,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });

  const nextState = {
    ...state,
    products: sortProducts(state.products.map((item) => item.productId === productId ? updatedProduct : item)),
  };

  await saveBusinessState(nextState);
  return updatedProduct;
}

export async function productHasSavedHistory(productId: string) {
  const state = await loadBusinessState();
  return state.sales.some((item) => item.productId === productId)
    || state.giveaways.some((item) => item.productId === productId)
    || state.restocks.some((item) => item.productId === productId);
}

export async function archiveProduct(productId: string) {
  const state = await loadBusinessState();
  const existing = state.products.find((item) => item.productId === productId);
  if (!existing) {
    throw new Error('Product not found.');
  }

  const updatedProduct = normalizeProductRecord({
    ...existing,
    status: 'archived',
    archivedAt: nowIso(),
    updatedAt: nowIso(),
  });

  await saveBusinessState({
    ...state,
    products: sortProducts(state.products.map((item) => item.productId === productId ? updatedProduct : item)),
  });

  return updatedProduct;
}

export async function restoreProduct(productId: string) {
  const state = await loadBusinessState();
  const existing = state.products.find((item) => item.productId === productId);
  if (!existing) {
    throw new Error('Product not found.');
  }

  const updatedProduct = normalizeProductRecord({
    ...existing,
    status: 'active',
    archivedAt: null,
    updatedAt: nowIso(),
  });

  await saveBusinessState({
    ...state,
    products: sortProducts(state.products.map((item) => item.productId === productId ? updatedProduct : item)),
  });

  return updatedProduct;
}

export async function deleteProduct(productId: string) {
  const state = await loadBusinessState();
  const existing = state.products.find((item) => item.productId === productId);
  if (!existing) {
    throw new Error('Product not found.');
  }

  const hasHistory = state.sales.some((item) => item.productId === productId)
    || state.giveaways.some((item) => item.productId === productId)
    || state.restocks.some((item) => item.productId === productId);

  if (hasHistory) {
    throw new Error('Product has saved history, archive it instead of deleting it.');
  }

  await saveBusinessState({
    ...state,
    products: state.products.filter((item) => item.productId !== productId),
  });

  return existing;
}

export async function addHelperCommission(input: {
  businessType: BusinessType;
  helperName: string;
  showName: string;
  showDate: ISODate;
  totalShowSales: number;
  commissionType?: HelperCommissionType;
  commissionRate: number;
  paymentMethod?: HelperPaymentMethod;
  paymentDescription?: string | null;
  paymentValue?: number;
  paid?: boolean;
  datePaid?: string | null;
  notes?: string | null;
}) {
  if (!input.helperName.trim()) {
    throw new Error('Helper name is required.');
  }
  if (!input.showName.trim()) {
    throw new Error('Show / market name is required.');
  }

  const state = await loadBusinessState();
  const draftRecord = normalizeHelperCommissionRecord({
    helperCommissionId: createId('helper-commission'),
    businessType: input.businessType,
    helperName: input.helperName,
    showName: input.showName,
    showDate: input.showDate,
    totalShowSales: input.totalShowSales,
    commissionType: input.commissionType,
    commissionRate: input.commissionRate,
    paymentMethod: input.paymentMethod,
    paymentDescription: input.paymentDescription,
    paymentValue: input.paymentValue,
    paid: input.paid,
    datePaid: input.paid ? input.datePaid : null,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  const expense = buildHelperCommissionExpense(draftRecord);
  const record = normalizeHelperCommissionRecord({ ...draftRecord, linkedExpenseId: expense.expenseId });

  state.expenses.push(expense);
  state.helperCommissions.push(record);
  await saveBusinessState({ ...state, expenses: sortExpenses(state.expenses), helperCommissions: sortHelperCommissions(state.helperCommissions) });
  return record;
}

export async function updateHelperCommission(helperCommissionId: string, input: {
  businessType: BusinessType;
  helperName: string;
  showName: string;
  showDate: ISODate;
  totalShowSales: number;
  commissionType?: HelperCommissionType;
  commissionRate: number;
  paymentMethod?: HelperPaymentMethod;
  paymentDescription?: string | null;
  paymentValue?: number;
  paid?: boolean;
  datePaid?: string | null;
  notes?: string | null;
}) {
  const state = await loadBusinessState();
  const existing = state.helperCommissions.find((item) => item.helperCommissionId === helperCommissionId);
  if (!existing) {
    throw new Error('Helper commission record not found.');
  }

  const updated = normalizeHelperCommissionRecord({
    ...existing,
    helperCommissionId,
    businessType: input.businessType,
    helperName: input.helperName,
    showName: input.showName,
    showDate: input.showDate,
    totalShowSales: input.totalShowSales,
    commissionType: input.commissionType,
    commissionRate: input.commissionRate,
    paymentMethod: input.paymentMethod,
    paymentDescription: input.paymentDescription,
    paymentValue: input.paymentValue,
    paid: input.paid,
    datePaid: input.paid ? input.datePaid : null,
    notes: input.notes,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });
  const existingExpense = existing.linkedExpenseId
    ? state.expenses.find((item) => item.expenseId === existing.linkedExpenseId) ?? null
    : null;
  const syncedExpense = buildHelperCommissionExpense(updated, existingExpense);
  const normalizedUpdated = normalizeHelperCommissionRecord({ ...updated, linkedExpenseId: syncedExpense.expenseId });

  const nextExpenses = existingExpense
    ? state.expenses.map((item) => item.expenseId === syncedExpense.expenseId ? syncedExpense : item)
    : [...state.expenses, syncedExpense];

  await saveBusinessState({
    ...state,
    expenses: sortExpenses(nextExpenses),
    helperCommissions: sortHelperCommissions(state.helperCommissions.map((item) => item.helperCommissionId === helperCommissionId ? normalizedUpdated : item)),
  });
  return normalizedUpdated;
}

export async function addSale(input: {
  productId?: string | null;
  quantitySold: number;
  date: ISODate;
  sellingPrice?: number | null;
  note?: string | null;
  businessType?: BusinessType;
  businessLine?: BusinessType;
  productType?: ProductType;
  productName?: string;
  itemName?: string;
  category?: string;
  vendorName?: string | null;
  commissionPercent?: number | null;
  sellUnitType?: SellUnitType;
  customUnitName?: string | null;
  packSize?: number | null;
  costPerItem?: number | null;
  helperName?: string | null;
  showEvent?: string | null;
  helperCommissionType?: HelperCommissionType;
  helperCommissionRate?: number | null;
  helperCommissionPaid?: boolean;
  helperCommissionDatePaid?: string | null;
  helperCommissionNotes?: string | null;
  paymentMethod?: PaymentType;
  customerName?: string | null;
}) {
  const state = await loadBusinessState();
  const product = input.productId ? state.products.find((item) => item.productId === input.productId) : null;
  if (input.productId && !product) {
    throw new Error('Choose a product first.');
  }
  if (product && !isActiveProduct(product)) {
    throw new Error('That product is archived. Restore it first if you want to use it for a new sale.');
  }

  if (!product && !String(input.productName ?? input.itemName ?? '').trim()) {
    throw new Error('Type a product name first.');
  }

  if (!product && !input.businessType) {
    throw new Error('Choose a business line first.');
  }

  if (!product && (input.productType ?? 'my-product') === 'my-product' && !(toSafeNumber(input.costPerItem) > 0)) {
    throw new Error('Cost per sell unit is required for manual My Product sales.');
  }

  const salePrice = input.sellingPrice != null ? input.sellingPrice : product ? getEffectiveProductSellingPrice(product, input.date) : 0;
  const totalSale = Number((input.quantitySold * salePrice).toFixed(2));

  if (product) {
    const estimatedProfit = isProductCostMissing(product) ? 0 : Number((totalSale - (input.quantitySold * getPackageCost(product))).toFixed(2));

    const sale: SaleRecord = {
      saleId: createId('sale'),
      businessType: product.businessType,
      businessLine: product.businessLine ?? product.businessType,
      productType: product.productType,
      productId: product.productId,
      productName: product.name,
      vendorName: product.vendorName,
      commissionPercent: product.productType === 'third-party' ? normalizeCommissionPercent(product.commissionPercent, 25) : 0,
      month: getMonthKey(input.date),
      itemName: product.name,
      sellUnitType: product.sellUnitType,
      customUnitName: product.customUnitName,
      packSize: product.packSize,
      quantitySold: input.quantitySold,
      quantity: input.quantitySold,
      sellingPrice: salePrice,
      unitPrice: salePrice,
      date: input.date,
      note: input.note?.trim() ? input.note.trim() : null,
      notes: input.note?.trim() ? input.note.trim() : null,
      totalSale,
      subtotal: totalSale,
      category: product.category,
      costPerItem: product.productType === 'third-party' ? 0 : getCostPerItem(product),
      costMissing: product.productType === 'third-party' ? false : isProductCostMissing(product),
      commissionEarned: product.productType === 'third-party' ? Number((totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100)).toFixed(2)) : 0,
      vendorShare: product.productType === 'third-party' ? Number((totalSale - (totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100))).toFixed(2)) : 0,
      helperName: normalizeOptionalText(input.helperName),
      showEvent: normalizeOptionalText(input.showEvent),
      helperCommissionType: normalizeHelperCommissionType(input.helperCommissionType),
      helperCommissionRate: getSaleHelperCommissionRate(input),
      helperCommissionAmount: getSaleHelperCommissionAmount(input, totalSale),
      helperCommissionPaid: Boolean(input.helperCommissionPaid),
      helperCommissionDatePaid: normalizeOptionalText(input.helperCommissionDatePaid),
      helperCommissionNotes: normalizeOptionalText(input.helperCommissionNotes),
      estimatedProfit: product.productType === 'third-party' ? Number((totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100)).toFixed(2)) : estimatedProfit,
      profit: product.productType === 'third-party' ? Number((totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100)).toFixed(2)) : estimatedProfit,
      paymentMethod: normalizePaymentType(input.paymentMethod),
      customerName: normalizeOptionalText(input.customerName),
      createdAt: nowIso(),
    };

    state.sales.push(sale);
    await saveBusinessState({ ...state, sales: sortSales(state.sales) });
    return sale;
  }

  const manualSale = normalizeSaleRecord({
    saleId: createId('sale'),
    businessType: input.businessLine ?? input.businessType,
    businessLine: input.businessLine ?? input.businessType,
    productType: input.productType ?? 'my-product',
    productId: String(input.productId ?? `manual-${Date.now()}`),
    productName: String(input.productName ?? input.itemName ?? '').trim(),
    itemName: String(input.itemName ?? input.productName ?? '').trim(),
    vendorName: input.vendorName ?? null,
    commissionPercent: (input.productType ?? 'my-product') === 'third-party' ? normalizeCommissionPercent(input.commissionPercent ?? 25, 25) : 0,
    month: getMonthKey(input.date),
    sellUnitType: input.sellUnitType ?? 'each',
    customUnitName: input.customUnitName ?? null,
    packSize: input.packSize ?? 1,
    quantitySold: input.quantitySold,
    quantity: input.quantitySold,
    sellingPrice: salePrice,
    unitPrice: salePrice,
    date: input.date,
    note: input.note?.trim() ? input.note.trim() : null,
    notes: input.note?.trim() ? input.note.trim() : null,
    totalSale,
    subtotal: totalSale,
    category: String(input.category ?? '').trim(),
    costPerItem: input.costPerItem ?? 0,
    helperName: input.helperName,
    showEvent: input.showEvent,
    helperCommissionType: input.helperCommissionType,
    helperCommissionRate: input.helperCommissionRate ?? undefined,
    helperCommissionPaid: input.helperCommissionPaid,
    helperCommissionDatePaid: input.helperCommissionDatePaid,
    helperCommissionNotes: input.helperCommissionNotes,
    paymentMethod: input.paymentMethod,
    customerName: input.customerName,
    createdAt: nowIso(),
  }, state.products);

  state.sales.push(manualSale);
  await saveBusinessState({ ...state, sales: sortSales(state.sales) });
  return manualSale;
}

export async function updateSale(saleId: string, input: {
  productId?: string | null;
  quantitySold: number;
  date: ISODate;
  sellingPrice?: number | null;
  note?: string | null;
  businessType?: BusinessType;
  businessLine?: BusinessType;
  productType?: ProductType;
  productName?: string;
  itemName?: string;
  category?: string;
  vendorName?: string | null;
  commissionPercent?: number | null;
  sellUnitType?: SellUnitType;
  customUnitName?: string | null;
  packSize?: number | null;
  costPerItem?: number | null;
  helperName?: string | null;
  showEvent?: string | null;
  helperCommissionType?: HelperCommissionType;
  helperCommissionRate?: number | null;
  helperCommissionPaid?: boolean;
  helperCommissionDatePaid?: string | null;
  helperCommissionNotes?: string | null;
  paymentMethod?: PaymentType;
  customerName?: string | null;
}) {
  const state = await loadBusinessState();
  const existing = state.sales.find((item) => item.saleId === saleId);
  const product = input.productId ? state.products.find((item) => item.productId === input.productId) : null;
  if (!existing) {
    throw new Error('Sale not found.');
  }
  if (input.productId && !product) {
    throw new Error('Choose a product first.');
  }
  if (product && !isActiveProduct(product)) {
    throw new Error('That product is archived. Restore it first if you want to use it for a new sale.');
  }

  if (!product && !String(input.productName ?? input.itemName ?? existing.productName ?? existing.itemName ?? '').trim()) {
    throw new Error('Type a product name first.');
  }

  if (!product && !input.businessType && !existing.businessType) {
    throw new Error('Choose a business line first.');
  }

  if (!product && (input.productType ?? existing.productType ?? 'my-product') === 'my-product' && !(toSafeNumber(input.costPerItem ?? existing.costPerItem) > 0)) {
    throw new Error('Cost per sell unit is required for manual My Product sales.');
  }

  const salePrice = input.sellingPrice != null ? input.sellingPrice : product ? getEffectiveProductSellingPrice(product, input.date) : existing.sellingPrice;
  const totalSale = Number((input.quantitySold * salePrice).toFixed(2));

  if (product) {
    const estimatedProfit = isProductCostMissing(product) ? 0 : Number((totalSale - (input.quantitySold * getPackageCost(product))).toFixed(2));

    const updatedSale = normalizeSaleRecord({
      ...existing,
      saleId: existing.saleId,
      businessType: product.businessType,
      businessLine: product.businessLine ?? product.businessType,
      productType: product.productType,
      productId: product.productId,
      productName: product.name,
      vendorName: product.vendorName,
      commissionPercent: product.productType === 'third-party' ? normalizeCommissionPercent(product.commissionPercent, 25) : 0,
      month: getMonthKey(input.date),
      itemName: product.name,
      sellUnitType: product.sellUnitType,
      customUnitName: product.customUnitName,
      packSize: product.packSize,
      quantitySold: input.quantitySold,
      quantity: input.quantitySold,
      sellingPrice: salePrice,
      unitPrice: salePrice,
      date: input.date,
      note: input.note?.trim() ? input.note.trim() : null,
      notes: input.note?.trim() ? input.note.trim() : null,
      totalSale,
      subtotal: totalSale,
      category: product.category,
      costPerItem: product.productType === 'third-party' ? 0 : getCostPerItem(product),
      costMissing: product.productType === 'third-party' ? false : isProductCostMissing(product),
      commissionEarned: product.productType === 'third-party' ? Number((totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100)).toFixed(2)) : 0,
      vendorShare: product.productType === 'third-party' ? Number((totalSale - (totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100))).toFixed(2)) : 0,
      helperName: normalizeOptionalText(input.helperName),
      showEvent: normalizeOptionalText(input.showEvent),
      helperCommissionType: normalizeHelperCommissionType(input.helperCommissionType),
      helperCommissionRate: getSaleHelperCommissionRate(input),
      helperCommissionAmount: getSaleHelperCommissionAmount(input, totalSale),
      helperCommissionPaid: Boolean(input.helperCommissionPaid),
      helperCommissionDatePaid: normalizeOptionalText(input.helperCommissionDatePaid),
      helperCommissionNotes: normalizeOptionalText(input.helperCommissionNotes),
      estimatedProfit: product.productType === 'third-party' ? Number((totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100)).toFixed(2)) : estimatedProfit,
      profit: product.productType === 'third-party' ? Number((totalSale * (normalizeCommissionPercent(product.commissionPercent, 25) / 100)).toFixed(2)) : estimatedProfit,
      paymentMethod: normalizePaymentType(input.paymentMethod ?? existing.paymentMethod),
      customerName: normalizeOptionalText(input.customerName ?? existing.customerName),
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    }, state.products);

    await saveBusinessState({
      ...state,
      sales: sortSales(state.sales.map((item) => item.saleId === saleId ? updatedSale : item)),
    });

    return updatedSale;
  }

  const updatedSale = normalizeSaleRecord({
    ...existing,
    saleId: existing.saleId,
    businessType: input.businessLine ?? input.businessType ?? existing.businessType,
    businessLine: input.businessLine ?? input.businessType ?? existing.businessLine ?? existing.businessType,
    productType: input.productType ?? existing.productType,
    productId: String(input.productId ?? existing.productId ?? `manual-${Date.now()}`),
    productName: String(input.productName ?? input.itemName ?? existing.productName ?? existing.itemName ?? '').trim(),
    vendorName: input.vendorName ?? existing.vendorName ?? null,
    commissionPercent: (input.productType ?? existing.productType ?? 'my-product') === 'third-party' ? normalizeCommissionPercent(input.commissionPercent ?? existing.commissionPercent ?? 25, 25) : 0,
    month: getMonthKey(input.date),
    itemName: String(input.itemName ?? input.productName ?? existing.itemName ?? existing.productName ?? '').trim(),
    sellUnitType: input.sellUnitType ?? existing.sellUnitType,
    customUnitName: input.customUnitName ?? existing.customUnitName,
    packSize: input.packSize ?? existing.packSize,
    quantitySold: input.quantitySold,
    quantity: input.quantitySold,
    sellingPrice: salePrice,
    unitPrice: salePrice,
    date: input.date,
    note: input.note?.trim() ? input.note.trim() : null,
    notes: input.note?.trim() ? input.note.trim() : null,
    totalSale,
    subtotal: totalSale,
    category: String(input.category ?? existing.category ?? '').trim(),
    costPerItem: input.costPerItem ?? existing.costPerItem ?? 0,
    helperName: input.helperName,
    showEvent: input.showEvent,
    helperCommissionType: input.helperCommissionType ?? existing.helperCommissionType,
    helperCommissionRate: input.helperCommissionRate ?? undefined,
    helperCommissionPaid: input.helperCommissionPaid,
    helperCommissionDatePaid: input.helperCommissionDatePaid,
    helperCommissionNotes: input.helperCommissionNotes,
    paymentMethod: input.paymentMethod ?? existing.paymentMethod,
    customerName: input.customerName ?? existing.customerName,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  }, state.products);

  await saveBusinessState({
    ...state,
    sales: sortSales(state.sales.map((item) => item.saleId === saleId ? updatedSale : item)),
  });

  return updatedSale;
}

export async function deleteSale(saleId: string) {
  const state = await loadBusinessState();
  const existing = state.sales.find((item) => item.saleId === saleId);
  if (!existing) {
    throw new Error('Sale not found.');
  }

  await saveBusinessState({
    ...state,
    sales: state.sales.filter((item) => item.saleId !== saleId),
  });

  return normalizeSaleRecord(existing, state.products);
}

function scaleSaleQuantity(sale: SaleRecord, quantitySold: number, products: ProductRecord[]) {
  const quantity = Number(Math.max(0, quantitySold).toFixed(4));
  return normalizeSaleRecord({
    ...sale,
    quantitySold: quantity,
    quantity,
    totalSale: Number((quantity * sale.unitPrice).toFixed(2)),
    subtotal: Number((quantity * sale.unitPrice).toFixed(2)),
  }, products);
}

export async function voidSale(saleId: string, options?: {
  quantitySold?: number | null;
  reason?: string | null;
  voidedBy?: string | null;
}) {
  const state = await loadBusinessState();
  const existing = state.sales.find((item) => item.saleId === saleId);
  if (!existing) throw new Error('Sale not found.');
  if (existing.status === 'voided') throw new Error('Sale is already voided.');

  const requestedQuantity = options?.quantitySold != null ? toSafeNumber(options.quantitySold) : existing.quantitySold;
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error('Void quantity must be more than 0.');
  }
  if (requestedQuantity - existing.quantitySold > 0.0001) {
    throw new Error('Void quantity cannot be more than the sale quantity.');
  }

  const timestamp = nowIso();
  const reason = normalizeOptionalText(options?.reason) ?? 'No reason entered';
  const voidedBy = normalizeOptionalText(options?.voidedBy) ?? 'Finch';
  const isFullVoid = requestedQuantity >= existing.quantitySold;

  if (isFullVoid) {
    const updated = normalizeSaleRecord({
      ...existing,
      status: 'voided',
      voidedAt: timestamp,
      voidedBy,
      voidReason: reason,
      voidedQuantity: existing.quantitySold,
      originalSaleId: existing.originalSaleId ?? existing.saleId,
      updatedAt: timestamp,
    }, state.products);
    await saveBusinessState({ ...state, sales: sortSales(state.sales.map((item) => item.saleId === saleId ? updated : item)) });
    return updated;
  }

  const remainingQuantity = Number((existing.quantitySold - requestedQuantity).toFixed(4));
  const activeRemainder = scaleSaleQuantity({
    ...existing,
    updatedAt: timestamp,
  }, remainingQuantity, state.products);
  const voidAuditRow = normalizeSaleRecord({
    ...existing,
    saleId: createId('void-sale'),
    quantitySold: requestedQuantity,
    quantity: requestedQuantity,
    totalSale: Number((requestedQuantity * existing.unitPrice).toFixed(2)),
    subtotal: Number((requestedQuantity * existing.unitPrice).toFixed(2)),
    status: 'voided',
    voidedAt: timestamp,
    voidedBy,
    voidReason: reason,
    voidedQuantity: requestedQuantity,
    originalSaleId: existing.saleId,
    createdAt: existing.createdAt,
    updatedAt: timestamp,
  }, state.products);

  await saveBusinessState({
    ...state,
    sales: sortSales(state.sales.map((item) => item.saleId === saleId ? activeRemainder : item).concat(voidAuditRow)),
  });

  return voidAuditRow;
}

export async function restoreSale(saleId: string) {
  const state = await loadBusinessState();
  const existing = state.sales.find((item) => item.saleId === saleId);
  if (!existing) throw new Error('Sale not found.');
  if (existing.originalSaleId && existing.originalSaleId !== existing.saleId) {
    throw new Error('Partial void audit rows cannot be restored directly. Edit the original sale quantity instead.');
  }
  const updated = normalizeSaleRecord({ ...existing, status: 'active', voidedAt: null, voidedBy: null, voidReason: null, voidedQuantity: null, updatedAt: nowIso() }, state.products);
  await saveBusinessState({ ...state, sales: sortSales(state.sales.map((item) => item.saleId === saleId ? updated : item)) });
  return updated;
}

export async function addExpense(input: {
  date: ISODate;
  month?: string;
  expenseType?: ExpenseType;
  expenseCategory: string;
  vendor: string;
  businessType: BusinessType;
  businessLine?: BusinessType;
  amount: number;
  note?: string | null;
}) {
  const state = await loadBusinessState();
  const expense = normalizeExpenseRecord({
    date: input.date,
    month: input.month,
    expenseType: input.expenseType,
    expenseCategory: input.expenseCategory,
    vendor: input.vendor,
    businessType: input.businessType,
    businessLine: input.businessLine ?? input.businessType,
    amount: input.amount,
    note: input.note,
  });

  state.expenses.push(expense);
  await saveBusinessState({ ...state, expenses: sortExpenses(state.expenses) });
  return expense;
}

export async function updateExpense(expenseId: string, input: {
  date: ISODate;
  month?: string;
  expenseType?: ExpenseType;
  expenseCategory: string;
  vendor: string;
  businessType: BusinessType;
  businessLine?: BusinessType;
  amount: number;
  note?: string | null;
}) {
  const state = await loadBusinessState();
  const existing = state.expenses.find((item) => item.expenseId === expenseId);
  if (!existing) {
    throw new Error('Expense not found.');
  }

  const updatedExpense = normalizeExpenseRecord({
    ...existing,
    ...input,
    expenseId: existing.expenseId,
    businessLine: input.businessLine ?? input.businessType,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });

  await saveBusinessState({
    ...state,
    expenses: sortExpenses(state.expenses.map((item) => item.expenseId === expenseId ? updatedExpense : item)),
  });

  return updatedExpense;
}

export async function deleteExpense(expenseId: string) {
  const state = await loadBusinessState();
  const existing = state.expenses.find((item) => item.expenseId === expenseId);
  if (!existing) {
    throw new Error('Expense not found.');
  }

  await saveBusinessState({
    ...state,
    expenses: state.expenses.filter((item) => item.expenseId !== expenseId),
  });

  return existing;
}

export async function voidExpense(expenseId: string) {
  const state = await loadBusinessState();
  const existing = state.expenses.find((item) => item.expenseId === expenseId);
  if (!existing) throw new Error('Expense not found.');
  const updated = normalizeExpenseRecord({ ...existing, status: 'voided', voidedAt: nowIso(), updatedAt: nowIso() });
  await saveBusinessState({ ...state, expenses: sortExpenses(state.expenses.map((item) => item.expenseId === expenseId ? updated : item)) });
  return updated;
}

export async function restoreExpense(expenseId: string) {
  const state = await loadBusinessState();
  const existing = state.expenses.find((item) => item.expenseId === expenseId);
  if (!existing) throw new Error('Expense not found.');
  const updated = normalizeExpenseRecord({ ...existing, status: 'active', voidedAt: null, updatedAt: nowIso() });
  await saveBusinessState({ ...state, expenses: sortExpenses(state.expenses.map((item) => item.expenseId === expenseId ? updated : item)) });
  return updated;
}

export async function addGiveaway(input: {
  productId: string;
  date: ISODate;
  month?: string;
  businessType?: BusinessType;
  category?: string | null;
  quantityGivenAway: number;
  estimatedSaleValue?: number | null;
  estimatedCost?: number | null;
  reason?: string | null;
}) {
  const state = await loadBusinessState();
  const product = state.products.find((item) => item.productId === input.productId);
  if (!product) {
    throw new Error('Choose a product first.');
  }
  if (!isActiveProduct(product)) {
    throw new Error('That product is archived. Restore it first if you want to use it for a new giveaway.');
  }

  const giveaway = normalizeGiveawayRecord({
    productId: product.productId,
    productName: product.name,
    businessType: input.businessType ?? product.businessType,
    businessLine: input.businessType ?? product.businessLine ?? product.businessType,
    category: input.category?.trim() ? input.category.trim() : product.category,
    sellUnitType: product.sellUnitType,
    customUnitName: product.customUnitName,
    packSize: product.packSize,
    quantityGivenAway: input.quantityGivenAway,
    quantity: input.quantityGivenAway,
    estimatedSaleValue: input.estimatedSaleValue ?? undefined,
    estimatedCost: input.estimatedCost ?? undefined,
    reason: input.reason,
    note: input.reason,
    date: input.date,
    month: input.month,
  }, state.products);

  state.giveaways.push(giveaway);
  await saveBusinessState({ ...state, giveaways: sortGiveaways(state.giveaways) });
  return giveaway;
}

export async function updateGiveaway(giveawayId: string, input: {
  productId: string;
  date: ISODate;
  month?: string;
  businessType?: BusinessType;
  category?: string | null;
  quantityGivenAway: number;
  estimatedSaleValue?: number | null;
  estimatedCost?: number | null;
  reason?: string | null;
}) {
  const state = await loadBusinessState();
  const existing = state.giveaways.find((item) => item.giveawayId === giveawayId);
  const product = state.products.find((item) => item.productId === input.productId);
  if (!existing) {
    throw new Error('Giveaway not found.');
  }
  if (!product) {
    throw new Error('Choose a product first.');
  }
  if (!isActiveProduct(product)) {
    throw new Error('That product is archived. Restore it first if you want to use it for a new giveaway.');
  }

  const updatedGiveaway = normalizeGiveawayRecord({
    ...existing,
    giveawayId: existing.giveawayId,
    productId: product.productId,
    productName: product.name,
    businessType: input.businessType ?? product.businessType,
    businessLine: input.businessType ?? product.businessLine ?? product.businessType,
    category: input.category?.trim() ? input.category.trim() : product.category,
    sellUnitType: product.sellUnitType,
    customUnitName: product.customUnitName,
    packSize: product.packSize,
    quantityGivenAway: input.quantityGivenAway,
    quantity: input.quantityGivenAway,
    estimatedSaleValue: input.estimatedSaleValue ?? undefined,
    estimatedCost: input.estimatedCost ?? undefined,
    reason: input.reason,
    note: input.reason,
    date: input.date,
    month: input.month,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  }, state.products);

  await saveBusinessState({
    ...state,
    giveaways: sortGiveaways(state.giveaways.map((item) => item.giveawayId === giveawayId ? updatedGiveaway : item)),
  });

  return updatedGiveaway;
}

export async function deleteGiveaway(giveawayId: string) {
  const state = await loadBusinessState();
  const existing = state.giveaways.find((item) => item.giveawayId === giveawayId);
  if (!existing) {
    throw new Error('Giveaway not found.');
  }

  await saveBusinessState({
    ...state,
    giveaways: state.giveaways.filter((item) => item.giveawayId !== giveawayId),
  });

  return normalizeGiveawayRecord(existing, state.products);
}

export async function voidGiveaway(giveawayId: string) {
  const state = await loadBusinessState();
  const existing = state.giveaways.find((item) => item.giveawayId === giveawayId);
  if (!existing) throw new Error('Giveaway not found.');
  const updated = normalizeGiveawayRecord({ ...existing, status: 'voided', voidedAt: nowIso(), updatedAt: nowIso() }, state.products);
  await saveBusinessState({ ...state, giveaways: sortGiveaways(state.giveaways.map((item) => item.giveawayId === giveawayId ? updated : item)) });
  return updated;
}

export async function restoreGiveaway(giveawayId: string) {
  const state = await loadBusinessState();
  const existing = state.giveaways.find((item) => item.giveawayId === giveawayId);
  if (!existing) throw new Error('Giveaway not found.');
  const updated = normalizeGiveawayRecord({ ...existing, status: 'active', voidedAt: null, updatedAt: nowIso() }, state.products);
  await saveBusinessState({ ...state, giveaways: sortGiveaways(state.giveaways.map((item) => item.giveawayId === giveawayId ? updated : item)) });
  return updated;
}

export async function addRestock(input: {
  productId: string;
  date: ISODate;
  month?: string;
  quantityAdded: number;
  note?: string | null;
}) {
  const state = await loadBusinessState();
  const product = state.products.find((item) => item.productId === input.productId);
  if (!product) throw new Error('Choose a product first.');
  if (!isActiveProduct(product)) throw new Error('That product is archived. Restore it first if you want to restock it.');

  const beforeQuantity = buildProductSnapshot(state, product).quantityOnHand;
  const afterQuantity = Math.max(0, beforeQuantity + input.quantityAdded);

  const restock = normalizeRestockRecord({
    productId: product.productId,
    productName: product.name,
    businessType: product.businessType,
    businessLine: product.businessLine ?? product.businessType,
    category: product.category,
    quantityAdded: input.quantityAdded,
    quantityBefore: beforeQuantity,
    quantityAfter: afterQuantity,
    date: input.date,
    month: input.month,
    note: input.note,
  }, state.products);

  state.restocks.push(restock);
  await saveBusinessState({ ...state, restocks: sortRestocks(state.restocks) });
  return restock;
}

export async function deleteRestock(restockId: string) {
  const state = await loadBusinessState();
  const existing = state.restocks.find((item) => item.restockId === restockId);
  if (!existing) throw new Error('Restock not found.');
  await saveBusinessState({ ...state, restocks: state.restocks.filter((item) => item.restockId !== restockId) });
  return existing;
}

export async function addOrder(input: {
  customerName: string;
  businessType: BusinessType;
  itemOrdered: string;
  quantity: number;
  price: number;
  depositPaid: number;
  dueDate: ISODate;
  status: OrderStatus;
  note?: string | null;
}) {
  const state = await loadBusinessState();
  const timestamp = nowIso();
  const order: OrderRecord = {
    orderId: createId('order'),
    customerName: input.customerName.trim(),
    businessType: input.businessType,
    itemOrdered: input.itemOrdered.trim(),
    quantity: input.quantity,
    price: input.price,
    depositPaid: input.depositPaid,
    balanceDue: Number((input.price - input.depositPaid).toFixed(2)),
    dueDate: input.dueDate,
    status: input.status,
    note: input.note?.trim() ? input.note.trim() : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  state.orders.push(order);
  await saveBusinessState({ ...state, orders: sortOrders(state.orders) });
  return order;
}

export function buildProductSnapshot(state: BusinessAppState, product: ProductRecord) {
  const normalizedSales = filterActiveSales(getNormalizedSales(state));
  const normalizedGiveaways = filterActiveGiveaways(getNormalizedGiveaways(state));
  const normalizedRestocks = getNormalizedRestocks(state);
  const sold = normalizedSales
    .filter((sale) => sale.productId === product.productId)
    .reduce((sum, sale) => sum + sale.quantitySold, 0);
  const givenAway = normalizedGiveaways
    .filter((giveaway) => giveaway.productId === product.productId)
    .reduce((sum, giveaway) => sum + giveaway.quantityGivenAway, 0);
  const productRestocks = normalizedRestocks.filter((restock) => restock.productId === product.productId);
  const restocked = productRestocks.reduce((sum, restock) => sum + restock.quantityAdded, 0);
  const lastRestockDate = productRestocks.length ? productRestocks[0].date : null;
  const onHand = Math.max(0, product.startingInventory + restocked - sold - givenAway);
  const profit = normalizedSales
    .filter((sale) => sale.productId === product.productId)
    .reduce((sum, sale) => sum + sale.estimatedProfit, 0);
  const giveawayValue = normalizedGiveaways
    .filter((giveaway) => giveaway.productId === product.productId)
    .reduce((sum, giveaway) => sum + giveaway.estimatedSaleValue, 0);
  const giveawayCost = normalizedGiveaways
    .filter((giveaway) => giveaway.productId === product.productId)
    .reduce((sum, giveaway) => sum + giveaway.estimatedCost, 0);

  return {
    ...product,
    archived: product.status === 'archived',
    status: (product.status === 'archived' ? 'archived' : 'active') as ProductStatus,
    costStatusLabel: getProductCostStatusLabel(product),
    costMissing: isProductCostMissing(product),
    costPerItem: getCostPerItem(product),
    costPerSellUnit: getPackageCost(product),
    profitPerSellUnit: getProfitPerSellUnit(product),
    sellUnitLabel: getProductSellUnitLabel(product, 1),
    sellUnitLabelPlural: getProductSellUnitLabel(product, 2),
    sellUnitDescription: getProductSellUnitDescription(product, 1),
    quantitySold: sold,
    quantityGivenAway: givenAway,
    quantityRestocked: restocked,
    quantityOnHand: onHand,
    lastRestockDate,
    outOfStock: onHand <= 0,
    inventoryStatusLabel: onHand <= 0 ? 'Out of stock' : (isActiveProduct(product) && onHand <= product.reorderLevel ? 'Low stock' : 'In stock'),
    profit: Number(profit.toFixed(2)),
    giveawayValue: Number(giveawayValue.toFixed(2)),
    giveawayCost: Number(giveawayCost.toFixed(2)),
    lowStock: isActiveProduct(product) && onHand <= product.reorderLevel,
  };
}

export async function getDashboardSnapshot() {
  const state = await loadBusinessState();
  const todayKey = getLocalDay();
  const weekStart = startOfLocalWeek();
  const monthPrefix = todayKey.slice(0, 7);

  const allSales = getNormalizedSales(state);
  const allExpenses = getNormalizedExpenses(state);
  const allGiveaways = getNormalizedGiveaways(state);
  const normalizedSales = filterActiveSales(allSales);
  const normalizedExpenses = filterActiveExpenses(allExpenses);
  const normalizedGiveaways = filterActiveGiveaways(allGiveaways);
  const normalizedRestocks = getNormalizedRestocks(state);
  const helperCommissions = sortHelperCommissions(state.helperCommissions.map((item) => normalizeHelperCommissionRecord(item)));

  const todaySales = normalizedSales.filter((sale) => sale.date === todayKey);
  const weekSales = normalizedSales.filter((sale) => sale.date >= weekStart);
  const monthSales = normalizedSales.filter((sale) => sale.date.startsWith(monthPrefix));
  const todayExpenses = normalizedExpenses.filter((expense) => expense.date === todayKey);
  const weekExpenses = normalizedExpenses.filter((expense) => expense.date >= weekStart);
  const monthExpenses = normalizedExpenses.filter((expense) => expense.month === monthPrefix || expense.date.startsWith(monthPrefix));
  const todayGiveaways = normalizedGiveaways.filter((giveaway) => giveaway.date === todayKey);
  const weekGiveaways = normalizedGiveaways.filter((giveaway) => giveaway.date >= weekStart);
  const monthGiveaways = normalizedGiveaways.filter((giveaway) => giveaway.month === monthPrefix || giveaway.date.startsWith(monthPrefix));
  const auditProductSnapshots = state.products.map((product) => buildProductSnapshot(state, product));
  const productSnapshots = auditProductSnapshots.filter((item) => item.status !== 'archived');
  const archivedProducts = auditProductSnapshots.filter((item) => item.status === 'archived');
  const lowStockItems = productSnapshots.filter((item) => item.lowStock);
  const openOrders = state.orders.filter((order) => order.status !== 'picked up' && order.status !== 'paid');
  const monthlySummaries = [...new Set([...normalizedSales.map((sale) => sale.month), ...normalizedExpenses.map((expense) => expense.month), ...normalizedGiveaways.map((giveaway) => giveaway.month), ...normalizedRestocks.map((restock) => restock.month)])]
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const monthSalesRows = normalizedSales.filter((sale) => sale.month === month);
      const monthExpenseRows = normalizedExpenses.filter((expense) => expense.month === month);
      const monthGiveawayRows = normalizedGiveaways.filter((giveaway) => giveaway.month === month);
      const sales = sumSales(monthSalesRows);
      const myProductSales = sumMyProductSales(monthSalesRows);
      const thirdPartySales = sumThirdPartySales(monthSalesRows);
      const myProductProfit = sumMyProductProfit(monthSalesRows);
      const thirdPartyCommissionEarned = sumThirdPartyCommissionEarned(monthSalesRows);
      const totalEarnedBeforeExpenses = Number((myProductProfit + thirdPartyCommissionEarned).toFixed(2));
      const expenses = sumExpenses(monthExpenseRows);
      const vendorPayments = sumVendorPayments(monthExpenseRows);
      const vendorOwed = sumVendorShareOwed(monthSalesRows);
      const giveawayValue = sumGiveawayValue(monthGiveawayRows);
      const giveawayCost = sumGiveawayCost(monthGiveawayRows);
      return {
        month,
        sales,
        myProductSales,
        thirdPartySales,
        profit: totalEarnedBeforeExpenses,
        myProductProfit,
        thirdPartyCommissionEarned,
        totalEarnedBeforeExpenses,
        expenses,
        vendorOwed,
        vendorPayments,
        vendorOutstanding: Number((vendorOwed - vendorPayments).toFixed(2)),
        giveawayValue,
        giveawayCost,
        net: Number((totalEarnedBeforeExpenses - expenses).toFixed(2)),
        trueNet: Number((totalEarnedBeforeExpenses - expenses - giveawayCost).toFixed(2)),
        quantity: sumQuantity(monthSalesRows),
        expenseCount: monthExpenseRows.length,
        giveawayCount: monthGiveawayRows.length,
        restockCount: normalizedRestocks.filter((restock) => restock.month === month).length,
      };
    });
  const bakerySales = normalizedSales.filter((sale) => sale.businessType === 'bakery');
  const craftSales = normalizedSales.filter((sale) => sale.businessType === 'craft');
  const bakeryExpenses = normalizedExpenses.filter((expense) => expense.businessType === 'bakery');
  const craftExpenses = normalizedExpenses.filter((expense) => expense.businessType === 'craft');
  const bakeryGiveaways = normalizedGiveaways.filter((giveaway) => giveaway.businessType === 'bakery');
  const craftGiveaways = normalizedGiveaways.filter((giveaway) => giveaway.businessType === 'craft');
  const bakeryProductSnapshots = productSnapshots.filter((item) => item.businessType === 'bakery');
  const craftProductSnapshots = productSnapshots.filter((item) => item.businessType === 'craft');
  const bestSellingItems = [...productSnapshots]
    .filter((item) => item.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 5);

  const bakerySummary = buildBusinessSummary(bakerySales, bakeryProductSnapshots);
  const craftSummary = buildBusinessSummary(craftSales, craftProductSnapshots);

  return {
    todaySales: sumSales(todaySales),
    weekSales: sumSales(weekSales),
    monthSales: sumSales(monthSales),
    todayExpenses: sumExpenses(todayExpenses),
    weekExpenses: sumExpenses(weekExpenses),
    monthExpenses: sumExpenses(monthExpenses),
    totalExpenses: sumExpenses(normalizedExpenses),
    todayGiveawayValue: sumGiveawayValue(todayGiveaways),
    weekGiveawayValue: sumGiveawayValue(weekGiveaways),
    monthGiveawayValue: sumGiveawayValue(monthGiveaways),
    totalGiveawayValue: sumGiveawayValue(normalizedGiveaways),
    todayGiveawayCost: sumGiveawayCost(todayGiveaways),
    weekGiveawayCost: sumGiveawayCost(weekGiveaways),
    monthGiveawayCost: sumGiveawayCost(monthGiveaways),
    totalGiveawayCost: sumGiveawayCost(normalizedGiveaways),
    monthNet: Number((sumProfit(monthSales) - sumExpenses(monthExpenses)).toFixed(2)),
    monthTrueNet: Number((sumProfit(monthSales) - sumExpenses(monthExpenses) - sumGiveawayCost(monthGiveaways)).toFixed(2)),
    monthMyProductSales: sumMyProductSales(monthSales),
    monthThirdPartySales: sumThirdPartySales(monthSales),
    monthMyProductProfit: sumMyProductProfit(monthSales),
    monthThirdPartyCommissionEarned: sumThirdPartyCommissionEarned(monthSales),
    monthTotalEarnedBeforeExpenses: sumProfit(monthSales),
    monthVendorOwed: sumVendorShareOwed(monthSales),
    monthVendorPaid: sumVendorPayments(monthExpenses),
    monthVendorOutstanding: Number((sumVendorShareOwed(monthSales) - sumVendorPayments(monthExpenses)).toFixed(2)),
    bakerySales: bakerySummary.sales,
    craftSales: craftSummary.sales,
    bakeryProfit: bakerySummary.profit,
    craftProfit: craftSummary.profit,
    bakeryMyProductSales: sumMyProductSales(bakerySales),
    bakeryThirdPartySales: sumThirdPartySales(bakerySales),
    bakeryMyProductProfit: sumMyProductProfit(bakerySales),
    bakeryThirdPartyCommissionEarned: sumThirdPartyCommissionEarned(bakerySales),
    bakeryExpensesOnly: sumExpenses(bakeryExpenses),
    bakeryVendorPaid: sumVendorPayments(bakeryExpenses),
    bakeryVendorOutstanding: Number((sumVendorShareOwed(bakerySales) - sumVendorPayments(bakeryExpenses)).toFixed(2)),
    craftMyProductSales: sumMyProductSales(craftSales),
    craftThirdPartySales: sumThirdPartySales(craftSales),
    craftMyProductProfit: sumMyProductProfit(craftSales),
    craftThirdPartyCommissionEarned: sumThirdPartyCommissionEarned(craftSales),
    craftExpensesOnly: sumExpenses(craftExpenses),
    craftVendorPaid: sumVendorPayments(craftExpenses),
    craftVendorOutstanding: Number((sumVendorShareOwed(craftSales) - sumVendorPayments(craftExpenses)).toFixed(2)),
    bakeryGiveawayValue: sumGiveawayValue(bakeryGiveaways.filter((giveaway) => giveaway.month === monthPrefix)),
    craftGiveawayValue: sumGiveawayValue(craftGiveaways.filter((giveaway) => giveaway.month === monthPrefix)),
    bakeryGiveawayCost: sumGiveawayCost(bakeryGiveaways.filter((giveaway) => giveaway.month === monthPrefix)),
    craftGiveawayCost: sumGiveawayCost(craftGiveaways.filter((giveaway) => giveaway.month === monthPrefix)),
    bakeryItemsSold: bakerySummary.itemsSold,
    craftItemsSold: craftSummary.itemsSold,
    bakeryBestSellingItems: bakerySummary.bestSellingItems,
    craftBestSellingItems: craftSummary.bestSellingItems,
    lowStockItems,
    openOrders,
    bestSellingItems,
    productSnapshots,
    auditProductSnapshots,
    archivedProducts,
    bakeryProductSnapshots,
    craftProductSnapshots,
    monthlySummaries,
    auditSales: sortSales(allSales),
    auditExpenses: sortExpenses(allExpenses),
    auditGiveaways: sortGiveaways(allGiveaways),
    restocks: sortRestocks(normalizedRestocks),
    expenses: sortExpenses(normalizedExpenses),
    giveaways: sortGiveaways(normalizedGiveaways),
    sales: sortSales(normalizedSales),
    orders: sortOrders(state.orders),
    helperCommissions,
  };
}

function sumSales(sales: Partial<SaleRecord>[]) {
  return Number(sales.reduce((sum, sale) => sum + getSaleTotalSale(sale), 0).toFixed(2));
}

function sumMyProductSales(sales: Partial<SaleRecord>[]) {
  return Number(sales.filter((sale) => normalizeProductType(sale.productType) !== 'third-party').reduce((sum, sale) => sum + getSaleTotalSale(sale), 0).toFixed(2));
}

function sumThirdPartySales(sales: Partial<SaleRecord>[]) {
  return Number(sales.filter((sale) => normalizeProductType(sale.productType) === 'third-party').reduce((sum, sale) => sum + getSaleTotalSale(sale), 0).toFixed(2));
}

function sumProfit(sales: Partial<SaleRecord>[]) {
  return Number(sales.reduce((sum, sale) => sum + toSafeNumber(sale.estimatedProfit), 0).toFixed(2));
}

function sumMyProductProfit(sales: Partial<SaleRecord>[]) {
  return Number(sales.filter((sale) => normalizeProductType(sale.productType) !== 'third-party').reduce((sum, sale) => sum + toSafeNumber(sale.estimatedProfit), 0).toFixed(2));
}

function sumThirdPartyCommissionEarned(sales: Partial<SaleRecord>[]) {
  return Number(sales.filter((sale) => normalizeProductType(sale.productType) === 'third-party').reduce((sum, sale) => sum + toSafeNumber(sale.commissionEarned ?? sale.estimatedProfit), 0).toFixed(2));
}

function sumVendorShareOwed(sales: Partial<SaleRecord>[]) {
  return Number(sales.filter((sale) => normalizeProductType(sale.productType) === 'third-party').reduce((sum, sale) => sum + toSafeNumber(sale.vendorShare), 0).toFixed(2));
}

function sumQuantity(sales: Partial<SaleRecord>[]) {
  return Number(sales.reduce((sum, sale) => sum + toSafeNumber(sale.quantitySold), 0).toFixed(0));
}

function sumExpenses(expenses: Partial<ExpenseRecord>[]) {
  return Number(expenses.filter((expense) => normalizeExpenseType(expense.expenseType) !== 'vendor-payment').reduce((sum, expense) => sum + toSafeNumber(expense.amount), 0).toFixed(2));
}

function sumVendorPayments(expenses: Partial<ExpenseRecord>[]) {
  return Number(expenses.filter((expense) => normalizeExpenseType(expense.expenseType) === 'vendor-payment').reduce((sum, expense) => sum + toSafeNumber(expense.amount), 0).toFixed(2));
}

function sumGiveawayValue(giveaways: Partial<GiveawayRecord>[]) {
  return Number(giveaways.reduce((sum, giveaway) => sum + toSafeNumber(giveaway.estimatedSaleValue), 0).toFixed(2));
}

function sumGiveawayCost(giveaways: Partial<GiveawayRecord>[]) {
  return Number(giveaways.reduce((sum, giveaway) => sum + toSafeNumber(giveaway.estimatedCost), 0).toFixed(2));
}

function buildBusinessSummary(sales: SaleRecord[], productSnapshots: ReturnType<typeof buildProductSnapshot>[]): BusinessSummary {
  return {
    sales: sumSales(sales),
    profit: sumProfit(sales),
    itemsSold: sumQuantity(sales),
    bestSellingItems: [...productSnapshots]
      .filter((item) => item.quantitySold > 0)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5),
  };
}

export async function getBusinessSectionSnapshot(businessType: BusinessType) {
  const state = await loadBusinessState();
  const products = state.products
    .filter((product) => product.businessType === businessType && isActiveProduct(product))
    .map((product) => buildProductSnapshot(state, product));
  const sales = getNormalizedSales(state).filter((sale) => sale.businessType === businessType);
  const openOrders = state.orders.filter((order) => order.businessType === businessType && order.status !== 'picked up' && order.status !== 'paid');

  return {
    businessType,
    products: products.sort((a, b) => a.name.localeCompare(b.name)),
    sales: sortSales(sales),
    openOrders: sortOrders(openOrders),
    totalSales: sumSales(sales),
    totalProfit: sumProfit(sales),
    lowStockItems: products.filter((item) => item.lowStock),
  };
}

export async function getThirdPartyConversionCandidates() {
  const state = await loadBusinessState();
  return sortProducts(state.products)
    .filter((product) => {
      const text = [product.name, product.category, product.notes, product.vendorName].filter(Boolean).join(' ').toLowerCase();
      return product.productType === 'third-party' || /\bdonna\b|3rd party|third party|vendor/i.test(text);
    })
    .map((product) => ({
      productId: product.productId,
      name: product.name,
      businessType: product.businessType,
      category: product.category,
      productType: product.productType,
      vendorName: product.vendorName,
      commissionPercent: product.commissionPercent,
    }));
}

export async function runDonnaThirdPartyCleanup() {
  const state = await loadBusinessState();
  const migration = migrateDonnaThirdPartyProducts(state);
  if (!migration.changed) {
    return [];
  }

  await saveBusinessState(migration.state);
  return migration.converted.map((product) => ({
    productId: product.productId,
    name: product.name,
    businessType: product.businessType,
    productType: product.productType,
    vendorName: product.vendorName,
    commissionPercent: product.commissionPercent,
  }));
}

export async function exportBusinessBackup() {
  return loadBusinessState();
}

export function getBusinessStorageDetails() {
  return {
    storageKey: BUSINESS_STORAGE_KEY,
    runtimeStore: canUseStorage() ? 'window.localStorage' : 'expo-secure-store (with in-memory cache while running)',
    singleSourceOfTruth: 'Business app state in src/features/business/store.ts',
    salesHistorySource: 'BusinessAppState.sales',
    expensesSource: 'BusinessAppState.expenses',
    giveawaysSource: 'BusinessAppState.giveaways',
    inventorySource: 'Current inventory is derived from products, restocks, active sales, and active giveaways. Voided rows do not affect inventory.',
  };
}
