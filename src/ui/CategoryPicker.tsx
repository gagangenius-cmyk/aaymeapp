import React from 'react';
import { View } from 'react-native';
import { Chip, Row } from './kit';

export interface Cat { id: number; name: string; parent_id: number | null }

/**
 * Categories as a tree: each main category, then its sub-categories (indented) under it. Tapping toggles a category.
 * Choosing a main category covers its sub-categories on the server, so picking only the main one is enough.
 */
export function CategoryPicker({ categories, selected, onChange }: { categories: Cat[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const ids = new Set(categories.map((c) => c.id));
  const kids = (parent: number | null) => categories.filter((c) => (c.parent_id && ids.has(c.parent_id) ? c.parent_id : null) === parent);
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const block = (c: Cat, depth: number): React.ReactNode => {
    const sub = kids(c.id);
    return (
      <View key={c.id} style={{ gap: 6, marginLeft: depth ? 14 : 0 }}>
        <Row><Chip label={(depth ? '↳ ' : '') + c.name} active={selected.includes(c.id)} onPress={() => toggle(c.id)} /></Row>
        {depth < 4 && sub.length > 0 && <View style={{ gap: 6 }}>{sub.map((s) => block(s, depth + 1))}</View>}
      </View>
    );
  };
  return <View style={{ gap: 8 }}>{kids(null).map((c) => block(c, 0))}</View>;
}
