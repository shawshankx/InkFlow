package router

import (
	"ai-notes/internal/handler"
	"ai-notes/internal/dao"
	"embed"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRouter(s *dao.NoteDAO, staticFiles embed.FS) *gin.Engine {
	r := gin.Default()

	// 1. 初始化控制层
	noteHandler := handler.NewNoteHandler(s)
	aiHandler := &handler.AIHandler{}

	// 2. 路由注册
	api := r.Group("/api")
	{
		api.GET("/notes", noteHandler.List)
		api.GET("/notes/content", noteHandler.Get)
		api.POST("/notes", noteHandler.Save)
		api.DELETE("/notes", noteHandler.Delete)
		api.POST("/notes/move", noteHandler.Move)
		api.POST("/folders/rename", noteHandler.RenameFolder)
		api.POST("/folders", noteHandler.CreateFolder)
		api.GET("/folders", noteHandler.ListFolders)
		api.DELETE("/folders", noteHandler.DeleteFolder)
		api.POST("/ai/polish", aiHandler.Polish)
		api.POST("/ai/format", aiHandler.Format)
	}

	// 3. 静态资源托管
	setupStaticFiles(r, staticFiles)

	return r
}

func setupStaticFiles(r *gin.Engine, staticFiles embed.FS) {
	distFS, _ := fs.Sub(staticFiles, "static")
	assetsFS, _ := fs.Sub(distFS, "assets")

	r.StaticFS("/assets", http.FS(assetsFS))
	r.NoRoute(func(c *gin.Context) {
		index, _ := staticFiles.ReadFile("static/index.html")
		c.Data(200, "text/html; charset=utf-8", index)
	})
}
