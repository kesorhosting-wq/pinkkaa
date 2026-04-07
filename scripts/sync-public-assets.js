import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SYNC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SYNC_SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const shouldUpdateDb = process.env.SYNC_ASSETS_UPDATE_DB === "true";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing environment variables. Set SYNC_SUPABASE_URL and SYNC_SUPABASE_KEY or VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY.");
  process.exit(1);
}

const publicDir = path.resolve(process.cwd(), "public");
const assetsDir = path.join(publicDir, "assets");

const sanitizeFilename = (value) => {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
};

const getExtensionFromMime = (mimeType) => {
  const parts = mimeType.split("/");
  const ext = parts[1] ? parts[1].split("+")[0] : "bin";
  return ext.toLowerCase();
};

const getFilename = (prefix, source, type) => {
  const base = sanitizeFilename(source).replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, "");
  return `${prefix}-${base}-${Date.now()}.${type}`;
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const saveRemoteAsset = async (url, filename) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const ext = getExtensionFromMime(contentType);
  const filePath = path.join(assetsDir, `${filename}.${ext}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(filePath, buffer);
  return `/assets/${path.basename(filePath)}`;
};

const saveBase64Asset = async (base64, filename) => {
  const [, encoded] = base64.split(";base64,");
  const contentType = base64.split(";base64,")[0].replace("data:", "") || "application/octet-stream";
  const ext = getExtensionFromMime(contentType);
  const filePath = path.join(assetsDir, `${filename}.${ext}`);
  const buffer = Buffer.from(encoded, "base64");

  await fs.writeFile(filePath, buffer);
  return `/assets/${path.basename(filePath)}`;
};

const isLocalAsset = (value) => {
  return typeof value === "string" && (value.startsWith("/assets/") || value.startsWith("assets/") || value.startsWith("./assets/"));
};

const migrateField = async (id, fieldKey, value) => {
  if (!value || isLocalAsset(value)) return null;

  const prefix = `${fieldKey}-${id}`;
  let assetPath;

  if (value.startsWith("data:")) {
    assetPath = await saveBase64Asset(value, prefix);
  } else if (value.startsWith("http")) {
    assetPath = await saveRemoteAsset(value, prefix);
  } else {
    return null;
  }

  return assetPath;
};

const syncProducts = async (supabase) => {
  const { data: products, error } = await supabase.from("products").select("id, image_url");
  if (error) throw error;

  const updates = [];
  for (const product of products || []) {
    const assetPath = await migrateField(product.id, "product-image", product.image_url);
    if (assetPath) {
      updates.push({ id: product.id, image_url: assetPath });
      console.log(`Saved product ${product.id} => ${assetPath}`);
    }
  }

  if (shouldUpdateDb && updates.length > 0) {
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: update.image_url })
        .eq("id", update.id);
      if (updateError) {
        console.error(`Failed to update product ${update.id}:`, updateError.message);
      }
    }
  }
};

const syncSettings = async (supabase) => {
  const fieldKeys = [
    "logo_url",
    "header_bg_url",
    "body_bg_image_url",
    "loading_image_url",
    "dialog_bg_image_url",
    "footer_facebook_icon_url",
    "footer_tiktok_icon_url",
    "footer_telegram_icon_url",
    "footer_payment_icon_url",
    "dialog_facebook_icon_url",
    "dialog_tiktok_icon_url",
    "dialog_telegram_icon_url"
  ];

  const { data: settings, error } = await supabase
    .from("site_settings")
    .select(["id", ...fieldKeys])
    .maybeSingle();

  if (error) throw error;
  if (!settings || !settings.id) return;

  const updatedValues = {};
  for (const key of fieldKeys) {
    const value = settings[key];
    const assetPath = await migrateField(settings.id, key, value);
    if (assetPath) {
      updatedValues[key] = assetPath;
      console.log(`Saved site setting ${key} => ${assetPath}`);
    }
  }

  if (shouldUpdateDb && Object.keys(updatedValues).length > 0) {
    const { error: updateError } = await supabase
      .from("site_settings")
      .update(updatedValues)
      .eq("id", settings.id);
    if (updateError) throw updateError;
  }
};

const main = async () => {
  await ensureDir(assetsDir);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log("Starting image sync to public/assets...");
  await syncProducts(supabase);
  await syncSettings(supabase);
  console.log("Image sync complete.");
  console.log("Set SYNC_ASSETS_UPDATE_DB=true to update DB values to local /assets paths.");
};

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
