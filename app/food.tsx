import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { createCustomFood } from '../supabase/src/features/meals/custom-foods';
import { searchFoods } from '../supabase/src/features/meals/search';
import { getFoodCatalog, listFoodLogRows, loadTodaySnapshot, saveMealSelection, type FoodLogRow } from '../supabase/src/features/today/today-log';
import { getLocalDay } from '../supabase/src/lib/date';
import { formatNumber } from '../supabase/src/lib/format';
import type { FoodCategory, FoodItem, MealSlotKey } from '../supabase/src/types/health';

const CUP_PRESETS = [
  { label: '1/8 c', size: 1 / 8, unit: 'cup' },
  { label: '1/4 c', size: 1 / 4, unit: 'cup' },
  { label: '1/3 c', size: 1 / 3, unit: 'cup' },
  { label: '3/8 c', size: 3 / 8, unit: 'cup' },
  { label: '1/2 c', size: 1 / 2, unit: 'cup' },
  { label: '5/8 c', size: 5 / 8, unit: 'cup' },
  { label: '2/3 c', size: 2 / 3, unit: 'cup' },
  { label: '3/4 c', size: 3 / 4, unit: 'cup' },
  { label: '7/8 c', size: 7 / 8, unit: 'cup' },
  { label: '1 c', size: 1, unit: 'cup' },
] as const;

const TSP_PRESETS = [
  { label: '1/8 tsp', size: 1 / 8, unit: 'tsp' },
  { label: '1/4 tsp', size: 1 / 4, unit: 'tsp' },
  { label: '1/3 tsp', size: 1 / 3, unit: 'tsp' },
  { label: '1/2 tsp', size: 1 / 2, unit: 'tsp' },
  { label: '2/3 tsp', size: 2 / 3, unit: 'tsp' },
  { label: '3/4 tsp', size: 3 / 4, unit: 'tsp' },
  { label: '1 tsp', size: 1, unit: 'tsp' },
] as const;

const TBSP_PRESETS = [
  { label: '1/8 tbsp', size: 1 / 8, unit: 'tbsp' },
  { label: '1/4 tbsp', size: 1 / 4, unit: 'tbsp' },
  { label: '1/3 tbsp', size: 1 / 3, unit: 'tbsp' },
  { label: '1/2 tbsp', size: 1 / 2, unit: 'tbsp' },
  { label: '2/3 tbsp', size: 2 / 3, unit: 'tbsp' },
  { label: '3/4 tbsp', size: 3 / 4, unit: 'tbsp' },
  { label: '1 tbsp', size: 1, unit: 'tbsp' },
] as const;

const BASIC_UNIT_OPTIONS = ['pieces', 'ml', 'g'] as const;
const PORTION_SIZE_OPTIONS = ['small', 'medium', 'large'] as const;

const DISPLAY_FRACTIONS = [
  { value: 1 / 8, label: '1/8' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 3, label: '1/3' },
  { value: 3 / 8, label: '3/8' },
  { value: 1 / 2, label: '1/2' },
  { value: 5 / 8, label: '5/8' },
  { value: 2 / 3, label: '2/3' },
  { value: 3 / 4, label: '3/4' },
  { value: 7 / 8, label: '7/8' },
  { value: 1, label: '1' },
] as const;

function mealLabel(slotId: MealSlotKey) {
  switch (slotId) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'supper':
      return 'Dinner';
    case 'snack':
      return 'Snack';
  }
}

function parseNumber(value: string, label: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be 0 or more.`);
  }
  return parsed;
}

function parsePositiveNumber(value: string, label: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be more than 0.`);
  }
  return parsed;
}

function inferFoodCategory(food: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
}): FoodCategory {
  if (food.fibreG >= 3 && food.proteinG <= 4 && food.fatG <= 4) {
    return 'veggie';
  }
  if (food.proteinG >= food.carbsG && food.proteinG >= food.fatG) {
    return 'protein';
  }
  if (food.carbsG >= food.proteinG && food.carbsG >= food.fatG) {
    return 'carb';
  }
  if (food.fatG >= food.proteinG && food.fatG >= food.carbsG) {
    return 'fat';
  }
  return 'condiment';
}

function sameNumber(a: number, b: number) {
  return Math.abs(a - b) < 0.05;
}

function formatServingSizeLabel(value: number) {
  const matched = DISPLAY_FRACTIONS.find((option) => Math.abs(option.value - value) < 0.02);
  return matched ? matched.label : formatNumber(value);
}

function buildServingNote(sizeLabel: string, noteText: string) {
  const parts = [];
  if (sizeLabel.trim()) {
    parts.push(`Size: ${sizeLabel.trim()}`);
  }
  if (noteText.trim()) {
    parts.push(noteText.trim());
  }
  return parts.join(' • ') || null;
}

export default function FoodLogScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const [statusMessage, setStatusMessage] = useState('Loading food log…');
  const [catalog, setCatalog] = useState<FoodItem[]>([]);
  const [rows, setRows] = useState<FoodLogRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(params.date ?? getLocalDay());
  const [mealType, setMealType] = useState<MealSlotKey>((params.meal as MealSlotKey) ?? 'breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSavedFoodId, setSelectedSavedFoodId] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('0');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('pieces');
  const [servings, setServings] = useState('1');
  const [portionSize, setPortionSize] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = useCallback(async (targetDate: string) => {
    try {
      const [foods, foodRows] = await Promise.all([
        getFoodCatalog(),
        listFoodLogRows(targetDate),
      ]);
      setCatalog(foods);
      setRows(foodRows);
      setStatusMessage(foodRows.length ? 'Food log loaded. Each saved food shows as its own row.' : 'Food log is ready. Add your first food row for this date.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load the food log.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh(date);
    }, [date, refresh])
  );

  const selectedSavedFood = selectedSavedFoodId
    ? catalog.find((food) => food.foodId === selectedSavedFoodId) ?? null
    : null;

  const searchResults = useMemo(() => {
    if (!catalog.length) return [];
    return searchFoods(catalog, searchQuery, searchQuery.trim() ? 8 : 10);
  }, [catalog, searchQuery]);

  function fillFromSavedFood(food: FoodItem) {
    setSelectedSavedFoodId(food.foodId);
    setFoodName(food.foodName);
    setCalories(String(food.calories));
    setProtein(String(food.proteinG));
    setCarbs(String(food.carbsG));
    setFat(String(food.fatG));
    setFiber(String(food.fibreG ?? 0));
    setServingSize(String(food.servingSize));
    setServingUnit(food.servingUnit);
    setServings('1');
    setPortionSize('');
    setSearchQuery(food.foodName);
    setStatusMessage(`${food.foodName} loaded from your saved foods.`);
  }

  function clearForm() {
    setSelectedSavedFoodId(null);
    setSearchQuery('');
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('0');
    setServingSize('1');
    setServingUnit('pieces');
    setServings('1');
    setPortionSize('');
    setNotes('');
  }

  function applyServingPreset(size: number, unit: string) {
    setServingSize(String(size));
    setServingUnit(unit);
  }

  async function handleSave() {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        throw new Error('Date must use YYYY-MM-DD.');
      }

      const trimmedName = foodName.trim();
      if (!trimmedName) {
        throw new Error('Food name is required.');
      }

      const nextCalories = parseNumber(calories, 'Calories');
      const nextProtein = parseNumber(protein, 'Protein');
      const nextCarbs = parseNumber(carbs, 'Carbs');
      const nextFat = parseNumber(fat, 'Fat');
      const nextFiber = parseNumber(fiber || '0', 'Fiber');
      const nextServingSize = parsePositiveNumber(servingSize || '1', 'Serving size');
      const nextServings = parsePositiveNumber(servings || '1', 'Number of servings');
      const nextServingUnit = servingUnit.trim();
      const combinedServingNote = buildServingNote(portionSize, notes);

      if (!nextServingUnit) {
        throw new Error('Serving unit is required.');
      }

      setSaving(true);

      const daySnapshot = await loadTodaySnapshot(date.trim());
      const meal = daySnapshot.meals.find((entry) => entry.slotId === mealType);
      if (!meal) {
        throw new Error('Could not find that meal for the selected date.');
      }

      const shouldReuseSavedFood = selectedSavedFood &&
        trimmedName === selectedSavedFood.foodName &&
        sameNumber(nextCalories, selectedSavedFood.calories) &&
        sameNumber(nextProtein, selectedSavedFood.proteinG) &&
        sameNumber(nextCarbs, selectedSavedFood.carbsG) &&
        sameNumber(nextFat, selectedSavedFood.fatG) &&
        sameNumber(nextFiber, selectedSavedFood.fibreG ?? 0) &&
        sameNumber(nextServingSize, selectedSavedFood.servingSize) &&
        nextServingUnit.toLowerCase() === selectedSavedFood.servingUnit.trim().toLowerCase();

      const foodId = shouldReuseSavedFood
        ? selectedSavedFood.foodId
        : (await createCustomFood({
            name: trimmedName,
            category: selectedSavedFood?.foodCategory ?? inferFoodCategory({
              proteinG: nextProtein,
              carbsG: nextCarbs,
              fatG: nextFat,
              fibreG: nextFiber,
            }),
            servingSize: nextServingSize,
            servingUnit: nextServingUnit,
            calories: nextCalories,
            proteinG: nextProtein,
            carbsG: nextCarbs,
            fatG: nextFat,
            fibreG: nextFiber,
            mealSlots: ['breakfast', 'lunch', 'supper', 'snack'],
            notes: notes.trim() || 'Saved from Food Log screen.',
          })).foodId;

      const selectedItems = [
        ...meal.items.map((item) => ({
          foodId: item.food.foodId,
          quantityMultiplier: item.quantityMultiplier,
          overrideServingNote: item.notes,
        })),
        {
          foodId,
          quantityMultiplier: nextServings,
          overrideServingNote: combinedServingNote,
        },
      ];

      await saveMealSelection({
        logDate: date.trim(),
        slotId: mealType,
        selectedItems,
      });

      clearForm();
      await refresh(date.trim());
      setStatusMessage(`${trimmedName} saved to ${mealLabel(mealType)}.`);
    } catch (error) {
      Alert.alert('Could not save food', error instanceof Error ? error.message : 'Food save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="Food Log"
        title="Save one food item at a time"
        subtitle="Each saved item becomes its own dated food-log row with meal, serving size, servings, calories, macros, fiber, and optional notes."
      />

      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Add food row" subtitle="Pick a meal, fill in the numbers, and save a clean row to the food log." />
        <TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <View style={styles.mealTypeRow}>
          {(['breakfast', 'lunch', 'supper', 'snack'] as MealSlotKey[]).map((slotId) => (
            <Pressable
              key={slotId}
              accessibilityRole="button"
              onPress={() => setMealType(slotId)}
              style={({ pressed }) => [
                styles.mealTypeChip,
                mealType === slotId ? styles.mealTypeChipSelected : null,
                pressed ? styles.mealTypeChipPressed : null,
              ]}
            >
              <Text style={[styles.mealTypeChipText, mealType === slotId ? styles.mealTypeChipTextSelected : null]}>{mealLabel(slotId)}</Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Choose from saved foods (optional)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Type to find a saved food"
        />

        <View style={styles.savedFoodList}>
          {searchResults.map((food) => {
            const isSelected = food.foodId === selectedSavedFoodId;
            return (
              <Pressable
                key={food.foodId}
                accessibilityRole="button"
                onPress={() => fillFromSavedFood(food)}
                style={({ pressed }) => [
                  styles.savedFoodCard,
                  isSelected ? styles.savedFoodCardSelected : null,
                  pressed ? styles.savedFoodCardPressed : null,
                ]}
              >
                <Text style={[styles.savedFoodName, isSelected ? styles.savedFoodNameSelected : null]}>{food.foodName}</Text>
                <Text style={[styles.savedFoodMeta, isSelected ? styles.savedFoodMetaSelected : null]}>
                  {formatServingSizeLabel(food.servingSize)} {food.servingUnit} · {formatNumber(food.calories, 0)} cal · P {formatNumber(food.proteinG)} · C {formatNumber(food.carbsG)} · F {formatNumber(food.fatG)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField label="Food name" value={foodName} onChangeText={setFoodName} placeholder="Example: Greek yogurt" />
        <View style={styles.sizeChipRow}>
          {PORTION_SIZE_OPTIONS.map((size) => {
            const selected = portionSize === size;
            return (
              <Pressable
                key={size}
                accessibilityRole="button"
                onPress={() => setPortionSize((current) => (current === size ? '' : size))}
                style={({ pressed }) => [
                  styles.unitChip,
                  selected ? styles.unitChipSelected : null,
                  pressed ? styles.unitChipPressed : null,
                ]}
              >
                <Text style={[styles.unitChipText, selected ? styles.unitChipTextSelected : null]}>{size}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.macroGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Serving size" value={servingSize} onChangeText={setServingSize} keyboardType="numeric" placeholder="1" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Number of servings" value={servings} onChangeText={setServings} keyboardType="numeric" placeholder="1" />
          </View>
        </View>

        <TextField label="Serving unit" value={servingUnit} onChangeText={setServingUnit} placeholder="pieces" />

        <View style={styles.presetSection}>
          <Text style={styles.presetLabel}>Cup quick picks</Text>
          <View style={styles.unitChipRow}>
            {CUP_PRESETS.map((preset) => {
              const selected = sameNumber(Number(servingSize || 0), preset.size) && servingUnit.trim().toLowerCase() === preset.unit;
              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  onPress={() => applyServingPreset(preset.size, preset.unit)}
                  style={({ pressed }) => [styles.unitChip, selected ? styles.unitChipSelected : null, pressed ? styles.unitChipPressed : null]}
                >
                  <Text style={[styles.unitChipText, selected ? styles.unitChipTextSelected : null]}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.presetSection}>
          <Text style={styles.presetLabel}>Tsp quick picks</Text>
          <View style={styles.unitChipRow}>
            {TSP_PRESETS.map((preset) => {
              const selected = sameNumber(Number(servingSize || 0), preset.size) && servingUnit.trim().toLowerCase() === preset.unit;
              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  onPress={() => applyServingPreset(preset.size, preset.unit)}
                  style={({ pressed }) => [styles.unitChip, selected ? styles.unitChipSelected : null, pressed ? styles.unitChipPressed : null]}
                >
                  <Text style={[styles.unitChipText, selected ? styles.unitChipTextSelected : null]}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.presetSection}>
          <Text style={styles.presetLabel}>Tbsp quick picks</Text>
          <View style={styles.unitChipRow}>
            {TBSP_PRESETS.map((preset) => {
              const selected = sameNumber(Number(servingSize || 0), preset.size) && servingUnit.trim().toLowerCase() === preset.unit;
              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  onPress={() => applyServingPreset(preset.size, preset.unit)}
                  style={({ pressed }) => [styles.unitChip, selected ? styles.unitChipSelected : null, pressed ? styles.unitChipPressed : null]}
                >
                  <Text style={[styles.unitChipText, selected ? styles.unitChipTextSelected : null]}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.unitChipRow}>
          {BASIC_UNIT_OPTIONS.map((unit) => {
            const selected = servingUnit.trim().toLowerCase() === unit;
            return (
              <Pressable
                key={unit}
                accessibilityRole="button"
                onPress={() => setServingUnit(unit)}
                style={({ pressed }) => [
                  styles.unitChip,
                  selected ? styles.unitChipSelected : null,
                  pressed ? styles.unitChipPressed : null,
                ]}
              >
                <Text style={[styles.unitChipText, selected ? styles.unitChipTextSelected : null]}>{unit}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.macroGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Calories" value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Protein" value={protein} onChangeText={setProtein} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <View style={styles.macroGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Carbs" value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Fat" value={fat} onChangeText={setFat} keyboardType="numeric" placeholder="0" />
          </View>
        </View>
        <View style={styles.macroGrid}>
          <View style={styles.fieldCell}>
            <TextField label="Fiber" value={fiber} onChangeText={setFiber} keyboardType="numeric" placeholder="0" />
          </View>
          <View style={styles.fieldCell}>
            <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Optional note" />
          </View>
        </View>

        <Button label={saving ? 'Saving…' : 'Save Food Row'} onPress={() => { void handleSave(); }} disabled={saving} />
      </Card>

      <Card>
        <SectionHeader title="Saved rows for this date" subtitle="More compact food rows, one saved item per line." />
        {rows.length ? (
          <View style={styles.rowList}>
            {rows.map((row, index) => (
              <View key={`${row.logDate}-${row.mealType}-${row.foodName}-${index}`} style={styles.logRowCard}>
                <View style={styles.logRowHeader}>
                  <View style={styles.logRowTextWrap}>
                    <Text style={styles.logRowTitle}>{row.foodName}</Text>
                    <Text style={styles.logRowSubtitle}>{mealLabel(row.mealType)} · {row.logDate}</Text>
                  </View>
                  <Text style={styles.logRowCalories}>{formatNumber(row.calories, 0)} cal</Text>
                </View>
                <Text style={styles.logRowServing}>{formatNumber(row.servings)} × {formatServingSizeLabel(row.servingSize)} {row.servingUnit}</Text>
                <Text style={styles.logRowMeta}>P {formatNumber(row.proteinG)} • C {formatNumber(row.carbsG)} • F {formatNumber(row.fatG)} • Fiber {formatNumber(row.fibreG)}</Text>
                {row.notes ? <Text style={styles.logRowNote}>Note: {row.notes}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No foods saved for this date yet.</Text>
        )}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  mealTypeChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.softSurface,
  },
  mealTypeChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mealTypeChipPressed: {
    opacity: 0.92,
  },
  mealTypeChipText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  mealTypeChipTextSelected: {
    color: theme.colors.primaryText,
  },
  savedFoodList: {
    gap: theme.spacing.xs,
  },
  savedFoodCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.softSurface,
    gap: 4,
  },
  savedFoodCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accentSoft,
  },
  savedFoodCardPressed: {
    opacity: 0.94,
  },
  savedFoodName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  savedFoodNameSelected: {
    color: theme.colors.text,
  },
  savedFoodMeta: {
    color: theme.colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  savedFoodMetaSelected: {
    color: theme.colors.mutedText,
  },
  sizeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  presetSection: {
    gap: 8,
  },
  presetLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  unitChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.softSurface,
  },
  unitChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unitChipPressed: {
    opacity: 0.92,
  },
  unitChipText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  unitChipTextSelected: {
    color: theme.colors.primaryText,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  fieldCell: {
    flex: 1,
  },
  rowList: {
    gap: theme.spacing.sm,
  },
  logRowCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.softSurface,
    gap: 4,
  },
  logRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    alignItems: 'flex-start',
  },
  logRowTextWrap: {
    flex: 1,
    gap: 2,
  },
  logRowTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  logRowSubtitle: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  logRowCalories: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  logRowMeta: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  logRowServing: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  logRowNote: {
    color: theme.colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyText: {
    color: theme.colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
});
