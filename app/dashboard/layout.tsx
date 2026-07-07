import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="font-semibold">capcat — Seller</span>
          <form action={logout}>
            <Button variant="ghost" size="icon" type="submit">
              <LogOut size={16} className="text-muted-foreground" />
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
