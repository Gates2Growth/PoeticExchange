import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  className,
  placeholder = "Write your poem here...",
}: RichTextEditorProps) {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = (format: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const currentValue = textarea.value;
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;
    
    let newValue = currentValue;
    let newCursorPos = selEnd;
    
    switch (format) {
      case "bold":
        newValue = currentValue.substring(0, selStart) + "**" + 
                  currentValue.substring(selStart, selEnd) + "**" + 
                  currentValue.substring(selEnd);
        newCursorPos = selEnd + 4;
        break;
      case "italic":
        newValue = currentValue.substring(0, selStart) + "_" + 
                  currentValue.substring(selStart, selEnd) + "_" + 
                  currentValue.substring(selEnd);
        newCursorPos = selEnd + 2;
        break;
      case "alignCenter":
        // Add <center> tags for center alignment
        newValue = currentValue.substring(0, selStart) + 
                  "\n<center>\n" + currentValue.substring(selStart, selEnd) + "\n</center>\n" + 
                  currentValue.substring(selEnd);
        newCursorPos = selEnd + 19;
        break;
      case "stanzaBreak":
        newValue = currentValue.substring(0, selEnd) + "\n\n" + currentValue.substring(selEnd);
        newCursorPos = selEnd + 2;
        break;
      case "hr":
        newValue = currentValue.substring(0, selEnd) + "\n---\n" + currentValue.substring(selEnd);
        newCursorPos = selEnd + 5;
        break;
    }
    
    onChange(newValue);
    
    // Set cursor position after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleFontChange = (font: string) => {
    if (!textareaRef.current || !selection) return;
    
    const textarea = textareaRef.current;
    const currentValue = textarea.value;
    const { start, end } = selection;
    
    let fontTag = "";
    switch (font) {
      case "serif":
        fontTag = "serif";
        break;
      case "sans":
        fontTag = "sans";
        break;
      case "mono":
        fontTag = "mono";
        break;
      default:
        return;
    }
    
    const newValue = currentValue.substring(0, start) + 
                    `<span class="font-${fontTag}">` + 
                    currentValue.substring(start, end) + 
                    "</span>" + 
                    currentValue.substring(end);
    
    onChange(newValue);
  };

  const handleFontSizeChange = (size: string) => {
    if (!textareaRef.current || !selection) return;
    
    const textarea = textareaRef.current;
    const currentValue = textarea.value;
    const { start, end } = selection;
    
    let sizeClass = "";
    switch (size) {
      case "small":
        sizeClass = "text-sm";
        break;
      case "large":
        sizeClass = "text-lg";
        break;
      case "xl":
        sizeClass = "text-xl";
        break;
      default:
        return;
    }
    
    const newValue = currentValue.substring(0, start) + 
                    `<span class="${sizeClass}">` + 
                    currentValue.substring(start, end) + 
                    "</span>" + 
                    currentValue.substring(end);
    
    onChange(newValue);
  };

  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    setSelection({
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    });
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
      
      // Return the image data to the parent component
      if (data.imageData) {
        setDialogOpen(false);
        toast({
          title: "Success",
          description: "Image generated successfully! You can add it to your poem from the image upload section."
        });
        return data.imageData;
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
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.addEventListener('select', handleSelectionChange);
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', handleSelectionChange);
    
    return () => {
      textarea.removeEventListener('select', handleSelectionChange);
      textarea.removeEventListener('click', handleSelectionChange);
      textarea.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  return (
    <div className={cn("border border-gray-300 rounded-md overflow-hidden", className)}>
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-300 flex items-center flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("bold")}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <i className="fas fa-bold"></i>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("italic")}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <i className="fas fa-italic"></i>
        </Button>
        <div className="h-6 border-r border-gray-300"></div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("alignCenter")}
          className="h-8 w-8 p-0"
          title="Center"
        >
          <i className="fas fa-align-center"></i>
        </Button>
        <div className="h-6 border-r border-gray-300"></div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("stanzaBreak")}
          className="h-8 w-8 p-0"
          title="Add Stanza Break"
        >
          <i className="fas fa-paragraph"></i>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleFormat("hr")}
          className="h-8 w-8 p-0"
          title="Add Horizontal Rule"
        >
          <i className="fas fa-minus"></i>
        </Button>
        <div className="h-6 border-r border-gray-300"></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs"
              title="Generate Image"
            >
              <Image className="h-4 w-4 mr-1" /> Generate Image
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Image for Poem</DialogTitle>
              <DialogDescription>
                Enter a prompt to generate a free stock image related to your poem. 
                The image will be available in the image upload section.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prompt" className="text-right">
                  Prompt
                </Label>
                <Input
                  id="prompt"
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
        <div className="h-6 border-r border-gray-300"></div>
        <Select onValueChange={handleFontChange}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Font Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="sans">Sans-serif</SelectItem>
            <SelectItem value="mono">Monospace</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={handleFontSizeChange}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Font Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 h-64 poem-text text-darktext focus:outline-none rounded-none border-0 resize-y min-h-[200px]"
        placeholder={placeholder}
      />
    </div>
  );
}
