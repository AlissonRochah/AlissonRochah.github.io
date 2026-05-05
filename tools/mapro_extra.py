#!/usr/bin/env python3
"""
mapro_extra.py — Add (or inspect) an extra service on a MAPRO booking.

Strategy: MAPRO's `/ajax?booking-reservar` endpoint expects the entire
booking form replayed back. There is no dedicated "add extra service"
endpoint. So we GET the booking page, scrape every form field, append a
new `services[N]` entry, and POST it all back.

Usage:
    export MAPRO_SID=<your SID cookie value>

    # Just see what's in the form (no POST):
    python3 mapro_extra.py --reserva 6788927 --dump-form

    # See the new entry that would be appended (no POST):
    python3 mapro_extra.py --reserva 6788927 --service bbq --date 2026-05-09 --dry-run

    # Actually add it:
    python3 mapro_extra.py --reserva 6788927 --service bbq --date 2026-05-09

How to grab MAPRO_SID:
    DevTools → Application → Cookies → app.mapro.us → SID → copy value
"""

import argparse
import html
import io
import json
import os
import re
import sys
import urllib.request
import uuid
from html.parser import HTMLParser

MAPRO_BASE = "https://app.mapro.us"

SERVICE_DEFAULTS = {
    "bbq":  {"id": 6969, "label": "BBQ Clean",   "price": 75.00},
    "ph35": {"id": 6960, "label": "Pool Heat 35", "price": 35.00},
    "ph75": {"id": 6704, "label": "Pool Heat 75", "price": 75.00},
}


class FormFieldExtractor(HTMLParser):
    """Walk the HTML and emit every (name, value) the browser would submit."""

    def __init__(self):
        super().__init__()
        self.fields = []
        self._in_select = False
        self._select_name = None
        self._select_options = []
        self._in_textarea = False
        self._textarea_name = None
        self._textarea_buffer = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "disabled" in a:
            return
        if tag == "input":
            name = a.get("name")
            if not name:
                return
            t = (a.get("type") or "text").lower()
            if t in ("submit", "button", "reset", "file", "image"):
                return
            if t in ("checkbox", "radio"):
                if "checked" in a:
                    self.fields.append((name, a.get("value", "on")))
                return
            self.fields.append((name, a.get("value", "")))
        elif tag == "select":
            self._in_select = True
            self._select_name = a.get("name")
            self._select_options = []
        elif tag == "option" and self._in_select:
            self._select_options.append((a.get("value", ""), "selected" in a))
        elif tag == "textarea":
            self._in_textarea = True
            self._textarea_name = a.get("name")
            self._textarea_buffer = ""

    def handle_endtag(self, tag):
        if tag == "select" and self._in_select:
            chosen = next((v for v, sel in self._select_options if sel), None)
            if chosen is None and self._select_options:
                chosen = self._select_options[0][0]
            if self._select_name and chosen is not None:
                self.fields.append((self._select_name, chosen))
            self._in_select = False
            self._select_name = None
            self._select_options = []
        elif tag == "textarea" and self._in_textarea:
            if self._textarea_name:
                self.fields.append((self._textarea_name, self._textarea_buffer))
            self._in_textarea = False
            self._textarea_name = None
            self._textarea_buffer = ""

    def handle_data(self, data):
        if self._in_textarea:
            self._textarea_buffer += data


def encode_multipart(fields, boundary=None):
    if boundary is None:
        boundary = "----PythonFormBoundary" + uuid.uuid4().hex
    buf = io.BytesIO()

    def w(s):
        buf.write(s.encode("utf-8") if isinstance(s, str) else s)

    for name, value in fields:
        if value is None:
            value = ""
        w(f"--{boundary}\r\n")
        w(f'Content-Disposition: form-data; name="{name}"\r\n\r\n')
        w(str(value))
        w("\r\n")
    w(f"--{boundary}--\r\n")
    return boundary, buf.getvalue()


def request(method, path, sid, body=None, content_type=None, accept_json=False):
    url = MAPRO_BASE + path
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Cookie": f"SID={sid}",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if accept_json:
        headers["Accept"] = "application/json, text/javascript, */*; q=0.01"
        headers["X-Requested-With"] = "XMLHttpRequest"
        headers["Origin"] = MAPRO_BASE
        headers["Referer"] = MAPRO_BASE + path
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.status, dict(resp.headers), resp.read()


def get_booking_form(sid, reserva_id):
    path = f"/booking/reservation/{reserva_id}"
    status, _, body = request("GET", path, sid)
    if status != 200:
        raise RuntimeError(f"GET {path} returned {status}")
    text = body.decode("utf-8", errors="replace")
    extractor = FormFieldExtractor()
    extractor.feed(text)
    return extractor.fields, text


def next_service_index(fields):
    pat = re.compile(r"^services\[(\d+)\]")
    seen = {int(m.group(1)) for name, _ in fields for m in [pat.match(name)] if m}
    return (max(seen) + 1) if seen else 0


def append_service(fields, service_id, price, date):
    idx = next_service_index(fields)
    p = f"{price:.2f}"
    new_entries = [
        ("automatically_adjust_the_cleaning_date_of_a_reservation", "0"),
        ("discount", "0.00"),
        ("end_date", date),
        ("end_hour", ""),
        ("excludeTaxes", "1"),
        ("fornecedor", ""),
        ("group", "servicos_gerais"),
        ("id", str(service_id)),
        ("observation", ""),
        ("sale", "0.00"),
        ("servico_rsid", ""),
        ("start_date", date),
        ("start_hour", ""),
        ("total_value", p),
        ("tourist", "0"),
        ("valor_custo", "0.00"),
        ("value", p),
    ]
    new = [(f"services[{idx}][{k}]", v) for k, v in new_entries]
    return fields + new, idx


def post_booking_save(sid, fields):
    boundary, body = encode_multipart(fields)
    status, headers, raw = request(
        "POST",
        "/ajax?booking-reservar",
        sid,
        body=body,
        content_type=f"multipart/form-data; boundary={boundary}",
        accept_json=True,
    )
    text = raw.decode("utf-8", errors="replace")
    try:
        return status, json.loads(text)
    except Exception:
        return status, {"raw": text[:600]}


def cmd_dump_form(args, sid):
    fields, _ = get_booking_form(sid, args.reserva)
    print(f"# {len(fields)} fields parsed")
    for name, value in fields:
        v = value if len(str(value)) < 80 else str(value)[:77] + "…"
        print(f"{name} = {v!r}")


def cmd_add(args, sid):
    svc = SERVICE_DEFAULTS[args.service]
    price = args.price if args.price is not None else svc["price"]
    print(f"Reserva: {args.reserva}")
    print(f"Service: {svc['label']} (id={svc['id']}) @ ${price:.2f} on {args.date}")
    print(f"Fetching form...")
    fields, _ = get_booking_form(sid, args.reserva)
    print(f"  {len(fields)} fields parsed")

    fields, idx = append_service(fields, svc["id"], price, args.date)
    print(f"  appended as services[{idx}]")

    if args.dry_run:
        print("\n--- New entry (DRY RUN, not posted) ---")
        for name, value in fields[-17:]:
            print(f"  {name} = {value!r}")
        return

    print("Posting /ajax?booking-reservar ...")
    status, body = post_booking_save(sid, fields)
    print(f"HTTP {status}")
    print(json.dumps(body, indent=2)[:1500])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--reserva", required=True, type=int, help="Booking id (the number in the URL /booking/reservation/{id})")
    ap.add_argument("--service", choices=list(SERVICE_DEFAULTS.keys()), help="Service to add: bbq | ph35 | ph75")
    ap.add_argument("--date", help="YYYY-MM-DD (start_date and end_date)")
    ap.add_argument("--price", type=float, help="Override default price (BBQ=75, PH35=35, PH75=75)")
    ap.add_argument("--dump-form", action="store_true", help="Just print every form field and exit")
    ap.add_argument("--dry-run", action="store_true", help="Show the new service entry but don't POST")
    args = ap.parse_args()

    sid = os.environ.get("MAPRO_SID")
    if not sid:
        print("error: set MAPRO_SID env var (DevTools → Application → Cookies → app.mapro.us → SID)", file=sys.stderr)
        sys.exit(1)

    if args.dump_form:
        cmd_dump_form(args, sid)
        return

    if not args.service or not args.date:
        ap.error("--service and --date are required (unless --dump-form)")

    cmd_add(args, sid)


if __name__ == "__main__":
    main()
