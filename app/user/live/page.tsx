import { redirect } from "next/navigation";

export default function LiveRedirectPage() {
  redirect("/user/media?tab=live");
}
