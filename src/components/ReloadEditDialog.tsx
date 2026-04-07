import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, ImagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, uploadToStorage } from "@/lib/image-utils";

export const ReloadEditDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  
  const [loadingImagePreview, setLoadingImagePreview] = useState<string | null>(null);
  const [loadingImageFile, setLoadingImageFile] = useState<File | null>(null);
  
  const [pageTitle, setPageTitle] = useState("");
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  
  const [dialogFacebookIconPreview, setDialogFacebookIconPreview] = useState<string | null>(null);
  const [dialogFacebookIconFile, setDialogFacebookIconFile] = useState<File | null>(null);
  
  const [dialogTiktokIconPreview, setDialogTiktokIconPreview] = useState<string | null>(null);
  const [dialogTiktokIconFile, setDialogTiktokIconFile] = useState<File | null>(null);
  
  const [dialogTelegramIconPreview, setDialogTelegramIconPreview] = useState<string | null>(null);
  const [dialogTelegramIconFile, setDialogTelegramIconFile] = useState<File | null>(null);
  
  const [footerFacebookIconPreview, setFooterFacebookIconPreview] = useState<string | null>(null);
  const [footerFacebookIconFile, setFooterFacebookIconFile] = useState<File | null>(null);
  
  const [footerTiktokIconPreview, setFooterTiktokIconPreview] = useState<string | null>(null);
  const [footerTiktokIconFile, setFooterTiktokIconFile] = useState<File | null>(null);
  
  const [footerTelegramIconPreview, setFooterTelegramIconPreview] = useState<string | null>(null);
  const [footerTelegramIconFile, setFooterTelegramIconFile] = useState<File | null>(null);
  
  const [footerPaymentIconPreview, setFooterPaymentIconPreview] = useState<string | null>(null);
  const [footerPaymentIconFile, setFooterPaymentIconFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("id, loading_image_url, page_title, favicon_url, dialog_facebook_icon_url, dialog_tiktok_icon_url, dialog_telegram_icon_url, footer_facebook_icon_url, footer_tiktok_icon_url, footer_telegram_icon_url, footer_payment_icon_url")
      .maybeSingle();

    if (data) {
      setSettingsId(data.id);
      setLoadingImagePreview(data.loading_image_url);
      setPageTitle(data.page_title || "");
      setFaviconPreview(data.favicon_url);
      setDialogFacebookIconPreview((data as any).dialog_facebook_icon_url);
      setDialogTiktokIconPreview((data as any).dialog_tiktok_icon_url);
      setDialogTelegramIconPreview((data as any).dialog_telegram_icon_url);
      setFooterFacebookIconPreview(data.footer_facebook_icon_url);
      setFooterTiktokIconPreview(data.footer_tiktok_icon_url);
      setFooterTelegramIconPreview(data.footer_telegram_icon_url);
      setFooterPaymentIconPreview(data.footer_payment_icon_url);
    }
    setLoading(false);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | null) => void,
    fileSetter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      fileSetter(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setter(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const processImage = async (file: File | null, existingUrl: string | null, name: string) => {
        if (!file) return existingUrl;
        const compressed = await compressImage(file);
        const fileName = `${name}-${Date.now()}.jpg`;
        return await uploadToStorage(supabase, "product-images", `site-assets/${fileName}`, compressed);
      };

      const loadingImageUrl = await processImage(loadingImageFile, loadingImagePreview, "loading");
      const faviconUrl = await processImage(faviconFile, faviconPreview, "favicon");
      const dialogFacebookIconUrl = await processImage(dialogFacebookIconFile, dialogFacebookIconPreview, "dialog-fb");
      const dialogTiktokIconUrl = await processImage(dialogTiktokIconFile, dialogTiktokIconPreview, "dialog-tiktok");
      const dialogTelegramIconUrl = await processImage(dialogTelegramIconFile, dialogTelegramIconPreview, "dialog-telegram");
      const footerFacebookIconUrl = await processImage(footerFacebookIconFile, footerFacebookIconPreview, "footer-fb");
      const footerTiktokIconUrl = await processImage(footerTiktokIconFile, footerTiktokIconPreview, "footer-tiktok");
      const footerTelegramIconUrl = await processImage(footerTelegramIconFile, footerTelegramIconPreview, "footer-telegram");
      const footerPaymentIconUrl = await processImage(footerPaymentIconFile, footerPaymentIconPreview, "footer-payment");

      const updateData = {
        loading_image_url: loadingImageUrl,
        page_title: pageTitle || null,
        favicon_url: faviconUrl,
        dialog_facebook_icon_url: dialogFacebookIconUrl,
        dialog_tiktok_icon_url: dialogTiktokIconUrl,
        dialog_telegram_icon_url: dialogTelegramIconUrl,
        footer_facebook_icon_url: footerFacebookIconUrl,
        footer_tiktok_icon_url: footerTiktokIconUrl,
        footer_telegram_icon_url: footerTelegramIconUrl,
        footer_payment_icon_url: footerPaymentIconUrl,
      };

      if (settingsId) {
        const { error } = await supabase
          .from("site_settings")
          .update(updateData)
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert(updateData);

        if (error) throw error;
      }

      toast.success("Settings saved!");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const ImageUploadBox = ({ 
    label, 
    preview, 
    setPreview,
    setFile
  }: { 
    label: string; 
    preview: string | null; 
    setPreview: (value: string | null) => void;
    setFile: (file: File | null) => void;
  }) => (
    <div className="space-y-1">
      <Label className="text-foreground text-xs">{label}</Label>
      {preview ? (
        <div className="relative w-16 h-16 mx-auto rounded-lg overflow-hidden border-2 border-gold/30">
          <img 
            src={preview} 
            alt={label} 
            className="w-full h-full object-contain bg-background" 
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview(null)}
            className="absolute top-0 right-0 bg-background/80 text-foreground h-5 w-5 p-0 rounded-full text-xs"
          >
            ×
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-16 h-16 mx-auto border-2 border-dashed border-gold/30 rounded-lg cursor-pointer hover:border-gold/60 transition-colors bg-input/50">
          <ImagePlus className="w-5 h-5 text-gold/50" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, setPreview, setFile)}
            className="hidden"
          />
        </label>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 text-white hover:bg-purple-700 font-display gap-2">
          <RefreshCw className="w-4 h-4" />
          Reload Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-gold/30 max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="gold-text text-xl font-display">
            Icon & Image Manager
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Browser Tab Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gold border-b border-gold/30 pb-1">Browser Tab</h3>
                <p className="text-xs text-muted-foreground">
                  Page title and favicon shown in browser tab
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-foreground text-xs">Page Title</Label>
                    <Input
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                      placeholder="Enter page title..."
                      className="bg-input border-gold/30 text-foreground"
                    />
                  </div>
                  <ImageUploadBox 
                    label="Favicon (Tab Icon)" 
                    preview={faviconPreview} 
                    setPreview={setFaviconPreview} 
                    setFile={setFaviconFile}
                  />
                </div>
              </div>

              {/* Loading Image Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gold border-b border-gold/30 pb-1">Loading Screen</h3>
                <p className="text-xs text-muted-foreground">
                  Image/GIF displayed when page is loading
                </p>
                <ImageUploadBox 
                  label="Loading Image" 
                  preview={loadingImagePreview} 
                  setPreview={setLoadingImagePreview} 
                  setFile={setLoadingImageFile}
                />
              </div>

              {/* Product Popup Icons Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gold border-b border-gold/30 pb-1">Product Popup Icons</h3>
                <p className="text-xs text-muted-foreground">
                  Custom icons for social media buttons in product detail popup
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <ImageUploadBox 
                    label="Facebook" 
                    preview={dialogFacebookIconPreview} 
                    setPreview={setDialogFacebookIconPreview} 
                    setFile={setDialogFacebookIconFile}
                  />
                  <ImageUploadBox 
                    label="TikTok" 
                    preview={dialogTiktokIconPreview} 
                    setPreview={setDialogTiktokIconPreview} 
                    setFile={setDialogTiktokIconFile}
                  />
                  <ImageUploadBox 
                    label="Telegram" 
                    preview={dialogTelegramIconPreview} 
                    setPreview={setDialogTelegramIconPreview} 
                    setFile={setDialogTelegramIconFile}
                  />
                </div>
              </div>

              {/* Footer Icons Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gold border-b border-gold/30 pb-1">Footer Icons</h3>
                <p className="text-xs text-muted-foreground">
                  Custom icons for social media and payment in footer
                </p>
                <div className="grid grid-cols-4 gap-3">
                  <ImageUploadBox 
                    label="Facebook" 
                    preview={footerFacebookIconPreview} 
                    setPreview={setFooterFacebookIconPreview} 
                    setFile={setFooterFacebookIconFile}
                  />
                  <ImageUploadBox 
                    label="TikTok" 
                    preview={footerTiktokIconPreview} 
                    setPreview={setFooterTiktokIconPreview} 
                    setFile={setFooterTiktokIconFile}
                  />
                  <ImageUploadBox 
                    label="Telegram" 
                    preview={footerTelegramIconPreview} 
                    setPreview={setFooterTelegramIconPreview} 
                    setFile={setFooterTelegramIconFile}
                  />
                  <ImageUploadBox 
                    label="Payment" 
                    preview={footerPaymentIconPreview} 
                    setPreview={setFooterPaymentIconPreview} 
                    setFile={setFooterPaymentIconFile}
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-gold text-primary-foreground hover:bg-gold-dark"
              >
                Save All
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
