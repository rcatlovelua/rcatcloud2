export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;
  
  if (password === process.env.ADMINPLUS_KEY) {
    return res.status(200).json({ 
      success: true, 
      token: "SESSION_ACTIVE_XYZ", 
      supatkn: process.env.SUPABASE_URL,
      // ВАЖНО: Отдаем ANON KEY, а не Service Role!
      supanon: process.env.SUPABASE_ANON_KEY 
    });
  } else {
    return res.status(401).json({ success: false, message: 'Access Denied' });
  }
}
