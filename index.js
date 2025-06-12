const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const developer_token = process.env.DEVELOPER_TOKEN;
const make_webhook = process.env.MAKE_WEBHOOK;

// HTML 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 구글 OAuth 시작
app.get('/auth/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

// 콜백 처리
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("❌ code 없음");

  try {
    // 토큰 요청
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: 'authorization_code'
    });

    const access_token = tokenRes.data.access_token;
    const refresh_token = tokenRes.data.refresh_token;

    console.log("✅ 토큰 응답:", tokenRes.data);

    // 사용자 이메일 가져오기
    const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    const email = userinfoRes.data.email;

    // Google Ads 고객 ID 조회
    const customerRes = await axios.get('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'developer-token': developer_token
      }
    });

    const resourceNames = customerRes.data.resourceNames;
    const customer_id = resourceNames?.[0]?.split('/')?.[1];

    console.log("📦 Email:", email);
    console.log("📦 Customer ID:", customer_id);

    // Make에 전송
    await axios.post(make_webhook, {
      customer_id,
      email,
      roas_min: 2.0,
      roas_max: 4.0,
      budget_multiplier: 1.2,
      refresh_token
    });

    res.send('✅ 연동 성공! Make에서 자동 최적화 시작됩니다.');
  } catch (err) {
    console.error("❌ OAuth Token Error:", err.response?.data || err.message);
    res.status(500).send('❌ 연동 중 오류 발생.');
  }
});

// 서버 실행
app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
});
