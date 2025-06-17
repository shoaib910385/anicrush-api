const axios = require('axios');
const crypto = require('node:crypto');

class EmbedSource {
    constructor(file, sourceType) {
        this.file = file;
        this.type = sourceType;
    }
}

class Track {
    constructor(file, label, kind, isDefault = false) {
        this.file = file;
        this.label = label;
        this.kind = kind;
        if (isDefault) {
            this.default = isDefault;
        }
    }
}

class EmbedSources {
    constructor(sources = [], tracks = [], t = 0, server = 1, intro = null, outro = null) {
        this.sources = sources;
        this.tracks = tracks;
        this.t = t;
        this.server = server;
        if (intro) this.intro = intro;
        if (outro) this.outro = outro;
    }
}

// Constants for Megacloud
const MEGACLOUD_URL = 'https://megacloud.blog';
const KEY_URL = 'https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json';

// --- OpenSSL-compatible key+IV derivation (same algorithm used by Megacloud)
function opensslKeyIv(password, salt, keyLen = 32, ivLen = 16) {
    let d = Buffer.alloc(0);
    let prev = Buffer.alloc(0);

    while (d.length < keyLen + ivLen) {
        const hash = crypto.createHash('md5');
        hash.update(Buffer.concat([prev, password, salt]));
        prev = hash.digest();
        d = Buffer.concat([d, prev]);
    }

    return {
        key: d.subarray(0, keyLen),
        iv: d.subarray(keyLen, keyLen + ivLen),
    };
}

// --- Decrypt OpenSSL AES-CBC encoded Base64 payloads
function decryptOpenSSL(encBase64, password) {
    try {
        const data = Buffer.from(encBase64, 'base64');
        if (data.subarray(0, 8).toString() !== 'Salted__') return null;

        const salt = data.subarray(8, 16);
        const { key, iv } = opensslKeyIv(Buffer.from(password, 'utf8'), salt);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([
            decipher.update(data.subarray(16)),
            decipher.final(),
        ]);
        return decrypted.toString('utf-8');
    } catch (err) {
        console.error('Decryption error:', err.message);
        return null;
    }
}

// --- Helpers
function extractId(url) {
    return url.split('/').pop().split('?')[0];
}

async function getDecryptionKey() {
    try {
        const res = await axios.get(KEY_URL);
        return typeof res.data === 'string' ? JSON.parse(res.data).mega : res.data?.mega;
    } catch (e) {
        console.error('Failed to fetch key:', e.message);
        return null;
    }
}

const handleEmbed = async (embedUrl, referrer = 'https://megacloud.blog') => {
    try {
        if (!embedUrl) throw new Error('embedUrl is required');

        const id = extractId(embedUrl);
        const apiUrl = `${MEGACLOUD_URL}/embed-2/v2/e-1/getSources?id=${id}`;

        const headers = {
            Referer: referrer || embedUrl,
            Origin: 'https://megacloud.blog/',
            'User-Agent': 'Mozilla/5.0',
        };

        const { data } = await axios.get(apiUrl, { headers });
        if (!data?.sources) throw new Error('No sources field in response');

        // Parse/Decrypt sources array
        let rawSources;
        if (typeof data.sources === 'string') {
            try {
                rawSources = JSON.parse(data.sources);
            } catch (_) {
                const key = await getDecryptionKey();
                if (!key) throw new Error('Failed to fetch decryption key');
                const decrypted = decryptOpenSSL(data.sources, key);
                if (!decrypted) throw new Error('Decryption failed');
                rawSources = JSON.parse(decrypted);
            }
        } else if (Array.isArray(data.sources)) {
            rawSources = data.sources;
        } else {
            throw new Error('Unexpected sources format');
        }

        if (!rawSources.length) throw new Error('No valid sources found');

        const sources = rawSources.map((s) => new EmbedSource(s.file, s.type || s.quality || 'unknown'));
        const tracks = (data.tracks || []).map((t) => new Track(t.file, t.label, t.kind, t.default));

        return new EmbedSources(
            sources,
            tracks,
            data.t ?? 0,
            'megacloud',
            data.intro ?? null,
            data.outro ?? null
        );
    } catch (error) {
        throw error;
    }
};

module.exports = {
    handleEmbed,
    EmbedSource,
    Track,
    EmbedSources
}; 