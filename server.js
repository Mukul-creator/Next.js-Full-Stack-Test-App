const path = require("path");
const fs = require("fs");

// Check if Next.js standalone server exists
const standaloneServerPath = path.join(__dirname, ".next", "standalone", "server.js");

if (fs.existsSync(standaloneServerPath)) {
  console.log("> Starting Next.js via Standalone Server (.next/standalone/server.js)...");
  require(standaloneServerPath);
} else {
  // Fallback to Next.js custom server runner
  const { createServer } = require("http");
  const { parse } = require("url");
  const next = require("next");

  const dev = process.env.NODE_ENV !== "production";
  const hostname = "0.0.0.0";
  const port = parseInt(process.env.PORT || "3000", 10);
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  console.log(`> Initializing Next.js server (dev=${dev}) on port ${port}...`);

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error handling request:", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }).listen(port, hostname, () => {
      console.log(`> Server ready on http://${hostname}:${port}`);
    });
  }).catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
