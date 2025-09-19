// server.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;  // Use env PORT for easier deployment

app.use(bodyParser.json());

// Logging middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`[SERVER] ${req.method} ${req.url} -- Body:`, req.body);
  next();
});

// Map doctorId to Expo Push Token (replace with real tokens)
const doctorTokens = {
  12345: "ExponentPushToken[YIJejQK-jz0RSEzapIvqNS]",
};

// Helper function to send push notifications via Expo
async function sendPushNotification(message) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  const resultText = await response.text();

  try {
    const resultJson = JSON.parse(resultText);

    if (!response.ok || resultJson.errors) {
      throw new Error(
        `Expo push failed: ${
          JSON.stringify(resultJson.errors || resultJson) || "Unknown error"
        }`
      );
    }
    return resultJson;
  } catch (err) {
    console.error("[SERVER] Failed to parse or send push:", err);
    throw err;
  }
}

// POST /send-update
app.post("/send-update", async (req, res) => {
  const { doctorId, data } = req.body;

  if (!doctorId || !data) {
    return res.status(400).json({ success: false, error: "Missing doctorId or data" });
  }

  const doctorToken = doctorTokens[doctorId];
  if (!doctorToken) {
    return res.status(404).json({ success: false, error: "Doctor token not found" });
  }

  const message = {
    to: doctorToken,
    sound: "default",
    priority: "high",
    title: "🩺 Patient Update",
    body: `${data.name || "Unknown"} reported: ${data.symptoms || "No symptoms"}`,
    data: { patient: data },
  };

  try {
    const result = await sendPushNotification(message);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /send-emergency
app.post("/send-emergency", async (req, res) => {
  const { doctorId, data } = req.body;

  if (!doctorId || !data) {
    return res.status(400).json({ success: false, error: "Missing doctorId or data" });
  }

  const doctorToken = doctorTokens[doctorId];
  if (!doctorToken) {
    return res.status(404).json({ success: false, error: "Doctor token not found" });
  }

  const message = {
    to: doctorToken,
    sound: "emergency.wav", // Make sure this sound file is included in your Expo app
    priority: "high",
    title: "🚨 Emergency Alert",
    body: `${data.name || "Unknown"} needs **IMMEDIATE attention!**`,
    data: { patient: data, emergency: true },
  };

  try {
    const result = await sendPushNotification(message);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Running at http://0.0.0.0:${PORT}`);
});
