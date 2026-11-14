// Remounts on every page change, so the page content fades in while the menu stays put.
export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return <div className="workspace-page">{children}</div>;
}
