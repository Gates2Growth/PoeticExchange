import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Poem, poemFormSchema, InsertPoem, InsertImage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ImageUpload } from "@/components/image-upload";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, Loader2 } from "lucide-react";

const formSchema = poemFormSchema.extend({
  tags: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditPoem() {
  const { id } = useParams<{ id: string }>();
  const poemId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [images, setImages] = useState<{imageData: string; caption?: string}[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [initialized, setInitialized] = useState(false);

  // Fetch poem data
  const {
    data: poem,
    isLoading: isLoadingPoem,
    error: poemError,
  } = useQuery<Poem>({
    queryKey: [`/api/poems/${poemId}`],
  });

  // Fetch poem images
  const {
    data: poemImages,
    isLoading: isLoadingImages,
  } = useQuery<{imageData: string; caption?: string; id?: number}[]>({
    queryKey: [`/api/poems/${poemId}/images`],
    enabled: !!poemId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      userId: user?.id,
      tags: [],
      visibility: "shared",
    },
  });

  // Initialize form with poem data once loaded
  useEffect(() => {
    if (poem && !initialized) {
      form.reset({
        title: poem.title,
        content: poem.content,
        userId: poem.userId,
        tags: poem.tags || [],
        visibility: poem.visibility || "shared",
      });
      setInitialized(true);
    }
  }, [poem, form, initialized]);

  // Initialize images once loaded
  useEffect(() => {
    if (poemImages && poemImages.length > 0) {
      setImages(poemImages);
    }
  }, [poemImages]);

  const updatePoemMutation = useMutation({
    mutationFn: async (data: InsertPoem) => {
      const response = await apiRequest("PUT", `/api/poems/${poemId}`, data);
      return response.json();
    },
    onSuccess: async (updatedPoem) => {
      // Handle existing images - we'll skip this part for simplicity
      // For new images, upload them
      if (images.length > 0) {
        const existingImages = poemImages || [];
        const newImages = images.filter(img => 
          !existingImages.some(existing => existing.imageData === img.imageData)
        );
        
        for (const image of newImages) {
          await apiRequest("POST", `/api/poems/${poemId}/images`, image);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/poems/${poemId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/poems/${poemId}/images`] });
      
      toast({
        title: "Poem updated",
        description: "Your poem has been successfully updated",
      });
      navigate(`/poems/${poemId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update poem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updatePoemMutation.mutate(data);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = form.getValues("tags") || [];
      // Don't add duplicate tags
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue("tags", [...currentTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter(tag => tag !== tagToRemove)
    );
  };

  if (isLoadingPoem || isLoadingImages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  // Check if the user is the owner of the poem
  if (user?.id !== poem.userId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h1 className="text-xl font-semibold text-yellow-800">Unauthorized</h1>
          <p className="text-yellow-600 mt-2">You do not have permission to edit this poem.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(`/poems/${poemId}`)}
          >
            Back to Poem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mr-3 text-primary hover:text-blue-700"
              onClick={() => navigate(`/poems/${poemId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className="text-2xl font-display font-semibold text-darktext">Edit Poem</h1>
          </div>
          <div>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={updatePoemMutation.isPending}
            >
              {updatePoemMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter poem title..." 
                          className="text-lg"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <RichTextEditor 
                          value={field.value} 
                          onChange={field.onChange}
                          placeholder="Write your poem here..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Images</FormLabel>
                  <ImageUpload 
                    onImagesChange={setImages}
                    existingImages={images}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <div className="flex flex-wrap items-center gap-2 border rounded-md p-2">
                        {field.value?.map(tag => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Add a tag..."
                          className="flex-grow text-sm p-1 min-w-[100px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="shared">Shared with friend</SelectItem>
                          <SelectItem value="private">Private (only me)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}