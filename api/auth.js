// api/auth.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id, pass } = req.body;

        if (!id || !pass) {
            return res.status(400).json({ error: 'Missing credentials' });
        }

        const response = await fetch(`https://orrcs.vercel.app/api/getUser?id=${id}&pass=${pass}`);
        const data = await response.json();

        if (data.exists && data.pass_correct) {
            return res.status(200).json({
                success: true,
                user: {
                    id: id,
                    username: data.username,
                    has_plus: data.has_plus || false
                }
            });
        } else if (data.exists && !data.pass_correct) {
            return res.status(401).json({ error: 'Incorrect password' });
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(500).json({ error: 'Authentication server error' });
    }
}
