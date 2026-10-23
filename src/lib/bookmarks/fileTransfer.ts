import { backup } from './export'

export async function downloadBackup() {
    const url = URL.createObjectURL(new Blob([await backup()], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'better-trading-backup.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function readBackupFile(file: File) {
    return file.text()
}
