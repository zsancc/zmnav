# GitHub Clone Deployment

这份文档按“先放到 GitHub，再到服务器 `git clone` 安装”的流程来。

## 1. 本地推送到 GitHub

先在 GitHub 上新建一个空仓库，比如：

```text
https://github.com/YOUR_NAME/zmnav.git
```

然后在项目目录执行：

```bash
git add .
git commit -m "feat: initial release"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/zmnav.git
git push -u origin main
```

如果你已经加过远端，就只需要：

```bash
git add .
git commit -m "feat: update nav site"
git push
```

## 2. 服务器安装 Docker

确保服务器已经安装：

- Docker
- Docker Compose

## 3. 从 GitHub 克隆项目

登录服务器后执行：

```bash
cd /opt
git clone https://github.com/YOUR_NAME/zmnav.git
cd zmnav
```

## 4. 配置环境变量

先复制示例文件：

```bash
cp .env.example .env
```

然后编辑 `.env`：

```env
HOST=0.0.0.0
PORT=4173
INIT_ADMIN_USERNAME=your_admin_name
INIT_ADMIN_PASSWORD=your_admin_password
ALLOW_PUBLIC_REGISTRATION=false
```

说明：

- `INIT_ADMIN_USERNAME` 和 `INIT_ADMIN_PASSWORD` 是首次部署时的管理员账号
- `ALLOW_PUBLIC_REGISTRATION=false` 表示关闭公开注册，适合你自己用
- 如果你以后想开放注册，再改成 `true`

## 5. 启动项目

在项目目录执行：

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

如果返回 JSON，说明服务已启动。

## 6. 首次登录

浏览器打开：

```text
http://你的服务器IP:4173
```

然后用 `.env` 里的管理员账号登录。

这套站点默认关闭公开注册，所以你自己用的话，后面一直用这个管理员账号就行。

## 7. 宝塔绑定域名

如果你用宝塔，给域名配置反向代理到：

```text
http://127.0.0.1:4173
```

然后开启 HTTPS。

## 8. 后续更新

以后你本地改完代码，重新推到 GitHub 后，服务器只要执行：

```bash
cd /opt/zmnav
git pull
docker compose up -d --build
```

## 9. 数据目录

容器运行后，数据会保存在项目目录：

- `data/users`
- `.icon-cache`

这两个目录已经挂载好了，所以重建容器也不会丢。
