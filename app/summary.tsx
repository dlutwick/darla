import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Card } from '../supabase/src/components/ui/Card';
import { MonthFilterBar } from '../supabase/src/components/ui/MonthFilterBar';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { theme } from '../supabase/src/constants/theme';
import { ALL_MONTHS_KEY, buildReconciliationRows, filterRowsByMonth, getAvailableReportMonths, getScopeLabel, sumExpenses, sumGiveawayCost, sumGiveawayValue, sumMyProductProfit, sumMyProductSales, sumProfit, sumQuantity, sumSales, sumThirdPartyCommission, sumThirdPartySales, sumVendorOwed, sumVendorPayments } from '../supabase/src/features/business/reporting';
import { getDashboardSnapshot, getProductSellUnitDescription, getProductSellUnitLabel, getSaleProfitStatusLabel, subscribeBusinessState } from '../supabase/src/features/business/store';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

export default function SummaryScreen() {
  const [statusMessage, setStatusMessage] = useState('Monthly summary updates from saved sales, profit, expenses, and giveaways.');
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS_KEY);

  const refresh = useCallback(async () => {
    const next = await getDashboardSnapshot();
    setSnapshot(next);
    setStatusMessage(next.sales.length || next.expenses.length || next.giveaways.length ? 'Sales, profit, expense, giveaway, and monthly totals are up to date.' : 'Add products, sales, expenses, and giveaways to build the monthly summary.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  const availableMonths = useMemo(() => getAvailableReportMonths(snapshot), [snapshot]);
  useEffect(() => {
    if (!availableMonths.length) {
      setSelectedMonth(ALL_MONTHS_KEY);
      return;
    }
    if (selectedMonth === ALL_MONTHS_KEY) {
      return;
    }
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const filteredSales = useMemo(() => filterRowsByMonth(snapshot?.sales ?? [], selectedMonth), [snapshot?.sales, selectedMonth]);
  const filteredExpenses = useMemo(() => filterRowsByMonth(snapshot?.expenses ?? [], selectedMonth), [snapshot?.expenses, selectedMonth]);
  const filteredGiveaways = useMemo(() => filterRowsByMonth(snapshot?.giveaways ?? [], selectedMonth), [snapshot?.giveaways, selectedMonth]);
  const scopeLabel = useMemo(() => getScopeLabel(selectedMonth, availableMonths), [selectedMonth, availableMonths]);
  const filteredBakerySales = useMemo(() => filteredSales.filter((item) => item.businessType === 'bakery'), [filteredSales]);
  const filteredCraftSales = useMemo(() => filteredSales.filter((item) => item.businessType === 'craft'), [filteredSales]);
  const filteredBakeryExpenses = useMemo(() => filteredExpenses.filter((item) => item.businessType === 'bakery'), [filteredExpenses]);
  const filteredCraftExpenses = useMemo(() => filteredExpenses.filter((item) => item.businessType === 'craft'), [filteredExpenses]);
  const reconciliationRows = useMemo(() => buildReconciliationRows(snapshot, selectedMonth), [snapshot, selectedMonth]);
  const topItems = useMemo(() => buildSummaryTopItems(filteredSales), [filteredSales]);

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Monthly Summary" title="Monthly summary" subtitle="Sales, earned commission, vendor balances, expenses, giveaways, net, and top items across Bakery and Crafts." />

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Overview</Text>
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      </View>

      <Card>
        <SectionHeader title="Month scope" subtitle={`Reporting scope: ${scopeLabel}`} />
        <MonthFilterBar selectedMonth={selectedMonth} months={availableMonths} onSelect={setSelectedMonth} />
      </Card>

      <Card>
        <SectionHeader title="Top numbers" subtitle={`The main reporting totals for ${scopeLabel}.`} />
        <Text style={styles.helpText}>My Product profit stays separate from 3rd-party commission so vendor money does not get blended into your earnings.</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumSales(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Total sales</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumMyProductSales(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>My product sales</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumThirdPartySales(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>3rd party sales</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumMyProductProfit(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>My product profit</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumThirdPartyCommission(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>3rd party commission earned</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumProfit(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Total earned before expenses</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumVendorOwed(filteredSales), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Amount owed to vendors</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumVendorPayments(filteredExpenses), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Amount paid to vendors</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(Number((sumVendorOwed(filteredSales) - sumVendorPayments(filteredExpenses)).toFixed(2)), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Outstanding vendor balance</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumExpenses(filteredExpenses), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Expenses</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumGiveawayValue(filteredGiveaways), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Giveaway value</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(sumGiveawayCost(filteredGiveaways), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Giveaway cost</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(Number(((sumMyProductProfit(filteredSales) + sumThirdPartyCommission(filteredSales)) - sumExpenses(filteredExpenses)).toFixed(2)), '$', 2)}</Text>
            <Text style={styles.metricLabel}>Net</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatWithUnit(Number((((sumMyProductProfit(filteredSales) + sumThirdPartyCommission(filteredSales)) - sumExpenses(filteredExpenses)) - sumGiveawayCost(filteredGiveaways)).toFixed(2)), '$', 2)}</Text>
            <Text style={styles.metricLabel}>True net</Text>
          </View>
          <View style={styles.metricTile}>
            <Text style={styles.metricValue}>{formatNumber(filteredSales.length, 0)}</Text>
            <Text style={styles.metricLabel}>Sales rows</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeader title="Reconciliation" subtitle="Cross-check the trusted row totals by month." />
        {reconciliationRows.length ? reconciliationRows.map((month) => (
          <StatRow key={month.month} label={month.month} value={`${formatWithUnit(month.sales, '$', 2)} total sales · ${formatWithUnit(month.myProductSales ?? 0, '$', 2)} my product sales · ${formatWithUnit(month.thirdPartySales ?? 0, '$', 2)} 3rd party sales · ${formatWithUnit(month.myProductProfit ?? 0, '$', 2)} my product profit · ${formatWithUnit(month.thirdPartyCommissionEarned ?? 0, '$', 2)} commission earned · ${formatWithUnit(month.vendorOwed ?? 0, '$', 2)} vendor owed · ${formatWithUnit(month.vendorPayments ?? 0, '$', 2)} vendor paid · ${formatWithUnit(month.expenses, '$', 2)} expenses · ${formatWithUnit(month.net, '$', 2)} net · ${formatWithUnit(month.trueNet, '$', 2)} true net`} />
        )) : <Text style={styles.emptyText}>No monthly summary rows yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Giveaway impact" subtitle="Promo and freebie rows stay separate from paid sales." />
        <StatRow label="Selected giveaway value" value={formatWithUnit(sumGiveawayValue(filteredGiveaways), '$', 2)} />
        <StatRow label="Selected giveaway cost" value={formatWithUnit(sumGiveawayCost(filteredGiveaways), '$', 2)} />
        <StatRow label="Giveaway rows saved" value={formatNumber(filteredGiveaways.length, 0)} />
      </Card>

      <Card>
        <SectionHeader title="Bakery and Crafts" subtitle={`Split for ${scopeLabel}. Sell-unit totals are counted as sell units rather than physical pieces.`} />
        <View style={styles.businessGrid}>
          <View style={styles.businessCard}>
            <Text style={styles.businessTitle}>Bakery</Text>
            <StatRow label="Total Sales" value={formatWithUnit(sumSales(filteredBakerySales), '$', 2)} />
            <StatRow label="My Product Sales" value={formatWithUnit(sumMyProductSales(filteredBakerySales), '$', 2)} />
            <StatRow label="3rd Party Sales" value={formatWithUnit(sumThirdPartySales(filteredBakerySales), '$', 2)} />
            <StatRow label="My Product Profit" value={formatWithUnit(sumMyProductProfit(filteredBakerySales), '$', 2)} />
            <StatRow label="3rd Party Commission" value={formatWithUnit(sumThirdPartyCommission(filteredBakerySales), '$', 2)} />
            <StatRow label="Vendor Outstanding" value={formatWithUnit(Number((sumVendorOwed(filteredBakerySales) - sumVendorPayments(filteredBakeryExpenses)).toFixed(2)), '$', 2)} />
            <StatRow label="Sell units sold" value={formatNumber(sumQuantity(filteredBakerySales), 0)} />
          </View>
          <View style={styles.businessCard}>
            <Text style={styles.businessTitle}>Crafts</Text>
            <StatRow label="Total Sales" value={formatWithUnit(sumSales(filteredCraftSales), '$', 2)} />
            <StatRow label="My Product Sales" value={formatWithUnit(sumMyProductSales(filteredCraftSales), '$', 2)} />
            <StatRow label="3rd Party Sales" value={formatWithUnit(sumThirdPartySales(filteredCraftSales), '$', 2)} />
            <StatRow label="My Product Profit" value={formatWithUnit(sumMyProductProfit(filteredCraftSales), '$', 2)} />
            <StatRow label="3rd Party Commission" value={formatWithUnit(sumThirdPartyCommission(filteredCraftSales), '$', 2)} />
            <StatRow label="Vendor Outstanding" value={formatWithUnit(Number((sumVendorOwed(filteredCraftSales) - sumVendorPayments(filteredCraftExpenses)).toFixed(2)), '$', 2)} />
            <StatRow label="Sell units sold" value={formatNumber(sumQuantity(filteredCraftSales), 0)} />
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeader title="Recent saved sales" subtitle={`Newest sales rows for ${scopeLabel}.`} />
        {filteredSales.length ? filteredSales.slice(0, 5).map((sale) => (
          <StatRow key={sale.saleId} label={`${sale.productName} · ${getProductSellUnitDescription(sale)} · ${sale.businessType === 'bakery' ? 'Bakery' : 'Craft'} · ${sale.productType === 'third-party' ? '3rd Party' : 'My Product'} · ${sale.date}`} value={sale.productType === 'third-party' ? `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold · ${formatWithUnit(sale.totalSale, '$', 2)} row total · ${formatWithUnit(sale.commissionEarned ?? 0, '$', 2)} commission · ${formatWithUnit(sale.vendorShare ?? 0, '$', 2)} vendor share${sale.vendorName ? ` · ${sale.vendorName}` : ''}` : `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold · ${formatWithUnit(sale.totalSale, '$', 2)} · ${sale.costMissing ? 'Cost Pending, profit not trusted yet' : getSaleProfitStatusLabel(sale)}`} />
        )) : <Text style={styles.emptyText}>No sales saved yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Top items overall" subtitle={`Top-selling items for ${scopeLabel}.`} />
        {topItems.length ? topItems.map((item) => (
          <StatRow key={item.productId} label={`${item.name} · ${item.businessType === 'bakery' ? 'Bakery' : 'Craft'} · ${getProductSellUnitDescription(item)}`} value={`${formatNumber(item.quantitySold, 0)} ${getProductSellUnitLabel(item, item.quantitySold)} sold`} />
        )) : <Text style={styles.emptyText}>No sales yet.</Text>}
      </Card>

    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    gap: 2,
  },
  statusLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusMessage: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  metricTile: {
    minWidth: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.softSurface,
    padding: theme.spacing.sm,
    gap: 4,
  },
  metricValue: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  metricLabel: { color: theme.colors.mutedText, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  businessGrid: { gap: theme.spacing.sm },
  businessCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.softSurface,
    padding: theme.spacing.sm,
    gap: 2,
  },
  businessTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  groupTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  helpText: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18, marginBottom: theme.spacing.xs },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
});

function buildSummaryTopItems(sales: Array<Awaited<ReturnType<typeof getDashboardSnapshot>>['sales'][number]>) {
  const items = new Map<string, { productId: string, name: string, businessType: 'bakery' | 'craft', quantitySold: number, sellUnitType: 'each' | 'loaf' | 'pack' | 'custom', customUnitName: string | null, packSize: number | null }>();
  for (const sale of sales) {
    const existing = items.get(sale.productId);
    if (existing) {
      existing.quantitySold += Number(sale.quantitySold || 0);
      continue;
    }
    items.set(sale.productId, {
      productId: sale.productId,
      name: sale.productName,
      businessType: sale.businessType,
      quantitySold: Number(sale.quantitySold || 0),
      sellUnitType: sale.sellUnitType,
      customUnitName: sale.customUnitName,
      packSize: sale.packSize,
    });
  }
  return [...items.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);
}
