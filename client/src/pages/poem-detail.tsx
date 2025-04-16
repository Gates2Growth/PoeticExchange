import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Poem, Comment, Image as PoemImage, commentFormSchema, InsertComment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getUserInitial } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Share, 
  Tag, 
  MessageSquare, 
  Heart, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";

type FormData = {
  content: string;
};

export default function PoemDetail() {
  const { id } = useParams<{ id: string }>();
  const poemId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Fetch poem details
  const {
    data: poem,
    isLoading: isLoadingPoem,
    error: poemError,
  } = useQuery<Poem>({
    queryKey: [`/api/poems/${poemId}`],
  });

  // Fetch poem images
  const {
    data: images,
    isLoading: isLoadingImages,
  } = useQuery<PoemImage[]>({
    queryKey: [`/api/poems/${poemId}/images`],
    enabled: !!poemId,
  });

  // Fetch comments
  const {
    data: comments,
    isLoading: isLoadingComments,
  } = useQuery<Comment[]>({
    queryKey: [`/api/poems/${poemId}/comments`],
    enabled: !!poemId,
  });

  // Fetch all users (in a real app, this would be an API call)
  const {
    data: users,
    isLoading: isLoadingUsers,
  } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      // Mock response for the second user
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

  const form = useForm<FormData>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: "",
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: InsertComment) => {
      const response = await apiRequest("POST", `/api/poems/${poemId}/comments`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/poems/${poemId}/comments`] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    commentMutation.mutate({
      poemId,
      userId: user!.id,
      content: data.content,
    });
  };

  const handlePreviousImage = () => {
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  const handleNextImage = () => {
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }
  };

  if (isLoadingPoem || isLoadingComments || isLoadingImages || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (poemError || !poem) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 p-4 rounded-lg">
          <h1 className="text-xl font-semibold text-red-800">Error Loading Poem</h1>
          <p className="text-red-600 mt-2">{poemError?.message || "Poem not found"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/poems")}
          >
            Back to Poems
          </Button>
        </div>
      </div>
    );
  }

  const getUser = (userId: number) => {
    return users?.find(u => u.id === userId);
  };

  const getUserDisplayName = (userId: number) => {
    const user = getUser(userId);
    return user?.displayName || "Unknown";
  };

  const getUserInitialLetter = (userId: number) => {
    const user = getUser(userId);
    return user ? getUserInitial(user.displayName) : "?";
  };

  // Group comments by parent
  const parentComments = comments?.filter(c => !c.parentId) || [];
  const childComments = comments?.filter(c => c.parentId) || [];
  
  const getChildComments = (parentId: number) => {
    return childComments.filter(c => c.parentId === parentId);
  };

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="mr-3 text-primary hover:text-blue-700"
              onClick={() => navigate("/poems")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-display font-semibold text-darktext">{poem.title}</h1>
            <div className="ml-auto flex items-center space-x-3">
              {poem.userId === user?.id && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(`/edit-poem/${poem.id}`)}
                  title="Edit poem"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  try {
                    const response = await apiRequest(
                      "POST", 
                      "/api/export-poems-pdf", 
                      { poemIds: [poem.id] }
                    );
                    const data = await response.json();
                    
                    if (data.pdfData) {
                      // Create a download link for the PDF
                      const pdfData = data.pdfData.replace(/^data:application\/pdf;base64,/, '');
                      const byteCharacters = atob(pdfData);
                      const byteArrays = [];
                      
                      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                        const slice = byteCharacters.slice(offset, offset + 512);
                        const byteNumbers = new Array(slice.length);
                        for (let i = 0; i < slice.length; i++) {
                          byteNumbers[i] = slice.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        byteArrays.push(byteArray);
                      }
                      
                      const blob = new Blob(byteArrays, {type: 'application/pdf'});
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `poem-${poem.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Success",
                        description: "Poem downloaded as PDF successfully!",
                      });
                    } else {
                      throw new Error("Failed to generate PDF");
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to download poem as PDF. Please try again.",
                      variant: "destructive",
                    });
                    console.error("PDF download error:", error);
                  }
                }}
                title="Download as PDF"
              >
                <i className="fas fa-download h-4 w-4"></i>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" title="Share poem">
                    <Share className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share This Poem</DialogTitle>
                    <DialogDescription>
                      Copy the link below to share this poem with others.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center space-x-2 mt-4">
                    <Input 
                      readOnly 
                      value={window.location.href} 
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast({
                          title: "Link Copied",
                          description: "Poem link copied to clipboard!",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <div className="flex items-center">
              <div className={`h-6 w-6 rounded-full text-white flex items-center justify-center mr-2 ${poem.userId === user?.id ? 'bg-secondary' : 'bg-primary'}`}>
                <span className="text-xs font-medium">{getUserInitialLetter(poem.userId)}</span>
              </div>
              <span className="font-medium text-gray-700">{getUserDisplayName(poem.userId)}</span>
            </div>
            <span className="mx-2">•</span>
            <span>{formatDate(poem.createdAt)}</span>
            {poem.tags && poem.tags.length > 0 && (
              <>
                <span className="mx-2">•</span>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 text-gray-400 mr-1" />
                  <span>{poem.tags.join(", ")}</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          {/* Image Gallery */}
          {images && images.length > 0 && (
            <div className="relative h-80 bg-gray-100">
              <img 
                src={images[currentImageIndex].imageData} 
                alt={images[currentImageIndex].caption || "Poem image"} 
                className="w-full h-full object-cover" 
              />
              
              {images.length > 1 && (
                <>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className="flex items-center space-x-2 bg-black bg-opacity-60 px-3 py-1 rounded-full">
                      {images.map((_, index) => (
                        <button 
                          key={index}
                          className={`w-2 h-2 rounded-full bg-white ${index === currentImageIndex ? 'opacity-100' : 'opacity-50'}`}
                          onClick={() => setCurrentImageIndex(index)}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline" 
                    size="icon"
                    className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full h-8 w-8 p-0"
                    onClick={handlePreviousImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-black bg-opacity-30 hover:bg-opacity-50 text-white rounded-full h-8 w-8 p-0"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {images[currentImageIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
                  {images[currentImageIndex].caption}
                </div>
              )}
            </div>
          )}
          
          {/* Poem Content */}
          <div className="px-6 py-8">
            <div className="prose max-w-none poem-text text-darktext leading-relaxed whitespace-pre-wrap">
              {poem.content}
            </div>
          </div>
        </div>
        
        {/* Comments Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-darktext mb-4">Comments</h2>
            
            {/* Add Comment */}
            <div className="flex items-start mb-6">
              <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center mr-3 flex-shrink-0 ${user?.id === poem.userId ? 'bg-secondary' : 'bg-primary'}`}>
                <span className="text-xs font-medium">{getUserInitialLetter(user!.id)}</span>
              </div>
              <div className="flex-1">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder="Share your thoughts..." 
                              className="w-full min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={commentMutation.isPending}
                      >
                        {commentMutation.isPending ? "Posting..." : "Post Comment"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
            
            {/* Comments List */}
            {parentComments.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No comments yet. Be the first to share your thoughts!
              </div>
            ) : (
              <div className="space-y-4">
                {parentComments.map((comment) => (
                  <div key={comment.id} className="flex items-start">
                    <div className={`h-8 w-8 rounded-full text-white flex items-center justify-center mr-3 flex-shrink-0 ${comment.userId === poem.userId ? 'bg-secondary' : 'bg-primary'}`}>
                      <span className="text-xs font-medium">{getUserInitialLetter(comment.userId)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-darktext text-sm">{getUserDisplayName(comment.userId)}</span>
                          <span className="ml-auto text-gray-500 text-xs">{formatDate(comment.createdAt, "MMMM d, yyyy • h:mm a")}</span>
                        </div>
                        <div className="text-gray-600 text-sm">
                          {comment.content}
                        </div>
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <MessageSquare className="h-3 w-3 mr-1" /> Reply
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs ml-2">
                            <Heart className="h-3 w-3 mr-1" /> Like
                          </Button>
                        </div>
                      </div>
                      
                      {/* Replies */}
                      {getChildComments(comment.id).length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200">
                          {getChildComments(comment.id).map(reply => (
                            <div key={reply.id} className="flex items-start mt-2">
                              <div className={`h-6 w-6 rounded-full text-white flex items-center justify-center mr-2 flex-shrink-0 ${reply.userId === poem.userId ? 'bg-secondary' : 'bg-primary'}`}>
                                <span className="text-xs font-medium">{getUserInitialLetter(reply.userId)}</span>
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-2">
                                  <div className="flex items-center mb-1">
                                    <span className="font-medium text-darktext text-sm">{getUserDisplayName(reply.userId)}</span>
                                    <span className="ml-auto text-gray-500 text-xs">{formatDate(reply.createdAt, "MMMM d, yyyy • h:mm a")}</span>
                                  </div>
                                  <div className="text-gray-600 text-sm">
                                    {reply.content}
                                  </div>
                                  <div className="mt-1 flex items-center text-xs text-gray-500">
                                    <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                                      <Heart className="h-3 w-3 mr-1" /> Like
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

