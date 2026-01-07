# OpenAI Proxy for xiamenlabs.com

OpenAI 兼容的代理服务，将 xiamenlabs.com 的免费 chat API 转换为标准 OpenAI 格式。

## 特性

- ✅ **OpenAI 兼容**：完全兼容 OpenAI SDK 和 API 格式
- 🧠 **思考过程可见**：将 reasoning 包裹在 `<think></think>` 标签中
- 🖼️ **多模态支持**：支持图片 + 文本输入（Vision）
- 🚀 **流式输出**：保持实时流式响应
- 🔓 **无需鉴权**：目标 API 无需任何认证

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

服务将运行在 `http://localhost:3000`

### 配置（可选）

复制 `.env.example` 为 `.env` 并修改端口：

```bash
cp .env.example .env
```

## 使用示例

### cURL

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "stream": true
  }'
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="dummy"  # 不需要真实 API key
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "你好"}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Node.js (OpenAI SDK)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'dummy'
});

const stream = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '你好' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### 多模态（图片 + 文本）

#### Python

```python
import base64
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="dummy"
)

# 读取本地图片并编码为 base64
with open("image.jpg", "rb") as f:
    image_data = base64.b64encode(f.read()).decode('utf-8')

response = client.chat.completions.create(
    model="gpt-4-vision-preview",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "这张图片里有什么？"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data}"
                    }
                }
            ]
        }
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

#### Node.js

```javascript
import OpenAI from 'openai';
import fs from 'fs';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'dummy'
});

// 读取本地图片并编码为 base64
const imageBuffer = fs.readFileSync('image.jpg');
const base64Image = imageBuffer.toString('base64');

const stream = await client.chat.completions.create({
  model: 'gpt-4-vision-preview',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: '这张图片里有什么？' },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    }
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

#### cURL

```bash
# 需要先将图片转为 base64
base64_image=$(base64 -w 0 image.jpg)

curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"gpt-4-vision-preview\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": [
          {\"type\": \"text\", \"text\": \"这张图片里有什么？\"},
          {
            \"type\": \"image_url\",
            \"image_url\": {
              \"url\": \"data:image/jpeg;base64,$base64_image\"
            }
          }
        ]
      }
    ],
    \"stream\": true
  }"
```
```

## 响应格式

代理会将目标 API 的响应转换为 OpenAI 格式：

- `reasoning` 字段 → 包裹在 `<think>...</think>` 中
- `content` 字段 → 正常输出

示例输出：
```
<think>
**接收消息**
我收到了你的最新消息...
**理解意图**
我正在思考你发送这个消息的潜在意图...
</think>
你好！很高兴见到你，请问有什么我可以帮你的吗？
```

## API 端点

- `POST /v1/chat/completions` - Chat completions (兼容 OpenAI)
- `GET /health` - 健康检查

## 技术栈

- **Node.js 18+** - 使用原生 fetch API
- **Express** - HTTP 服务器
- **SSE** - 服务器推送事件流式响应

## License

MIT
