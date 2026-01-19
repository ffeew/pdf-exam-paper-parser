import { SideNavbar } from "@/components/layout/side-navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SideNavbar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
