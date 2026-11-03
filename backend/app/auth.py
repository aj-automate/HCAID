"""Wachtwoordpoort voor de hele site.

Alles (apps, API, model, statische bestanden, poster) zit achter één wachtwoord.
Zonder geldige sessie is alleen het loginscherm bereikbaar.

- Het wachtwoord komt uit de omgevingsvariabele APP_PASSWORD en staat nooit in git.
  Ontbreekt die, dan start de server niet (fail closed). Alleen voor lokaal
  ontwikkelen kan ALLOW_NO_PASSWORD=1 de poort uitzetten.
- Na het inloggen krijgt de browser een HttpOnly-cookie met een vervaltijd en een
  HMAC-handtekening. De sleutel is afgeleid van het wachtwoord: wie het wachtwoord
  wijzigt, maakt alle bestaande sessies ongeldig.
- Het wachtwoord wordt in constante tijd vergeleken; mislukte pogingen worden per
  IP-adres afgeremd.
"""

import hashlib
import hmac
import html
import os
import time
from collections import defaultdict, deque
from urllib.parse import parse_qs, quote

from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response

COOKIE = "hcaid_sessie"
SESSION_SECONDS = 12 * 3600
MAX_FAILURES = 8  # per IP-adres per venster
MAX_FAILURES_TOTAL = 200  # over alle IP-adressen samen per venster
FAILURE_WINDOW = 15 * 60
PUBLIC_PATHS = {"/login"}

SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


ON_RAILWAY = bool(os.environ.get("RAILWAY_ENVIRONMENT"))


def clean(value: str) -> str:
    return value.strip().strip("\"'").strip()


class Gate:
    def __init__(self) -> None:
        # Spaties, enters en aanhalingstekens die bij het plakken in een dashboard meekomen negeren.
        password = clean(os.environ.get("APP_PASSWORD", ""))
        self.disabled = not password and os.environ.get("ALLOW_NO_PASSWORD") == "1" and not ON_RAILWAY
        # Alleen achter de proxy van Railway is het laatste X-Forwarded-For-adres betrouwbaar.
        self.trust_proxy = ON_RAILWAY or os.environ.get("TRUST_PROXY") == "1"
        if not password and not self.disabled:
            raise RuntimeError(
                "APP_PASSWORD is niet gezet. De site start niet zonder wachtwoord "
                "(lokaal ontwikkelen: ALLOW_NO_PASSWORD=1)."
            )
        if password and len(password) < 12:
            raise RuntimeError("APP_PASSWORD moet minstens 12 tekens lang zijn.")
        self._password = password.encode()
        self._key = hmac.new(password.encode(), b"hcaid-sessie-v1", hashlib.sha256).digest()
        self._failures: dict[str, deque] = defaultdict(deque)
        self._revoked: dict[str, int] = {}  # handtekening -> vervaltijd, ingetrokken bij uitloggen

    # ---------- sessies ----------
    def make_token(self, now: float | None = None) -> str:
        exp = int((now or time.time()) + SESSION_SECONDS)
        sig = hmac.new(self._key, f"v1:{exp}".encode(), hashlib.sha256).hexdigest()
        return f"{exp}.{sig}"

    def valid(self, token: str | None) -> bool:
        if not token or token.count(".") != 1:
            return False
        exp_s, sig = token.split(".")
        if not exp_s.isdigit() or int(exp_s) < time.time():
            return False
        expected = hmac.new(self._key, f"v1:{exp_s}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig) and sig not in self._revoked

    def revoke(self, token: str | None) -> None:
        if self.valid(token):
            exp_s, sig = token.split(".")
            now = time.time()
            self._revoked = {k: v for k, v in self._revoked.items() if v > now}
            self._revoked[sig] = int(exp_s)

    def check_password(self, given: str) -> bool:
        given = clean(given).encode()
        return hmac.compare_digest(hashlib.sha256(given).digest(), hashlib.sha256(self._password).digest())

    # ---------- afremmen ----------
    def client_ip(self, request: Request) -> str:
        direct = request.client.host if request.client else "onbekend"
        if not self.trust_proxy:
            return direct
        # Het laatste adres in X-Forwarded-For is toegevoegd door de proxy van het platform;
        # eerdere adressen kan de bezoeker zelf verzinnen.
        fwd = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        return fwd[-1] if fwd else direct

    def _recent(self, key: str) -> deque:
        q = self._failures[key]
        while q and q[0] < time.time() - FAILURE_WINDOW:
            q.popleft()
        return q

    def blocked(self, ip: str) -> bool:
        return len(self._recent(ip)) >= MAX_FAILURES or len(self._recent("*")) >= MAX_FAILURES_TOTAL

    def record_failure(self, ip: str) -> None:
        now = time.time()
        self._failures[ip].append(now)
        self._failures["*"].append(now)


def safe_next(target: str | None) -> str:
    """Alleen lokale paden als bestemming na inloggen (geen open redirect)."""
    if not target or not target.startswith("/") or target.startswith("//") or "\\" in target:
        return "/"
    return target


NOTICES = {
    "uitgelogd": "Je bent uitgelogd.",
    "verlopen": "Je sessie is verlopen. Log opnieuw in.",
}


def login_page(next_path: str, error: str | None = None, status: int = 200, notice: str | None = None) -> HTMLResponse:
    msg = f'<p class="err" role="alert">{html.escape(error)}</p>' if error else ""
    if not error and notice in NOTICES:
        msg = f'<p class="info" role="status">{NOTICES[notice]}</p>'
    body = f"""<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Inloggen</title>
<style>
  *{{box-sizing:border-box}} body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef2f5;
  font:17px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0b1f33}}
  main{{background:#fff;padding:32px;width:min(380px,calc(100vw - 32px));border-top:6px solid #0b1f33}}
  h1{{font-size:22px;margin:0 0 6px}} p{{margin:0 0 18px;color:#4a5a69;font-size:15px}}
  label{{display:block;font-weight:600;margin-bottom:6px}}
  input{{width:100%;padding:10px 12px;font:inherit;border:2px solid #0b1f33;border-radius:0}}
  input:focus{{outline:3px solid #ffbf47;outline-offset:1px}}
  button{{margin-top:16px;width:100%;padding:11px;font:inherit;font-weight:600;color:#fff;background:#00577a;border:0;
  border-bottom:3px solid #003a52;cursor:pointer}}
  .err{{color:#b42318;font-weight:600;margin:0 0 14px}}
  .info{{color:#0b1f33;font-weight:600;margin:0 0 14px;padding-left:10px;border-left:4px solid #00577a}}
</style></head>
<body><main>
  <h1>Ontwerpstudie HCAID</h1>
  <p>Deze site is beveiligd. Vul het wachtwoord in dat je bij de inlevering hebt gekregen.</p>
  {msg}
  <form method="post" action="/login?next={quote(next_path, safe='/')}">
    <label for="pw">Wachtwoord</label>
    <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
    <button type="submit">Inloggen</button>
  </form>
</main></body></html>"""
    return HTMLResponse(body, status_code=status, headers={"Cache-Control": "no-store"})


def install(app) -> Gate:
    gate = Gate()

    @app.middleware("http")
    async def password_gate(request: Request, call_next):
        path = request.url.path
        if gate.disabled:
            response = await call_next(request)
        elif path == "/login":
            response = await handle_login(request)
        elif path == "/logout":
            gate.revoke(request.cookies.get(COOKIE))
            response = RedirectResponse("/login?reden=uitgelogd", status_code=303)
            response.delete_cookie(COOKIE, path="/")
            response.headers["Clear-Site-Data"] = '"cache"'
        elif gate.valid(request.cookies.get(COOKIE)):
            response = await call_next(request)
            # HTML nooit cachen: anders toont de browser na uitloggen of een update een oude versie.
            if response.headers.get("content-type", "").startswith("text/html"):
                response.headers["Cache-Control"] = "no-store"
            else:
                response.headers.setdefault("Cache-Control", "private, no-cache")
        elif path.startswith("/api/") or path == "/api":
            response = JSONResponse({"detail": "Niet ingelogd."}, status_code=401)
        else:
            nxt = path + (f"?{request.url.query}" if request.url.query else "")
            response = RedirectResponse(f"/login?next={quote(safe_next(nxt), safe='/')}", status_code=303)
        for k, v in SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        return response

    async def handle_login(request: Request) -> Response:
        next_path = safe_next(request.query_params.get("next"))
        if request.method in ("GET", "HEAD"):
            if gate.valid(request.cookies.get(COOKIE)):
                return RedirectResponse(next_path, status_code=303)
            return login_page(next_path, notice=request.query_params.get("reden"))
        if request.method != "POST":
            return Response(status_code=405, headers={"Allow": "GET, POST"})

        ip = gate.client_ip(request)
        if gate.blocked(ip):
            return login_page(next_path, "Te veel pogingen. Probeer het over een kwartier opnieuw.", 429)
        raw = (await request.body())[:2048].decode("utf-8", errors="ignore")
        given = parse_qs(raw).get("password", [""])[0]
        if not gate.check_password(given):
            gate.record_failure(ip)
            return login_page(next_path, "Dat wachtwoord klopt niet.", 401)

        response = RedirectResponse(next_path, status_code=303)
        secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        response.set_cookie(
            COOKIE, gate.make_token(), max_age=SESSION_SECONDS, path="/",
            httponly=True, secure=secure, samesite="lax",
        )
        return response

    return gate
