const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 載入 Firebase Admin 金鑰
let serviceAccount;
if (process.env.GOOGLE_CREDENTIALS) {
  // ✅ 雲端環境從環境變數讀取（Render）
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} else {
  // ✅ 本地環境從檔案讀取
  serviceAccount = require('./serviceAccountKey.json');
}

// 初始化 Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 提供 public 資料夾內的靜態檔案

// ✅ 取得所有票數
app.get('/votes', async (req, res) => {
  try {
    const snapshot = await db.collection('votes').get();
    const results = {};
    snapshot.forEach(doc => {
      results[doc.id] = doc.data().count || 0;
    });
    res.json(results);
  } catch (error) {
    console.error('讀取票數錯誤', error);
    res.status(500).json({ error: '讀取票數失敗' });
  }
});

// ✅ 投票
app.post('/vote', async (req, res) => {
  const { option } = req.body;
  const allowedOptions = ['三仙台', '伯朗大道', '知本溫泉'];

  if (!allowedOptions.includes(option)) {
    return res.status(400).json({ success: false, message: '無效的選項' });
  }

  try {
    const voteRef = db.collection('votes').doc(option);
    await voteRef.set(
      { count: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );

    // 投完票後回傳最新票數
    const snapshot = await db.collection('votes').get();
    const votes = {};
    snapshot.forEach(doc => {
      votes[doc.id] = doc.data().count || 0;
    });

    res.json({ success: true, votes });
  } catch (error) {
    console.error('投票失敗', error);
    res.status(500).json({ success: false, message: '投票失敗' });
  }
});

// ✅ 前端 SPA routing fallback（Render 需要）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器啟動：http://localhost:${PORT}`);
});
