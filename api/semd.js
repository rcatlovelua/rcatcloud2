import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { author, avatar, content } = req.body;

  const { error } = await supabase
    .from("messages")
    .insert({
      author,
      avatar,
      content
    });

  if (error) {
    return res.status(500).json(error);
  }

  res.json({
    success: true
  });
}
