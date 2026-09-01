"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function BajasChart({ data }: { data: any[] }) {
  const recuperados = data.filter(l => l.accionVencidaSinSeguimiento === "Recuperado").length;
  const noRecuperados = data.filter(l => l.accionVencidaSinSeguimiento === "No Recuperado").length;
  const pendientes = data.length - recuperados - noRecuperados;

  const chartData = [
    { name: "Recuperados Exitosamente", value: recuperados, color: "#16a34a" }, // green-600
    { name: "Baja Definitiva", value: noRecuperados, color: "#dc2626" }, // red-600
  ];
  
  if (pendientes > 0) {
    chartData.push({ name: "Pendientes", value: pendientes, color: "#d97706" }); // amber-600
  }

  // Filtrar categorías que tengan 0 para que no salgan en la leyenda si no hay
  const activeData = chartData.filter(d => d.value > 0);

  if (activeData.length === 0) return null;

  return (
    <div className="h-72 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={activeData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {activeData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value} leads`, "Cantidad"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
