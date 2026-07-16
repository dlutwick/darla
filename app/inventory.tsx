import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { theme } from '../supabase/src/constants/theme';
import { Button } from '../supabase/src/components/ui/Button';
import { getDashboardSnapshot, getProductCostStatusLabel, getProductSellUnitDescription, getProductSellUnitLabel, subscribeBusinessState } from '../supabase/src/features/business/store';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

export default function InventoryScreen() {
  const [statusMessage, setStatusMessage] = useState('Inventory helps you see what to bake or make next.');
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);

  const refresh = useCallback(async () => {
    const next = await getDashboardSnapshot();
    setSnapshot(next);
    setStatusMessage(next.productSnapshots.length ? 'Inventory is ready with simple low stock warnings.' : 'Add products first, then inventory will start working for you.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  const bakeryItems = useMemo(() => snapshot?.productSnapshots.filter((item) => item.businessType === 'bakery') ?? [], [snapshot?.productSnapshots]);
  const craftItems = useMemo(() => snapshot?.productSnapshots.filter((item) => item.businessType === 'craft') ?? [], [snapshot?.productSnapshots]);

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Inventory" title="Inventory and what to make next" subtitle="Low stock first, then all products split into Bakery and Crafts so the page is easier to scan on a phone." />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="How inventory is counted right now" subtitle="Inventory now uses starting stock plus restocks, minus active sales and active giveaways only." />
        <Text style={styles.noteText}>Inventory is currently counted in sell units, not raw physical pieces.</Text>
        <Text style={styles.noteText}>That means butter tarts sold as pack of 3 are counted in packs, cinnamon rolls sold as pack of 4 are counted in packs, bread is counted in loaves, and crafts are counted as single items.</Text>
        <Pressable style={styles.inlineLink} onPress={() => router.push('/product-audit')}><Text style={styles.inlineLinkLabel}>Open Product Audit</Text></Pressable>
      </Card>

      <Card>
        <SectionHeader title="Make next" subtitle="These are the items most likely to need attention first." />
        <Text style={styles.groupTitle}>Bakery low stock</Text>
        {bakeryItems.filter((item) => item.lowStock).length ? bakeryItems.filter((item) => item.lowStock).map((item) => (
          <View key={item.productId} style={[styles.rowCard, styles.lowStockCard]}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{formatNumber(item.quantityOnHand, 0)} {getProductSellUnitLabel(item, item.quantityOnHand)} left · reorder at {formatNumber(item.reorderLevel, 0)}</Text>
            <Button label="Restock" onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })} />
          </View>
        )) : <Text style={styles.emptyText}>No bakery items are low right now.</Text>}

        <Text style={styles.groupTitle}>Craft low stock</Text>
        {craftItems.filter((item) => item.lowStock).length ? craftItems.filter((item) => item.lowStock).map((item) => (
          <View key={item.productId} style={[styles.rowCard, styles.lowStockCard]}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{formatNumber(item.quantityOnHand, 0)} {getProductSellUnitLabel(item, item.quantityOnHand)} left · reorder at {formatNumber(item.reorderLevel, 0)}</Text>
            <Button label="Restock" onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })} />
          </View>
        )) : <Text style={styles.emptyText}>No craft items are low right now.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Bakery inventory" subtitle="Stock, sold, reorder level, and profit in plain language." />
        {bakeryItems.length ? bakeryItems.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.category} · {getProductSellUnitDescription(item)} · {item.status === 'archived' ? 'Archived' : 'Active'} · {getProductCostStatusLabel(item)}</Text>
            <Text style={styles.rowMeta}>On hand {formatNumber(item.quantityOnHand, 0)} {getProductSellUnitLabel(item, item.quantityOnHand)} · Sold {formatNumber(item.quantitySold, 0)} {getProductSellUnitLabel(item, item.quantitySold)} · Restocked {formatNumber(item.quantityRestocked, 0)} · Reorder {formatNumber(item.reorderLevel, 0)}</Text>
            <Text style={styles.rowMeta}>{item.inventoryStatusLabel}{item.lastRestockDate ? ` · Last restock ${item.lastRestockDate}` : ''}</Text>
            <Text style={styles.rowMeta}>Sale price {formatWithUnit(item.sellingPrice, '$', 2)} · Cost per sell unit {formatWithUnit(item.costPerSellUnit, '$', 2)}</Text>
            {item.costMissing ? <Text style={styles.warningText}>Cost Pending. Profit not trusted yet.</Text> : <Text style={styles.rowMeta}>Trusted profit {formatWithUnit(item.profit, '$', 2)}</Text>}
            <Pressable style={styles.inlineLink} onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })}><Text style={styles.inlineLinkLabel}>Restock this product</Text></Pressable>
          </View>
        )) : <Text style={styles.emptyText}>No bakery products yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Craft inventory" subtitle="Material cost, selling price, stock left, and profit." />
        {craftItems.length ? craftItems.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.category} · {getProductSellUnitDescription(item)} · {item.status === 'archived' ? 'Archived' : 'Active'} · {getProductCostStatusLabel(item)}</Text>
            <Text style={styles.rowMeta}>On hand {formatNumber(item.quantityOnHand, 0)} {getProductSellUnitLabel(item, item.quantityOnHand)} · Sold {formatNumber(item.quantitySold, 0)} {getProductSellUnitLabel(item, item.quantitySold)} · Restocked {formatNumber(item.quantityRestocked, 0)} · Reorder {formatNumber(item.reorderLevel, 0)}</Text>
            <Text style={styles.rowMeta}>{item.inventoryStatusLabel}{item.lastRestockDate ? ` · Last restock ${item.lastRestockDate}` : ''}</Text>
            <Text style={styles.rowMeta}>Sale price {formatWithUnit(item.sellingPrice, '$', 2)} · Cost per sell unit {formatWithUnit(item.costPerSellUnit, '$', 2)}</Text>
            {item.costMissing ? <Text style={styles.warningText}>Cost Pending. Profit not trusted yet.</Text> : <Text style={styles.rowMeta}>Trusted profit {formatWithUnit(item.profit, '$', 2)}</Text>}
            <Pressable style={styles.inlineLink} onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })}><Text style={styles.inlineLinkLabel}>Restock this product</Text></Pressable>
          </View>
        )) : <Text style={styles.emptyText}>No craft products yet.</Text>}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  groupTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginTop: 4 },
  noteText: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  rowCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  lowStockCard: { backgroundColor: theme.colors.accentSoft },
  rowTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  rowMeta: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  warningText: { color: '#9b3b34', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  inlineLink: { alignSelf: 'flex-start', paddingTop: 4 },
  inlineLinkLabel: { color: theme.colors.accent, fontSize: 14, fontWeight: '800' },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
});
