import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_API = "https://xiamenlabs.com/api/chat/";

app.use(express.json());

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { model, messages, stream = true, ...otherParams } = req.body;

    // Transform request to target API format
    const targetRequest = {
      model: "x", // Target API uses 'x' as model
      messages,
      stream: true,
      ...otherParams,
    };

    // Make request to target API
    const response = await fetch(TARGET_API, {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7",
        "content-type": "application/json",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        Referer: "https://xiamenlabs.com/",
      },
      body: JSON.stringify(targetRequest),
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Target API request failed" });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let isInReasoning = false;
    let hasSeenReasoning = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || line === ": connected") continue;

        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            res.write("data: [DONE]\n\n");
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];

            if (!choice) continue;

            const delta = choice.delta || {};
            let content = "";

            // Handle reasoning
            if (delta.reasoning !== undefined) {
              if (!hasSeenReasoning) {
                // First reasoning chunk - output opening tag
                content = "<think>";
                hasSeenReasoning = true;
                isInReasoning = true;
              }
              content += delta.reasoning;
            }
            // Handle content
            else if (delta.content !== undefined) {
              if (isInReasoning) {
                // First content chunk after reasoning - close think tag
                content = "</think>";
                isInReasoning = false;
              }
              content += delta.content;
            }
            // Handle empty delta (transition marker)
            else if (isInReasoning && Object.keys(delta).length === 0) {
              // Empty delta seen, but wait for actual content before closing
              continue;
            }

            // Only send if we have content
            if (content) {
              const openaiChunk = {
                id: parsed.id,
                object: "chat.completion.chunk",
                created: parsed.created,
                model: model || "gpt-4",
                choices: [
                  {
                    index: 0,
                    delta: { content },
                    finish_reason: choice.finish_reason,
                  },
                ],
              };

              res.write(`data: ${JSON.stringify(openaiChunk)}\n\n`);
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      }
    }

    res.end();
  } catch (error) {
    console.error("Proxy error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Proxy error", message: error.message });
    }
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`OpenAI Proxy running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Endpoint: http://localhost:${PORT}/v1/chat/completions`);
});
