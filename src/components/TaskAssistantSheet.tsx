import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type GestureResponderEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlowText as Text } from '@/components/FlowText';
import { TapPressable as Pressable } from '@/components/TapPressable';
import { localize } from '@/i18n';
import { useSettings } from '@/settings/SettingsContext';
import type { FlowTask } from '@/tasks/FlowTasksContext';
import { getTaskAssistantReply } from '@/tasks/taskAssistant';
import { useTheme } from '@/theme';

type Message = { id: string; from: 'assistant' | 'user'; text: string };

const STARTER_QUESTION = 'Anong magandang gawin ngayong araw?';

export function TaskAssistantSheet({ visible, onClose, tasks }: {
  visible: boolean;
  onClose: () => void;
  tasks: FlowTask[];
}) {
  const theme = useTheme();
  const { settings } = useSettings();
  const dimensions = useWindowDimensions();
  const listRef = useRef<ScrollView>(null);
  const dragOrigin = useRef({ pageX: 0, pageY: 0, x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    from: 'assistant',
    text: localize(settings.language, 'Hi! I can suggest what to work on based on your tasks. Try asking “Anong magandang gawin ngayong araw?”', 'Kumusta! Makakapagmungkahi ako ng puwedeng gawin batay sa mga gawain mo.'),
  }]);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const startDrag = (event: GestureResponderEvent) => {
    dragOrigin.current = {
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      x: position.x,
      y: position.y,
    };
  };
  const moveDrag = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - dragOrigin.current.pageX;
    const dy = event.nativeEvent.pageY - dragOrigin.current.pageY;
    const maxX = Math.max(0, (dimensions.width - panelSize.width) / 2 - 12);
    const maxY = Math.max(0, (dimensions.height - panelSize.height) / 2 - 12);
    setPosition({
      x: Math.max(-maxX, Math.min(maxX, dragOrigin.current.x + dx)),
      y: Math.max(-maxY, Math.min(maxY, dragOrigin.current.y + dy)),
    });
  };

  const send = (text = draft) => {
    const question = text.trim();
    if (!question) return;
    setMessages(current => [
      ...current,
      { id: `${Date.now()}-user`, from: 'user', text: question },
      { id: `${Date.now()}-assistant`, from: 'assistant', text: getTaskAssistantReply(question, tasks) },
    ]);
    setDraft('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
        <Pressable accessibilityLabel="Close task assistant" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          onLayout={event => setPanelSize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ translateX: position.x }, { translateY: position.y }],
            },
          ]}
        >
          <View
            accessibilityRole="button"
            accessibilityLabel={localize(settings.language, 'Move AI window', 'Ilipat ang AI window')}
            onTouchStart={startDrag}
            onTouchMove={moveDrag}
            style={styles.dragArea}
          >
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.heading}>
            <View style={[styles.avatar, { backgroundColor: theme.buttonSecondary }]}>
              <Ionicons name="sparkles" size={18} color={theme.tint} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={[styles.title, { color: theme.text }]}>{localize(settings.language, 'Your day planner', 'Day planner mo')}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{localize(settings.language, 'Works offline · no token or API key', 'Gumagana offline · walang token o API key')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={localize(settings.language, 'Close assistant', 'Isara ang assistant')} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={[styles.privacyNote, { backgroundColor: theme.buttonSecondary }]}>
            <Ionicons name="phone-portrait-outline" size={14} color={theme.tint} />
            <Text style={[styles.privacyText, { color: theme.textSecondary }]}>{localize(settings.language, 'Recommendations use your saved tasks on this device.', 'Ginagamit ng mga rekomendasyon ang mga naka-save mong gawain sa device na ito.')}</Text>
          </View>
          <ScrollView
            ref={listRef}
            style={styles.messages}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map(message => (
              <View key={message.id} style={[styles.messageRow, message.from === 'user' && styles.userRow]}>
                {message.from === 'assistant' ? (
                  <View style={[styles.messageIcon, { backgroundColor: theme.buttonSecondary }]}>
                    <Ionicons name="sparkles" size={13} color={theme.tint} />
                  </View>
                ) : null}
                <Text style={[
                  styles.message,
                  { backgroundColor: message.from === 'user' ? theme.userBubble : theme.assistantBubble, color: message.from === 'user' ? theme.userBubbleText : theme.text },
                ]}>{message.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.suggestions}>
            <Pressable accessibilityRole="button" onPress={() => send(STARTER_QUESTION)} style={[styles.suggestion, { borderColor: theme.border }]}>
              <Text style={[styles.suggestionText, { color: theme.tint }]}>{localize(settings.language, 'Recommend for today', 'Magrekomenda para ngayon')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => send('Help me find a good work task to focus on')} style={[styles.suggestion, { borderColor: theme.border }]}>
              <Text style={[styles.suggestionText, { color: theme.tint }]}>{localize(settings.language, 'Find my work focus', 'Tulungan akong magpokus sa trabaho')}</Text>
            </Pressable>
          </View>
          <View style={[styles.composer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              placeholder={localize(settings.language, 'Ask about your tasks...', 'Magtanong tungkol sa mga gawain mo...')}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={localize(settings.language, 'Ask your day planner', 'Magtanong sa day planner mo')}
              style={[styles.input, { color: theme.text }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={localize(settings.language, 'Send message', 'Ipadala ang mensahe')}
              disabled={!draft.trim()}
              onPress={() => send()}
              style={[styles.sendButton, { backgroundColor: theme.buttonPrimary, opacity: draft.trim() ? 1 : 0.5 }]}
            >
              <Ionicons name="arrow-up" size={19} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24, backgroundColor: 'rgba(10,18,14,0.48)' },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 480, height: '72%', minHeight: 320, maxHeight: 620, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, elevation: 12, shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  dragArea: { width: 72, height: 28, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  headingCopy: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { marginTop: 3, fontSize: 10 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, borderRadius: 10 },
  privacyText: { flex: 1, fontSize: 10 },
  messages: { flex: 1, marginTop: 12 },
  messageList: { gap: 10, paddingVertical: 6 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  userRow: { justifyContent: 'flex-end' },
  messageIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  message: { maxWidth: '84%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, fontSize: 12, lineHeight: 18, overflow: 'hidden' },
  suggestions: { flexDirection: 'row', gap: 7, paddingVertical: 8 },
  suggestion: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderRadius: 17 },
  suggestionText: { fontSize: 10, fontWeight: '700' },
  composer: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 13, paddingRight: 5, borderWidth: 1, borderRadius: 24 },
  input: { flex: 1, paddingVertical: 8, fontSize: 12 },
  sendButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
});
