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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "50") * 1024 * 1024;
const FILE_LIFETIME_HOURS = 10;
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET_NAME = "cdr-tracks";

// 🧹 Функция автоочистки старых файлов
async function autoCleanup() {
  try {
    const tenHoursAgo = new Date(Date.now() - FILE_LIFETIME_HOURS * 60 * 60 * 1000).toISOString();

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    if (listError) {
      console.error("Cleanup list error:", listError);
      return;
    }

    if (!files || files.length === 0) {
      return;
    }

    const oldFiles = files.filter(file => {
      const createdAt = new Date(file.created_at);
      return createdAt < new Date(tenHoursAgo);
    });

    if (oldFiles.length > 0) {
      const fileNames = oldFiles.map(f => f.name);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(fileNames);

      if (deleteError) {
        console.error("Cleanup delete error:", deleteError);
      } else {
        console.log(`🧹 Auto-cleanup: deleted ${fileNames.length} files older than ${FILE_LIFETIME_HOURS}h`);
        console.log(`   Deleted: ${fileNames.join(', ')}`);
      }
    }
  } catch (error) {
    console.error("Auto-cleanup error:", error);
  }
}

function sanitizeFileName(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 255);
}

function getFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : '.mp3';
}

function validateFile(file, originalName) {
  if (!file) throw new Error("No file provided");
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  const ext = path.extname(originalName || '').toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension ${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
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
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🧹 Запускаем очистку в фоне (не ждем)
  autoCleanup().catch(err => console.error("Cleanup failed:", err));

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

    // Получаем файл (может быть массивом)
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!uploadedFile || uploadedFile.size === 0) {
      return res.status(400).json({ error: "No file uploaded or file is empty" });
    }

    tempFile = uploadedFile.filepath;

    // Получаем оригинальное имя
    const originalName = fields.name?.[0] || uploadedFile.originalFilename || "file.mp3";
    const sanitizedName = sanitizeFileName(path.basename(originalName, path.extname(originalName)));
    
    // Сохраняем правильное расширение
    const extension = getFileExtension(originalName);
    const fileName = `${uuidv4()}-${sanitizedName}${extension}`;

    // Валидация
    try {
      validateFile(uploadedFile, originalName);
    } catch (validationError) {
      await cleanupTempFile(tempFile);
      return res.status(400).json({ error: validationError.message });
    }

    // Читаем файл
    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    // Загружаем в Supabase
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: uploadedFile.mimetype || "audio/mpeg",
        upsert: false,
        cacheControl: "no-cache",
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({
        error: "Failed to upload file to storage",
        details: uploadError.message,
      });
    }

    // Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // URL для скачивания
    const downloadUrl = `${publicUrl}?download=${encodeURIComponent(sanitizedName + extension)}`;

    // Чистим временный файл
    await cleanupTempFile(tempFile);

    // Формируем безопасное имя для команд (без пробелов и спецсимволов)
    const safeName = sanitizedName.replace(/[^\w.-]/g, '_');
    const fullName = `${safeName}${extension}`;

    // Команды Minecraft без кавычек
    const commands = [
      `/cd download ${downloadUrl} ${fullName}`,
      `/cd create local ${fullName} ${fullName}`,
    ];

    // Время удаления файла
    const expiresAt = new Date(Date.now() + FILE_LIFETIME_HOURS * 60 * 60 * 1000);

    return res.status(200).json({
      success: true,
      url: downloadUrl,
      directUrl: publicUrl,
      fileName: fileName,
      commands: commands,
      expiresAt: expiresAt.toISOString(),
      expiresIn: `${FILE_LIFETIME_HOURS} hours`,
      metadata: {
        size: uploadedFile.size,
        type: uploadedFile.mimetype,
        originalName: originalName,
        extension: extension,
      },
    });

  } catch (error) {
    console.error("Upload handler error:", error);

    // Чистим временный файл при ошибке
    if (tempFile) {
      await cleanupTempFile(tempFile);
    }

    // Обработка ошибки размера от formidable
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
