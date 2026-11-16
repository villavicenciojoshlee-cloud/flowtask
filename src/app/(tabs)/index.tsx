import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AddTaskSheet, DateStrip, EmptyState, FlowTaskPage, PageHeading, PrimaryButton, ScreenScroll, TaskCard, TaskProgress, flowStyles } from '@/components/FlowTaskUI';
import { FlowText as Text } from '@/components/FlowText';
import { TapPressable as Pressable } from '@/components/TapPressable';
import { localize, localeFor } from '@/i18n';
import { useSettings } from '@/settings/SettingsContext';
import { dateKey, useFlowTasks } from '@/tasks/FlowTasksContext';
import { useTheme } from '@/theme';

type StatusFilter = 'Today' | 'All' | 'Upcoming' | 'Completed';
type PriorityFilter = 'All' | 'Low' | 'Medium' | 'High';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { settings } = useSettings();
  const { tasks } = useFlowTasks();
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [filter, setFilter] = useState<StatusFilter>('Today');
  const [priority, setPriority] = useState<PriorityFilter>('All');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const selectedTasks = tasks.filter(task => task.date === selectedDate);
  const visibleTasks = useMemo(() => tasks.filter(task => {
    const statusMatch = filter === 'All'
      || (filter === 'Today' && task.date === selectedDate)
      || (filter === 'Upcoming' && task.date > dateKey(new Date()) && !task.completed)
      || (filter === 'Completed' && task.completed);
    return statusMatch && (priority === 'All' || task.priority === priority) && task.title.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => a.time.localeCompare(b.time)), [tasks, filter, selectedDate, priority, search]);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12
      ? localize(settings.language, 'Good morning', 'Magandang umaga')
      : hour < 18
        ? localize(settings.language, 'Good afternoon', 'Magandang hapon')
        : localize(settings.language, 'Good evening', 'Magandang gabi');
  }, [settings.language]);
  const locale = localeFor(settings.language);

  return (
    <FlowTaskPage onProfilePress={() => router.navigate('/preferences' as Href)}>
      <ScreenScroll>
        <PageHeading
          eyebrow={new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
          title={`${greeting}, ${settings.nickname.trim() || 'there'}`}
          subtitle={localize(settings.language, 'A fresh day to make progress at your pace.', 'Bagong araw para umusad sa sarili mong bilis.')}
          action={<PrimaryButton compact icon="add" label={localize(settings.language, 'Add', 'Idagdag')} onPress={() => setShowAdd(true)} />}
        />
        <DateStrip selected={selectedDate} onSelect={setSelectedDate} tasks={tasks} />
        <TaskProgress tasks={selectedTasks} />

        <View style={flowStyles.sectionHeading}>
          <View style={styles.sectionTitleWrap}><Text style={[flowStyles.sectionTitle, { color: theme.text }]}>{localize(settings.language, 'Your tasks', 'Mga gawain mo')}</Text><Text style={[styles.taskCount, { color: theme.textSecondary }]}>{visibleTasks.length}</Text></View>
          <Pressable onPress={() => { setFilter('All'); setPriority('All'); }}><Text style={{ color: theme.tint, fontSize: 11, fontWeight: '800' }}>{localize(settings.language, 'View all', 'Tingnan lahat')}</Text></Pressable>
        </View>
        <View style={[styles.searchField, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Ionicons name="search-outline" size={17} color={theme.textSecondary} />
          <TextInput value={search} onChangeText={setSearch} placeholder={localize(settings.language, 'Search your tasks', 'Maghanap ng gawain')} placeholderTextColor={theme.textSecondary} style={[styles.searchInput, { color: theme.text }]} />
          {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={17} color={theme.textSecondary} /></Pressable> : null}
        </View>

        <View style={styles.pillsRow}>
          {(['Today', 'All', 'Upcoming', 'Completed'] as StatusFilter[]).map(item => <FilterPill key={item} label={localize(settings.language, item, item === 'Today' ? 'Ngayon' : item === 'All' ? 'Lahat' : item === 'Upcoming' ? 'Paparating' : 'Tapos na')} active={filter === item} onPress={() => setFilter(item)} />)}
        </View>
        <View style={styles.priorityRow}>
          <Text style={[styles.priorityLabel, { color: theme.textSecondary }]}>{localize(settings.language, 'PRIORITY', 'PRAYORIDAD')}</Text>
          {(['All', 'Low', 'Medium', 'High'] as PriorityFilter[]).map(item => <FilterPill key={item} label={localize(settings.language, item, item === 'All' ? 'Lahat' : item === 'Low' ? 'Mababa' : item === 'Medium' ? 'Katamtaman' : 'Mataas')} active={priority === item} onPress={() => setPriority(item)} compact />)}
        </View>
        {visibleTasks.length ? visibleTasks.map(task => <TaskCard key={task.id} task={task} />) : <EmptyState title={localize(settings.language, 'Nothing on this list', 'Walang laman ang listahang ito')} body={localize(settings.language, 'Try a different filter or add a new task to get started.', 'Sumubok ng ibang filter o magdagdag ng gawain para makapagsimula.')} />}
      </ScreenScroll>
      <AddTaskSheet visible={showAdd} initialDate={selectedDate} onClose={() => setShowAdd(false)} />
    </FlowTaskPage>
  );
}

function FilterPill({ label, active, onPress, compact = false }: { label: string; active: boolean; onPress: () => void; compact?: boolean }) {
  const theme = useTheme();
  return <Pressable onPress={onPress} style={[styles.filterPill, compact && styles.filterPillCompact, { borderColor: active ? theme.tint : theme.border, backgroundColor: active ? theme.buttonSecondary : theme.card }]}><Text style={{ color: active ? theme.tint : theme.textSecondary, fontSize: compact ? 9 : 10, fontWeight: '700' }}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  taskCount: { fontSize: 10 },
  searchField: { minHeight: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 11, paddingVertical: 8 },
  pillsRow: { flexDirection: 'row', gap: 6, marginTop: 11, marginBottom: 10 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 11 },
  priorityLabel: { flex: 1, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  filterPill: { minHeight: 31, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9, borderWidth: 1, borderRadius: 16 },
  filterPillCompact: { minHeight: 26, paddingHorizontal: 8 },
});
