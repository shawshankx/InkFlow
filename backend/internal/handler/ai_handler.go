package handler

import (
	"ai-notes/internal/model"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type AIHandler struct{}

func (h *AIHandler) Polish(c *gin.Context) {
	var req model.AiPolishRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Request Error"})
		return
	}

	apiKey := os.Getenv("AI_API_KEY")
	baseUrl := os.Getenv("AI_BASE_URL")
	if baseUrl == "" {
		baseUrl = "https://api.deepseek.com"
	}

	prompt := "请润色以下 Markdown 内容，使其更专业、流畅：\n\n" + req.Content

	chatReq := model.ChatRequest{
		Model:    "deepseek-chat",
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
		c.JSON(500, gin.H{"error": "AI Service Unavailable"})
		return
	}
	defer resp.Body.Close()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	io.Copy(c.Writer, resp.Body)
}
