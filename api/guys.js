import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Правильно парсим action из query
  const { action } = req.query;
  
  console.log('Action:', action); // Для дебага в логах Vercel
  
  try {
    switch (action) {
      case 'getUser':
        return await getUser(req, res);
      case 'getUsers':
        return await getUsers(req, res);
      case 'getMessages':
        return await getMessages(req, res);
      case 'sendMessage':
        return await sendMessage(req, res);
      case 'setOnline':
        return await setOnline(req, res);
      case 'setOffline':
        return await setOffline(req, res);
      case 'readChat':
        return await readChat(req, res);
      case 'startChat':
        return await startChat(req, res);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}

// ===================== GET USER =====================
async function getUser(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  const { data: user, error } = await supabase
    .from('portal_users')
    .select('username, first_name, has_plus, online, last_seen')
    .eq('telegram_id', id)
    .single();

  if (error || !user) {
    console.log('User not found:', id);
    return res.status(200).json({ exists: false });
  }

  return res.status(200).json({
    exists: true,
    ...user,
    avatar: user.username ? `https://unavatar.io/telegram/${user.username}` : null
  });
}

// ===================== GET USERS =====================
async function getUsers(req, res) {
  const { data, error } = await supabase
    .from('portal_users')
    .select('telegram_id, username, first_name, online, last_seen')
    .order('online', { ascending: false });

  if (error) throw error;

  const users = (data || []).map(u => ({
    ...u,
    avatar: u.username ? `https://unavatar.io/telegram/${u.username}` : null
  }));

  return res.status(200).json(users);
}

// ===================== GET MESSAGES =====================
async function getMessages(req, res) {
  const { chat_id, user_id } = req.query;
  if (!chat_id) return res.status(400).json({ error: 'chat_id required' });

  const { data, error } = await supabase
    .from('portal_messages')
    .select('*')
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) throw error;

  // Добавляем аватары
  const messagesWithAvatars = await Promise.all((data || []).map(async (msg) => {
    if (msg.sender_id) {
      const { data: user } = await supabase
        .from('portal_users')
        .select('username')
        .eq('telegram_id', msg.sender_id)
        .single();
      
      return {
        ...msg,
        avatar: user?.username ? `https://unavatar.io/telegram/${user.username}` : null
      };
    }
    return msg;
  }));

  return res.status(200).json(messagesWithAvatars);
}

// ===================== SEND MESSAGE =====================
async function sendMessage(req, res) {
  const { chat_id, sender_id, text } = req.body;
  if (!chat_id || !sender_id || !text) {
    return res.status(400).json({ error: 'chat_id, sender_id, text required' });
  }

  // Получаем имя отправителя
  const { data: user } = await supabase
    .from('portal_users')
    .select('first_name, username')
    .eq('telegram_id', sender_id)
    .single();

  const { data, error } = await supabase
    .from('portal_messages')
    .insert({
      chat_id,
      sender_id,
      sender_name: user?.first_name || user?.username || sender_id,
      text,
      read: false,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  
  // Обновляем последнее сообщение в чате
  await supabase
    .from('portal_chats')
    .upsert({
      chat_id,
      last_message: text,
      last_message_time: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  return res.status(200).json({ success: true, message: data[0] });
}

// ===================== SET ONLINE =====================
async function setOnline(req, res) {
  const { telegram_id } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

  const { error } = await supabase
    .from('portal_users')
    .update({ online: true, last_seen: new Date().toISOString() })
    .eq('telegram_id', telegram_id);

  if (error) throw error;
  return res.status(200).json({ success: true });
}

// ===================== SET OFFLINE =====================
async function setOffline(req, res) {
  const { telegram_id } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

  const { error } = await supabase
    .from('portal_users')
    .update({ online: false, last_seen: new Date().toISOString() })
    .eq('telegram_id', telegram_id);

  if (error) throw error;
  return res.status(200).json({ success: true });
}

// ===================== READ CHAT =====================
async function readChat(req, res) {
  const { chat_id, receiver_id } = req.body;
  if (!chat_id || !receiver_id) {
    return res.status(400).json({ error: 'chat_id and receiver_id required' });
  }

  const { error } = await supabase
    .from('portal_messages')
    .update({ read: true })
    .eq('chat_id', chat_id)
    .eq('receiver_id', receiver_id);

  if (error) throw error;
  return res.status(200).json({ success: true });
}

// ===================== START CHAT =====================
async function startChat(req, res) {
  const { user_id, target_id } = req.body;
  if (!user_id || !target_id) {
    return res.status(400).json({ error: 'user_id and target_id required' });
  }

  // Создаем уникальный ID чата
  const chatId = [user_id, target_id].sort().join('_');
  
  // Проверяем, существует ли уже чат
  const { data: existing } = await supabase
    .from('portal_chats')
    .select('chat_id')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (!existing) {
    // Создаем новый чат
    const { error } = await supabase
      .from('portal_chats')
      .insert({
        chat_id: chatId,
        participants: [user_id, target_id],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  return res.status(200).json({ 
    success: true, 
    chat_id: chatId,
    is_new: !existing
  });
}
