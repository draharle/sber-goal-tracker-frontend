import type { Unit } from '../api/types';

export interface UnitTreeNode {
  value: string;
  title: string;
  /** Текст для поиска в выпадающем списке: название и код. */
  searchText: string;
  children: UnitTreeNode[];
}

/**
 * Плоский список подразделений (id + parent_id) из /api/meta → дерево для TreeSelect.
 * Порядок внутри уровня — как пришёл из API. Если родителя нет в списке, узел становится корнем:
 * так подразделение не потеряется, даже если справочник придёт неполным.
 */
export function buildUnitTree(units: Unit[]): UnitTreeNode[] {
  const nodes = new Map<string, UnitTreeNode>();
  for (const unit of units) {
    nodes.set(unit.id, {
      value: unit.id,
      title: unit.name,
      searchText: `${unit.name} ${unit.id}`.toLowerCase(),
      children: [],
    });
  }
  const roots: UnitTreeNode[] = [];
  for (const unit of units) {
    const node = nodes.get(unit.id)!;
    const parent = unit.parent_id !== null && unit.parent_id !== unit.id ? nodes.get(unit.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** id подразделения и всех вышестоящих, чтобы раскрыть дерево до выбранного. */
export function ancestorIds(units: Unit[], unitId: string): string[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(unitId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current.id);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return chain;
}
