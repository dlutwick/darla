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

export default function BakeryScreen() {
  const [statusMessage, setStatusMessage] = useState('Sweet Tarts baking products and sales in one place.');
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getBusinessSectionSnapshot>> | null>(null);

  const refresh = useCallback(async () => {
    const next = await getBusinessSectionSnapshot('bakery');
    setSnapshot(next);
    setStatusMessage(next.products.length ? 'Bakery section is ready.' : 'Add a bakery product first to start tracking Sweet Tarts.');
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Bakery" title="Sweet Tarts Baking" subtitle="Only your bakery items live here, so it stays separate from crafts." />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Bakery quick view" subtitle="Simple totals and fast bakery-only actions." />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatNumber(snapshot?.products.length, 0)}</Text><Text style={styles.summaryLabel}>Products</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatWithUnit(snapshot?.totalSales, '$', 2)}</Text><Text style={styles.summaryLabel}>Sales</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatWithUnit(snapshot?.totalProfit, '$', 2)}</Text><Text style={styles.summaryLabel}>Profit</Text></View>
          <View style={styles.summaryTile}><Text style={styles.summaryValue}>{formatNumber(snapshot?.sales.length, 0)}</Text><Text style={styles.summaryLabel}>Sales rows</Text></View>
        </View>
        <Button label="Add Bakery Product" onPress={() => router.push('/product')} />
        <Button label="Add Bakery Sale" onPress={() => router.push('/sale')} />
      </Card>

      <Card>
        <SectionHeader title="Bakery products" subtitle="Product unit, package cost, selling price, units sold, and profit in one scan." />
        {snapshot?.products.length ? snapshot.products.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name} — {getProductSellUnitDescription(item)}</Text>
            <Text style={styles.rowMeta}>{item.category}</Text>
            <Text style={styles.rowMeta}>Selling as {getProductSellUnitDescription(item)} · Price {formatWithUnit(item.sellingPrice, '$', 2)}</Text>
            <Text style={styles.rowMeta}>Cost per sell unit {formatWithUnit(item.costPerSellUnit, '$', 2)}</Text>
            <Text style={styles.rowMeta}>Sold {formatNumber(item.quantitySold, 0)} {getProductSellUnitLabel(item, item.quantitySold)} · Profit {formatWithUnit(item.profit, '$', 2)}</Text>
          </View>
        )) : <Text style={styles.emptyText}>No bakery products yet.</Text>}
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
