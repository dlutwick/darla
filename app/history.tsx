import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { RecordActionRow } from '../supabase/src/components/ui/RecordActionRow';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { theme } from '../supabase/src/constants/theme';
import { buildExpensesCsv, buildGiveawaysCsv, buildProductsCsv, buildSalesCsv, buildSummaryCsv, downloadCsvFile, getBusinessHistorySnapshot } from '../supabase/src/features/business/export';
import { archiveProduct, deleteProduct, getDashboardSnapshot, getProductCostStatusLabel, getProductSellUnitDescription, getProductSellUnitLabel, getSaleProfitStatusLabel, listProducts, productHasSavedHistory, restoreExpense, restoreGiveaway, restoreProduct, restoreSale, subscribeBusinessState, voidExpense, voidGiveaway, voidSale } from '../supabase/src/features/business/store';
import { confirmAction } from '../supabase/src/lib/confirmAction';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

type ExportPreview = {
  filename: string;
  content: string;
} | null;

export default function HistoryScreen() {
  const [statusMessage, setStatusMessage] = useState('Loading saved business history…');
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getBusinessHistorySnapshot>> | null>(null);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listProducts>>>([]);
  const [preview, setPreview] = useState<ExportPreview>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sales' | 'expenses' | 'giveaways'>('all');
  const [historySearch, setHistorySearch] = useState('');

  const refresh = useCallback(async () => {
    const [next, nextDashboard, nextProducts] = await Promise.all([getBusinessHistorySnapshot(), getDashboardSnapshot(), listProducts(undefined, { includeArchived: true })]);
    setSnapshot(next);
    setDashboard(nextDashboard);
    setProducts(nextProducts);
    setStatusMessage(next.counts.sales || next.counts.expenses || next.counts.giveaways
      ? 'Saved sales, expenses, giveaways, and products are ready to review or export.'
      : 'The history area is ready. Add products, sales, expenses, or giveaways, then export when you want.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  const exportButtons = useMemo(() => ([
    { label: 'Export Sales CSV', run: buildSalesCsv },
    { label: 'Export Expenses CSV', run: buildExpensesCsv },
    { label: 'Export Giveaways CSV', run: buildGiveawaysCsv },
    { label: 'Export Products CSV', run: buildProductsCsv },
    { label: 'Export Summary CSV', run: buildSummaryCsv },
  ]), []);

  const searchText = historySearch.trim().toLowerCase();
  function matchesHistorySearch(...values: unknown[]) {
    if (!searchText) return true;
    return values
      .filter((value) => value != null)
      .map((value) => String(value).toLowerCase())
      .join(' ')
      .includes(searchText);
  }

  const recentSales = (dashboard?.sales ?? []).filter((sale) => matchesHistorySearch(
    sale.productName,
    sale.itemName,
    sale.date,
    sale.month,
    sale.businessType,
    sale.productType,
    sale.category,
    sale.vendorName,
    sale.note,
    sale.notes,
    sale.quantitySold,
    sale.totalSale,
    formatWithUnit(sale.totalSale, '$', 2),
    sale.estimatedProfit,
    sale.commissionEarned,
    sale.vendorShare,
  ));
  const recentExpenses = (dashboard?.expenses ?? []).filter((expense) => matchesHistorySearch(
    expense.date,
    expense.month,
    expense.expenseType,
    expense.expenseCategory,
    expense.vendor,
    expense.businessType,
    expense.businessLine,
    expense.amount,
    formatWithUnit(expense.amount, '$', 2),
    expense.note,
    expense.notes,
  ));
  const recentGiveaways = (dashboard?.giveaways ?? []).filter((giveaway) => matchesHistorySearch(
    giveaway.productName,
    giveaway.date,
    giveaway.month,
    giveaway.businessType,
    giveaway.businessLine,
    giveaway.category,
    giveaway.quantityGivenAway,
    giveaway.estimatedSaleValue,
    formatWithUnit(giveaway.estimatedSaleValue, '$', 2),
    giveaway.estimatedCost,
    giveaway.reason,
    giveaway.note,
    giveaway.notes,
  ));
  const recentHelperCommissions = dashboard?.helperCommissions.slice(0, 6) ?? [];
  const voidedSales = (dashboard?.auditSales ?? []).filter((sale) => sale.status === 'voided' && matchesHistorySearch(
    sale.productName,
    sale.itemName,
    sale.date,
    sale.month,
    sale.businessType,
    sale.productType,
    sale.category,
    sale.vendorName,
    sale.note,
    sale.notes,
    sale.quantitySold,
    sale.totalSale,
    formatWithUnit(sale.totalSale, '$', 2),
    sale.estimatedProfit,
    sale.commissionEarned,
    sale.vendorShare,
  ));
  const voidedExpenses = (dashboard?.auditExpenses ?? []).filter((expense) => expense.status === 'voided' && matchesHistorySearch(
    expense.date,
    expense.month,
    expense.expenseType,
    expense.expenseCategory,
    expense.vendor,
    expense.businessType,
    expense.businessLine,
    expense.amount,
    formatWithUnit(expense.amount, '$', 2),
    expense.note,
    expense.notes,
  ));
  const voidedGiveaways = (dashboard?.auditGiveaways ?? []).filter((giveaway) => giveaway.status === 'voided' && matchesHistorySearch(
    giveaway.productName,
    giveaway.date,
    giveaway.month,
    giveaway.businessType,
    giveaway.businessLine,
    giveaway.category,
    giveaway.quantityGivenAway,
    giveaway.estimatedSaleValue,
    formatWithUnit(giveaway.estimatedSaleValue, '$', 2),
    giveaway.estimatedCost,
    giveaway.reason,
    giveaway.note,
    giveaway.notes,
  ));
  const matchingHistoryCount = recentSales.length + recentExpenses.length + recentGiveaways.length + voidedSales.length + voidedExpenses.length + voidedGiveaways.length;
  const recentProducts = [...products].sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`)).slice(0, 6);
  const helperCommissionRecords = dashboard?.helperCommissions ?? [];
  const unpaidHelperCommissionTotal = helperCommissionRecords.reduce((sum, item) => sum + (item.paid ? 0 : Number(item.commissionAmount || 0)), 0);
  const paidHelperCommissionTotal = helperCommissionRecords.reduce((sum, item) => sum + (item.paid ? Number(item.commissionAmount || 0) : 0), 0);
  const unpaidHelperCommissionGroups = useMemo(() => {
    const groups = new Map<string, {
      helperName: string,
      showName: string,
      amount: number,
      showDate: string,
    }>();

    helperCommissionRecords
      .filter((item) => !item.paid && Number(item.commissionAmount || 0) > 0)
      .forEach((item) => {
        const helperName = item.helperName?.trim() || 'Unknown helper';
        const showName = item.showName?.trim() || 'No show/event';
        const key = `${helperName}|||${showName}`;
        const existing = groups.get(key);
        if (existing) {
          existing.amount = Number((existing.amount + Number(item.commissionAmount || 0)).toFixed(2));
          existing.showDate = existing.showDate > item.showDate ? existing.showDate : item.showDate;
          return;
        }

        groups.set(key, {
          helperName,
          showName,
          amount: Number(Number(item.commissionAmount || 0).toFixed(2)),
          showDate: item.showDate,
        });
      });

    return [...groups.values()].sort((a, b) => b.showDate.localeCompare(a.showDate) || b.amount - a.amount || a.helperName.localeCompare(b.helperName));
  }, [helperCommissionRecords]);

  function formatHelperCommissionInput(item: NonNullable<typeof dashboard>['helperCommissions'][number]) {
    return item.commissionType === 'flat'
      ? formatWithUnit(Number(item.commissionRate || 0), '$', 2)
      : `${formatNumber(item.commissionRate || 0, 2)}%`;
  }

  function formatHelperPaymentMethod(value: NonNullable<typeof dashboard>['helperCommissions'][number]['paymentMethod']) {
    switch (value) {
      case 'e-transfer': return 'E-Transfer';
      case 'card': return 'Card';
      case 'supplies': return 'Supplies';
      case 'product': return 'Product';
      case 'other': return 'Other';
      default: return 'Cash';
    }
  }

  function confirmDelete(title: string, message: string, action: () => Promise<void>) {
    confirmAction({
      title,
      message,
      confirmLabel: title.toLowerCase().startsWith('void') ? 'Void' : 'Delete',
      onConfirm: () => {
        void (async () => {
          try {
            await action();
            await refresh();
          } catch (error) {
            setStatusMessage(error instanceof Error ? error.message : 'Could not update this row.');
            Alert.alert('Action failed', error instanceof Error ? error.message : 'Could not update this row.');
          }
        })();
      },
    });
  }

  async function handleExport(buildFile: () => Promise<{ filename: string, content: string }>) {
    const file = await buildFile();
    setPreview(file);
    const result = await downloadCsvFile(file);
    setStatusMessage(result.delivered
      ? `${file.filename} downloaded.`
      : `${file.filename} is ready below. This runtime does not support direct downloads, so the CSV preview is shown on screen.`);
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="History" title="Sales, expenses, giveaways, and export history" subtitle="See what the app is saving, where it lives, and export clean CSV files when you need them." />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="How to open this screen" subtitle="History is now easier to find in the app." />
        <View style={styles.accessRow}>
          <Ionicons name="download-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.accessText}>Use the bottom tab bar and tap <Text style={styles.infoStrong}>History</Text>, or tap <Text style={styles.infoStrong}>History & CSV</Text> on Home.</Text>
        </View>
      </Card>

      <Card>
        <SectionHeader title="What is being saved" subtitle="This keeps the data layer visible without changing your workflow." />
        <StatRow label="Products saved" value={formatNumber(snapshot?.counts.products, 0)} />
        <StatRow label="Archived products" value={formatNumber(snapshot?.counts.archivedProducts, 0)} />
        <StatRow label="Active sales rows" value={formatNumber(snapshot?.counts.sales, 0)} />
        <StatRow label="Active expenses" value={formatNumber(snapshot?.counts.expenses, 0)} />
        <StatRow label="Active giveaways" value={formatNumber(snapshot?.counts.giveaways, 0)} />
        <StatRow label="Helper commission shows" value={formatNumber(snapshot?.counts.helperCommissions, 0)} />
        <StatRow label="Voided sales rows" value={formatNumber(snapshot?.counts.voidedSales, 0)} />
        <StatRow label="Voided expenses" value={formatNumber(snapshot?.counts.voidedExpenses, 0)} />
        <StatRow label="Voided giveaways" value={formatNumber(snapshot?.counts.voidedGiveaways, 0)} />
      </Card>

      <Card>
        <SectionHeader title="Where the data is stored" subtitle="The app is still local-first right now." />
        <Text style={styles.infoText}>Storage key: <Text style={styles.infoStrong}>{snapshot?.storageKey ?? '—'}</Text></Text>
        <Text style={styles.infoText}>Runtime storage: <Text style={styles.infoStrong}>{snapshot?.storageRuntime ?? '—'}</Text></Text>
        <Text style={styles.infoText}>Single source of truth: <Text style={styles.infoStrong}>{snapshot?.singleSourceOfTruth ?? '—'}</Text></Text>
        <Text style={styles.infoText}>Saved sales history comes from: <Text style={styles.infoStrong}>{snapshot?.salesHistorySource ?? '—'}</Text></Text>
        <Text style={styles.infoText}>Saved expenses come from: <Text style={styles.infoStrong}>{snapshot?.expensesSource ?? '—'}</Text></Text>
        <Text style={styles.infoText}>Saved giveaways come from: <Text style={styles.infoStrong}>{snapshot?.giveawaysSource ?? '—'}</Text></Text>
      </Card>

      <Card>
        <SectionHeader title="Show Helper Commission" subtitle="Track helper payouts right here before you scroll into saved record history." />
        <Text style={styles.infoText}>Track helper payouts by show or market event, separate from individual sale rows.</Text>
        <View style={styles.helperActionRow}>
          <Button label="Add Helper Commission" onPress={() => router.push('/helper-commission')} />
        </View>
        <StatRow label="Shows with helper commission" value={formatNumber(helperCommissionRecords.length, 0)} />
        <StatRow label="Total unpaid helper commission" value={formatWithUnit(Number(unpaidHelperCommissionTotal.toFixed(2)), '$', 2)} />
        <StatRow label="Total paid helper commission" value={formatWithUnit(Number(paidHelperCommissionTotal.toFixed(2)), '$', 2)} />
        <Text style={styles.groupTitle}>Unpaid by helper and show</Text>
        {unpaidHelperCommissionGroups.length ? unpaidHelperCommissionGroups.map((group) => (
          <View key={`${group.helperName}-${group.showName}`} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{group.helperName} — {group.showName}</Text>
            <Text style={styles.rowMeta}>{formatWithUnit(group.amount, '$', 2)} unpaid · show date {group.showDate}</Text>
          </View>
        )) : <Text style={styles.emptyText}>No unpaid helper commissions right now.</Text>}

        <Text style={styles.groupTitle}>Recent helper commission shows</Text>
        {recentHelperCommissions.length ? recentHelperCommissions.map((item) => (
          <View key={item.helperCommissionId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.helperName} — {item.showName}</Text>
            <Text style={styles.rowMeta}>{item.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · {item.showDate} · {formatWithUnit(item.totalShowSales, '$', 2)} total show sales · {item.commissionType === 'flat' ? 'Flat amount' : 'Percentage'} {formatHelperCommissionInput(item)}</Text>
            <Text style={styles.rowMeta}>{formatWithUnit(item.commissionAmount, '$', 2)} owed · payment {formatHelperPaymentMethod(item.paymentMethod)} · value {formatWithUnit(item.paymentValue, '$', 2)}{item.paymentDescription ? ` · ${item.paymentDescription}` : ''}</Text>
            <Text style={styles.rowMeta}>{item.paid ? `Paid${item.datePaid ? ` on ${item.datePaid}` : ''}` : 'Unpaid'} · Expense category Helper Commission</Text>
            <Text style={styles.rowMeta}>{item.notes || 'No notes saved.'}</Text>
            <View style={styles.inlineActionRow}>
              <Button label="Edit" onPress={() => router.push({ pathname: '/helper-commission', params: { helperCommissionId: item.helperCommissionId } })} />
            </View>
          </View>
        )) : <Text style={styles.emptyText}>No helper commission shows saved yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Saved records" subtitle="Search all sales, expenses, giveaways, and voided rows. Active rows are used in totals, and voided rows stay for audit safety." />
        <TextInput
          style={styles.searchInput}
          value={historySearch}
          onChangeText={setHistorySearch}
          placeholder="Search by date, name, category, vendor, type, note, or amount"
          placeholderTextColor={theme.colors.mutedText}
        />
        <Text style={styles.resultText}>{searchText ? `${formatNumber(matchingHistoryCount, 0)} matching records` : 'Showing all saved sales, expenses, giveaways, and voided rows'}</Text>
        <View style={styles.filterRow}>
          {[
            ['all', 'All'],
            ['sales', 'Sales'],
            ['expenses', 'Expenses'],
            ['giveaways', 'Giveaways'],
          ].map(([value, label]) => (
            <Pressable key={value} style={[styles.filterChip, historyFilter === value ? styles.filterChipActive : null]} onPress={() => setHistoryFilter(value as typeof historyFilter)}>
              <Text style={[styles.filterChipLabel, historyFilter === value ? styles.filterChipLabelActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {historyFilter === 'all' || historyFilter === 'sales' ? <>
        <Text style={styles.groupTitle}>Recent products</Text>
        {recentProducts.length ? recentProducts.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name} — {getProductSellUnitDescription(item)}</Text>
            <Text style={styles.rowMeta}>{item.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {item.category} · {item.productType === 'third-party' ? '3rd Party' : 'My Product'} · {item.status === 'archived' ? 'Archived' : 'Active'}{item.productType === 'third-party' ? ` · ${item.vendorName || 'Vendor'} · ${formatNumber(item.commissionPercent, 0)}% commission` : ` · ${getProductCostStatusLabel(item)}`}</Text>
            <Text style={styles.rowMeta}>{formatWithUnit(item.sellingPrice, '$', 2)} per sell unit</Text>
            <RecordActionRow
              onView={() => Alert.alert(item.name, [`${item.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${item.category}`, `Type: ${item.productType === 'third-party' ? '3rd Party' : 'My Product'}`, getProductSellUnitDescription(item), `Sale price: ${formatWithUnit(item.sellingPrice, '$', 2)}`, item.productType === 'third-party' ? `Vendor: ${item.vendorName || '—'}` : `Cost per sell unit: ${formatWithUnit(item.cost, '$', 2)}`, item.productType === 'third-party' ? `Commission percent: ${formatNumber(item.commissionPercent, 0)}%` : `Profit per sell unit: ${formatWithUnit(item.sellingPrice - item.cost, '$', 2)}`, item.notes || 'No notes saved.'].join('\n'))}
              onEdit={() => router.push({ pathname: '/product', params: { productId: item.productId } })}
              onDelete={() => {
                void (async () => {
                  const hasHistory = await productHasSavedHistory(item.productId);
                  if (item.status === 'archived') {
                    await restoreProduct(item.productId);
                    setStatusMessage(`${item.name} restored.`);
                    await refresh();
                    return;
                  }
                  if (hasHistory) {
                    await archiveProduct(item.productId);
                    setStatusMessage(`${item.name} archived.`);
                    await refresh();
                    return;
                  }
                  await deleteProduct(item.productId);
                  setStatusMessage(`${item.name} deleted.`);
                  await refresh();
                })();
              }}
              deleteLabel={item.status === 'archived' ? 'Restore' : 'Archive'}
            />
          </View>
        )) : <Text style={styles.emptyText}>No saved products yet.</Text>}

        <Text style={styles.groupTitle}>Sales</Text>
        {recentSales.length ? recentSales.map((sale) => (
          <View key={sale.saleId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{sale.productName} — {getProductSellUnitDescription(sale)}</Text>
            <Text style={styles.rowMeta}>{sale.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {sale.date} · {sale.productType === 'third-party' ? '3rd Party' : 'My Product'}</Text>
            <Text style={styles.rowMeta}>{sale.productType === 'third-party' ? `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold · ${formatWithUnit(sale.totalSale, '$', 2)} row total · ${formatWithUnit(sale.commissionEarned ?? 0, '$', 2)} commission earned · ${formatWithUnit(sale.vendorShare ?? 0, '$', 2)} vendor share${sale.vendorName ? ` · ${sale.vendorName}` : ''}` : `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold · ${formatWithUnit(sale.totalSale, '$', 2)} total · ${formatWithUnit(sale.estimatedProfit, '$', 2)} profit`}</Text>
            <Text style={sale.productType === 'third-party' ? styles.rowMeta : sale.costMissing ? styles.warningText : styles.rowMeta}>{sale.productType === 'third-party' ? `Commission rate ${formatNumber(sale.commissionPercent ?? 25, 0)}%` : sale.costMissing ? 'Cost Pending, profit not trusted yet.' : getSaleProfitStatusLabel(sale)}</Text>
            <RecordActionRow
              onView={() => Alert.alert(sale.productName, sale.productType === 'third-party' ? [`${sale.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${sale.date}`, `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold`, `Vendor: ${sale.vendorName || '—'}`, `Commission percent: ${formatNumber(sale.commissionPercent ?? 25, 0)}%`, `Row total: ${formatWithUnit(sale.totalSale, '$', 2)}`, `Commission earned: ${formatWithUnit(sale.commissionEarned ?? 0, '$', 2)}`, `Vendor share: ${formatWithUnit(sale.vendorShare ?? 0, '$', 2)}`, sale.note || sale.notes || 'No note saved.'].join('\n') : [`${sale.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${sale.date}`, `${formatNumber(sale.quantitySold, 0)} ${getProductSellUnitLabel(sale, sale.quantitySold)} sold`, `Unit price: ${formatWithUnit(sale.unitPrice, '$', 2)}`, `Total sale: ${formatWithUnit(sale.totalSale, '$', 2)}`, `Profit: ${formatWithUnit(sale.estimatedProfit, '$', 2)}`, sale.note || sale.notes || 'No note saved.'].join('\n'))}
              onEdit={() => router.push({ pathname: '/sale', params: { saleId: sale.saleId } })}
              onDelete={() => confirmDelete('Void sale row?', `${sale.productName} on ${sale.date} will be marked voided and removed from totals until restored.`, async () => {
                await voidSale(sale.saleId);
                setStatusMessage(`${sale.productName} sale voided.`);
              })}
              deleteLabel="Void"
            />
          </View>
        )) : <Text style={styles.emptyText}>{searchText ? 'No matching sales.' : 'No saved sales yet.'}</Text>}

        </> : null}

        {historyFilter === 'all' || historyFilter === 'expenses' ? <>
        <Text style={styles.groupTitle}>Expenses</Text>
        {recentExpenses.length ? recentExpenses.map((expense) => (
          <View key={expense.expenseId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{expense.expenseCategory} — {formatWithUnit(expense.amount, '$', 2)}</Text>
            <Text style={styles.rowMeta}>{expense.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {expense.date} · {expense.vendor || 'No vendor'}</Text>
            <Text style={styles.rowMeta}>{expense.notes || 'No note saved.'}</Text>
            <RecordActionRow
              onView={() => Alert.alert(expense.expenseCategory, [`${expense.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${expense.date}`, `Month: ${expense.month}`, `Vendor: ${expense.vendor || '—'}`, `Amount: ${formatWithUnit(expense.amount, '$', 2)}`, expense.note || expense.notes || 'No note saved.'].join('\n'))}
              onEdit={() => router.push({ pathname: '/expenses', params: { expenseId: expense.expenseId } })}
              onDelete={() => confirmDelete('Void expense row?', `${expense.expenseCategory} on ${expense.date} will be marked voided and removed from totals until restored.`, async () => {
                await voidExpense(expense.expenseId);
                setStatusMessage(`${expense.expenseCategory} expense voided.`);
              })}
              deleteLabel="Void"
            />
          </View>
        )) : <Text style={styles.emptyText}>{searchText ? 'No matching expenses.' : 'No saved expenses yet.'}</Text>}

        </> : null}

        {historyFilter === 'all' || historyFilter === 'giveaways' ? <>
        <Text style={styles.groupTitle}>Giveaways</Text>
        {recentGiveaways.length ? recentGiveaways.map((giveaway) => (
          <View key={giveaway.giveawayId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{giveaway.productName} — {formatWithUnit(giveaway.estimatedSaleValue, '$', 2)} value</Text>
            <Text style={styles.rowMeta}>{giveaway.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {giveaway.date} · {giveaway.category || 'No category'}</Text>
            <Text style={styles.rowMeta}>{formatNumber(giveaway.quantityGivenAway, 0)} given away · {formatWithUnit(giveaway.estimatedCost, '$', 2)} cost · {giveaway.notes || 'No note saved.'}</Text>
            <RecordActionRow
              onView={() => Alert.alert(giveaway.productName, [`${giveaway.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · ${giveaway.date}`, `Month: ${giveaway.month}`, `${formatNumber(giveaway.quantityGivenAway, 0)} ${getProductSellUnitLabel(giveaway, giveaway.quantityGivenAway)} given away`, `Estimated value: ${formatWithUnit(giveaway.estimatedSaleValue, '$', 2)}`, `Estimated cost: ${formatWithUnit(giveaway.estimatedCost, '$', 2)}`, giveaway.reason || giveaway.note || giveaway.notes || 'No reason saved.'].join('\n'))}
              onEdit={() => router.push({ pathname: '/giveaways', params: { giveawayId: giveaway.giveawayId } })}
              onDelete={() => confirmDelete('Void giveaway row?', `${giveaway.productName} on ${giveaway.date} will be marked voided and removed from giveaway totals until restored.`, async () => {
                await voidGiveaway(giveaway.giveawayId);
                setStatusMessage(`${giveaway.productName} giveaway voided.`);
              })}
              deleteLabel="Void"
            />
          </View>
        )) : <Text style={styles.emptyText}>{searchText ? 'No matching giveaways.' : 'No saved giveaways yet.'}</Text>}

        </> : null}

        {historyFilter === 'all' || historyFilter === 'sales' ? <>
        <Text style={styles.groupTitle}>Voided sales</Text>
        {voidedSales.length ? voidedSales.map((sale) => (
          <View key={sale.saleId} style={[styles.rowCard, styles.voidedCard]}>
            <Text style={styles.rowTitle}>{sale.productName} — Voided</Text>
            <Text style={styles.rowMeta}>{sale.date} · {sale.productType === 'third-party' ? '3rd Party' : 'My Product'} · {formatWithUnit(sale.totalSale, '$', 2)} · voided rows do not affect totals</Text>
            <RecordActionRow onView={() => Alert.alert(sale.productName, sale.productType === 'third-party' ? `Status: Voided\nDate: ${sale.date}\nType: 3rd Party\nVendor: ${sale.vendorName || '—'}\nRow total: ${formatWithUnit(sale.totalSale, '$', 2)}\nCommission earned: ${formatWithUnit(sale.commissionEarned ?? 0, '$', 2)}\nVendor share: ${formatWithUnit(sale.vendorShare ?? 0, '$', 2)}` : `Status: Voided\nDate: ${sale.date}\nTotal: ${formatWithUnit(sale.totalSale, '$', 2)}\nProfit: ${formatWithUnit(sale.estimatedProfit, '$', 2)}`)} onEdit={() => router.push({ pathname: '/sale', params: { saleId: sale.saleId } })} onDelete={() => { void (async () => { await restoreSale(sale.saleId); setStatusMessage(`${sale.productName} sale restored.`); await refresh(); })(); }} deleteLabel="Restore" />
          </View>
        )) : <Text style={styles.emptyText}>{searchText ? 'No matching voided sales.' : 'No voided sales.'}</Text>}

        </> : null}

        {historyFilter === 'all' || historyFilter === 'expenses' ? <>
        <Text style={styles.groupTitle}>Voided expenses</Text>
        {voidedExpenses.length ? voidedExpenses.map((expense) => (
          <View key={expense.expenseId} style={[styles.rowCard, styles.voidedCard]}>
            <Text style={styles.rowTitle}>{expense.expenseCategory} — Voided</Text>
            <Text style={styles.rowMeta}>{expense.date} · {formatWithUnit(expense.amount, '$', 2)} · voided rows do not affect totals</Text>
            <RecordActionRow onView={() => Alert.alert(expense.expenseCategory, `Status: Voided\nDate: ${expense.date}\nAmount: ${formatWithUnit(expense.amount, '$', 2)}`)} onEdit={() => router.push({ pathname: '/expenses', params: { expenseId: expense.expenseId } })} onDelete={() => { void (async () => { await restoreExpense(expense.expenseId); setStatusMessage(`${expense.expenseCategory} expense restored.`); await refresh(); })(); }} deleteLabel="Restore" />
          </View>
        )) : <Text style={styles.emptyText}>{searchText ? 'No matching voided expenses.' : 'No voided expenses.'}</Text>}

        </> : null}

        {historyFilter === 'all' || historyFilter === 'giveaways' ? <>
        <Text style={styles.groupTitle}>Voided giveaways</Text>
        {voidedGiveaways.length ? voidedGiveaways.map((giveaway) => (
          <View key={giveaway.giveawayId} style={[styles.rowCard, styles.voidedCard]}>
            <Text style={styles.rowTitle}>{giveaway.productName} — Voided</Text>
            <Text style={styles.rowMeta}>{giveaway.date} · {formatWithUnit(giveaway.estimatedSaleValue, '$', 2)} value · voided rows do not affect totals</Text>
            <RecordActionRow onView={() => Alert.alert(giveaway.productName, `Status: Voided\nDate: ${giveaway.date}\nValue: ${formatWithUnit(giveaway.estimatedSaleValue, '$', 2)}\nCost: ${formatWithUnit(giveaway.estimatedCost, '$', 2)}`)} onEdit={() => router.push({ pathname: '/giveaways', params: { giveawayId: giveaway.giveawayId } })} onDelete={() => { void (async () => { await restoreGiveaway(giveaway.giveawayId); setStatusMessage(`${giveaway.productName} giveaway restored.`); await refresh(); })(); }} deleteLabel="Restore" />
          </View>
        )) : <Text style={styles.emptyText}>{searchText ? 'No matching voided giveaways.' : 'No voided giveaways.'}</Text>}
        </> : null}
      </Card>

      <Card>
        <SectionHeader title="CSV export" subtitle="Separate downloads for sales, expenses, giveaways, products, and monthly summary data." />
        <View style={styles.exportCallout}>
          <Ionicons name="download-outline" size={20} color={theme.colors.accent} />
          <Text style={styles.exportCalloutText}>Tap any button below to download a CSV file for backup or spreadsheet use.</Text>
        </View>
        <View style={styles.exportGrid}>
          {exportButtons.map((item) => (
            <Button key={item.label} label={item.label} onPress={() => { void handleExport(item.run); }} />
          ))}
        </View>
        <Text style={styles.helpText}>CSV files use comma-separated values and are meant for Excel, Google Sheets, or backup review.</Text>
      </Card>

      {preview ? (
        <Card>
          <SectionHeader title={`Latest export preview: ${preview.filename}`} subtitle="This stays visible so the export content can still be copied if downloads are limited on the current device." />
          <Pressable style={styles.previewBox}>
            <Text selectable style={styles.previewText}>{preview.content}</Text>
          </Pressable>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accessRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  accessText: { color: theme.colors.text, fontSize: 14, lineHeight: 20, flex: 1 },
  infoText: { color: theme.colors.text, fontSize: 14, lineHeight: 20 },
  infoStrong: { fontWeight: '800' },
  helperActionRow: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs },
  inlineActionRow: { marginTop: theme.spacing.xs, alignSelf: 'flex-start' },
  groupTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 4 },
  searchInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, color: theme.colors.text, fontSize: 15, paddingHorizontal: theme.spacing.sm, paddingVertical: 10 },
  resultText: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  filterChip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: theme.radius.full, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '800' },
  filterChipLabelActive: { color: theme.colors.primaryText },
  rowCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  voidedCard: { backgroundColor: '#f7efe9', borderColor: '#d7b7a9' },
  rowTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  warningText: { color: '#9b3b34', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
  exportGrid: { gap: theme.spacing.sm },
  exportCallout: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, padding: theme.spacing.sm },
  exportCalloutText: { color: theme.colors.text, fontSize: 14, lineHeight: 20, flex: 1, fontWeight: '600' },
  helpText: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  previewBox: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm },
  previewText: { color: theme.colors.text, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
});
