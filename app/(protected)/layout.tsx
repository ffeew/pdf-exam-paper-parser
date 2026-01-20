import { SideNavbar } from "@/components/layout/side-navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideNavbar />
      <main className="flex-1 h-full overflow-auto">{children}</main>
    </div>
  );
}
