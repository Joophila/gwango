const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/auth/google', (req, res) => {
  const client_id = process.env.CLIENT_ID;
  const redirect_uri = process.env.REDIRECT_URI;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token } = response.data;

    // ✅ Make webhook으로 데이터 전송
    await axios.post(process.env.MAKE_WEBHOOK, {
      access_token,
      refresh_token
    });

    res.send('✅ 인증 성공! 이제 광고 최적화가 시작됩니다.');
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('❌ 인증 실패. 콘솔을 확인해주세요.');
  }
});

// ❗ 이게 빠지면 무조건 "Unexpected end of input" 에러 남
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
