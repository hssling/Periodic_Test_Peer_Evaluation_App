import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import { GraduationCap, Shield, UserCheck, Users, UserX } from "lucide-react";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { batch?: string; q?: string; page?: string };
}) {
  const supabase = await createClient();
  const selectedBatch = searchParams.batch;
  const searchQuery = searchParams.q?.trim();
  const parsedPage = Number(searchParams.page);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const statsQuery = supabase
    .from("profiles")
    .select("role, batch, is_active", { count: "exact" });

  const {
    data: statsRows,
    count: totalUsers,
    error: statsError,
  } = (await statsQuery) as {
    data: Pick<Profile, "role" | "batch" | "is_active">[] | null;
    count: number | null;
    error: any;
  };

  if (statsError) {
    return (
      <ErrorState message="Could not load user statistics. Please try again." />
    );
  }

  const allStudents = (statsRows || []).filter((p) => p.role === "student");
  const admins = (statsRows || []).filter(
    (p) => p.role === "admin" || p.role === "faculty",
  );
  const activeCount = (statsRows || []).filter((p) => p.is_active).length;

  const batches = Array.from(
    new Set(allStudents.map((s) => s.batch).filter(Boolean)),
  ).sort();

  let profilesQuery = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchQuery) {
    profilesQuery = profilesQuery.or(
      `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,roll_no.ilike.%${searchQuery}%`,
    );
  }

  if (selectedBatch) {
    profilesQuery = profilesQuery.eq("batch", selectedBatch);
  }

  const { data: profiles, count, error: profilesError } = (await profilesQuery) as {
    data: Profile[] | null;
    count: number | null;
    error: any;
  };

  if (profilesError) {
    return (
      <ErrorState message="Could not load users. Please check database connectivity." />
    );
  }

  const students = (profiles || []).filter((p: Profile) => p.role === "student");
  const totalRows = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Manage <span className="text-gradient">Users</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage platform users
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allStudents.length}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{admins.length}</p>
                <p className="text-xs text-muted-foreground">Admins/Faculty</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <a
          href="/admin/users"
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
            !selectedBatch
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground hover:bg-muted"
          }`}
        >
          All Batches
        </a>
        {batches.map((batch) => (
          <a
            key={batch}
            href={`/admin/users?batch=${batch}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              selectedBatch === batch
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            Batch {batch}
          </a>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <form className="w-full max-w-md">
          <input
            type="text"
            name="q"
            placeholder="Search by name, email, roll no..."
            defaultValue={searchQuery || ""}
            className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
          />
          {selectedBatch && (
            <input type="hidden" name="batch" value={selectedBatch} />
          )}
        </form>
      </div>

      {/* Admins/Faculty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Administrators & Faculty ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {admins.map((user: Profile) => {
              const name = user.name?.trim() || user.email || "User";
              const initial = name.charAt(0).toUpperCase();
              return (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate uppercase tracking-wider">
                    {user.role || "admin"}
                  </p>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    user.is_active
                      ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                      : "bg-muted"
                  }`}
                />
              </div>
            )})}
          </div>
          {admins.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No admins yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="text-lg flex items-center gap-2 font-bold">
            <GraduationCap className="w-6 h-6 text-primary" />
            Students{" "}
            {selectedBatch
              ? `(Batch ${selectedBatch})`
              : `(${allStudents.length})`}
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {students.length} matching students
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Users className="w-12 h-12 mx-auto opacity-20 mb-3" />
              <p>No students found for this selection</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left font-semibold py-4 px-6">
                      Student
                    </th>
                    <th className="text-left font-semibold py-4 px-6 hidden sm:table-cell">
                      Contact
                    </th>
                    <th className="text-left font-semibold py-4 px-6 hidden md:table-cell">
                      Roll No
                    </th>
                    <th className="text-left font-semibold py-4 px-6 hidden lg:table-cell">
                      Batch & Group
                    </th>
                    <th className="text-center font-semibold py-4 px-6">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y border-t">
                  {students.map((user: Profile) => {
                    const name = user.name?.trim() || user.email || "Student";
                    const initial = name.charAt(0).toUpperCase();
                    return (
                    <tr
                      key={user.id}
                      className="hover:bg-primary/5 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                            {initial}
                          </div>
                          <span className="font-semibold text-foreground">
                            {name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <div className="flex flex-col">
                          <span className="text-foreground">
                            {user.email || "-"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden md:table-cell font-mono text-muted-foreground">
                        {user.roll_no || "-"}
                      </td>
                      <td className="py-4 px-6 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-semibold">
                            Batch {user.batch || "N/A"}
                          </span>
                          {user.section && (
                            <span className="px-2 py-1 bg-accent/10 text-accent rounded-md text-xs font-semibold">
                              Group {user.section}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            user.is_active
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-muted text-muted-foreground border"
                          }`}
                        >
                          {user.is_active ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          {user.is_active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <a
              href={`/admin/users?page=${Math.max(1, page - 1)}${selectedBatch ? `&batch=${selectedBatch}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              className={`px-3 py-1 rounded-md border ${
                page === 1
                  ? "pointer-events-none text-muted-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Previous
            </a>
            <a
              href={`/admin/users?page=${Math.min(totalPages, page + 1)}${selectedBatch ? `&batch=${selectedBatch}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              className={`px-3 py-1 rounded-md border ${
                page >= totalPages
                  ? "pointer-events-none text-muted-foreground"
                  : "hover:bg-muted"
              }`}
            >
              Next
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="py-12 text-center">
        <Users className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-destructive">
          Error Loading Users
        </h3>
        <p className="text-muted-foreground mt-2">{message}</p>
      </CardContent>
    </Card>
  );
}
