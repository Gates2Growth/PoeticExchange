import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserDropdown } from "@/components/user-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Menu, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getUserInitial } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Get friend's user info (in a real app, would fetch from API)
  const { data: friendUser } = useQuery<User>({
    queryKey: ["/api/friend"],
    queryFn: async () => {
      // Mock response for the friend user based on current user's ID
      return {
        id: user!.id === 1 ? 2 : 1,
        username: user!.id === 1 ? "sarah" : "emma",
        displayName: user!.id === 1 ? "Sarah" : "Emma",
        password: "" // Password is never exposed to the client
      };
    },
    enabled: !!user
  });

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="font-display text-xl font-semibold text-darktext">Poetic Exchange</h1>
              </div>
            </div>
            <div className="flex items-center">
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6">
                  {searchOpen ? (
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search poems..."
                        className="w-64 pl-10 pr-4"
                        autoFocus
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-0 pr-3"
                        onClick={toggleSearch}
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={toggleSearch}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Search</span>
                      <Search className="h-5 w-5 text-gray-500" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2"
                    onClick={() => logoutMutation.mutate()}
                  >
                    Log Out
                  </Button>

                  <UserDropdown />
                </div>
              </div>
              <div className="-mr-2 flex md:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={toggleMobileMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <span className="sr-only">Open main menu</span>
                  {mobileMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-white border-b border-gray-200 z-10">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/poems">
              <a className={`block pl-3 pr-4 py-2 border-l-4 ${
                location === "/poems" 
                  ? "border-primary text-primary bg-blue-50" 
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              } text-base font-medium`}>
                Poems Library
              </a>
            </Link>
            <Link href="/poems/create">
              <a className={`block pl-3 pr-4 py-2 border-l-4 ${
                location === "/poems/create" 
                  ? "border-primary text-primary bg-blue-50" 
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              } text-base font-medium`}>
                Create Poem
              </a>
            </Link>
            <Link href="/chat">
              <a className={`block pl-3 pr-4 py-2 border-l-4 ${
                location === "/chat" 
                  ? "border-primary text-primary bg-blue-50" 
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              } text-base font-medium`}>
                Chat
              </a>
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-secondary text-white flex items-center justify-center">
                  <span className="text-sm font-medium">{user && getUserInitial(user.displayName)}</span>
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{user?.displayName}</div>
                <div className="text-sm font-medium text-gray-500">{user?.username}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button 
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => {
                  setMobileMenuOpen(false);
                }}
              >
                Your Profile
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => {
                  setMobileMenuOpen(false);
                }}
              >
                Settings
              </button>
              <button 
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                onClick={() => {
                  // Can't use hooks inside event handlers
                  // Getting logout mutation from the same auth context that was used in the component
                  logoutMutation.mutate();
                  setMobileMenuOpen(false);
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
            <div className="h-0 flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                <Link href="/poems">
                  <a className={`group flex items-center px-2 py-2 text-base leading-6 font-medium rounded-md ${
                    location === "/poems" || location.startsWith("/poems/") && !location.startsWith("/poems/create")
                      ? "text-primary bg-blue-50" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}>
                    <i className={`fas fa-book-open mr-3 ${
                      location === "/poems" || location.startsWith("/poems/") && !location.startsWith("/poems/create")
                        ? "text-primary" 
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}></i>
                    Poems Library
                  </a>
                </Link>
                <Link href="/poems/create">
                  <a className={`group flex items-center px-2 py-2 text-base leading-6 font-medium rounded-md ${
                    location === "/poems/create" 
                      ? "text-primary bg-blue-50" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}>
                    <i className={`fas fa-pen-fancy mr-3 ${
                      location === "/poems/create" 
                        ? "text-primary" 
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}></i>
                    Create Poem
                  </a>
                </Link>
                <Link href="/chat">
                  <a className={`group flex items-center px-2 py-2 text-base leading-6 font-medium rounded-md ${
                    location === "/chat" 
                      ? "text-primary bg-blue-50" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}>
                    <i className={`fas fa-comments mr-3 ${
                      location === "/chat" 
                        ? "text-primary" 
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}></i>
                    Chat
                    {/* This would fetch unread count in a real app */}
                    <span className="ml-auto inline-block py-0.5 px-2 text-xs rounded-full bg-primary text-white">
                      {location === "/chat" ? 0 : 2}
                    </span>
                  </a>
                </Link>
              </nav>
              
              {friendUser && (
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center">
                    <div className="mr-3">
                      <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
                        <span className="text-sm font-medium">{getUserInitial(friendUser.displayName)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{friendUser.displayName}</p>
                      <p className="text-xs text-gray-500">Your poetry friend</p>
                    </div>
                    <div className="ml-auto flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </div>
      </div>
    </div>
  );
}
