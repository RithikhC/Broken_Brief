"""
Daydream dev server.

Daydream has no build step and no dependencies, but it *does* need to be served
over http:// rather than opened as a file:// — ES modules, service workers and
IndexedDB all require an origin.

    py serve.py            → http://localhost:8000
    py serve.py 8080       → pick a port

Keep-alive + threading, because the app loads ~20 ES modules in parallel and the
stock `python -m http.server` drops connections under that.
"""
import sys
import os
import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("image/svg+xml", ".svg")


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"          # keep-alive

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # Always serve fresh source in dev; the service worker does the real caching.
        self.send_header("Cache-Control", "no-store")
        self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "304" not in fmt % args:
            sys.stderr.write("  %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    httpd.daemon_threads = True
    print(f"\n  Daydream running at http://localhost:{port}")
    print("     Open a second window at the same URL to see the live layer work for real.")
    print("     Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  bye\n")


if __name__ == "__main__":
    main()
