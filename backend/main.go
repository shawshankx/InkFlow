package main

import (
	"ai-notes/internal/dao"
	"ai-notes/internal/router"
	"embed"
	"log"
	"os"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	// 1. 初始化存储层 (MySQL DAO)
	dbUser := getEnv("DB_USER", "root")
	dbPwd := getEnv("DB_PASSWORD", "rootpassword")
	dbHost := getEnv("DB_HOST", "mysql")
	dbPort := getEnv("DB_PORT", "3306")
	dbName := getEnv("DB_NAME", "notes_db")

	// 初始化 MySQL DAO
	s := dao.NewNoteDAO(dbUser, dbPwd, dbHost, dbPort, dbName)

	// 2. 初始化路由并启动服务
	r := router.SetupRouter(s, staticFiles)

	if port := os.Getenv("PORT"); port == "" {
		log.Println("服务启动在 :8080")
		r.Run(":8080")
	} else {
		log.Printf("服务启动在 :%s", port)
		r.Run(":" + port)
	}
}

// 辅助函数：读取环境变量
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
