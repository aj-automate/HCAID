"""De wachtwoordpoort: zonder geldige sessie is niets bereikbaar behalve het loginscherm."""

import os
import time

import pytest
from fastapi.testclient import TestClient

from backend.app.auth import COOKIE, SESSION_SECONDS
from backend.app.main import app

PW = os.environ["APP_PASSWORD"]

PROTECTED = [
    "/", "/schuldwijzer", "/snelgeld", "/schuldwijzer/uitkomst", "/poster.pdf", "/favicon.svg",
    "/api/health", "/api/meta/schuldwijzer", "/api/meta/snelgeld", "/docs", "/openapi.json", "/redoc",
    "/assets/index.js", "/onbekend", "/%2e%2e/etc/passwd", "//evil.example",
]


@pytest.fixture(autouse=True)
def reset_throttle():
    yield
    app.state.gate._failures.clear()


def anon() -> TestClient:
    return TestClient(app, follow_redirects=False)


@pytest.mark.parametrize("path", PROTECTED)
def test_everything_is_closed_without_login(path):
    r = anon().get(path)
    assert r.status_code in (303, 401), (path, r.status_code)
    if r.status_code == 303:
        assert r.headers["location"].startswith("/login")
    assert "Schuldwijzer" not in r.text and "snelgeld" not in r.text.lower()


@pytest.mark.parametrize("method", ["post", "put", "delete", "patch", "options", "head"])
def test_api_rejects_every_method_without_login(method):
    r = getattr(anon(), method)("/api/schuldwijzer/predict")
    assert r.status_code == 401


def test_login_page_is_public_and_reveals_nothing():
    r = anon().get("/login")
    assert r.status_code == 200
    assert "password" in r.text and "Damian" not in r.text and "/assets/" not in r.text


def test_wrong_password_is_refused_and_sets_no_cookie():
    c = anon()
    r = c.post("/login", data={"password": "fout-wachtwoord-123"})
    assert r.status_code == 401 and COOKIE not in r.cookies
    assert c.get("/api/health").status_code == 401


def test_correct_password_opens_the_site():
    c = anon()
    r = c.post("/login?next=/schuldwijzer", data={"password": PW})
    assert r.status_code == 303 and r.headers["location"] == "/schuldwijzer"
    assert c.get("/api/health").json() == {"status": "ok"}


@pytest.mark.parametrize("nxt", ["//evil.example", "https://evil.example", "/\\evil.example", "evil"])
def test_no_open_redirect_after_login(nxt):
    r = anon().post(f"/login?next={nxt}", data={"password": PW})
    assert r.headers["location"] == "/"


@pytest.mark.parametrize("token", ["", "abc", "123.abc", f"{int(time.time()) + 999}.{'0' * 64}", "1.2.3"])
def test_forged_cookies_are_refused(token):
    c = anon()
    c.cookies.set(COOKIE, token)
    assert c.get("/api/health").status_code == 401


def test_expired_session_is_refused():
    gate_token = app.state.gate.make_token(now=time.time() - SESSION_SECONDS - 10)
    c = anon()
    c.cookies.set(COOKIE, gate_token)
    assert c.get("/api/health").status_code == 401


def test_logout_clears_and_revokes_session():
    c = anon()
    c.post("/login", data={"password": PW})
    token = c.cookies.get(COOKIE)
    c.get("/logout")
    assert c.get("/api/health").status_code == 401
    # ook een eerder gekopieerde cookie werkt na uitloggen niet meer
    replay = anon()
    replay.cookies.set(COOKIE, token)
    assert replay.get("/api/health").status_code == 401


def test_brute_force_is_throttled():
    c = anon()
    codes = [c.post("/login", data={"password": f"fout-{i}-xxxxxxxx"}).status_code for i in range(10)]
    assert codes[-1] == 429
    # ook het goede wachtwoord wordt dan even geweigerd
    assert c.post("/login", data={"password": PW}).status_code == 429


def test_security_headers_present():
    r = anon().get("/login")
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["x-content-type-options"] == "nosniff"


def test_spoofed_forwarded_for_does_not_bypass_throttle():
    """Zonder vertrouwde proxy telt het echte verbindingsadres, niet een verzonnen header."""
    codes = []
    for i in range(10):
        c = TestClient(app, follow_redirects=False, headers={"x-forwarded-for": f"198.51.100.{i}"})
        codes.append(c.post("/login", data={"password": f"fout-{i}-xxxxxxxx"}).status_code)
    assert codes[-1] == 429


def test_login_notices_are_fixed_texts_only():
    assert "Je bent uitgelogd." in anon().get("/login?reden=uitgelogd").text
    r = anon().get("/login?reden=<script>alert(1)</script>")
    assert "<script>" not in r.text


def test_app_html_is_never_cached():
    c = anon()
    c.post("/login", data={"password": PW})
    r = c.get("/schuldwijzer")
    if r.headers.get("content-type", "").startswith("text/html"):
        assert r.headers["cache-control"] == "no-store"
    assert c.get("/logout").headers.get("clear-site-data") == '"cache"'


def test_password_ignores_surrounding_whitespace_and_quotes():
    for variant in (f" {PW} ", f"{PW}\n", f'"{PW}"'):
        c = anon()
        assert c.post("/login", data={"password": variant}).status_code == 303
