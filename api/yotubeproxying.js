export default async function handler(req, res) {
    const { url } = req.query;
    
    // Извлекаем ID видео
    const videoId = url.match(/(?:youtu\.be\/|v=)([^&]+)/)[1];
    
    // Используем vevioz API
    const mp3Url = `https://api.vevioz.com/@api/button/mp3/${videoId}`;
    
    res.json({ url: mp3Url });
}
