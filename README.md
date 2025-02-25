# Anime Sources API

A simple API wrapper for fetching anime sources from anicrush.to.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Map AniList ID to Anicrush

```
GET /api/mapper/{anilistId}
```

Maps an AniList ID to anicrush.to anime ID and episode information.

Example Request:
```
GET http://localhost:3000/api/mapper/21
```

Example Response:
```json
{
    "anilist_id": "21",
    "anicrush_id": "vRPjMA",
    "titles": {
        "romaji": "One Piece",
        "english": "One Piece",
        "native": "ワンピース",
        "anicrush": "One Piece"
    },
    "total_episodes": 1000,
    "episodes": [
        {
            "number": 1,
            "id": "vRPjMA&episode=1"
        },
        // ... more episodes
    ],
    "format": "TV",
    "status": "RELEASING"
}
```

### Search Anime

```
GET /api/anime/search
```

Query Parameters:
- `keyword` (required): Search term
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 24)

### Get Episode List

```
GET /api/anime/episodes
```

Query Parameters:
- `movieId` (required): The ID of the movie/anime

### Get Servers

```
GET /api/anime/servers/{id}
```

Query Parameters:
- `movieId` (required): The ID of the movie/anime
- `episode` (optional): Episode number (default: 1)

### Get Sources

```
GET /api/anime/sources
```

Query Parameters:
- `movieId` (required): The ID of the movie/anime (e.g., "vRPjMA")
- `episode` (optional): Episode number (default: 1)
- `server` (optional): Server number (default: 4)
- `subOrDub` (optional): "sub" or "dub" (default: "sub")

Example Request:
```
GET http://localhost:3000/api/anime/sources?movieId=vRPjMA&episode=1&server=4&subOrDub=sub
```

### Get HLS Link

```
GET /api/anime/hls/{animeId}?episode={ep}&server={id}&subOrDub={type}
```

Fetches HLS (HTTP Live Streaming) links with additional metadata for a specific episode.

Query Parameters:
- `episode` (optional): Episode number (default: 1)
- `server` (optional): Server number (default: 4)
- `subOrDub` (optional): "sub" or "dub" (default: "sub")

Example Request:
```
GET http://localhost:3000/api/anime/hls/vRPjMA?episode=1&server=4&subOrDub=sub
```

Example Response:
```json
{
    "status": true,
    "result": {
        "sources": [
            {
                "file": "https://example.com/hls/video.m3u8",
                "type": "hls"
            }
        ],
        "tracks": [
            {
                "file": "https://example.com/subtitles.vtt",
                "label": "English",
                "kind": "captions"
            }
        ],
        "intro": {
            "start": 0,
            "end": 90
        },
        "outro": {
            "start": 1290,
            "end": 1380
        },
        "server": 4
    }
}
```

### Health Check

```
GET /health
```

Returns the API status.

## Error Handling

The API will return appropriate error messages with corresponding HTTP status codes:
- 400: Bad Request (missing required parameters)
- 404: Not Found (anime or episode not found)
- 500: Internal Server Error (server-side issues)

## Notes

- The API includes necessary headers for authentication
- CORS is enabled for cross-origin requests
- The server runs on port 3000 by default (can be changed via PORT environment variable) 
