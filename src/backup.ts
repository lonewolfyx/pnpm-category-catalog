import type { IConfig } from '@/types'
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { BACKUP_CACHE_DIR, BACKUP_MANIFEST_FILE } from '@/constant.ts'

export interface BackupManifest {
    id: string
    timestamp: string
    version: string
    description: string
    files: {
        relativePath: string
    }[]
}

export interface BackupInfo {
    path: string
    manifest: BackupManifest
}

function generateBackupId(): string {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
        now.getDate(),
    )}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function getBackupCacheDir(config: IConfig): string {
    return resolve(config.cwd, BACKUP_CACHE_DIR)
}

function ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true })
    }
}

export function createBackup(
    config: IConfig,
    filePaths: string[],
    description: string = '',
): string {
    const backupId = generateBackupId()
    const cacheDir = getBackupCacheDir(config)
    const backupDir = join(cacheDir, backupId)

    ensureDir(backupDir)

    const files: BackupManifest['files'] = []

    for (const filePath of filePaths) {
        if (!existsSync(filePath)) {
            continue
        }

        const relativePath = relative(config.cwd, filePath)
        const backupFilePath = join(backupDir, relativePath)

        ensureDir(dirname(backupFilePath))

        const content = readFileSync(filePath, 'utf-8')
        writeFileSync(backupFilePath, content, 'utf-8')

        files.push({ relativePath })
    }

    const manifest: BackupManifest = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown',
        description,
        files,
    }

    writeFileSync(
        join(backupDir, BACKUP_MANIFEST_FILE),
        JSON.stringify(manifest, null, 4),
        'utf-8',
    )

    return backupId
}

export function listBackups(config: IConfig): BackupInfo[] {
    const cacheDir = getBackupCacheDir(config)

    if (!existsSync(cacheDir)) {
        return []
    }

    const entries = readdirSync(cacheDir, { withFileTypes: true })
    const backups: BackupInfo[] = []

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue
        }

        const backupDir = join(cacheDir, entry.name)
        const manifestPath = join(backupDir, BACKUP_MANIFEST_FILE)

        if (!existsSync(manifestPath)) {
            continue
        }

        try {
            const manifest = JSON.parse(
                readFileSync(manifestPath, 'utf-8'),
            ) as BackupManifest
            backups.push({
                path: backupDir,
                manifest,
            })
        }
        catch {
            // ignore useless backup
        }
    }

    return backups.sort(
        (a, b) =>
            new Date(b.manifest.timestamp).getTime()
                - new Date(a.manifest.timestamp).getTime(),
    )
}

export function getBackupInfo(
    config: IConfig,
    backupId: string,
): BackupInfo | null {
    const cacheDir = getBackupCacheDir(config)
    const backupDir = join(cacheDir, backupId)
    const manifestPath = join(backupDir, BACKUP_MANIFEST_FILE)

    if (!existsSync(manifestPath)) {
        return null
    }

    try {
        const manifest = JSON.parse(
            readFileSync(manifestPath, 'utf-8'),
        ) as BackupManifest
        return {
            path: backupDir,
            manifest,
        }
    }
    catch {
        return null
    }
}

export function getLatestBackup(config: IConfig): BackupInfo | null {
    const backups = listBackups(config)
    return backups?.[0] ?? null
}

export function restoreBackup(config: IConfig, backupId?: string): number {
    const backup = backupId
        ? getBackupInfo(config, backupId)
        : getLatestBackup(config)

    if (!backup) {
        return -1
    }

    let restoredCount = 0

    for (const file of backup.manifest.files) {
        const backupFilePath = join(backup.path, file.relativePath)
        const targetFilePath = resolve(config.cwd, file.relativePath)

        if (!existsSync(backupFilePath)) {
            continue
        }

        ensureDir(dirname(targetFilePath))

        const content = readFileSync(backupFilePath, 'utf-8')
        writeFileSync(targetFilePath, content, 'utf-8')
        restoredCount++
    }

    return restoredCount
}

export function deleteBackup(config: IConfig, backupId: string): boolean {
    const cacheDir = getBackupCacheDir(config)
    const backupDir = join(cacheDir, backupId)

    if (!existsSync(backupDir)) {
        return false
    }

    rmSync(backupDir, { recursive: true, force: true })
    return true
}

export function clearBackups(config: IConfig): number {
    const backups = listBackups(config)
    let deletedCount = 0

    for (const backup of backups) {
        if (deleteBackup(config, backup.manifest.id)) {
            deletedCount++
        }
    }

    return deletedCount
}

export function hasBackup(config: IConfig): boolean {
    return listBackups(config).length > 0
}

export function formatBackupTime(isoString: string): string {
    const date = new Date(isoString)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
        date.getSeconds(),
    )}`
}
