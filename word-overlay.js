/**
 * word-overlay.js —— 小恐龙「英语单词」学习外挂（零侵入）
 *
 * 设计原则：
 *   1. 一句话都不改 index.js。所有逻辑通过包装 window.Runner.prototype 上的
 *      update / restart / gameOver 三个方法挂进去，原版跑、跳、仙人掌、碰撞、
 *      计分、死亡、重开逻辑完全不受影响。
 *   2. 单词的移动距离 = 原版 distanceRan 的每帧增量，所以和仙人掌同一水平路径、
 *      同一速度（哪怕以后把游戏整体速度从 0.5 改成别的，单词自动跟着一致）。
 *   3. 碰到单词不接触原版碰撞函数：原版 checkForCollision 只处理仙人掌，
 *      这里另外用矩形相交判定单词，命中就加分 + 弹窗，不会游戏结束。
 *
 * 调试接口（控制台可用）：window.WordOverlay
 *   WordOverlay.state()      当前学习积分 / 在场单词
 *   WordOverlay.spawnNow()   立刻生成一个单词
 *   WordOverlay.reset()      清空状态
 */
(function () {
    'use strict';

    /* ================================================================
     * 1. 单词库（整套合并）
     * ================================================================ */
    var WORDS = [
        /* Unit 1 城市与乡村 */
        { en: 'city', cn: '城市' },
        { en: 'country', cn: '乡村；国家' },
        { en: 'flat', cn: '公寓' },
        { en: 'house', cn: '房子' },
        { en: 'building', cn: '楼房' },
        { en: 'street', cn: '街道' },
        { en: 'bedroom', cn: '卧室' },
        { en: 'kitchen', cn: '厨房' },
        { en: 'living room', cn: '客厅' },
        { en: 'live', cn: '居住' },
        /* Unit 2 动物与家 */
        { en: 'eagle', cn: '鹰' },
        { en: 'owl', cn: '猫头鹰' },
        { en: 'honeybee', cn: '蜜蜂' },
        { en: 'nest', cn: '鸟巢' },
        { en: 'hive', cn: '蜂巢' },
        { en: 'tree hole', cn: '树洞' },
        { en: 'rabbit', cn: '兔子' },
        { en: 'frog', cn: '青蛙' },
        { en: 'snake', cn: '蛇' },
        { en: 'safe', cn: '安全的' },
        { en: 'at night', cn: '在夜晚' },
        /* Unit 3 数字 */
        { en: 'plus', cn: '加' },
        { en: 'minus', cn: '减' },
        { en: 'equal', cn: '等于' },
        { en: 'answer', cn: '答案' },
        { en: 'odd numbers', cn: '奇数' },
        { en: 'even numbers', cn: '偶数' },
        { en: 'count', cn: '数数' },
        { en: 'every day', cn: '每天' },
        { en: 'use', cn: '使用' },
        { en: 'help', cn: '帮助' },
        { en: 'thing', cn: '事物' },
        /* Unit 4 购物 */
        { en: 'supermarket', cn: '超市' },
        { en: 'rice', cn: '大米' },
        { en: 'egg', cn: '鸡蛋' },
        { en: 'juice', cn: '果汁' },
        { en: 'bread', cn: '面包' },
        { en: 'candy', cn: '糖果' },
        { en: 'buy', cn: '购买' },
        { en: 'need', cn: '需要' },
        { en: 'sell', cn: '售卖' },
        { en: 'shopping list', cn: '购物清单' },
        /* Unit 5 集体 */
        { en: 'share', cn: '分享' },
        { en: 'team', cn: '小组；队伍' },
        { en: 'win', cn: '获胜' },
        { en: 'still', cn: '仍然' },
        /* Unit 6 季节 */
        { en: 'spring', cn: '春天' },
        { en: 'summer', cn: '夏天' },
        { en: 'autumn', cn: '秋天' },
        { en: 'winter', cn: '冬天' },
        { en: 'warm', cn: '温暖的' },
        { en: 'hot', cn: '炎热的' },
        { en: 'cool', cn: '凉爽的' },
        { en: 'cold', cn: '寒冷的' },
        { en: 'season', cn: '季节' },
        { en: 'leaf', cn: '叶子' },
        { en: 'snow', cn: '雪' },
        { en: 'rain', cn: '雨' },
        /* Unit 7 植物 */
        { en: 'plant', cn: '种植' },
        { en: 'seed', cn: '种子' },
        { en: 'soil', cn: '土壤' },
        { en: 'root', cn: '根' },
        { en: 'stem', cn: '茎' },
        { en: 'flower', cn: '花' },
        { en: 'fruit', cn: '果实' },
        { en: 'sunflower', cn: '向日葵' },
        { en: 'grow', cn: '生长' },
        { en: 'water', cn: '浇水' },
        { en: 'amazing', cn: '奇妙的' },
        /* Unit 8 道路与生活 */
        { en: 'road', cn: '马路' },
        { en: 'traffic lights', cn: '交通灯' },
        { en: 'cross', cn: '穿过' },
        { en: 'wait', cn: '等待' },
        { en: 'left', cn: '左边' },
        { en: 'right', cn: '右边' },
        { en: 'should', cn: '应该' },
        { en: 'sign', cn: '标识' },
        { en: 'car', cn: '小汽车' },
        { en: 'skate', cn: '滑行' },
        { en: 'road safety rules', cn: '道路安全规则' },
        /* 生活用语 */
        { en: 'grandparent', cn: '(外)祖父母' },
        { en: 'go shopping', cn: '去购物' },
        { en: 'go for a walk', cn: '散步' },
        { en: 'do exercise', cn: '锻炼身体' },
        { en: 'do housework', cn: '做家务' },
        { en: 'do gardening', cn: '打理花园' },
        { en: 'use the Internet', cn: '上网' },
        { en: 'tidy up', cn: '整理' },
        { en: 'do tai chi', cn: '打太极' }
    ];

    /* ================================================================
     * 2. 可调参数
     * ================================================================ */
    var CFG = {
        spawnIntervalSec: 3.0,   // 平均每几秒出现一个单词（按实测像素速度自动折算间距）
        gapJitter: 0.3,          // 间距随机浮动 ±30%，避免节奏机械
        minGapPx: 420,           // 最小间距（像素），防止扎堆
        maxGapPx: 1600,
        maxOnScreen: 3,          // 同时最多几个单词
        recentMemory: 8,         // 最近 N 个单词不重复
        cardFontShort: 'bold 13px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
        cardFontLong: 'bold 10px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
        cardLongLimit: 11,       // 超过这个字符数用小字号
        cardFg: '#1b4f72',
        cardHalo: 'rgba(255, 255, 255, 0.92)',
        cardHeight: 18,          // 拾取卡高度（小字号配套）
        cardHeightLong: 15,
        /* 拾取卡纵向范围：相对恐龙站立 yPos 的偏移
         * 上限 -66 ≈ 实测跳跃顶点（真实物理跑到 yPos≈7，即 86px 高，留 20px 余量）
         * 下限 +16 ≈ 贴近地面；两档之间全部落在恐龙可碰撞区间
         * 三档随机（高 / 中 / 低），高位限定在顶盒 12~50 内，保证够得着 */
        bandTopOffset: -66,
        bandBottomOffset: 16,
        popupCenterRatio: 0.26,  // 常驻弹窗纵向位置（0=画布顶，0.5=正中），上移避开仙人掌区
        goStatsCenterRatio: 0.44, // 结算面板里「单词个数｜记录」那行的纵向位置（GAME OVER 文字与重启按钮之间）
        scoreFg: '#0f7b3f',
        recordFg: '#e07b00',

        /* 单词朗读（浏览器自带 speechSynthesis，离线可用）
         * rate 1.0 = 正常语速 */
        tts: {
            enabled: true,
            lang: 'en-US',
            rate: 1.0,
            pitch: 1.05,
            volume: 1.0
        }
    };

    /* ================================================================
     * 3. 状态
     * ================================================================ */
    var S = null;

    // 历史最高单词记录（跨局、跨刷新持久化；localStorage 不可用时退化为内存）
    var PERSIST_KEY = 'trex_word_best_v1';

    function loadBest() {
        try {
            var v = parseInt(window.localStorage.getItem(PERSIST_KEY), 10);
            return (isFinite(v) && v > 0) ? v : 0;
        } catch (e) {
            return 0;
        }
    }

    function saveBest(v) {
        try {
            window.localStorage.setItem(PERSIST_KEY, String(v));
        } catch (e) { /* file:// 或隐私模式下静默失败 */ }
    }

    function newState(best) {
        return {
            words: [],          // 在场单词
            score: 0,           // 本局拾取单词个数
            best: (typeof best === 'number') ? best : loadBest(),  // 历史最高
            brokeRecord: false, // 本局是否破纪录
            pendingDist: 0,     // 距上次生成累计的像素
            gapPx: 600,         // 下一次生成的间距
            emaPxPerSec: 185,   // 实测像素/秒（EMA，用于自动适配速度）
            recent: [],         // 最近出现过的单词
            popup: null,        // 常驻弹窗
            lastDist: 0,
            lastTs: 0
        };
    }

    // 注意：重开只清本局数据，最高记录要保留
    function resetState() {
        S = newState(S ? S.best : undefined);
    }
    resetState();

    /* ================================================================
     * 4. 工具
     * ================================================================ */
    function nowMs() {
        return (window.performance && window.performance.now)
            ? window.performance.now()
            : Date.now();
    }

    function clamp(v, min, max) {
        return v < min ? min : (v > max ? max : v);
    }

    /* ================================================================
     * 4.5 单词朗读：浏览器自带 speechSynthesis（离线可用，不依赖网络）
     *     · 只读英文，不读中文
     *     · 防重叠：上一句没读完就直接跳过本次，不排队、不叠音
     * ================================================================ */
    var LAST_SPOKEN = null;

    var TTS = (function () {
        var synth = window.speechSynthesis || null;
        var Utter = window.SpeechSynthesisUtterance || null;
        var voice = null;
        var busy = false;
        var watchdog = null;
        var lastAt = 0;

        function refreshVoice() {
            if (!synth || typeof synth.getVoices !== 'function') return;
            var list = [];
            try { list = synth.getVoices() || []; } catch (e) { return; }
            var best = null, bestScore = -1;
            for (var i = 0; i < list.length; i++) {
                var v = list[i];
                if (!v || !v.lang) continue;
                var score = 0;
                if (/^en[-_]US$/i.test(v.lang)) score += 4;        // 美音优先
                else if (/^en[-_]/i.test(v.lang)) score += 2;
                else continue;
                // localService = 本地语音（能离线发声）；在线音色断网会静默失败
                if (v.localService) score += 8;
                if (score > bestScore) { best = v; bestScore = score; }
            }
            if (best) voice = best;
        }

        function init() {
            if (!synth || !Utter) return;
            refreshVoice();
            try {
                if (typeof synth.addEventListener === 'function') {
                    synth.addEventListener('voiceschanged', refreshVoice);
                } else {
                    synth.onvoiceschanged = refreshVoice;
                }
            } catch (e) { /* ignore */ }
        }

        function isSpeaking() {
            if (!synth) return false;
            // Chrome 偶发 speaking 卡在 true，超过 12s 就当它没在说（单词读不到 2s）
            if (lastAt && (Date.now() - lastAt > 12000)) { busy = false; return false; }
            return busy || !!synth.speaking || !!synth.pending;
        }

        function speak(text) {
            if (!CFG.tts.enabled || !synth || !Utter || !text) return false;
            if (isSpeaking()) return false;      // 防重叠：上一句没读完就不触发
            try {
                var u = new Utter(text);        // 只传入英文
                u.lang = CFG.tts.lang;
                u.rate = CFG.tts.rate;
                u.pitch = CFG.tts.pitch;
                u.volume = CFG.tts.volume;
                if (voice) u.voice = voice;
                u.onstart = function () { busy = true; };
                u.onend = function () { busy = false; };
                u.onerror = function () { busy = false; };
                if (synth.paused && typeof synth.resume === 'function') synth.resume();
                synth.speak(u);
                LAST_SPOKEN = text;
                lastAt = Date.now();
                // 兵险：万一 onend 不回调，15 秒后自解，避免永久卡住朗读
                if (watchdog) clearTimeout(watchdog);
                watchdog = setTimeout(function () { busy = false; watchdog = null; }, 15000);
                return true;
            } catch (e) {
                busy = false;
                return false;
            }
        }

        return { init: init, speak: speak, isSpeaking: isSpeaking };
    })();
    TTS.init();

    /* ================================================================
     * 5. 单词生成 / 移动 / 碰撞
     * ================================================================ */
    function pickWord() {
        var pool = [];
        for (var i = 0; i < WORDS.length; i++) {
            var w = WORDS[i];
            if (S.recent.indexOf(w.en) !== -1) continue;
            var onScreen = false;
            for (var j = 0; j < S.words.length; j++) {
                if (S.words[j].en === w.en) { onScreen = true; break; }
            }
            if (!onScreen) pool.push(w);
        }
        if (!pool.length) pool = WORDS.slice(0);
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function remember(word) {
        S.recent.push(word.en);
        while (S.recent.length > CFG.recentMemory) S.recent.shift();
    }

    function measure(r, text) {
        var ctx = r.canvasCtx;
        var long = text.length > CFG.cardLongLimit;
        ctx.font = long ? CFG.cardFontLong : CFG.cardFontShort;
        var w = ctx.measureText(text).width;
        if (!w || !isFinite(w)) w = text.length * 6;
        return {
            width: Math.ceil(w),
            long: long,
            height: long ? CFG.cardHeightLong : CFG.cardHeight
        };
    }

    function spawn(r) {
        if (!r.dimensions) return;
        // 别和刚出现的仙人掌叠在一起（只是避让，不依赖仙人掌）
        var obs = (r.horizon && r.horizon.obstacles) || [];
        for (var i = 0; i < obs.length; i++) {
            var o = obs[i];
            if (o && typeof o.xPos === 'number' && o.xPos + (o.width || 0) > r.dimensions.WIDTH - 90) {
                return; // 每帧重试，直到右侧空出来
            }
        }
        if (S.words.length >= CFG.maxOnScreen) return;

        var word = pickWord();
        var m = measure(r, word.en);
        var groundY = (r.tRex && typeof r.tRex.groundYPos === 'number')
            ? r.tRex.groundYPos
            : (r.dimensions.HEIGHT - 57);
        var h = m.height;

        // 纵向三档随机（高 / 中 / 低），全部落在恐龙跳跃可触碰区间
        var bandTop = groundY + CFG.bandTopOffset;       // ≈ 跳跃顶点高度
        var bandBottom = groundY + CFG.bandBottomOffset; // ≈ 贴地
        var band = Math.floor(Math.random() * 3);
        var t = (band + Math.random()) / 3;
        var y = bandTop + (bandBottom - bandTop) * t;
        y = clamp(y, 2, bandBottom);
        y = Math.round(y);

        S.words.push({
            en: word.en,
            cn: word.cn,
            w: m.width,
            h: h,
            long: m.long,
            x: r.dimensions.WIDTH + 10,
            y: y,
            bornAt: nowMs()
        });
        remember(word);

        // 下一次的间距：按实测速度 × 期望间隔，加浮动
        var jitter = 1 + (Math.random() * 2 - 1) * CFG.gapJitter;
        S.gapPx = clamp(S.emaPxPerSec * CFG.spawnIntervalSec * jitter, CFG.minGapPx, CFG.maxGapPx);
        S.pendingDist = 0;
    }

    function trexBox(r) {
        var t = r.tRex;
        if (!t) return null;
        var cfg = t.config || {};
        var ducking = !!t.ducking;
        var w = ducking ? (cfg.WIDTH_DUCK || 59) : (cfg.WIDTH || 44);
        var h = ducking ? (cfg.HEIGHT_DUCK || 25) : (cfg.HEIGHT || 47);
        // 内缩一点，去掉精灵图透明边，判定更符合肉眼
        return { x: t.xPos + 7, y: t.yPos + 5, w: w - 15, h: h - 9 };
    }

    function hit(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    function collect(r, word) {
        S.score += 1;
        if (S.score > S.best) {        // 立刻刷新历史记录并落盘
            S.best = S.score;
            S.brokeRecord = true;
            saveBest(S.best);
        }
        // 拾到的一瞬间朗读英文（上一句没读完则跳过，不叠音）
        TTS.speak(word.en);
        // 不设到期时间：一直停在屏幕中间，直到碰到下一个单词才被替换
        S.popup = { en: word.en, cn: word.cn };
    }

    function updateWords(r, dx, now) {
        if (!S.words.length) return;
        var tb = trexBox(r);
        var alive = [];
        for (var i = 0; i < S.words.length; i++) {
            var w = S.words[i];
            w.x -= dx;
            var box = { x: w.x, y: w.y, w: w.w, h: w.h };
            if (tb && !r.crashed && hit(tb, box)) {
                collect(r, w);            // 碰到单词：安全，只加分 + 弹窗
                continue;                  // 单词消失
            }
            if (w.x + w.w < -20) continue; // 移出屏幕
            alive.push(w);
        }
        S.words = alive;
    }

    /* ================================================================
     * 6. 绘制（画在原版画面之上）
     * ================================================================ */
    function draw(r, now) {
        var ctx = r.canvasCtx;
        if (!ctx || !r.dimensions) return;

        // --- 单词卡：透明背景，只显示英文 ---
        for (var i = 0; i < S.words.length; i++) {
            var w = S.words[i];
            ctx.font = w.long ? CFG.cardFontLong : CFG.cardFontShort;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            var baseline = w.y + w.h - 4;
            ctx.lineWidth = 4;
            ctx.strokeStyle = CFG.cardHalo;
            ctx.strokeText(w.en, Math.round(w.x), Math.round(baseline));
            ctx.fillStyle = CFG.cardFg;
            ctx.fillText(w.en, Math.round(w.x), Math.round(baseline));
        }

        // --- 顶部左侧 HUD：单词个数:XX｜记录:XX ---
        if (r.crashed) {
            drawGameOverStats(r);
            return;
        }

        ctx.font = 'bold 14px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        var hudText = '单词个数:' + S.score + '｜记录:' + S.best;
        ctx.lineWidth = 3;
        ctx.strokeStyle = CFG.cardHalo;
        ctx.strokeText(hudText, 10, 8);
        ctx.fillStyle = CFG.scoreFg;
        ctx.fillText(hudText, 10, 8);

        // --- 中央弹窗：完全透明背景，无边框无底色，只有英文 + 中文 ---
        //     不自动消失：一直显示到碰到下一个单词（或被重开/死亡清除）
        if (S.popup) {
            var W = r.dimensions.WIDTH;
            var H = r.dimensions.HEIGHT;
            var cx = W / 2;
            var cy = Math.round(H * CFG.popupCenterRatio);  // 上移，避开仙人掌/地面区域

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 英文：大字号 + 白色描边光晖（只是文字描边，不是底板）
            ctx.font = 'bold 34px "Microsoft YaHei", "PingFang SC", sans-serif';
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeText(S.popup.en, cx, cy - 12);
            ctx.fillStyle = '#12324d';
            ctx.fillText(S.popup.en, cx, cy - 12);

            // 中文：稍小、绿色
            ctx.font = 'bold 24px "Microsoft YaHei", "PingFang SC", sans-serif';
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeText(S.popup.cn, cx, cy + 26);
            ctx.fillStyle = '#0f7b3f';
            ctx.fillText(S.popup.cn, cx, cy + 26);

            ctx.restore();
        }
    }

    /**
     * Game Over 结算：屏幕中间区域显示本局单词个数 + 历史记录
     * 只用文字（白描边），不加底色，不遮住原版 GAME OVER 文字和重启按钮
     */
    function drawGameOverStats(r) {
        var ctx = r.canvasCtx;
        var W = r.dimensions.WIDTH;
        var H = r.dimensions.HEIGHT;
        var cx = W / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 夹在「GAME OVER」文字（y≈42~53）与重启按钮（y≈75~107）之间
        var y = Math.round(H * CFG.goStatsCenterRatio);
        var line = '单词个数:' + S.score + '｜记录:' + S.best;
        ctx.font = 'bold 13px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = CFG.cardHalo;
        ctx.strokeText(line, cx, y);
        ctx.fillStyle = S.brokeRecord ? CFG.recordFg : CFG.cardFg;
        ctx.fillText(line, cx, y);

        // 破纪录提示放在上方，不占中间那一行
        if (S.brokeRecord) {
            ctx.font = 'bold 18px "Microsoft YaHei", "PingFang SC", sans-serif';
            ctx.lineWidth = 5;
            ctx.strokeStyle = CFG.cardHalo;
            ctx.strokeText('新纪录！', cx, Math.round(H * 0.13));
            ctx.fillStyle = CFG.recordFg;
            ctx.fillText('新纪录！', cx, Math.round(H * 0.13));
        }
        ctx.restore();
    }

    /* ================================================================
     * 7. 每帧主循环（由包装后的 Runner.update 调用）
     * ================================================================ */
    function tick(r) {
        if (!r || !r.canvasCtx || !r.tRex) return;

        var now = nowMs();

        // 位移 = 原生 distanceRan 的每帧增量 → 和仙人掌完全同速同路径
        var dist = typeof r.distanceRan === 'number' ? r.distanceRan : 0;
        var dx = dist - S.lastDist;
        if (!isFinite(dx) || dx < 0 || dx > 300) dx = 0;  // 重开/跳变保护
        S.lastDist = dist;
        if (r.playingIntro) dx = 0;

        var dtMs = S.lastTs ? now - S.lastTs : 0;
        S.lastTs = now;

        // 注意：不能用 r.paused 判断——原版 gameOver 会把它留成 true，restart 不清，
        // 导致第二局起永远不生成。dx > 0 就说明世界真的在前进（暂停/未激活时 dx 必为 0）。
        var running = r.playing && !r.crashed && dx > 0;

        if (running) {
            // 实测像素速度（自适应任何游戏速度/机器），用于算生成间距
            if (dtMs > 0 && dtMs < 250 && dx > 0) {
                var inst = dx / dtMs * 1000;
                S.emaPxPerSec = S.emaPxPerSec * 0.88 + inst * 0.12;
            }
            updateWords(r, dx, now);

            S.pendingDist += dx;
            if (S.pendingDist >= S.gapPx) spawn(r);
        }

        draw(r, now);
    }

    /* ================================================================
     * 8. 挂载到原版（不修改 index.js 一行代码）
     * ================================================================ */
    function install() {
        var R = window.Runner;
        if (!R || !R.prototype || R.prototype.__wordOverlayInstalled) return !!R;
        var proto = R.prototype;
        proto.__wordOverlayInstalled = true;

        var origUpdate = proto.update;
        proto.update = function () {
            var out = origUpdate.apply(this, arguments);
            try {
                tick(this);
            } catch (e) {
                if (window.console && console.warn) console.warn('[word-overlay]', e);
            }
            return out;
        };

        // 一局重开：清空单词、队列、学习积分，重新随机
        var origRestart = proto.restart;
        proto.restart = function () {
            resetState();
            return origRestart.apply(this, arguments);
        };

        // 死亡：清掉在场单词，避免残留在结算面板下面
        var origGameOver = proto.gameOver;
        proto.gameOver = function () {
            S.words = [];
            S.popup = null;
            return origGameOver.apply(this, arguments);
        };

        return true;
    }

    // 等 index.js 把 Runner 挂到 window 上
    var tries = 0;
    (function waitRunner() {
        if (install() || tries++ > 400) return;
        setTimeout(waitRunner, 30);
    })();

    /* ================================================================
     * 9. 调试接口
     * ================================================================ */
    window.WordOverlay = {
        state: function () {
            return {
                score: S.score,
                best: S.best,
                brokeRecord: S.brokeRecord,
                ttsSpeaking: TTS.isSpeaking(),
                lastSpoken: LAST_SPOKEN,
                words: S.words.map(function (w) { return { en: w.en, x: Math.round(w.x), y: w.y }; }),
                gapPx: Math.round(S.gapPx),
                pxPerSec: Math.round(S.emaPxPerSec),
                popup: S.popup ? S.popup.en : null,
                recent: S.recent.slice(0)
            };
        },
        spawnNow: function () {
            var r = window.Runner && window.Runner.instance_;
            if (r) spawn(r);
        },
        // 调试用：直接拿内部单词对象（引用稳定，方便逐帧比对位移）
        wordsRaw: function () { return S.words; },
        reset: function () { resetState(); },
        config: CFG,
        words: WORDS
    };
})();
