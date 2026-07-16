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
import { ALL_MONTHS_KEY, filterRowsByMonth, getAvailableReportMonths, getScopeLabel } from '../supabase/src/features/business/reporting';
import { getDashboardSnapshot, getProductSellUnitDescription, getProductSellUnitLabel, subscribeBusinessState } from '../supabase/src/features/business/store';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

type ProductPerformance = {
  productId: string;
  productName: string;
  businessType: 'bakery' | 'craft';
  quantitySold: number;
  sales: number;
  profit: number;
  sellUnitType: 'each' | 'loaf' | 'pack' | 'custom';
  customUnitName: string | null;
  packSize: number | null;
  costPendingRows: number;
};

export default function TopItemsScreen() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const [statusMessage, setStatusMessage] = useState('Loading current-month best sellers…');
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS_KEY);

  const refresh = useCallback(async () => {
    const next = await getDashboardSnapshot();
    setSnapshot(next);
    setStatusMessage(next.sales.length
      ? 'Best sellers are ranked from the saved sales inside the selected scope.'
      : 'Add some sales to see product performance.');
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
  const monthSales = useMemo(() => filterRowsByMonth(snapshot?.sales ?? [], selectedMonth), [snapshot?.sales, selectedMonth]);
  const overallItems = useMemo(() => buildProductPerformance(monthSales), [monthSales]);
  const bakeryItems = useMemo(() => overallItems.filter((item) => item.businessType === 'bakery'), [overallItems]);
  const craftItems = useMemo(() => overallItems.filter((item) => item.businessType === 'craft'), [overallItems]);

  const byUnits = useMemo(() => [...overallItems].sort((a, b) => b.quantitySold - a.quantitySold || b.sales - a.sales).slice(0, 8), [overallItems]);
  const bySales = useMemo(() => [...overallItems].sort((a, b) => b.sales - a.sales || b.quantitySold - a.quantitySold).slice(0, 8), [overallItems]);
  const byProfit = useMemo(() => [...overallItems].sort((a, b) => b.profit - a.profit || b.sales - a.sales).slice(0, 8), [overallItems]);

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Top Items" title="Top items" subtitle="Current-month best sellers, sales, and profit for smarter product decisions." />

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Best sellers</Text>
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      </View>

      <Card>
        <SectionHeader title="Month scope" subtitle={`Top Items scope: ${scopeLabel}`} />
        <MonthFilterBar selectedMonth={selectedMonth} months={availableMonths} onSelect={setSelectedMonth} />
      </Card>

      <Card>
        <SectionHeader title="Best sellers overall" subtitle={`Ranked for ${scopeLabel} by units sold, sales, and profit.`} />
        <Text style={styles.helpText}>Profit rankings only reflect trusted profit. Cost Pending rows keep sales counts but do not add trusted profit until cost is entered.</Text>
        <Text style={styles.groupTitle}>By units sold</Text>
        {byUnits.length ? byUnits.map((item, index) => (
          <PerformanceRow key={`units-${item.productId}`} item={item} rank={index + 1} />
        )) : <Text style={styles.emptyText}>No current-month sales yet.</Text>}

        <Text style={styles.groupTitle}>By sales</Text>
        {bySales.length ? bySales.map((item, index) => (
          <PerformanceRow key={`sales-${item.productId}`} item={item} rank={index + 1} />
        )) : null}

        <Text style={styles.groupTitle}>By profit</Text>
        {byProfit.length ? byProfit.map((item, index) => (
          <PerformanceRow key={`profit-${item.productId}`} item={item} rank={index + 1} />
        )) : null}
      </Card>

      <Card>
        <SectionHeader title="Bakery best sellers" subtitle={`Bakery product performance for ${scopeLabel}.`} />
        {bakeryItems.length ? [...bakeryItems].sort((a, b) => b.quantitySold - a.quantitySold || b.sales - a.sales).map((item, index) => (
          <PerformanceRow key={`bakery-${item.productId}`} item={item} rank={index + 1} />
        )) : <Text style={styles.emptyText}>No Bakery sales this month yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Crafts best sellers" subtitle={`Crafts product performance for ${scopeLabel}.`} />
        {craftItems.length ? [...craftItems].sort((a, b) => b.quantitySold - a.quantitySold || b.sales - a.sales).map((item, index) => (
          <PerformanceRow key={`craft-${item.productId}`} item={item} rank={index + 1} />
        )) : <Text style={styles.emptyText}>No Crafts sales this month yet.</Text>}
      </Card>
    </AppScreen>
  );
}

function buildProductPerformance(monthSales: NonNullable<Awaited<ReturnType<typeof getDashboardSnapshot>>['sales']>) {
  const map = new Map<string, ProductPerformance>();

  for (const sale of monthSales) {
    const existing = map.get(sale.productId);
    if (existing) {
      existing.quantitySold = Number((existing.quantitySold + Number(sale.quantitySold || 0)).toFixed(0));
      existing.sales = Number((existing.sales + Number(sale.totalSale || 0)).toFixed(2));
      existing.profit = Number((existing.profit + Number(sale.estimatedProfit || 0)).toFixed(2));
      existing.costPendingRows = existing.costPendingRows + (sale.costMissing ? 1 : 0);
      continue;
    }

    map.set(sale.productId, {
      productId: sale.productId,
      productName: sale.productName,
      businessType: sale.businessType,
      quantitySold: Number(sale.quantitySold || 0),
      sales: Number(sale.totalSale || 0),
      profit: Number(sale.estimatedProfit || 0),
      sellUnitType: sale.sellUnitType,
      customUnitName: sale.customUnitName,
      packSize: sale.packSize,
      costPendingRows: sale.costMissing ? 1 : 0,
    });
  }

  return [...map.values()];
}

function PerformanceRow({ item, rank }: { item: ProductPerformance, rank: number }) {
  return (
    <View style={styles.performanceCard}>
      <View style={styles.performanceTopRow}>
        <Text style={styles.rankBadge}>#{rank}</Text>
        <View style={styles.performanceTitleBlock}>
          <Text style={styles.performanceTitle}>{item.productName}</Text>
          <Text style={styles.performanceMeta}>{item.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · {getProductSellUnitDescription(item)}</Text>
        </View>
      </View>

      <View style={styles.performanceStats}>
        <StatRow label="Units sold" value={`${formatNumber(item.quantitySold, 0)} ${getProductSellUnitLabel(item, item.quantitySold)} sold`} />
        <StatRow label="Sales" value={formatWithUnit(item.sales, '$', 2)} />
        <StatRow label="Profit" value={item.costPendingRows ? `${formatWithUnit(item.profit, '$', 2)} trusted · Cost Pending rows: ${formatNumber(item.costPendingRows, 0)}` : formatWithUnit(item.profit, '$', 2)} />
      </View>
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
  groupTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  helpText: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18, marginBottom: theme.spacing.xs },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
  performanceCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.softSurface,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    gap: 4,
  },
  performanceTopRow: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  rankBadge: {
    minWidth: 42,
    textAlign: 'center',
    color: theme.colors.primaryText,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontWeight: '800',
  },
  performanceTitleBlock: { flex: 1, gap: 2 },
  performanceTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  performanceMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '600' },
  performanceStats: { gap: 2 },
});
