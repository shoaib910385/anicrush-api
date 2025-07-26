const axios = require("axios");
const crypto = require("crypto");

const MEGACLOUD_URL = 'https://megacloud.blog';
const KEY_URL = "https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json";
const DECODE_URL = "https://script.google.com/macros/s/AKfycbx-yHTwupis_JD0lNzoOnxYcEYeXmJZrg7JeMxYnEZnLBy5V0--UxEvP-y9txHyy1TX9Q/exec";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36";

let cachedKey = null;

function extractNonce(html) {
  const match1 = html.match(/\b[a-zA-Z0-9]{48}\b/);
  if (match1) return match1[0];
  
  const match2 = html.match(/\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b/);
  if (match2) return match2.groupValues ? match2.groupValues[1] + match2.groupValues[2] + match2.groupValues[3] : match2[1] + match2[2] + match2[3];
  
  return null;
}

async function fetchKey() {
  if (cachedKey) return cachedKey;
  
  try {
    const { data } = await axios.get(KEY_URL, { headers: { "User-Agent": UA } });
    cachedKey = data?.mega;
    return cachedKey;
  } catch (error) {
    console.error("Failed to fetch key:", error.message);
    return null;
  }
}

async function decryptWithGoogleScript(encryptedData, nonce, key) {
  const fullUrl = `${DECODE_URL}?encrypted_data=${encodeURIComponent(encryptedData)}&nonce=${encodeURIComponent(nonce)}&secret=${encodeURIComponent(key)}`;
  
  const { data } = await axios.get(fullUrl);
  const match = data.match(/"file":"(.*?)"/); 
  if (!match) throw new Error("Video URL not found in decrypted response");
  
  return match[1];
}

async function extract(embedUrl) {
  try {
    const headers = {
      "Accept": "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": MEGACLOUD_URL,
      "User-Agent": UA
    };

    const id = embedUrl.split("/").pop().split("?")[0];
    
    const { data: html } = await axios.get(embedUrl, { headers });
    const nonce = extractNonce(html);
    
    if (!nonce) {
      throw new Error("Could not extract nonce from embed page");
    }

    const apiUrl = `${MEGACLOUD_URL}/embed-2/v3/e-1/getSources?id=${id}&_k=${nonce}`;
    const { data: response } = await axios.get(apiUrl, { headers });
    
    if (!response || !response.sources) {
      throw new Error("No sources found in API response");
    }

    const encoded = response.sources;
    let m3u8Url;

    if (encoded.includes(".m3u8")) {
      m3u8Url = encoded;
    } else {
      const key = await fetchKey();
      if (!key) {
        throw new Error("Could not fetch decryption key");
      }

      m3u8Url = await decryptWithGoogleScript(encoded, nonce, key);
    }

    return {
      sources: [{ file: m3u8Url, type: "hls" }],
      tracks: response.tracks || [],
      t: response.t || 0,
      server: response.server || 0,
      intro: response.intro || null,
      outro: response.outro || null
    };

  } catch (error) {
    console.error("MegaCloud extraction failed:", error.message);
    return {
      sources: [],
      tracks: [],
      t: 0,
      server: 0
    };
  }
}

async function handleEmbed(embedUrl, referrer) {
  return await extract(embedUrl);
}

module.exports = { extract, handleEmbed }; 
