package handler

import (
	"ai-notes/internal/model" // 注意：如果你改了 go.mod，这里要改成 inkflow
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type AIHandler struct{}

func (h *AIHandler) Polish(c *gin.Context) {
	// 1. 解析请求
	var req model.AiPolishRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid JSON"})
		return
	}

	// 2. 准备 DeepSeek 请求
	apiKey := os.Getenv("AI_API_KEY")
	baseUrl := os.Getenv("AI_BASE_URL")
	if baseUrl == "" {
		baseUrl = "https://api.deepseek.com"
	}

	// 获取环境变量中的模型名，如果没填则默认用 deepseek-chat
	modelName := os.Getenv("AI_MODEL_NAME")

	if modelName == "" {
		modelName = "deepseek-chat"
	}
	log.Println(apiKey)
	log.Println(baseUrl)
	log.Println(modelName)
	// 这里的 prompt 可以根据需要调整
	prompt := "请直接润色以下内容，不要废话，保持 Markdown 格式：\n\n" + req.Content

	chatReq := model.ChatRequest{
		// 如果用 OpenAI，这里要改成 gpt-3.5-turbo 或 gpt-4
		Model:    modelName,
		Stream:   true, // 开启流式
		Messages: []model.Message{{Role: "user", Content: prompt}},
	}
	reqBytes, _ := json.Marshal(chatReq)

	httpReq, _ := http.NewRequest("POST", baseUrl+"/chat/completions", bytes.NewBuffer(reqBytes))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	// 3. 发送请求给 AI
	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Println("AI 连接失败:", err)
		c.JSON(500, gin.H{"error": "AI Service Connection Failed"})
		return
	}
	defer resp.Body.Close()

	// 🔥 关键修正 1: 检查 AI 是否返回了报错 (如余额不足、Key 错误)
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("AI 报错 (Code %d): %s", resp.StatusCode, string(body))
		// 将错误透传给前端
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("AI Error: %s", string(body))})
		return
	}

	// 4. 设置流式响应头
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	// 🔥 关键修正 2: 手动循环读取并刷新，确保打字机效果
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				break // 流结束
			}
			log.Println("读取流出错:", err)
			break
		}

		// 可以在这里打印日志，看看到底发了什么 (调试用)
		// log.Printf("Stream Chunk: %s", string(line))

		// 写入响应
		c.Writer.Write(line)

		// 强制刷新缓冲区，推送到前端
		c.Writer.Flush()
	}
}
