await supabase
.from("users")
.update({
    online: false,
    last_seen: new Date()
})
.eq("telegram_id", telegram_id);
