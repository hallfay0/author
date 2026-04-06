import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * 比较两个语义化版本号
 * 如果 a > b 返回 1，a < b 返回 -1，相等返回 0
 */
function compareSemver(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

/**
 * 从 GitHub 获取最新 Release 版本号
 * 仅使用 GitHub
 */
async function fetchLatestVersion() {
    try {
        const res = await fetch('https://api.github.com/repos/mleafish/author/releases/latest', {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Author-App' },
            signal: AbortSignal.timeout(5000), // 5 秒超时
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.tag_name || null;
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        // 读取当前版本号
        let currentVersion;
        try {
            const pkgPath = join(process.cwd(), 'package.json');
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            currentVersion = pkg.version;
        } catch {
            return NextResponse.json(
                { error: '无法读取当前版本号' },
                { status: 500 }
            );
        }

        // 检测是否为源码部署（存在 .git 目录）
        const isSourceDeploy = existsSync(join(process.cwd(), '.git'));

        // 获取最新版本
        const latestTag = await fetchLatestVersion();

        if (!latestTag) {
            return NextResponse.json(
                { current: currentVersion, latest: null, hasUpdate: false, isSourceDeploy },
                { headers: { 'Cache-Control': 'public, max-age=600' } } // 失败时缓存 10 分钟
            );
        }

        const latestVersion = latestTag.replace(/^v/, '');
        const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;

        return NextResponse.json(
            { current: currentVersion, latest: latestVersion, hasUpdate, isSourceDeploy },
            { headers: { 'Cache-Control': 'public, max-age=3600' } } // 成功缓存 1 小时
        );
    } catch (err) {
        return NextResponse.json(
            { error: '检查更新失败', details: err.message },
            { status: 500 }
        );
    }
}
