async function loadData() {
        showStatus('FETCHING_DATA...');
        const { data, error } = await supabase
            .from('posts') // Предполагаю, что таблица называется 'posts'
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error(error);
            document.getElementById('loader').innerText = '> ERROR: ' + error.message;
            return;
        }

        document.getElementById('loader').style.display = 'none';
        document.getElementById('stats').innerText = TOTAL_RECORDS: ${data.length} | SESSION: ACTIVE;
        renderPosts(data);
    }

    function renderPosts(posts) {
        const grid = document.getElementById('postGrid');
        grid.innerHTML = '';

        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = 
                <div style="font-size: 10px; opacity: 0.5; margin-bottom: 5px;">UUID: ${post.id} | AUTH: ${post.author}</div>
                
                <label>TITLE</label>
                <input type="text" id="title-${post.id}" value="${post.title || ''}">
                
                <label>CONTENT</label>
                <textarea id="content-${post.id}" rows="3">${post.content || ''}</textarea>
                
                <label>IMAGE_URL</label>
                <input type="text" id="img-${post.id}" value="${post.imageurl || ''}">
                
                ${post.imageurl ? 
                    <div class="img-wrap">
                        <img src="${post.imageurl}" class="img-preview">
                    </div>
                 : ''}

                <div class="btn-group">
                    <button onclick="updatePost('${post.id}')">Update</button>
                    <button onclick="clearImage('${post.id}')">Strip_Img</button>
                    <button class="delete" onclick="deletePost('${post.id}')">Delete</button>
                </div>
            ;
            grid.appendChild(card);
        });
    }

    async function updatePost(id) {
        const title = document.getElementById(title-${id}).value;
        const content = document.getElementById(content-${id}).value;
        const imageurl = document.getElementById(img-${id}).value;

        showStatus(UPDATING_${id}...);
        const { error } = await supabase
            .from('posts')
            .update({ title, content, imageurl })
            .eq('id', id);

        if (error) alert('Error: ' + error.message);
        else {
            showStatus('SUCCESS_UPDATE');
            loadData();
        }
    }

    async function clearImage(id) {
        if(!confirm('Remove image from this post?')) return;
        showStatus(STRIPPING_IMAGE_${id}...);
        const { error } = await supabase
            .from('posts')
            .update({ imageurl: null })
            .eq('id', id);

        if (error) alert(error.message);
        else loadData();
    }

    async function deletePost(id) {
        if(!confirm('PERMANENTLY DELETE POST?')) return;
        showStatus(DELETING_${id}...);
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', id);

        if (error) alert(error.message);
        else loadData();
    }

    function showStatus(text) {
        const bar = document.getElementById('statusBar');
        bar.innerText = '> ' + text;
        bar.style.display = 'block';
        setTimeout(() => { bar.style.display = 'none'; }, 2000);
    }

    // Инициализация
    loadData();
</script>

</body>
</html>
