"use client";

import { useState, useTransition } from "react";
import { guardarAccionRecuperacionAction, marcarSeguimientoRecuperacionAction } from "@/app/actions/bajasActions";
import { Loader2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";

export function AccionRecuperacionForm({ lead, isDireccion }: { lead: any, isDireccion: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleGuardar = (formData: FormData) => {
    startTransition(async () => {
      const res = await guardarAccionRecuperacionAction(formData);
      if (!res.success) {
        alert(res.error || "Ocurrió un error");
      }
    });
  };

  const handleMarcar = (formData: FormData) => {
    startTransition(async () => {
      const res = await marcarSeguimientoRecuperacionAction(formData);
      if (!res.success) {
        alert(res.error || "Ocurrió un error");
      }
    });
  };

  const hasAccion = !!lead.accionRecuperacion;
  const isCompletado = lead.accionVencidaSinSeguimiento === "Completado";
  
  // Calcular si está vencida
  let isVencida = false;
  if (hasAccion && lead.fechaAccionRecuperacion && !isCompletado) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse fecha string YYYY-MM-DD
    const parts = lead.fechaAccionRecuperacion.split('-');
    if (parts.length === 3) {
      const actionDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (actionDate < today) {
        isVencida = true;
      }
    }
  }

  // Si no hay acción y no es dirección, mostrar mensaje vacío
  if (!hasAccion && !isDireccion) {
    return <span className="text-slate-400 italic text-xs">Sin acción registrada</span>;
  }

  // Si ya hay acción
  if (hasAccion) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">{lead.accionRecuperacion}</p>
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Programada: {lead.fechaAccionRecuperacion}</span>
        </div>
        
        {isCompletado || lead.accionVencidaSinSeguimiento === "Recuperado" || lead.accionVencidaSinSeguimiento === "No Recuperado" ? (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md w-max border ${
            lead.accionVencidaSinSeguimiento === "Recuperado" 
              ? "text-green-600 bg-green-50 border-green-100" 
              : lead.accionVencidaSinSeguimiento === "No Recuperado"
              ? "text-red-600 bg-red-50 border-red-100"
              : "text-blue-600 bg-blue-50 border-blue-100"
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            {lead.accionVencidaSinSeguimiento === "Recuperado" ? "✅ Recuperado Exitosamente" : 
             lead.accionVencidaSinSeguimiento === "No Recuperado" ? "❌ Baja Definitiva" : 
             "Acción Completada"}
          </div>
        ) : isVencida ? (
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md w-max border border-red-100 shadow-sm animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Acción Vencida sin Seguimiento
            </div>
            {isDireccion && (
              <form action={handleMarcar} className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <input type="hidden" name="idLead" value={lead.idLead} />
                <label className="text-[10px] font-bold text-slate-500 uppercase">Resultado de la acción:</label>
                <select name="resultado" required className="text-xs px-2 py-1 border border-slate-300 rounded outline-none bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecciona el resultado...</option>
                  <option value="Recuperado">✅ Logramos recuperarlo</option>
                  <option value="No Recuperado">❌ No se pudo (Baja Definitiva)</option>
                </select>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors w-full flex justify-center items-center gap-1 mt-1"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar Resultado"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-max border border-amber-100">
              Pendiente de realizar
            </div>
            {isDireccion && (
              <form action={handleMarcar} className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <input type="hidden" name="idLead" value={lead.idLead} />
                <label className="text-[10px] font-bold text-slate-500 uppercase">Resultado de la acción:</label>
                <select name="resultado" required className="text-xs px-2 py-1 border border-slate-300 rounded outline-none bg-white focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecciona el resultado...</option>
                  <option value="Recuperado">✅ Logramos recuperarlo</option>
                  <option value="No Recuperado">❌ No se pudo (Baja Definitiva)</option>
                </select>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors w-full flex justify-center items-center gap-1 mt-1"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar Resultado"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    );
  }

  // Si no hay acción y ES dirección, mostrar formulario
  return (
    <form action={handleGuardar} className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
      <input type="hidden" name="idLead" value={lead.idLead} />
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Estrategia de Recuperación</label>
        <input 
          required
          type="text" 
          name="accion" 
          placeholder="Ej. Llamar para ofrecer beca 20%" 
          className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha Compromiso</label>
        <input 
          required
          type="date" 
          name="fecha" 
          className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>
      <button 
        type="submit" 
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors flex justify-center items-center mt-1 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar Acción"}
      </button>
    </form>
  );
}
