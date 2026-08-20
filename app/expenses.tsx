import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { RecordActionRow } from '../supabase/src/components/ui/RecordActionRow';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { SectionHeader } from '../supabase/src/components/ui/SectionHeader';
import { StatRow } from '../supabase/src/components/ui/StatRow';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { addExpense, BusinessType, ExpenseType, getAutomaticMonthlyExpensesForDate, getAutomaticMonthlyExpenseTotalForDate, getDashboardSnapshot, getExpenseById, HARTLAND_FARM_MARKET_FEE_AMOUNT, HARTLAND_FARM_MARKET_FEE_CATEGORY, HARTLAND_FARM_MARKET_FEE_VENDOR, updateExpense, voidExpense } from '../supabase/src/features/business/store';
import { confirmAction } from '../supabase/src/lib/confirmAction';
import { getLocalDay } from '../supabase/src/lib/date';
import { formatWithUnit } from '../supabase/src/lib/format';

const EXPENSE_CATEGORIES = ['Bakery Ingredients & Supplies', 'Packaging', 'Event Fees', 'Craft Materials', 'Software & Subscriptions', 'Utilities & Overhead', 'Commissions', 'Taxes & Fees'];

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

export default function ExpensesScreen() {
  const params = useLocalSearchParams<{ expenseId?: string }>();
  const editingExpenseId = typeof params.expenseId === 'string' ? params.expenseId : null;
  const isEditing = Boolean(editingExpenseId);
  const [statusMessage, setStatusMessage] = useState('Save an expense row fast, then jump back home.');
  const [businessType, setBusinessType] = useState<BusinessType>('bakery');
  const [expenseType, setExpenseType] = useState<ExpenseType>('expense');
  const [date, setDate] = useState(getLocalDay());
  const [month, setMonth] = useState(getMonthFromDate(getLocalDay()));
  const [expenseCategory, setExpenseCategory] = useState('Packaging');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [noteEnabled, setNoteEnabled] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [scheduledMarketFees, setScheduledMarketFees] = useState<Awaited<ReturnType<typeof getDashboardSnapshot>>['expenses']>([]);
  const isHistoricalVendorPayment = isEditing && expenseType === 'vendor-payment';

  async function refreshScheduledMarketFees() {
    const snapshot = await getDashboardSnapshot();
    setScheduledMarketFees(snapshot.expenses.filter((expense) => (
      expense.vendor === HARTLAND_FARM_MARKET_FEE_VENDOR
      && expense.expenseCategory === HARTLAND_FARM_MARKET_FEE_CATEGORY
      && Number(expense.amount.toFixed(2)) === HARTLAND_FARM_MARKET_FEE_AMOUNT
    )));
  }

  useEffect(() => {
    if (!editingExpenseId) return;
    void (async () => {
      const existing = await getExpenseById(editingExpenseId);
      if (!existing) {
        setStatusMessage('That expense row could not be found.');
        return;
      }
      setBusinessType(existing.businessType);
      setExpenseType(existing.expenseType ?? 'expense');
      setDate(existing.date);
      setMonth(existing.month);
      setExpenseCategory(existing.expenseCategory);
      setVendor(existing.vendor ?? '');
      setAmount(String(existing.amount));
      const savedNote = existing.note ?? existing.notes ?? '';
      setNoteEnabled(Boolean(savedNote));
      setNote(savedNote ?? '');
      setStatusMessage('Editing existing expense row. Saving will update it instead of creating a duplicate.');
    })();
  }, [editingExpenseId]);

  useEffect(() => {
    void refreshScheduledMarketFees();
  }, []);

  const amountPreview = amount.trim() ? Number(amount) : 0;
  const automaticMonthlyExpenses = getAutomaticMonthlyExpensesForDate(date);
  const automaticMonthlyExpenseTotal = getAutomaticMonthlyExpenseTotalForDate(date);

  useEffect(() => {
    if (month !== getMonthFromDate(date) && !month.trim()) {
      setMonth(getMonthFromDate(date));
      return;
    }
    if (month.length < 7) {
      setMonth(getMonthFromDate(date));
    }
  }, [date, month]);

  async function handleSave() {
    try {
      if (!expenseCategory.trim()) {
        throw new Error('Choose or type an expense category.');
      }
      if (!isEditing && expenseType === 'vendor-payment') {
        throw new Error('New vendor payment expense rows are no longer supported.');
      }
      if (isHistoricalVendorPayment && !vendor.trim()) {
        throw new Error('Vendor name is required for a historical vendor payment.');
      }

      const parsedAmount = parsePositive(amount, 'Amount');

      setSaving(true);
      const savedEntry = isEditing && editingExpenseId
        ? await updateExpense(editingExpenseId, {
          date: date as `${number}-${number}-${number}`,
          month,
          expenseType,
          expenseCategory: expenseType === 'vendor-payment' ? 'Vendor Payment' : expenseCategory,
          vendor,
          businessType,
          amount: parsedAmount,
          note: noteEnabled ? note : undefined,
        })
        : await addExpense({
          date: date as `${number}-${number}-${number}`,
          month,
          expenseType,
          expenseCategory: expenseType === 'vendor-payment' ? 'Vendor Payment' : expenseCategory,
          vendor,
          businessType,
          amount: parsedAmount,
          note: noteEnabled ? note : undefined,
        });

      setStatusMessage(isEditing ? 'Expense updated successfully' : 'Expense saved successfully');
      setExpenseCategory('Packaging');
      setVendor('');
      setAmount('');
      setNoteEnabled(false);
      setNote('');
      router.replace({ pathname: '/today', params: { savedExpense: '1', expenseCategory: savedEntry.expenseCategory } });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Expense save failed.');
      Alert.alert('Could not save expense', error instanceof Error ? error.message : 'Expense save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro eyebrow="Expenses" title={isEditing ? 'Edit expense row' : 'Add expense row'} subtitle={isEditing ? 'Update the existing expense row and save changes without creating a duplicate.' : 'Choose the business line, set the expense category, enter the vendor and amount, then save the expense row.'} />
      <InlineStatus message={statusMessage} />

      <Card>
        <SectionHeader title="Monthly automatic expenses" subtitle="These post automatically on the 1st of each month." />
        {automaticMonthlyExpenses.map((expense) => (
          <StatRow key={expense.name} label={expense.name} value={formatWithUnit(expense.amount, '$', 2)} />
        ))}
        <StatRow label="Monthly recurring total" value={formatWithUnit(automaticMonthlyExpenseTotal, '$', 2)} />
      </Card>

      <Card>
        <SectionHeader title="Hartland Farm Market fees" subtitle="Scheduled Saturday market fees. Remove only the weeks you do not attend." />
        <StatRow label="Scheduled fee" value={`${formatWithUnit(HARTLAND_FARM_MARKET_FEE_AMOUNT, '$', 2)} per Saturday`} />
        {scheduledMarketFees.length ? scheduledMarketFees.map((expense) => (
          <View key={expense.expenseId} style={styles.scheduledFeeRow}>
            <Text style={styles.scheduledFeeTitle}>{expense.date} — {formatWithUnit(expense.amount, '$', 2)}</Text>
            <Text style={styles.scheduledFeeMeta}>{expense.expenseCategory} · {expense.vendor}</Text>
            <RecordActionRow
              onView={() => Alert.alert('Hartland Farm Market Fee', [`Date: ${expense.date}`, `Amount: ${formatWithUnit(expense.amount, '$', 2)}`, `Category: ${expense.expenseCategory}`, expense.note || expense.notes || 'Automatic Saturday fee.'].join('\n'))}
              onEdit={() => router.push({ pathname: '/expenses', params: { expenseId: expense.expenseId } })}
              onDelete={() => confirmAction({
                title: 'Remove this Saturday fee?',
                message: `${expense.date} will be removed from totals. Future scheduled Saturday fees will stay in place.`,
                confirmLabel: 'Remove',
                onConfirm: () => {
                  void (async () => {
                    await voidExpense(expense.expenseId);
                    setStatusMessage(`Hartland Farm Market Fee removed for ${expense.date}. Future Saturday fees were not changed.`);
                    await refreshScheduledMarketFees();
                  })();
                },
              })}
              deleteLabel="Remove"
            />
          </View>
        )) : <Text style={styles.emptyText}>No upcoming Hartland fees are scheduled.</Text>}
      </Card>

      <Card>
        <SectionHeader title="Business line" subtitle="Start with the business line this expense belongs to." />
        <View style={styles.businessRow}>
          {(['bakery', 'craft'] as BusinessType[]).map((value) => (
            <Pressable
              key={value}
              style={[styles.businessButton, businessType === value ? styles.businessButtonActive : null]}
              onPress={() => setBusinessType(value)}
            >
              <Text style={[styles.businessButtonLabel, businessType === value ? styles.businessButtonLabelActive : null]}>{value === 'bakery' ? 'Bakery' : 'Crafts'}</Text>
              <Text style={[styles.businessButtonMeta, businessType === value ? styles.businessButtonMetaActive : null]}>{value === 'bakery' ? 'Sweet Tarts' : 'Crafting Nana'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Expense row" subtitle="Pick or type the category, then save the amount against the right month." />
        {isHistoricalVendorPayment ? (
          <>
            <Text style={styles.fieldLabel}>Row type</Text>
            <View style={styles.categoryGrid}>
              <View style={[styles.categoryChip, styles.categoryChipActive]}>
                <Text style={[styles.categoryLabel, styles.categoryLabelActive]}>Vendor Payment</Text>
              </View>
            </View>
          </>
        ) : null}
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" dense /></View>
          <View style={styles.fieldCell}><TextField label="Month" value={month} onChangeText={setMonth} placeholder="YYYY-MM" dense /></View>
        </View>

        {expenseType === 'expense' ? <>
          <Text style={styles.fieldLabel}>Expense category</Text>
          <View style={styles.categoryGrid}>
            {EXPENSE_CATEGORIES.map((value) => (
              <Pressable key={value} style={[styles.categoryChip, expenseCategory === value ? styles.categoryChipActive : null]} onPress={() => setExpenseCategory(value)}>
                <Text style={[styles.categoryLabel, expenseCategory === value ? styles.categoryLabelActive : null]}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <TextField label="Expense category (choose or type)" value={expenseCategory} onChangeText={setExpenseCategory} placeholder="Packaging" dense />
        </> : null}
        <TextField label="Vendor" value={vendor} onChangeText={setVendor} placeholder={expenseType === 'vendor-payment' ? 'Vendor you are paying' : 'Optional vendor or store name'} dense />
        <TextField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" dense />

        <Pressable style={styles.moreOptionsToggle} onPress={() => setNoteEnabled((value) => !value)}>
          <Text style={styles.moreOptionsLabel}>{noteEnabled ? 'Hide note' : 'Add note'}</Text>
        </Pressable>
        {noteEnabled ? (
          <TextField label="Notes" value={note} onChangeText={setNote} placeholder="Optional notes" dense />
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Business line: {businessType === 'bakery' ? 'Bakery' : 'Crafts'}</Text>
          <Text style={styles.summaryText}>Row type: {expenseType === 'vendor-payment' ? 'Vendor Payment' : 'Expense'}</Text>
          <Text style={styles.summaryText}>Month: {month || '—'}</Text>
          <Text style={styles.summaryText}>Category: {expenseType === 'vendor-payment' ? 'Vendor Payment' : expenseCategory || '—'}</Text>
          <Text style={styles.summaryText}>Vendor: {vendor.trim() || '—'}</Text>
          <Text style={styles.summaryStrong}>Expense amount: {formatWithUnit(Number.isFinite(amountPreview) ? amountPreview : 0, '$', 2)}</Text>
        </View>

        <Button label={saving ? (isEditing ? 'Saving Changes…' : 'Saving Expense…') : isEditing ? 'Save Expense Changes' : 'Save Expense'} onPress={() => { void handleSave(); }} disabled={saving || !amount.trim() || !expenseCategory.trim()} />
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
  fieldGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  fieldCell: { flex: 1 },
  fieldLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  categoryChip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  categoryChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  categoryLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  categoryLabelActive: { color: theme.colors.primaryText },
  moreOptionsToggle: { alignSelf: 'flex-start', paddingVertical: 4 },
  moreOptionsLabel: { color: theme.colors.accent, fontSize: 15, fontWeight: '800' },
  scheduledFeeRow: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.softSurface, padding: theme.spacing.sm, gap: 4 },
  scheduledFeeTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
  scheduledFeeMeta: { color: theme.colors.mutedText, fontSize: 13, fontWeight: '700' },
  emptyText: { color: theme.colors.mutedText, fontSize: 14, fontWeight: '700' },
  summaryCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, padding: theme.spacing.sm, gap: 6 },
  summaryText: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  summaryStrong: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
});
