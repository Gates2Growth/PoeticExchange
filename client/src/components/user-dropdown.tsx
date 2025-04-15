import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUserInitial } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export function UserDropdown() {
  const { user, logoutMutation } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center gap-2 ml-3 focus:outline-none">
          <div className="h-8 w-8 rounded-full bg-secondary text-white flex items-center justify-center">
            <span className="text-sm font-medium">{getUserInitial(user.displayName)}</span>
          </div>
          <span className="ml-2 text-darktext font-medium hidden sm:block">{user.displayName}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
          {user.displayName}
        </div>
        <div className="px-2 py-1.5 text-xs text-gray-500">
          @{user.username}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          Your Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-red-600"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
