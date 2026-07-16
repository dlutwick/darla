import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { RecordActionRow } from '../supabase/src/components/ui/RecordActionRow';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { addProduct, archiveProduct, BAKERY_CATEGORIES, BusinessType, CRAFT_CATEGORIES, deleteProduct, getPackageCost, getProductById, getProductCostStatusLabel, getProductSellUnitDescription, getProfitPerSellUnit, getSuggestedSellUnitSetup, getThirdPartyConversionCandidates, listProducts, ProductType, productHasSavedHistory, restoreProduct, SELL_UNIT_TYPES, SellUnitType, subscribeBusinessState, updateProduct } from '../supabase/src/features/business/store';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

function parsePositive(value: string, label: string, allowZero = false) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`${label} must be ${allowZero ? '0 or more' : 'more than 0'}.`);
  }
  return parsed;
}

export default function AddProductScreen() {
  const params = useLocalSearchParams<{ productId?: string }>();
  const editingProductId = typeof params.productId === 'string' ? params.productId : null;
  const isEditing = Boolean(editingProductId);
  const [statusMessage, setStatusMessage] = useState('Add one product at a time so it is ready for sales rows, profit tracking, and monthly summaries.');
  const [businessType, setBusinessType] = useState<BusinessType>('bakery');
  const [productType, setProductType] = useState<ProductType>('my-product');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Butter Tarts');
  const [cost, setCost] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [vendorName, setVendorName] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('25');
  const initialSuggestion = getSuggestedSellUnitSetup('bakery', 'Butter Tarts');
  const [sellUnitType, setSellUnitType] = useState<SellUnitType>(initialSuggestion.sellUnitType);
  const [customUnitName, setCustomUnitName] = useState('');
  const [packSize, setPackSize] = useState(initialSuggestion.packSize > 1 ? String(initialSuggestion.packSize) : '');
  const [startingInventory, setStartingInventory] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Awaited<ReturnType<typeof listProducts>>>([]);
  const [lastSavedProduct, setLastSavedProduct] = useState<Awaited<ReturnType<typeof addProduct>> | null>(null);
  const [conversionCandidates, setConversionCandidates] = useState<Awaited<ReturnType<typeof getThirdPartyConversionCandidates>>>([]);

  const categoryOptions = useMemo(() => businessType === 'bakery' ? BAKERY_CATEGORIES : CRAFT_CATEGORIES, [businessType]);
  const resolvedPackSize = sellUnitType === 'pack' ? Math.max(1, Number(packSize || '1')) : 1;
  const costPerSellUnit = Number.isFinite(Number(cost)) ? Number(cost) : 0;
  const pricingPreview = {
    businessType,
    name: productName,
    category,
    productType,
    cost: productType === 'third-party' ? 0 : costPerSellUnit,
    sellingPrice: Number.isFinite(Number(sellingPrice)) ? Number(sellingPrice) : 0,
    vendorName: productType === 'third-party' ? vendorName.trim() || null : null,
    commissionPercent: productType === 'third-party' ? Number(commissionPercent || '25') : 0,
    sellUnitType,
    customUnitName: customUnitName.trim() || null,
    packSize: resolvedPackSize,
    startingInventory: Number.isFinite(Number(startingInventory)) ? Number(startingInventory) : 0,
    reorderLevel: Number.isFinite(Number(reorderLevel)) ? Number(reorderLevel) : 0,
    notes: notes.trim() || null,
    batchSize: null,
    batchCost: null,
    productId: 'preview',
    createdAt: '',
    updatedAt: '',
  };

  const refresh = useCallback(async () => {
    const items = await listProducts(undefined, { includeArchived: true });
    setRecentProducts([...items].sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`)).slice(0, 6));
    setConversionCandidates(await getThirdPartyConversionCandidates());
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    if (!categoryOptions.includes(category)) {
      const nextCategory = categoryOptions[0] ?? '';
      setCategory(nextCategory);
      const suggestion = getSuggestedSellUnitSetup(businessType, nextCategory);
      setSellUnitType(suggestion.sellUnitType);
      setPackSize(suggestion.packSize > 1 ? String(suggestion.packSize) : '');
      setCustomUnitName('');
    }
  }, [businessType, category, categoryOptions]);

  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  useEffect(() => {
    if (!editingProductId) {
      setStatusMessage('Add one product at a time so it is ready for sales rows, profit tracking, and monthly summaries.');
      return;
    }

    let cancelled = false;
    void (async () => {
      const existing = await getProductById(editingProductId);
      if (!existing || cancelled) {
        if (!cancelled) {
          setStatusMessage('That product could not be found.');
        }
        return;
      }

      setBusinessType(existing.businessType);
      setProductType(existing.productType ?? 'my-product');
      setProductName(existing.name);
      setCategory(existing.category);
      setCost(String(existing.cost));
      setSellingPrice(String(existing.sellingPrice));
      setVendorName(existing.vendorName ?? '');
      setCommissionPercent(String(existing.commissionPercent || 25));
      setSellUnitType(existing.sellUnitType);
      setCustomUnitName(existing.customUnitName ?? '');
      setPackSize(existing.sellUnitType === 'pack' ? String(existing.packSize ?? 1) : '');
      setStartingInventory(String(existing.startingInventory));
      setReorderLevel(String(existing.reorderLevel));
      setNotes(existing.notes ?? '');
      setStatusMessage('Editing existing product. Saving will update it instead of creating a duplicate.');
    })();

    return () => {
      cancelled = true;
    };
  }, [editingProductId]);

  function applySuggestedSellUnit(nextBusinessType: BusinessType, nextCategory: string) {
    const suggestion = getSuggestedSellUnitSetup(nextBusinessType, nextCategory);
    setSellUnitType(suggestion.sellUnitType);
    setPackSize(suggestion.packSize > 1 ? String(suggestion.packSize) : '');
    if (typeof suggestion.sellingPrice === 'number') {
      setSellingPrice(String(suggestion.sellingPrice));
    }
    setCustomUnitName('');
  }

  async function handleSave() {
    try {
      if (!productName.trim()) throw new Error('Product name is required.');
      if (!category.trim()) throw new Error('Category is required.');
      if (productType === 'third-party' && !vendorName.trim()) throw new Error('Vendor name is required for a 3rd Party product.');
      if (sellUnitType === 'custom' && !customUnitName.trim()) throw new Error('Custom sell unit is required.');
      setSaving(true);

      const payload = {
        businessType,
        productType,
        name: productName,
        category,
        cost: productType === 'third-party' ? 0 : parsePositive(cost, 'Cost per sell unit', true),
        sellingPrice: parsePositive(sellingPrice, 'Sale price per sell unit', true),
        vendorName: productType === 'third-party' ? vendorName : null,
        commissionPercent: productType === 'third-party' ? parsePositive(commissionPercent, 'Commission percent', true) : 0,
        sellUnitType,
        customUnitName: sellUnitType === 'custom' ? customUnitName : null,
        packSize: sellUnitType === 'pack' ? parsePositive(packSize || '1', 'Pack size') : 1,
        startingInventory: parsePositive(startingInventory, 'Starting inventory', true),
        reorderLevel: parsePositive(reorderLevel, 'Reorder level', true),
        notes,
      };

      const savedProduct = isEditing && editingProductId
        ? await updateProduct(editingProductId, payload)
        : await addProduct(payload);
      setLastSavedProduct(savedProduct);

      setProductName('');
      setNotes('');
      setCost('0');
      setSellingPrice('0');
      setVendorName('');
      setCommissionPercent('25');
      setProductType('my-product');
      const resetSuggestion = getSuggestedSellUnitSetup(businessType, category);
      setSellUnitType(resetSuggestion.sellUnitType);
      setCustomUnitName('');
      setPackSize(resetSuggestion.packSize > 1 ? String(resetSuggestion.packSize) : '');
      setStartingInventory('0');
      setReorderLevel('0');
      setStatusMessage(isEditing ? 'Product updated. All dependent views now use the new setup.' : 'Product saved. You can enter another one or jump to Add Sale.');
      await refresh();
    } catch (error) {
      Alert.alert('Could not save product', error instanceof Error ? error.message : 'Product save failed.');
    } finally {
      setSaving(false);
    }
  }

  function handleViewProduct(item: NonNullable<typeof lastSavedProduct>) {
    Alert.alert(
      item.name,
      [
        item.businessType === 'bakery' ? 'Bakery' : 'Crafts',
        item.productType === 'third-party' ? '3rd Party' : 'My Product',
        item.category,
        getProductSellUnitDescription(item),
        `Sale price: ${formatWithUnit(item.sellingPrice, '$', 2)}`,
        item.productType === 'third-party' ? `Vendor: ${item.vendorName || '—'}` : `Cost per sell unit: ${formatWithUnit(item.cost, '$', 2)}`,
        item.productType === 'third-party' ? `Commission: ${formatNumber(item.commissionPercent, 0)}%` : `Profit per sell unit: ${formatWithUnit(getProfitPerSellUnit(item), '$', 2)}`,
        `Starting inventory: ${formatNumber(item.startingInventory, 0)}`,
        `Reorder level: ${formatNumber(item.reorderLevel, 0)}`,
        item.notes ? `Notes: ${item.notes}` : 'No notes saved.',
      ].join('\n')
    );
  }

  function handleDeleteProduct(item: Awaited<ReturnType<typeof listProducts>>[number]) {
    void (async () => {
      const hasHistory = await productHasSavedHistory(item.productId);
      if (item.status === 'archived') {
        Alert.alert('Restore product?', `${item.name} will become active again and show up in new sale, giveaway, and restock selectors.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: () => {
              void (async () => {
                await restoreProduct(item.productId);
                setStatusMessage(`${item.name} restored.`);
                await refresh();
              })();
            },
          },
        ]);
        return;
      }

      if (hasHistory) {
        Alert.alert('Archive product?', `${item.name} has saved history, so it will be archived instead of deleted. Historical rows stay linked, but the product will be hidden from new sale, giveaway, and restock selectors until restored.`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive',
            style: 'destructive',
            onPress: () => {
              void (async () => {
                await archiveProduct(item.productId);
                setStatusMessage(`${item.name} archived.`);
                await refresh();
              })();
            },
          },
        ]);
        return;
      }

      Alert.alert('Delete product?', `${item.name} has no saved sales, giveaways, or restocks, so it can be deleted safely.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteProduct(item.productId);
              setStatusMessage(`${item.name} deleted.`);
              await refresh();
            })();
          },
        },
      ]);
    })();
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Products" title={isEditing ? 'Edit product' : 'Fast product setup'} subtitle={isEditing ? 'Update the existing product and save changes without creating a duplicate.' : 'Keep building your product list over time. Add a product once, choose its business line and category, and the app will use that setup everywhere else.'} />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Business line" subtitle="Pick which business line this product belongs to." />
        <View style={styles.chipRow}>
          {(['bakery', 'craft'] as BusinessType[]).map((value) => (
            <Pressable key={value} style={[styles.chip, businessType === value ? styles.chipActive : null]} onPress={() => { const nextCategory = value === 'bakery' ? BAKERY_CATEGORIES[0] : CRAFT_CATEGORIES[0]; setBusinessType(value); setCategory(nextCategory); applySuggestedSellUnit(value, nextCategory); }}>
              <Text style={[styles.chipLabel, businessType === value ? styles.chipLabelActive : null]}>{value === 'bakery' ? 'Bakery' : 'Craft'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Product details" subtitle="Set the item, category, and how it sells. The app will keep both sale price and cost per sell unit visible and trustworthy." />
        <TextField label="Product name" value={productName} onChangeText={setProductName} placeholder="Example: Butter tarts" />
        <Text style={styles.helperLabel}>Product type</Text>
        <View style={styles.chipRow}>
          {([
            ['my-product', 'My Product'],
            ['third-party', '3rd Party'],
          ] as [ProductType, string][]).map(([value, label]) => (
            <Pressable key={value} style={[styles.chip, productType === value ? styles.chipActive : null]} onPress={() => setProductType(value)}>
              <Text style={[styles.chipLabel, productType === value ? styles.chipLabelActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helperLabel}>Category</Text>
        <View style={styles.chipRow}>
          {categoryOptions.map((option) => (
            <Pressable key={option} style={[styles.chip, category === option ? styles.chipActive : null]} onPress={() => { setCategory(option); applySuggestedSellUnit(businessType, option); }}>
              <Text style={[styles.chipLabel, category === option ? styles.chipLabelActive : null]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.helperLabel}>Sell unit</Text>
        <View style={styles.chipRow}>
          {SELL_UNIT_TYPES.map((option) => (
            <Pressable key={option} style={[styles.chip, sellUnitType === option ? styles.chipActive : null]} onPress={() => setSellUnitType(option)}>
              <Text style={[styles.chipLabel, sellUnitType === option ? styles.chipLabelActive : null]}>{option === 'custom' ? 'Custom' : option.charAt(0).toUpperCase() + option.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        {sellUnitType === 'custom' ? <TextField label="Custom sell unit" value={customUnitName} onChangeText={setCustomUnitName} placeholder="Example: tray" dense /> : null}
        {sellUnitType === 'pack' ? <TextField label="Pack size" value={packSize} onChangeText={setPackSize} keyboardType="numeric" placeholder="3" dense /> : null}
        {sellUnitType === 'pack' ? <Text style={styles.helpText}>Pack size means how many real items go into one package, for example 3 butter tarts or 4 cinnamon rolls.</Text> : null}
        {productType === 'third-party' ? <>
          <View style={styles.fieldGrid}>
            <View style={styles.fieldCell}><TextField label="Vendor Name" value={vendorName} onChangeText={setVendorName} placeholder="Example: Donna" dense /></View>
            <View style={styles.fieldCell}><TextField label="Commission Percent" value={commissionPercent} onChangeText={setCommissionPercent} keyboardType="numeric" placeholder="25" dense /></View>
          </View>
          <Text style={styles.helpText}>3rd-party items keep full sale totals for reporting, but only your commission counts as earned. Vendor share is tracked separately.</Text>
        </> : null}
        <View style={styles.fieldGrid}>
          {productType === 'my-product' ? <View style={styles.fieldCell}><TextField label="Cost per sell unit" value={cost} onChangeText={setCost} keyboardType="numeric" placeholder="0" dense /></View> : null}
          <View style={styles.fieldCell}><TextField label="Sale price per sell unit" value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" placeholder="0" dense /></View>
        </View>
        <Text style={styles.helpText}>{productType === 'third-party' ? 'For 3rd-party products, sale price drives commission math. Cost is not used for earnings.' : 'Enter the cost and sale price for one sell unit here. For packs, that means one full pack.'}</Text>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label="Starting inventory" value={startingInventory} onChangeText={setStartingInventory} keyboardType="numeric" placeholder="0" dense /></View>
          <View style={styles.fieldCell}><TextField label="Reorder level" value={reorderLevel} onChangeText={setReorderLevel} keyboardType="numeric" placeholder="0" dense /></View>
        </View>
        <Text style={styles.helpText}>Right now inventory is counted in sell units. That means packs count as packs, loaves count as loaves, and single items count as items.</Text>
        <View style={styles.rowCard}>
          <Text style={styles.rowTitle}>Pricing preview</Text>
          <Text style={styles.rowMeta}>Type: {productType === 'third-party' ? '3rd Party' : 'My Product'}</Text>
          <Text style={styles.rowMeta}>Sell as: {getProductSellUnitDescription(pricingPreview as never)}</Text>
          {productType === 'my-product' ? <>
            <Text style={styles.rowMeta}>Cost per {sellUnitType === 'pack' ? 'pack' : 'sell unit'}: {formatWithUnit(getPackageCost(pricingPreview as never), '$', 2)}</Text>
          </> : null}
          <Text style={styles.rowMeta}>Sale price per {sellUnitType === 'pack' ? 'pack' : 'sell unit'}: {formatWithUnit(pricingPreview.sellingPrice, '$', 2)}</Text>
          {productType === 'third-party' ? <>
            <Text style={styles.rowMeta}>Commission earned per {sellUnitType === 'pack' ? 'pack' : 'sell unit'}: {formatWithUnit(getProfitPerSellUnit(pricingPreview as never), '$', 2)}</Text>
            <Text style={styles.rowMeta}>Vendor share per {sellUnitType === 'pack' ? 'pack' : 'sell unit'}: {formatWithUnit(Number((Number(sellingPrice || '0') - getProfitPerSellUnit(pricingPreview as never)).toFixed(2)), '$', 2)}</Text>
            <Text style={styles.goodText}>Trusted earnings preview {formatWithUnit(getProfitPerSellUnit(pricingPreview as never), '$', 2)}</Text>
          </> : Number(cost || '0') <= 0 ? <Text style={styles.warningText}>Cost Pending. Profit not trusted yet.</Text> : <Text style={styles.goodText}>Trusted profit preview {formatWithUnit(getProfitPerSellUnit(pricingPreview as never), '$', 2)}</Text>}
        </View>
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes for sales rows or monthly summary" multiline numberOfLines={3} />
        <Button label={saving ? (isEditing ? 'Saving Changes…' : 'Saving…') : isEditing ? 'Save Product Changes' : 'Save Product'} onPress={() => { void handleSave(); }} disabled={saving} />
        <Button label="Open Product Audit" onPress={() => router.push('/product-audit')} />
      </Card>

      <Card>
        <SectionHeader title="Save proof" subtitle="This is the most recent product the app actually saved." />
        {lastSavedProduct ? (
          <View style={styles.rowCard}>
            <Text style={styles.rowTitle}>{lastSavedProduct.name} — {getProductSellUnitDescription(lastSavedProduct)}</Text>
            <Text style={styles.rowMeta}>{lastSavedProduct.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {lastSavedProduct.productType === 'third-party' ? '3rd Party' : 'My Product'} · {lastSavedProduct.category} · {lastSavedProduct.status === 'archived' ? 'Archived' : 'Active'}{lastSavedProduct.productType === 'third-party' ? ` · ${lastSavedProduct.vendorName || 'Vendor'} · ${formatNumber(lastSavedProduct.commissionPercent, 0)}% commission` : ` · ${getProductCostStatusLabel(lastSavedProduct)}`}</Text>
            <Text style={styles.rowMeta}>{formatWithUnit(lastSavedProduct.sellingPrice, '$', 2)} sale price per {lastSavedProduct.sellUnitType === 'pack' ? 'pack' : 'sell unit'}</Text>
            {lastSavedProduct.productType === 'third-party'
              ? <Text style={styles.rowMeta}>Commission earned {formatWithUnit(getProfitPerSellUnit(lastSavedProduct), '$', 2)} per sell unit · vendor share {formatWithUnit(Number((lastSavedProduct.sellingPrice - getProfitPerSellUnit(lastSavedProduct)).toFixed(2)), '$', 2)} · start {formatNumber(lastSavedProduct.startingInventory, 0)} · reorder {formatNumber(lastSavedProduct.reorderLevel, 0)}</Text>
              : <Text style={styles.rowMeta}>{formatWithUnit(getPackageCost(lastSavedProduct), '$', 2)} cost per sell unit · start {formatNumber(lastSavedProduct.startingInventory, 0)} · reorder {formatNumber(lastSavedProduct.reorderLevel, 0)}</Text>}
            {lastSavedProduct.productType === 'third-party' ? <Text style={styles.goodText}>Trusted commission {formatWithUnit(getProfitPerSellUnit(lastSavedProduct), '$', 2)} per sell unit</Text> : lastSavedProduct.cost <= 0 ? <Text style={styles.warningText}>Cost Pending. Profit not trusted yet.</Text> : <Text style={styles.goodText}>Trusted profit {formatWithUnit(getProfitPerSellUnit(lastSavedProduct), '$', 2)} per sell unit</Text>}
            {lastSavedProduct.status !== 'archived' ? <Pressable style={styles.inlineLink} onPress={() => router.push({ pathname: '/restock', params: { productId: lastSavedProduct.productId } })}><Text style={styles.inlineLinkLabel}>Restock this product</Text></Pressable> : null}
            <RecordActionRow onView={() => handleViewProduct(lastSavedProduct)} onEdit={() => router.push({ pathname: '/product', params: { productId: lastSavedProduct.productId } })} onDelete={() => handleDeleteProduct(lastSavedProduct)} deleteLabel={lastSavedProduct.status === 'archived' ? 'Restore' : 'Archive'} />
          </View>
        ) : <Text style={styles.emptyText}>Save a product and it will appear here.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Recent products" subtitle="A quick check that your list is building correctly." />
        {recentProducts.length ? recentProducts.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name} — {getProductSellUnitDescription(item)}</Text>
            <Text style={styles.rowMeta}>{item.businessType === 'bakery' ? 'Bakery' : 'Craft'} · {item.productType === 'third-party' ? '3rd Party' : 'My Product'} · {item.category} · {item.status === 'archived' ? 'Archived' : 'Active'}{item.productType === 'third-party' ? ` · ${item.vendorName || 'Vendor'} · ${formatNumber(item.commissionPercent, 0)}% commission` : ` · ${getProductCostStatusLabel(item)}`}</Text>
            <Text style={styles.rowMeta}>{formatWithUnit(item.sellingPrice, '$', 2)} sale price per {item.sellUnitType === 'pack' ? 'pack' : 'sell unit'}</Text>
            {item.productType === 'third-party'
              ? <Text style={styles.rowMeta}>Commission earned {formatWithUnit(getProfitPerSellUnit(item), '$', 2)} per sell unit · vendor share {formatWithUnit(Number((item.sellingPrice - getProfitPerSellUnit(item)).toFixed(2)), '$', 2)} · start {formatNumber(item.startingInventory, 0)} · reorder {formatNumber(item.reorderLevel, 0)}</Text>
              : <Text style={styles.rowMeta}>{formatWithUnit(getPackageCost(item), '$', 2)} cost per sell unit · start {formatNumber(item.startingInventory, 0)} · reorder {formatNumber(item.reorderLevel, 0)}</Text>}
            {item.productType === 'third-party' ? <Text style={styles.goodText}>Trusted commission {formatWithUnit(getProfitPerSellUnit(item), '$', 2)} per sell unit</Text> : item.cost <= 0 ? <Text style={styles.warningText}>Cost Pending. Profit not trusted yet.</Text> : <Text style={styles.goodText}>Trusted profit {formatWithUnit(getProfitPerSellUnit(item), '$', 2)} per sell unit</Text>}
            {item.status !== 'archived' ? <Pressable style={styles.inlineLink} onPress={() => router.push({ pathname: '/restock', params: { productId: item.productId } })}><Text style={styles.inlineLinkLabel}>Restock this product</Text></Pressable> : null}
            <RecordActionRow onView={() => handleViewProduct(item)} onEdit={() => router.push({ pathname: '/product', params: { productId: item.productId } })} onDelete={() => handleDeleteProduct(item)} deleteLabel={item.status === 'archived' ? 'Restore' : 'Archive'} />
          </View>
        )) : <Text style={styles.emptyText}>No products yet.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Possible 3rd-party conversions" subtitle="Legacy names with vendor clues, like donna, are listed here so they are easier to convert." />
        {conversionCandidates.length ? conversionCandidates.map((item) => (
          <View key={item.productId} style={styles.rowCard}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.businessType === 'bakery' ? 'Bakery' : 'Crafts'} · {item.category} · {item.productType === 'third-party' ? 'Already 3rd Party' : 'Review for 3rd Party'}{item.vendorName ? ` · vendor hint ${item.vendorName}` : ''}</Text>
            <Pressable style={styles.inlineLink} onPress={() => router.push({ pathname: '/product', params: { productId: item.productId } })}><Text style={styles.inlineLinkLabel}>Open this product</Text></Pressable>
          </View>
        )) : <Text style={styles.emptyText}>No obvious vendor-clue products found right now.</Text>}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  chipLabelActive: { color: theme.colors.primaryText },
  helperLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  fieldGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  fieldCell: { flex: 1 },
  helpText: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  rowCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  rowTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  rowMeta: { color: theme.colors.mutedText, fontSize: 14, lineHeight: 20 },
  goodText: { color: theme.colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  warningText: { color: '#9b3b34', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  inlineLink: { alignSelf: 'flex-start', paddingTop: 4 },
  inlineLinkLabel: { color: theme.colors.accent, fontSize: 14, fontWeight: '800' },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
});
