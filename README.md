# AR Visual Roll Call System (基于Web的AR视觉点名系统)

这是一个注重隐私、完全运行在浏览器端的增强现实（AR）课堂点名系统。它利用计算机视觉技术实时检测学生人脸，并通过类似“转盘”的视觉特效和音效进行随机抽选。

## 🛠 技术路线 (Technical Architecture)

本项目采用纯前端架构，无需后端服务器处理图像，确保数据安全。

1.  **核心框架**: React 19 + TypeScript
2.  **视觉算法**: MediaPipe Face Detection (Google开源的高性能人脸检测方案)
3.  **渲染引擎**: HTML5 Canvas 2D (用于绘制高性能的AR光环、边框和粒子特效)
4.  **样式方案**: Tailwind CSS (UI界面布局)
5.  **音频合成**: Web Audio API (实时合成"跳动"和"胜利"音效，无需加载外部MP3文件)
6.  **运行环境**: 标准现代浏览器 (Chrome/Edge/Firefox)，依赖 ES Modules。

## ✨ 功能介绍 (Features)

1.  **隐私优先**: 所有图像数据仅在本地内存中处理，**绝不上传服务器**。
2.  **即开即用**: 无需注册、登录或配置名单，摄像头看到谁，就能点谁。
3.  **智能防抖**: 内置 `FaceTracker` 算法，为人脸分配稳定ID，防止因学生轻微晃动导致标记丢失。
4.  **三阶段抽选特效**:
    *   **阶段一 (滚动/Rolling)**: 蓝色光环快速在所有人脸间跳动，伴随"哔哔"声。
    *   **阶段二 (揭晓/Selected)**: 选中目标瞬间变红，全屏聚焦。
    *   **阶段三 (庆祝/Celebration)**: 目标变紫，显示"Congratulation"，播放胜利和弦音效。
5.  **防重复机制**: 已点过的学生会被标记为灰色，不再参与后续抽选（支持重置）。
6.  **参数可调**: 支持调整检测灵敏度、追踪平滑度等参数以适应不同光照环境。

## 📖 使用教程 (User Guide)

1.  **启动**: 使用 Chrome 或 Edge 浏览器打开应用链接。
2.  **授权**: 浏览器弹出"使用您的摄像头"提示时，点击**允许**。
    *   *注意：必须允许摄像头权限才能检测人脸。*
3.  **准备**: 调整摄像头角度，确保屏幕上能看到所有学生的蓝色方框标记。
    *   底部状态栏会显示当前检测到的人数 (Detected)。
4.  **抽选**:
    *   点击 **"START ROLL"** 按钮开始。
    *   系统会播放动画并在几秒后锁定一名学生。
5.  **重置**:
    *   点击 **"重置图标"** (左侧第三个按钮) 清除所有已点名记录，重新开始。
6.  **暂停**:
    *   在动画过程中点击 **"STOP"** 可立即取消当前操作。
7.  **设置**:
    *   点击 **"齿轮图标"** 打开设置面板，可调整识别距离（灵敏度）。

## 🚀 部署指南 (Deployment)

本应用为静态网页应用，部署非常简单。

### ⚠️ 重要前提：HTTPS 协议
由于浏览器安全策略限制，`navigator.mediaDevices.getUserMedia` (调用摄像头) **只能在以下环境运行**：
1.  **localhost** / **127.0.0.1** (本地开发)
2.  **HTTPS** 协议的域名/IP (生产/内网环境)

**如果直接使用 `http://192.168.x.x` 访问，摄像头将无法启动！**

---

### 方案 A：使用 Python 快速测试 (仅限本机)

如果你安装了 Python，可以在项目根目录运行：

```bash
# Python 3
python -m http.server 8000
```
然后访问 `http://localhost:8000`。

---

### 方案 B：内网服务器部署 (Nginx)

假设你有一台内网服务器 (IP: 192.168.1.100)。

1.  **准备文件**: 将项目所有文件上传至服务器目录，例如 `/var/www/ar-roll-call`。
2.  **生成自签名证书 (用于开启HTTPS)**:
    ```bash
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout selfsigned.key -out selfsigned.crt
    ```
3.  **配置 Nginx**:
    编辑 `/etc/nginx/conf.d/ar-roll-call.conf`:

    ```nginx
    server {
        listen 443 ssl;
        server_name 192.168.1.100; # 你的服务器IP

        ssl_certificate /path/to/selfsigned.crt;
        ssl_certificate_key /path/to/selfsigned.key;

        location / {
            root /var/www/ar-roll-call;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
    ```
4.  **访问**:
    在教室电脑浏览器输入 `https://192.168.1.100`。
    *注意：由于是自签名证书，浏览器会提示"不安全"，点击"高级" -> "继续前往"即可。*

---

### 方案 C：纯离线内网环境 (无外网)

当前代码依赖以下 CDN 资源：
*   Tailwind CSS (`cdn.tailwindcss.com`)
*   MediaPipe (`cdn.jsdelivr.net`)
*   React/Lucide (`aistudiocdn.com`)

如果服务器无法连接外网，你需要：
1.  **下载依赖**: 将上述 JS/CSS 文件下载到本地 `libs/` 文件夹。
2.  **修改引用**:
    *   修改 `index.html` 中的 `<script src="...">` 指向本地文件。
    *   修改 `components/ARCanvas.tsx` 中的 `locateFile` 路径，指向本地的 MediaPipe `.wasm` 和 `.js` 文件。

### 常见问题 (FAQ)

*   **Q: 画面很卡怎么办？**
    *   A: 请确保使用了 Chrome 浏览器，并在"设置"中开启了硬件加速。如果在旧电脑上运行，可以尝试在设置中降低"Detection Confidence"。
*   **Q: 无法识别到后排的学生？**
    *   A: 受限于摄像头分辨率，过远的人脸无法清晰成像。建议将摄像头置于教室较高的位置，或分批次（前排/后排）进行抽选。
*   **Q: 摄像头打不开？**
    *   A: 检查浏览器地址栏是否显示"权限被拒绝"图标；检查是否通过 HTTPS 或 localhost 访问。
