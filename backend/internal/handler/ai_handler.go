package handler

import (
	"ai-notes/internal/model"
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
	h.callAI(c, "请直接润色以下内容，不要废话，保持 Markdown 格式：\n\n")
}

func (h *AIHandler) Format(c *gin.Context) {
	h.callAI(c, "请将以下内容进行 Markdown 格式化（修正层级、列表、代码块等），直接返回格式化后的结果，不要有任何开场白或解释：\n\n")
}

func (h *AIHandler) callAI(c *gin.Context, promptPrefix string) {
	// 1. 解析请求
	var req model.AiPolishRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid JSON"})
		return
	}

	apiKey := os.Getenv("AI_API_KEY")
	baseUrl := os.Getenv("AI_BASE_URL")
	if baseUrl == "" {
		baseUrl = "https://api.deepseek.com"
	}

	modelName := os.Getenv("AI_MODEL_NAME")
	if modelName == "" {
		modelName = "deepseek-chat"
	}

	prompt := promptPrefix + req.Content

	chatReq := model.ChatRequest{
		Model:    modelName,
		Stream:   true,
		Messages: []model.Message{{Role: "user", Content: prompt}},
	}
	reqBytes, _ := json.Marshal(chatReq)

	httpReq, _ := http.NewRequest("POST", baseUrl+"/chat/completions", bytes.NewBuffer(reqBytes))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		log.Println("AI 连接失败:", err)
		c.JSON(500, gin.H{"error": "AI Service Connection Failed"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("AI 报错 (Code %d): %s", resp.StatusCode, string(body))
		c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("AI Error: %s", string(body))})
		return
	}

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")

	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				break
			}
			log.Println("读取流出错:", err)
			break
		}
		c.Writer.Write(line)
		c.Writer.Flush()
	}
}
