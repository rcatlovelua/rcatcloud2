import { createClient } from "@supabase/supabase-js";

// Используем Service Role Key, так как у Anon Key обычно нет прав на удаление
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = "cdr-tracks";
const MAX_AGE_MS = 10 * 60 * 60 * 1000; // 10 часов

export default async function handler(req, res) {
  // 1. ПРОВЕРКА ЗАЩИТЫ (CRON_SECRET)
  // Vercel автоматически добавляет этот заголовок при запуске Cron
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("Попытка несанкционированного доступа к Cleanup API");
    return res.status(403).json({ error: "Пошел нахуй уебщие которому так смешно удалять файлы, сегодня не повеселимся вот блин((" });
  }

  try {
    // 2. ПОЛУЧАЕМ СПИСОК ФАЙЛОВ
    // Ограничиваем до 100 за раз, чтобы не упасть по таймауту в 10 сек (лимит Vercel)
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 100 });

    if (listError) throw listError;
    if (!files || files.length === 0) {
      return res.status(200).json({ message: "Бакет пуст" });
    }

    const now = Date.now();
    
    // Отфильтровываем только те, что старше 10 часов
    const filesToDelete = files
      .filter(file => {
        // Проверяем дату создания
        const createdAt = new Date(file.created_at).getTime();
        return (now - createdAt) > MAX_AGE_MS;
      })
      .map(file => file.name);

    if (filesToDelete.length === 0) {
      return res.status(200).json({ message: "Старых файлов не найдено" });
    }

    // 3. УДАЛЕНИЕ
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filesToDelete);

    if (deleteError) throw deleteError;

    console.log(`🧹 Успешно удалено файлов: ${filesToDelete.length}`);
    
    return res.status(200).json({
      success: true,
      deletedCount: filesToDelete.length,
      files: filesToDelete
    });

  } catch (error) {
    console.error("Ошибка в работе Cleanup:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

