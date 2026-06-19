await supabase
.from("users")
.update({
    online: true,
    last_seen: new Date()
})
.eq("telegram_id", telegram_id);
