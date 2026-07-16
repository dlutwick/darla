import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { archiveProduct, getDashboardSnapshot, getPackageCost, getProductById, getProductCostStatusLabel, getProductSellUnitDescription, restoreProduct, subscribeBusinessState, updateProduct } from '../supabase/src/features/business/store';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

type AuditFilter = 'cost-pending' | 'low-stock' | 'starting-stock' | 'reorder-review' | 'archived' | 'all';

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ProductAuditScreen() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const [statusMessage, setStatusMessage] = useState('Loading product audit…');
  const [filter, setFilter] = useState<AuditFilter>('cost-pending');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [costPerSellUnit, setCostPerSellUnit] = useState('0');
  const [salePrice, setSalePrice] = useState('0');
  const [startingStock, setStartingStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [saving, setSaving] = useState(false);
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getDashboardSnapshot();
    setSnapshot(next);
    setStatusMessage(next.auditProductSnapshots?.length ? 'Product audit is ready. Use Cost Pending first to tighten trust gradually.' : 'No products yet.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  const filteredProducts = useMemo(() => {
    const items = snapshot?.auditProductSnapshots ?? [];
    switch (filter) {
      case 'cost-pending': return items.filter((item) => item.costMissing);
      case 'low-stock': return items.filter((item) => item.lowStock);
      case 'starting-stock': return items.filter((item) => item.startingInventory <= 0);
      case 'reorder-review': return items.filter((item) => item.reorderLevel <= 0 || item.reorderLevel >= Math.max(1, item.startingInventory));
      case 'archived': return items.filter((item) => item.status === 'archived');
      default: return showOnlyFlagged ? items.filter((item) => item.costMissing || item.lowStock || item.startingInventory <= 0 || item.reorderLevel <= 0 || item.reorderLevel >= Math.max(1, item.startingInventory) || item.status === 'archived') : items;
    }
  }, [filter, showOnlyFlagged, snapshot?.auditProductSnapshots]);

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedProductId('');
      return;
    }
    if (!filteredProducts.some((item) => item.productId === selectedProductId)) {
      setSelectedProductId(filteredProducts[0].productId);
    }
  }, [filteredProducts, selectedProductId]);

  const selectedProduct = filteredProducts.find((item) => item.productId === selectedProductId) ?? null;

  useEffect(() => {
    if (!selectedProduct) return;
    setCostPerSellUnit(String(selectedProduct.costPerSellUnit));
    setSalePrice(String(selectedProduct.sellingPrice));
    setStartingStock(String(selectedProduct.startingInventory));
    setReorderLevel(String(selectedProduct.reorderLevel));
  }, [selectedProduct?.productId]);

  async function handleQuickSave() {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const fullProduct = await getProductById(selectedProduct.productId);
      if (!fullProduct) throw new Error('Product not found.');
      const nextSellUnitCost = parseNumber(costPerSellUnit, 0);
      const normalizedCostPerItem = fullProduct.sellUnitType === 'pack'
        ? Number((nextSellUnitCost / Math.max(1, fullProduct.packSize ?? 1)).toFixed(2))
        : nextSellUnitCost;
      await updateProduct(fullProduct.productId, {
        businessType: fullProduct.businessType,
        businessLine: fullProduct.businessLine,
        name: fullProduct.name,
        category: fullProduct.category,
        cost: normalizedCostPerItem,
        sellingPrice: parseNumber(salePrice, fullProduct.sellingPrice),
        sellUnitType: fullProduct.sellUnitType,
        customUnitName: fullProduct.customUnitName,
        packSize: fullProduct.packSize,
        startingInventory: parseNumber(startingStock, fullProduct.startingInventory),
        reorderLevel: parseNumber(reorderLevel, fullProduct.reorderLevel),
        notes: fullProduct.notes,
        batchSize: fullProduct.batchSize,
        batchCost: fullProduct.batchCost,
      });
      const currentIndex = filteredProducts.findIndex((item) => item.productId === fullProduct.productId);
      const nextProductId = filteredProducts[currentIndex + 1]?.productId ?? filteredProducts[currentIndex]?.productId ?? fullProduct.productId;
      setStatusMessage(`${fullProduct.name} updated from Product Audit.`);
      await refresh();
      setSelectedProductId(nextProductId);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not update product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      if (selectedProduct.status === 'archived') {
        await restoreProduct(selectedProduct.productId);
        setStatusMessage(`${selectedProduct.name} restored.`);
      } else {
        await archiveProduct(selectedProduct.productId);
        setStatusMessage(`${selectedProduct.name} archived.`);
      }
      await refresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not change archive status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Product Audit" title="Product audit" subtitle="Quick cleanup for Cost Pending, low stock, archived products, and setup values that need trust work." />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Audit filters" subtitle="Use this to tighten product trust gradually without forcing full costing upfront." />
        <View style={styles.chipRow}>
          {[
            ['cost-pending', 'Cost Pending'],
            ['low-stock', 'Low Stock'],
            ['starting-stock', 'Zero Start'],
            ['reorder-review', 'Reorder Review'],
            ['archived', 'Archived'],
            ['all', 'All'],
          ].map(([value, label]) => (
            <Pressable key={value} style={[styles.chip, filter === value ? styles.chipActive : null]} onPress={() => setFilter(value as AuditFilter)}>
              <Text style={[styles.chipLabel, filter === value ? styles.chipLabelActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.toggleRow} onPress={() => setShowOnlyFlagged((value) => !value)}>
          <Text style={styles.toggleLabel}>{showOnlyFlagged ? 'Show all products in All view' : 'Show only flagged products in All view'}</Text>
        </Pressable>
      </Card>

      <Card>
        <SectionHeader title="Products needing review" subtitle="Archived products stay here for audit, but are hidden from new sales, giveaways, and restocks." />
        {filteredProducts.length ? filteredProducts.map((item) => (
          <Pressable key={item.productId} style={[styles.productCard, selectedProductId === item.productId ? styles.productCardActive : null]} onPress={() => setSelectedProductId(item.productId)}>
            <Text style={styles.productTitle}>{item.name} — {getProductSellUnitDescription(item)}</Text>
            <Text style={styles.productMeta}>{item.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {item.category} · {item.status === 'archived' ? 'Archived' : 'Active'} · {getProductCostStatusLabel(item)}</Text>
            <Text style={styles.productMeta}>Stock {formatNumber(item.quantityOnHand, 0)} · Reorder {formatNumber(item.reorderLevel, 0)} · {item.inventoryStatusLabel}{item.lastRestockDate ? ` · Last restock ${item.lastRestockDate}` : ''}</Text>
            <Text style={styles.productMeta}>Sale {formatWithUnit(item.sellingPrice, '$', 2)} · Cost per sell unit {formatWithUnit(item.costPerSellUnit, '$', 2)}</Text>
            {item.status !== 'archived' ? <Pressable style={styles.inlineAction} onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })}><Text style={styles.inlineActionLabel}>Restock</Text></Pressable> : null}
          </Pressable>
        )) : <Text style={styles.emptyText}>Nothing in this audit bucket right now.</Text>}
      </Card>

      {selectedProduct ? (
        <Card>
          <SectionHeader title="Quick edit" subtitle="Faster than opening the full product form for small cleanup work." />
          <Text style={styles.quickTitle}>{selectedProduct.name}</Text>
          <Text style={styles.productMeta}>{selectedProduct.status === 'archived' ? 'Archived' : 'Active'} · {selectedProduct.costMissing ? 'Cost Pending' : 'Cost Set'} · Current stock {formatNumber(selectedProduct.quantityOnHand, 0)} · Reorder {formatNumber(selectedProduct.reorderLevel, 0)} · {selectedProduct.inventoryStatusLabel}</Text>
          {selectedProduct.lastRestockDate ? <Text style={styles.productMeta}>Last restock {selectedProduct.lastRestockDate}</Text> : null}
          <View style={styles.fieldGrid}>
            <View style={styles.fieldCell}><TextField label="Sale price per sell unit" value={salePrice} onChangeText={setSalePrice} keyboardType="numeric" dense /></View>
            <View style={styles.fieldCell}><TextField label="Cost per sell unit" value={costPerSellUnit} onChangeText={setCostPerSellUnit} keyboardType="numeric" dense /></View>
          </View>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldCell}><TextField label="Starting stock" value={startingStock} onChangeText={setStartingStock} keyboardType="numeric" dense /></View>
            <View style={styles.fieldCell}><TextField label="Reorder level" value={reorderLevel} onChangeText={setReorderLevel} keyboardType="numeric" dense /></View>
          </View>
          {selectedProduct.costMissing ? <Text style={styles.warningText}>Cost Pending. Profit not trusted yet.</Text> : null}
          <View style={styles.buttonRow}>
            <Button label={saving ? 'Saving…' : 'Save Quick Edit'} onPress={() => { void handleQuickSave(); }} disabled={saving} />
            {selectedProduct.status !== 'archived' ? <Button label="Restock" onPress={() => router.push({ pathname: '/restock', params: { productId: selectedProduct.productId } })} disabled={saving} /> : null}
            <Button label={selectedProduct.status === 'archived' ? 'Restore Product' : 'Archive Product'} onPress={() => { void handleArchiveToggle(); }} disabled={saving} />
          </View>
        </Card>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
  chipLabelActive: { color: theme.colors.primaryText },
  toggleRow: { paddingTop: theme.spacing.xs },
  toggleLabel: { color: theme.colors.accent, fontSize: 13, fontWeight: '800' },
  productCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  productCardActive: { borderColor: theme.colors.primary, backgroundColor: '#fbf1e4' },
  productTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  productMeta: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  quickTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  fieldGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  fieldCell: { flex: 1 },
  buttonRow: { gap: theme.spacing.sm },
  inlineAction: { alignSelf: 'flex-start', paddingTop: 4 },
  inlineActionLabel: { color: theme.colors.accent, fontSize: 13, fontWeight: '800' },
  warningText: { color: '#9b3b34', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
});
