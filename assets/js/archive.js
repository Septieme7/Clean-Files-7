/**
 * ==========================================================================
 * Fichier: archive.js - Version simplifiée
 * Description: Gestion de la création d'archives
 * Architecture: 777
 * ==========================================================================
 */

const ARCHIVE_CONFIG = {
    formats: {
        zip: { name: 'ZIP', extension: '.zip', icon: '📦' },
        rar: { name: 'WinRAR', extension: '.rar', icon: '🗜️' },
        '7z': { name: '7-Zip', extension: '.7z', icon: '🔧' }
    },
    defaultFormat: 'zip'
};

let selectedFormat = ARCHIVE_CONFIG.defaultFormat;

function initArchiveSystem() {
    console.log('📦 Initialisation archives');
    
    if (!document.getElementById('downloadAllBtn')) {
        console.log('❌ Pas sur la page upload');
        return;
    }
    
    createArchiveSelector();
    setupArchiveEvents();
    
    console.log('✅ Archives initialisées');
}

function createArchiveSelector() {
    if (document.getElementById('archiveSelector')) return;
    
    const html = `
        <div class="archive-selector" id="archiveSelector" style="display: none;">
            <div class="selector-header">
                <h4>📦 Format d'archive :</h4>
                <button class="selector-close">×</button>
            </div>
            <div class="format-options">
                ${Object.entries(ARCHIVE_CONFIG.formats).map(([key, format]) => `
                    <div class="format-option ${key === selectedFormat ? 'selected' : ''}" data-format="${key}">
                        <div class="format-icon">${format.icon}</div>
                        <div class="format-info">
                            <div class="format-name">${format.name}</div>
                        </div>
                        <input type="radio" name="archiveFormat" id="format-${key}" 
                            svalue="${key}" ${key === selectedFormat ? 'checked' : ''}>
                    </div>
                `).join('')}
            </div>
            <div class="selector-actions">
                <button id="cancelArchiveBtn" class="btn btn-secondary">Annuler</button>
                <button id="createArchiveBtn" class="btn btn-primary">Créer l'archive</button>
            </div>
        </div>
    `;
    
    const globalActions = document.querySelector('.global-actions');
    if (globalActions) globalActions.insertAdjacentHTML('afterend', html);
    
    addArchiveStyles();
}

function setupArchiveEvents() {
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const cancelBtn = document.getElementById('cancelArchiveBtn');
    const createBtn = document.getElementById('createArchiveBtn');
    const selectorClose = document.querySelector('.selector-close');
    
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', showArchiveSelector);
    }
    
    if (cancelBtn) cancelBtn.addEventListener('click', hideArchiveSelector);
    if (createBtn) createBtn.addEventListener('click', createArchive);
    if (selectorClose) selectorClose.addEventListener('click', hideArchiveSelector);
    
    document.querySelectorAll('.format-option').forEach(option => {
        option.addEventListener('click', function() {
            selectedFormat = this.dataset.format;
            document.querySelectorAll('.format-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById(`format-${selectedFormat}`).checked = true;
        });
    });
}

function showArchiveSelector() {
    const cleanedFiles = window.state?.files?.filter(f => f.cleaned) || [];
    
    if (cleanedFiles.length === 0) {
        alert('Aucun fichier nettoyé à archiver');
        return;
    }
    
    const selector = document.getElementById('archiveSelector');
    if (selector) {
        selector.style.display = 'block';
        setTimeout(() => selector.style.opacity = '1', 10);
    }
}

function hideArchiveSelector() {
    const selector = document.getElementById('archiveSelector');
    if (selector) {
        selector.style.opacity = '0';
        setTimeout(() => selector.style.display = 'none', 300);
    }
}

async function createArchive() {
    const cleanedFiles = window.state?.files?.filter(f => f.cleaned) || [];
    
    if (cleanedFiles.length === 0) {
        alert('Aucun fichier à archiver');
        return;
    }
    
    hideArchiveSelector();
    
    try {
        const zip = new JSZip();
        
        cleanedFiles.forEach(file => {
            zip.file(file.cleanedName, file.originalFile);
        });
        
        const readme = generateReadme(cleanedFiles);
        zip.file('README.txt', readme);
        
        const blob = await zip.generateAsync({ type: 'blob' });
        
        const filename = `fichiers_nettoyes_${Date.now()}${ARCHIVE_CONFIG.formats[selectedFormat].extension}`;
        downloadFile(blob, filename);
        
        alert(`Archive ${ARCHIVE_CONFIG.formats[selectedFormat].name} créée !`);
        
    } catch (error) {
        console.error('Erreur création archive:', error);
        alert('Erreur lors de la création de l\'archive');
    }
}

function generateReadme(files) {
    let content = 'ARCHIVE DE FICHIERS NETTOYÉS\n';
    content += '===============================\n\n';
    content += `Date: ${new Date().toLocaleString('fr-FR')}\n`;
    content += `Fichiers: ${files.length}\n\n`;
    content += 'LISTE DES FICHIERS:\n';
    content += '-------------------\n\n';
    
    files.forEach((file, i) => {
        content += `${i+1}. ${file.cleanedName}\n`;
        content += `   Taille: ${file.formattedSize}\n`;
        if (file.originalName !== file.cleanedName) {
            content += `   Original: ${file.originalName}\n`;
        }
        content += '\n';
    });
    
    return content;
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function addArchiveStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .archive-selector {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1rem 0;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 2px solid #2575fc;
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .selector-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
        }
        
        .selector-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        
        .format-options {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin: 1rem 0;
        }
        
        .format-option {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .format-option:hover {
            border-color: #2575fc;
            background: #f8f9fa;
        }
        
        .format-option.selected {
            border-color: #2575fc;
            background: #f0f7ff;
        }
        
        .format-icon {
            font-size: 1.5rem;
        }
        
        .format-name {
            font-weight: 600;
            color: #333;
        }
        
        .selector-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
        }
        
        @media (max-width: 768px) {
            .archive-selector {
                margin: 0.5rem;
                padding: 1rem;
            }
            
            .selector-actions {
                flex-direction: column;
            }
            
            .selector-actions .btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArchiveSystem);
} else {
    initArchiveSystem();
}