import { useAdminListUsers } from "@workspace/api-client-react";

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminListUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Manage Users</h1>
      <div className="p-8 border rounded-lg bg-card">
        {isLoading ? "Loading users..." : "Users list loaded."}
      </div>
    </div>
  );
}
