# ZMNav

一个自用型导航页，支持服务器存储、自动识别网站图标、分类管理、常用网址和 Docker 部署。

## 快速安装

### 1. 克隆项目

```bash
git clone https://github.com/zsancc/zmnav.git
cd zmnav
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
HOST=0.0.0.0
PORT=7818
INIT_ADMIN_USERNAME=your_admin_name
INIT_ADMIN_PASSWORD=your_admin_password
ALLOW_PUBLIC_REGISTRATION=false
```

说明：

- `INIT_ADMIN_USERNAME` 和 `INIT_ADMIN_PASSWORD` 是首次部署管理员账号
- `ALLOW_PUBLIC_REGISTRATION=false` 适合自己用
- 如果你以后想开放注册，再改成 `true`

### 3. 启动

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
curl http://127.0.0.1:7818/health
```

### 4. 访问

先直接打开：

```text
http://你的服务器IP:7818
```

第一次就用 `.env` 里的管理员账号登录。

## 宝塔 / Nginx 反代

把域名反向代理到：

```text
http://127.0.0.1:7818
```

然后开启 HTTPS。

## 更新

```bash
cd /opt/zmnav
git pull
docker compose up -d --build
```

## 数据目录

数据会保存在：

- `data/users`
- `.icon-cache`

这两个目录已经挂载好了，重建容器也不会丢数据。

## 本地开发

```bash
npm start
```

然后访问：

```text
http://127.0.0.1:7818
```
