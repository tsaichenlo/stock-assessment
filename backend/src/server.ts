import express from "express";

const app = express();
const PORT = 3000;

// A route: GET /health -> returns a small JSON object.
// req = the incoming request, res = the response you send back.
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});