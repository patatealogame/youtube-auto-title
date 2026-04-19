require("dotenv").config();

const express = require("express");
const axios = require("axios");
const { google } = require("googleapis");
const { io } = require("socket.io-client");

const app = express();
app.use(express.json());

// Variables Render
const {
  STREAMLABS_ACCESS_TOKEN,
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REFRESH_TOKEN,
  VIDEO_ID,
  PORT = 3000
} = process.env;

// 🔐 Auth YouTube
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  "https://youtube-auto-title.onrender.com/callback"
);

oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN
});

const youtube = google.youtube({
  version: "v3",
  auth: oauth2Client
});

// 🎯 Update titre
async function updateYoutubeTitle(name) {
  const current = await youtube.videos.list({
    part: ["snippet"],
    id: [VIDEO_ID]
  });

  const snippet = current.data.items[0].snippet;

  const newTitle = `Le dernier abonné est : ${name}`;

  await youtube.videos.update({
    part: ["snippet"],
    requestBody: {
      id: VIDEO_ID,
      snippet: {
        title: newTitle,
        description: snippet.description || "",
        categoryId: snippet.categoryId || "22"
      }
    }
  });

  console.log("Titre changé :", newTitle);
}

// 🔥 Connexion Streamlabs
async function connectStreamlabs() {
  const res = await axios.get(
    "https://streamlabs.com/api/v2.0/socket/token",
    {
      headers: {
        Authorization: `Bearer ${STREAMLABS_ACCESS_TOKEN}`
      }
    }
  );

  const token = res.data.socket_token;

  const socket = io(
    `https://sockets.streamlabs.com?token=${token}`,
    {
      transports: ["websocket"]
    }
  );

  socket.on("connect", () => {
    console.log("Connecté à Streamlabs");
  });

  socket.on("event", async (eventData) => {
    if (
      eventData.for === "youtube_account" &&
      eventData.type === "subscription"
    ) {
      const name = eventData.message[0].name;
      console.log("NOUVEL ABO :", name);
      await updateYoutubeTitle(name);
    }
  });
}

// 👉 ROUTE LOGIN YOUTUBE
app.get("/", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
  });

  res.send(`<a href="${url}">Connecte ton YouTube</a>`);
});

// 👉 CALLBACK
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  const { tokens } = await oauth2Client.getToken(code);

  console.log("REFRESH TOKEN :", tokens.refresh_token);

  res.send("OK - copie le refresh token dans Render");
});

setTimeout(() => {
  updateYoutubeTitle("TEST_LOGAME");
}, 5000);

app.listen(PORT, async () => {
  console.log("Serveur lancé");

  try {
    await connectStreamlabs();
  } catch (err) {
    console.error(err);
  }
});
