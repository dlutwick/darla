import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { MonthFilterBar } from '../supabase/src/components/ui/MonthFilterBar';
import { RecordActionRow } from '../supabase/src/components/ui/RecordActionRow';
import { theme } from '../supabase/src/constants/theme';
import { ALL_MONTHS_KEY, filterRowsByMonth, getAvailableReportMonths, getScopeLabel, sumExpenses, sumGiveawayCost, sumSales, sumThirdPartyCommission, sumThirdPartySales, sumVendorOwed, sumVendorPayments } from '../supabase/src/features/business/reporting';
import { getDashboardSnapshot, getProductSellUnitDescription, getProductSellUnitLabel, getSaleProfitStatusLabel, subscribeBusinessState, voidSale } from '../supabase/src/features/business/store';
import { confirmAction } from '../supabase/src/lib/confirmAction';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

const PRIMARY_ACTIONS = [
  { label: 'Add sale', route: '/sale', emphasis: 'primary' as const },
  { label: 'Add product', route: '/product', emphasis: 'secondary' as const },
];

const QUICK_LINKS = [
  { label: 'Expenses', route: '/expenses' },
  { label: 'Giveaways', route: '/giveaways' },
  { label: 'Inventory', route: '/inventory' },
  { label: 'Summary', route: '/summary' },
  { label: 'History & CSV', route: '/history' },
];

export default function HomeScreen() {
  const params = useLocalSearchParams<{ savedSale?: string, saleName?: string, savedExpense?: string, expenseCategory?: string, savedGiveaway?: string, giveawayName?: string }>();
  const [statusMessage, setStatusMessage] = useState('Loading your business dashboard…');
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS_KEY);

  const refresh = useCallback(async () => {
    try {
      const next = await getDashboardSnapshot();
      setSnapshot(next);
      if (params.savedSale === '1') {
        setStatusMessage(params.saleName ? `${params.saleName} sale saved successfully.` : 'Sale saved successfully.');
      } else if (params.savedExpense === '1') {
        setStatusMessage(params.expenseCategory ? `${params.expenseCategory} expense saved successfully.` : 'Expense saved successfully.');
      } else if (params.savedGiveaway === '1') {
        setStatusMessage(params.giveawayName ? `${params.giveawayName} giveaway saved successfully.` : 'Giveaway saved successfully.');
      } else {
        setStatusMessage(next.productSnapshots.length
          ? 'Ready for fast market sales and quick product updates.'
          : 'Start with Add product so sales are ready when you need them.');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load the business dashboard.');
    }
  }, [params.expenseCategory, params.giveawayName, params.saleName, params.savedExpense, params.savedGiveaway, params.savedSale]);

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

  const bakeryProducts = useMemo(() => snapshot?.productSnapshots.filter((item) => item.businessType === 'bakery') ?? [], [snapshot?.productSnapshots]);
  const craftProducts = useMemo(() => snapshot?.productSnapshots.filter((item) => item.businessType === 'craft') ?? [], [snapshot?.productSnapshots]);
  const bakeryLowStock = bakeryProducts.filter((item) => item.lowStock);
  const craftLowStock = craftProducts.filter((item) => item.lowStock);
  const filteredSales = useMemo(() => filterRowsByMonth(snapshot?.sales ?? [], selectedMonth), [snapshot?.sales, selectedMonth]);
  const filteredExpenses = useMemo(() => filterRowsByMonth(snapshot?.expenses ?? [], selectedMonth), [snapshot?.expenses, selectedMonth]);
  const filteredGiveaways = useMemo(() => filterRowsByMonth(snapshot?.giveaways ?? [], selectedMonth), [snapshot?.giveaways, selectedMonth]);
  const recentSales = filteredSales.slice(0, 5);
  const urgentAction = bakeryLowStock.length + craftLowStock.length;
  const filteredBakerySales = useMemo(() => filteredSales.filter((item) => item.businessType === 'bakery'), [filteredSales]);
  const filteredCraftSales = useMemo(() => filteredSales.filter((item) => item.businessType === 'craft'), [filteredSales]);
  const thirdPartySales = useMemo(() => sumThirdPartySales(filteredSales), [filteredSales]);
  const thirdPartyCommission = useMemo(() => sumThirdPartyCommission(filteredSales), [filteredSales]);
  const vendorOwed = useMemo(() => sumVendorOwed(filteredSales), [filteredSales]);
  const vendorPaid = useMemo(() => sumVendorPayments(filteredExpenses), [filteredExpenses]);
  const vendorStillOwing = useMemo(() => Number((vendorOwed - vendorPaid).toFixed(2)), [vendorOwed, vendorPaid]);

  const nextStep = useMemo(() => {
    if (!snapshot?.productSnapshots.length) {
      return 'Tap Add product first';
    }
    if (snapshot.lowStockItems.length) {
      return 'Restock low items';
    }
    return 'Record a sale';
  }, [snapshot]);

  return (
    <AppScreen>
      <View style={styles.launchCard}>
        <View style={styles.launchHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Home</Text>
            <Text style={styles.title}>Market dashboard</Text>
            <Text style={styles.subtitle}>Fast to scan, fast to tap, clear for Bakery and Crafts.</Text>
          </View>
          <View style={styles.launchMeta}>
            <Text style={styles.metaLabel}>Next</Text>
            <Text style={styles.metaValue}>{nextStep}</Text>
          </View>
        </View>

        <View style={styles.statusStrip}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>

        <View style={styles.primaryActionGrid}>
          {PRIMARY_ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              style={[styles.primaryAction, action.emphasis === 'primary' ? styles.primaryActionMain : styles.primaryActionAlt]}
              onPress={() => router.push(action.route as never)}
            >
              <Text style={[styles.primaryActionLabel, action.emphasis === 'primary' ? styles.primaryActionLabelMain : styles.primaryActionLabelAlt]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

      <View style={styles.quickLinkRow}>
          {QUICK_LINKS.map((link) => (
            <Pressable key={link.label} style={styles.quickLink} onPress={() => router.push(link.route as never)}>
              <Text style={styles.quickLinkLabel}>{link.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.exportCallout} onPress={() => router.push('/history')}>
          <View>
            <Text style={styles.exportCalloutTitle}>Open History for CSV exports</Text>
            <Text style={styles.exportCalloutMeta}>Export Sales, Expenses, Products, Inventory, and Summary files from one screen.</Text>
          </View>
          <Text style={styles.exportCalloutArrow}>Open</Text>
        </Pressable>
      </View>

      <View style={styles.scopeCard}>
        <Text style={styles.scopeTitle}>Reporting scope</Text>
        <Text style={styles.scopeText}>{scopeLabel}</Text>
        <MonthFilterBar selectedMonth={selectedMonth} months={availableMonths} onSelect={setSelectedMonth} />
      </View>

      <View style={styles.thirdPartyCard}>
        <View style={styles.thirdPartyHeaderRow}>
          <Text style={styles.thirdPartyTitle}>3rd Party</Text>
          <Text style={styles.thirdPartySubtitle}>Quick vendor snapshot</Text>
        </View>
        <View style={styles.thirdPartyGrid}>
          <CompactStat label="3rd Party Sales" value={formatWithUnit(thirdPartySales, '$', 2)} />
          <CompactStat label="Commission Earned" value={formatWithUnit(thirdPartyCommission, '$', 2)} />
          <CompactStat label="Owed to Vendor" value={formatWithUnit(vendorOwed, '$', 2)} />
          <CompactStat label="Paid to Vendor" value={formatWithUnit(vendorPaid, '$', 2)} />
          <CompactStat label="Still Owing" value={formatWithUnit(vendorStillOwing, '$', 2)} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <CompactStat label="Sales" value={formatWithUnit(sumSales(filteredSales), '$', 2)} />
        <CompactStat label="Expenses" value={formatWithUnit(sumExpenses(filteredExpenses), '$', 2)} />
        <CompactStat label="Giveaway cost" value={formatWithUnit(sumGiveawayCost(filteredGiveaways), '$', 2)} />
        <CompactStat label="Low stock" value={formatNumber(snapshot?.lowStockItems.length, 0)} />
        <CompactStat label="Sales rows" value={formatNumber(filteredSales.length, 0)} />
      </View>

      <View style={styles.splitGrid}>
        <BusinessCard
          title="Bakery"
          subtitle="Sweet Tarts"
          productCount={bakeryProducts.length}
          sellUnitsSold={filteredBakerySales.reduce((sum, sale) => sum + Number(sale.quantitySold || 0), 0)}
          lowStockCount={bakeryLowStock.length}
          sales={sumSales(filteredBakerySales)}
          route="/bakery"
        />
        <BusinessCard
          title="Crafts"
          subtitle="Crafting Nana"
          productCount={craftProducts.length}
          sellUnitsSold={filteredCraftSales.reduce((sum, sale) => sum + Number(sale.quantitySold || 0), 0)}
          lowStockCount={craftLowStock.length}
          sales={sumSales(filteredCraftSales)}
          route="/crafts"
        />
      </View>

      <View style={styles.attentionCard}>
        <View style={styles.attentionHeader}>
          <Text style={styles.sectionTitle}>What needs attention</Text>
          <View style={styles.attentionBadge}>
            <Text style={styles.attentionBadgeText}>{formatNumber(urgentAction, 0)} items</Text>
          </View>
        </View>

        <View style={styles.attentionGrid}>
          <View style={styles.attentionPanel}>
            <View style={styles.panelHeaderRow}>
              <Text style={styles.panelTitle}>Low stock</Text>
              <Pressable onPress={() => router.push('/inventory')}>
                <Text style={styles.panelLink}>Inventory</Text>
              </Pressable>
            </View>
            {snapshot?.lowStockItems.length ? (
              snapshot.lowStockItems.slice(0, 4).map((item) => (
                <View key={item.productId} style={styles.attentionActionCard}>
                  <AttentionRow label={item.name} value={`${formatNumber(item.quantityOnHand, 0)} ${getProductSellUnitLabel(item, item.quantityOnHand)} left`} />
                  <Text style={styles.attentionSubtext}>Reorder {formatNumber(item.reorderLevel, 0)} · {item.inventoryStatusLabel}</Text>
                  <Pressable style={styles.inlineAction} onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })}>
                    <Text style={styles.inlineActionLabel}>Restock</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nothing low right now.</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.recentSalesCard}>
        <View style={styles.recentSalesHeader}>
          <Text style={styles.sectionTitle}>Recent sales rows</Text>
          <Pressable onPress={() => router.push('/sale')}>
            <Text style={styles.panelLink}>Add sale</Text>
          </Pressable>
        </View>
        {recentSales.length ? recentSales.map((sale) => (
          <View key={sale.saleId} style={styles.saleRow}>
            <View style={styles.saleRowMain}>
              <Text style={styles.saleName}>{sale.productName} — {getProductSellUnitDescription(sale)}</Text>
              <Text style={styles.saleMeta}>{sale.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {sale.date}</Text>
              <Text style={sale.costMissing ? styles.pendingText : styles.saleMeta}>{sale.costMissing ? 'Cost Pending, profit not trusted yet.' : getSaleProfitStatusLabel(sale)}</Text>
              <RecordActionRow
                onView={() => Alert.alert(sale.productName, [`${sale.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${sale.date}`, `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold`, `Unit price: ${formatWithUnit(sale.unitPrice, '$', 2)}`, `Total sale: ${formatWithUnit(sale.totalSale, '$', 2)}`, sale.note || sale.notes || 'No note saved.'].join('\n'))}
                onEdit={() => router.push({ pathname: '/sale', params: { saleId: sale.saleId } })}
                onDelete={() => confirmAction({
                  title: 'Void sale row?',
                  message: `${sale.productName} on ${sale.date} will be marked voided and removed from totals until restored in History.`,
                  confirmLabel: 'Void',
                  onConfirm: () => {
                    void (async () => {
                      try {
                        await voidSale(sale.saleId);
                        setStatusMessage(`${sale.productName} sale voided.`);
                        await refresh();
                      } catch (error) {
                        setStatusMessage(error instanceof Error ? error.message : 'Could not void sale.');
                        Alert.alert('Could not void sale', error instanceof Error ? error.message : 'Could not void sale.');
                      }
                    })();
                  },
                })}
                deleteLabel="Void"
              />
            </View>
            <View style={styles.saleRowSide}>
              <Text style={styles.saleQty}>{formatNumber(sale.quantitySold, 0)} {getProductSellUnitLabel(sale, sale.quantitySold)} sold</Text>
              <Text style={styles.saleTotal}>{formatWithUnit(sale.totalSale, '$', 2)}</Text>
            </View>
          </View>
        )) : <Text style={styles.emptyText}>No sales saved yet.</Text>}
      </View>
    </AppScreen>
  );
}

type CompactStatProps = {
  label: string;
  value: string;
};

function CompactStat({ label, value }: CompactStatProps) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type BusinessCardProps = {
  title: string;
  subtitle: string;
  productCount: number;
  sellUnitsSold: number;
  lowStockCount: number;
  sales: number;
  route: '/bakery' | '/crafts';
};

function BusinessCard({ title, subtitle, productCount, sellUnitsSold, lowStockCount, sales, route }: BusinessCardProps) {
  return (
    <Pressable style={styles.businessCard} onPress={() => router.push(route)}>
      <View style={styles.businessTopRow}>
        <View>
          <Text style={styles.businessTitle}>{title}</Text>
          <Text style={styles.businessSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.businessArrow}>Open</Text>
      </View>
      <View style={styles.businessMetrics}>
        <View style={styles.businessMetricTile}>
          <Text style={styles.businessMetricValue}>{formatNumber(productCount, 0)}</Text>
          <Text style={styles.businessMetricLabel}>Products</Text>
        </View>
        <View style={styles.businessMetricTile}>
          <Text style={styles.businessMetricValue}>{formatNumber(sellUnitsSold, 0)}</Text>
          <Text style={styles.businessMetricLabel}>Sell units sold</Text>
        </View>
        <View style={styles.businessMetricTile}>
          <Text style={styles.businessMetricValue}>{formatNumber(lowStockCount, 0)}</Text>
          <Text style={styles.businessMetricLabel}>Low stock</Text>
        </View>
        <View style={styles.businessMetricTileWide}>
          <Text style={styles.businessMetricValue}>{formatWithUnit(sales, '$', 2)}</Text>
          <Text style={styles.businessMetricLabel}>Sales</Text>
        </View>
      </View>
    </Pressable>
  );
}

type AttentionRowProps = {
  label: string;
  value: string;
};

function AttentionRow({ label, value }: AttentionRowProps) {
  return (
    <View style={styles.attentionRow}>
      <Text style={styles.attentionLabel}>{label}</Text>
      <Text style={styles.attentionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  launchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  launchHeader: {
    gap: theme.spacing.sm,
  },
  titleBlock: {
    gap: 4,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  launchMeta: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.softSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  metaLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  exportCallout: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  exportCalloutTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  exportCalloutMeta: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 280,
  },
  exportCalloutArrow: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scopeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  scopeTitle: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scopeText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  thirdPartyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  thirdPartyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  thirdPartyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  thirdPartySubtitle: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  thirdPartyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  statusStrip: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  statusLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusMessage: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  primaryActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  primaryAction: {
    minWidth: '48%',
    flexGrow: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primaryActionMain: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  primaryActionAlt: {
    backgroundColor: theme.colors.softSurface,
    borderColor: theme.colors.border,
  },
  primaryActionLabel: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryActionLabelMain: {
    color: theme.colors.primaryText,
  },
  primaryActionLabelAlt: {
    color: theme.colors.text,
  },
  quickLinkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  quickLink: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickLinkLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  statTile: {
    minWidth: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: theme.colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  splitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  businessCard: {
    minWidth: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 22,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  businessTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  businessTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  businessSubtitle: {
    color: theme.colors.mutedText,
    fontSize: 14,
    fontWeight: '600',
  },
  businessArrow: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  businessMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  businessMetricTile: {
    minWidth: '31%',
    flexGrow: 1,
    backgroundColor: theme.colors.softSurface,
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 2,
  },
  businessMetricTileWide: {
    minWidth: '48%',
    flexGrow: 2,
    backgroundColor: theme.colors.softSurface,
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 2,
  },
  businessMetricValue: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  businessMetricLabel: {
    color: theme.colors.mutedText,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  attentionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
  },
  attentionBadge: {
    backgroundColor: theme.colors.softSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attentionBadgeText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  attentionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  attentionPanel: {
    minWidth: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 8,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  panelTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  panelLink: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  attentionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  attentionActionCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.softSurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    marginBottom: theme.spacing.xs,
  },
  attentionLabel: {
    flex: 1,
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  attentionValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  attentionSubtext: {
    color: theme.colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    paddingTop: 6,
  },
  inlineActionLabel: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  recentSalesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recentSalesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    backgroundColor: theme.colors.softSurface,
    padding: 12,
  },
  saleRowMain: {
    flex: 1,
    gap: 2,
  },
  saleName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  saleMeta: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  pendingText: {
    color: '#9b3b34',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  saleRowSide: {
    alignItems: 'flex-end',
    gap: 2,
  },
  saleQty: {
    color: theme.colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  saleTotal: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 18,
  },
});
