import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { theme } from '../supabase/src/constants/theme';
import { getBusinessSectionSnapshot, getProductSellUnitDescription, getProductSellUnitLabel, subscribeBusinessState } from '../supabase/src/features/business/store';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

export default function CraftsScreen() {
  const [statusMessage, setStatusMessage] = useState('The Travelling Crafting Nana products, stock, and sales in one place.');
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getBusinessSectionSnapshot>> | null>(null);

  const refresh = useCallback(async () => {
    const next = await getBusinessSectionSnapshot('craft');
    setSnapshot(next);
    setStatusMessage(next.products.length ? 'Craft section is ready.' : 'Add a craft product first to start tracking your craft side.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Crafts" title="The Travelling Crafting Nana" subtitle="Only your craft items live here, so it stays separate from baking." />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Craft quick view" subtitle="Simple totals and fast craft-only actions." />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatNumber(snapshot?.products.length, 0)}</Text><Text style={styles.summaryLabel}>Products</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatWithUnit(snapshot?.totalSales, '$', 2)}</Text><Text style={styles.summaryLabel}>Sales</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatWithUnit(snapshot?.totalProfit, '$', 2)}</Text><Text style={styles.summaryLabel}>Profit</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatNumber(snapshot?.lowStockItems.length, 0)}</Text><Text style={styles.summaryLabel}>Need making</Text></View>
        </View>
        <Button label="Add Craft Product" onPress={() => router.push('/product')} />
        <Button label="Add Craft Sale" onPress={() => router.push('/sale')} />
      </Card>

      <Card>
        <SectionHeader title="Craft products" subtitle="Product unit, cost, selling price, stock left, and profit in one scan." />
        {snapshot?.products.length ? snapshot.products.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name} — {getProductSellUnitDescription(item)}</Text>
            <Text style={styles.rowMeta}>{item.category}</Text>
            <Text style={styles.rowMeta}>Selling as {getProductSellUnitDescription(item)} · Price {formatWithUnit(item.sellingPrice, '$', 2)}</Text>
            <Text style={styles.rowMeta}>Cost per sell unit {formatWithUnit(item.costPerSellUnit, '$', 2)}</Text>
            <Text style={styles.rowMeta}>On hand {formatNumber(item.quantityOnHand, 0)} {getProductSellUnitLabel(item, item.quantityOnHand)} · Sold {formatNumber(item.quantitySold, 0)} {getProductSellUnitLabel(item, item.quantitySold)} · Profit {formatWithUnit(item.profit, '$', 2)}</Text>
          </View>
        )) : <Text style={styles.emptyText}>No craft products yet.</Text>}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  summaryTile: { minWidth: '48%', flexGrow: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.sm, backgroundColor: theme.colors.softSurface, gap: 4 },
  summaryValue: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  summaryLabel: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  rowCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  rowTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  rowMeta: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
});
