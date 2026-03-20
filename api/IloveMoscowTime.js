export default function handler(req, res) {
  const mskTime = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  res.status(200).json({ time: mskTime });
}
