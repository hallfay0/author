'use client';

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, Settings, KeyRound, Check, CircleDot } from 'lucide-react';
import { getProjectSettings, saveProjectSettings, getChatApiConfig } from '../lib/settings';
import { PROVIDERS } from './SettingsPanel';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../lib/useI18n';

// Provider icon filename mapping
const PROVIDER_ICON_MAP = {
    openai: 'openai', gpt: 'openai', 'o1': 'openai', 'o3': 'openai', 'o4': 'openai',
    anthropic: 'anthropic', claude: 'anthropic',
    gemini: 'gemini', google: 'gemini',
    deepseek: 'deepseek',
    qwen: 'qwen', dashscope: 'qwen', ali: 'qwen', bailian: 'qwen',
    siliconflow: 'siliconflow',
    ollama: 'ollama', llama: 'ollama',
    openrouter: 'openrouter',
    volcengine: 'volcengine', doubao: 'volcengine',
    minimax: 'minimax',
    moonshot: 'moonshot', kimi: 'moonshot',
    groq: 'groq',
    mistral: 'mistral',
    xai: 'xai', grok: 'xai',
    zhipu: 'zhipu', glm: 'zhipu',
    cerebras: 'cerebras',
    baidu: 'baidu', ernie: 'baidu',
};

function getProviderIconName(provider, model) {
    const p = (provider || '').toLowerCase();
    const m = (model || '').toLowerCase();
    for (const [key, icon] of Object.entries(PROVIDER_ICON_MAP)) {
        if (p.includes(key) || m.includes(key)) return icon;
    }
    return 'generic';
}

function MiniProviderIcon({ provider, model, size = 22 }) {
    const iconName = getProviderIconName(provider, model);
    return (
        <img
            src={`/provider-icons/${iconName}.png`}
            alt=""
            width={size}
            height={size}
            style={{
                borderRadius: 5, flexShrink: 0,
                objectFit: 'cover',
            }}
        />
    );
}

/**
 * ModelPicker — 快速模型切换器
 * @param {string} target 'chat' | 'editor' | 'embed'
 * @param {function} onOpenSettings 跳转到设置面板
 * @param {string} className 附加样式类
 */
export default function ModelPicker({ target = 'editor', onOpenSettings, className = '', dropDirection = 'up' }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [config, setConfig] = useState(null);
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const { showToast, setShowSettings } = useAppStore();
    const { t } = useI18n();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // 读取当前配置
    const refreshConfig = useCallback(() => {
        const settings = getProjectSettings();
        if (target === 'embed') {
            const ac = settings.apiConfig || {};
            setConfig({
                active: { provider: ac.embedProvider || '', model: ac.embedModel || '', apiKey: ac.embedApiKey || ac.apiKey || '' },
                isFallback: false,
                providerConfigs: ac.embedProviderConfigs || {},
                mainApiKey: ac.apiKey,
            });
        } else if (target === 'chat') {
            setConfig({
                active: getChatApiConfig(),
                isFallback: !settings.chatApiConfig?.provider,
                providerConfigs: settings.apiConfig?.providerConfigs || {},
                mainProvider: settings.apiConfig?.provider,
                mainModel: settings.apiConfig?.model,
                mainApiKey: settings.apiConfig?.apiKey,
            });
        } else {
            setConfig({
                active: settings.apiConfig,
                isFallback: false,
                providerConfigs: settings.apiConfig?.providerConfigs || {},
            });
        }
    }, [target]);

    useEffect(() => { refreshConfig(); }, [refreshConfig]);

    // 点击外部关闭
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (triggerRef.current?.contains(e.target)) return;
            if (panelRef.current?.contains(e.target)) return;
            setOpen(false);
            setSearch('');
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Portal 下拉菜单定位
    useLayoutEffect(() => {
        if (!open || !triggerRef.current || !panelRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const panel = panelRef.current;
        const ph = panel.offsetHeight;
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        let left = rect.left;
        let top;
        if (dropDirection === 'down') {
            top = rect.bottom + 6;
            if (top + ph > vh - 8) top = rect.top - ph - 6; // 放不下就向上
        } else {
            top = rect.top - ph - 6;
            if (top < 8) top = rect.bottom + 6; // 放不下就向下
        }
        if (left + 280 > vw - 8) left = vw - 288;
        if (left < 8) left = 8;

        panel.style.position = 'fixed';
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    });

    // 构建供应商分组列表
    const groups = useMemo(() => {
        if (!config) return [];
        const pc = config.providerConfigs;
        const configured = [];
        const unconfigured = [];

        for (const p of PROVIDERS) {
            const cfg = pc[p.key];
            const hasKey = target === 'embed'
                ? !!(cfg?.apiKey || (config.active?.provider === p.key && config.active?.apiKey) || config.mainApiKey)
                : !!(cfg?.apiKey || (config.active?.provider === p.key && config.active?.apiKey) || (config.mainProvider === p.key && config.mainApiKey));
            // 只显示用户在设置中勾选加入快切列表的模型
            const userModels = cfg?.models || [];

            // 搜索过滤
            const q = search.toLowerCase();
            const providerMatch = !q || p.label.toLowerCase().includes(q) || p.key.includes(q);
            const filteredModels = q
                ? userModels.filter(m => m.toLowerCase().includes(q) || providerMatch)
                : userModels;

            if (!providerMatch && filteredModels.length === 0) continue;
            // 有勾选模型的供应商始终显示（无论是否有 key），没有勾选模型且有 key 的提示去设置
            if (userModels.length === 0) {
                if (hasKey) {
                    // 有 key 但没勾选模型 — 显示在已配置区提示去设置
                    configured.push({ provider: p, hasKey, models: [], allModels: [] });
                }
                continue;
            }

            const entry = { provider: p, hasKey, models: filteredModels, allModels: userModels };
            configured.push(entry);
        }

        return [
            { label: t('modelPicker.configured') || '已配置', items: configured },
            { label: t('modelPicker.unconfigured') || '未配置', items: unconfigured },
        ];
    }, [config, search, t]);

    // 切换模型
    const selectModel = useCallback((providerKey, modelId) => {
        const settings = getProjectSettings();

        if (target === 'embed') {
            // 嵌入模型切换
            const ac = settings.apiConfig || {};
            const epc = { ...(ac.embedProviderConfigs || {}) };
            const providerCfg = epc[providerKey] || {};
            const providerDef = PROVIDERS.find(p => p.key === providerKey);

            // 保存当前 embed 供应商配置
            if (ac.embedProvider && ac.embedProvider !== providerKey) {
                if (!epc[ac.embedProvider]) epc[ac.embedProvider] = {};
                epc[ac.embedProvider].apiKey = ac.embedApiKey || '';
                epc[ac.embedProvider].baseUrl = ac.embedBaseUrl || '';
                epc[ac.embedProvider].model = ac.embedModel || '';
            }

            ac.embedProvider = providerKey;
            ac.embedModel = modelId;
            ac.embedApiKey = providerCfg.apiKey || '';
            ac.embedBaseUrl = providerCfg.baseUrl || providerDef?.baseUrl || '';
            ac.embedProviderConfigs = epc;
            settings.apiConfig = ac;
            saveProjectSettings(settings);
            refreshConfig();
            setOpen(false);
            setSearch('');
            return;
        }

        const pc = settings.apiConfig.providerConfigs || {};
        const providerCfg = pc[providerKey] || {};
        const providerDef = PROVIDERS.find(p => p.key === providerKey);

        // 构建目标 apiConfig 片段
        const newCfg = {
            provider: providerKey,
            model: modelId,
            apiKey: providerCfg.apiKey || '',
            baseUrl: providerCfg.baseUrl || providerDef?.baseUrl || '',
            apiFormat: providerCfg.apiFormat || providerDef?.apiFormat || '',
        };

        // 更新活跃模型（不自动加入 models 列表）
        if (!pc[providerKey]) pc[providerKey] = { ...providerCfg };
        pc[providerKey].model = modelId;

        if (target === 'chat') {
            // 继承主配置中的 tools 和 searchConfig，确保搜索设置不丢失
            const mainTools = settings.apiConfig?.tools;
            const mainSearchConfig = settings.apiConfig?.searchConfig;
            settings.chatApiConfig = {
                ...newCfg,
                ...(mainTools ? { tools: mainTools } : {}),
                ...(mainSearchConfig ? { searchConfig: mainSearchConfig } : {}),
            };
        } else {
            // 先保存旧的供应商配置
            if (settings.apiConfig.provider && settings.apiConfig.provider !== providerKey) {
                const oldKey = settings.apiConfig.provider;
                if (!pc[oldKey]) pc[oldKey] = {};
                pc[oldKey].apiKey = settings.apiConfig.apiKey || '';
                pc[oldKey].baseUrl = settings.apiConfig.baseUrl || '';
                pc[oldKey].model = settings.apiConfig.model || '';
                pc[oldKey].apiFormat = settings.apiConfig.apiFormat || '';
                if (!pc[oldKey].models) pc[oldKey].models = pc[oldKey].model ? [pc[oldKey].model] : [];
            }
            Object.assign(settings.apiConfig, newCfg);
            // 同步更新 chatApiConfig，确保 AI 助手对话也使用新切换的模型
            if (settings.chatApiConfig && settings.chatApiConfig.provider) {
                const chatTools = settings.chatApiConfig.tools || settings.apiConfig?.tools;
                const chatSearchConfig = settings.chatApiConfig.searchConfig || settings.apiConfig?.searchConfig;
                settings.chatApiConfig = {
                    ...newCfg,
                    ...(chatTools ? { tools: chatTools } : {}),
                    ...(chatSearchConfig ? { searchConfig: chatSearchConfig } : {}),
                };
            }
        }
        settings.apiConfig.providerConfigs = pc;
        saveProjectSettings(settings);
        refreshConfig();
        setOpen(false);
        setSearch('');
    }, [target, refreshConfig]);

    // 跟随主配置（仅 chat target）
    const followMain = useCallback(() => {
        const settings = getProjectSettings();
        settings.chatApiConfig = null;
        saveProjectSettings(settings);
        refreshConfig();
        setOpen(false);
        setSearch('');
    }, [refreshConfig]);

    if (!config) return null;

    const activeProvider = config.active?.provider || '';
    const activeModel = config.active?.model || '';
    const providerDef = PROVIDERS.find(p => p.key === activeProvider);
    const displayModel = activeModel.length > 28 ? activeModel.slice(0, 26) + '…' : activeModel;
    const targetLabel = target === 'chat'
        ? (t('modelPicker.chatModel') || '对话')
        : target === 'embed'
        ? '嵌入'
        : (t('modelPicker.editorModel') || '编辑');

    return (
        <div className={`model-picker ${className}`} ref={dropdownRef} style={{ position: 'relative' }}>
            {/* 触发按钮 */}
            <button
                ref={triggerRef}
                className="model-picker-trigger"
                onClick={() => { setOpen(!open); if (!open) refreshConfig(); }}
                title={`${targetLabel}: ${providerDef?.label || activeProvider} / ${activeModel}`}
            >
                {target === 'embed' ? <span style={{ fontSize: 12 }}>📐</span> : <MiniProviderIcon provider={activeProvider} model={activeModel} />}
                <span className="model-picker-label">
                    {displayModel || (target === 'embed' ? '嵌入未配置' : (t('modelPicker.notConfigured') || '未配置'))}
                </span>
                {target === 'chat' && config.isFallback && (
                    <span className="model-picker-badge">{t('modelPicker.follow') || '跟随'}</span>
                )}
                <span className="model-picker-arrow">{open ? (dropDirection === 'down' ? '▴' : '▾') : '▾'}</span>
            </button>

            {/* 下拉面板（Portal 渲染到 body） */}
            {open && mounted && createPortal(
                <div ref={panelRef} className={`model-picker-dropdown ${dropDirection === 'down' ? 'drop-down' : ''}`} style={{ position: 'fixed', zIndex: 9999 }}>
                    {/* 搜索 */}
                    <div className="model-picker-search-wrap">
                        <input
                            className="model-picker-search"
                            placeholder={t('modelPicker.search') || '搜索模型…'}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* 跟随主配置（仅 chat） */}
                    {target === 'chat' && (
                        <button
                            className={`model-picker-item follow ${config.isFallback ? 'active' : ''}`}
                            onClick={followMain}
                        >
                            <Link size={13} />
                            <span className="model-picker-item-name">
                                {t('modelPicker.followMain') || '跟随主配置'}
                            </span>
                            <span className="model-picker-item-sub">
                                {config.mainModel || ''}
                            </span>
                            {config.isFallback && <span className="model-picker-check"><Check size={12} /></span>}
                        </button>
                    )}

                    {/* 分组列表 */}
                    <div className="model-picker-list">
                        {groups.map(group => {
                            if (group.items.length === 0) return null;
                            return (
                                <div key={group.label} className="model-picker-group">
                                    <div className="model-picker-group-label">{group.label}</div>
                                    {group.items.map(({ provider: p, hasKey, models }) => (
                                        <div key={p.key} className="model-picker-provider">
                                            <div className="model-picker-provider-header">
                                                <MiniProviderIcon provider={p.key} model="" />
                                                <span className="model-picker-provider-name">{p.label}</span>
                                                {!hasKey && (
                                                    <span
                                                        className="model-picker-no-key"
                                                        onClick={() => {
                                                            setOpen(false);
                                                            if (onOpenSettings) onOpenSettings();
                                                            else setShowSettings('apiConfig');
                                                        }}
                                                    >
                                                        {t('modelPicker.noKey') || '配置 →'}
                                                    </span>
                                                )}
                                            </div>
                                            {models.map(m => {
                                                const isActive = activeProvider === p.key && activeModel === m;
                                                return (
                                                    <button
                                                        key={m}
                                                        className={`model-picker-item ${isActive ? 'active' : ''} ${!hasKey ? 'no-key' : ''}`}
                                                        onClick={() => {
                                                            if (hasKey) {
                                                                selectModel(p.key, m);
                                                            } else {
                                                                setOpen(false);
                                                                if (onOpenSettings) onOpenSettings();
                                                                else setShowSettings('apiConfig');
                                                            }
                                                        }}
                                                    >
                                                        <span className="model-picker-item-name" style={!hasKey ? { opacity: 0.55 } : undefined}>{m}</span>
                                                        {isActive && <span className="model-picker-check">✓</span>}
                                                        {!hasKey && <span className="model-picker-no-key-hint"><KeyRound size={11} /></span>}
                                                    </button>
                                                );
                                            })}
                                            {hasKey && models.length === 0 && (
                                                <div className="model-picker-empty">
                                                    {t('modelPicker.noModels') || '暂无模型，请在设置中添加'}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>

                    {/* 打开设置 */}
                    <div className="model-picker-footer">
                        <button
                            className="model-picker-settings-btn"
                            onClick={() => {
                                setOpen(false);
                                if (onOpenSettings) onOpenSettings();
                                else setShowSettings('apiConfig');
                            }}
                        >
                            <Settings size={13} style={{ marginRight: 4 }} />{t('modelPicker.openSettings') || '管理供应商'}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
