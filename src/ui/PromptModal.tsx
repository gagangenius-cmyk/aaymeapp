import React, { useState } from 'react';
import { AppText as Text } from './AppText';
import { KeyboardAvoidingView, Modal, Platform, View } from 'react-native';
import { colors, radius } from '../lib/theme';
import { Button, Field, Row } from './kit';

/** Cross-platform text prompt (Alert.prompt is iOS-only). Used for reject reasons, payment references, notes. */
export function PromptModal({ visible, title, label, placeholder, confirmLabel = 'Confirm', minLength = 1, danger, onCancel, onSubmit }: {
  visible: boolean; title: string; label: string; placeholder?: string; confirmLabel?: string; minLength?: number; danger?: boolean;
  onCancel: () => void; onSubmit: (value: string) => void;
}) {
  const [v, setV] = useState('');
  const close = () => { setV(''); onCancel(); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#000A', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{title}</Text>
          <Field label={label} value={v} onChangeText={setV} placeholder={placeholder} autoFocus multiline />
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button small variant="ghost" title="Cancel" onPress={close} />
            <Button small variant={danger ? 'danger' : 'primary'} title={confirmLabel} disabled={v.trim().length < minLength} onPress={() => { const t = v.trim(); setV(''); onSubmit(t); }} />
          </Row>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Tiny state helper: `const p = usePrompt(); p.ask({...}); <PromptModal {...p.props} />`. */
export function usePrompt() {
  const [cfg, setCfg] = useState<null | { title: string; label: string; confirmLabel?: string; minLength?: number; danger?: boolean; onSubmit: (v: string) => void }>(null);
  return {
    ask: (c: NonNullable<typeof cfg>) => setCfg(c),
    props: { visible: !!cfg, title: cfg?.title ?? '', label: cfg?.label ?? '', confirmLabel: cfg?.confirmLabel, minLength: cfg?.minLength, danger: cfg?.danger, onCancel: () => setCfg(null), onSubmit: (v: string) => { const c = cfg; setCfg(null); c?.onSubmit(v); } },
  };
}
