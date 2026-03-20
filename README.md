# ZMNav

一个自用型导航页，支持：

- 登录后把数据直接存服务器
- 自动识别并缓存网站图标
- 分类管理、常用网址、站内搜索、网页搜索
- Docker 部署

## 安装部署

### 1. 先上传到 GitHub

先在 GitHub 新建一个空仓库，比如：

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

如果你已经配过远端，后续更新只要：

```bash
git add .
git commit -m "feat: update site"
git push
```

### 2. 服务器克隆项目

登录服务器后执行：

```bash
cd /opt
git clone https://github.com/YOUR_NAME/zmnav.git
cd zmnav
```

### 3. 配置环境变量

先复制环境变量示例：

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

说明：

- `INIT_ADMIN_USERNAME` 和 `INIT_ADMIN_PASSWORD` 是首次部署管理员账号
- `ALLOW_PUBLIC_REGISTRATION=false` 适合你自己用
- 如果你以后想开放注册，再改成 `true`

### 4. 启动 Docker

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

返回 JSON 就说明服务启动成功。

### 5. 浏览器访问

先直接访问：

```text
http://你的服务器IP:4173
```

第一次就用 `.env` 里的管理员账号登录。

### 6. 宝塔绑定域名

如果你用宝塔，把域名反向代理到：

```text
http://127.0.0.1:4173
```

然后开启 HTTPS 就行。

## 后续更新

你本地改完并推到 GitHub 后，服务器执行：

```bash
cd /opt/zmnav
git pull
docker compose up -d --build
```

## 数据目录

数据会保存在项目目录：

- `data/users`
- `.icon-cache`

这两个目录已经挂载好了，重建容器也不会丢数据。

## 本地开发

如果只是本地临时运行：

```bash
npm start
```

然后打开：

```text
http://127.0.0.1:4173
```

## 补充文档

更细一点的 GitHub 克隆部署说明见：

- [GITHUB_DEPLOY.md](/E:/code/zmnav/GITHUB_DEPLOY.md)
