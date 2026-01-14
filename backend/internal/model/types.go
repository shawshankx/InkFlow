package model

import "time"

// 数据库模型 (对应 notes 表)
type Note struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"uniqueIndex;type:varchar(191)" json:"title"` // 标题唯一
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// HTTP 请求/响应结构 (保持不变，兼容前端)
type NoteRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type AiPolishRequest struct {
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
