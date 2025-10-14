import { redirect } from "next/navigation";

export default function WorkspaceIndex() {
  // Redirect /workspace to a default workspace id
  redirect("/workspace/untitled");
}
