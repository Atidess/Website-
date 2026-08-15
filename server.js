app.post("/rank", (req, res) => {
    console.log("🔥 /rank WURDE AUFGERUFEN!");
    console.log("Daten:", req.body);

    res.json({
        success: true,
        message: "Rank API funktioniert!"
    });
});

const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🐱 Kadsen Lounge Rank API läuft!");
});

app.post("/rank", (req, res) => {
  console.log("🔥 /rank WURDE AUFGERUFEN!");
  console.log("Daten:", req.body);

  res.json({
    success: true,
    message: "Rank API funktioniert!",
    received: req.body
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Kadsen Rank API läuft auf Port ${PORT}`);
});
