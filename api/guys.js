import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const { action } = req.query;
  console.log('Action:', action);
  
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
      case 'createUser':
        return await createUser(req, res);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===================== GET USER =====================
async function getUser(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID required' });

  const { data: user, error } = await supabase
    .from('portal_users')
    .select('*')
    .eq('telegram_id', id)
    .maybeSingle();

  if (error) {
    console.error('getUser error:', error);
    return res.status(500).json({ error: error.message });
  }
  
  if (!user) return res.status(200).json({ exists: false });

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
    .select('telegram_id, username, first_name, online, last_seen, created_at')
    .order('online', { ascending: false });

  if (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ error: error.message });
  }

  const users = (data || []).map(u => ({
    ...u,
    avatar: u.username ? `https://unavatar.io/telegram/${u.username}` : null
  }));

  return res.status(200).json(users);
}

// ===================== GET MESSAGES =====================
async function getMessages(req, res) {
  const { chat_id } = req.query;
  if (!chat_id) return res.status(400).json({ error: 'chat_id required' });

  try {
    const { data, error } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('getMessages error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Преобразуем данные для фронтенда
    const messages = await Promise.all((data || []).map(async (msg) => {
      // Получаем имя отправителя из таблицы пользователей
      let senderName = msg.telegram_id;
      let avatar = null;
      
      if (msg.telegram_id) {
        const { data: user } = await supabase
          .from('portal_users')
          .select('first_name, username')
          .eq('telegram_id', String(msg.telegram_id))
          .maybeSingle();
        
        if (user) {
          senderName = user.first_name || user.username || msg.telegram_id;
          avatar = user.username ? `https://unavatar.io/telegram/${user.username}` : null;
        }
      }
      
      return {
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.telegram_id,  // Переименовываем для фронтенда
        sender_name: senderName,
        text: msg.content,            // Переименовываем для фронтенда
        read: msg.read || false,
        created_at: msg.created_at,
        receiver_id: msg.receiver_id,
        avatar: avatar
      };
    }));

    return res.status(200).json(messages);
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===================== SEND MESSAGE =====================
async function sendMessage(req, res) {
  const { chat_id, sender_id, text, receiver_id } = req.body;
  
  if (!chat_id || !sender_id || !text) {
    return res.status(400).json({ error: 'chat_id, sender_id, text required' });
  }

  try {
    // Определяем receiver_id (получатель — другой участник чата)
    let receiverId = receiver_id;
    if (!receiverId && chat_id) {
      const parts = chat_id.split('_');
      receiverId = parts.find(id => id !== String(sender_id)) || null;
    }

    // Проверяем, есть ли уже сообщения в этом чате
    const { data: existing } = await supabase
      .from('portal_messages')
      .select('id')
      .eq('chat_id', chat_id)
      .limit(1);

    // Если чат новый — создаем запись в portal_chats
    if (!existing || existing.length === 0) {
      try {
        await supabase
          .from('portal_chats')
          .upsert({
            chat_id: chat_id,
            participants: [String(sender_id), receiverId],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (e) {
        // Если таблицы нет — игнорируем
        console.log('portal_chats table not found, skipping');
      }
    }

    const messageData = {
      chat_id,
      telegram_id: String(sender_id),  // ВАЖНО: используем telegram_id
      role: 'user',
      content: text,
      receiver_id: receiverId,
      read: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('portal_messages')
      .insert(messageData)
      .select();

    if (error) {
      console.error('sendMessage insert error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Обновляем последнее сообщение в чате
    try {
      await supabase
        .from('portal_chats')
        .upsert({
          chat_id,
          last_message: text,
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      // Игнорируем
    }

    // Возвращаем в формате для фронтенда
    const newMsg = data?.[0] || messageData;
    return res.status(200).json({ 
      success: true, 
      message: {
        id: newMsg.id,
        chat_id: newMsg.chat_id,
        sender_id: newMsg.telegram_id,
        text: newMsg.content,
        read: newMsg.read,
        created_at: newMsg.created_at,
        receiver_id: newMsg.receiver_id
      }
    });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===================== SET ONLINE =====================
async function setOnline(req, res) {
  const { telegram_id } = req.body;
  if (!telegram_id) return res.status(400).json({ error: 'telegram_id required' });

  try {
    const { error } = await supabase
      .from('portal_users')
      .update({ online: true, last_seen: new Date().toISOString() })
      .eq('telegram_id', telegram_id);

    if (error) {
      console.error('setOnline error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('setOnline error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===================== SET OFFLINE =====================
async function setOffline(req, res) {
  let telegram_id;
  
  try {
    if (req.body) {
      if (typeof req.body === 'string') {
        const parsed = JSON.parse(req.body);
        telegram_id = parsed?.telegram_id;
      } else if (typeof req.body === 'object') {
        telegram_id = req.body?.telegram_id;
      }
    }
  } catch (e) {
    console.error('setOffline parse error:', e);
  }
  
  if (!telegram_id && req.query) {
    telegram_id = req.query.telegram_id;
  }
  
  if (!telegram_id) {
    console.error('setOffline: no telegram_id');
    return res.status(400).json({ error: 'telegram_id required' });
  }

  try {
    const { error } = await supabase
      .from('portal_users')
      .update({ online: false, last_seen: new Date().toISOString() })
      .eq('telegram_id', telegram_id);

    if (error) {
      console.error('setOffline error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('setOffline error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===================== READ CHAT =====================
async function readChat(req, res) {
  const { chat_id, receiver_id } = req.body;
  if (!chat_id || !receiver_id) {
    return res.status(400).json({ error: 'chat_id and receiver_id required' });
  }

  try {
    const { error } = await supabase
      .from('portal_messages')
      .update({ read: true })
      .eq('chat_id', chat_id)
      .eq('receiver_id', receiver_id);

    if (error) {
      console.error('readChat error:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('readChat error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ===================== START CHAT =====================
async function startChat(req, res) {
  const { user_id, target_id } = req.body;
  if (!user_id || !target_id) {
    return res.status(400).json({ error: 'user_id and target_id required' });
  }

  const chatId = [user_id, target_id].sort().join('_');
  
  try {
    // Проверяем, существует ли уже чат
    const { data: existing } = await supabase
      .from('portal_chats')
      .select('chat_id')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase
        .from('portal_chats')
        .insert({
          chat_id: chatId,
          participants: [String(user_id), String(target_id)],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('startChat insert error:', error);
        // Возвращаем успех даже если таблицы нет
        return res.status(200).json({ 
          success: true, 
          chat_id: chatId,
          is_new: true
        });
      }
    }

    return res.status(200).json({ 
      success: true, 
      chat_id: chatId,
      is_new: !existing
    });
  } catch (err) {
    console.error('startChat error:', err);
    return res.status(200).json({ 
      success: true, 
      chat_id: chatId,
      is_new: true
    });
  }
}

// ===================== CREATE USER =====================
async function createUser(req, res) {
  const { telegram_id, username, first_name } = req.body;
  
  if (!telegram_id || !username) {
    return res.status(400).json({ error: 'telegram_id and username required' });
  }

  try {
    // Проверяем, не занят ли username
    const { data: existing } = await supabase
      .from('portal_users')
      .select('telegram_id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const { data, error } = await supabase
      .from('portal_users')
      .insert({
        telegram_id: String(telegram_id),
        username,
        first_name: first_name || username,
        online: false,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('createUser error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      user: data?.[0] 
    });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: err.message });
  }
}
