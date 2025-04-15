import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Poem, User } from "@shared/schema";
import { formatDate, getUserInitial, truncateText } from "@/lib/utils";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Loader2, Layout, ListFilter, Search, Grid, List } from "lucide-react";

type FilterType = "all" | "mine" | "friend";
type SortType = "newest" | "oldest" | "most-commented";
type ViewType = "grid" | "list";

export default function PoemsLibrary() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("newest");
  const [view, setView] = useState<ViewType>("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const poemsPerPage = 9;

  // Fetch poems
  const {
    data: poems,
    isLoading,
    error,
  } = useQuery<Poem[]>({
    queryKey: ["/api/poems"],
  });

  // Fetch other user for display purposes
  const {
    data: users,
    isLoading: isLoadingUsers,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      // Mock response for the second user since we're just using in-memory storage
      // In a real app, you'd fetch all users from the API
      return [
        user!,
        {
          id: user!.id === 1 ? 2 : 1,
          username: user!.id === 1 ? "sarah" : "emma",
          displayName: user!.id === 1 ? "Sarah" : "Emma",
          password: "" // Password is never exposed to the client
        }
      ];
    },
    enabled: !!user
  });

  if (isLoading || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="text-center p-6 bg-red-50 rounded-lg">
          <h2 className="text-lg font-medium text-red-800">Failed to load poems</h2>
          <p className="mt-2 text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  // Filter, sort, and search poems
  const filteredPoems = poems
    ?.filter(poem => {
      // Filter by owner
      if (filter === "mine" && poem.userId !== user?.id) return false;
      if (filter === "friend" && poem.userId === user?.id) return false;
      
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          poem.title.toLowerCase().includes(query) ||
          poem.content.toLowerCase().includes(query) ||
          (poem.tags?.some(tag => tag.toLowerCase().includes(query)) ?? false)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      // For "most-commented", we'd need comment counts, but without real data we'll use the poem ID as a proxy
      return b.id - a.id;
    }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredPoems.length / poemsPerPage);
  const indexOfLastPoem = currentPage * poemsPerPage;
  const indexOfFirstPoem = indexOfLastPoem - poemsPerPage;
  const currentPoems = filteredPoems.slice(indexOfFirstPoem, indexOfLastPoem);

  const getAuthorName = (userId: number) => {
    const author = users?.find(u => u.id === userId);
    return author?.displayName || "Unknown";
  };

  const getAuthorInitial = (userId: number) => {
    const author = users?.find(u => u.id === userId);
    return author ? getUserInitial(author.displayName) : "?";
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-semibold text-darktext">Poems Library</h1>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search poems..."
              className="w-64 pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div>
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter poems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Poems</SelectItem>
                <SelectItem value="mine">My Poems</SelectItem>
                <SelectItem value="friend">Friend's Poems</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={sort} onValueChange={(value) => setSort(value as SortType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort poems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="most-commented">Most Commented</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <div className="flex items-center space-x-2">
              <Button
                variant={view === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("grid")}
                className="w-9 h-9 p-0"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
                className="w-9 h-9 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button onClick={() => navigate('/poems/create')} className="flex items-center gap-2">
            <i className="fas fa-pen-fancy"></i>
            <span>Create Poem</span>
          </Button>
        </div>
        
        {/* Poems Grid/List */}
        {currentPoems.length === 0 ? (
          <div className="text-center py-8">
            <Layout className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No poems found</h3>
            <p className="mt-1 text-gray-500">
              {searchQuery 
                ? "Try adjusting your search or filters."
                : "Start by creating your first poem."}
            </p>
            <Button 
              className="mt-4"
              onClick={() => navigate('/poems/create')}
            >
              Create Poem
            </Button>
          </div>
        ) : (
          <div className={view === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {currentPoems.map((poem) => {
              // These will be replaced by actual data when we hook up the API
              const hasImages = false; // Will check actual images when we connect to API
              const imageCount = 0; // Will use actual image count from API
              const commentCount = 0; // Will use actual comment count from API
              const isNew = Math.random() > 0.7; // Random for demo, will use actual data
              
              // For grid view
              if (view === "grid") {
                return (
                  <Card key={poem.id} className="overflow-hidden hover:shadow-md transition-all">
                    {hasImages && (
                      <div className="relative h-40 bg-gray-100">
                        <img 
                          src={`https://source.unsplash.com/random/500x300?nature,${poem.id}`} 
                          alt={poem.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <div className="flex items-center">
                            <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center mr-2 ${poem.userId === user?.id ? 'bg-secondary' : 'bg-primary'}`}>
                              <span className="text-xs font-medium">{getAuthorInitial(poem.userId)}</span>
                            </div>
                            <span className="text-white text-sm font-medium">{getAuthorName(poem.userId)}</span>
                            <span className="ml-auto text-white text-xs opacity-80">{formatDate(poem.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <CardContent className={hasImages ? "p-4" : "pt-4"}>
                      {!hasImages && (
                        <div className="flex items-center mb-3">
                          <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center mr-2 ${poem.userId === user?.id ? 'bg-secondary' : 'bg-primary'}`}>
                            <span className="text-xs font-medium">{getAuthorInitial(poem.userId)}</span>
                          </div>
                          <span className="text-sm font-medium">{getAuthorName(poem.userId)}</span>
                          <span className="ml-auto text-xs text-gray-500">{formatDate(poem.createdAt)}</span>
                        </div>
                      )}
                      <div className="relative">
                        <h3 className="font-display text-lg font-medium text-darktext">{poem.title}</h3>
                        {isNew && <span className="new-badge">New</span>}
                      </div>
                      <div className="mt-2 prose poem-text text-gray-600 text-sm line-clamp-3">
                        {truncateText(poem.content.replace(/<[^>]*>/g, ''), 120)}
                      </div>
                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <span className="flex items-center mr-4">
                          <i className="fas fa-comment text-gray-400 mr-1"></i> {commentCount} comments
                        </span>
                        <span className="flex items-center">
                          <i className="fas fa-image text-gray-400 mr-1"></i> {imageCount} images
                        </span>
                        <Link href={`/poems/${poem.id}`} className="ml-auto text-primary hover:text-blue-700">
                          Read more
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
              
              // For list view
              return (
                <Card key={poem.id} className="overflow-hidden hover:shadow-md transition-all">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="relative">
                        <h3 className="font-display text-lg font-medium text-darktext">{poem.title}</h3>
                        {isNew && <span className="new-badge">New</span>}
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-4">{formatDate(poem.createdAt)}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <i className="fas fa-ellipsis-v"></i>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Link href={`/poems/${poem.id}`} className="flex items-center w-full">
                                <i className="fas fa-eye mr-2"></i> View
                              </Link>
                            </DropdownMenuItem>
                            {poem.userId === user?.id && (
                              <DropdownMenuItem>
                                <Link href={`/poems/edit/${poem.id}`} className="flex items-center w-full">
                                  <i className="fas fa-edit mr-2"></i> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="mt-2 prose poem-text text-gray-600 text-sm">
                      {truncateText(poem.content.replace(/<[^>]*>/g, ''), 100)}
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <div className="flex items-center">
                        <div className={`h-6 w-6 rounded-full text-white flex items-center justify-center mr-2 ${poem.userId === user?.id ? 'bg-secondary' : 'bg-primary'}`}>
                          <span className="text-xs">{getAuthorInitial(poem.userId)}</span>
                        </div>
                        <span className="font-medium">{getAuthorName(poem.userId)}</span>
                      </div>
                      <div className="ml-auto flex items-center text-gray-500">
                        <span className="flex items-center mr-3">
                          <i className="fas fa-comment text-gray-400 mr-1"></i> {commentCount}
                        </span>
                        <span className="flex items-center mr-3">
                          <i className="fas fa-image text-gray-400 mr-1"></i> {imageCount}
                        </span>
                        <Link href={`/poems/${poem.id}`} className="text-primary hover:text-blue-700">
                          Read more
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{indexOfFirstPoem + 1}</span> to{" "}
              <span className="font-medium">
                {Math.min(indexOfLastPoem, filteredPoems.length)}
              </span>{" "}
              of <span className="font-medium">{filteredPoems.length}</span> poems
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
