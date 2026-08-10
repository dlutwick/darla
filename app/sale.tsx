import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { addProduct, addSale, BAKERY_CATEGORIES, BusinessType, CRAFT_CATEGORIES, getDashboardSnapshot, getPackageCost, getProductSellUnitDescription, getProductSellUnitLabel, getSaleById, listProducts, ProductType, subscribeBusinessState, updateSale } from '../supabase/src/features/business/store';
import { getLocalDay } from '../supabase/src/lib/date';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

function parsePositive(value: string, label: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be more than 0.`);
  }
  return parsed;
}

function parseNonNegative(value: string, label: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
  return parsed;
}

type EntryMode = 'saved' | 'manual';
type ProductFilter = 'all' | 'my-product' | 'third-party';

export default function AddSaleScreen() {
  const params = useLocalSearchParams<{ saleId?: string | string[] }>();
  const editingSaleId = Array.isArray(params.saleId) ? params.saleId[0] ?? null : typeof params.saleId === 'string' ? params.saleId : null;
  const isEditing = Boolean(editingSaleId);
  const [statusMessage, setStatusMessage] = useState('Save a sales row fast, then jump back home.');
  const [businessType, setBusinessType] = useState<BusinessType>('bakery');
  const [entryMode, setEntryMode] = useState<EntryMode>('saved');
  const [productId, setProductId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [quantitySold, setQuantitySold] = useState('1');
  const [date, setDate] = useState(getLocalDay());
  const [noteEnabled, setNoteEnabled] = useState(false);
  const [note, setNote] = useState('');
  const [customPriceEnabled, setCustomPriceEnabled] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [selectedPriceOptionLabel, setSelectedPriceOptionLabel] = useState('');
  const [manualProductName, setManualProductName] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualProductType, setManualProductType] = useState<ProductType>('my-product');
  const [manualCostPerItem, setManualCostPerItem] = useState('');
  const [manualVendorName, setManualVendorName] = useState('');
  const [manualCommissionPercent, setManualCommissionPercent] = useState('25');
  const [saveManualAsProduct, setSaveManualAsProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [saleNotFound, setSaleNotFound] = useState(false);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof listProducts>>>([]);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>> | null>(null);
  const currentSelectionRef = useRef({ businessType, entryMode, productId });

  const categoryOptions = useMemo(() => businessType === 'bakery' ? BAKERY_CATEGORIES : CRAFT_CATEGORIES, [businessType]);
  const filteredProducts = useMemo(() => products.filter((item) => item.businessType === businessType), [products, businessType]);
  const availableSavedCategories = useMemo(() => ['all', ...new Set(filteredProducts.map((item) => item.category).filter(Boolean).sort((a, b) => a.localeCompare(b)))], [filteredProducts]);
  const rankedProducts = useMemo(() => {
    const counts = new Map((dashboard?.productSnapshots ?? []).map((item) => [item.productId, item.quantitySold]));
    return [...filteredProducts]
      .filter((item) => productFilter === 'all' ? true : item.productType === productFilter)
      .filter((item) => categoryFilter === 'all' ? true : item.category === categoryFilter)
      .filter((item) => {
        const text = [item.name, item.category, item.vendorName, item.notes].filter(Boolean).join(' ').toLowerCase();
        return !searchText.trim() || text.includes(searchText.trim().toLowerCase());
      })
      .sort((a, b) => {
        const diff = (counts.get(b.productId) ?? 0) - (counts.get(a.productId) ?? 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
  }, [categoryFilter, dashboard?.productSnapshots, filteredProducts, productFilter, searchText]);
  const selectedProduct = filteredProducts.find((item) => item.productId === productId) ?? null;
  const savedPriceOptions = selectedProduct?.priceOptions ?? [];
  const selectedPriceOption = !customPriceEnabled
    ? savedPriceOptions.find((option) => option.label === selectedPriceOptionLabel) ?? null
    : null;
  const savedEffectiveSellingPrice = selectedProduct
    ? customPriceEnabled && customPrice.trim()
      ? Number(customPrice)
      : selectedPriceOption
        ? Number((selectedPriceOption.totalPrice / selectedPriceOption.quantity).toFixed(2))
      : selectedProduct.sellingPrice
    : 0;
  const manualEffectiveSellingPrice = Number(manualPriceValue(customPrice));
  const effectiveSellingPrice = entryMode === 'saved' ? savedEffectiveSellingPrice : manualEffectiveSellingPrice;
  const totalSale = parseFloat((Number(quantitySold || '0') * Number(effectiveSellingPrice || '0')).toFixed(2));
  const quantityLabel = entryMode === 'saved' && selectedProduct ? getProductSellUnitLabel(selectedProduct, Number(quantitySold || '1')) : 'units';

  useEffect(() => {
    currentSelectionRef.current = { businessType, entryMode, productId };
  }, [businessType, entryMode, productId]);

  const refresh = useCallback(async () => {
    const [nextProducts, nextDashboard] = await Promise.all([listProducts(), getDashboardSnapshot()]);
    setProducts(nextProducts);
    setDashboard(nextDashboard);

    const currentSelectionState = currentSelectionRef.current;
    const currentProducts = nextProducts.filter((item) => item.businessType === currentSelectionState.businessType);
    const currentSelection = currentProducts.find((item) => item.productId === currentSelectionState.productId) ?? null;

    if (!currentProducts.length) {
      setProductId('');
      return;
    }

    if (!currentSelection && currentSelectionState.entryMode === 'saved') {
      setProductId(currentProducts[0].productId);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => subscribeBusinessState(() => { void refresh(); }), [refresh]);

  useEffect(() => {
    if (!availableSavedCategories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [availableSavedCategories, categoryFilter]);

  useEffect(() => {
    if (!editingSaleId) {
      setSaleNotFound(false);
      setStatusMessage('Save a sales row fast, then jump back home.');
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoadingEdit(true);
      setSaleNotFound(false);
      const existing = await getSaleById(editingSaleId);
      if (!existing || cancelled) {
        if (!cancelled) {
          setSaleNotFound(true);
          setStatusMessage('Sale not found.');
        }
        setLoadingEdit(false);
        return;
      }

      const matchedProduct = products.find((item) => item.productId === existing.productId) ?? null;
      setBusinessType(existing.businessType);
      setQuantitySold(String(existing.quantitySold));
      setSelectedPriceOptionLabel(existing.priceOptionLabel ?? '');
      setDate(existing.date);
      const savedNote = existing.note ?? existing.notes ?? '';
      setNoteEnabled(Boolean(savedNote));
      setNote(savedNote ?? '');

      if (matchedProduct) {
        setEntryMode('saved');
        setProductId(existing.productId);
        const hasCustomPrice = Math.abs(Number(existing.unitPrice ?? existing.sellingPrice) - Number(matchedProduct.sellingPrice ?? existing.unitPrice ?? existing.sellingPrice)) > 0.009;
        setCustomPriceEnabled(Boolean(!existing.priceOptionLabel && hasCustomPrice));
        setCustomPrice(!existing.priceOptionLabel && hasCustomPrice ? String(existing.unitPrice ?? existing.sellingPrice) : '');
      } else {
        setEntryMode('manual');
        setProductId('');
        setCustomPriceEnabled(true);
        setCustomPrice(String(existing.unitPrice ?? existing.sellingPrice ?? ''));
        setManualProductName(existing.productName || existing.itemName || '');
        setManualCategory(existing.category || '');
        setManualProductType(existing.productType ?? 'my-product');
        setManualCostPerItem(existing.productType === 'third-party' ? '' : String(existing.costPerItem ?? ''));
        setManualVendorName(existing.vendorName ?? '');
        setManualCommissionPercent(String(existing.commissionPercent || 25));
        setSaveManualAsProduct(false);
      }

      setSaleNotFound(false);
      setStatusMessage('Editing existing sales row. Saving will update it instead of creating a duplicate.');
      setLoadingEdit(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [editingSaleId, products]);

  function adjustQuantity(change: number) {
    const current = Math.max(1, Number(quantitySold || '1'));
    const next = Math.max(1, current + change);
    setSelectedPriceOptionLabel('');
    setQuantitySold(String(next));
  }

  function setManualQuantity(nextQuantity: string) {
    setSelectedPriceOptionLabel('');
    setQuantitySold(nextQuantity);
  }

  function selectProduct(nextProductId: string) {
    setProductId(nextProductId);
    setSelectedPriceOptionLabel('');
    setCustomPriceEnabled(false);
    setCustomPrice('');
  }

  function selectPriceOption(option: { label: string, quantity: number, totalPrice: number }) {
    setSelectedPriceOptionLabel(option.label);
    setCustomPriceEnabled(false);
    setCustomPrice('');
    setQuantitySold(String(option.quantity));
  }

  function resetAfterSave(savedSaleName: string) {
    setQuantitySold('1');
    setSelectedPriceOptionLabel('');
    setCustomPriceEnabled(false);
    setCustomPrice('');
    setNoteEnabled(false);
    setNote('');
    setManualProductName('');
    setManualCategory('');
    setManualProductType('my-product');
    setManualCostPerItem('');
    setManualVendorName('');
    setManualCommissionPercent('25');
    setSaveManualAsProduct(false);
    setSearchText('');
    setProductFilter('all');
    setCategoryFilter('all');
    void refresh();
    router.replace({ pathname: '/today', params: { savedSale: '1', saleName: savedSaleName } });
  }

  async function handleSave() {
    try {
      const parsedQuantity = parsePositive(quantitySold, 'Quantity');
      setSaving(true);

      if (entryMode === 'saved') {
        if (!selectedProduct) {
          throw new Error('Choose a saved product first.');
        }

        const parsedPrice = customPriceEnabled && customPrice.trim() ? parsePositive(customPrice, 'Unit price') : selectedPriceOption ? Number((selectedPriceOption.totalPrice / selectedPriceOption.quantity).toFixed(2)) : undefined;
        const priceOptionDetails = selectedPriceOption ? {
          priceOptionLabel: selectedPriceOption.label,
          priceOptionQuantity: selectedPriceOption.quantity,
          priceOptionTotalPrice: selectedPriceOption.totalPrice,
        } : {
          priceOptionLabel: null,
          priceOptionQuantity: null,
          priceOptionTotalPrice: null,
        };
        const savedEntry = isEditing && editingSaleId
          ? await updateSale(editingSaleId, {
            productId: selectedProduct.productId,
            quantitySold: parsedQuantity,
            date,
            sellingPrice: parsedPrice,
            ...priceOptionDetails,
            note: noteEnabled ? note : undefined,
          })
          : await addSale({
            productId: selectedProduct.productId,
            quantitySold: parsedQuantity,
            date,
            sellingPrice: parsedPrice,
            ...priceOptionDetails,
            note: noteEnabled ? note : undefined,
          });

        setStatusMessage(isEditing ? 'Sale updated successfully' : 'Sale saved successfully');
        resetAfterSave(savedEntry.productName);
        return;
      }

      if (!manualProductName.trim()) {
        throw new Error('Type a product name first.');
      }

      const parsedPrice = parsePositive(customPrice, 'Sell price');
      const parsedCost = manualProductType === 'my-product' ? parsePositive(manualCostPerItem, 'Cost per sell unit') : 0;
      const parsedCommission = manualProductType === 'third-party' ? parsePositive(manualCommissionPercent, 'Commission percent') : 0;
      if (manualProductType === 'third-party' && !manualVendorName.trim()) {
        throw new Error('Vendor name is required for a 3rd Party item.');
      }

      let savedProductId: string | undefined;
      if (saveManualAsProduct) {
        const matchingExisting = filteredProducts.find((item) => item.name.trim().toLowerCase() === manualProductName.trim().toLowerCase() && item.category.trim().toLowerCase() === manualCategory.trim().toLowerCase());
        if (matchingExisting) {
          savedProductId = matchingExisting.productId;
        } else {
          const newProduct = await addProduct({
            businessType,
            productType: manualProductType,
            name: manualProductName.trim(),
            category: manualCategory.trim() || (categoryOptions[0] ?? 'Other'),
            cost: manualProductType === 'my-product' ? parsedCost : 0,
            sellingPrice: parsedPrice,
            vendorName: manualProductType === 'third-party' ? manualVendorName.trim() : null,
            commissionPercent: manualProductType === 'third-party' ? parsedCommission : 0,
            sellUnitType: 'each',
            packSize: 1,
            startingInventory: 0,
            reorderLevel: 0,
            notes: 'Created from manual sale entry',
          });
          savedProductId = newProduct.productId;
        }
      }

      const savedEntry = isEditing && editingSaleId
        ? await updateSale(editingSaleId, savedProductId ? {
          productId: savedProductId,
          quantitySold: parsedQuantity,
          date,
          sellingPrice: parsedPrice,
          note: noteEnabled ? note : undefined,
        } : {
          quantitySold: parsedQuantity,
          date,
          sellingPrice: parsedPrice,
          note: noteEnabled ? note : undefined,
          businessType,
          productType: manualProductType,
          productName: manualProductName.trim(),
          category: manualCategory.trim(),
          vendorName: manualProductType === 'third-party' ? manualVendorName.trim() : null,
          commissionPercent: manualProductType === 'third-party' ? parsedCommission : 0,
          sellUnitType: 'each',
          packSize: 1,
          costPerItem: manualProductType === 'my-product' ? parsedCost : 0,
        })
        : await addSale(savedProductId ? {
          productId: savedProductId,
          quantitySold: parsedQuantity,
          date,
          sellingPrice: parsedPrice,
          note: noteEnabled ? note : undefined,
        } : {
          quantitySold: parsedQuantity,
          date,
          sellingPrice: parsedPrice,
          note: noteEnabled ? note : undefined,
          businessType,
          productType: manualProductType,
          productName: manualProductName.trim(),
          category: manualCategory.trim(),
          vendorName: manualProductType === 'third-party' ? manualVendorName.trim() : null,
          commissionPercent: manualProductType === 'third-party' ? parsedCommission : 0,
          sellUnitType: 'each',
          packSize: 1,
          costPerItem: manualProductType === 'my-product' ? parsedCost : 0,
        });

      setStatusMessage(saveManualAsProduct ? 'Sale saved and product added for future use.' : 'Manual sale saved successfully.');
      resetAfterSave(savedEntry.productName);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Sale save failed.');
      Alert.alert('Could not save sale', error instanceof Error ? error.message : 'Sale save failed.');
    } finally {
      setSaving(false);
    }
  }

  const manualCostTotal = manualProductType === 'my-product'
    ? Number((Number(quantitySold || '0') * Number(manualCostPerItem || '0')).toFixed(2))
    : 0;
  const manualProfit = manualProductType === 'my-product'
    ? Number((totalSale - manualCostTotal).toFixed(2))
    : 0;
  const manualCommissionEarned = manualProductType === 'third-party'
    ? Number((totalSale * ((Number(manualCommissionPercent || '25') || 25) / 100)).toFixed(2))
    : 0;
  const manualVendorShare = manualProductType === 'third-party'
    ? Number((totalSale - manualCommissionEarned).toFixed(2))
    : 0;

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Sales" title={isEditing ? 'Edit sales row' : 'Add sales row'} subtitle={isEditing ? 'Update the existing sales row and save changes without creating a duplicate.' : 'Pick a saved product or type one manually when something new pops up.'} />
      <InlineStatus message={statusMessage} />

      {saleNotFound && !loadingEdit ? (
        <Card>
          <SectionHeader title="Sale not found" subtitle="That saved sales row could not be loaded. It may have been deleted, voided from another session, or opened from an older unstable link." />
          <View style={styles.notFoundActions}>
            <Button label="Go to History" onPress={() => router.replace('/history')} />
            <Button label="Go to Add Sale" onPress={() => router.replace('/sale')} />
          </View>
        </Card>
      ) : null}

      {!saleNotFound ? <>
      <Card>
        <SectionHeader title="Business line" subtitle="Start with the business line you are selling from." />
        <View style={styles.businessRow}>
          {(['bakery', 'craft'] as BusinessType[]).map((value) => (
            <Pressable
              key={value}
              style={[styles.businessButton, businessType === value ? styles.businessButtonActive : null]}
              onPress={() => {
                setBusinessType(value);
                const first = products.find((item) => item.businessType === value);
                if (first) {
                  setProductId(first.productId);
                }
              }}
            >
              <Text style={[styles.businessButtonLabel, businessType === value ? styles.businessButtonLabelActive : null]}>{value === 'bakery' ? 'Bakery' : 'Crafts'}</Text>
              <Text style={[styles.businessButtonMeta, businessType === value ? styles.businessButtonMetaActive : null]}>{value === 'bakery' ? 'Sweet Tarts' : 'Crafting Nana'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="How do you want to enter this sale?" subtitle="Keep using saved products, or type a one-off/custom item when needed." />
        <View style={styles.modeRow}>
          {([
            ['saved', 'Use saved product'],
            ['manual', 'Type product manually'],
          ] as [EntryMode, string][]).map(([value, label]) => (
            <Pressable key={value} style={[styles.modeChip, entryMode === value ? styles.modeChipActive : null]} onPress={() => setEntryMode(value)}>
              <Text style={[styles.modeChipLabel, entryMode === value ? styles.modeChipLabelActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {entryMode === 'saved' ? (
        <Card>
          <SectionHeader title="Saved products" subtitle="Search, filter, and choose from every saved product in this business line." />
          <TextField label="Search saved products" value={searchText} onChangeText={setSearchText} placeholder="Search by product, category, vendor, or notes" dense />
          <Text style={styles.filterLabel}>Product type</Text>
          <View style={styles.filterRow}>
            {([
              ['all', 'All'],
              ['my-product', 'My Product'],
              ['third-party', '3rd Party'],
            ] as [ProductFilter, string][]).map(([value, label]) => (
              <Pressable key={value} style={[styles.filterChip, productFilter === value ? styles.filterChipActive : null]} onPress={() => setProductFilter(value)}>
                <Text style={[styles.filterChipLabel, productFilter === value ? styles.filterChipLabelActive : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterRow}>
            {availableSavedCategories.map((value) => (
              <Pressable key={value} style={[styles.filterChip, categoryFilter === value ? styles.filterChipActive : null]} onPress={() => setCategoryFilter(value)}>
                <Text style={[styles.filterChipLabel, categoryFilter === value ? styles.filterChipLabelActive : null]}>{value === 'all' ? 'All categories' : value}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.resultsCount}>{formatNumber(rankedProducts.length, 0)} saved product{rankedProducts.length === 1 ? '' : 's'} shown</Text>
          <View style={styles.productGrid}>
            {rankedProducts.length ? rankedProducts.map((item) => (
              <Pressable key={item.productId} style={[styles.productChip, productId === item.productId ? styles.productChipActive : null]} onPress={() => selectProduct(item.productId)}>
                <Text style={[styles.productTitle, productId === item.productId ? styles.productTitleActive : null]}>{item.name} — {getProductSellUnitDescription(item)}</Text>
                <Text style={[styles.productMeta, productId === item.productId ? styles.productMetaActive : null]}>{item.category} · {item.productType === 'third-party' ? `3rd Party · ${item.vendorName || 'Vendor'} · ${formatNumber(item.commissionPercent, 0)}%` : `My Product${item.vendorName ? ` · ${item.vendorName}` : ''}`} · {formatWithUnit(item.sellingPrice, '$', 2)} per {item.sellUnitType === 'pack' ? 'pack' : 'sell unit'}</Text>
              </Pressable>
            )) : <Text style={styles.emptyText}>No saved products match these filters yet.</Text>}
          </View>
        </Card>
      ) : (
        <Card>
          <SectionHeader title="Manual typed sale" subtitle="Use this for a one-off item now, and optionally save it as a real product for later." />
          <TextField label="Product name" value={manualProductName} onChangeText={setManualProductName} placeholder="Example: New tumbler design" dense />
          <TextField label="Category (optional for one-off sale)" value={manualCategory} onChangeText={setManualCategory} placeholder={categoryOptions[0] ?? 'Category'} dense />
          <Text style={styles.filterLabel}>Product type</Text>
          <View style={styles.filterRow}>
            {([
              ['my-product', 'My Product'],
              ['third-party', '3rd Party'],
            ] as [ProductType, string][]).map(([value, label]) => (
              <Pressable key={value} style={[styles.filterChip, manualProductType === value ? styles.filterChipActive : null]} onPress={() => setManualProductType(value)}>
                <Text style={[styles.filterChipLabel, manualProductType === value ? styles.filterChipLabelActive : null]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {manualProductType === 'my-product' ? (
            <TextField label="Cost per sell unit" value={manualCostPerItem} onChangeText={setManualCostPerItem} keyboardType="numeric" placeholder="0.00" dense />
          ) : null}
          {manualProductType === 'third-party' ? (
            <View style={styles.fieldGrid}>
              <View style={styles.fieldCell}><TextField label="Vendor Name" value={manualVendorName} onChangeText={setManualVendorName} placeholder="Donna" dense /></View>
              <View style={styles.fieldCell}><TextField label="Commission %" value={manualCommissionPercent} onChangeText={setManualCommissionPercent} keyboardType="numeric" placeholder="25" dense /></View>
            </View>
          ) : null}
          <View style={styles.filterRow}>
            <Pressable style={[styles.filterChip, !saveManualAsProduct ? styles.filterChipActive : null]} onPress={() => setSaveManualAsProduct(false)}>
              <Text style={[styles.filterChipLabel, !saveManualAsProduct ? styles.filterChipLabelActive : null]}>Save just this sale row</Text>
            </Pressable>
            <Pressable style={[styles.filterChip, saveManualAsProduct ? styles.filterChipActive : null]} onPress={() => setSaveManualAsProduct(true)}>
              <Text style={[styles.filterChipLabel, saveManualAsProduct ? styles.filterChipLabelActive : null]}>Save as new product too</Text>
            </Pressable>
          </View>
          <Text style={styles.helpText}>{saveManualAsProduct ? `This will save the sale and create a reusable product with ${manualProductType === 'my-product' ? 'your cost and ' : ''}zero starting inventory and zero reorder level.` : 'This saves only the sale row. It does not create a permanent product.'}</Text>
        </Card>
      )}

      <Card>
        <SectionHeader title="Quantity, unit price, and sale total" subtitle="Use the quick buttons or type how many units you sold, then save the sales row." />
        <Text style={styles.helpText}>Manual typed sales save as each/unit rows. Saved products keep their normal sell-unit setup automatically.</Text>
        <View style={styles.quickQuantityRow}>
          <Pressable style={styles.stepButton} onPress={() => adjustQuantity(-1)}>
            <Text style={styles.stepButtonLabel}>−</Text>
          </Pressable>
          <View style={styles.quantityValueCard}>
            <Text style={styles.quantityValue}>{formatNumber(Number(quantitySold || '0'), 0)}</Text>
            <Text style={styles.quantityCaption}>{quantityLabel}</Text>
          </View>
          <Pressable style={styles.stepButton} onPress={() => adjustQuantity(1)}>
            <Text style={styles.stepButtonLabel}>+</Text>
          </Pressable>
        </View>

        <View style={styles.quickPickRow}>
          {[1, 2, 3, 4, 6].map((value) => (
            <Pressable key={value} style={[styles.quickPickChip, Number(quantitySold || '0') === value ? styles.quickPickChipActive : null]} onPress={() => setManualQuantity(String(value))}>
              <Text style={[styles.quickPickLabel, Number(quantitySold || '0') === value ? styles.quickPickLabelActive : null]}>{value}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label={`Quantity (${quantityLabel})`} value={quantitySold} onChangeText={setManualQuantity} keyboardType="numeric" placeholder="1" dense /></View>
          <View style={styles.fieldCell}><TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" dense /></View>
        </View>

        {entryMode === 'saved' ? (
          <>
            {savedPriceOptions.length ? (
              <>
                <Text style={styles.filterLabel}>Saved price options</Text>
                <View style={styles.filterRow}>
                  {savedPriceOptions.map((option) => (
                    <Pressable
                      key={`${option.label}-${option.quantity}-${option.totalPrice}`}
                      style={[styles.filterChip, selectedPriceOptionLabel === option.label && !customPriceEnabled ? styles.filterChipActive : null]}
                      onPress={() => selectPriceOption(option)}
                    >
                      <Text style={[styles.filterChipLabel, selectedPriceOptionLabel === option.label && !customPriceEnabled ? styles.filterChipLabelActive : null]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.helpText}>Choosing one fills in the quantity and sale total for that price.</Text>
              </>
            ) : null}
            <Pressable style={styles.moreOptionsToggle} onPress={() => setCustomPriceEnabled((value) => !value)}>
              <Text style={styles.moreOptionsLabel}>{customPriceEnabled ? 'Use saved sell-unit price' : 'Edit sell-unit price only if needed'}</Text>
            </Pressable>
            {customPriceEnabled ? (
              <TextField label="Sell-unit price override" value={customPrice} onChangeText={setCustomPrice} keyboardType="numeric" placeholder={selectedProduct ? String(selectedProduct.sellingPrice) : '0'} dense />
            ) : null}
          </>
        ) : (
          <TextField label="Sell price" value={customPrice} onChangeText={setCustomPrice} keyboardType="numeric" placeholder="0.00" dense />
        )}

        <Pressable style={styles.moreOptionsToggle} onPress={() => setNoteEnabled((value) => !value)}>
          <Text style={styles.moreOptionsLabel}>{noteEnabled ? 'Hide note' : 'Add note'}</Text>
        </Pressable>
        {noteEnabled ? (
          <TextField label="Note" value={note} onChangeText={setNote} placeholder="Optional note" dense />
        ) : null}

        <View style={styles.saleMathCard}>
          <Text style={styles.saleMathText}>Product: {entryMode === 'saved' ? selectedProduct?.name ?? 'Choose one' : manualProductName.trim() || 'Type one'}</Text>
          <Text style={styles.saleMathText}>Type: {entryMode === 'saved' ? selectedProduct ? selectedProduct.productType === 'third-party' ? '3rd Party' : 'My Product' : '—' : manualProductType === 'third-party' ? '3rd Party' : 'My Product'}</Text>
          <Text style={styles.saleMathText}>Category: {entryMode === 'saved' ? selectedProduct?.category ?? '—' : manualCategory.trim() || '—'}</Text>
          <Text style={styles.saleMathText}>Selling as: {entryMode === 'saved' ? selectedProduct ? getProductSellUnitDescription(selectedProduct) : '—' : 'each'}</Text>
          {entryMode === 'saved' && selectedPriceOption ? <Text style={styles.saleMathText}>Price option: {selectedPriceOption.label}</Text> : null}
          {entryMode === 'saved' ? (
            selectedProduct?.productType === 'third-party'
              ? <>
                  <Text style={styles.saleMathText}>Vendor: {selectedProduct.vendorName || '—'}</Text>
                  <Text style={styles.saleMathText}>Commission percent: {formatNumber(selectedProduct.commissionPercent, 0)}%</Text>
                </>
              : <Text style={styles.saleMathText}>Cost per sell unit: {selectedProduct ? formatWithUnit(getPackageCost(selectedProduct), '$', 2) : '—'}</Text>
          ) : manualProductType === 'third-party' ? (
            <>
              <Text style={styles.saleMathText}>Vendor: {manualVendorName.trim() || '—'}</Text>
              <Text style={styles.saleMathText}>Commission percent: {formatNumber(Number(manualCommissionPercent || '25') || 25, 0)}%</Text>
            </>
          ) : (
            <>
              <Text style={styles.saleMathText}>Cost per sell unit: {formatWithUnit(Number(manualCostPerItem || '0'), '$', 2)}</Text>
              <Text style={styles.saleMathText}>Cost total: {formatWithUnit(manualCostTotal, '$', 2)}</Text>
            </>
          )}
          <Text style={styles.saleMathText}>Unit price: {formatWithUnit(effectiveSellingPrice, '$', 2)}</Text>
          {entryMode === 'saved' && selectedPriceOption ? <Text style={styles.saleMathText}>Option total: {formatWithUnit(selectedPriceOption.totalPrice, '$', 2)}</Text> : null}
          <Text style={styles.saleMathStrong}>Sale total: {formatWithUnit(totalSale, '$', 2)}</Text>
          {entryMode === 'saved' ? (
            selectedProduct?.productType === 'third-party'
              ? <>
                  <Text style={styles.saleMathText}>Commission earned: {formatWithUnit(Number((totalSale * ((selectedProduct.commissionPercent || 25) / 100)).toFixed(2)), '$', 2)}</Text>
                  <Text style={styles.saleMathText}>Vendor share: {formatWithUnit(Number((totalSale - (totalSale * ((selectedProduct.commissionPercent || 25) / 100))).toFixed(2)), '$', 2)}</Text>
                </>
              : null
          ) : manualProductType === 'third-party' ? (
            <>
              <Text style={styles.saleMathText}>Commission earned: {formatWithUnit(manualCommissionEarned, '$', 2)}</Text>
              <Text style={styles.saleMathText}>Vendor share: {formatWithUnit(manualVendorShare, '$', 2)}</Text>
            </>
          ) : (
            <Text style={styles.saleMathText}>Trusted profit: {formatWithUnit(manualProfit, '$', 2)}</Text>
          )}
        </View>

        <Button label={loadingEdit ? 'Loading…' : saving ? (isEditing ? 'Saving Changes…' : 'Saving Sale…') : isEditing ? 'Save Sale Changes' : 'Save Sale Now'} onPress={() => { void handleSave(); }} disabled={saving || loadingEdit || (entryMode === 'saved' ? !selectedProduct : !manualProductName.trim())} />
      </Card>
      </> : null}
    </AppScreen>
  );
}

function manualPriceValue(value: string) {
  return value.trim() || '0';
}

const styles = StyleSheet.create({
  businessRow: { flexDirection: 'row', gap: theme.spacing.sm },
  businessButton: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 20, paddingVertical: 16, paddingHorizontal: theme.spacing.md, gap: 4 },
  businessButtonActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  businessButtonLabel: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  businessButtonLabelActive: { color: theme.colors.primaryText },
  businessButtonMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  businessButtonMetaActive: { color: '#f7efe4' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  modeChip: { flex: 1, minWidth: '48%', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14 },
  modeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  modeChipLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  modeChipLabelActive: { color: theme.colors.primaryText },
  filterLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  filterChip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  filterChipLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  filterChipLabelActive: { color: theme.colors.primaryText },
  resultsCount: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  productChip: { minWidth: '48%', flexGrow: 1, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  productChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  productTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  productTitleActive: { color: theme.colors.primaryText },
  productMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  productMetaActive: { color: '#f5ede3' },
  quickQuantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  stepButton: { width: 72, minHeight: 72, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepButtonLabel: { color: theme.colors.primaryText, fontSize: 38, fontWeight: '800', lineHeight: 40 },
  quantityValueCard: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, backgroundColor: theme.colors.softSurface, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { color: theme.colors.text, fontSize: 34, fontWeight: '800' },
  quantityCaption: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  quickPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  quickPickChip: { minWidth: 56, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  quickPickChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  quickPickLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  quickPickLabelActive: { color: theme.colors.primaryText },
  fieldGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  fieldCell: { flex: 1 },
  emptyText: { color: theme.colors.mutedText, fontSize: 15 },
  helpText: { color: theme.colors.mutedText, fontSize: 13, lineHeight: 18 },
  moreOptionsToggle: { alignSelf: 'flex-start', paddingVertical: 4 },
  moreOptionsLabel: { color: theme.colors.accent, fontSize: 15, fontWeight: '800' },
  saleMathCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, padding: theme.spacing.sm, gap: 6 },
  saleMathText: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  saleMathStrong: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  notFoundActions: { gap: theme.spacing.sm },
});
