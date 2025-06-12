const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const make_webhook = process.env.MAKE_WEBHOOK;
const developer_token = process.env.DEVELOPER_TOKEN;

// 정적 HTML 서빙 (public 폴더에 index.html 있어야 함)
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 OAuth 시작
app.get('/auth/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

// 🔹 OAuth 콜백 처리
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id,
      client_secret,
      redirect_uri,
      grant_type: 'authorization_code'
    });

    const access_token = data.access_token;
    const refresh_token = data.refresh_token;

    console.log("✅ 토큰 응답:", data);

    // 🔹 유저 이메일 조회
    const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = userinfoRes.data.email;

    // 🔹 고객 ID 목록 조회 (POST + Developer Token 필요)
    const customerRes = await axios.post(
      'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers',
      {}, // body 비움
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'developer-token': developer_token
        }
      }
    );

    const customer_id = customerRes.data.resourceNames[0].split('/')[1];
    console.log("✅ 고객 ID:", customer_id);

    // 🔹 Make Webhook으로 전송
    await axios.post(make_webhook, {
      customer_id,
      email,
      roas_min: 2.0,
      roas_max: 4.0,
      budget_multiplier: 1.2,
      refresh_token
    });

    res.send('✅ 연동이 완료되었습니다. 이제 Make 자동 최적화가 시작됩니다.');
  } catch (err) {
    console.error("❌ 연동 오류:", err.response?.data || err.message);
    res.status(500).send('❌ 연동 중 오류 발생.');
  }
});

// 서버 실행
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 실행 중: http://localhost:${PORT}`));
