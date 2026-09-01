import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { googleSheets } from "@/lib/google-sheets";
import { Users, Search } from "lucide-react";
import { GrupoCard } from "@/components/grupos/GrupoCard";

export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const role = session.user.role;
  const campus = session.user.campus;

  // Obtener leads que están en etapa de inscripción
  const allLeads = await googleSheets.getLeads();
  const inscritos = allLeads.filter(l => l.statusLead === 'Pre-inscrito' || l.statusLead === 'Inscrito');

  const resolvedParams = await searchParams;
  const searchQuery = resolvedParams.q?.toLowerCase() || "";
  const filterStatus = resolvedParams.status || "Todos";

  // Filtrar por campus si es "Campus" o "Asesor"
  let inscritosFiltrados = (role === "Campus" || role === "Asesor") 
    ? inscritos.filter(i => i.campusInteres === campus)
    : inscritos;

  // Búsqueda profunda en los inscritos que formarán los grupos
  if (searchQuery) {
    inscritosFiltrados = inscritosFiltrados.filter(inscrito => {
      const valores = Object.values(inscrito).map(v => String(v).toLowerCase());
      return valores.some(v => v.includes(searchQuery));
    });
  }

  const gruposMap = new Map<string, any>();

  inscritosFiltrados.forEach(inscrito => {
    // Usar los valores FINALES asignados en la Pre-inscripción si existen, sino hacer fallback
    const año = inscrito.año || "Año ?";
    const periodo = inscrito.periodoInteres || "Periodo ?";
    const carrera = inscrito.carreraAsignada || inscrito.carrera || "Carrera ?";
    const turno = inscrito.turnoAsignado || inscrito.turno || "Turno ?";
    const modalidad = inscrito.modalidad || "Modalidad ?";
    const campusStr = inscrito.campusInteres || "Campus ?";

    const llaveGrupo = `${campusStr}|${año}|${periodo}|${carrera}|${modalidad}|${turno}`;
    
    if (!gruposMap.has(llaveGrupo)) {
      gruposMap.set(llaveGrupo, {
        campus: campusStr,
        año: año,
        periodo: periodo,
        carrera: carrera,
        modalidad: modalidad,
        turno: turno,
        inscritos: [],
      });
    }

    gruposMap.get(llaveGrupo).inscritos.push(inscrito);
  });

  const grupos = Array.from(gruposMap.values());

  let gruposModificados = grupos.map(grupo => {
    const cantidad = grupo.inscritos.length;
    let statusText = "EN RIESGO";
    if (cantidad >= 8) {
      statusText = "APERTURADO";
    } else if (cantidad >= 4) {
      statusText = "PROBABLE";
    }
    return { ...grupo, statusCalculado: statusText };
  });

  if (filterStatus !== "Todos") {
    gruposModificados = gruposModificados.filter(g => g.statusCalculado === filterStatus.toUpperCase());
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Apertura de Grupos</h1>
        <p className="text-slate-500 mt-1">
          Un grupo se apertura automáticamente al alcanzar <span className="font-bold text-slate-700">8 alumnos inscritos</span> que coincidan en Campus, Año, Periodo, Carrera, Modalidad y Turno.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <form className="flex flex-col sm:flex-row w-full gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Buscar en grupos..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm text-slate-900"
            />
          </div>
          
          <select 
            name="status" 
            defaultValue={filterStatus}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm text-slate-900"
          >
            <option value="Todos">Todos los Estatus</option>
            <option value="APERTURADO">Aperturado</option>
            <option value="PROBABLE">Probable</option>
            <option value="EN RIESGO">En Riesgo</option>
          </select>

          <button type="submit" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors shadow-sm whitespace-nowrap">
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gruposModificados.length > 0 ? (
          gruposModificados.map((grupo, idx) => (
            <GrupoCard key={idx} grupo={grupo} />
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-600">No hay grupos en formación para tu campus</p>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Para que aparezca un grupo aquí, debes inscribir al menos a un alumno asegurándote de llenar todos sus datos: <b>Campus, Año, Periodo, Carrera, Modalidad y Turno</b>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
