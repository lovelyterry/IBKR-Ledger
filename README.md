# IBKR TradeReview

用于复盘盈透证券（Interactive Brokers）交易账单的纯前端网页工具。

所有数据均在浏览器本地内存中解析与计算，不设后端，不上传任何数据。

👉 **在线体验**：[https://lovelyterry.github.io/IBKR-Ledger/](https://lovelyterry.github.io/IBKR-Ledger/)

---

## 核心功能

- **交易日历**：按日展示交易频次与盈亏走势（绿盈红亏），支持按年、月、周汇总与穿透复盘。
- **真实摊薄成本**：自动计算股票做 T 收益、期权已结权利金及分红税费，还原持仓的真实底仓单价。
- **期权全生命周期**：未到期持仓单独隔离，持有到期归零或提前平仓的盈亏精准归因。
- **逐笔交易打标**：保留原始报表字段，按移动加权平均法为每笔平仓自动打标已实现盈亏。

---

## 使用方法

1. **导出账单**：登录 IBKR 网页端 → 报表 → 交易明细（或活动报表）→ 选择自定义日期范围 → 格式选 **CSV** 导出。
2. **导入查看**：直接将 `.csv` 文件拖入网页即可。

---

## 本地运行

```bash
git clone https://github.com/lovelyterry/IBKR-Ledger.git
cd IBKR-Ledger
npm install
npm run dev
```

---

## 技术栈

Vue 3 · TypeScript · Vite · Tailwind CSS · ECharts · PapaParse

## License

MIT
