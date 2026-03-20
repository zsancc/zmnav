# GitHub Clone Deployment

这份文档就是从 GitHub 开始部署的完整流程。

## 1. 推送到 GitHub

先在 GitHub 创建一个空仓库：

```text
https://github.com/YOUR_NAME/zmnav.git
```

然后在本地项目目录执行：

```bash
git add .
git commit -m "feat: initial release"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/zmnav.git
git push -u origin main
```

## 2. 服务器克隆

```bash
cd /opt
git clone https://github.com/YOUR_NAME/zmnav.git
cd zmnav
```

## 3. 配置 `.env`

```bash
cp .env.example .env
```

编辑 `.env`：

```env
HOST=0.0.0.0
PORT=4173
INIT_ADMIN_USERNAME=your_admin_name
INIT_ADMIN_PASSWORD=your_admin_password
ALLOW_PUBLIC_REGISTRATION=false
```

## 4. 启动

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

健康检查：

```bash
curl http://127.0.0.1:4173/health
```

## 5. 访问

先直接访问：

```text
http://你的服务器IP:4173
```

然后用 `.env` 里的管理员账号登录。

## 6. 绑定域名

宝塔或 Nginx 反代到：

```text
http://127.0.0.1:4173
```

再开启 HTTPS。

## 7. 更新

以后每次更新：

```bash
cd /opt/zmnav
git pull
docker compose up -d --build
```

## 8. 数据目录

容器数据在：

- `data/users`
- `.icon-cache`

已经做了挂载，不会因为容器重建而丢失。
