package main

import (
	"ai-notes/internal/handler"
	"ai-notes/internal/store"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	// 1. 初始化存储层 (MySQL)
	dbUser := getEnv("DB_USER", "root")
	dbPwd := getEnv("DB_PASSWORD", "rootpassword")
	dbHost := getEnv("DB_HOST", "mysql")
	dbPort := getEnv("DB_PORT", "3306")
	dbName := getEnv("DB_NAME", "notes_db")

	// 初始化 MySQL Store
	s := store.NewMySQLStore(dbUser, dbPwd, dbHost, dbPort, dbName)

	// 2. 初始化控制层 (这一部分完全不用变！这就是分层的好处)
	noteHandler := handler.NewNoteHandler(s)
	aiHandler := &handler.AIHandler{}

	// 3. 路由注册
	r := gin.Default()

	api := r.Group("/api")
	{
		api.GET("/notes", noteHandler.List)
		api.GET("/notes/content", noteHandler.Get)
		api.POST("/notes", noteHandler.Save)
		api.DELETE("/notes", noteHandler.Delete)
		api.POST("/ai/polish", aiHandler.Polish)
	}

	// 4. 静态资源托管
	setupStaticFiles(r)

	log.Println("服务启动在 :8080")
	r.Run(":8080")
}

// 辅助函数：处理静态资源
func setupStaticFiles(r *gin.Engine) {
	distFS, _ := fs.Sub(staticFiles, "static")
	assetsFS, _ := fs.Sub(distFS, "assets")

	r.StaticFS("/assets", http.FS(assetsFS))
	r.NoRoute(func(c *gin.Context) {
		index, _ := staticFiles.ReadFile("static/index.html")
		c.Data(200, "text/html; charset=utf-8", index)
	})
}

// 辅助函数：读取环境变量
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
