# 量子游园 / Quantum Garden

《量子游园》是一件浏览器交互作品，以《牡丹亭·游园惊梦》与量子观测为线索，将目光、气息、指针和触控变成八幕叙事中的观测行为。

在线体验：https://qg-yw6k3p.vercel.app

## 运行

摄像头和麦克风权限要求 `localhost` 或 HTTPS。不要直接用 `file://` 打开。

```bash
python3 -m http.server 8765
```

然后访问：

- 正式体验：http://localhost:8765/
- 八幕调试：http://localhost:8765/测试总览.html
- 设备配置：http://localhost:8765/?setup=1

## 作品结构

- `index.html` / `沉浸.html`：跨幕保持全屏的外壳
- `量子游园·丙·交互体验.html`：一園春、驚夢臺、尋夢廊、糾纏橋
- `新幕/`：寫真、離魂、拾畫·叫畫、三生路
- `测试总览.html`：开发与布展调试入口
- `webgazer.js`、`mediapipe/`：自托管目光估计运行时

## 隐私

摄像头和麦克风只在观众主动开启对应交互后调用。图像、音频与目光预测在浏览器本地处理，项目不包含上传接口或分析服务。浏览器可能在本地保存 WebGazer 校准数据；清除该站点的数据即可删除。

## 开源

项目源代码以 GPL-3.0 许可发布，见 [LICENSE](LICENSE)。第三方组件及其许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

艺术与交互设计：胡一葳  
代码维护：胡一葳 + Codex

English: An eight-act browser artwork inspired by *The Peony Pavilion*, using gaze, breath, pointer and touch as acts of observation. Run it over localhost or HTTPS to enable camera and microphone interactions.
