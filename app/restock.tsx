import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { addRestock, getDashboardSnapshot, getProductById, getProductSellUnitDescription, getProductSellUnitLabel, listProducts, subscribeBusinessState } from '../supabase/src/features/business/store';
import { getLocalDay } from '../supabase/src/lib/date';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

function parsePositive(value: string, label: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be more than 0.`);
  }
  return parsed;
}

function getMonthFromDate(value: string) {
  return value.trim().slice(0, 7);
}

export default function RestockScreen() {
  const params = useLocalSearchParams<{ productId?: string }>();
  const routeProductId = typeof params.productId === 'string' ? params.productId : '';
  const [statusMessage, setStatusMessage] = useState('Add stock without editing the original product setup.');
  const [productId, setProductId] = useState(routeProductId);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listProducts>>>([]);
  const [product, setProduct] = useState<Awaited<ReturnType<typeof getProductById>>>(null);
  const [productQuery, setProductQuery] = useState('');
  const [currentStock, setCurrentStock] = useState(0);
  const [date, setDate] = useState(getLocalDay());
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [nextProducts, dashboard] = await Promise.all([listProducts(), getDashboardSnapshot()]);
    setProducts(nextProducts);

    const resolvedProductId = routeProductId && nextProducts.some((item) => item.productId === routeProductId)
      ? routeProductId
      : productId && nextProducts.some((item) => item.productId === productId)
        ? productId
        : '';

    if (routeProductId && resolvedProductId !== productId) {
      setProductId(resolvedProductId);
    }

    if (!resolvedProductId) {
      setProduct(null);
      setCurrentStock(0);
      setStatusMessage(nextProducts.length ? 'Type to search, then tap the exact product you want to restock.' : 'Add a product first, then you can restock it here.');
      return;
    }

    const next = nextProducts.find((item) => item.productId === resolvedProductId) ?? await getProductById(resolvedProductId);
    setProduct(next ?? null);
    const snapshot = dashboard.productSnapshots.find((item) => item.productId === resolvedProductId) ?? dashboard.auditProductSnapshots?.find((item) => item.productId === resolvedProductId) ?? null;
    setCurrentStock(snapshot?.quantityOnHand ?? 0);

    if (!next) {
      setStatusMessage('That product could not be found for restocking.');
    } else {
      setStatusMessage('Type to search, then tap the exact product you want to restock.');
    }
  }, [productId, routeProductId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);
  useEffect(() => {
    if (routeProductId && routeProductId !== productId) {
      setProductId(routeProductId);
    }
  }, [routeProductId, productId]);

  const selectedProduct = useMemo(() => products.find((item) => item.productId === productId) ?? product, [products, product, productId]);
  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((item) => {
      const haystack = `${item.name} ${item.category} ${getProductSellUnitDescription(item)}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [productQuery, products]);
  const hasExactMatch = useMemo(() => products.some((item) => item.name.trim().toLowerCase() === productQuery.trim().toLowerCase()), [productQuery, products]);

  useEffect(() => {
    if (routeProductId && selectedProduct && selectedProduct.name !== productQuery) {
      setProductQuery(selectedProduct.name);
    }
  }, [routeProductId, selectedProduct, productQuery]);

  function handleProductQueryChange(value: string) {
    setProductQuery(value);
    if (productId) {
      setProductId('');
      setProduct(null);
      setCurrentStock(0);
    }
  }

  async function handleSave() {
    try {
      if (!selectedProduct) throw new Error('Choose a product first.');
      setSaving(true);
      await addRestock({
        productId: selectedProduct.productId,
        date: date as `${number}-${number}-${number}`,
        month: getMonthFromDate(date),
        quantityAdded: parsePositive(amount, 'Restock amount'),
        note: note.trim() || undefined,
      });
      router.replace({ pathname: '/inventory', params: { restocked: '1', productName: selectedProduct.name } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save restock.';
      setStatusMessage(message);
      Alert.alert('Could not save restock', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Restock" title="Restock product" subtitle="Increase stock with a dated adjustment row so inventory stays trustworthy." />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Product" subtitle="Type to search, then tap the exact product you want." />
        <TextField label="Product" value={productQuery} onChangeText={handleProductQueryChange} placeholder="Butter tarts" dense />
        <Text style={styles.selectionText}>Selected product: {selectedProduct?.name ?? 'None selected'}</Text>
        <View style={styles.productGrid}>
          {filteredProducts.length ? filteredProducts.map((item) => (
            <Pressable
              key={item.productId}
              accessibilityRole="button"
              accessibilityLabel={`Select product ${item.name}`}
              style={[styles.productChip, selectedProduct?.productId === item.productId ? styles.productChipActive : null]}
              onPress={() => {
                setProductId(item.productId);
                setProduct(item);
                setProductQuery(item.name);
              }}
            >
              <Text style={[styles.productTitle, selectedProduct?.productId === item.productId ? styles.productTitleActive : null]}>{item.name}</Text>
              <Text style={[styles.productMeta, selectedProduct?.productId === item.productId ? styles.productMetaActive : null]}>{getProductSellUnitDescription(item)} · {item.category} · {formatWithUnit(item.sellingPrice, '$', 2)} per sell unit</Text>
            </Pressable>
          )) : <Text style={styles.emptyText}>No matching product found. Add this product first.</Text>}
        </View>
        {productQuery.trim() && !selectedProduct && filteredProducts.length > 0 && !hasExactMatch ? <Text style={styles.helperText}>Tap the exact product from the list below before saving.</Text> : null}
        {selectedProduct ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewText}>Current stock: {formatNumber(currentStock, 0)} {getProductSellUnitLabel(selectedProduct, currentStock)}</Text>
            <Text style={styles.previewText}>After this restock: {formatNumber(currentStock + Math.max(0, Number(amount || '0')), 0)} {getProductSellUnitLabel(selectedProduct, currentStock + Math.max(0, Number(amount || '0')))}</Text>
          </View>
        ) : null}
        <TextField label="Restock amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder={selectedProduct ? `How many ${getProductSellUnitLabel(selectedProduct, 2)}?` : '1'} dense />
        <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" dense />
        <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional note" dense />
        <Button label={saving ? 'Saving Restock…' : 'Save Restock'} onPress={() => { void handleSave(); }} disabled={saving || !selectedProduct} />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  productChip: { minWidth: '48%', flexGrow: 1, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  productChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  productTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  productTitleActive: { color: theme.colors.primaryText },
  productMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  productMetaActive: { color: '#f5ede3' },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
  selectionText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  helperText: { color: theme.colors.mutedText, fontSize: 14 },
  previewCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  previewText: { color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
