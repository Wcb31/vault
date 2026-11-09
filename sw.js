// Lets Vault open with no internet. Your passwords are never in here, only the app's own files.
const CACHE = "vault-app-v7";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const tellPages = () => self.clients.matchAll().then(cs => cs.forEach(c => c.postMessage({ type: "update" })));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // Google sign-in / Drive go straight to the network
  const isPage = e.request.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("index.html");
  // show the saved copy instantly, fetch any update in the background, and tell the page when there is one
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const old = hit && isPage ? hit.clone() : null;
    const net = fetch(e.request, { cache: "no-cache" }).then(async r => {
      if (r.ok) {
        const fresh = r.clone();
        await c.put(e.request, r.clone());
        if (old && (await old.text()) !== (await fresh.text())) tellPages();
      }
      return r;
    }).catch(() => hit);
    e.waitUntil(net.catch(() => {}));
    return hit || net;
  }));
});
