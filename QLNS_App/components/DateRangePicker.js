import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TextInput, Text, Button } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Simple DateRangePicker using two platform pickers (no external deps)
 * Props:
 * - startDate, endDate: Date or null
 * - onChange({ startDate, endDate })
 */
const DateRangePicker = ({ startDate = null, endDate = null, onChange }) => {
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const formatDisplay = (d) => {
    if (!d) return 'Chọn ngày';
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <View>
      <Text style={styles.label}>Khoảng ngày (tùy chọn)</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.field} onPress={() => setShowStart(true)}>
          <TextInput label="Từ" value={formatDisplay(startDate)} editable={false} pointerEvents="none" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.field} onPress={() => setShowEnd(true)}>
          <TextInput label="Đến" value={formatDisplay(endDate)} editable={false} pointerEvents="none" />
        </TouchableOpacity>
      </View>

      {showStart && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowStart(false);
            if (d) onChange({ startDate: d, endDate });
          }}
        />
      )}

      {showEnd && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowEnd(false);
            if (d) onChange({ startDate, endDate: d });
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1 },
  label: { marginBottom: 8, fontWeight: '600' },
});

export default DateRangePicker;
