from pathlib import Path

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse
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
    url = f"{API_URL}/{path}"

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


@app.get("/{path:path}")
async def static(path: str):
    if not path:
        return FileResponse(BASE_DIR / "index.html")

    file = (BASE_DIR / path).resolve()

    # Защита от выхода за пределы директории
    if not str(file).startswith(str(BASE_DIR.resolve())):
        return FileResponse(BASE_DIR / "404.html", status_code=404)

    if file.is_file():
        return FileResponse(file)

    return FileResponse(BASE_DIR / "404.html", status_code=404)
