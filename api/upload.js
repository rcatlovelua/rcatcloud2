import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const form = formidable({
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // ⚠️ files.file может быть массивом
    const uploadedFile = Array.isArray(files.file)
      ? files.file[0]
      : files.file;

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const name = fields.name || uploadedFile.originalFilename || "file";

    const fileBuffer = fs.readFileSync(uploadedFile.filepath);

    const fileName = `${uuidv4()}-${name}`;

    // 🔥 upload в Supabase
    const { error } = await supabase.storage
      .from("cdr-tracks")
      .upload(fileName, fileBuffer, {
        contentType: uploadedFile.mimetype,
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // public URL
    const { data } = supabase.storage
      .from("cdr-tracks")
      .getPublicUrl(fileName);

    const url = data.publicUrl;

    // 🧠 Minecraft команды
    const commands = [
      `/cd create "${name}"`,
      `/cd register "${name}" "${url}"`,
      `/function cdr:play/${name.replace(".mp3", "")}`,
    ];

    return res.status(200).json({
      url,
      commands,
    });
  });
}
