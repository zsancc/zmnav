# GitHub Deployment

这份文档默认你已经把项目放到 GitHub 了，所以从 `git clone` 开始。

## 1. 克隆

```bash
git clone https://github.com/YOUR_NAME/zmnav.git
cd zmnav
```

## 2. 配置 `.env`

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

## 3. 启动

```bash
docker compose up -d --build
```

## 4. 检查

```bash
docker compose ps
curl http://127.0.0.1:7818/health
```

## 5. 访问

```text
http://你的服务器IP:7818
```

第一次就用 `.env` 里的管理员账号登录。

## 6. 绑定域名

反代到：

```text
http://127.0.0.1:7818
```

然后开启 HTTPS。

## 7. 更新

```bash
cd /opt/zmnav
git pull
docker compose up -d --build
```
