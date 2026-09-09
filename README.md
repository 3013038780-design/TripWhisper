# TripWhisper · 可交互旅行原型

米兰＋科莫湖 3—5 天的中文旅行工作台。规则驱动原型，未接入真实大模型、实时天气、票务库存、支付或云端存储。

## 已实现

偏好表单、城市概览、按偏好生成安排、每日行动卡、地图与官方入口、模拟预订锁定、雨天/少走路建议及确认、恢复上一版本、预算参考、文字回顾、偏好记忆复用、本机保存、JSON/文字导出、全程打印。

所有金额和交通时长是示范估值。固定预订为模拟约束。实际营业、班次和可用性需用户核实。住宿文本仅用于记录，不表示路线已按酒店地址计算。浏览器存储仅保存当前设备数据，不跨设备同步。

## 开发

Node >=22.13，npm install，npm run dev。npm run build 用于发布构建。npm run lint 和 npx tsc --noEmit 可检查代码。

规则回归：node --experimental-strip-types tests/journey.test.mjs。覆盖预订保留、无原地修改、时间顺序、记忆复用、兴趣分流、预算和非法输入。

WebMCP: 在支持 document.modelContext 的浏览器注册只读 read_trip_summary。当前环境没有可用的 WebMCP 验证上下文，未声称验证其运行。

## 后续接入

接入真实模型时，在服务端保管密钥；模型输出通过结构化校验，并保留 lib/journey.ts 的约束检查。继续补充真实路线/营业信息、票券录入、用户反馈与可靠持久化。不要把演示规则包装成真实模型能力。

## 图片

public/como.jpg：Diego Delso，Lake Como，2016-06-25。来源 https://commons.wikimedia.org/wiki/File:Lago_de_Como,_Italia,_2016-06-25,_DD_02-06_PAN.jpg ，CC BY-SA 4.0；已缩小，界面按容器裁切展示。修改后的图片同样按 CC BY-SA 4.0 提供。照片许可证不扩展到其他源代码。
