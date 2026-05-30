# Use Client Craft on your Mac (no App Store, no Apple Developer fee)

Client Craft is a **web app** that runs on your laptop. You do **not** need the $99/year Apple Developer Program to use it yourself.

That fee is only for things like:

- Publishing on the **Mac App Store**
- Publishing **iPhone/iPad** apps to the App Store
- Official notarization when distributing to *other people's* Macs

For **your own Mac**, you can run it locally for **$0**.

---

## Easiest way: one command + Dock

In Terminal (in the Client Craft folder):

```bash
npm run desktop
```

This will:

1. Start the app at http://127.0.0.1:5173
2. Open it in a **standalone window** (no browser tabs — feels like an app)

### Keep it in your Dock

1. After the window opens, **right-click its icon in the Dock**
2. Choose **Options → Keep in Dock**

Next time, click that Dock icon. If servers aren’t running, run `npm run desktop` once from Terminal (or we can set up auto-start later).

### Stop the background servers

```bash
npm run desktop:stop
```

---

## Safari: Add to Dock (no Chrome needed)

1. Run `npm run dev` in Terminal and leave it running
2. Open **http://localhost:5173** in Safari
3. **File → Add to Dock…** (or Share → Add to Dock on newer macOS)
4. Name it **Client Craft**

You’ll get a Dock icon that opens the app in its own window.

---

## Chrome: Install as an app

1. Run `npm run dev`
2. Open http://localhost:5173 in Chrome
3. Click the **install** icon in the address bar (if shown), or menu → **Install Client Craft…**

---

## Daily workflow

| What you want | Command |
|---------------|---------|
| Develop / use with live reload | `npm run dev` then open localhost:5173 |
| Open like a desktop app | `npm run desktop` |
| Stop background servers | `npm run desktop:stop` |

Your client data stays in the browser’s **localStorage** on this Mac — it’s private to your machine.

---

## Optional: double-click launcher (no Terminal)

1. Open **Script Editor** (built into macOS)
2. New document, paste:

```applescript
do shell script "cd '/Users/YOUR_NAME/APPS/Client Craft' && npm run desktop"
```

3. Replace the path with your real Client Craft folder path
4. **File → Export** → File Format: **Application**
5. Save as **Client Craft.app** on your Desktop
6. Drag **Client Craft.app** to the Dock

Double-click to launch anytime.

---

## When you *would* want Apple Developer Program

Later, if you want:

- A real **Mac App Store** listing
- An **iPhone** version on the App Store
- To sell the app to strangers without security warnings

Until then, local + Dock is perfect for running your freelance business.
