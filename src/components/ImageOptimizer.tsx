import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { base64ToBlob, uploadToStorage } from "@/lib/image-utils";
import { toast } from "sonner";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";

export const ImageOptimizer = () => {
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const runOptimization = async () => {
    setOptimizing(true);
    try {
      // 1. Fetch all products with base64 images
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url");

      const base64Products = products?.filter(p => p.image_url?.startsWith('data:image')) || [];
      
      // 2. Fetch site settings
      const { data: settings } = await supabase.from("site_settings").select("*").maybeSingle();
      const base64Settings: {key: string, val: string}[] = [];
      
      if (settings) {
        Object.entries(settings).forEach(([key, val]) => {
          if (typeof val === 'string' && val.startsWith('data:image')) {
            base64Settings.push({ key, val });
          }
        });
      }

      const total = base64Products.length + base64Settings.length;
      if (total === 0) {
        toast.info("All images are already optimized!");
        return;
      }

      setProgress({ current: 0, total });
      let currentCount = 0;

      // 3. Optimize Products
      for (const product of base64Products) {
        try {
          const blob = base64ToBlob(product.image_url);
          const fileName = `prod-${product.id}-${Date.now()}.jpg`;
          const publicUrl = await uploadToStorage(supabase, "product-images", `products/${fileName}`, blob);
          
          await supabase.from("products").update({ image_url: publicUrl }).eq("id", product.id);
          
          currentCount++;
          setProgress({ current: currentCount, total });
        } catch (e) {
          console.error(`Failed to optimize product ${product.id}`, e);
        }
      }

      // 4. Optimize Site Settings
      if (settings) {
        const updateObj: any = {};
        for (const setting of base64Settings) {
          try {
            const blob = base64ToBlob(setting.val);
            const fileName = `site-${setting.key}-${Date.now()}.jpg`;
            const publicUrl = await uploadToStorage(supabase, "product-images", `site-assets/${fileName}`, blob);
            
            updateObj[setting.key] = publicUrl;
            
            currentCount++;
            setProgress({ current: currentCount, total });
          } catch (e) {
            console.error(`Failed to optimize setting ${setting.key}`, e);
          }
        }
        
        if (Object.keys(updateObj).length > 0) {
          await supabase.from("site_settings").update(updateObj).eq("id", settings.id);
        }
      }

      toast.success(`Successfully optimized ${currentCount} images! Website will load much faster now.`);
    } catch (error: any) {
      toast.error("Optimization failed: " + error.message);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="p-4 bg-gold/10 border border-gold/30 rounded-lg flex flex-col items-center gap-3">
      <div className="text-center">
        <h3 className="text-gold font-display font-bold flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 fill-gold" />
          SPEED OPTIMIZER
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Click to convert old slow images into high-speed storage files.
        </p>
      </div>

      {optimizing ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
          <span className="text-sm font-medium">
            Optimizing {progress.current} of {progress.total}...
          </span>
        </div>
      ) : (
        <Button 
          onClick={runOptimization}
          className="bg-gold hover:bg-gold-dark text-primary-foreground font-bold w-full"
        >
          Fix All Images Now
        </Button>
      )}
    </div>
  );
};
