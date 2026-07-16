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
import { addGiveaway, BusinessType, getGiveawayById, getPackageCost, getProductSellUnitDescription, getProductSellUnitLabel, listProducts, subscribeBusinessState, updateGiveaway } from '../supabase/src/features/business/store';
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

export default function GiveawaysScreen() {
  const params = useLocalSearchParams<{ giveawayId?: string }>();
  const editingGiveawayId = typeof params.giveawayId === 'string' ? params.giveawayId : null;
  const isEditing = Boolean(editingGiveawayId);
  const [statusMessage, setStatusMessage] = useState('Save giveaway and promo rows without mixing them into sales.');
  const [businessType, setBusinessType] = useState<BusinessType>('bakery');
  const [productId, setProductId] = useState('');
  const [quantityGivenAway, setQuantityGivenAway] = useState('1');
  const [date, setDate] = useState(getLocalDay());
  const [month, setMonth] = useState(getMonthFromDate(getLocalDay()));
  const [category, setCategory] = useState('');
  const [estimatedSaleValue, setEstimatedSaleValue] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [reasonEnabled, setReasonEnabled] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listProducts>>>([]);

  const refresh = useCallback(async () => {
    const nextProducts = await listProducts();
    setProducts(nextProducts);
    const currentProducts = nextProducts.filter((item) => item.businessType === businessType);
    if (!currentProducts.length) {
      setProductId('');
      return;
    }
    if (!currentProducts.find((item) => item.productId === productId)) {
      setProductId(currentProducts[0].productId);
    }
  }, [businessType, productId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  useEffect(() => {
    if (!editingGiveawayId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const existing = await getGiveawayById(editingGiveawayId);
      if (!existing || cancelled) {
        if (!cancelled) {
          setStatusMessage('That giveaway row could not be found.');
        }
        return;
      }

      setBusinessType(existing.businessType);
      setProductId(existing.productId);
      setQuantityGivenAway(String(existing.quantityGivenAway));
      setDate(existing.date);
      setMonth(existing.month);
      setCategory(existing.category ?? '');
      setEstimatedSaleValue(String(existing.estimatedSaleValue));
      setEstimatedCost(String(existing.estimatedCost));
      const savedReason = existing.reason ?? existing.note ?? existing.notes ?? '';
      setReasonEnabled(Boolean(savedReason));
      setReason(savedReason ?? '');
      setStatusMessage('Editing existing giveaway row. Saving will update it instead of creating a duplicate.');
    })();

    return () => {
      cancelled = true;
    };
  }, [editingGiveawayId]);

  const filteredProducts = useMemo(() => products.filter((item) => item.businessType === businessType), [products, businessType]);
  const selectedProduct = filteredProducts.find((item) => item.productId === productId) ?? null;
  const quantity = Number(quantityGivenAway || '0');
  const derivedValue = selectedProduct ? Number((quantity * selectedProduct.sellingPrice).toFixed(2)) : 0;
  const derivedCost = selectedProduct ? Number((quantity * getPackageCost(selectedProduct)).toFixed(2)) : 0;
  const resolvedValue = estimatedSaleValue.trim() ? Number(estimatedSaleValue) : derivedValue;
  const resolvedCost = estimatedCost.trim() ? Number(estimatedCost) : derivedCost;

  useEffect(() => {
    if (!month.trim() || month.length < 7) {
      setMonth(getMonthFromDate(date));
    }
  }, [date, month]);

  useEffect(() => {
    if (selectedProduct && !category.trim()) {
      setCategory(selectedProduct.category);
    }
  }, [selectedProduct, category]);

  async function handleSave() {
    try {
      if (!selectedProduct) {
        throw new Error('Choose a product first.');
      }

      const parsedQuantity = parsePositive(quantityGivenAway, 'Quantity');
      const parsedValue = estimatedSaleValue.trim() ? parsePositive(estimatedSaleValue, 'Estimated sale value') : Number((parsedQuantity * selectedProduct.sellingPrice).toFixed(2));
      const parsedCost = estimatedCost.trim() ? parsePositive(estimatedCost, 'Estimated cost') : Number((parsedQuantity * getPackageCost(selectedProduct)).toFixed(2));

      setSaving(true);
      const savedEntry = isEditing && editingGiveawayId
        ? await updateGiveaway(editingGiveawayId, {
          productId: selectedProduct.productId,
          date: date as `${number}-${number}-${number}`,
          month,
          businessType,
          category,
          quantityGivenAway: parsedQuantity,
          estimatedSaleValue: parsedValue,
          estimatedCost: parsedCost,
          reason: reasonEnabled ? reason : undefined,
        })
        : await addGiveaway({
          productId: selectedProduct.productId,
          date: date as `${number}-${number}-${number}`,
          month,
          category,
          quantityGivenAway: parsedQuantity,
          estimatedSaleValue: parsedValue,
          estimatedCost: parsedCost,
          reason: reasonEnabled ? reason : undefined,
        });

      setStatusMessage(isEditing ? 'Giveaway updated successfully' : 'Giveaway saved successfully');
      setQuantityGivenAway('1');
      setCategory(selectedProduct.category);
      setEstimatedSaleValue('');
      setEstimatedCost('');
      setReasonEnabled(false);
      setReason('');
      router.replace({ pathname: '/today', params: { savedGiveaway: '1', giveawayName: savedEntry.productName } });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Giveaway save failed.');
      Alert.alert('Could not save giveaway', error instanceof Error ? error.message : 'Giveaway save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Giveaways" title={isEditing ? 'Edit giveaway row' : 'Add giveaway row'} subtitle={isEditing ? 'Update the existing giveaway row and save changes without creating a duplicate.' : 'Track freebies and promo rows separately so they do not count as normal sales.'} />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Business line" subtitle="Start with the business line this giveaway belongs to." />
        <View style={styles.businessRow}>
          {(['bakery', 'craft'] as BusinessType[]).map((value) => (
            <Pressable key={value} style={[styles.businessButton, businessType === value ? styles.businessButtonActive : null]} onPress={() => setBusinessType(value)}>
              <Text style={[styles.businessButtonLabel, businessType === value ? styles.businessButtonLabelActive : null]}>{value === 'bakery' ? 'Bakery' : 'Crafts'}</Text>
              <Text style={[styles.businessButtonMeta, businessType === value ? styles.businessButtonMetaActive : null]}>{value === 'bakery' ? 'Sweet Tarts' : 'Crafting Nana'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Product" subtitle="Choose the product that was given away or used for promo." />
        <View style={styles.productGrid}>
          {filteredProducts.length ? filteredProducts.map((item) => (
            <Pressable key={item.productId} style={[styles.productChip, productId === item.productId ? styles.productChipActive : null]} onPress={() => setProductId(item.productId)}>
              <Text style={[styles.productTitle, productId === item.productId ? styles.productTitleActive : null]}>{item.name} — {getProductSellUnitDescription(item)}</Text>
              <Text style={[styles.productMeta, productId === item.productId ? styles.productMetaActive : null]}>{item.category} · {formatWithUnit(item.sellingPrice, '$', 2)} value per sell unit</Text>
            </Pressable>
          )) : <Text style={styles.emptyText}>Add products first so giveaway tracking has something to choose from.</Text>}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Giveaway details" subtitle="Quantity, estimate, and reason all save separately from sales." />
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" dense /></View>
          <View style={styles.fieldCell}><TextField label="Month" value={month} onChangeText={setMonth} placeholder="YYYY-MM" dense /></View>
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label={`Quantity (${selectedProduct ? getProductSellUnitLabel(selectedProduct, 2) : 'units'})`} value={quantityGivenAway} onChangeText={setQuantityGivenAway} keyboardType="numeric" placeholder="1" dense /></View>
          <View style={styles.fieldCell}><TextField label="Category" value={category} onChangeText={setCategory} placeholder="Category" dense /></View>
        </View>
        <TextField label="Estimated sale value" value={estimatedSaleValue} onChangeText={setEstimatedSaleValue} keyboardType="numeric" placeholder={selectedProduct ? String(derivedValue.toFixed(2)) : '0.00'} dense />
        <TextField label="Estimated cost" value={estimatedCost} onChangeText={setEstimatedCost} keyboardType="numeric" placeholder={selectedProduct ? String(derivedCost.toFixed(2)) : '0.00'} dense />

        <Pressable style={styles.moreOptionsToggle} onPress={() => setReasonEnabled((value) => !value)}>
          <Text style={styles.moreOptionsLabel}>{reasonEnabled ? 'Hide reason / note' : 'Add reason / note'}</Text>
        </Pressable>
        {reasonEnabled ? <TextField label="Reason / note" value={reason} onChangeText={setReason} placeholder="Promo, sample, giveaway, thank-you, etc." dense /> : null}

        <View style={styles.mathCard}>
          <Text style={styles.mathText}>Product name: {selectedProduct?.name ?? 'Choose one'}</Text>
          <Text style={styles.mathText}>Business line: {businessType === 'bakery' ? 'Bakery' : 'Crafts'}</Text>
          <Text style={styles.mathText}>Category: {category || '—'}</Text>
          <Text style={styles.mathText}>Quantity: {formatNumber(quantity || 0, 0)} {selectedProduct ? getProductSellUnitLabel(selectedProduct, quantity || 1) : 'units'}</Text>
          <Text style={styles.mathStrong}>Estimated sale value: {formatWithUnit(Number.isFinite(resolvedValue) ? resolvedValue : 0, '$', 2)}</Text>
          <Text style={styles.mathStrong}>Estimated cost: {formatWithUnit(Number.isFinite(resolvedCost) ? resolvedCost : 0, '$', 2)}</Text>
        </View>

        <Button label={saving ? (isEditing ? 'Saving Changes…' : 'Saving Giveaway…') : isEditing ? 'Save Giveaway Changes' : 'Save Giveaway'} onPress={() => { void handleSave(); }} disabled={saving || !selectedProduct} />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  businessRow: { flexDirection: 'row', gap: theme.spacing.sm },
  businessButton: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 20, paddingVertical: 16, paddingHorizontal: theme.spacing.md, gap: 4 },
  businessButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  businessButtonLabel: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  businessButtonLabelActive: { color: theme.colors.primaryText },
  businessButtonMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  businessButtonMetaActive: { color: '#f7efe4' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  productChip: { minWidth: '48%', flexGrow: 1, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  productChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  productTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  productTitleActive: { color: theme.colors.primaryText },
  productMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  productMetaActive: { color: '#f5ede3' },
  fieldGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  fieldCell: { flex: 1 },
  moreOptionsToggle: { alignSelf: 'flex-start', paddingVertical: 4 },
  moreOptionsLabel: { color: theme.colors.accent, fontSize: 15, fontWeight: '800' },
  mathCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, padding: theme.spacing.sm, gap: 6 },
  mathText: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  mathStrong: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
});
