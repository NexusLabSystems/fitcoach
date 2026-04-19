// src/components/ui/TutorialTour.jsx
import { useState, useEffect } from "react";
import clsx from "clsx";

const PAD    = 12;
const TIP_W  = 308;

function useRect(targetKey, current) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!targetKey) { setRect(null); return; }

    function measure() {
      const el = document.querySelector(`[data-tutorial="${targetKey}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }

    // Pequeno delay para garantir que o scroll animado terminou
    const t = setTimeout(() => {
      const el = document.querySelector(`[data-tutorial="${targetKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(measure, 300);
    }, 50);

    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [targetKey, current]);

  return rect;
}

export default function TutorialTour({ steps, storageKey, onDone, light = false }) {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const rect  = useRect(step?.target ?? null, current);

  const hl = rect ? {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  function finish() {
    if (storageKey) localStorage.setItem(storageKey, "1");
    onDone?.();
  }

  // Posição do tooltip: abaixo → acima → centralizado
  let tipStyle;
  if (hl) {
    const spaceBelow = window.innerHeight - (hl.top + hl.height);
    const spaceAbove = hl.top;
    let top;
    if (spaceBelow >= 200) {
      top = hl.top + hl.height + 14;
    } else if (spaceAbove >= 200) {
      top = hl.top - 190;
    } else {
      top = window.innerHeight / 2 - 90;
    }
    let left = hl.left + hl.width / 2 - TIP_W / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - TIP_W - 12));
    top  = Math.max(12, top);
    tipStyle = { top, left, width: TIP_W };
  } else {
    tipStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: Math.min(TIP_W, window.innerWidth - 32),
    };
  }

  const isFirst = current === 0;
  const isLast  = current === steps.length - 1;

  return (
    <div className={`fixed inset-0 ${light ? "z-[200]" : "z-[100]"}`} style={{ pointerEvents: "none" }}>

      {/* ── Overlay escuro (não exibido no modo light) ─────────── */}
      {!light && (hl ? (
        <>
          <div className="absolute bg-black/65 pointer-events-auto"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, hl.top) }} />
          <div className="absolute bg-black/65 pointer-events-auto"
            style={{ top: hl.top + hl.height, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/65 pointer-events-auto"
            style={{ top: hl.top, left: 0, width: Math.max(0, hl.left), height: hl.height }} />
          <div className="absolute bg-black/65 pointer-events-auto"
            style={{ top: hl.top, left: hl.left + hl.width, right: 0, height: hl.height }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/65 pointer-events-auto" />
      ))}

      {/* Borda de destaque */}
      {hl && (
        <div className="absolute rounded-2xl pointer-events-none"
          style={{ top: hl.top, left: hl.left, width: hl.width, height: hl.height,
            boxShadow: "0 0 0 2.5px #FF5722, 0 0 0 5px rgba(255,87,34,0.15)" }} />
      )}

      {/* ── Tooltip ────────────────────────────────────────────── */}
      <div
        className="absolute bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
        style={tipStyle}
      >
        {/* Barra de progresso */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step icon + título */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              {step.icon && (
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 text-base">
                  {step.icon}
                </div>
              )}
              <h3 className="text-sm font-bold text-gray-900 leading-snug">{step.title}</h3>
            </div>
            <button
              onClick={finish}
              className="text-[11px] text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors"
            >
              Pular
            </button>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed mb-5">{step.description}</p>

          {/* Rodapé: progresso + botões */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={clsx(
                  "rounded-full transition-all duration-200",
                  i === current ? "w-4 h-1.5 bg-brand-500" : "w-1.5 h-1.5 bg-gray-200"
                )} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={() => setCurrent(c => c - 1)}
                  className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  ← Voltar
                </button>
              )}
              <button
                onClick={() => isLast ? finish() : setCurrent(c => c + 1)}
                className="text-xs font-semibold bg-brand-500 text-white px-4 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
              >
                {isLast ? "Concluir ✓" : "Próximo →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
