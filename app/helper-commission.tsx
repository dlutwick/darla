import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../supabase/src/components/ui/AppScreen';
import { Button } from '../supabase/src/components/ui/Button';
import { Card } from '../supabase/src/components/ui/Card';
import { InlineStatus } from '../supabase/src/components/ui/InlineStatus';
import { ScreenIntro } from '../supabase/src/components/ui/ScreenIntro';
import { TextField } from '../supabase/src/components/ui/TextField';
import { theme } from '../supabase/src/constants/theme';
import { addHelperCommission, BusinessType, getHelperCommissionById, HelperCommissionType, HelperPaymentMethod, updateHelperCommission } from '../supabase/src/features/business/store';
import { getLocalDay } from '../supabase/src/lib/date';
import { formatNumber, formatWithUnit } from '../supabase/src/lib/format';

function parseNonNegative(value: string, label: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
  return parsed;
}

export default function HelperCommissionScreen() {
  const params = useLocalSearchParams<{ helperCommissionId?: string | string[] }>();
  const helperCommissionId = Array.isArray(params.helperCommissionId)
    ? params.helperCommissionId[0] ?? null
    : typeof params.helperCommissionId === 'string'
      ? params.helperCommissionId
      : null;
  const isEditing = Boolean(helperCommissionId);

  const [statusMessage, setStatusMessage] = useState('Save helper payouts by show or market event.');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>('bakery');
  const [helperName, setHelperName] = useState('');
  const [showName, setShowName] = useState('');
  const [showDate, setShowDate] = useState(getLocalDay());
  const [totalShowSales, setTotalShowSales] = useState('');
  const [commissionType, setCommissionType] = useState<HelperCommissionType>('percentage');
  const [commissionRate, setCommissionRate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<HelperPaymentMethod>('cash');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentValue, setPaymentValue] = useState('');
  const [paid, setPaid] = useState(false);
  const [datePaid, setDatePaid] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!helperCommissionId) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      const existing = await getHelperCommissionById(helperCommissionId);
      if (!existing) {
        if (!cancelled) {
          setStatusMessage('Helper commission record not found.');
          setLoading(false);
        }
        return;
      }
      if (cancelled) return;

      setBusinessType(existing.businessType);
      setHelperName(existing.helperName);
      setShowName(existing.showName);
      setShowDate(existing.showDate);
      setTotalShowSales(String(existing.totalShowSales));
      setCommissionType(existing.commissionType);
      setCommissionRate(String(existing.commissionRate));
      setPaymentMethod(existing.paymentMethod ?? 'cash');
      setPaymentDescription(existing.paymentDescription ?? '');
      setPaymentValue(String(existing.paymentValue ?? existing.commissionAmount ?? ''));
      setPaid(existing.paid);
      setDatePaid(existing.datePaid ?? '');
      setNotes(existing.notes ?? '');
      setStatusMessage('Editing helper commission for this show/event.');
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [helperCommissionId]);

  const parsedTotalShowSales = Number(totalShowSales || '0');
  const parsedCommissionRate = Number(commissionRate || '0');
  const parsedPaymentValue = Number(paymentValue || '0');
  const calculatedCommissionOwed = useMemo(() => {
    if (commissionType === 'flat') {
      return Number(parsedCommissionRate.toFixed(2));
    }
    return Number((parsedTotalShowSales * (parsedCommissionRate / 100)).toFixed(2));
  }, [commissionType, parsedCommissionRate, parsedTotalShowSales]);
  const commissionOwed = useMemo(() => {
    if ((paymentMethod === 'supplies' || paymentMethod === 'product') && parsedPaymentValue > 0) {
      return Number(parsedPaymentValue.toFixed(2));
    }
    return calculatedCommissionOwed;
  }, [calculatedCommissionOwed, parsedPaymentValue, paymentMethod]);

  async function handleSave() {
    try {
      if (!helperName.trim()) {
        throw new Error('Helper name is required.');
      }
      if (!showName.trim()) {
        throw new Error('Show / market name is required.');
      }
      const parsedSales = parseNonNegative(totalShowSales || '0', 'Total show sales');
      const parsedRate = parseNonNegative(commissionRate || '0', commissionType === 'flat' ? 'Flat amount' : 'Commission rate');
      const parsedPayment = parseNonNegative(paymentValue || '0', 'Payment value');
      setSaving(true);

      const payload = {
        businessType,
        helperName: helperName.trim(),
        showName: showName.trim(),
        showDate,
        totalShowSales: parsedSales,
        commissionType,
        commissionRate: parsedRate,
        paymentMethod,
        paymentDescription: paymentDescription.trim() || null,
        paymentValue: parsedPayment > 0 ? parsedPayment : commissionOwed,
        paid,
        datePaid: paid ? (datePaid || showDate) : null,
        notes: notes.trim() || null,
      };

      if (helperCommissionId) {
        await updateHelperCommission(helperCommissionId, payload);
      } else {
        await addHelperCommission(payload);
      }

      router.replace('/history');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save helper commission.';
      Alert.alert('Save problem', message);
      setStatusMessage(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenIntro
        eyebrow="Helper Commission"
        title={isEditing ? 'Edit show helper payout' : 'Add show helper payout'}
        subtitle="Track one helper payout for the whole show or market event, separate from sales rows."
      />
      <InlineStatus message={statusMessage} />

      <Card>
        <Text style={styles.label}>Business</Text>
        <View style={styles.chipRow}>
          <Pressable style={[styles.chip, businessType === 'bakery' ? styles.chipActive : null]} onPress={() => setBusinessType('bakery')}>
            <Text style={[styles.chipLabel, businessType === 'bakery' ? styles.chipLabelActive : null]}>Bakery</Text>
          </Pressable>
          <Pressable style={[styles.chip, businessType === 'craft' ? styles.chipActive : null]} onPress={() => setBusinessType('craft')}>
            <Text style={[styles.chipLabel, businessType === 'craft' ? styles.chipLabelActive : null]}>Crafts</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label="Helper name" value={helperName} onChangeText={setHelperName} placeholder="Who helped?" dense /></View>
          <View style={styles.fieldCell}><TextField label="Show / market name" value={showName} onChangeText={setShowName} placeholder="Example: Woodstock Market" dense /></View>
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label="Show date" value={showDate} onChangeText={setShowDate} placeholder="YYYY-MM-DD" dense /></View>
          <View style={styles.fieldCell}><TextField label="Total sales for that show" value={totalShowSales} onChangeText={setTotalShowSales} keyboardType="numeric" placeholder="0.00" dense /></View>
        </View>

        <Text style={styles.label}>Commission type</Text>
        <View style={styles.chipRow}>
          <Pressable style={[styles.chip, commissionType === 'percentage' ? styles.chipActive : null]} onPress={() => setCommissionType('percentage')}>
            <Text style={[styles.chipLabel, commissionType === 'percentage' ? styles.chipLabelActive : null]}>Percentage</Text>
          </Pressable>
          <Pressable style={[styles.chip, commissionType === 'flat' ? styles.chipActive : null]} onPress={() => setCommissionType('flat')}>
            <Text style={[styles.chipLabel, commissionType === 'flat' ? styles.chipLabelActive : null]}>Flat Amount</Text>
          </Pressable>
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label={commissionType === 'flat' ? 'Flat amount' : 'Commission rate (%)'} value={commissionRate} onChangeText={setCommissionRate} keyboardType="numeric" placeholder={commissionType === 'flat' ? '40.00' : '10'} dense /></View>
          <View style={styles.fieldCell}><TextField label="Commission owed" value={commissionOwed.toFixed(2)} onChangeText={() => {}} editable={false} dense /></View>
        </View>

        <Text style={styles.label}>Payment method</Text>
        <View style={styles.chipRow}>
          {[
            ['cash', 'Cash'],
            ['e-transfer', 'E-Transfer'],
            ['card', 'Card'],
            ['supplies', 'Supplies'],
            ['product', 'Product'],
            ['other', 'Other'],
          ].map(([value, label]) => (
            <Pressable key={value} style={[styles.chip, paymentMethod === value ? styles.chipActive : null]} onPress={() => setPaymentMethod(value as HelperPaymentMethod)}>
              <Text style={[styles.chipLabel, paymentMethod === value ? styles.chipLabelActive : null]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.fieldGrid}>
          <View style={styles.fieldCell}><TextField label="Payment description" value={paymentDescription} onChangeText={setPaymentDescription} placeholder="Example: Costco order" dense /></View>
          <View style={styles.fieldCell}><TextField label="Payment value" value={paymentValue} onChangeText={setPaymentValue} keyboardType="numeric" placeholder={commissionType === 'flat' ? '18.50' : commissionOwed.toFixed(2)} dense /></View>
        </View>

        <Text style={styles.label}>Paid status</Text>
        <View style={styles.chipRow}>
          <Pressable style={[styles.chip, !paid ? styles.chipActive : null]} onPress={() => { setPaid(false); setDatePaid(''); }}>
            <Text style={[styles.chipLabel, !paid ? styles.chipLabelActive : null]}>Unpaid</Text>
          </Pressable>
          <Pressable style={[styles.chip, paid ? styles.chipActive : null]} onPress={() => { setPaid(true); if (!datePaid) setDatePaid(showDate); }}>
            <Text style={[styles.chipLabel, paid ? styles.chipLabelActive : null]}>Paid</Text>
          </Pressable>
        </View>

        {paid ? <TextField label="Date paid" value={datePaid} onChangeText={setDatePaid} placeholder="YYYY-MM-DD" dense /> : null}
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional notes" dense />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>Business: {businessType === 'bakery' ? 'Bakery' : 'Crafts'}</Text>
          <Text style={styles.summaryText}>Helper: {helperName.trim() || '—'}</Text>
          <Text style={styles.summaryText}>Show: {showName.trim() || '—'}</Text>
          <Text style={styles.summaryText}>Show sales: {formatWithUnit(parsedTotalShowSales || 0, '$', 2)}</Text>
          <Text style={styles.summaryText}>Commission input: {commissionType === 'flat' ? formatWithUnit(parsedCommissionRate || 0, '$', 2) : `${formatNumber(parsedCommissionRate || 0, 2)}%`}</Text>
          <Text style={styles.summaryText}>Payment method: {paymentMethod}</Text>
          <Text style={styles.summaryText}>Payment value: {formatWithUnit(parsedPaymentValue || commissionOwed || 0, '$', 2)}</Text>
          <Text style={styles.summaryStrong}>Commission owed: {formatWithUnit(commissionOwed || 0, '$', 2)}</Text>
        </View>

        <Button label={loading ? 'Loading…' : saving ? (isEditing ? 'Saving Changes…' : 'Saving Helper Commission…') : isEditing ? 'Save Helper Commission Changes' : 'Save Helper Commission'} onPress={() => { void handleSave(); }} disabled={loading || saving} />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  fieldGrid: { flexDirection: 'row', gap: theme.spacing.sm },
  fieldCell: { flex: 1 },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  chip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.softSurface, borderRadius: theme.radius.full, paddingHorizontal: 12, paddingVertical: 10 },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
  chipLabelActive: { color: theme.colors.primaryText },
  summaryCard: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft, padding: theme.spacing.sm, gap: 6 },
  summaryText: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  summaryStrong: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
});
