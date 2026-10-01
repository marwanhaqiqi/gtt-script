// Cloudflare Worker: proxy thumbnail Roblox untuk ForkyHUB
// Route:
//   /avatar/<UserId>   -> headshot pemain (420x420)
//   /asset/<AssetId>   -> thumbnail asset/ikan (420x420)

const SIZE = "420x420";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchThumb(apiUrl) {
  // Coba beberapa kali, karena thumbnail baru bisa berstatus "Pending"
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (r.ok) {
        const j = await r.json();
        const d = j.data && j.data[0];

        if (d && d.state === "Completed" && d.imageUrl) {
          const img = await fetch(d.imageUrl);
          if (img.ok) {
            return new Response(img.body, {
              headers: {
                "Content-Type": img.headers.get("Content-Type") || "image/png",
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        }
        // Tidak ada gunanya mengulang kalau diblokir/error permanen
        if (d && (d.state === "Blocked" || d.state === "Error")) break;
      }
    } catch (e) {
      // lanjut ke percobaan berikutnya
    }
    await sleep(600);
  }
  return new Response("Thumbnail not available", { status: 404 });
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    let m;

    if ((m = pathname.match(/^\/avatar\/(\d+)\/?$/))) {
      return fetchThumb(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${m[1]}&size=${SIZE}&format=Png&isCircular=false`,
      );
    }

    if ((m = pathname.match(/^\/asset\/(\d+)\/?$/))) {
      return fetchThumb(
        `https://thumbnails.roblox.com/v1/assets?assetIds=${m[1]}&size=${SIZE}&format=Png&isCircular=false`,
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
