/**
 * Fichier: upload.js
 * Description: Gestion de l'upload et du nettoyage de fichiers réels
 * Architecture: 777
 * Auteur: 777 Tools
 */

// ============================================================================
// CONFIGURATION ET ÉTAT
// ============================================================================

/**
 * Configuration de l'application
 */
const CONFIG = {
    maxFiles: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: '*/*'
};

/**
 * État de l'application
 */
let state = {
    files: [], // Tableau d'objets fichiers
    invalidChars: new Set([
        '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
        '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
        '★', '☆', '✰', '✦', '✧', '❄', '❆', '❖', '✿', '❀', '❁', '❤', '➤', '➥', '➦',
        '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '²', '~', '`', '´',
        ',', ';', '!', '(', ')', '[', ']', '{', '}', '@', '&', '$', '%', '^',
        '+', '=', '§', '°', '¨', '£', '€', '¥',
        '\t', '\n', '\r'
    ]),
    options: {
        useUnderscores: false,  // Remplacer les espaces par des underscores
        toLowercase: false,      // Convertir en minuscules
        usePrefix: false,        // Ajouter un préfixe
        prefix: 'clean_'
    }
};

// ============================================================================
// INITIALISATION
// ============================================================================

/**
 * Initialise l'application quand le DOM est chargé
 */
function init() {
    console.log('Initialisation de l\'application upload...');
    setupEventListeners();
    updateCharPreview();
    loadOptions();
    updateUI();
    
    // Vérifier que les éléments DOM existent
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filesContainer = document.getElementById('filesContainer');
    
    if (!dropZone) console.error('dropZone non trouvé');
    if (!fileInput) console.error('fileInput non trouvé');
    if (!filesContainer) console.error('filesContainer non trouvé');
    
    console.log('Application upload initialisée');
}

/**
 * Configure tous les écouteurs d'événements
 */
function setupEventListeners() {
    console.log('Configuration des écouteurs d\'événements...');
    
    // Upload de fichiers
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
        console.log('Écouteur fileInput configuré');
    } else {
        console.error('fileInput non trouvé pour l\'écouteur');
    }
    
    if (dropZone) {
        // Drag and drop
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        // Click sur la zone (ne pas déclencher l'input directement)
        dropZone.addEventListener('click', (e) => {
            // Empêcher le déclenchement multiple
            e.stopPropagation();
            if (fileInput) {
                fileInput.click();
            }
        });
        
        console.log('Écouteurs dropZone configurés');
    } else {
        console.error('dropZone non trouvé pour les écouteurs');
    }
    
    // Options de configuration
    setupOptionListeners();
    
    // Boutons d'action
    setupActionListeners();
    
    // Modal
    setupModalListeners();
    
    // Gestion du préfixe
    setupPrefixListener();
    
    // Écouteur pour le bouton "Parcourir les fichiers"
    const browseBtn = dropZone?.querySelector('label[for="fileInput"]');
    if (browseBtn) {
        browseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fileInput) {
                fileInput.click();
            }
        });
    }
}

// ============================================================================
// GESTION DES FICHIERS (CORRIGÉE)
// ============================================================================

/**
 * Gère la sélection de fichiers via l'input
 */
function handleFileSelect(event) {
    console.log('handleFileSelect appelé');
    
    if (!event || !event.target) {
        console.error('Événement file select invalide');
        return;
    }
    
    const files = event.target.files;
    console.log('Fichiers sélectionnés:', files.length, 'fichier(s)');
    
    if (!files || files.length === 0) {
        console.log('Aucun fichier sélectionné');
        return;
    }
    
    // Convertir FileList en tableau
    const filesArray = Array.from(files);
    processFiles(filesArray);
    
    // NE PAS réinitialiser l'input ici - laisser l'utilisateur pouvoir ré-ouvrir
    // le sélecteur de fichiers sans perdre la sélection
}

/**
 * Gère le drag and drop (dragover)
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

/**
 * Gère le drag and drop (dragleave)
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('drag-over');
    }
}

/**
 * Gère le drag and drop (drop)
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('drag-over');
    }
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) {
        return;
    }
    
    console.log('Fichiers déposés:', files.length, 'fichier(s)');
    const filesArray = Array.from(files);
    processFiles(filesArray);
}

/**
 * Traite les fichiers uploadés (version corrigée)
 */
function processFiles(files) {
    console.log('processFiles appelé avec', files.length, 'fichier(s)');
    
    if (!files || !Array.isArray(files) || files.length === 0) {
        console.log('Aucun fichier à traiter');
        return;
    }
    
    // Vérifier le nombre de fichiers
    const totalFiles = state.files.length + files.length;
    if (totalFiles > CONFIG.maxFiles) {
        showNotification(`Maximum ${CONFIG.maxFiles} fichiers autorisés. Vous avez déjà ${state.files.length} fichier(s).`, 'error');
        return;
    }
    
    let addedCount = 0;
    let errorCount = 0;
    
    // Traiter chaque fichier
    files.forEach(file => {
        // Vérifier si le fichier est valide
        if (!file || !file.name) {
            errorCount++;
            return;
        }
        
        // Vérifier la taille
        if (file.size > CONFIG.maxFileSize) {
            showNotification(
                `${file.name} dépasse la taille maximale (50MB)`,
                'error'
            );
            errorCount++;
            return;
        }
        
        // Vérifier si le fichier existe déjà (par nom)
        const existingFile = state.files.find(f => 
            f.originalName === file.name && 
            f.size === formatFileSize(file.size)
        );
        
        if (existingFile) {
            showNotification(`${file.name} est déjà dans la liste`, 'warning');
            return;
        }
        
        // Créer un objet fichier
        const fileObj = {
            id: generateId(),
            originalFile: file,
            originalName: file.name,
            cleanedName: null,
            size: formatFileSize(file.size),
            type: getFileType(file),
            icon: getFileIcon(file),
            error: null,
            cleaned: false,
            uploaded: new Date().toISOString()
        };
        
        // Ajouter à l'état
        state.files.push(fileObj);
        addedCount++;
        
        console.log('Fichier ajouté:', file.name, 'ID:', fileObj.id);
    });
    
    // Mettre à jour l'interface
    updateFileList();
    updateUI();
    
    // Afficher une notification
    if (addedCount > 0) {
        showNotification(
            `${addedCount} fichier(s) ajouté(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`,
            'success'
        );
    } else if (errorCount > 0) {
        showNotification(`${errorCount} erreur(s) lors de l'ajout des fichiers`, 'error');
    } else {
        showNotification('Aucun nouveau fichier ajouté', 'info');
    }
}

/**
 * Génère un ID unique pour un fichier
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formate la taille d'un fichier
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Détermine le type de fichier
 */
function getFileType(file) {
    if (!file || !file.type) return 'unknown';
    
    const type = file.type.split('/')[0];
    return type || 'unknown';
}

/**
 * Retourne l'icône appropriée pour le type de fichier
 */
function getFileIcon(file) {
    const type = getFileType(file);
    const extension = getFileExtension(file.name);
    
    const icons = {
        image: '🖼️',
        audio: '🎵',
        video: '🎬',
        text: '📄',
        pdf: '📕',
        archive: '📦',
        spreadsheet: '📊',
        presentation: '📽️',
        code: '💻',
        default: '📁'
    };
    
    // Vérifier l'extension d'abord
    if (['pdf'].includes(extension)) return icons.pdf;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return icons.archive;
    if (['xls', 'xlsx', 'csv'].includes(extension)) return icons.spreadsheet;
    if (['ppt', 'pptx'].includes(extension)) return icons.presentation;
    if (['js', 'html', 'css', 'py', 'java', 'cpp'].includes(extension)) return icons.code;
    
    // Sinon par type MIME
    return icons[type] || icons.default;
}

/**
 * Extrait l'extension d'un fichier
 */
function getFileExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// ============================================================================
// NETTOYAGE DES NOMS DE FICHIERS
// ============================================================================

/**
 * Nettoie un nom de fichier en remplaçant les caractères invalides par des espaces
 */
function cleanFileName(filename) {
    if (!filename) return '';
    
    // Séparer le nom et l'extension
    const lastDot = filename.lastIndexOf('.');
    let name = filename;
    let extension = '';
    
    if (lastDot > 0) {
        name = filename.substring(0, lastDot);
        extension = filename.substring(lastDot);
    }
    
    let cleanedName = name;
    
    // Remplacer chaque caractère invalide par un espace
    state.invalidChars.forEach(char => {
        const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        cleanedName = cleanedName.replace(regex, ' ');
    });
    
    // Nettoyer les espaces multiples et les espaces en début/fin
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
    
    // Appliquer les options
    if (state.options.useUnderscores) {
        cleanedName = cleanedName.replace(/\s+/g, '_');
    }
    
    if (state.options.toLowercase) {
        cleanedName = cleanedName.toLowerCase();
    }
    
    if (state.options.usePrefix && state.options.prefix) {
        cleanedName = state.options.prefix + cleanedName;
    }
    
    // Si le nom est vide après nettoyage
    if (!cleanedName) {
        cleanedName = 'fichier';
    }
    
    return cleanedName + extension;
}

/**
 * Nettoie un fichier spécifique
 */
function cleanFile(fileId) {
    const fileIndex = state.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) {
        console.error('Fichier non trouvé avec ID:', fileId);
        return;
    }
    
    const file = state.files[fileIndex];
    file.cleanedName = cleanFileName(file.originalName);
    file.cleaned = true;
    
    // Mettre à jour l'affichage
    updateFileItem(fileId);
    updateUI();
    
    showNotification('Fichier nettoyé', 'success');
}

/**
 * Nettoie tous les fichiers
 */
function cleanAllFiles() {
    if (state.files.length === 0) {
        showNotification('Aucun fichier à nettoyer', 'warning');
        return;
    }
    
    let cleanedCount = 0;
    
    state.files.forEach(file => {
        if (!file.cleaned) {
            file.cleanedName = cleanFileName(file.originalName);
            file.cleaned = true;
            cleanedCount++;
        }
    });
    
    updateFileList();
    updateUI();
    
    if (cleanedCount > 0) {
        showNotification(`${cleanedCount} fichier(s) nettoyé(s)`, 'success');
    } else {
        showNotification('Tous les fichiers sont déjà nettoyés', 'info');
    }
}

// ============================================================================
// TÉLÉCHARGEMENT
// ============================================================================

/**
 * Télécharge un fichier spécifique
 */
async function downloadFile(fileId) {
    const fileObj = state.files.find(f => f.id === fileId);
    if (!fileObj) {
        showNotification('Fichier non trouvé', 'error');
        return;
    }
    
    try {
        // Créer un lien de téléchargement
        const url = URL.createObjectURL(fileObj.originalFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileObj.cleanedName || fileObj.originalName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Libérer l'URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        showNotification('Téléchargement démarré', 'success');
    } catch (error) {
        console.error('Erreur de téléchargement:', error);
        showNotification('Erreur lors du téléchargement', 'error');
    }
}

/**
 * Télécharge tous les fichiers
 */
async function downloadAllFiles() {
    if (state.files.length === 0) {
        showNotification('Aucun fichier à télécharger', 'warning');
        return;
    }
    
    const cleanedFiles = state.files.filter(f => f.cleaned);
    
    if (cleanedFiles.length === 0) {
        showNotification('Veuillez d\'abord nettoyer les fichiers', 'warning');
        return;
    }
    
    try {
        // Pour chaque fichier, télécharger avec un délai
        for (let i = 0; i < cleanedFiles.length; i++) {
            const file = cleanedFiles[i];
            await downloadFileWithDelay(file.id, i * 300);
        }
        
        showNotification(`${cleanedFiles.length} téléchargement(s) démarré(s)`, 'success');
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du téléchargement', 'error');
    }
}

/**
 * Télécharge un fichier avec délai
 */
function downloadFileWithDelay(fileId, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            downloadFile(fileId);
            resolve();
        }, delay);
    });
}

// ============================================================================
// GESTION DE L'INTERFACE (CORRIGÉE)
// ============================================================================

/**
 * Met à jour la liste des fichiers (version corrigée)
 */
function updateFileList() {
    const container = document.getElementById('filesContainer');
    if (!container) {
        console.error('Conteneur de fichiers non trouvé');
        return;
    }
    
    console.log('Mise à jour de la liste, fichiers:', state.files.length);
    
    if (state.files.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun fichier uploadé</p>';
        return;
    }
    
    let html = '';
    
    state.files.forEach((file, index) => {
        const isCleaned = file.cleaned && file.cleanedName;
        const displayName = isCleaned ? file.cleanedName : file.originalName;
        
        html += `
            <div class="file-card ${file.error ? 'error' : ''}" id="file-${file.id}" data-index="${index}">
                <div class="file-icon">${file.icon}</div>
                <div class="file-info">
                    <div class="file-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
                    ${isCleaned ? `
                        <div class="file-name original" title="${escapeHtml(file.originalName)}">
                            ${escapeHtml(file.originalName)}
                        </div>
                    ` : ''}
                    <div class="file-details">
                        <span>${file.size}</span>
                        <span>${file.type}</span>
                        <span>#${index + 1}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${!isCleaned ? `
                        <button class="action-btn clean" onclick="cleanFile('${file.id}')">
                            <span>✨</span> Nettoyer
                        </button>
                    ` : ''}
                    <button class="action-btn download" onclick="downloadFile('${file.id}')">
                        <span>⬇️</span> Télécharger
                    </button>
                    <button class="action-btn delete" onclick="removeFile('${file.id}')">
                        <span>🗑️</span> Supprimer
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    console.log('Liste des fichiers mise à jour avec', state.files.length, 'élément(s)');
}

/**
 * Met à jour un élément de fichier spécifique
 */
function updateFileItem(fileId) {
    const file = state.files.find(f => f.id === fileId);
    if (!file) return;
    
    const element = document.getElementById(`file-${fileId}`);
    if (!element) return;
    
    const isCleaned = file.cleaned && file.cleanedName;
    const displayName = isCleaned ? file.cleanedName : file.originalName;
    const index = state.files.findIndex(f => f.id === fileId);
    
    element.innerHTML = `
        <div class="file-icon">${file.icon}</div>
        <div class="file-info">
            <div class="file-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
            ${isCleaned ? `
                <div class="file-name original" title="${escapeHtml(file.originalName)}">
                    ${escapeHtml(file.originalName)}
                </div>
            ` : ''}
            <div class="file-details">
                <span>${file.size}</span>
                <span>${file.type}</span>
                <span>#${index + 1}</span>
            </div>
        </div>
        <div class="file-actions">
            ${!isCleaned ? `
                <button class="action-btn clean" onclick="cleanFile('${file.id}')">
                    <span>✨</span> Nettoyer
                </button>
            ` : ''}
            <button class="action-btn download" onclick="downloadFile('${file.id}')">
                <span>⬇️</span> Télécharger
            </button>
            <button class="action-btn delete" onclick="removeFile('${file.id}')">
                <span>🗑️</span> Supprimer
            </button>
        </div>
    `;
}

/**
 * Supprime un fichier
 */
function removeFile(fileId) {
    const initialCount = state.files.length;
    state.files = state.files.filter(f => f.id !== fileId);
    
    if (state.files.length < initialCount) {
        updateFileList();
        updateUI();
        showNotification('Fichier supprimé', 'info');
    }
}

/**
 * Supprime tous les fichiers
 */
function clearAllFiles() {
    if (state.files.length === 0) {
        showNotification('Aucun fichier à supprimer', 'info');
        return;
    }
    
    if (confirm(`Voulez-vous vraiment supprimer ${state.files.length} fichier(s) ?`)) {
        state.files = [];
        updateFileList();
        updateUI();
        
        // Réinitialiser l'input de fichier
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.value = '';
        }
        
        showNotification('Tous les fichiers ont été supprimés', 'info');
    }
}

/**
 * Met à jour l'interface en fonction de l'état
 */
function updateUI() {
    const hasFiles = state.files.length > 0;
    const hasCleanedFiles = state.files.some(f => f.cleaned);
    
    // Bouton "Nettoyer tous les noms"
    const cleanAllBtn = document.getElementById('cleanAllBtn');
    if (cleanAllBtn) {
        cleanAllBtn.disabled = !hasFiles;
        cleanAllBtn.title = hasFiles ? 'Nettoyer tous les noms de fichiers' : 'Ajoutez d\'abord des fichiers';
    }
    
    // Bouton "Télécharger tout"
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.disabled = !hasCleanedFiles;
        downloadAllBtn.title = hasCleanedFiles ? 'Télécharger tous les fichiers nettoyés' : 'Nettoyez d\'abord les fichiers';
    }
    
    // Mettre à jour le compteur dans l'en-tête si présent
    const fileCountElement = document.querySelector('.file-count');
    if (fileCountElement) {
        fileCountElement.textContent = `(${state.files.length})`;
    }
}

// ============================================================================
// GESTION DES OPTIONS
// ============================================================================

/**
 * Configure les écouteurs pour les options
 */
function setupOptionListeners() {
    // Option underscores
    const underscoresOption = document.getElementById('underscoresOption');
    if (underscoresOption) {
        underscoresOption.addEventListener('change', (e) => {
            state.options.useUnderscores = e.target.checked;
            saveOptions();
            // Re-nettoyer si des fichiers sont présents
            if (state.files.length > 0) {
                state.files.forEach(file => {
                    if (file.cleaned) {
                        file.cleanedName = cleanFileName(file.originalName);
                    }
                });
                updateFileList();
            }
        });
    }
    
    // Option minuscules
    const lowercaseOption = document.getElementById('lowercaseOption');
    if (lowercaseOption) {
        lowercaseOption.addEventListener('change', (e) => {
            state.options.toLowercase = e.target.checked;
            saveOptions();
            // Re-nettoyer si des fichiers sont présents
            if (state.files.length > 0) {
                state.files.forEach(file => {
                    if (file.cleaned) {
                        file.cleanedName = cleanFileName(file.originalName);
                    }
                });
                updateFileList();
            }
        });
    }
    
    // Option de préfixe
    const prefixOption = document.getElementById('prefixOption');
    if (prefixOption) {
        prefixOption.addEventListener('change', (e) => {
            state.options.usePrefix = e.target.checked;
            saveOptions();
            // Re-nettoyer si des fichiers sont présents
            if (state.files.length > 0) {
                state.files.forEach(file => {
                    if (file.cleaned) {
                        file.cleanedName = cleanFileName(file.originalName);
                    }
                });
                updateFileList();
            }
        });
    }
}

/**
 * Configure l'écouteur pour le champ préfixe
 */
function setupPrefixListener() {
    const prefixText = document.getElementById('prefixText');
    
    if (prefixText) {
        prefixText.addEventListener('input', (e) => {
            state.options.prefix = e.target.value || 'clean_';
            saveOptions();
            // Re-nettoyer si des fichiers sont présents
            if (state.files.length > 0) {
                state.files.forEach(file => {
                    if (file.cleaned) {
                        file.cleanedName = cleanFileName(file.originalName);
                    }
                });
                updateFileList();
            }
        });
    }
}

/**
 * Charge les options depuis le localStorage
 */
function loadOptions() {
    try {
        const saved = localStorage.getItem('fileCleanerOptions');
        if (saved) {
            const options = JSON.parse(saved);
            state.options = { ...state.options, ...options };
            
            // Mettre à jour l'interface
            updateOptionsUI();
            console.log('Options chargées:', state.options);
        }
    } catch (e) {
        console.error('Erreur lors du chargement des options:', e);
    }
    
    try {
        const savedChars = localStorage.getItem('fileCleanerChars');
        if (savedChars) {
            const chars = JSON.parse(savedChars);
            state.invalidChars = new Set(chars);
            updateCharPreview();
            console.log('Caractères chargés:', state.invalidChars.size, 'caractère(s)');
        }
    } catch (e) {
        console.error('Erreur lors du chargement des caractères:', e);
    }
}

/**
 * Sauvegarde les options dans le localStorage
 */
function saveOptions() {
    try {
        localStorage.setItem('fileCleanerOptions', JSON.stringify(state.options));
        localStorage.setItem('fileCleanerChars', JSON.stringify([...state.invalidChars]));
        console.log('Options sauvegardées');
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
    }
}

/**
 * Met à jour l'interface des options
 */
function updateOptionsUI() {
    const underscoresOption = document.getElementById('underscoresOption');
    const lowercaseOption = document.getElementById('lowercaseOption');
    const prefixOption = document.getElementById('prefixOption');
    const prefixText = document.getElementById('prefixText');
    
    if (underscoresOption) underscoresOption.checked = state.options.useUnderscores;
    if (lowercaseOption) lowercaseOption.checked = state.options.toLowercase;
    if (prefixOption) prefixOption.checked = state.options.usePrefix;
    if (prefixText) {
        prefixText.value = state.options.prefix;
    }
    
    // Afficher/masquer le champ préfixe
    const prefixInputContainer = document.getElementById('prefixInputContainer');
    if (prefixInputContainer) {
        prefixInputContainer.style.display = state.options.usePrefix ? 'block' : 'none';
    }
}

// ============================================================================
// GESTION DES CARACTÈRES
// ============================================================================

/**
 * Met à jour l'aperçu des caractères
 */
function updateCharPreview() {
    const preview = document.getElementById('charPreview');
    if (!preview) return;
    
    const chars = Array.from(state.invalidChars).slice(0, 20);
    
    preview.innerHTML = chars.map(char => 
        `<span title="${char === ' ' ? 'Espace' : char}">${
            char === ' ' ? '[ ]' : 
            char === '\t' ? '[tab]' : 
            char === '\n' ? '[nl]' : 
            escapeHtml(char)
        }</span>`
    ).join('');
    
    if (state.invalidChars.size > 20) {
        preview.innerHTML += `<span>+${state.invalidChars.size - 20}...</span>`;
    }
}

/**
 * Ouvre le modal d'édition des caractères
 */
function openCharModal() {
    const modal = document.getElementById('charModal');
    if (!modal) return;
    
    updateCharModal();
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Réinitialiser le compteur
    const charCountElement = document.getElementById('charCount');
    if (charCountElement) {
        charCountElement.textContent = '0';
        charCountElement.style.color = '#6c757d';
    }
}

/**
 * Ferme le modal
 */
function closeCharModal() {
    const modal = document.getElementById('charModal');
    if (!modal) return;
    
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

/**
 * Met à jour le contenu du modal
 */
function updateCharModal() {
    const container = document.getElementById('charListDisplay');
    if (!container) return;
    
    const chars = Array.from(state.invalidChars).sort();
    
    container.innerHTML = chars.map(char => `
        <div class="char-item">
            <div class="char-text">${
                char === ' ' ? '[espace]' : 
                char === '\t' ? '[tab]' : 
                char === '\n' ? '[nl]' : 
                escapeHtml(char)
            }</div>
            <button class="char-remove" onclick="removeCharFromModal('${escapeHtml(char)}')">×</button>
        </div>
    `).join('');
}

/**
 * Met à jour le compteur de caractères dans le modal
 */
function updateCharCounter() {
    const input = document.getElementById('newCharInput');
    const charCountElement = document.getElementById('charCount');
    
    if (!input || !charCountElement) return;
    
    const text = input.value;
    const uniqueChars = new Set();
    
    for (let char of text) {
        uniqueChars.add(char);
    }
    
    const count = uniqueChars.size;
    charCountElement.textContent = count;
    
    // Changer la couleur en fonction du nombre
    if (count === 0) {
        charCountElement.style.color = '#6c757d';
    } else if (count <= 10) {
        charCountElement.style.color = '#28a745';
    } else {
        charCountElement.style.color = '#dc3545';
    }
}

/**
 * Ajoute des caractères depuis le modal
 */
function addCharFromModal() {
    const input = document.getElementById('newCharInput');
    if (!input || !input.value.trim()) {
        showNotification('Veuillez entrer des caractères à ajouter.', 'warning');
        return;
    }
    
    const text = input.value;
    const uniqueChars = new Set();
    let addedCount = 0;
    
    // Collecter les caractères uniques
    for (let char of text) {
        uniqueChars.add(char);
    }
    
    // Ajouter chaque caractère unique qui n'est pas déjà dans la liste
    uniqueChars.forEach(char => {
        if (!state.invalidChars.has(char)) {
            state.invalidChars.add(char);
            addedCount++;
        }
    });
    
    // Mettre à jour l'affichage
    updateCharModal();
    updateCharPreview();
    
    // Réinitialiser le champ et le compteur
    input.value = '';
    updateCharCounter();
    
    // Sauvegarder et notifier
    saveOptions();
    
    if (addedCount > 0) {
        showNotification(`${addedCount} caractère(s) unique(s) ajouté(s) à la liste.`, 'success');
    } else {
        showNotification('Tous les caractères étaient déjà dans la liste.', 'info');
    }
}

/**
 * Supprime un caractère depuis le modal
 */
function removeCharFromModal(char) {
    state.invalidChars.delete(char);
    updateCharModal();
    updateCharPreview();
    saveOptions();
    
    showNotification('Caractère supprimé de la liste', 'info');
}

/**
 * Réinitialise les caractères
 */
function resetChars() {
    if (confirm('Réinitialiser la liste des caractères aux valeurs par défaut ?')) {
        state.invalidChars = new Set([
            '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
            '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
            '★', '☆', '✰', '✦', '✧', '❄', '❆', '❖', '✿', '❀', '❁', '❤', '➤', '➥', '➦',
            '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '²', '~', '`', '´',
            ',', ';', '!', '(', ')', '[', ']', '{', '}', '@', '&', '$', '%', '^',
            '+', '=', '§', '°', '¨', '£', '€', '¥',
            '\t', '\n', '\r'
        ]);
        
        updateCharModal();
        updateCharPreview();
        saveOptions();
        
        showNotification('Caractères réinitialisés', 'success');
    }
}

/**
 * Applique une présélection de caractères
 */
function applyPreset(chars) {
    let addedCount = 0;
    
    chars.split('').forEach(char => {
        if (!state.invalidChars.has(char)) {
            state.invalidChars.add(char);
            addedCount++;
        }
    });
    
    updateCharModal();
    updateCharPreview();
    saveOptions();
    
    if (addedCount > 0) {
        showNotification(`${addedCount} caractère(s) ajouté(s) depuis la présélection`, 'success');
    }
}

// ============================================================================
// GESTION DU MODAL
// ============================================================================

/**
 * Configure les écouteurs du modal
 */
function setupModalListeners() {
    // Bouton pour ouvrir le modal
    const editBtn = document.getElementById('editCharsBtn');
    if (editBtn) {
        editBtn.addEventListener('click', openCharModal);
    }
    
    // Fermeture du modal
    const modal = document.getElementById('charModal');
    if (modal) {
        // Bouton de fermeture
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCharModal);
        }
        
        // Fermer en cliquant en dehors
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCharModal();
            }
        });
        
        // Touche Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeCharModal();
            }
        });
    }
    
    // Boutons du modal
    const addCharBtn = document.getElementById('addCharBtn');
    if (addCharBtn) {
        addCharBtn.addEventListener('click', addCharFromModal);
    }
    
    const newCharInput = document.getElementById('newCharInput');
    if (newCharInput) {
        newCharInput.addEventListener('input', updateCharCounter);
        newCharInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addCharFromModal();
            }
        });
    }
    
    const resetCharsBtn = document.getElementById('resetCharsBtn');
    if (resetCharsBtn) {
        resetCharsBtn.addEventListener('click', resetChars);
    }
    
    const saveCharsBtn = document.getElementById('saveCharsBtn');
    if (saveCharsBtn) {
        saveCharsBtn.addEventListener('click', () => {
            closeCharModal();
            showNotification('Caractères enregistrés', 'success');
        });
    }
    
    // Boutons de présélection
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chars = e.target.dataset.chars;
            applyPreset(chars);
        });
    });
}

// ============================================================================
// BOUTONS D'ACTION
// ============================================================================

/**
 * Configure les écouteurs pour les boutons d'action
 */
function setupActionListeners() {
    // Nettoyer tous les fichiers
    const cleanAllBtn = document.getElementById('cleanAllBtn');
    if (cleanAllBtn) {
        cleanAllBtn.addEventListener('click', cleanAllFiles);
    }
    
    // Télécharger tous les fichiers
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', downloadAllFiles);
    }
    
    // Effacer tous les fichiers
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFiles);
    }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Affiche une notification
 */
function showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    // Styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    // Couleurs
    const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Ajouter au document
    document.body.appendChild(notification);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Échappe le HTML pour la sécurité
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Ajoute les styles CSS pour les animations
 */
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// DÉMARRAGE
// ============================================================================

// Ajouter les styles d'animation
addAnimationStyles();

// Initialiser l'application quand le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exposer les fonctions globales
window.cleanFile = cleanFile;
window.downloadFile = downloadFile;
window.removeFile = removeFile;
window.removeCharFromModal = removeCharFromModal;