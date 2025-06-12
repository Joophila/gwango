const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const make_webhook = process.env.MAKE_WEBHOOK;

// 🔹 HTML 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Google 인증 시작
app.get('/auth/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

// 🔹 콜백 처리
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

    const userinfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = userinfo.data.email;

    const customerRes = await axios.get('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const customer_id = customerRes.data.resourceNames[0].split('/')[1];

    await axios.post(make_webhook, {
      customer_id,
      email,
      roas_min: 2.0,
      roas_max: 4.0,
      budget_multiplier: 1.2,
      refresh_token
    });

    res.send('✅ 연동이 완료되었습니다.');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ 연동 중 오류 발생.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
