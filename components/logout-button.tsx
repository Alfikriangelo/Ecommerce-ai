// components/logout-button.tsx

import { logout } from "@/lib/actions";
import { Button } from "./ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline">
        Logout
      </Button>
    </form>
  );
}
