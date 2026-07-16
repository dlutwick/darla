import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Card } from '../supabase/src/components/ui/Card';
import { MonthFilterBar } from '../supabase/src/components/ui/MonthFilterBar';
import { RecordActionRow } from '../supabase/src/components/ui/RecordActionRow';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { theme } from '../supabase/src/constants/theme';
import { ALL_MONTHS_KEY, filterRowsByMonth, getAvailableReportMonths, getScopeLabel, sumExpenses, sumGiveawayCost, sumMyProductProfit, sumMyProductSales, sumProfit, sumSales, sumThirdPartyCommission, sumThirdPartySales, sumVendorOwed, sumVendorPayments } from '../supabase/src/features/business/reporting';
import { getDashboardSnapshot, getSaleProfitStatusLabel, subscribeBusinessState, voidExpense, voidGiveaway, voidSale } from '../supabase/src/features/business/store';
import { confirmAction } from '../supabase/src/lib/confirmAction';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

export default function MoneyScreen() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const [statusMessage, setStatusMessage] = useState('Loading sales, expenses, giveaways, and net totals…');
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS_KEY);

  const refresh = useCallback(async () => {
    const next = await getDashboardSnapshot();
    setSnapshot(next);
    setStatusMessage(next.sales.length || next.expenses.length || next.giveaways.length
      ? 'Money totals are up to date from saved sales, commission, vendor payments, expenses, and giveaways.'
      : 'Add sales, expenses, and giveaways to build your money picture.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  const availableMonths = useMemo(() => getAvailableReportMonths(snapshot), [snapshot]);
  useEffect(() => {
    if (!availableMonths.length) {
      setSelectedMonth(ALL_MONTHS_KEY);
      return;
    }
    if (selectedMonth === ALL_MONTHS_KEY) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const scopeLabel = useMemo(() => getScopeLabel(selectedMonth, availableMonths), [selectedMonth, availableMonths]);

  const monthSalesRows = useMemo(() => filterRowsByMonth(snapshot?.sales ?? [], selectedMonth), [snapshot?.sales, selectedMonth]);
  const monthExpenseRows = useMemo(() => filterRowsByMonth(snapshot?.expenses ?? [], selectedMonth), [snapshot?.expenses, selectedMonth]);
  const monthGiveawayRows = useMemo(() => filterRowsByMonth(snapshot?.giveaways ?? [], selectedMonth), [snapshot?.giveaways, selectedMonth]);

  const bakeryMonthSales = useMemo(() => monthSalesRows.filter((sale) => sale.businessType === 'bakery'), [monthSalesRows]);
  const craftMonthSales = useMemo(() => monthSalesRows.filter((sale) => sale.businessType === 'craft'), [monthSalesRows]);
  const bakeryMonthExpenses = useMemo(() => monthExpenseRows.filter((expense) => expense.businessType === 'bakery'), [monthExpenseRows]);
  const craftMonthExpenses = useMemo(() => monthExpenseRows.filter((expense) => expense.businessType === 'craft'), [monthExpenseRows]);
  const bakeryMonthGiveaways = useMemo(() => monthGiveawayRows.filter((giveaway) => giveaway.businessType === 'bakery'), [monthGiveawayRows]);
  const craftMonthGiveaways = useMemo(() => monthGiveawayRows.filter((giveaway) => giveaway.businessType === 'craft'), [monthGiveawayRows]);

  const recentMoneyActivity = useMemo(() => {
    const sales = monthSalesRows.slice(0, 5).map((sale) => ({
      key: `sale-${sale.saleId}`,
      type: 'sale' as const,
      id: sale.saleId,
      label: `${sale.productName} sale`,
      meta: `${sale.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${sale.date} · ${sale.productType === 'third-party' ? '3rd Party' : 'My Product'}`,
      value: sale.productType === 'third-party'
        ? `${formatWithUnit(sale.totalSale, '$', 2)} row total · ${formatWithUnit(sale.commissionEarned ?? 0, '$', 2)} commission · ${formatWithUnit(sale.vendorShare ?? 0, '$', 2)} vendor share${sale.vendorName ? ` · ${sale.vendorName}` : ''}`
        : `${formatWithUnit(sale.totalSale, '$', 2)} row total · ${sale.costMissing ? 'Cost Pending · Profit not trusted yet' : getSaleProfitStatusLabel(sale)}`,
      note: sale.note || sale.notes || 'No note saved.',
    }));

    const expenses = monthExpenseRows.slice(0, 5).map((expense) => ({
      key: `expense-${expense.expenseId}`,
      type: 'expense' as const,
      id: expense.expenseId,
      label: expense.expenseType === 'vendor-payment' ? 'Vendor payment' : `${expense.expenseCategory} expense`,
      meta: `${expense.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${expense.date}${expense.vendor ? ` · ${expense.vendor}` : ''}`,
      value: formatWithUnit(expense.amount, '$', 2),
      note: expense.note || expense.notes || 'No note saved.',
    }));

    const giveaways = monthGiveawayRows.slice(0, 5).map((giveaway) => ({
      key: `giveaway-${giveaway.giveawayId}`,
      type: 'giveaway' as const,
      id: giveaway.giveawayId,
      label: `${giveaway.productName} giveaway`,
      meta: `${giveaway.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${giveaway.date}`,
      value: `${formatWithUnit(giveaway.estimatedSaleValue, '$', 2)} value · ${formatWithUnit(giveaway.estimatedCost, '$', 2)} cost`,
      note: giveaway.reason || giveaway.note || giveaway.notes || 'No reason saved.',
    }));

    return [...sales, ...expenses, ...giveaways]
      .sort((a, b) => b.meta.localeCompare(a.meta))
      .slice(0, 6);
  }, [monthExpenseRows, monthGiveawayRows, monthSalesRows]);

  const totalEarnedBeforeExpenses = sumProfit(monthSalesRows);
  const totalExpenses = sumExpenses(monthExpenseRows);
  const totalGiveawayCost = sumGiveawayCost(monthGiveawayRows);
  const totalNet = Number((totalEarnedBeforeExpenses - totalExpenses).toFixed(2));
  const totalTrueNet = Number((totalNet - totalGiveawayCost).toFixed(2));

  async function handleVoidActivity(item: typeof recentMoneyActivity[number]) {
    try {
      if (item.type === 'sale') await voidSale(item.id);
      if (item.type === 'expense') await voidExpense(item.id);
      if (item.type === 'giveaway') await voidGiveaway(item.id);
      setStatusMessage(`${item.label} voided. Totals updated.`);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Could not void ${item.type} row.`;
      setStatusMessage(message);
      Alert.alert(`Could not void ${item.type} row`, message);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Money" title="Money view" subtitle="The clearest split between full sales, earned commission, vendor balances, expenses, and net." />

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Money</Text>
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      </View>

      <Card>
        <SectionHeader title="Month scope" subtitle={`Money view scope: ${scopeLabel}`} />
        <MonthFilterBar selectedMonth={selectedMonth} months={availableMonths} onSelect={setSelectedMonth} />
      </Card>

      <Card>
        <SectionHeader title="Sales" subtitle={`Full sales totals for ${scopeLabel}.`} />
        <View style={styles.metricGrid}>
          <MetricTile label="Total Sales" value={formatWithUnit(sumSales(monthSalesRows), '$', 2)} />
          <MetricTile label="My Product Sales" value={formatWithUnit(sumMyProductSales(monthSalesRows), '$', 2)} />
          <MetricTile label="3rd Party Sales" value={formatWithUnit(sumThirdPartySales(monthSalesRows), '$', 2)} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Earnings" subtitle="Only earned money counts here — vendor money stays separate." />
        <View style={styles.metricGrid}>
          <MetricTile label="My Product Profit" value={formatWithUnit(sumMyProductProfit(monthSalesRows), '$', 2)} />
          <MetricTile label="3rd Party Commission Earned" value={formatWithUnit(sumThirdPartyCommission(monthSalesRows), '$', 2)} />
          <MetricTile label="Total Earned Before Expenses" value={formatWithUnit(totalEarnedBeforeExpenses, '$', 2)} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Vendor" subtitle="What is owed, what has been paid, and what is still outstanding." />
        <View style={styles.metricGrid}>
          <MetricTile label="Amount Owed to Vendors" value={formatWithUnit(sumVendorOwed(monthSalesRows), '$', 2)} />
          <MetricTile label="Amount Paid to Vendors" value={formatWithUnit(sumVendorPayments(monthExpenseRows), '$', 2)} />
          <MetricTile label="Outstanding Vendor Balance" value={formatWithUnit(Number((sumVendorOwed(monthSalesRows) - sumVendorPayments(monthExpenseRows)).toFixed(2)), '$', 2)} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Bottom line" subtitle="Net uses earnings minus expenses. True net also subtracts giveaway cost." />
        <View style={styles.metricGrid}>
          <MetricTile label="Expenses" value={formatWithUnit(totalExpenses, '$', 2)} />
          <MetricTile label="Giveaway Cost" value={formatWithUnit(totalGiveawayCost, '$', 2)} />
          <MetricTile label="Net" value={formatWithUnit(totalNet, '$', 2)} />
          <MetricTile label="True Net" value={formatWithUnit(totalTrueNet, '$', 2)} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Bakery vs Crafts" subtitle={`Split for ${scopeLabel}, with 3rd-party commission handled separately inside each business line.`} />
        <View style={styles.splitGrid}>
          <MoneyBlock title="Bakery" sales={bakeryMonthSales} expenses={bakeryMonthExpenses} giveaways={bakeryMonthGiveaways} />
          <MoneyBlock title="Crafts" sales={craftMonthSales} expenses={craftMonthExpenses} giveaways={craftMonthGiveaways} />
        </View>
      </Card>

      <Card>
        <SectionHeader title="Recent money activity" subtitle={`Newest sales, expenses, and giveaways for ${scopeLabel}.`} />
        {recentMoneyActivity.length ? recentMoneyActivity.map((item) => (
          <View key={item.key} style={styles.activityCard}>
            <StatRow label={`${item.label} · ${item.meta}`} value={item.value} />
            <RecordActionRow
              onView={() => Alert.alert(item.label, `${item.meta}\n${item.value}\n${item.note}`)}
              onEdit={() => router.push(item.type === 'sale' ? { pathname: '/sale', params: { saleId: item.id } } : item.type === 'expense' ? { pathname: '/expenses', params: { expenseId: item.id } } : { pathname: '/giveaways', params: { giveawayId: item.id } })}
              onDelete={() => confirmAction({
                title: `Void ${item.type} row?`,
                message: `${item.label} will be marked voided and removed from totals until restored in History.`,
                confirmLabel: 'Void',
                onConfirm: () => { void handleVoidActivity(item); },
              })}
              deleteLabel="Void"
            />
          </View>
        )) : <Text style={styles.emptyText}>No recent sales, expenses, or giveaways yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Counts" subtitle="Quick row counts from the same saved history used elsewhere in the app." />
        <StatRow label="Sales rows" value={formatNumber(monthSalesRows.length, 0)} />
        <StatRow label="Expense rows" value={formatNumber(monthExpenseRows.length, 0)} />
        <StatRow label="Giveaway rows" value={formatNumber(monthGiveawayRows.length, 0)} />
      </Card>
    </AppScreen>
  );
}

function MetricTile({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MoneyBlock({ title, sales, expenses, giveaways }: { title: string, sales: Awaited<ReturnType<typeof getDashboardSnapshot>>['sales'], expenses: Awaited<ReturnType<typeof getDashboardSnapshot>>['expenses'], giveaways: Awaited<ReturnType<typeof getDashboardSnapshot>>['giveaways'] }) {
  const totalEarnedBeforeExpenses = sumProfit(sales);
  const expensesOnly = sumExpenses(expenses);
  const giveawayCost = sumGiveawayCost(giveaways);
  const net = Number((totalEarnedBeforeExpenses - expensesOnly).toFixed(2));
  const trueNet = Number((net - giveawayCost).toFixed(2));

  return (
    <View style={styles.moneyBlock}>
      <Text style={styles.moneyTitle}>{title}</Text>
      <StatRow label="Total Sales" value={formatWithUnit(sumSales(sales), '$', 2)} />
      <StatRow label="My Product Sales" value={formatWithUnit(sumMyProductSales(sales), '$', 2)} />
      <StatRow label="3rd Party Sales" value={formatWithUnit(sumThirdPartySales(sales), '$', 2)} />
      <StatRow label="My Product Profit" value={formatWithUnit(sumMyProductProfit(sales), '$', 2)} />
      <StatRow label="3rd Party Commission Earned" value={formatWithUnit(sumThirdPartyCommission(sales), '$', 2)} />
      <StatRow label="Amount Owed to Vendors" value={formatWithUnit(sumVendorOwed(sales), '$', 2)} />
      <StatRow label="Amount Paid to Vendors" value={formatWithUnit(sumVendorPayments(expenses), '$', 2)} />
      <StatRow label="Outstanding Vendor Balance" value={formatWithUnit(Number((sumVendorOwed(sales) - sumVendorPayments(expenses)).toFixed(2)), '$', 2)} />
      <StatRow label="Expenses" value={formatWithUnit(expensesOnly, '$', 2)} />
      <StatRow label="Giveaway Cost" value={formatWithUnit(giveawayCost, '$', 2)} />
      <StatRow label="Net" value={formatWithUnit(net, '$', 2)} />
      <StatRow label="True Net" value={formatWithUnit(trueNet, '$', 2)} />
    </View>
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
  splitGrid: { gap: theme.spacing.sm },
  moneyBlock: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.softSurface,
    padding: theme.spacing.sm,
    gap: 2,
  },
  moneyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
  activityCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.softSurface,
    padding: theme.spacing.sm,
    gap: 4,
  },
});
