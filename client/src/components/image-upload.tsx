import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBase64 } from "@/lib/utils";
import { X } from "lucide-react";

interface ImageUploadProps {
  onImagesChange: (images: { imageData: string; caption?: string }[]) => void;
  existingImages?: { imageData: string; caption?: string }[];
}

export function ImageUpload({ onImagesChange, existingImages = [] }: ImageUploadProps) {
  const [images, setImages] = useState<Array<{ imageData: string; caption?: string }>>(existingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="space-y-4">
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
