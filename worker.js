// ==========================================
// 终极隐私守护 V7 版：TG全脱敏 + 地区名切换节点 + 高亮框强制复制
// ==========================================

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === 'Unknown' || countryCode === 'XX') return '❓';
    if (!/^[a-zA-Z]{2}$/.test(countryCode)) return '🏳️‍🌈';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// 三大云厂商 + 简称 全景正则解析
function parseCloudRegion(host) {
    if (!host) return { icon: '🌐', name: '自定义节点' };
    const h = String(host).toLowerCase();

    if (h.includes('ap-southeast-1') || h.includes('asia-southeast1') || h.includes('southeastasia') || h.includes('sg') || h.includes('sin')) return { icon: '🇸🇬', name: '新加坡节点' };
    if (h.includes('ap-east-1') || h.includes('asia-east2') || h.includes('eastasia') || h.includes('hk') || h.includes('hkg')) return { icon: '🇭🇰', name: '香港节点' };
    if (h.includes('asia-east1') || h.includes('tw') || h.includes('tpe') || h.includes('taiwan')) return { icon: '🇹🇼', name: '台湾节点' };
    if (h.includes('ap-northeast-1') || h.includes('ap-northeast-3') || h.includes('asia-northeast1') || h.includes('asia-northeast2') || h.includes('japaneast') || h.includes('japanwest') || h.includes('jp') || h.includes('tyo') || h.includes('nrt')) return { icon: '🇯🇵', name: '日本节点' };
    if (h.includes('ap-northeast-2') || h.includes('asia-northeast3') || h.includes('koreacentral') || h.includes('koreasouth') || h.includes('kr') || h.includes('icn')) return { icon: '🇰🇷', name: '韩国节点' };
    if (h.includes('ap-southeast-2') || h.includes('australiaeast') || h.includes('australiasoutheast') || h.includes('au') || h.includes('syd')) return { icon: '🇦🇺', name: '澳洲节点' };
    if (h.includes('eu-west-2') || h.includes('europe-west2') || h.includes('uksouth') || h.includes('ukwest') || h.includes('uk') || h.includes('lhr') || h.includes('london')) return { icon: '🇬🇧', name: '英国节点' };
    if (h.includes('eu-central-1') || h.includes('europe-west3') || h.includes('germanywestcentral') || h.includes('de') || h.includes('fra') || h.includes('germany')) return { icon: '🇩🇪', name: '德国节点' };
    if (h.includes('us-east') || h.includes('us-west') || h.includes('us-central') || h.includes('eastus') || h.includes('westus') || h.includes('centralus') || h.includes('us') || h.includes('america')) return { icon: '🇺🇸', name: '美国节点' };

    return { icon: '🌐', name: '自定义节点' };
}

// 终极脱敏引擎：隐藏主域名，保留前缀。如 us.emby.xxx.com -> us.emby.***.com
function maskDomain(host) {
    if (!host || !host.includes('.')) return host;
    const parts = host.split('.');
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2) {
        if (parts[1].toLowerCase() === 'emby') {
            return `${firstPart}.emby.***.${lastPart}`;
        }
        return `${firstPart}.***.${lastPart}`;
    }
    return `${firstPart.substring(0, 3)}***.${lastPart}`;
}

async function generateTgReport(env, ctx) {
    let todayCount = 0, universalCount = 0, topUniversalNode = "无记录", topUniLocation = "无记录", topLocation = "无记录", topNode = "无记录", recentLogs = [], regionRows = [];
    const nowTimestamp = new Date(Date.now() + 8 * 3600000).toISOString().replace("T", " ").split(".")[0];
    
    if (env.DB) {
        try {
            const todayRow = await env.DB.prepare("SELECT count(*) as c FROM visitor_logs WHERE datetime(timestamp) >= datetime('now', '-24 hours')").first();
            if (todayRow) todayCount = todayRow.c;
            const uniRow = await env.DB.prepare("SELECT count(*) as c FROM visitor_logs WHERE datetime(timestamp) >= datetime('now', '-24 hours') AND prefix LIKE '%通用%'").first();
            if (uniRow) universalCount = uniRow.c;
            const topUniLocRow = await env.DB.prepare("SELECT country, COUNT(*) as c FROM visitor_logs WHERE datetime(timestamp) >= datetime('now', '-7 days') AND prefix LIKE '%通用%' GROUP BY country ORDER BY c DESC LIMIT 1").first();
            if (topUniLocRow && topUniLocRow.country) topUniLocation = `${getFlagEmoji(topUniLocRow.country)} <b>${topUniLocRow.country}</b> (共 <code>${topUniLocRow.c}</code> 次)`;
            
            const topUniRow = await env.DB.prepare("SELECT prefix, COUNT(*) as c FROM visitor_logs WHERE datetime(timestamp) >= datetime('now', '-24 hours') AND prefix LIKE '%通用%' GROUP BY prefix ORDER BY c DESC LIMIT 1").first();
            if (topUniRow && topUniRow.prefix) {
                let cleanHost = topUniRow.prefix.replace('通用:', '').replace('通用: ', '').trim();
                let rInfo = parseCloudRegion(cleanHost);
                // 去除“自定义节点”等字样，极其纯净
                topUniversalNode = `${rInfo.icon} <b>${maskDomain(cleanHost)}</b> (共 <code>${topUniRow.c}</code> 次)`;
            }

            const locRow = await env.DB.prepare("SELECT country, COUNT(*) as c FROM visitor_logs WHERE datetime(timestamp) >= datetime('now', '-7 days') GROUP BY country ORDER BY c DESC LIMIT 1").first();
            if (locRow && locRow.country) topLocation = `${getFlagEmoji(locRow.country)} <b>${locRow.country}</b> (共 <code>${locRow.c}</code> 次)`;
            
            const nodeRow = await env.DB.prepare("SELECT prefix, COUNT(*) as c FROM visitor_logs WHERE datetime(timestamp) >= datetime('now', '-7 days') AND prefix NOT LIKE '%通用%' GROUP BY prefix ORDER BY c DESC LIMIT 1").first();
            if (nodeRow && nodeRow.prefix) {
                let rInfo = parseCloudRegion(nodeRow.prefix);
                // 去除“自定义节点”等字样，极其纯净
                topNode = `${rInfo.icon} <b>${maskDomain(nodeRow.prefix)}</b> (共 <code>${nodeRow.c}</code> 次)`;
            }

            const rReq = await env.DB.prepare("SELECT region, COUNT(*) as c FROM region_hits WHERE datetime(timestamp) >= datetime('now', '-24 hours') GROUP BY region ORDER BY c DESC").all();
            if (rReq && rReq.results) regionRows = rReq.results;
            const logsReq = await env.DB.prepare("SELECT timestamp, prefix, ip, country, ua FROM visitor_logs ORDER BY timestamp DESC LIMIT 5").all();
            if (logsReq && logsReq.results) recentLogs = logsReq.results;
        } catch (e) {}
    }
    let t24 = "未知", t7 = "未知", t30 = "未知";
    try {
        const mockReq = new Request("https://localhost/api/analytics", { method: "GET", headers: { "Cookie": `admin_token=${env.ADMIN_TOKEN}` } });
        const mockRes = await originalWorker.fetch(mockReq, env, ctx);
        if (mockRes.ok) {
            const data = await mockRes.json();
            if (data.success) { t24 = data.traffic24h || t24; t7 = data.traffic7d || t7; t30 = data.traffic30d || t30; }
        }
    } catch(e) {}

    let msg = `📊 <b>Emby 播放数据统计报表</b>\n<i>🕒 统计时间: ${nowTimestamp}</i>\n\n`;
    msg += `📈 <b>【 播放数据 (近24H) 】</b>\n├ ▶️ 总播放次数: <code>${todayCount}</code> 次\n├ 🔗 通用反代: <code>${universalCount}</code> 次\n├ 🌍 通用最多访问: ${topUniLocation}\n└ 🔥 最热反代目标: ${topUniversalNode}\n\n`;
    
    // 按大哥要求：显示国家名 + 域名脱敏
    msg += `📍 <b>【 地区节点负载 (近24H) 】</b>\n`;
    if (regionRows.length > 0) { 
        regionRows.forEach((r, idx) => { 
            let rInfo = parseCloudRegion(r.region); 
            let masked = maskDomain(r.region);
            msg += `${idx === regionRows.length - 1 ? "└" : "├"} 📡 ${rInfo.icon} ${rInfo.name} (<code>${masked}</code>) : <code>${r.c}</code> 次\n`; 
        }); 
    } else { 
        msg += `└ 📡 暂无数据\n`; 
    }
    
    msg += `\n🏆 <b>【 热门统计 (近7天) 】</b>\n├ 🌍 最多访问地区: ${topLocation}\n└ 🚀 最热线路节点: ${topNode}\n\n`;
    msg += `🌐 <b>【 主域名流量消耗 】</b>\n├ ⏳ 近 24 小时内: <code>${t24}</code>\n├ 📅 近  7  天内: <code>${t7}</code>\n└ 🗓 近 30 天内: <code>${t30}</code>\n`;
    
    if (recentLogs.length > 0) {
        msg += `\n📜 <b>【 最近 ${recentLogs.length} 次播放记录 】</b>`;
        recentLogs.forEach((log) => { 
            let rawPrefix = log.prefix || 'Unknown';
            let isUni = rawPrefix.includes('通用:');
            let cleanHost = rawPrefix.replace('通用:', '').replace('通用: ', '').trim();
            let regionInfo = parseCloudRegion(cleanHost);
            let maskedHost = maskDomain(cleanHost);
            let targetType = isUni ? '🔗 通用反代至' : '🎯 目标节点';

            msg += `\n\n▶️ <b>时间</b>: ${log.timestamp || '刚刚'}\n├ 📌 <b>${targetType}</b>: <code>${maskedHost}</code> (${regionInfo.icon} ${regionInfo.name})\n├ 🌍 <b>访客地区</b>: ${getFlagEmoji(log.country)} ${log.country}\n├ 🌐 <b>访客IP</b>: <code>${log.ip}</code>\n└ 📱 <b>设备</b>: <code>${log.ua || 'Unknown'}</code>`; 
        });
    }
    return msg;
}

export default {
  async scheduled(event, env, ctx) {
    let dbTgToken = null, dbTgChatId = null;
    if (env.DB) {
      try {
        const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'TG_BOT_TOKEN'").first();
        const chatRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'TG_CHAT_ID'").first();
        if (tokenRow) dbTgToken = tokenRow.value;
        if (chatRow) dbTgChatId = chatRow.value;
      } catch (e) {}
    }
    const token = dbTgToken || env.TG_BOT_TOKEN;
    const chatId = dbTgChatId || env.TG_CHAT_ID;
    if (token && chatId) {
        ctx.waitUntil((async () => {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: await generateTgReport(env, ctx), parse_mode: "HTML" }) });
        })());
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let decodedPath = url.pathname;
    try { decodedPath = decodeURIComponent(url.pathname); } catch(e) {}
    const currentHost = url.hostname;

    if (env.DB) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)").run().catch(() => {});
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS cluster_nodes_v5 (host TEXT PRIMARY KEY, url TEXT, region TEXT, updated_at DATETIME)").run().catch(() => {});
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS region_hits (timestamp DATETIME, region TEXT)").run().catch(() => {});
    }

    let dbTgToken = null, dbTgChatId = null;
    if (env.DB) {
      try {
        const tokenRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'TG_BOT_TOKEN'").first();
        const chatRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'TG_CHAT_ID'").first();
        if (tokenRow) dbTgToken = tokenRow.value;
        if (chatRow) dbTgChatId = chatRow.value;
      } catch (e) {}
    }

    const proxyEnv = new Proxy(env, {
      get(target, prop) {
        if (prop === 'TG_BOT_TOKEN' && dbTgToken) return dbTgToken;
        if (prop === 'TG_CHAT_ID' && dbTgChatId) return dbTgChatId;
        return target[prop];
      }
    });

    if (decodedPath.toLowerCase().includes('/playbackinfo') && env.DB && ctx && ctx.waitUntil) {
        ctx.waitUntil((async () => {
          try {
            const timestamp = new Date(Date.now() + 8 * 3600000).toISOString().replace("T", " ").split(".")[0];
            await env.DB.prepare("INSERT INTO region_hits (timestamp, region) VALUES (?, ?)").bind(timestamp, currentHost).run().catch(()=>{});
            const isUniversal = decodedPath.includes('/http://') || decodedPath.startsWith('/https://');
            if (isUniversal) {
              const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Real-IP") || "Unknown";
              const country = request.headers.get("CF-IPCountry") || "Unknown";
              const ua = request.headers.get("User-Agent") || "Unknown";
              let targetHost = "通用反代";
              try { let targetUrlObj = new URL(decodedPath.substring(1)); targetHost = "通用: " + targetUrlObj.host; } catch(e) {}
              await env.DB.prepare("INSERT INTO visitor_logs (timestamp, prefix, ip, country, ua) VALUES (?, ?, ?, ?, ?)").bind(timestamp, targetHost, ip, country, ua).run();
            }
          } catch (err) {}
        })());
    }

    if (request.method === "POST" && request.headers.get("content-type")?.includes("application/json")) {
      try {
        const clonedReq = request.clone();
        const body = await clonedReq.json();
        if (body?.message?.text && (body.message.text === "/stats" || body.message.text.startsWith("/stats@"))) {
            const token = dbTgToken || env.TG_BOT_TOKEN;
            if (token) {
                ctx.waitUntil((async () => {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: body.message.chat.id, text: await generateTgReport(env, ctx), parse_mode: "HTML" }) });
                })());
            }
            return new Response("OK");
        }
      } catch (e) {}
    }

    if (url.pathname === "/api/get-cluster" && request.method === "GET") {
        if (!env.DB) return Response.json({ success: false, data: [] });
        try {
            const { results } = await env.DB.prepare("SELECT * FROM cluster_nodes_v5 ORDER BY host ASC").all();
            const validNodes = results.filter(item => !item.host.includes('.workers.dev'));
            return Response.json({ success: true, data: validNodes });
        } catch(e) { return Response.json({ success: false, data: [] }); }
    }

    if (url.pathname === "/api/get-universal" && request.method === "GET") {
        if (!env.DB) return Response.json({ success: false, data: [] });
        try {
            const { results } = await env.DB.prepare(`SELECT prefix, MAX(timestamp) as lastActive, COUNT(*) as playCount, (SELECT country FROM visitor_logs v2 WHERE v2.prefix = v1.prefix GROUP BY country ORDER BY COUNT(*) DESC LIMIT 1) as topCountry FROM visitor_logs v1 WHERE prefix LIKE '%通用%' GROUP BY prefix ORDER BY lastActive DESC`).all();
            return Response.json({ success: true, data: results });
        } catch(e) { return Response.json({ success: false, data: [] }); }
    }

    if (url.pathname === "/api/del-universal" && request.method === "POST") {
        if (!env.DB) return Response.json({ success: false });
        try {
            const body = await request.json();
            if (body.prefix) await env.DB.prepare("DELETE FROM visitor_logs WHERE prefix = ?").bind(body.prefix).run();
            return Response.json({ success: true });
        } catch(e) { return Response.json({ success: false, error: e.message }); }
    }

    if (url.pathname === "/api/get-tg" && request.method === "GET") return Response.json({ success: true, token: dbTgToken || "", chatId: dbTgChatId || "" });

    if (url.pathname === "/api/save-tg" && request.method === "POST") {
      if (!env.DB) return Response.json({ success: false, error: "未绑定 D1" });
      try {
        const data = await request.json();
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('TG_BOT_TOKEN', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(data.token || "").run();
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('TG_CHAT_ID', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(data.chatId || "").run();
        return Response.json({ success: true });
      } catch (e) { return Response.json({ success: false, error: e.message }); }
    }

    if (url.pathname === "/api/test-tg" && request.method === "POST") {
      try {
        const data = await request.json();
        const token = data.token || dbTgToken || env.TG_BOT_TOKEN;
        const chatId = data.chatId || dbTgChatId || env.TG_CHAT_ID;
        if (!token || !chatId) return Response.json({ success: false, error: "未配置" });
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: "🚀 <b>面板连通性测试成功！</b>\n\n" + await generateTgReport(env, ctx), parse_mode: "HTML" }) });
        const tgData = await tgRes.json();
        if (!tgData.ok) throw new Error(tgData.description);
        return Response.json({ success: true });
      } catch (e) { return Response.json({ success: false, error: e.message }); }
    }

    const response = await originalWorker.fetch(request, proxyEnv, ctx);
    const isMainPage = decodedPath === '/' || decodedPath.toLowerCase().startsWith('/web/index.html');
    const isHTML = response.headers.get("Content-Type")?.includes("text/html");

    if (isMainPage && isHTML && response.status === 200) {
      
      if (env.DB && ctx && ctx.waitUntil && !currentHost.includes('.workers.dev')) {
          ctx.waitUntil((async () => {
              let physicalRegion = "🌍 全球边缘节点";
              try {
                  const traceRes = await fetch('https://cloudflare.com/cdn-cgi/trace');
                  const traceText = await traceRes.text();
                  const locMatch = traceText.match(/loc=([A-Z]{2})/);
                  if (locMatch && locMatch[1]) {
                      const locCode = locMatch[1];
                      if (locCode === 'SG') physicalRegion = '🇸🇬 新加坡节点';
                      else if (locCode === 'US') physicalRegion = '🇺🇸 美国节点';
                      else if (locCode === 'HK') physicalRegion = '🇭🇰 香港节点';
                      else if (locCode === 'TW') physicalRegion = '🇹🇼 台湾节点';
                      else if (locCode === 'JP') physicalRegion = '🇯🇵 日本节点';
                      else if (locCode === 'KR') physicalRegion = '🇰🇷 韩国节点';
                      else if (locCode === 'GB') physicalRegion = '🇬🇧 英国节点';
                      else if (locCode === 'DE') physicalRegion = '🇩🇪 德国节点';
                      else if (locCode === 'CA') physicalRegion = '🇨🇦 加拿大节点';
                      else if (locCode === 'AU') physicalRegion = '🇦🇺 澳洲节点';
                      else physicalRegion = `${getFlagEmoji(locCode)} ${locCode}节点`;
                  }
              } catch(e) {}
              await env.DB.prepare("INSERT INTO cluster_nodes_v5 (host, url, region, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(host) DO UPDATE SET url=excluded.url, region=excluded.region, updated_at=CURRENT_TIMESTAMP").bind(currentHost, url.origin, physicalRegion).run().catch(()=>{});
          })());
      }

      let html = await response.text();
      const newHeaders = new Headers(response.headers);
      newHeaders.delete("Content-Length"); 
      newHeaders.delete("Content-Encoding"); 
      
      if (html.includes('</body>')) {
          const injectScript = `
          <style>
              .uni-scroll-container::-webkit-scrollbar { height: 6px; }
              .uni-scroll-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
              
              /* 去除了 pointer-events: none，保证任何元素均可点击交互 */
              .cluster-btn { padding: 12px; border-radius: 10px; background: var(--card); border: 1px solid var(--border); min-width: 250px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
              .cluster-btn.active { border: 1px solid var(--primary); box-shadow: 0 4px 12px rgba(0,113,227,0.15); }
              
              /* 地区名字：悬停变色加下划线，指示可切换 */
              .region-title { font-size: 15px; font-weight: bold; margin-bottom: 2px; text-align: center; cursor: pointer; transition: color 0.2s; }
              .region-title:hover { color: var(--primary); text-decoration: underline; }

              /* 网址框：强制复制 */
              .copy-box { background: rgba(0, 122, 255, 0.08); border: 1px dashed var(--primary); color: var(--primary); padding: 8px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: 600; text-align: center; cursor: pointer; transition: all 0.2s; user-select: none; }
              .copy-box:hover { background: var(--primary); color: white; border-style: solid; box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3); }
              
              .tg-eye-icon { stroke: var(--text); opacity: 0.5; transition: opacity 0.2s; }
              .tg-eye-icon:hover { opacity: 1; }
          </style>
          <script>
          document.addEventListener("DOMContentLoaded", () => {
              const injectHTML = \`
                  <div id="my-custom-panel-wrapper">
                      <!-- 地区节点面板 -->
                      <div class="emby-card" data-search="多地区 面板 节点 集群 提取 复制" style="margin-top: 20px; border: 1px solid var(--border);">
                          <div class="card-header" style="border-bottom: none; padding-bottom: 0;">
                              <div class="card-title-group">
                                  <div style="font-weight: 600; font-size: 16px; color: var(--text);">🌐 地区节点自动发现与管理</div>
                              </div>
                          </div>
                          <div id="cluster-switcher-container" style="display:flex; gap:16px; flex-wrap:wrap; padding: 15px 0 5px 0;">
                              <div style="color:var(--text-sec); font-size: 13px;">正在探测地区节点...</div>
                          </div>
                          <div style="font-size: 12px; color: var(--text-sec); line-height: 1.5; margin-top: 10px; border-top: 1px dashed var(--border); padding-top: 10px;">
                              * 提示：系统已锁定所有物理机房位置。<b>点击上方国家名称可无缝切换节点面板，点击蓝色网址框可一键复制。</b>
                          </div>
                      </div>

                      <!-- TG 设置 -->
                      <div class="emby-card" data-search="telegram tg bot 设置 通知 播报" style="margin-top: 20px; border: 1px solid var(--border);">
                          <div class="card-header"><div class="card-title-group"><div style="font-weight: 600; font-size: 16px; color: var(--text);">🤖 Telegram 通知</div></div></div>
                          <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
                              <div style="position: relative;">
                                  <input type="password" id="tgToken" placeholder="TG Bot Token" style="padding: 12px 40px 12px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); width: 100%; box-sizing: border-box;">
                                  <span onclick="toggleTgVis('tgToken')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; display: flex; align-items: center;" title="显示/隐藏">
                                      <svg class="tg-eye-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                  </span>
                              </div>
                              <div style="position: relative;">
                                  <input type="password" id="tgChatId" placeholder="TG Chat ID" style="padding: 12px 40px 12px 16px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); width: 100%; box-sizing: border-box;">
                                  <span onclick="toggleTgVis('tgChatId')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; display: flex; align-items: center;" title="显示/隐藏">
                                      <svg class="tg-eye-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                  </span>
                              </div>
                              <div style="display:flex; gap:10px;">
                                  <button onclick="saveTgSettings()" class="btn-edit" style="flex:1;">💾 保存配置</button>
                                  <button onclick="testTgMessage()" class="btn-edit" style="flex:1; background:rgba(52,199,89,0.1); color:#34c759;">📊 发送测试报表</button>
                              </div>
                          </div>
                      </div>

                      <!-- 通用反代记录 -->
                      <div class="emby-card" data-search="通用反代 收集 库 记录" style="margin-top: 20px; border: 1px solid var(--border);">
                          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: none; padding-bottom: 0;">
                              <div class="card-title-group"><div style="font-weight: 600; font-size: 16px; color: var(--text);">🌍 通用反代地址收集库</div></div>
                              <button class="btn-submit" onclick="pingAllUniversal()" style="background:#32ade6; padding: 6px 12px; font-size: 12px; border-radius: 8px;">⚡ 全局测速</button>
                          </div>
                          <div id="uni-nodes-container" class="uni-scroll-container" style="display: flex; gap: 16px; overflow-x: auto; padding: 15px 0 5px 0; scrollbar-width: thin;">
                              <div style="color:var(--text-sec); font-size: 13px;">加载中...</div>
                          </div>
                      </div>
                  </div>
              \`;

              const observer = new MutationObserver(() => {
                  const targetNode = document.getElementById('addForm') || document.getElementById('list-grid');
                  if (targetNode && !document.getElementById('my-custom-panel-wrapper')) {
                      const wrapper = document.createElement('div');
                      wrapper.innerHTML = injectHTML;
                      targetNode.parentNode.insertBefore(wrapper, targetNode.nextSibling);
                      
                      fetch('/api/get-tg').then(r => r.json()).then(d => {
                          if(d.success) {
                              if(d.token) document.getElementById('tgToken').value = d.token;
                              if(d.chatId) document.getElementById('tgChatId').value = d.chatId;
                          }
                      }).catch(e => {});

                      loadCluster();
                      loadUniversalNodes();
                  }
              });
              observer.observe(document.body, { childList: true, subtree: true });
          });

          window.toggleTgVis = function(id) {
              const el = document.getElementById(id);
              if(el) el.type = el.type === 'password' ? 'text' : 'password';
          };

          window.forceCopyUrl = function(url) {
              try {
                  const tempInput = document.createElement("input");
                  tempInput.value = url;
                  document.body.appendChild(tempInput);
                  tempInput.select();
                  document.execCommand("copy");
                  document.body.removeChild(tempInput);
                  alert('✅ 已成功复制节点地址：\\n' + url);
              } catch (e) {
                  prompt('⚠️ 请手动复制以下地址:', url);
              }
          };

          window.loadCluster = async function() {
              try {
                  const res = await fetch('/api/get-cluster');
                  const d = await res.json();
                  const container = document.getElementById('cluster-switcher-container');
                  
                  const validData = d.data ? d.data.filter(item => !item.host.includes('.workers.dev')) : [];
                  
                  if(!d.success || validData.length === 0) {
                      container.innerHTML = '<div style="color:var(--text-sec); font-size: 13px;">暂未发现地区节点。</div>';
                      return;
                  }
                  
                  let html = '';
                  const currentHost = window.location.hostname;
                  
                  validData.forEach(item => {
                      const isCurrent = item.host === currentHost;
                      const fullUrl = "https://" + item.host;
                      const targetPath = item.url + window.location.pathname + window.location.search;
                      
                      html += \`
                      <div class="cluster-btn \${isCurrent ? 'active' : ''}">
                          
                          <!-- 需求：点击国家名无缝切换节点面板 -->
                          <div class="region-title" 
                               \${!isCurrent ? 'onclick="window.location.href=\\'' + targetPath + '\\'"' : ''} 
                               title="\${!isCurrent ? '点击无缝切换到该节点面板' : '您当前正在此节点'}">
                              \${item.region} \${isCurrent ? '<span style="font-size:12px; color:var(--primary); font-weight:normal; margin-left:4px;">(当前所在)</span>' : ''}
                          </div>
                          
                          <!-- 需求：点击蓝框直接复制域名 -->
                          <div class="copy-box" onclick="forceCopyUrl('\${fullUrl}')" title="点击一键复制完整的节点地址">
                              \${fullUrl}
                          </div>

                          <div style="width: 100%; border-top: 1px solid rgba(120,120,120,0.1); padding-top: 6px; margin-top: 2px;">
                              <button onclick="extractToForm('\${item.host}', '\${fullUrl}')" style="background: rgba(52,199,89,0.1); color: #34c759; border: none; padding: 6px; border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%; font-weight: 600; transition:0.2s;">✍️ 提取为通用反代</button>
                          </div>
                      </div>
                      \`;
                  });
                  container.innerHTML = html;
              } catch(e) {}
          };

          window.extractToForm = function(host, url) {
              const prefixInput = document.getElementById('prefix');
              const targetInputs = document.querySelectorAll('.target-input');
              const remarkInput = document.getElementById('remark');
              
              if(prefixInput) {
                  let shortName = host.split('.')[0];
                  if(shortName === host) shortName = 'node';
                  prefixInput.value = shortName;
              }
              if(targetInputs.length > 0) targetInputs[0].value = url;
              if(remarkInput) remarkInput.value = '地区节点: ' + host;
              
              const form = document.getElementById('addForm');
              if(form) {
                  window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
                  if(typeof showToast === 'function') showToast('✅ 节点已成功提取！请点击下方"保存"按钮。');
                  else alert('✅ 节点已提取至表单，请保存。');
              } else {
                  alert('未找到反代添加表单，请确认您在"代理设置"页面。');
              }
          };

          window.getFlagEmoji = function(countryCode) {
              if (!countryCode || countryCode === 'Unknown' || countryCode === 'XX') return '❓';
              if (!/^[a-zA-Z]{2}$/.test(countryCode)) return '🏳️‍🌈';
              const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
              return String.fromCodePoint(...codePoints);
          };

          window.saveTgSettings = async function() {
              const token = document.getElementById('tgToken').value.trim();
              const chatId = document.getElementById('tgChatId').value.trim();
              try {
                  const res = await fetch('/api/save-tg', { method: 'POST', body: JSON.stringify({ token, chatId }) });
                  const d = await res.json();
                  if(d.success) (typeof showToast === 'function' ? showToast : alert)('✅ 保存成功');
              } catch(e) {}
          };

          window.testTgMessage = async function() {
              const token = document.getElementById('tgToken').value.trim();
              const chatId = document.getElementById('tgChatId').value.trim();
              try {
                  const res = await fetch('/api/test-tg', { method: 'POST', body: JSON.stringify({ token, chatId }) });
                  const d = await res.json();
                  if(d.success) (typeof showToast === 'function' ? showToast : alert)('✅ 发送成功，请查看 TG');
              } catch(e) {}
          };

          window.loadUniversalNodes = async function() {
              try {
                  const res = await fetch('/api/get-universal');
                  const d = await res.json();
                  const container = document.getElementById('uni-nodes-container');
                  if(!d.success || !d.data || d.data.length === 0) {
                      container.innerHTML = '<div style="color:var(--text-sec); font-size: 13px;">暂无外部访问记录。</div>';
                      return;
                  }
                  
                  let html = '';
                  d.data.forEach((item, index) => {
                      let host = item.prefix.replace('通用: ', '').trim();
                      let targetUrl = 'https://' + host; 
                      let locStr = item.topCountry === 'Unknown' ? '未知' : window.getFlagEmoji(item.topCountry) + ' ' + item.topCountry;

                      html += \`
                      <div style="min-width: 250px; background: rgba(120,120,120,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                          <div style="font-weight: 600; font-size: 14px; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${host}</div>
                          <div style="display: flex; justify-content: space-between; font-size: 12px; align-items: center;">
                              <span style="color: var(--text-sec);">节点延迟:</span>
                              <span id="uni-ping-\${index}" data-target="\${targetUrl}" onclick="pingUniversal(\${index}, '\${targetUrl}')" style="cursor:pointer; color: var(--text-sec); background: var(--card); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border);">测速中...</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; font-size: 12px;">
                              <span style="color: var(--text-sec);">真实播放:</span><span style="color: #34c759; font-weight: 600;">\${item.playCount} 次</span>
                          </div>
                          <div style="display: flex; justify-content: space-between; font-size: 12px;">
                              <span style="color: var(--text-sec);">主要受众:</span><span style="color: var(--text-sec);">\${locStr}</span>
                          </div>
                          <div style="display: flex; gap: 8px; margin-top: auto; border-top: 1px dashed var(--border); padding-top: 12px;">
                              <button onclick="extractToForm('\${host}', '\${targetUrl}')" class="btn-edit" style="flex: 1; padding: 6px; font-size: 12px;">✍️ 提档转正</button>
                              <button onclick="delUniversal('\${item.prefix}')" class="btn-del" style="flex: 1; padding: 6px; font-size: 12px;">🗑️ 删除</button>
                          </div>
                      </div>\`;
                  });
                  container.innerHTML = html;
                  d.data.forEach((item, index) => { setTimeout(() => pingUniversal(index, 'https://' + item.prefix.replace('通用: ', '').trim()), 500 * index); });
              } catch(e) {}
          };

          window.pingUniversal = async function(idx, target) {
              const badge = document.getElementById('uni-ping-' + idx);
              if(!badge) return;
              badge.textContent = '测速中...';
              const start = performance.now();
              try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 2000);
                  await fetch(target + '/web/index.html', { mode: 'no-cors', signal: controller.signal });
                  clearTimeout(timeoutId);
                  const ms = Math.round(performance.now() - start);
                  badge.textContent = ms + ' ms';
                  badge.style.color = ms < 300 ? '#34c759' : (ms < 800 ? 'var(--primary)' : '#ff9500');
              } catch(e) {
                  badge.textContent = '超时';
                  badge.style.color = '#ff3b30';
              }
          };

          window.pingAllUniversal = function() {
              document.querySelectorAll('[id^="uni-ping-"]').forEach((badge, idx) => {
                  const target = badge.getAttribute('data-target');
                  if(target) setTimeout(() => pingUniversal(badge.id.replace('uni-ping-', ''), target), 300 * idx);
              });
          };

          window.delUniversal = async function(prefix) {
              if(!confirm('确定删除该访问记录吗？')) return;
              await fetch('/api/del-universal', { method: 'POST', body: JSON.stringify({ prefix }) });
              loadUniversalNodes();
          };
          </script>
          `;
          html = html.replace('</body>', injectScript + '\n</body>');
      }

      return new Response(html, { status: response.status, statusText: response.statusText, headers: newHeaders });
    }
    return response;
  }
};
