const express = require("express");
const sharp = require("sharp");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;

// Fertige Karten werden kurz im RAM gespeichert.
// Das reicht für BotGhost/Discord, ohne Dateien auf Render speichern zu müssen.
const cards = new Map();

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function safeColor(value, fallback) {
  const color = String(value || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) return color;

  return fallback;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function fetchImage(url) {
  if (!url || !/^https?:\/\//i.test(String(url))) {
    return null;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Bild konnte nicht geladen werden: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

app.get("/", (req, res) => {
  res.send("🐱 Kadsen Lounge Rank API läuft!");
});

app.get("/card/:id.png", (req, res) => {
  const image = cards.get(req.params.id);

  if (!image) {
    return res.status(404).send("Rank Card nicht mehr verfügbar.");
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(image);
});

app.post("/rank", async (req, res) => {
  try {
    console.log("🔥 /rank wurde aufgerufen");
    console.log(req.body);

    const {
      userName = "User",
      level = 0,
      currentXp = 0,
      nextLevelXp = 100,
      rank = 0,
      rankName = "Rank",
      avatar,

      circleColor,
      emptyBarColor,
      filledBarColor,
      userColor,
      rankColor,
      levelColor,
      xpPercentColor,
      xpNumberColor
    } = req.body;

    // ===== KARTENGRÖSSE =====
    const width = 1000;
    const height = 300;

    // ===== WERTE =====
    const xp = Math.max(0, safeNumber(currentXp));
    const requiredXp = Math.max(1, safeNumber(nextLevelXp, 100));
    const progress = Math.min(1, Math.max(0, xp / requiredXp));
    const percent = Math.round(progress * 1000) / 10;

    // ===== FARBEN =====
    const avatarRing = safeColor(circleColor, "#f59ac9");
    const barEmpty = safeColor(emptyBarColor, "#f8e8f1");
    const barFilled = safeColor(filledBarColor, "#b77af2");
    const usernameColor = safeColor(userColor, "#ffffff");
    const rankTextColor = safeColor(rankColor, "#f5aed3");
    const levelTextColor = safeColor(levelColor, "#c7adff");
    const percentColor = safeColor(xpPercentColor, "#91efbd");
    const xpColor = safeColor(xpNumberColor, "#ffe68a");

    // ===== POSITIONEN =====

    // Avatar
    const avatarX = 40;
    const avatarY = 40;
    const avatarSize = 210;

    // Username
    const usernameX = 320;
    const usernameY = 150;

    // Rank / Level
    const rankLabelX = 575;
    const rankValueX = 685;

    const levelLabelX = 805;
    const levelValueX = 930;

    // XP-Leiste
    const barX = 320;
    const barY = 225;
    const barWidth = 640;
    const barHeight = 40;

    const filledWidth = Math.round(barWidth * progress);

    // ===== HINTERGRUND =====

    const backgroundPath = path.join(__dirname, "background.png");

    const background = await sharp(backgroundPath)
      .resize(width, height, {
        fit: "cover",
        position: "center"
      })
      .png()
      .toBuffer();

    // ===== TEXT + XP BAR =====

    const overlaySvg = `
      <svg
        width="${width}"
        height="${height}"
        xmlns="http://www.w3.org/2000/svg"
      >

        <style>
          .username {
            font-family: Arial, sans-serif;
            font-size: 44px;
            font-weight: 700;
          }

          .label {
            font-family: Arial, sans-serif;
            font-size: 28px;
            font-weight: 600;
          }

          .rankValue {
            font-family: Arial, sans-serif;
            font-size: 46px;
            font-weight: 700;
          }

          .levelValue {
            font-family: Arial, sans-serif;
            font-size: 44px;
            font-weight: 700;
          }

          .percent {
            font-family: Arial, sans-serif;
            font-size: 27px;
            font-weight: 700;
          }

          .xp {
            font-family: Arial, sans-serif;
            font-size: 26px;
            font-weight: 700;
          }
        </style>

        <!-- USERNAME -->
        <text
          x="${usernameX}"
          y="${usernameY}"
          class="username"
          fill="${usernameColor}"
        >
          ${escapeXml(userName)}
        </text>

        <!-- RANK -->
        <text
          x="${rankLabelX}"
          y="45"
          class="label"
          fill="${rankTextColor}"
        >
          ${escapeXml(rankName)}
        </text>

        <text
          x="${rankValueX}"
          y="48"
          class="rankValue"
          fill="${rankTextColor}"
        >
          #${escapeXml(rank)}
        </text>

        <!-- LEVEL -->
        <text
          x="${levelLabelX}"
          y="45"
          class="label"
          fill="${levelTextColor}"
        >
          Level
        </text>

        <text
          x="${levelValueX}"
          y="48"
          class="levelValue"
          fill="${levelTextColor}"
        >
          ${escapeXml(level)}
        </text>

        <!-- XP PROZENT -->
        <text
          x="${barX}"
          y="210"
          class="percent"
          fill="${percentColor}"
        >
          ${percent}%
        </text>

        <!-- XP ZAHL -->
        <text
          x="820"
          y="210"
          class="xp"
          fill="${xpColor}"
        >
          ${xp}/${requiredXp} XP
        </text>

        <!-- LEERER XP BALKEN -->
        <rect
          x="${barX}"
          y="${barY}"
          width="${barWidth}"
          height="${barHeight}"
          rx="20"
          ry="20"
          fill="${barEmpty}"
        />

        <!-- GEFÜLLTER XP BALKEN -->
        <rect
          x="${barX}"
          y="${barY}"
          width="${filledWidth}"
          height="${barHeight}"
          rx="20"
          ry="20"
          fill="${barFilled}"
        />

      </svg>
    `;

    const layers = [
      {
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0
      }
    ];

    // ===== DISCORD AVATAR =====

    if (avatar) {
      try {
        const originalAvatar = await fetchImage(avatar);

        if (originalAvatar) {
          const circleMask = Buffer.from(`
            <svg width="${avatarSize}" height="${avatarSize}">
              <circle
                cx="${avatarSize / 2}"
                cy="${avatarSize / 2}"
                r="${avatarSize / 2}"
                fill="#ffffff"
              />
            </svg>
          `);

          const avatarImage = await sharp(originalAvatar, {
            animated: false
          })
            .resize(avatarSize, avatarSize, {
              fit: "cover"
            })
            .composite([
              {
                input: circleMask,
                blend: "dest-in"
              }
            ])
            .png()
            .toBuffer();

          const ringSize = avatarSize + 20;

          const ringSvg = Buffer.from(`
            <svg width="${ringSize}" height="${ringSize}">
              <circle
                cx="${ringSize / 2}"
                cy="${ringSize / 2}"
                r="${avatarSize / 2 + 4}"
                fill="none"
                stroke="${avatarRing}"
                stroke-width="10"
              />
            </svg>
          `);

          layers.push({
            input: ringSvg,
            left: avatarX - 10,
            top: avatarY - 10
          });

          layers.push({
            input: avatarImage,
            left: avatarX,
            top: avatarY
          });
        }
      } catch (avatarError) {
        console.error("Avatar Fehler:", avatarError.message);
      }
    }

    // ===== ALLES ZUSAMMENBAUEN =====

    const card = await sharp(background)
      .composite(layers)
      .png()
      .toBuffer();

    // ===== KARTE KURZ SPEICHERN =====

    const id = crypto.randomUUID();

    cards.set(id, card);

    // Nach 10 Minuten aus dem RAM entfernen
    setTimeout(() => {
      cards.delete(id);
    }, 10 * 60 * 1000);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${baseUrl}/card/${id}.png`;

    console.log("✅ Rank Card erstellt:", imageUrl);

    // Das bekommt BotGhost zurück
    res.json({
      success: true,
      image: imageUrl,
      imageUrl: imageUrl,
      url: imageUrl,

      userName,
      rank,
      level,
      currentXp: xp,
      nextLevelXp: requiredXp,
      percentage: percent
    });

  } catch (error) {
    console.error("❌ Rank Card Fehler:", error);

    res.status(500).json({
      success: false,
      error: "Rank Card konnte nicht erstellt werden.",
      details: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🐱 Kadsen Rank API läuft auf Port ${PORT}`);
});
