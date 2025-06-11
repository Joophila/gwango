
const express = require("express");
const axios = require("axios");
const qs = require("querystring");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const makeWebhook = process.env.MAKE_WEBHOOK_URL;

app.get("/auth/google", (req, res) => {
  const authUrl = \`https://accounts.google.com/o/oauth2/v2/auth?client_id=\${client_id}&redirect_uri=\${redirect_uri}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent\`;
  res.redirect(authUrl);
});

app.get("/auth/google/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post("https://oauth2.googleapis.com/token", qs.stringify({
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: "authorization_code"
    }));

    const { access_token, refresh_token } = response.data;

    await axios.post(makeWebhook, {
      access_token,
      refresh_token
    });

    res.send("✅ 인증 성공! 자동 최적화 연동이 완료되었습니다.");
  } catch (error) {
    console.error(error);
    res.send("❌ 인증 실패. 콘솔을 확인하세요.");
  }
});

app.listen(PORT, () => console.log(\`OAuth 서버 실행 중: \${PORT}\`));
