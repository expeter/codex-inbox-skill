import { homedir } from 'node:os'
import { sep } from 'node:path'

function html(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function shortProjectPath(projectRoot) {
  const home = homedir()
  let displayed = projectRoot === home || projectRoot.startsWith(`${home}${sep}`)
    ? `~${projectRoot.slice(home.length)}`
    : projectRoot
  const prefix = displayed.startsWith('~/') ? '~/' : displayed.startsWith(sep) ? sep : ''
  const parts = displayed.slice(prefix.length).split(/[\\/]+/).filter(Boolean)
  if (parts.length > 4) displayed = `${prefix}…/${parts.slice(-4).join('/')}`
  return displayed
}

export function renderInboxPage(config) {
  const projectName = html(config.projectName)
  const projectPathValue = shortProjectPath(config.projectRoot)
  const projectPath = html(projectPathValue)
  const workflow = html(config.workflow.label)
  const inboxDir = html(config.inboxDir)
  const inboxPath = html(`${projectPathValue}${config.inboxDir === '.' ? '' : `/${config.inboxDir}`}`)
  const ticketRegisterLink = config.workflow.profile === 'spec-driven' && config.workflow.ticketRegister
    ? '<a class="ticket-link" href="/workflow/tickets" target="_blank" rel="noreferrer">ticket states ↗</a>'
    : ''
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} · Project inbox</title>
  <script>try { document.documentElement.dataset.theme = localStorage.getItem('project-inbox-theme') === 'light' ? 'light' : 'dark' } catch { document.documentElement.dataset.theme = 'dark' }</script>
  <style>
    :root {
      color-scheme: dark;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --page: #171916;
      --page-end: #10120f;
      --paper: #20231f;
      --bar: #292c27;
      --field: #151714;
      --drop: #191b18;
      --drop-active: #24251e;
      --preview: #10120f;
      --text: #eef0e8;
      --soft-text: #c1c5bb;
      --line: #3b4038;
      --strong-line: #4b5048;
      --muted: #a4aa9c;
      --green: #a8d58d;
      --amber: #e2bd6c;
      --red: #ef9188;
      --button: #2e4729;
      --button-line: #789969;
      --button-text: #f5f8f1;
      --shadow: #0008;
    }
    :root[data-theme="light"] {
      color-scheme: light;
      --page: #edece5;
      --page-end: #d9ddd2;
      --paper: #fbfcf8;
      --bar: #f0f2eb;
      --field: #fff;
      --drop: #f7f8f3;
      --drop-active: #fff8e6;
      --preview: #e9ece4;
      --text: #20251e;
      --soft-text: #51594d;
      --line: #cdd2c7;
      --strong-line: #aab2a5;
      --muted: #687164;
      --green: #356d2e;
      --amber: #9b6814;
      --red: #a33d35;
      --button: #dcebd5;
      --button-line: #719568;
      --button-text: #193416;
      --shadow: #38412f2b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      padding: clamp(16px, 4vw, 48px);
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, var(--page), var(--page-end) 72%);
      color: var(--text);
    }
    main {
      width: min(820px, 100%);
      overflow: hidden;
      border: 1px solid var(--strong-line);
      border-radius: 13px;
      background: var(--paper);
      box-shadow: 0 28px 80px var(--shadow);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 16px;
      border-bottom: 1px solid var(--line);
      background: var(--bar);
      color: var(--muted);
      font-size: 13px;
    }
    .window-dots { display: flex; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: #6c7168; }
    .dot:first-child { background: #c97868; }
    .dot:nth-child(2) { background: #d4aa60; }
    .dot:nth-child(3) { background: #80aa73; }
    .path { margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .theme-toggle { margin-left: auto; padding: 5px 8px; border-color: var(--line); background: transparent; color: var(--text); font-size: 14px; line-height: 1; }
    .content { padding: clamp(22px, 5vw, 46px); }
    .prompt { color: var(--green); font-weight: 700; }
    h1 { margin: 10px 0 12px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: clamp(30px, 6vw, 48px); letter-spacing: -.035em; }
    .intro { max-width: 650px; margin: 0; color: var(--soft-text); font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
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
      border: 1px dashed var(--strong-line);
      border-radius: 8px;
      background: var(--drop);
      text-align: center;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    #dropzone.dragging { border-color: var(--amber); background: var(--drop-active); }
    #previews { display: none; width: 100%; gap: 12px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x proximity; }
    .preview-card { position: relative; flex: 0 0 min(320px, 82%); min-height: 210px; display: grid; place-items: center; scroll-snap-align: start; }
    .preview-card img { width: 100%; max-height: 260px; object-fit: contain; border-radius: 5px; background: var(--preview); }
    .remove-image { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; padding: 0; border: 1px solid #ffffff88; border-radius: 50%; background: #171916dd; color: #fff; font: 700 17px/1 ui-sans-serif, system-ui, sans-serif; box-shadow: 0 2px 8px #0007; }
    #dropzone.has-image #previews { display: flex; }
    #dropzone.has-image .empty { display: none; }
    .empty strong { display: block; margin-bottom: 9px; color: var(--text); font: 650 18px ui-sans-serif, system-ui, sans-serif; }
    .empty span { color: var(--muted); font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
    label { display: block; margin: 0 0 8px; color: var(--green); font-size: 13px; font-weight: 700; }
    textarea {
      width: 100%; min-height: 120px; resize: vertical;
      padding: 14px 15px; border: 1px solid var(--strong-line); border-radius: 7px;
      background: var(--field); color: inherit; font: 15px/1.55 ui-sans-serif, system-ui, sans-serif;
    }
    textarea:focus, button:focus-visible, #dropzone:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
    .actions { display: flex; align-items: center; gap: 15px; margin-top: 16px; }
    button { padding: 11px 17px; border: 1px solid var(--button-line); border-radius: 6px; background: var(--button); color: var(--button-text); font: 700 14px ui-monospace, monospace; cursor: pointer; }
    button:disabled { opacity: .55; cursor: wait; }
    #status { min-height: 22px; color: var(--muted); font-size: 13px; }
    #status.success { color: var(--green); }
    #status.error { color: var(--red); }
    .recent { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); }
    .recent-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
    .recent h2 { margin: 0; font: 700 14px ui-monospace, monospace; color: var(--green); }
    .ticket-link { color: var(--amber); font-size: 12px; text-decoration: none; }
    .ticket-link:hover { text-decoration: underline; }
    #recent-list { margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 12px; }
    #recent-list li { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--line); }
    #recent-list .item-id { flex: 1; overflow: hidden; color: var(--text); text-overflow: ellipsis; white-space: nowrap; }
    input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    @media (max-width: 560px) { .content { padding: 22px; } .actions { align-items: stretch; flex-direction: column; } .actions button { width: 100%; } }
  </style>
</head>
<body>
  <main>
    <div class="bar"><span class="window-dots" aria-hidden="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span><span class="path">${inboxPath}</span><button class="theme-toggle" id="theme-toggle" type="button" aria-label="Use light theme" title="Change color theme">☀</button></div>
    <section class="content">
      <div class="prompt">$ project inbox</div>
      <h1>${projectName}</h1>
      <p class="intro">Drop in what you saw and leave a short message. It will be saved beside the project so your normal workflow can pick it up when you are ready.</p>
      <div class="meta"><span class="tag">project: ${projectName}</span><span class="tag" title="${html(config.projectRoot)}">path: ${projectPath}</span><span class="tag">workflow: ${workflow}</span><span class="tag">writes: ${inboxDir}/</span></div>
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
        <div class="recent-heading"><h2 id="recent-title">&gt; recent captures</h2>${ticketRegisterLink}</div>
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
    const themeToggle = document.querySelector('#theme-toggle')
    const screenshots = []

    function setStatus(text, type = '') { status.textContent = text; status.className = type }
    function updateThemeButton() {
      const light = document.documentElement.dataset.theme === 'light'
      themeToggle.textContent = light ? '☾' : '☀'
      themeToggle.setAttribute('aria-label', light ? 'Use dark theme' : 'Use light theme')
    }
    themeToggle.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
      document.documentElement.dataset.theme = theme
      try { localStorage.setItem('project-inbox-theme', theme) } catch {}
      updateThemeButton()
    })
    updateThemeButton()
    function updateScreenshotState(messageText, type = '') {
      dropzone.classList.toggle('has-image', screenshots.length > 0)
      if (messageText) setStatus(messageText, type)
      else if (screenshots.length) setStatus(screenshots.length + (screenshots.length === 1 ? ' screenshot ready.' : ' screenshots ready.'))
      else setStatus('No screenshots selected.')
    }
    function addPreview(file) {
      const screenshot = { file, url: URL.createObjectURL(file) }
      screenshots.push(screenshot)
      const card = document.createElement('div'); card.className = 'preview-card'
      const image = document.createElement('img'); image.src = screenshot.url; image.alt = file.name || 'Clipboard screenshot'
      const remove = document.createElement('button'); remove.className = 'remove-image'; remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Remove ' + image.alt)
      remove.addEventListener('click', event => {
        event.stopPropagation()
        const index = screenshots.indexOf(screenshot)
        if (index !== -1) screenshots.splice(index, 1)
        URL.revokeObjectURL(screenshot.url)
        card.remove()
        updateScreenshotState('Screenshot removed. ' + screenshots.length + ' selected.')
      })
      card.append(image, remove)
      previews.append(card)
    }
    function useFiles(files) {
      let errorMessage = ''
      for (const file of files) {
        if (!file || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
          errorMessage = 'Choose PNG, JPEG, WebP, or GIF images.'; continue
        }
        if (screenshots.length >= 4) {
          errorMessage = 'Add no more than four screenshots.'; break
        }
        addPreview(file)
      }
      updateScreenshotState(errorMessage, errorMessage ? 'error' : '')
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
