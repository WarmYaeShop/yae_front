from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
API_URL = "http://localhost:8001"

app = FastAPI()

# Статика
app.mount("/assets", StaticFiles(directory=BASE_DIR), name="static")


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(path: str, request: Request):
    url = f"{API_URL}/api/{path}"

    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            params=request.query_params,
            content=await request.body(),
        )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=dict(resp.headers),
    )


# Кэш браузера: картинки меняются редко — сутки; css/js — 5 минут (обновы доезжают быстро)
CACHE_RULES = {
    (".webp", ".png", ".jpg", ".svg", ".ico"): "public, max-age=86400",
    (".css", ".js"): "public, max-age=300",
}


def _cache_header(filename: str) -> str | None:
    for exts, value in CACHE_RULES.items():
        if filename.lower().endswith(exts):
            return value
    return None


@app.get("/{path:path}")
async def static(path: str):
    if not path:
        return FileResponse(BASE_DIR / "index.html")

    # Чистые URL: /genshin.html → 301 на /genshin (одна каноничная ссылка)
    if path.endswith(".html"):
        clean = path[:-5]
        return RedirectResponse("/" if clean == "index" else f"/{clean}", status_code=301)

    file = (BASE_DIR / path).resolve()

    # Защита от выхода за пределы директории
    if not str(file).startswith(str(BASE_DIR.resolve())):
        return FileResponse(BASE_DIR / "404.html", status_code=404)

    # Чистые URL: /genshin → genshin.html
    if not file.is_file():
        html_file = file.with_name(file.name + ".html")
        if html_file.is_file():
            file = html_file

    if file.is_file():
        cache = _cache_header(file.name)
        headers = {"Cache-Control": cache} if cache else None
        return FileResponse(file, headers=headers)

    return FileResponse(BASE_DIR / "404.html", status_code=404)
