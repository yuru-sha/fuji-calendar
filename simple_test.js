const http = require("http");

const options = {
  hostname: "localhost",
  port: 8000,
  path: "/api/health",
  method: "GET",
  timeout: 5000
};

console.log("Testing connection to http://localhost:8000/api/health");

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Response:", data);
  });
});

req.on("error", (err) => {
  console.error("Request error:", err.message);
});

req.on("timeout", () => {
  console.error("Request timeout");
  req.abort();
});

req.end();
