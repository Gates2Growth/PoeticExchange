import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBase64 } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImagesChange: (images: { imageData: string; caption?: string }[]) => void;
  existingImages?: { imageData: string; caption?: string }[];
  generatedImage?: string;
}

export function ImageUpload({ onImagesChange, existingImages = [], generatedImage }: ImageUploadProps) {
  const [images, setImages] = useState<Array<{ imageData: string; caption?: string }>>(existingImages);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add any generated image passed from parent component
  useEffect(() => {
    if (generatedImage && !images.some(img => img.imageData === generatedImage)) {
      const newImages = [...images, { imageData: generatedImage, caption: "Generated image" }];
      setImages(newImages);
      onImagesChange(newImages);
    }
  }, [generatedImage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages = [...images];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        // Validate file type
        if (!file.type.startsWith('image/')) continue;
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) continue;
        
        const base64 = await getBase64(file);
        newImages.push({ imageData: base64 });
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }
    
    setImages(newImages);
    onImagesChange(newImages);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newImages = [...images];
    newImages[index].caption = caption;
    setImages(newImages);
    onImagesChange(newImages);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    onImagesChange(newImages);
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt for the image",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await apiRequest("POST", "/api/generate-image", { prompt: imagePrompt });
      const data = await response.json();
      
      if (data.imageData) {
        setDialogOpen(false);
        
        // Add the generated image
        const newImages = [...images, { imageData: data.imageData, caption: imagePrompt }];
        setImages(newImages);
        onImagesChange(newImages);
        
        toast({
          title: "Success",
          description: "Image generated successfully!"
        });
        
        // Reset prompt
        setImagePrompt("");
      } else {
        throw new Error("Failed to generate image");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive"
      });
      console.error("Image generation error:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Add Images</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
            >
              <Plus className="h-4 w-4 mr-1" /> Generate Image
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Image for Poem</DialogTitle>
              <DialogDescription>
                Enter a prompt to generate a free stock image related to your poem.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right text-sm">
                  Prompt
                </div>
                <Input
                  id="image-prompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., sunset over mountains, abstract nature scene"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={generateImage} 
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload dropzone */}
        <div 
          className="relative rounded-md border-2 border-dashed border-gray-300 p-4 text-center hover:border-gray-400 transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            multiple 
            accept="image/*"
            onChange={handleFileChange}
          />
          <div className="space-y-1 text-center">
            <i className="fas fa-image text-3xl text-gray-300"></i>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-primary hover:text-blue-600">
                Upload images
              </span>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        </div>

        {/* Preview of uploaded images */}
        {images.map((image, index) => (
          <div key={index} className="relative rounded-md overflow-hidden border border-gray-200">
            <div className="h-32 bg-gray-100">
              <img 
                src={image.imageData} 
                alt={`Uploaded preview ${index + 1}`} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-2 right-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
                onClick={() => handleRemoveImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="p-2 bg-white">
              <Input
                type="text"
                placeholder="Add caption..."
                className="w-full text-xs p-1 border border-gray-200 rounded"
                value={image.caption || ''}
                onChange={(e) => handleCaptionChange(index, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
