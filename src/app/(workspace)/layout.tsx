import { getOwner } from "@/lib/supabase/server";
import { WorkspaceNav } from "./workspace-nav";

// Shared by /drop, /view and /gallery so the menu stays mounted between them
// and its highlight can slide from one page to the next.
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwner();

  return (
    <div className="workspace">
      {owner && <WorkspaceNav />}
      {children}
    </div>
  );
}
