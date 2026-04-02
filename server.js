const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.text({ limit: "10kb" }));
app.use(express.static("public"));

const WORK_DIR = path.join(__dirname, "tmp");
if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR);

// простая защита
function isSafe(code) {
    if (!code) return false;

    if (code.length > 3000) return false;

    const banned = [
        "system", "exec", "fork", "kill",
        "while(true)", "repeat", "shl", "shr"
    ];

    return !banned.some(word => code.toLowerCase().includes(word));
}

app.post("/run", (req, res) => {
    const code = req.body;

    if (!isSafe(code)) {
        return res.send("❌ Код запрещён или слишком большой");
    }

    const id = Date.now();
    const base = path.join(WORK_DIR, "prog_" + id);

    const pasFile = base + ".pas";

    fs.writeFileSync(pasFile, code);

    const cmd = `
    timeout 3s fpc ${pasFile} -o${base} &&
    timeout 2s ${base}
    `;

    exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
        try {
            fs.unlinkSync(pasFile);
            fs.unlinkSync(base);
        } catch {}

        res.send((stdout || "") + (stderr || ""));
    });
});

app.listen(3000, () => {
    console.log("🚀 http://localhost:3000");
});
