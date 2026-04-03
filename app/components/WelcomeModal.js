'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../lib/useI18n';

export default function WelcomeModal() {
    const { language, setLanguage, visualTheme, setVisualTheme } = useAppStore();
    const { t } = useI18n();
    const [step, setStep] = useState(1);
    const [isVisible, setIsVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!language || !visualTheme) {
            setIsVisible(true);
            if (!language) {
                setStep(1);
            } else {
                setStep(2);
            }
        }
    }, [language, visualTheme]);

    if (!mounted || !isVisible) return null;

    const handleSelectLang = (lang) => {
        setLanguage(lang);
        setStep(2);
    };

    const handleSelectTheme = (theme) => {
        setVisualTheme(theme);
        document.documentElement.setAttribute('data-visual', theme);
    };

    const handleGoToStep3 = () => {
        if (!visualTheme) {
            handleSelectTheme('warm');
        }
        handleStart();
    };

    const handleStart = () => {
        setIsVisible(false);
        if (!localStorage.getItem('author-onboarding-done')) {
            useAppStore.getState().setStartTour(true);
        }
    };

    return (
        <div className="welcome-modal-overlay">
            <div className={`welcome-modal-container ${step === 2 ? 'step-2' : ''} ${step === 3 ? 'step-3' : ''}`}>
                {/* Step 1: Language */}
                {step === 1 && (
                    <div className="welcome-step fadeIn">
                        <h1 className="welcome-title">Welcome / 欢迎 / Добро пожаловать</h1>
                        <div className="welcome-lang-grid">
                            <button className="welcome-card" onClick={() => handleSelectLang('en')}>
                                <span className="welcome-icon">🇬🇧</span>
                                <span className="welcome-label">English</span>
                            </button>
                            <button className="welcome-card" onClick={() => handleSelectLang('zh')}>
                                <span className="welcome-icon">🇨🇳</span>
                                <span className="welcome-label">简体中文</span>
                            </button>
                            <button className="welcome-card" onClick={() => handleSelectLang('ru')}>
                                <span className="welcome-icon">🇷🇺</span>
                                <span className="welcome-label">Русский</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Theme */}
                {step === 2 && (
                    <div className="welcome-step fadeIn">
                        <h1 className="welcome-title" style={{ marginBottom: 8 }}>{t('welcome.title')}</h1>
                        <p className="welcome-subtitle" style={{ marginBottom: 32 }}>{t('welcome.subtitle')}</p>

                        <h3 className="welcome-section-title">{t('welcome.selectTheme')}</h3>
                        <div className="welcome-theme-grid">
                            <button
                                className={`welcome-card theme-card ${visualTheme === 'warm' ? 'active' : ''}`}
                                onClick={() => handleSelectTheme('warm')}
                            >
                                <div className="theme-preview warm-preview"></div>
                                <div className="theme-info">
                                    <h4>{t('welcome.themeWarm.name')}</h4>
                                    <p>{t('welcome.themeWarm.desc')}</p>
                                </div>
                            </button>

                            <button
                                className={`welcome-card theme-card ${visualTheme === 'modern' ? 'active' : ''}`}
                                onClick={() => handleSelectTheme('modern')}
                            >
                                <div className="theme-preview modern-preview"></div>
                                <div className="theme-info">
                                    <h4>{t('welcome.themeModern.name')}</h4>
                                    <p>{t('welcome.themeModern.desc')}</p>
                                </div>
                            </button>
                        </div>

                        <div className="welcome-actions">
                            <button
                                className="btn btn-primary btn-large welcome-start-btn"
                                onClick={handleGoToStep3}
                                disabled={!visualTheme}
                            >
                                {t('welcome.startBtn') || '开始创作'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
