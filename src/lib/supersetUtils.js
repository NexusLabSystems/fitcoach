// src/lib/supersetUtils.js — utilitários para supersets (bi-set / tri-set)

let _uid = 100;
export function uid() { return `item_${Date.now()}_${_uid++}`; }

/** Retorna todos os IDs "folha" de um array de exercícios (suporta supersets) */
export function collectAllIds(exercises) {
  return exercises.flatMap(e =>
    e.type === "superset" ? e.items.map(s => s.id) : [e.id]
  );
}

/** Conta exercícios totais (sub-itens de superset contam individualmente) */
export function countExercises(exercises) {
  return collectAllIds(exercises).length;
}

/** Verifica se um exercício (pelo exercise.id) já existe no dia */
export function isExerciseInDay(exercises, exerciseId) {
  return exercises.some(e =>
    e.type === "superset"
      ? e.items.some(s => s.exercise?.id === exerciseId)
      : e.exercise?.id === exerciseId
  );
}

/** Converte um item regular + novo exercício em superset */
export function mergeIntoSuperset(exercises, targetId, newExercise) {
  return exercises.map(e => {
    if (e.id !== targetId) return e;
    return {
      id: e.id,
      type: "superset",
      rest: e.rest ?? 60,
      items: [
        { id: uid(), exercise: e.exercise, sets: e.sets, reps: e.reps, load: e.load ?? "", notes: e.notes ?? "" },
        { id: uid(), exercise: newExercise, sets: 4, reps: "10-12", load: "", notes: "" },
      ],
    };
  });
}

/** Adiciona um exercício a um superset existente (bi-set → tri-set) */
export function addToSuperset(exercises, supersetId, newExercise) {
  return exercises.map(e => {
    if (e.id !== supersetId || e.type !== "superset") return e;
    return { ...e, items: [...e.items, { id: uid(), exercise: newExercise, sets: 4, reps: "10-12", load: "", notes: "" }] };
  });
}

/** Remove sub-item de um superset; se sobrar 1 item, converte de volta para exercício regular */
export function removeFromSuperset(exercises, supersetId, subItemId) {
  return exercises.map(e => {
    if (e.id !== supersetId || e.type !== "superset") return e;
    const remaining = e.items.filter(s => s.id !== subItemId);
    if (remaining.length === 1) {
      const s = remaining[0];
      return { id: e.id, exercise: s.exercise, sets: s.sets, reps: s.reps, load: s.load, rest: e.rest, notes: s.notes };
    }
    return { ...e, items: remaining };
  });
}

/** Atualiza um campo de um sub-item dentro de um superset */
export function updateSupersetSubItem(exercises, supersetId, subItemId, field, value) {
  return exercises.map(e => {
    if (e.id !== supersetId || e.type !== "superset") return e;
    return { ...e, items: e.items.map(s => s.id === subItemId ? { ...s, [field]: value } : s) };
  });
}

/** Atualiza um campo do container do superset (ex: rest) */
export function updateSupersetContainer(exercises, supersetId, field, value) {
  return exercises.map(e =>
    e.id === supersetId && e.type === "superset" ? { ...e, [field]: value } : e
  );
}
