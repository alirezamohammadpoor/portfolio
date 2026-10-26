#!/usr/bin/env node
// Mints a new Spotify refresh token for the now-playing widget.
//
//   bun scripts/spotify-refresh-token.mjs
//
// Reads SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from .env.local (or the
// environment), opens the Spotify consent page, catches the redirect on
// http://127.0.0.1:8888/callback and prints the refresh token. That exact
// redirect URI must be registered on the app at
// https://developer.spotify.com/dashboard (Spotify no longer accepts
// http://localhost, only the loopback IP).

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { exec } from "node:child_process";

const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:8888/callback";
const SCOPES = ["user-read-currently-playing", "user-read-recently-played"];

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

loadEnvLocal();
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are needed (in .env.local or the environment).");
  process.exit(1);
}

const state = randomBytes(8).toString("hex");
const { port, hostname, pathname } = new URL(REDIRECT_URI);
const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: SCOPES.join(" "),
  redirect_uri: REDIRECT_URI,
  state,
  show_dialog: "true",
}).toString();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== pathname) {
    res.writeHead(404).end();
    return;
  }
  const finish = (status, text) => {
    res.writeHead(status, { "Content-Type": "text/plain" }).end(text);
    server.close();
  };
  if (url.searchParams.get("state") !== state) return finish(400, "State mismatch, run the script again.");
  const error = url.searchParams.get("error");
  if (error) return finish(400, `Spotify said: ${error}`);
  const code = url.searchParams.get("code");
  if (!code) return finish(400, "No code in the redirect.");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }),
  });
  const json = await tokenRes.json();
  if (!tokenRes.ok || !json.refresh_token) {
    console.error("Token exchange failed:", tokenRes.status, json);
    return finish(500, "Token exchange failed, see the terminal.");
  }
  console.log("\nNew refresh token (scopes: %s):\n", json.scope);
  console.log(`SPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`);
  console.log("Put it in .env.local and in the Vercel project's env (Production), then redeploy.");
  finish(200, "Done, you can close this tab. The refresh token is in the terminal.");
});

server.listen(Number(port), hostname, () => {
  console.log(`Listening on ${REDIRECT_URI}`);
  console.log(`Open this URL if the browser does not open:\n\n${authUrl}\n`);
  const open = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${open} "${authUrl}"`);
});
