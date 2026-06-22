import { useAdminGetStats } from "@workspace/api-client-react";

export default function Admin() {
  const { data: stats, isLoading } = useAdminGetStats();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <div className="p-8 border rounded-lg bg-card">
        {isLoading ? "Loading admin stats..." : "Admin stats loaded."}
      </div>
    </div>
  );
}
