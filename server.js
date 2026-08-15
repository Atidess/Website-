const express = require("express");
const sharp = require("sharp");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("🐱 Kadsen Lounge Rank API läuft!");
});

function escapeXml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

    const width = 1000;
    const height = 300;

    const safeMaxXp = Math.max(Number(maxXp) || 1, 1);
    const safeXp = Math.max(0, Math.min(Number(xp) || 0, safeMaxXp));
    const progress = safeXp / safeMaxXp;

    const barX = 320;
    const barY = 225;
    const barWidth = 640;
    const barHeight = 40;
    const filledWidth = Math.max(0, Math.round(barWidth * progress));

    const backgroundPath = path.join(__dirname, "background.png");

    const background = await sharp(backgroundPath)
      .resize(width, height, {
        fit: "cover",
        position: "center"
      })
      .png()
      .toBuffer();

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .username {
            font: bold 44px Arial, sans-serif;
            fill: white;
          }

          .small {
            font: 30px Arial, sans-serif;
            fill: #f4b2d4;
          }

          .big {
            font: bold 46px Arial, sans-serif;
            fill: #f8b6d8;
          }

          .level {
            font: bold 44px Arial, sans-serif;
            fill: #c7a9ff;
          }

          .percent {
            font: bold 27px Arial, sans-serif;
            fill: #9ff5c6;
          }

          .xp {
            font: bold 26px Arial, sans-serif;
            fill: #ffe98a;
          }
        </style>

        <text x="320" y="150" class="username">${escapeXml(username)}</text>

        <text x="575" y="44" class="small">Rank</text>
        <text x="685" y="47" class="big">#${escapeXml(rank)}</text>

        <text x="805" y="44" class="small">Level</text>
        <text x="930" y="47" class="level">${escapeXml(level)}</text>

        <text x="${barX}" y="210" class="percent">${Math.round(progress * 1000) / 10}%</text>

        <text x="820" y="210" class="xp">${safeXp}/${safeMaxXp} XP</text>

        <rect
          x="${barX}"
          y="${barY}"
          width="${barWidth}"
          height="${barHeight}"
          rx="20"
          fill="#f8e8f1"
        />

        <rect
          x="${barX}"
          y="${barY}"
          width="${filledWidth}"
          height="${barHeight}"
          rx="20"
          fill="#b478ef"
        />
      </svg>
    `;

    const layers = [
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0
      }
    ];

    if (avatar) {
      const avatarResponse = await fetch(avatar);

      if (!avatarResponse.ok) {
        throw new Error("Avatar konnte nicht geladen werden.");
      }

      const avatarBuffer = Buffer.from(
        await avatarResponse.arrayBuffer()
      );

      const avatarSize = 210;

      const circleMask = Buffer.from(`
        <svg width="${avatarSize}" height="${avatarSize}">
          <circle
            cx="${avatarSize / 2}"
            cy="${avatarSize / 2}"
            r="${avatarSize / 2}"
            fill="white"
          />
        </svg>
      `);

      const avatarImage = await sharp(avatarBuffer)
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

      const ring = Buffer.from(`
        <svg width="230" height="230">
          <circle
            cx="115"
            cy="115"
            r="107"
            fill="none"
            stroke="#f59ac9"
            stroke-width="12"
          />
        </svg>
      `);

      layers.push({
        input: ring,
        top: 35,
        left: 35
      });

      layers.push({
        input: avatarImage,
        top: 45,
        left: 45
      });
    }

    const result = await sharp(background)
      .composite(layers)
      .png()
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline; filename=rank.png");
    res.send(result);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Rank Card konnte nicht erstellt werden.",
      details: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Kadsen Rank API läuft auf Port ${PORT}`);
});
