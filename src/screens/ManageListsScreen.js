import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const TYPES = [
  { value: 'person', label: 'Person', icon: 'person-outline' },
  { value: 'household', label: 'Household', icon: 'home-outline' },
  { value: 'vehicle', label: 'Vehicle', icon: 'car-sport-outline' },
];

const PALETTE = [
  '#c9621f', '#b14430', '#5d7a3d', '#7a6850',
  '#0ea5e9', '#6366f1', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#a855f7', '#ef4444',
];

export default function ManageListsScreen() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/lists');
      setLists(res.data.data || []);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load lists.'));
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
    setEditing({ name: '', type: 'person', color: PALETTE[0] });
  };

  const openEdit = (list) => {
    setCreating(false);
    setEditing({ ...list, color: list.color || PALETTE[0] });
  };

  const onDelete = (list) => {
    Alert.alert(
      `Delete "${list.name}"?`,
      'Entries on this list become orphaned. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/lists/${list.id}`);
              emit(EVENTS.LISTS_CHANGED);
              load();
            } catch (e) {
              setError(errorMessage(e, 'Could not delete the list.'));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Lists" />
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
          People, household and vehicle ledgers. Persons are the people splitting expenses; Household and Vehicle hold shared spending.
        </Text>

        <Card style={styles.list}>
          {loading && lists.length === 0 ? (
            <Text style={styles.placeholder}>Loading…</Text>
          ) : lists.length === 0 ? (
            <Text style={styles.placeholder}>No lists yet. Add the first one below.</Text>
          ) : (
            lists.map((l, i) => (
              <View key={l.id} style={[styles.row, i === lists.length - 1 && styles.rowLast]}>
                <View style={[styles.swatch, { backgroundColor: l.color || colors.accent }]} />
                <Pressable style={styles.rowMain} onPress={() => openEdit(l)}>
                  <Text style={styles.rowName}>{l.name}</Text>
                  <Text style={styles.rowSub}>{labelForType(l.type)}</Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={() => openEdit(l)} style={styles.rowAction}>
                  <Ionicons name="create-outline" size={17} color={colors.inkSoft} />
                </Pressable>
                <Pressable hitSlop={8} onPress={() => onDelete(l)} style={styles.rowAction}>
                  <Ionicons name="trash-outline" size={16} color={colors.alarm} />
                </Pressable>
              </View>
            ))
          )}
        </Card>

        <Button title="Add a list" onPress={openNew} icon="add" style={{ marginTop: 18 }} />
      </ScrollView>

      <EditModal
        visible={!!editing}
        creating={creating}
        initial={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          emit(EVENTS.LISTS_CHANGED);
          load();
        }}
        onError={setError}
      />
    </View>
  );
}

function labelForType(type) {
  return TYPES.find((t) => t.value === type)?.label || type;
}

function EditModal({ visible, creating, initial, onClose, onSaved, onError }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('person');
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setType(initial.type || 'person');
      setColor(initial.color || PALETTE[0]);
    }
  }, [initial]);

  const onSave = async () => {
    if (!name.trim()) return onError('Name is required.');
    setSaving(true);
    try {
      if (creating) {
        await api.post('/lists', { name: name.trim(), type, color });
      } else {
        await api.put(`/lists/${initial.id}`, { name: name.trim(), type, color });
      }
      onSaved();
    } catch (e) {
      onError(errorMessage(e, 'Could not save the list.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{creating ? 'Add a list' : 'Edit list'}</Text>

          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ayesha, Home, Civic"
            autoCapitalize="words"
            autoFocus
          />

          <KLabel style={{ marginBottom: 8 }}>Type</KLabel>
          <View style={styles.typeRow}>
            {TYPES.map((t) => {
              const active = t.value === type;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[styles.typeCell, active && styles.typeCellActive]}
                >
                  <Ionicons
                    name={t.icon}
                    size={16}
                    color={active ? colors.accent : colors.inkSoft}
                  />
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <KLabel style={{ marginTop: 14, marginBottom: 8 }}>Colour</KLabel>
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
  rowSub: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.inkSoft, marginTop: 3 },
  rowAction: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
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

  typeRow: { flexDirection: 'row', gap: 8 },
  typeCell: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1, borderColor: colors.rule,
    backgroundColor: colors.card,
    paddingVertical: 12, borderRadius: 4,
  },
  typeCellActive: { borderColor: colors.ink, backgroundColor: colors.soft },
  typeText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkSoft },
  typeTextActive: { color: colors.accent },

  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteSwatch: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  paletteSwatchActive: { borderColor: colors.ink },
});
