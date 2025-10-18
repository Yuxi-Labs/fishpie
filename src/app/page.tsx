import { redirect } from "next/navigation";

export default function Home() {
  // Make the workspace load by default at '/'
  redirect("/workspace/untitled");
}
