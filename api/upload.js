import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err });

    const file = files.file;
    const name = fields.name || file.originalFilename;

    const fileBuffer = fs.readFileSync(file.filepath);

    const fileName = `${uuidv4()}-${name}`;

    // 🔥 загрузка в supabase storage
    const { error } = await supabase
      .storage
      .from("cdr-tracks")
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype
      });

    if (error) {
      return res.status(500).json({ error });
    }

    // получаем public url
    const { data } = supabase
      .storage
      .from("cdr-tracks")
      .getPublicUrl(fileName);

    const url = data.publicUrl;

    // 🧠 Minecraft команды
    const commands = [
      `/cd create "${name}"`,
      `/cd register "${name}" "${url}"`,
      `/function cdr:play/${name.replace(".mp3","")}`
    ];

    return res.json({
      url,
      commands
    });
  });
}
