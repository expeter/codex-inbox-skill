function html(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export function renderInboxPage(config) {
  const projectName = html(config.projectName)
  const workflow = html(config.workflow.label)
  const inboxDir = html(config.inboxDir)
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} · Project inbox</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #171916;
      color: #eef0e8;
      --paper: #20231f;
      --line: #3b4038;
      --muted: #a4aa9c;
      --green: #a8d58d;
      --amber: #e2bd6c;
      --red: #ef9188;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      padding: clamp(16px, 4vw, 48px);
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, #1c1f1b, #10120f 72%);
    }
    main {
      width: min(820px, 100%);
      overflow: hidden;
      border: 1px solid #464b42;
      border-radius: 13px;
      background: var(--paper);
      box-shadow: 0 28px 80px #0008;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 16px;
      border-bottom: 1px solid var(--line);
      background: #292c27;
      color: var(--muted);
      font-size: 13px;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #6c7168; }
    .dot:first-child { background: #c97868; }
    .dot:nth-child(2) { background: #d4aa60; }
    .dot:nth-child(3) { background: #80aa73; }
    .path { margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .content { padding: clamp(22px, 5vw, 46px); }
    .prompt { color: var(--green); font-weight: 700; }
    h1 { margin: 10px 0 12px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: clamp(30px, 6vw, 48px); letter-spacing: -.035em; }
    .intro { max-width: 650px; margin: 0; color: #c1c5bb; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
    .meta { display: flex; flex-wrap: wrap; gap: 9px; margin: 20px 0 24px; }
    .tag { padding: 5px 9px; border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: 12px; }
    #dropzone {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 230px;
      margin: 0 0 22px;
      padding: 20px;
      overflow: hidden;
      border: 1px dashed #646b5e;
      border-radius: 8px;
      background: #191b18;
      text-align: center;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    #dropzone.dragging { border-color: var(--amber); background: #24251e; }
    #previews { display: none; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    #previews img { width: 100%; max-height: 260px; object-fit: contain; border-radius: 5px; background: #10120f; }
    #dropzone.has-image #previews { display: grid; }
    #dropzone.has-image .empty { display: none; }
    .empty strong { display: block; margin-bottom: 9px; color: #e6e9e0; font: 650 18px ui-sans-serif, system-ui, sans-serif; }
    .empty span { color: var(--muted); font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
    label { display: block; margin: 0 0 8px; color: var(--green); font-size: 13px; font-weight: 700; }
    textarea {
      width: 100%; min-height: 120px; resize: vertical;
      padding: 14px 15px; border: 1px solid #4b5048; border-radius: 7px;
      background: #151714; color: inherit; font: 15px/1.55 ui-sans-serif, system-ui, sans-serif;
    }
    textarea:focus, button:focus-visible, #dropzone:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
    .actions { display: flex; align-items: center; gap: 15px; margin-top: 16px; }
    button { padding: 11px 17px; border: 1px solid #789969; border-radius: 6px; background: #2e4729; color: #f5f8f1; font: 700 14px ui-monospace, monospace; cursor: pointer; }
    button:disabled { opacity: .55; cursor: wait; }
    #status { min-height: 22px; color: var(--muted); font-size: 13px; }
    #status.success { color: var(--green); }
    #status.error { color: var(--red); }
    .recent { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); }
    .recent h2 { margin: 0 0 12px; font: 700 14px ui-monospace, monospace; color: var(--green); }
    #recent-list { margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 12px; }
    #recent-list li { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px solid #30342e; }
    #recent-list .item-id { flex: 1; overflow: hidden; color: #d5d9cf; text-overflow: ellipsis; white-space: nowrap; }
    input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    @media (max-width: 560px) { .content { padding: 22px; } .actions { align-items: stretch; flex-direction: column; } button { width: 100%; } }
  </style>
</head>
<body>
  <main>
    <div class="bar" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="path">~/projects/${projectName}/inbox</span></div>
    <section class="content">
      <div class="prompt">$ capture feedback</div>
      <h1>Project inbox</h1>
      <p class="intro">Drop in what you saw and leave a short message. It will be saved beside the project so your normal workflow can pick it up when you are ready.</p>
      <div class="meta"><span class="tag">project: ${projectName}</span><span class="tag">workflow: ${workflow}</span><span class="tag">writes: ${inboxDir}/</span></div>
      <input id="file" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif">
      <div id="dropzone" role="button" tabindex="0" aria-label="Paste, drop, or choose a screenshot">
        <div class="empty"><strong>Paste or drop screenshots</strong><span>Up to four images · Ctrl+V works anywhere · click to choose files · optional</span></div>
        <div id="previews" aria-label="Screenshot previews"></div>
      </div>
      <label for="message">&gt; message</label>
      <textarea id="message" maxlength="4000" placeholder="What happened? What did you expect instead?"></textarea>
      <div class="actions">
        <button id="submit" type="button">save item ↵</button>
        <span id="status" role="status" aria-live="polite"></span>
      </div>
      <section class="recent" aria-labelledby="recent-title">
        <h2 id="recent-title">&gt; recent captures</h2>
        <ul id="recent-list"><li>loading…</li></ul>
      </section>
    </section>
  </main>
  <script>
    const dropzone = document.querySelector('#dropzone')
    const fileInput = document.querySelector('#file')
    const previews = document.querySelector('#previews')
    const message = document.querySelector('#message')
    const submit = document.querySelector('#submit')
    const status = document.querySelector('#status')
    const screenshots = []

    function setStatus(text, type = '') { status.textContent = text; status.className = type }
    function useFiles(files) {
      for (const file of files) {
        if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
          setStatus('Choose PNG, JPEG, WebP, or GIF images.', 'error'); continue
        }
        if (screenshots.length >= 4) {
          setStatus('Add no more than four screenshots.', 'error'); break
        }
        const url = URL.createObjectURL(file)
        screenshots.push({ file, url })
        const image = document.createElement('img')
        image.src = url
        image.alt = file.name || 'Clipboard screenshot'
        previews.append(image)
      }
      dropzone.classList.toggle('has-image', screenshots.length > 0)
      if (screenshots.length) setStatus(screenshots.length + (screenshots.length === 1 ? ' screenshot ready.' : ' screenshots ready.'))
    }
    dropzone.addEventListener('click', () => fileInput.click())
    dropzone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click() }
    })
    fileInput.addEventListener('change', () => { useFiles(fileInput.files); fileInput.value = '' })
    for (const name of ['dragenter', 'dragover']) dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.add('dragging') })
    for (const name of ['dragleave', 'drop']) dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.remove('dragging') })
    dropzone.addEventListener('drop', event => useFiles(event.dataTransfer.files))
    document.addEventListener('paste', event => {
      const files = [...event.clipboardData.items]
        .filter(entry => entry.kind === 'file' && entry.type.startsWith('image/'))
        .map(entry => entry.getAsFile())
      if (files.length) useFiles(files)
    })
    function fileAsDataUrl(file) {
      if (!file) return Promise.resolve(undefined)
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Unable to read screenshot.'))
        reader.readAsDataURL(file)
      })
    }
    async function loadRecent() {
      const list = document.querySelector('#recent-list')
      try {
        const response = await fetch('/api/entries')
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        list.replaceChildren()
        if (!result.entries.length) {
          const item = document.createElement('li'); item.textContent = 'Inbox is empty.'; list.append(item); return
        }
        for (const entry of result.entries.slice(0, 8)) {
          const item = document.createElement('li')
          const id = document.createElement('span'); id.className = 'item-id'; id.textContent = entry.id
          const state = document.createElement('span'); state.textContent = entry.status
          item.append(id, state); list.append(item)
        }
      } catch { list.textContent = 'Unable to load recent captures.' }
    }
    submit.addEventListener('click', async () => {
      if (!message.value.trim()) return setStatus('Add a short message first.', 'error')
      submit.disabled = true; setStatus('saving…')
      try {
        const response = await fetch('/api/entries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.value,
            images: await Promise.all(screenshots.map(async ({ file }) => ({
              dataUrl: await fileAsDataUrl(file), originalName: file.name,
            }))),
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to save item.')
        setStatus('saved ' + result.id, 'success')
        message.value = ''
        for (const screenshot of screenshots) URL.revokeObjectURL(screenshot.url)
        screenshots.length = 0
        dropzone.classList.remove('has-image')
        previews.replaceChildren()
        fileInput.value = ''
        await loadRecent()
      } catch (error) { setStatus(error.message || 'Unable to save item.', 'error') }
      finally { submit.disabled = false }
    })
    loadRecent()
  </script>
</body>
</html>`
}
