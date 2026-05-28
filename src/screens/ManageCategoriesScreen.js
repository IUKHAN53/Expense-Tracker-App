import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/Header';
import { Button, Card, KLabel, TextField } from '../components/ui';
import api, { errorMessage } from '../api/client';
import { colors, fonts } from '../theme';
import { emit, EVENTS } from '../support/events';

const PALETTE = [
  '#22c55e', '#84cc16', '#dc2626', '#fbbf24',
  '#f97316', '#0ea5e9', '#a855f7', '#14b8a6',
  '#ef4444', '#6366f1', '#64748b', '#ec4899',
];

export default function ManageCategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load categories.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openNew = () => {
    setCreating(true);
    setEditing({ name: '', color: PALETTE[0] });
  };

  const openEdit = (cat) => {
    setCreating(false);
    setEditing({ ...cat, color: cat.color || PALETTE[0] });
  };

  const onDelete = (cat) => {
    Alert.alert(
      `Delete "${cat.name}"?`,
      'Entries on this category keep their data but lose the tag.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${cat.id}`);
              emit(EVENTS.CATEGORIES_CHANGED);
              load();
            } catch (e) {
              setError(errorMessage(e, 'Could not delete the category.'));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Categories" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {error ? (
          <Card style={styles.errBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.alarm} />
            <Text style={styles.errText}>{error}</Text>
          </Card>
        ) : null}

        <Text style={styles.intro}>
          Tags for grouping expenses. Receipts auto-pick a category when scanning, you can change them on the entry.
        </Text>

        <Card style={styles.list}>
          {loading && categories.length === 0 ? (
            <Text style={styles.placeholder}>Loading…</Text>
          ) : categories.length === 0 ? (
            <Text style={styles.placeholder}>No categories yet. Add the first one below.</Text>
          ) : (
            categories.map((c, i) => (
              <View key={c.id} style={[styles.row, i === categories.length - 1 && styles.rowLast]}>
                <View style={[styles.swatch, { backgroundColor: c.color || colors.accent }]} />
                <Pressable style={styles.rowMain} onPress={() => openEdit(c)}>
                  <Text style={styles.rowName}>{c.name}</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => openEdit(c)} style={styles.rowAction}>
                  <Ionicons name="create-outline" size={17} color={colors.inkSoft} />
                </Pressable>
                <Pressable hitSlop={8} onPress={() => onDelete(c)} style={styles.rowAction}>
                  <Ionicons name="trash-outline" size={16} color={colors.alarm} />
                </Pressable>
              </View>
            ))
          )}
        </Card>

        <Button title="Add a category" onPress={openNew} icon="add" style={{ marginTop: 18 }} />
      </ScrollView>

      <EditModal
        visible={!!editing}
        creating={creating}
        initial={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          emit(EVENTS.CATEGORIES_CHANGED);
          load();
        }}
        onError={setError}
      />
    </View>
  );
}

function EditModal({ visible, creating, initial, onClose, onSaved, onError }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setColor(initial.color || PALETTE[0]);
    }
  }, [initial]);

  const onSave = async () => {
    if (!name.trim()) return onError('Name is required.');
    setSaving(true);
    try {
      if (creating) {
        await api.post('/categories', { name: name.trim(), color });
      } else {
        await api.put(`/categories/${initial.id}`, { name: name.trim(), color });
      }
      onSaved();
    } catch (e) {
      onError(errorMessage(e, 'Could not save the category.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior="padding"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{creating ? 'Add a category' : 'Edit category'}</Text>

          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries, Fuel, Dining"
            autoCapitalize="words"
            autoFocus
          />

          <KLabel style={{ marginTop: 4, marginBottom: 8 }}>Colour</KLabel>
          <View style={styles.palette}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.paletteSwatch,
                  { backgroundColor: c },
                  c === color && styles.paletteSwatchActive,
                ]}
              >
                {c === color ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.modalRow}>
            <Button title="Cancel" variant="outline" onPress={onClose} disabled={saving} style={{ flex: 1 }} />
            <Button
              title={saving ? 'Saving…' : creating ? 'Add' : 'Save'}
              onPress={onSave}
              disabled={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 48 },
  intro: {
    fontFamily: fonts.serifItalic || fonts.serifMediumItalic,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
    marginBottom: 14,
    paddingHorizontal: 4,
  },

  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 12, backgroundColor: '#fbeae3' },
  errText: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.alarm, flex: 1 },

  list: { paddingHorizontal: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  rowMain: { flex: 1 },
  rowName: { fontFamily: fonts.sansMedium, fontSize: 15.5, color: colors.ink },
  rowAction: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  placeholder: {
    padding: 16, fontFamily: fonts.serifItalic || fonts.serifMediumItalic,
    fontSize: 14, color: colors.inkSoft,
  },

  modalBackdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.card,
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 28,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
  },
  modalTitle: { fontFamily: fonts.serifMediumItalic, fontSize: 22, color: colors.ink, marginBottom: 14 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 20 },

  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteSwatch: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  paletteSwatchActive: { borderColor: colors.ink },
});
