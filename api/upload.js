import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "50") * 1024 * 1024; // 50MB default
const ALLOWED_MIMETYPES = process.env.ALLOWED_MIMETYPES?.split(",") || [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "application/octet-stream",
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUCKET_NAME = "cdr-tracks";

function sanitizeFileName(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255);
}

function validateFile(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    );
  }

  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`);
  }

  return true;
}

async function cleanupTempFile(filepath) {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.warn(`Failed to cleanup temp file: ${filepath}`, error);
  }
}

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempFile = null;

  try {
    const form = formidable({
      multiples: false,
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Handle file array possibility
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile || uploadedFile.size === 0) {
      return res.status(400).json({ error: "No file uploaded or file is empty" });
    }

    tempFile = uploadedFile.filepath;

    // Validate file
    try {
      validateFile(uploadedFile);
    } catch (validationError) {
      await cleanupTempFile(tempFile);
      return res.status(400).json({ error: validationError.message });
    }

    // Sanitize filename
    const originalName = fields.name?.[0] || uploadedFile.originalFilename || "file";
    const sanitizedName = sanitizeFileName(originalName);
    const fileName = `${uuidv4()}-${sanitizedName}`;

    // Read file as buffer
    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    // Upload to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: uploadedFile.mimetype || "application/octet-stream",
        upsert: false,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({
        error: "Failed to upload file to storage",
        details: uploadError.message,
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Clean up temp file
    await cleanupTempFile(tempFile);

    // Generate Minecraft commands
    const escapedName = originalName.replace(/"/g, '\\"');
    const commands = [
      `/cd download "${publicUrl}" "${escapedName}"`,
      `/cd create local "${escapedName}" "${escapedName}"`,
    ];

    return res.status(200).json({
      success: true,
      url: publicUrl,
      fileName: sanitizedName,
      commands,
      metadata: {
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        originalName: originalName,
      },
    });
  } catch (error) {
    console.error("Upload handler error:", error);

    // Clean up temp file if it exists
    if (tempFile) {
      await cleanupTempFile(tempFile);
    }

    // Handle specific errors
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
