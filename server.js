const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Test, ob die API läuft
app.get("/", (req, res) => {
  res.send("🐱 Kadsen Lounge Rank API läuft!");
});

// Hier kommt gleich unsere Rank-Card hin
app.post("/rank", async (req, res) => {
  try {
    const {
      username = "atidess",
      rank = 1,
      level = 3,
      xp = 195,
      maxXp = 400,
      avatar
    } = req.body;

    res.json({
      success: true,
      username,
      rank,
      level,
      xp,
      maxXp,
      avatar
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Rank Card konnte nicht erstellt werden."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Kadsen Rank API läuft auf Port ${PORT}`);
});
