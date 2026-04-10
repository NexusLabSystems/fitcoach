// src/components/ui/GlobalSearch.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useExercises } from "@/hooks/useExercises";

const ICONS = {
  student: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  workout: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
    </svg>
  ),
  exercise: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
};

const TYPE_LABEL = { student: "Aluno", workout: "Treino", exercise: "Exercício" };

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { students } = useStudents();
  const { plans }    = useWorkouts();
  const { exercises } = useExercises();

  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const results = query.trim().length < 2 ? [] : (() => {
    const q = query.toLowerCase();
    const hits = [];

    students.forEach(s => {
      if (s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
        hits.push({ type: "student", label: s.name, sub: s.email, to: `/trainer/students/${s.id}` });
    });

    plans.forEach(p => {
      if (p.name?.toLowerCase().includes(q))
        hits.push({ type: "workout", label: p.name, sub: `${p.days?.length ?? 0} dias`, to: `/trainer/workouts/${p.id}` });
    });

    exercises.forEach(e => {
      if (e.name?.toLowerCase().includes(q))
        hits.push({ type: "exercise", label: e.name, sub: e.muscleGroup, to: `/trainer/exercises` });
    });

    return hits.slice(0, 8);
  })();

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") { setOpen(false); setQuery(""); inputRef.current?.blur(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result) {
    navigate(result.to);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[active]) handleSelect(results[active]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar... (Ctrl+K)"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="input pl-8 pr-3 py-1.5 text-sm w-52 lg:w-64"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1 right-0 w-72 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Nenhum resultado para "{query}"</p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${i === active ? "bg-gray-50" : ""}`}
                  >
                    <span className={`w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0 ${
                      r.type === "student"  ? "bg-brand-50 text-brand-500" :
                      r.type === "workout"  ? "bg-blue-50 text-blue-500"   :
                                              "bg-yellow-50 text-yellow-600"
                    }`}>
                      {ICONS[r.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                      <p className="text-xs text-gray-400 truncate">{TYPE_LABEL[r.type]} · {r.sub}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
