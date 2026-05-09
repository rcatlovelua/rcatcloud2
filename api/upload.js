import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET_NAME = "cdr-tracks";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, type } = req.body; // Получаем имя и тип файла из запроса
    
    const extension = name.split('.').pop();
    const fileName = `${uuidv4()}.${extension}`;

    // Генерируем ссылку для прямой загрузки (действует 15 минут)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(fileName);

    if (error) throw error;

    return res.status(200).json({
      uploadUrl: data.signedUrl,
      fileName: fileName,
      token: data.token // Нужен для некоторых версий SDK
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
