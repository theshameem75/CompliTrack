#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import selfsigned from "selfsigned";

const domain = process.argv[2] || "dbgmze.dev.slsblx.com";
mkdirSync(".cert", { recursive: true });

const pems = selfsigned.generate([{ name: "commonName", value: domain }], {
  algorithm: "sha256",
  days: 365,
  extensions: [{
    name: "subjectAltName",
    altNames: [
      { type: 2, value: domain },
      { type: 2, value: "localhost" },
      { type: 7, ip: "127.0.0.1" },
    ],
  }],
  keySize: 2048,
});

writeFileSync(".cert/dev-key.pem", pems.private);
writeFileSync(".cert/dev-cert.pem", pems.cert);

console.log(`Created local HTTPS certificate for ${domain}.`);
console.log("Trust it from an elevated PowerShell prompt:");
console.log("  certutil -addstore -f Root .cert\\dev-cert.pem");
console.log("Then run: npm run dev");
