const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// 환경변수
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const make_webhook = process.env.MAKE_WEBHOOK;

// 정적 파일 서빙 (public/index.html 포함)
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 1단계: 인증 시작
app.get('/auth/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.email&access_type=offline&prompt=consent`;
  console.log("➡️ Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// 🔹 2단계: 콜백 처리 + 토큰 요청 + Make 전송
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  console.log("📥 받은 인증 코드:", code);

  try {
    // 토큰 요청
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token } = tokenRes.data;
    console.log("✅ 토큰 응답:", tokenRes.data);

    // 사용자 이메일 조회
    const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = userinfoRes.data.email;
    console.log("📧 사용자 이메일:", email);

    // Google Ads customer ID 추출
    const customerRes = await axios.get('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const customer_id = customerRes.data.resourceNames[0].split('/')[1];
    console.log("🏢 Customer ID:", customer_id);

    // Make Webhook 전송
    const payload = {
      customer_id,
      email,
      roas_min: 2.0,
      roas_max: 4.0,
      budget_multiplier: 1.2,
      refresh_token
    };

    const makeRes = await axios.post(make_webhook, payload);
    console.log("📡 Make로 전송 성공:", makeRes.status);

    res.send("✅ 연동이 완료되었습니다. Make 자동 최적화가 시작됩니다.");

  } catch (err) {
    console.error("❌ 연동 중 오류 발생:", err.response?.data || err.message);
    res.status(500).send("❌ 연동 중 오류 발생.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});

