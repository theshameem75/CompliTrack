const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = fs.existsSync(path.join(__dirname, "build"))
  ? path.join(__dirname, "build")
  : __dirname;
const useHttps = process.argv.includes("--https");
const port = Number(process.env.PORT || (useHttps ? 5173 : 4173));
const devHost = "dbgmze.dev.slsblx.com";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const handler = (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `${useHttps ? "https" : "http"}://${devHost}`).pathname);
  const authRoutes = new Set(["/activate", "/recover", "/reset-password", "/login", "/login/callback"]);
  const relativePath = pathname === "/"
    ? "index.html"
    : authRoutes.has(pathname)
      ? "auth.html"
      : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relativePath);

  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    return response.end("Forbidden");
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      return response.end("Not found");
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
    });
    response.end(data);
  });
};

let server;
if (useHttps) {
  const keyPath = path.join(__dirname, ".cert", "dev-key.pem");
  const certPath = path.join(__dirname, ".cert", "dev-cert.pem");
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error("Local HTTPS certificate is missing. Run: npm run cert");
    process.exit(1);
  }
  server = https.createServer(
    { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
    handler,
  );
} else {
  server = http.createServer(handler);
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
    console.error(`Stop the existing server or run: PORT=${port + 1} npm start`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

server.listen(port, () => {
  const origin = useHttps ? `https://${devHost}:${port}` : `http://localhost:${port}`;
  console.log(`CompliTrack running at ${origin}`);
});
