package model

import (
	"time"

	"gorm.io/gorm"
)

// ==============================
// 1. 数据库模型 (DB Schema)
// ==============================

// Folder 文件夹模型
type Folder struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	Name      string         `gorm:"uniqueIndex;size:100;not null" json:"name"`
	Notes     []Note         `json:"-"`
}

type Note struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // 支持软删除
	Title     string         `gorm:"uniqueIndex:idx_title_folder_id;size:191" json:"title"`
	
	// Refactor: Use FolderID foreign key
	FolderID  uint           `gorm:"uniqueIndex:idx_title_folder_id;default:null" json:"folder_id"`
	Folder    *Folder        `json:"folder,omitempty"` // Association
	
	// Legacy: We don't map the string column anymore, but we need to handle migration manually
	
	// 内容使用 text 类型，防止过长截断
	Content   string         `gorm:"type:longtext" json:"content"`
}

// ==============================
// 2. HTTP 请求/响应结构
// ==============================

// NoteRequest 用于接收前端保存笔记的参数
type NoteRequest struct {
	Title   string `json:"title"`
	Folder  string `json:"folder"` // 🔥 接收文件夹参数
	Content string `json:"content"`
}

// NoteSummary 用于列表接口，不返回 Content 以减小流量
type NoteSummary struct {
	Title  string `json:"title"`
	Folder string `json:"folder"` // 🔥 返回文件夹信息
}

// ==============================
// 3. AI 相关结构
// ==============================

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