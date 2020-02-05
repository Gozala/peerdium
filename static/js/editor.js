class Effect {
  static async loadDocument() {
    const request = await fetch("/data/", { method: "LIST" })
    const entries = await request.json()
    const entry = entries.find(entry => entry.open)
    if (entry) {
      const content = await fetch(`${entry.path}/document.json`)
      if (content.ok) {
        const data = await content.json()
        return { path: entry.path, content: data, writable: entry.writable }
      } else {
        return Error("Failed to load")
      }

      if (entry.writable) {
        this.enableEditing()
      }
    } else {
      return null
    }
  }
  static async publishDocument(content, path = null) {
    if (path) {
      await Effect.writeDocument(path, content, { truncate: true })
      return path
    } else {
      const [head] = content.ops
      const [title] = (head.insert || "").split("\n")
      const name = title || "Untitled"
      const open = await fetch(`/data/${name}.quill?create`, {
        method: "OPEN"
      })
      const { path } = await open.json()
      await Effect.writeDocument(path, content, {
        create: true,
        truncate: true
      })
      return path
    }
  }
  static async writeDocument(path, content, options = {}) {
    const params = new URLSearchParams(options)
    await fetch(`${path}/document.json?${params.toString()}`, {
      method: "PUT",
      body: JSON.stringify(content)
    })
  }
}

class Main {
  constructor() {
    this.editorView = document.querySelector("#editor")
    this.bookmarkButtonView = document.querySelector("#heart-parent")
    this.publishButtonView = document.querySelector("#post-public-button")
    this.editorView = document.querySelector("#editor")
    this.editor = new Quill(this.editorView, {
      modules: {
        toolbar: {
          container: [
            [{ header: 1 }, { header: 2 }],
            ["bold", "italic", "underline", "strike"],
            ["blockquote", "code-block"],
            [{ color: [] }],
            [{ list: "bullet" }],
            ["link", "image"]
          ]
        }
      },
      theme: "bubble",
      placeholder: "Start writing.\n\nSelect the text for formatting options."
    })
    this.listen()
    this.activate()
  }
  listen() {
    this.editor.on("text-change", () => {
      this.onContentChange()
    })
    this.bookmarkButtonView.addEventListener("click", this)
    this.publishButtonView.addEventListener("click", this)
  }
  set publishDisabled(value) {
    this.publishButtonView.disabled = value
  }
  get publishDisabled() {
    return this.publishButtonView.disabled
  }

  onPublish() {
    this.publish()
  }
  onContentChange() {
    if (this.writable) {
      this.publishDisabled = false
    }
  }
  handleEvent(event) {
    switch (event.type) {
      case "click": {
        return this.onClick(event)
      }
    }
  }
  onClick(event) {
    switch (event.target) {
      case this.bookmarkButtonView:
        return this.onToggle()
      case this.publishButtonView:
        return this.onPublish()
    }
  }

  set text(text) {
    this.editor.setText(text)
  }
  get text() {
    return this.editor.getText()
  }
  get writable() {
    return this.editor.isEnabled()
  }
  get content() {
    return this.editor.getContents()
  }
  set content(content) {
    return this.editor.setContents(content)
  }
  set writable(value) {
    if (value) {
      this.editor.enable(true)
      this.editor.focus()
    } else {
      this.bookmarked = false
      this.editor.enable(false)
    }
  }
  async activate() {
    this.writable = false
    this.text = "Loading......."
    const result = await Effect.loadDocument()
    if (result === null) {
      this.text = ""
      this.writable = true
    } else if (result instanceof Error) {
      this.text = "Ooops, something went wrong. Failing to load a document!"
      this.writable = false
    } else {
      const { path, writable, content } = result
      this.path = path
      this.content = content
      this.writable = writable
      this.bookmarked = writable
    }
  }
  async publish() {
    try {
      this.publishDisabled = true
      const path = await Effect.publishDocument(
        this.editor.getContents(),
        this.path
      )
      this.path = path
      this.bookmarked = true
    } catch (error) {
      this.publishDisabled = false
    }
  }
  get path() {
    return this.editorView.getAttribute("data-source")
  }
  set path(path) {
    this.editorView.setAttribute("data-source", path)
  }
  set bookmarked(value) {
    this.bookmarkButtonView.className = value ? "fas fa-heart" : "far fa-heart"
  }
  get bookmarked() {
    return this.writable
  }
}

self.main = new Main()
