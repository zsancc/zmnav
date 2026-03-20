# Deployment

This project is a small Node.js service, not a pure static site.
Reason:
- it needs the `/api/icon` endpoint to fetch and cache site icons
- it now includes login, session, and per-user server-side data storage

## Requirements

- Node.js 18 or newer
- A server with outbound network access

## Option 1: Baota Panel

Recommended path: use a Node project, then reverse proxy your domain to it.

1. Upload the whole project directory to the server.
2. Open the project directory in Baota.
3. Create a Node project.
4. Startup command:

```bash
npm start
```

5. Environment variables:

```bash
HOST=127.0.0.1
PORT=7818
```

Recommended for first deployment:

```bash
INIT_ADMIN_USERNAME=your_admin_name
INIT_ADMIN_PASSWORD=your_admin_password
```

Optional:

```bash
ALLOW_PUBLIC_REGISTRATION=true
```

If you do not set `ALLOW_PUBLIC_REGISTRATION`, public registration stays closed by default.
New accounts can then only be created by an admin from inside the site.

6. In Baota site settings, reverse proxy your domain to:

```text
http://127.0.0.1:7818
```

7. Open:

```text
/health
```

If it returns JSON, the service is up.

Important:
- Do not deploy this as a plain static website.
- The `.icon-cache` directory should be kept writable.
- The `data/users` directory should be kept writable.

## Option 2: Docker

Build and run:

```bash
docker build -t zmnav .
docker run -d \
  --name zmnav \
  -p 7818:7818 \
  -e HOST=0.0.0.0 \
  -e PORT=7818 \
  -e INIT_ADMIN_USERNAME=your_admin_name \
  -e INIT_ADMIN_PASSWORD=your_admin_password \
  -v $(pwd)/data/icon-cache:/app/.icon-cache \
  -v $(pwd)/data/users:/app/data/users \
  --restart unless-stopped \
  zmnav
```

Then open:

```text
http://your-server-ip:7818
```

Or use compose:

```bash
docker compose up -d --build
```

## Reverse Proxy

If you use Nginx or Baota reverse proxy, forward your domain to:

```text
http://127.0.0.1:7818
```

Recommended extras:
- Enable HTTPS
- Enable gzip
- Keep websocket support off; it is not needed here

## Notes

- First icon fetch for a new site may take a few seconds.
- After that, icons are cached in `.icon-cache`.
- User accounts and navigation data are stored on the server in `data/users`.
- Different devices can share the same navigation data by logging into the same account.
- Public registration is closed by default unless you explicitly set `ALLOW_PUBLIC_REGISTRATION=true`.
