import Link from "next/link";
import { VehicleForm } from "@/components/vehicles/vehicle-form";

export default function NovoVeiculoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/veiculos" className="text-sm text-institutional-700 hover:underline">
          ← Veículos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-institutional-900">Novo veículo</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cadastre um veículo na frota. A placa será normalizada (sem espaços/hífens).
        </p>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
        <VehicleForm mode="create" />
      </div>
    </div>
  );
}
