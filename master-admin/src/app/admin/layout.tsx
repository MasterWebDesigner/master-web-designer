import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const { data: admin } = await supabase
    .from("administradores")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-base">
      <Sidebar email={admin.email} />
      <div className="lg:pl-72">
        <main className="mx-auto max-w-7xl px-5 py-24 lg:py-10">{children}</main>
      </div>
    </div>
  );
}