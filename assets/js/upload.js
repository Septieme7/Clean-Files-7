/**
 * ==========================================================================
 * Fichier: upload.js
 * Description: Gestion de l'upload et du nettoyage de fichiers
 * Limites: 2 Go/fichier - 10 Go total - 500 fichiers
 * Architecture: 777
 * ==========================================================================
 */

// ============================================================================
// SECTION 1 : CONFIGURATION DE L'APPLICATION
// Définition des constantes et limites du système
// ============================================================================

/**
 * Configuration globale de l'application
 * Limites augmentées pour usage professionnel
 */
const CONFIG = {
    // --- Limites de fichiers ---
    maxFiles: 500,                              // Nombre maximum de fichiers
    maxFileSize: 2 * 1024 * 1024 * 1024,       // 2 Go par fichier (en octets)
    maxTotalSize: 10 * 1024 * 1024 * 1024,     // 10 Go total (en octets)
    
    // --- Types de fichiers ---
    allowedTypes: '*/*',                        // Tous types acceptés
    
    // --- Interface utilisateur ---
    chunkSize: 1024 * 1024,                    // 1 Mo pour le traitement par chunks
    notificationDuration: 3000,                 // Durée des notifications (ms)
    
    // --- Messages ---
    messages: {
        maxFilesReached: 'Limite atteinte : maximum 500 fichiers autorisés.',
        maxSizeReached: 'Limite atteinte : taille totale maximum de 10 Go.',
        fileTooLarge: 'Fichier trop volumineux : maximum 2 Go par fichier.',
        noFiles: 'Aucun fichier à traiter.',
        uploadSuccess: 'Fichier(s) ajouté(s) avec succès.',
        cleanSuccess: 'Nom(s) de fichier(s) nettoyé(s).',
        downloadStarted: 'Téléchargement démarré.',
        fileRemoved: 'Fichier supprimé.',
        allCleared: 'Tous les fichiers ont été supprimés.'
    }
};

// ============================================================================
// SECTION 2 : ÉTAT DE L'APPLICATION
// Variables globales et gestion de l'état
// ============================================================================

/**
 * État global de l'application
 * Stocke les fichiers, options et caractères invalides
 */
let state = {
    // --- Liste des fichiers uploadés ---
    files: [],
    
    // --- Taille totale actuelle (en octets) ---
    totalSize: 0,
    
    // --- Caractères invalides à remplacer par des espaces ---
    invalidChars: new Set([
        // Émoticônes et symboles
        '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
        '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
        '★', '☆', '✰', '✦', '✧', '℃', '←', '▎', '✿', '❀', '❁', '❤', '➤', '➥', '➦',
        
        // Caractères spéciaux problématiques pour les systèmes de fichiers
        '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '²', '~', '`', '´',
        
        // Ponctuation et symboles
        ',', ';', '!', '(', ')', '[', ']', '{', '}', '@', '&', '$', '%', '^',
        '+', '=', '§', '°', '¨', '£', '€', '¥',
        
        // Caractères de contrôle
        '\t', '\n', '\r'
    ]),
    
    // --- Options de nettoyage ---
    options: {
        useUnderscores: false,  // Remplacer espaces par underscores
        toLowercase: false,     // Convertir en minuscules
        usePrefix: false,       // Ajouter un préfixe
        prefix: 'clean_'        // Préfixe par défaut
    }
};

// ============================================================================
// SECTION 3 : INITIALISATION
// Démarrage de l'application et configuration des événements
// ============================================================================

/**
 * Initialise l'application au chargement du DOM
 * Configure tous les écouteurs d'événements nécessaires
 */
function init() {
    console.log('🚀 Initialisation de l\'application upload...');
    console.log(`📊 Limites: ${CONFIG.maxFiles} fichiers, ${formatFileSize(CONFIG.maxFileSize)}/fichier, ${formatFileSize(CONFIG.maxTotalSize)} total`);
    
    // Configuration des écouteurs
    setupDropZone();
    setupFileInput();
    setupOptions();
    setupActions();
    setupModal();
    setupArchiveModal();
    
    // Chargement des données sauvegardées
    loadSavedData();
    loadArchiveHistory();
    
    // Mise à jour de l'interface
    updateCharPreview();
    updateUI();
    updateStats();
    
    console.log('✅ Application initialisée avec succès');
}

/**
 * Configure la zone de glisser-déposer
 */
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) {
        console.error('❌ Element dropZone non trouvé');
        return;
    }
    
    // Événements de drag & drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Clic sur la zone
    dropZone.addEventListener('click', (e) => {
        // Éviter les clics multiples
        if (e.target.tagName === 'LABEL' || e.target.tagName === 'BUTTON') return;
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
    });
    
    console.log('📦 Zone de dépôt configurée');
}

/**
 * Configure l'input de fichiers
 */
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        console.error('❌ Element fileInput non trouvé');
        return;
    }
    
    fileInput.addEventListener('change', handleFileSelect);
    console.log('📁 Input fichier configuré');
}

/**
 * Configure les options de nettoyage
 */
function setupOptions() {
    // Option underscores
    const underscoresOption = document.getElementById('underscoresOption');
    if (underscoresOption) {
        underscoresOption.addEventListener('change', (e) => {
            state.options.useUnderscores = e.target.checked;
            saveData();
            reprocessCleanedFiles();
        });
    }
    
    // Option minuscules
    const lowercaseOption = document.getElementById('lowercaseOption');
    if (lowercaseOption) {
        lowercaseOption.addEventListener('change', (e) => {
            state.options.toLowercase = e.target.checked;
            saveData();
            reprocessCleanedFiles();
        });
    }
    
    // Option préfixe (checkbox)
    const prefixOption = document.getElementById('prefixOption');
    const prefixInputContainer = document.getElementById('prefixInputContainer');
    if (prefixOption) {
        prefixOption.addEventListener('change', (e) => {
            state.options.usePrefix = e.target.checked;
            if (prefixInputContainer) {
                prefixInputContainer.style.display = e.target.checked ? 'block' : 'none';
            }
            saveData();
            reprocessCleanedFiles();
        });
    }
    
    // Option préfixe (texte)
    const prefixText = document.getElementById('prefixText');
    if (prefixText) {
        prefixText.addEventListener('input', (e) => {
            state.options.prefix = e.target.value || 'clean_';
            saveData();
            reprocessCleanedFiles();
        });
    }
    
    console.log('⚙️ Options configurées');
}

/**
 * Configure les boutons d'action globaux
 */
function setupActions() {
    // Bouton nettoyer tous
    const cleanAllBtn = document.getElementById('cleanAllBtn');
    if (cleanAllBtn) {
        cleanAllBtn.addEventListener('click', cleanAllFiles);
    }
    
    // Bouton télécharger tous
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', startParallelDownloads);
    }
    
    // Bouton tout effacer
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFiles);
    }
    
    console.log('🎯 Actions configurées');
}

/**
 * Configure le modal d'édition des caractères
 */
function setupModal() {
    // Bouton ouvrir le modal
    const editBtn = document.getElementById('editCharsBtn');
    if (editBtn) {
        editBtn.addEventListener('click', openCharModal);
    }
    
    // Bouton fermer le modal
    const modal = document.getElementById('charModal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCharModal);
        }
        
        // Fermer en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCharModal();
        });
        
        // Fermer avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeCharModal();
            }
        });
    }
    
    // Bouton ajouter caractères
    const addCharBtn = document.getElementById('addCharBtn');
    if (addCharBtn) {
        addCharBtn.addEventListener('click', addCharsFromModal);
    }
    
    // Input de nouveaux caractères
    const newCharInput = document.getElementById('newCharInput');
    if (newCharInput) {
        newCharInput.addEventListener('input', updateCharCounter);
        newCharInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addCharsFromModal();
        });
    }
    
    // Bouton réinitialiser
    const resetCharsBtn = document.getElementById('resetCharsBtn');
    if (resetCharsBtn) {
        resetCharsBtn.addEventListener('click', resetChars);
    }
    
    // Bouton sauvegarder
    const saveCharsBtn = document.getElementById('saveCharsBtn');
    if (saveCharsBtn) {
        saveCharsBtn.addEventListener('click', () => {
            saveData();
            closeCharModal();
            reprocessCleanedFiles();
            updateFileList();
            showNotification('Caractères enregistrés - Noms réactualisés', 'success');
        });
    }
    
    // Boutons de présélection
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chars = e.target.dataset.chars;
            if (chars) applyPreset(chars);
        });
    });
    
    console.log('📝 Modal configuré');
}

// ============================================================================
// SECTION 4 : GESTION DU DRAG & DROP
// Événements de glisser-déposer des fichiers
// ============================================================================

/**
 * Gère l'événement dragover (fichier au-dessus de la zone)
 * @param {DragEvent} event - Événement de drag
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = document.getElementById('dropZone');
    if (dropZone && !dropZone.classList.contains('drag-over')) {
        dropZone.classList.add('drag-over');
    }
}

/**
 * Gère l'événement dragleave (fichier quitte la zone)
 * @param {DragEvent} event - Événement de drag
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
 * Gère l'événement drop (fichier déposé)
 * @param {DragEvent} event - Événement de drop
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.classList.remove('drag-over');
    }
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        console.log(`📥 ${files.length} fichier(s) déposé(s)`);
        processFiles(Array.from(files));
    }
}

// ============================================================================
// SECTION 5 : GESTION DE LA SÉLECTION DE FICHIERS
// Traitement des fichiers sélectionnés via l'input
// ============================================================================

/**
 * Gère la sélection de fichiers via l'input
 * @param {Event} event - Événement change de l'input
 */
function handleFileSelect(event) {
    const files = event.target?.files;
    if (files && files.length > 0) {
        console.log(`📁 ${files.length} fichier(s) sélectionné(s)`);
        processFiles(Array.from(files));
    }
    
    // Réinitialiser l'input pour permettre de re-sélectionner les mêmes fichiers
    event.target.value = '';
}

// ============================================================================
// SECTION 6 : TRAITEMENT DES FICHIERS
// Validation et ajout des fichiers à l'état
// ============================================================================

/**
 * Traite un tableau de fichiers
 * Valide les limites et ajoute les fichiers valides
 * @param {File[]} files - Tableau de fichiers à traiter
 */
function processFiles(files) {
    if (!files || files.length === 0) {
        console.log('⚠️ Aucun fichier à traiter');
        return;
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    let errors = [];
    
    // Afficher la progression pour les gros volumes
    const showProgress = files.length > 10;
    if (showProgress) {
        showProgressBar();
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Mettre à jour la progression
        if (showProgress) {
            updateProgressBar((i / files.length) * 100, `Traitement: ${i + 1}/${files.length}`);
        }
        
        // Vérification 1: Nombre maximum de fichiers
        if (state.files.length >= CONFIG.maxFiles) {
            errors.push(`Limite de ${CONFIG.maxFiles} fichiers atteinte`);
            skippedCount += files.length - i;
            break;
        }
        
        // Vérification 2: Taille du fichier individuel
        if (file.size > CONFIG.maxFileSize) {
            errors.push(`${file.name}: dépasse 2 Go`);
            skippedCount++;
            continue;
        }
        
        // Vérification 3: Taille totale
        if (state.totalSize + file.size > CONFIG.maxTotalSize) {
            errors.push(`Limite de 10 Go totale atteinte`);
            skippedCount += files.length - i;
            break;
        }
        
        // Vérification 4: Doublon (même nom et taille)
        const isDuplicate = state.files.some(f => 
            f.originalName === file.name && 
            f.originalFile.size === file.size
        );
        
        if (isDuplicate) {
            skippedCount++;
            continue;
        }
        
        // Créer l'objet fichier
        const fileObj = {
            id: generateId(),
            originalFile: file,
            originalName: file.name,
            cleanedName: null,
            size: file.size,
            formattedSize: formatFileSize(file.size),
            type: getFileType(file),
            icon: getFileIcon(file),
            cleaned: false,
            addedAt: Date.now()
        };
        
        // Ajouter à l'état
        state.files.push(fileObj);
        state.totalSize += file.size;
        addedCount++;
    }
    
    // Masquer la progression
    if (showProgress) {
        hideProgressBar();
    }
    
    // Mettre à jour l'interface
    updateFileList();
    updateUI();
    updateStats();
    
    // Notifications
    if (addedCount > 0) {
        showNotification(`${addedCount} fichier(s) ajouté(s)`, 'success');
    }
    
    if (errors.length > 0) {
        // Afficher les premières erreurs seulement
        const displayErrors = errors.slice(0, 3);
        if (errors.length > 3) {
            displayErrors.push(`... et ${errors.length - 3} autre(s) erreur(s)`);
        }
        showNotification(displayErrors.join('\n'), 'warning');
    }
    
    console.log(`✅ Traitement terminé: ${addedCount} ajoutés, ${skippedCount} ignorés`);
}

// ============================================================================
// SECTION 7 : NETTOYAGE DES NOMS DE FICHIERS
// Algorithme de remplacement des caractères invalides
// ============================================================================

/**
 * Nettoie un nom de fichier en remplaçant les caractères invalides
 * @param {string} filename - Nom de fichier original
 * @returns {string} Nom de fichier nettoyé
 */
function cleanFileName(filename) {
    if (!filename || typeof filename !== 'string') {
        return 'fichier_sans_nom';
    }
    
    // Séparer le nom et l'extension
    const lastDotIndex = filename.lastIndexOf('.');
    let name = filename;
    let extension = '';
    
    if (lastDotIndex > 0) {
        name = filename.substring(0, lastDotIndex);
        extension = filename.substring(lastDotIndex);
    }
    
    let cleanedName = name;
    
    // Remplacer chaque caractère invalide par un espace
    state.invalidChars.forEach(char => {
        const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedChar, 'g');
        cleanedName = cleanedName.replace(regex, ' ');
    });
    
    // Nettoyer les espaces multiples et trim
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
    
    // Nom par défaut si vide
    if (!cleanedName || cleanedName.trim() === '') {
        cleanedName = 'fichier';
    }
    
    return cleanedName + extension;
}

/**
 * Nettoie un fichier spécifique par son ID
 * @param {string} fileId - ID du fichier à nettoyer
 */
function cleanFile(fileId) {
    const file = state.files.find(f => f.id === fileId);
    if (!file) {
        console.error('❌ Fichier non trouvé:', fileId);
        return;
    }
    
    file.cleanedName = cleanFileName(file.originalName);
    file.cleaned = true;
    
    updateFileItem(fileId);
    updateUI();
    showNotification('Fichier nettoyé', 'success');
}

/**
 * Nettoie tous les fichiers non encore nettoyés
 */
function cleanAllFiles() {
    if (state.files.length === 0) {
        showNotification(CONFIG.messages.noFiles, 'warning');
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

/**
 * Re-traite les fichiers déjà nettoyés (après changement d'options)
 */
function reprocessCleanedFiles() {
    state.files.forEach(file => {
        if (file.cleaned) {
            file.cleanedName = cleanFileName(file.originalName);
        }
    });
    
    updateFileList();
}

// ============================================================================
// SECTION 8 : TÉLÉCHARGEMENT DES FICHIERS
// Gestion du téléchargement individuel et par lots
// ============================================================================

/**
 * Télécharge un fichier spécifique par son ID
 * @param {string} fileId - ID du fichier à télécharger
 */
function downloadFile(fileId) {
    const fileObj = state.files.find(f => f.id === fileId);
    if (!fileObj) {
        showNotification('Fichier non trouvé', 'error');
        return;
    }
    
    try {
        const url = URL.createObjectURL(fileObj.originalFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileObj.cleanedName || fileObj.originalName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Libérer l'URL après un délai configurable (par défaut 100ms)
        const revokeDelay = arguments.length >= 2 && typeof arguments[1] === 'number' ? arguments[1] : 100;
        setTimeout(() => URL.revokeObjectURL(url), revokeDelay);
        
        showNotification(CONFIG.messages.downloadStarted, 'success');
    } catch (error) {
        console.error('❌ Erreur de téléchargement:', error);
        showNotification('Erreur lors du téléchargement', 'error');
    }
}

/**
 * Télécharge tous les fichiers nettoyés
 * Utilise un délai entre chaque téléchargement pour éviter les blocages
 */
async function downloadAllFiles(concurrency = 5) {
    const cleanedFiles = state.files.filter(f => f.cleaned);
    
    if (cleanedFiles.length === 0) {
        showNotification('Aucun fichier nettoyé à télécharger', 'warning');
        return;
    }

    const total = cleanedFiles.length;
    showNotification(`Démarrage du téléchargement de ${total} fichier(s) (par ${concurrency} parallèles)...`, 'info');
    showProgressBar();

    let index = 0;
    let completed = 0;

    // Worker qui prend le prochain fichier et déclenche le téléchargement
    async function worker(id) {
        while (true) {
            let i;
            // Prendre un index atomique
            i = index++;
            if (i >= total) break;

            const fileObj = cleanedFiles[i];
            try {
                // Démarrer le téléchargement et laisser 2000ms avant de libérer l'URL
                downloadFile(fileObj.id, 2000);
            } catch (e) {
                console.error('Erreur lors du déclenchement du téléchargement:', e);
            }

            completed++;
            const percent = Math.round((completed / total) * 100);
            updateProgressBar(percent, `Téléchargement ${completed}/${total}`);

            // Petite pause pour éviter d'ouvrir trop d'onglets en même temps
            await new Promise(r => setTimeout(r, 150));
        }
    }

    // Lancer N workers
    const workers = [];
    const actualConcurrency = Math.max(1, Math.min(concurrency, total));
    for (let w = 0; w < actualConcurrency; w++) {
        workers.push(worker(w));
    }

    await Promise.all(workers);
    hideProgressBar();
    showNotification(`Téléchargement terminé (${total} fichiers)`, 'success');
}

/**
 * Wrapper appelé par le bouton UI. Lit la valeur du select et lance les téléchargements parallèles.
 */
function startParallelDownloads() {
    const sel = document.getElementById('downloadConcurrency');
    let concurrency = 5;
    if (sel) {
        const v = parseInt(sel.value, 10);
        if (!isNaN(v) && v > 0) concurrency = v;
    }
    downloadAllFiles(concurrency).catch(err => {
        console.error('Erreur lors des téléchargements parallèles:', err);
        showNotification('Erreur lors des téléchargements. Tentative séquentielle en fallback.', 'warning');
        // fallback séquentiel: télécharger un par un
        (async () => {
            const cleanedFiles = state.files.filter(f => f.cleaned);
            for (let i = 0; i < cleanedFiles.length; i++) {
                await new Promise(r => setTimeout(() => { downloadFile(cleanedFiles[i].id, 2000); r(); }, 300));
            }
        })();
    });
}

// ============================================================================
// SECTION 8.5 : ARCHIVAGE DES FICHIERS
// Gestion des archives ZIP avec options avancées
// ============================================================================

/**
 * État global pour l'archivage
 */
let archiveState = {
    history: [],
    maxHistoryItems: 10
};

/**
 * Ouvre le modal d'archivage
 */
function openArchiveModal() {
    const cleanedFiles = state.files.filter(f => f.cleaned);
    
    if (cleanedFiles.length === 0) {
        showNotification('Aucun fichier nettoyé à archiver', 'warning');
        return;
    }
    
    const modal = document.getElementById('archiveModal');
    if (modal) {
        updateArchiveHistory();
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Ferme le modal d'archivage
 */
function closeArchiveModal() {
    const modal = document.getElementById('archiveModal');
    if (modal) {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

/**
 * Met à jour l'historique des archives
 */
function updateArchiveHistory() {
    const historyContainer = document.getElementById('archiveHistory');
    if (!historyContainer) return;
    
    if (archiveState.history.length === 0) {
        historyContainer.innerHTML = '<p class="empty-message">Aucune archive créée encore</p>';
        return;
    }
    
    let html = '<div class="history-items">';
    
    archiveState.history.forEach((item, index) => {
        html += `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-name">${escapeHtml(item.name)}</div>
                    <div class="history-details">
                        <span>${formatFileSize(item.size)}</span>
                        <span>${item.filesCount} fichier(s)</span>
                        <span>${new Date(item.created).toLocaleString('fr-FR')}</span>
                    </div>
                </div>
                <button class="history-download" onclick="downloadArchiveFromHistory(${index})" title="Télécharger">
                    ⬇️
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    historyContainer.innerHTML = html;
}

/**
 * Crée une archive ZIP avec les options sélectionnées
 */
// ============================================================================
// ZIP NATIF - Implémentation simple sans dépendance externe
// Crée des archives ZIP valides en JavaScript pur
// ============================================================================

/**
 * Crée un CRC32 pour un buffer (pour validation ZIP)
 */
function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ ((crc ^ buf[i]) & 0xFF);
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Compresse un buffer avec DEFLATE simple (pseudo-compression)
 * Utilise une approche simple sans vraie compression
 */
function deflateSimple(data) {
    // Pour la démo, on retourne les données brutes
    // Une vraie compression prendrait trop d'espace en code
    // Cette fonction marque juste les données comme "non compressées"
    return { data, isCompressed: false };
}

/**
 * Crée un archive ZIP simple
 */
async function createNativeZip(files) {
    console.log('🔨 Création ZIP natif avec', files.length, 'fichiers');
    
    const parts = [];
    const localHeaders = [];
    let offset = 0;
    
    // 1. Créer chaque entrée (local header + compressed data)
    for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        const fileName = fileObj.cleanedName || fileObj.originalName;
        const fileNameBytes = new TextEncoder().encode(fileName);
        
        // Convertir File en ArrayBuffer
        const arrayBuffer = await fileObj.originalFile.arrayBuffer();
        const fileData = new Uint8Array(arrayBuffer);
        
        // CRC32 et taille
        const crc = crc32(fileData);
        
        // Créer le local header
        const header = new ArrayBuffer(30 + fileNameBytes.length);
        const view = new DataView(header);
        
        // Signature
        view.setUint32(0, 0x04034b50, true); // PK\x03\x04
        
        // Version minimale
        view.setUint16(4, 20, true);
        
        // Flags (bit 3 = data descriptor not present)
        view.setUint16(6, 0, true);
        
        // Compression method (0 = stored/non compressé)
        view.setUint16(8, 0, true);
        
        // Modification time (DOS format)
        view.setUint16(10, 0, true);
        
        // Modification date
        view.setUint16(12, 0, true);
        
        // CRC32
        view.setUint32(14, crc, true);
        
        // Compressed size
        view.setUint32(18, fileData.length, true);
        
        // Uncompressed size
        view.setUint32(22, fileData.length, true);
        
        // File name length
        view.setUint16(26, fileNameBytes.length, true);
        
        // Extra field length
        view.setUint16(28, 0, true);
        
        // File name
        new Uint8Array(header, 30).set(fileNameBytes);
        
        // Ajouter le header local et les données
        parts.push(new Uint8Array(header));
        parts.push(fileData);
        
        // Garder une trace pour le central directory
        localHeaders.push({
            fileName,
            fileNameBytes,
            crc,
            compressedSize: fileData.length,
            uncompressedSize: fileData.length,
            offset
        });
        
        offset += header.byteLength + fileData.byteLength;
        
        // Respirer un peu
        if (i % 10 === 0) {
            await new Promise(r => setTimeout(r, 10));
        }
    }
    
    // 2. Créer le central directory
    const centralDirParts = [];
    let centralDirSize = 0;
    
    for (const info of localHeaders) {
        const cdHeader = new ArrayBuffer(46 + info.fileNameBytes.length);
        const view = new DataView(cdHeader);
        
        // Signature
        view.setUint32(0, 0x02014b50, true); // PK\x01\x02
        
        // Version made by
        view.setUint16(4, 20, true);
        
        // Version needed
        view.setUint16(6, 20, true);
        
        // Flags
        view.setUint16(8, 0, true);
        
        // Compression method
        view.setUint16(10, 0, true);
        
        // Modification time
        view.setUint16(12, 0, true);
        
        // Modification date
        view.setUint16(14, 0, true);
        
        // CRC32
        view.setUint32(16, info.crc, true);
        
        // Compressed size
        view.setUint32(20, info.compressedSize, true);
        
        // Uncompressed size
        view.setUint32(24, info.uncompressedSize, true);
        
        // File name length
        view.setUint16(28, info.fileNameBytes.length, true);
        
        // Extra field length
        view.setUint16(30, 0, true);
        
        // File comment length
        view.setUint16(32, 0, true);
        
        // Disk number start
        view.setUint16(34, 0, true);
        
        // Internal file attributes
        view.setUint16(36, 0, true);
        
        // External file attributes
        view.setUint32(38, 0, true);
        
        // Relative offset of local header
        view.setUint32(42, info.offset, true);
        
        // File name
        new Uint8Array(cdHeader, 46).set(info.fileNameBytes);
        
        centralDirParts.push(new Uint8Array(cdHeader));
        centralDirSize += cdHeader.byteLength;
    }
    
    // 3. Créer l'end of central directory record
    const centralDirStart = offset;
    const eocdHeader = new ArrayBuffer(22);
    const view = new DataView(eocdHeader);
    
    // Signature
    view.setUint32(0, 0x06054b50, true); // PK\x05\x06
    
    // Disk number
    view.setUint16(4, 0, true);
    
    // Disk with central dir
    view.setUint16(6, 0, true);
    
    // Entries on this disk
    view.setUint16(8, localHeaders.length, true);
    
    // Total entries
    view.setUint16(10, localHeaders.length, true);
    
    // Central dir size
    view.setUint32(12, centralDirSize, true);
    
    // Central dir offset
    view.setUint32(16, centralDirStart, true);
    
    // Comment length
    view.setUint16(20, 0, true);
    
    // Assembler le ZIP final
    parts.push(...centralDirParts);
    parts.push(new Uint8Array(eocdHeader));
    
    // Créer le blob final
    const blob = new Blob(parts, { type: 'application/zip' });
    
    console.log('✅ ZIP natif créé:', formatFileSize(blob.size));
    return blob;
}

async function createArchive() {
    const cleanedFiles = state.files.filter(f => f.cleaned);
    
    console.log('🔍 createArchive() appelé (ZIP natif)', { filesCount: cleanedFiles.length });
    
    if (cleanedFiles.length === 0) {
        console.warn('⚠️ Aucun fichier nettoyé à archiver');
        showNotification('Aucun fichier nettoyé à archiver', 'warning');
        return;
    }
    
    // Récupérer les options
    const compressionLevel = parseInt(document.getElementById('compressionLevel')?.value || '5');
    const usePassword = document.getElementById('usePassword')?.checked || false;
    const archivePassword = document.getElementById('archivePassword')?.value || '';
    const enableSplit = document.getElementById('enableSplit')?.checked || false;
    const splitSize = parseInt(document.getElementById('splitSize')?.value || '500') * 1024 * 1024;
    const archiveFormat = document.getElementById('archiveFormat')?.value || 'zip';
    
    // Validation du mot de passe
    if (usePassword && !archivePassword) {
        showNotification('Veuillez entrer un mot de passe', 'warning');
        return;
    }
    
    // Note: pas de compression pour la démo (ZIP valide mais non compressé)
    if (usePassword) {
        showNotification('⚠️ Note: Le mot de passe n\'est pas supporté. Les fichiers seront non chiffrés.', 'info');
    }
    
    closeArchiveModal();
    showProgressBar();
    
    try {
        const archiveName = `cleaned_files_${Date.now()}`;
        const totalSize = cleanedFiles.reduce((sum, f) => sum + f.size, 0);
        
        console.log('📦 Création archive ZIP natif', { 
            archiveName, 
            totalSize: formatFileSize(totalSize),
            filesCount: cleanedFiles.length
        });
        
        // Créer le ZIP natif
        let processedSize = 0;
        for (let i = 0; i < cleanedFiles.length; i++) {
            const fileObj = cleanedFiles[i];
            const percent = (i / cleanedFiles.length) * 100;
            const fileName = `${fileObj.cleanedName || fileObj.originalName}`;
            
            updateProgressBar(percent, `Traitement: ${i + 1}/${cleanedFiles.length}`);
            
            // Laisser respirer le navigateur
            if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        updateProgressBar(75, 'Génération du ZIP...');
        
        const blob = await createNativeZip(cleanedFiles);
        
        console.log('✅ Archive ZIP généré avec succès', { 
            blobSize: formatFileSize(blob.size),
            type: blob.type 
        });
        
        // Télécharger l'archive
        updateProgressBar(90, 'Téléchargement de l\'archive...');
        
        let ext = 'zip';
        if (archiveFormat === '7z') {
            ext = '7z';
        } else if (archiveFormat === 'rar') {
            ext = 'rar';
        }
        
        const downloadName = `${archiveName}.${ext}`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        
        updateProgressBar(100, 'Téléchargement terminé!');
        showNotification(`Archive créée et téléchargée (${formatFileSize(blob.size)})`, 'success');
        
        addToArchiveHistory({
            name: downloadName,
            size: blob.size,
            filesCount: cleanedFiles.length,
            created: Date.now(),
            options: { compressionLevel, usePassword: false, enableSplit, archiveFormat }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'archive:', error);
        console.error('   Stack:', error.stack);
        console.error('   Message:', error.message);
        
        showNotification('Erreur lors de la création de l\'archive: ' + error.message, 'error');
    } finally {
        hideProgressBar();
        console.log('📊 createArchive() terminé');
    }
}

/**
 * Ajoute une archive à l'historique
 */
function addToArchiveHistory(archiveInfo) {
    archiveState.history.unshift(archiveInfo);
    
    // Limiter l'historique à maxHistoryItems
    if (archiveState.history.length > archiveState.maxHistoryItems) {
        archiveState.history = archiveState.history.slice(0, archiveState.maxHistoryItems);
    }
    
    // Sauvegarder l'historique
    try {
        localStorage.setItem('archive_history', JSON.stringify(archiveState.history));
    } catch (e) {
        console.warn('❌ Impossible de sauvegarder l\'historique:', e);
    }
}

/**
 * Charge l'historique des archives depuis le localStorage
 */
function loadArchiveHistory() {
    try {
        const saved = localStorage.getItem('archive_history');
        if (saved) {
            archiveState.history = JSON.parse(saved);
        }
    } catch (e) {
        console.warn('❌ Impossible de charger l\'historique:', e);
    }
}

/**
 * Télécharge une archive depuis l'historique en recréant l'archive avec les mêmes options
 */
function downloadArchiveFromHistory(index) {
    if (!archiveState.history[index]) {
        showNotification('Archive non trouvée dans l\'historique', 'error');
        return;
    }
    
    const archiveInfo = archiveState.history[index];
    
    // Récupérer les options de l'archive
    if (archiveInfo.options) {
        document.getElementById('compressionLevel').value = archiveInfo.options.compressionLevel || '5';
        document.getElementById('usePassword').checked = false; // Ne pas re-demander le mot de passe
        document.getElementById('enableSplit').checked = archiveInfo.options.enableSplit || false;
        document.getElementById('archiveFormat').value = archiveInfo.options.archiveFormat || 'zip';
    }
    
    // Créer une nouvelle archive avec les mêmes options
    showNotification(`Création de l\'archive: ${escapeHtml(archiveInfo.name)}...`, 'info');
    createArchive()
}

/**
 * Affiche les informations sur le format d'archive sélectionné
 */
function updateArchiveFormatInfo() {
    const formatSelect = document.getElementById('archiveFormat');
    const formatInfo = document.getElementById('formatInfo');
    const formatDetails = document.getElementById('formatDetails');
    const softwareLinks = document.getElementById('softwareLinks');
    
    if (!formatSelect || !formatInfo) return;
    
    const format = formatSelect.value;
    let info = '';
    let links = '';
    
    switch(format) {
        case 'zip':
            info = '✅ ZIP est l\'format le plus universel. Compatible avec Windows, Mac et Linux nativement. Aucun logiciel supplémentaire requis.';
            formatInfo.style.display = 'none';
            break;
        case '7z':
            info = '⚠️ Format 7Z offre une meilleure compression que ZIP, mais nécessite un logiciel compatible. Téléchargez 7-Zip ci-dessous pour créer/ouvrir des archives 7Z.';
            links = `<a href="https://www.7-zip.org/" target="_blank" rel="noopener">📥 Télécharger 7-Zip</a>`;
            formatInfo.style.display = 'block';
            break;
        case 'rar':
            info = '⚠️ RAR est un format propriétaire offrant une bonne compression. Téléchargez WinRAR pour créer/ouvrir des archives RAR. Cette version crée un ZIP que vous pouvez renommer en .rar.';
            links = `<a href="https://www.win-rar.com/" target="_blank" rel="noopener">📥 Télécharger WinRAR</a> | <a href="https://www.7-zip.org/" target="_blank" rel="noopener">📥 7-Zip (gratuit)</a>`;
            formatInfo.style.display = 'block';
            break;
    }
    
    if (formatDetails) formatDetails.innerHTML = info;
    if (softwareLinks) softwareLinks.innerHTML = links;
}

/* Modal intrusif pour logiciel manquant */
function showMissingSoftwareModal(message) {
    const modal = document.getElementById('missingSoftwareModal');
    const text = document.getElementById('missingModalText');
    const dismiss = document.getElementById('missingDismiss');
    if (!modal) return;
    if (text) text.textContent = message || 'Le serveur n\'a pas trouvé l\'outil nécessaire pour créer le format demandé.';
    modal.style.display = 'block';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Liaisons
    const closeBtns = modal.querySelectorAll('.modal-close, #missingDismiss');
    closeBtns.forEach(b => b.addEventListener('click', hideMissingSoftwareModal));

    const testNowBtn = document.getElementById('missingTestNow');
    const testResult = document.getElementById('missingTestResult');
    if (testNowBtn) {
        testNowBtn.addEventListener('click', async () => {
            if (testResult) testResult.textContent = 'Test en cours...';
            try {
                const base = location.origin;
                const resp = await checkServer7z(base + '/check7z');
                if (resp && resp.ok) {
                    if (testResult) testResult.textContent = '7‑Zip détecté sur le serveur';
                    showNotification('7‑Zip détecté sur le serveur', 'success');
                } else {
                    if (testResult) testResult.textContent = '7‑Zip non détecté';
                    showNotification('7‑Zip non détecté sur le serveur', 'warning');
                }
            } catch (err) {
                if (testResult) testResult.textContent = 'Erreur: ' + (err.message || err);
                showNotification('Erreur lors du test serveur: ' + (err.message || err), 'error');
            }
            setTimeout(() => { if (testResult) testResult.textContent = ''; }, 5000);
        });
    }
}

function hideMissingSoftwareModal() {
    const modal = document.getElementById('missingSoftwareModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

/**
 * Envoie les fichiers nettoyés au serveur pour création d'une archive 7z
 * @param {string} serverUrl - URL du endpoint serveur
 */
function sendFilesToServerFor7z(serverUrl) {
    showNotification('Conversion serveur désactivée. Utilisez le ZIP côté client ou les téléchargements séquentiels.', 'info');
    return;
    const cleanedFiles = state.files.filter(f => f.cleaned);
    if (cleanedFiles.length === 0) {
        showNotification('Aucun fichier nettoyé à envoyer', 'warning');
        return;
    }

    const endpoint = serverUrl || (location.origin + '/convert7z');

    const compressionLevel = parseInt(document.getElementById('compressionLevel')?.value || '9');

    const form = new FormData();
    cleanedFiles.forEach((f, idx) => {
        // Append with cleaned filename as filename metadata
        form.append('files[]', f.originalFile, f.cleanedName || f.originalName);
    });

    form.append('compression', String(compressionLevel));

    // UI
    closeArchiveModal();
    showProgressBar();
    updateProgressBar(5, 'Préparation de l\'envoi vers le serveur...');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.responseType = 'blob';

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateProgressBar(10 + Math.round(pct * 0.6), `Upload: ${pct}%`);
        }
    };

    xhr.onprogress = function(e) {
        // download progress after response starts
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateProgressBar(70 + Math.round(pct * 0.3), `Téléchargement archive: ${pct}%`);
        }
    };

    xhr.onload = function() {
        hideProgressBar();
        if (xhr.status >= 200 && xhr.status < 300) {
            const disposition = xhr.getResponseHeader('Content-Disposition') || '';
            let filename = 'archive.7z';
            const match = /filename="?([^";]+)"?/.exec(disposition);
            if (match && match[1]) filename = match[1];

            const blob = xhr.response;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 200);

            showNotification(`Archive créée sur le serveur et téléchargée (${formatFileSize(blob.size)})`, 'success');
            addToArchiveHistory({ name: filename, size: blob.size, filesCount: cleanedFiles.length, created: Date.now(), options: { server: endpoint, compressionLevel } });
        } else {
            // Lire la réponse d'erreur et afficher un message utile
            const reader = new FileReader();
            reader.onload = function() {
                const text = reader.result || '';
                let parsed = null;
                try { parsed = JSON.parse(text); } catch(e) { parsed = null; }

                console.error('Erreur serveur:', xhr.status, parsed || text);

                const message = (parsed && parsed.error) ? parsed.error : (text || `Erreur serveur ${xhr.status}`);
                showNotification('Erreur serveur lors de la conversion: ' + message, 'error');

                // Si le message indique que 7z est manquant, afficher le panneau d'aide
                const notice = document.getElementById('missingSoftwareNotice');
                const missingText = document.getElementById('missingSoftwareText');
                const download7z = document.getElementById('download7zBtn');
                const downloadWinRar = document.getElementById('downloadWinRarBtn');
                const dismiss = document.getElementById('dismissMissingSoftware');

                if (message && (message.toLowerCase().includes('7z') || message.toLowerCase().includes('7-zip') || message.toLowerCase().includes('non trouv'))) {
                    // Ouvrir modal intrusif pour proposer le téléchargement / instructions
                    showMissingSoftwareModal('Le serveur indique que 7‑Zip est introuvable. Installez 7‑Zip sur le serveur (ou localement) pour activer la conversion en .7z.');
                } else {
                    // Montrer modal générique avec le message d'erreur
                    showMissingSoftwareModal(message);
                }
            };
            reader.readAsText(xhr.response || new Blob());
        }
    };

    xhr.onerror = function() {
        hideProgressBar();
        showNotification('Erreur réseau lors de l\'envoi au serveur', 'error');
    };

    try {
        xhr.send(form);
    } catch (e) {
        hideProgressBar();
        console.error('Erreur envoi XHR:', e);
        showNotification('Impossible d\'envoyer les fichiers au serveur', 'error');
    }
}

/**
 * Vérifie que la racine du serveur est joignable (GET /)
 * @param {string} rootUrl
 * @returns {Promise<boolean>}
 */
async function checkServerRoot(rootUrl) {
    try {
        const url = rootUrl.endsWith('/') ? rootUrl : (rootUrl + '/');
        const r = await fetch(url, { method: 'GET' });
        return r.ok;
    } catch (e) {
        return false;
    }
}

/**
 * Vérifie la présence de 7z sur le serveur via /check7z
 * @param {string} checkUrl
 * @returns {Promise<Object>} JSON response
 */
async function checkServer7z(checkUrl) {
    try {
        const url = checkUrl || (location.origin + '/check7z');
        const r = await fetch(url, { method: 'GET' });
        if (!r.ok) {
            const body = await r.json().catch(() => null);
            throw new Error((body && body.error) ? body.error : 'Serveur non disponible');
        }
        return await r.json();
    } catch (e) {
        throw e;
    }
}

/**
 * Configure les événements du modal d'archivage
 */
function setupArchiveModal() {
    const modal = document.getElementById('archiveModal');
    if (!modal) return;
    
    // Bouton fermer
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeArchiveModal);
    }
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeArchiveModal();
    });
    
    // Fermer avec Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeArchiveModal();
        }
    });
    
    // Bouton Annuler
    const cancelBtn = document.getElementById('cancelArchiveBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeArchiveModal);
    }
    
    // Bouton Créer Archive
    const createBtn = document.getElementById('createArchiveBtn');
    if (createBtn) {
        createBtn.addEventListener('click', createArchive);
    }
    
    // Changement du format d'archive
    const formatSelect = document.getElementById('archiveFormat');
    if (formatSelect) {
        formatSelect.addEventListener('change', updateArchiveFormatInfo);
        // Initialiser l'info au chargement du modal
        updateArchiveFormatInfo();
    }
    
    // Checkbox Mot de passe
    const usePasswordCheckbox = document.getElementById('usePassword');
    const passwordInput = document.getElementById('archivePassword');
    if (usePasswordCheckbox && passwordInput) {
        usePasswordCheckbox.addEventListener('change', (e) => {
            passwordInput.disabled = !e.target.checked;
        });
    }
    
    // Checkbox Split
    const enableSplitCheckbox = document.getElementById('enableSplit');
    const splitOptions = document.getElementById('splitOptions');
    if (enableSplitCheckbox && splitOptions) {
        enableSplitCheckbox.addEventListener('change', (e) => {
            splitOptions.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    // Option: Utiliser le serveur pour conversion 7z
    const useServerConvert = document.getElementById('useServerConvert');
    const serverConvertOptions = document.getElementById('serverConvertOptions');
    const serverConvertBtn = document.getElementById('serverConvertBtn');
    const serverConvertCancel = document.getElementById('serverConvertCancel');
    const serverEndpointInput = document.getElementById('serverEndpoint');

    if (useServerConvert && serverConvertOptions) {
        useServerConvert.addEventListener('change', (e) => {
            serverConvertOptions.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    // Si l'utilisateur préfère revenir à un état sans conversion serveur,
    // masquer et désactiver les contrôles serveur pour éviter les envois par erreur.
    try {
        if (useServerConvert) {
            useServerConvert.checked = false;
            useServerConvert.style.display = 'none';
        }
        if (serverConvertOptions) serverConvertOptions.style.display = 'none';
        const serverConvertBtnLocal = document.getElementById('serverConvertBtn');
        const serverCheckBtnLocal = document.getElementById('serverCheckBtn');
        if (serverConvertBtnLocal) serverConvertBtnLocal.disabled = true;
        if (serverCheckBtnLocal) serverCheckBtnLocal.disabled = true;
    } catch (e) {
        // ignore si éléments manquants
    }

    if (serverConvertBtn) {
        serverConvertBtn.addEventListener('click', () => {
            const url = serverEndpointInput?.value || (location.origin + '/convert7z');
            sendFilesToServerFor7z(url);
        });
    }

    const serverCheckBtn = document.getElementById('serverCheckBtn');
    const serverCheckResult = document.getElementById('serverCheckResult');
    if (serverCheckBtn) {
        serverCheckBtn.addEventListener('click', async () => {
            const url = serverEndpointInput?.value || (location.origin + '/');
            if (serverCheckResult) serverCheckResult.textContent = 'Vérification...';
            try {
                const ok = await checkServerRoot(url);
                if (serverCheckResult) serverCheckResult.textContent = ok ? 'Serveur OK' : 'Serveur non joignable';
            } catch (e) {
                if (serverCheckResult) serverCheckResult.textContent = 'Erreur: ' + (e.message || e);
            }
            setTimeout(() => { if (serverCheckResult) serverCheckResult.textContent = ''; }, 4000);
        });
    }

    if (serverConvertCancel) {
        serverConvertCancel.addEventListener('click', () => {
            if (useServerConvert) {
                useServerConvert.checked = false;
                serverConvertOptions.style.display = 'none';
            }
        });
    }
    
    console.log('📦 Modal d\'archivage configuré');
}

// ============================================================================
// Suppression individuelle et globale des fichiers
// ============================================================================

/**
 * Supprime un fichier spécifique par son ID
 * @param {string} fileId - ID du fichier à supprimer
 */
function removeFile(fileId) {
    const fileIndex = state.files.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;
    
    // Mettre à jour la taille totale
    state.totalSize -= state.files[fileIndex].size;
    
    // Supprimer le fichier
    state.files.splice(fileIndex, 1);
    
    updateFileList();
    updateUI();
    updateStats();
    
    showNotification(CONFIG.messages.fileRemoved, 'info');
}

/**
 * Supprime tous les fichiers après confirmation
 */
function clearAllFiles() {
    if (state.files.length === 0) {
        showNotification('Aucun fichier à supprimer', 'info');
        return;
    }
    
    const confirmMessage = `Voulez-vous vraiment supprimer ${state.files.length} fichier(s) ?\n(${formatFileSize(state.totalSize)} de données)`;
    
    if (confirm(confirmMessage)) {
        state.files = [];
        state.totalSize = 0;
        
        // Réinitialiser l'input file
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        updateFileList();
        updateUI();
        updateStats();
        
        showNotification(CONFIG.messages.allCleared, 'info');
    }
}

// ============================================================================
// SECTION 10 : MISE À JOUR DE L'INTERFACE
// Fonctions de rendu et d'affichage
// ============================================================================

/**
 * Met à jour la liste complète des fichiers dans l'interface
 */
function updateFileList() {
    const container = document.getElementById('filesContainer');
    if (!container) return;
    
    if (state.files.length === 0) {
        container.innerHTML = '<p class="empty-message">Aucun fichier uploadé</p>';
        return;
    }
    
    // Construire le HTML
    let html = '';
    
    // Compteur en haut
    html += `
        <div class="files-counter">
            <span class="files-counter-text">Fichiers chargés</span>
            <span class="files-counter-value">${state.files.length} / ${CONFIG.maxFiles}</span>
        </div>
    `;
    
    // Cartes de fichiers
    state.files.forEach((file, index) => {
        const isCleaned = file.cleaned && file.cleanedName;
        const displayName = isCleaned ? file.cleanedName : file.originalName;
        const sizeClass = file.size > 500 * 1024 * 1024 ? 'very-large' : 
                         file.size > 100 * 1024 * 1024 ? 'large' : '';
        
        html += `
            <div class="file-card ${isCleaned ? 'cleaned' : ''}" id="file-${file.id}">
                <div class="file-icon">${file.icon}</div>
                <div class="file-info">
                    <div class="file-name" title="${escapeHtml(displayName)}">
                        ${escapeHtml(displayName)}
                    </div>
                    ${isCleaned ? `
                        <div class="file-name original" title="${escapeHtml(file.originalName)}">
                            ${escapeHtml(file.originalName)}
                        </div>
                    ` : ''}
                    <div class="file-details">
                        <span class="file-size ${sizeClass}">${file.formattedSize}</span>
                        <span>${file.type}</span>
                        <span>#${index + 1}</span>
                    </div>
                </div>
                <div class="file-actions">
                    ${!isCleaned ? `
                        <button class="action-btn clean" onclick="cleanFile('${file.id}')" title="Nettoyer le nom">
                            <span>✨</span> Nettoyer
                        </button>
                    ` : ''}
                    <button class="action-btn download" onclick="downloadFile('${file.id}')" title="Télécharger">
                        <span>⬇️</span> Télécharger
                    </button>
                    <button class="action-btn delete" onclick="removeFile('${file.id}')" title="Supprimer">
                        <span>🗑️</span> Supprimer
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Met à jour un seul élément de fichier (optimisation)
 * @param {string} fileId - ID du fichier à mettre à jour
 */
function updateFileItem(fileId) {
    // Pour simplifier, on recharge toute la liste
    // Une optimisation serait de ne mettre à jour que l'élément concerné
    updateFileList();
}

/**
 * Met à jour l'état des boutons globaux
 */
function updateUI() {
    const hasFiles = state.files.length > 0;
    const hasCleanedFiles = state.files.some(f => f.cleaned);
    const hasUncleanedFiles = state.files.some(f => !f.cleaned);
    
    // Bouton nettoyer tous
    const cleanAllBtn = document.getElementById('cleanAllBtn');
    if (cleanAllBtn) {
        cleanAllBtn.disabled = !hasUncleanedFiles;
    }
    
    // Bouton télécharger tous
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.disabled = !hasCleanedFiles;
    }
    
    // Bouton tout effacer
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.disabled = !hasFiles;
    }
}

/**
 * Met à jour les statistiques d'utilisation
 */
function updateStats() {
    // Pourcentage de fichiers utilisés
    const filesPercent = (state.files.length / CONFIG.maxFiles) * 100;
    
    // Pourcentage de taille utilisée
    const sizePercent = (state.totalSize / CONFIG.maxTotalSize) * 100;
    
    // Mettre à jour les éléments si ils existent
    const statsContainer = document.getElementById('uploadStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">📁</div>
                <div class="stat-value">${state.files.length}</div>
                <div class="stat-label">Fichiers / ${CONFIG.maxFiles}</div>
                <div class="stat-gauge">
                    <div class="stat-gauge-fill ${filesPercent > 80 ? 'danger' : filesPercent > 50 ? 'warning' : ''}" 
                         style="width: ${filesPercent}%"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💾</div>
                <div class="stat-value">${formatFileSize(state.totalSize)}</div>
                <div class="stat-label">Utilisé / ${formatFileSize(CONFIG.maxTotalSize)}</div>
                <div class="stat-gauge">
                    <div class="stat-gauge-fill ${sizePercent > 80 ? 'danger' : sizePercent > 50 ? 'warning' : ''}" 
                         style="width: ${sizePercent}%"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${state.files.filter(f => f.cleaned).length}</div>
                <div class="stat-label">Fichiers nettoyés</div>
            </div>
        `;
    }
}

// ============================================================================
// SECTION 11 : BARRE DE PROGRESSION
// Affichage de la progression pour les gros volumes
// ============================================================================

/**
 * Affiche la barre de progression
 */
function showProgressBar() {
    const progressContainer = document.getElementById('uploadProgress');
    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressContainer.classList.add('active');
    }
}

/**
 * Met à jour la barre de progression
 * @param {number} percent - Pourcentage de progression (0-100)
 * @param {string} text - Texte à afficher
 */
function updateProgressBar(percent, text) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
    
    if (progressText) {
        progressText.textContent = text;
    }
}

/**
 * Masque la barre de progression
 */
function hideProgressBar() {
    const progressContainer = document.getElementById('uploadProgress');
    if (progressContainer) {
        progressContainer.style.display = 'none';
        progressContainer.classList.remove('active');
    }
}

// ============================================================================
// SECTION 12 : GESTION DES CARACTÈRES
// Modal et fonctions d'édition des caractères invalides
// ============================================================================

/**
 * Ouvre le modal d'édition des caractères
 */
function openCharModal() {
    const modal = document.getElementById('charModal');
    if (modal) {
        updateCharModalList();
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Ferme le modal d'édition des caractères
 */
function closeCharModal() {
    const modal = document.getElementById('charModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * Met à jour l'aperçu des caractères dans la page principale
 */
function updateCharPreview() {
    const preview = document.getElementById('charPreview');
    if (!preview) return;
    
    const chars = Array.from(state.invalidChars).slice(0, 20);
    
    preview.innerHTML = chars.map(char => {
        const display = char === ' ' ? '[espace]' :
                       char === '\t' ? '[tab]' :
                       char === '\n' ? '[nl]' :
                       char === '\r' ? '[cr]' :
                       escapeHtml(char);
        return `<span title="${escapeHtml(char)}">${display}</span>`;
    }).join('');
    
    if (state.invalidChars.size > 20) {
        preview.innerHTML += `<span>+${state.invalidChars.size - 20}...</span>`;
    }
}

/**
 * Met à jour la liste des caractères dans le modal
 */
function updateCharModalList() {
    const container = document.getElementById('charListDisplay');
    if (!container) return;
    
    const chars = Array.from(state.invalidChars).sort();
    
    container.innerHTML = chars.map(char => {
        const display = char === ' ' ? '[espace]' :
                       char === '\t' ? '[tab]' :
                       char === '\n' ? '[nl]' :
                       char === '\r' ? '[cr]' :
                       escapeHtml(char);
        
        return `
            <div class="char-item">
                <span class="char-text">${display}</span>
                <button class="char-remove" onclick="removeCharFromList('${escapeHtml(char)}')" title="Supprimer">×</button>
            </div>
        `;
    }).join('');
}

/**
 * Met à jour le compteur de caractères dans le modal
 */
function updateCharCounter() {
    const input = document.getElementById('newCharInput');
    const counter = document.getElementById('charCount');
    
    if (!input || !counter) return;
    
    const uniqueChars = new Set(input.value);
    counter.textContent = uniqueChars.size;
    
    // Couleur selon le nombre
    counter.style.color = uniqueChars.size === 0 ? '#6c757d' :
                         uniqueChars.size <= 10 ? '#28a745' : '#dc3545';
}

/**
 * Ajoute des caractères depuis le modal
 */
function addCharsFromModal() {
    const input = document.getElementById('newCharInput');
    if (!input || !input.value) {
        showNotification('Entrez des caractères à ajouter', 'warning');
        return;
    }
    
    let addedCount = 0;
    const uniqueChars = new Set(input.value);
    
    uniqueChars.forEach(char => {
        if (!state.invalidChars.has(char)) {
            state.invalidChars.add(char);
            addedCount++;
        }
    });
    
    input.value = '';
    updateCharCounter();
    updateCharModalList();
    updateCharPreview();
    saveData();
    
    if (addedCount > 0) {
        showNotification(`${addedCount} caractère(s) ajouté(s)`, 'success');
    } else {
        showNotification('Ces caractères sont déjà dans la liste', 'info');
    }
}

/**
 * Supprime un caractère de la liste
 * @param {string} char - Caractère à supprimer
 */
function removeCharFromList(char) {
    state.invalidChars.delete(char);
    updateCharModalList();
    updateCharPreview();
    saveData();
}

/**
 * Applique une présélection de caractères
 * @param {string} chars - Chaîne de caractères à ajouter
 */
function applyPreset(chars) {
    let addedCount = 0;
    
    for (const char of chars) {
        if (!state.invalidChars.has(char)) {
            state.invalidChars.add(char);
            addedCount++;
        }
    }
    
    updateCharModalList();
    updateCharPreview();
    saveData();
    
    showNotification(`${addedCount} caractère(s) ajouté(s)`, 'success');
}

/**
 * Réinitialise la liste des caractères aux valeurs par défaut
 */
function resetChars() {
    if (!confirm('Réinitialiser la liste des caractères ?')) return;
    
    state.invalidChars = new Set([
        '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
        '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
        '★', '☆', '✰', '✦', '✧', '℃', '←', '▎', '✿', '❀', '❁', '❤', '➤', '➥', '➦',
        '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '²', '~', '`', '´',
        ',', ';', '!', '(', ')', '[', ']', '{', '}', '@', '&', '$', '%', '^', '=',
        '\t', '\n', '\r'
    ]);
    
    updateCharModalList();
    updateCharPreview();
    saveData();
    
    showNotification('Liste réinitialisée', 'success');
}

// ============================================================================
// SECTION 13 : FONCTIONS UTILITAIRES
// Helpers et fonctions de support
// ============================================================================

/**
 * Génère un ID unique
 * @returns {string} ID unique
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Formate une taille de fichier en unité lisible
 * @param {number} bytes - Taille en octets
 * @returns {string} Taille formatée
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 octets';
    
    const units = ['octets', 'Ko', 'Mo', 'Go', 'To'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * Détermine le type de fichier
 * @param {File} file - Fichier
 * @returns {string} Type de fichier
 */
function getFileType(file) {
    if (!file || !file.type) return 'inconnu';
    return file.type.split('/')[0] || 'fichier';
}

/**
 * Retourne l'icône appropriée pour un type de fichier
 * @param {File} file - Fichier
 * @returns {string} Emoji icône
 */
function getFileIcon(file) {
    const type = getFileType(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Par extension
    const extIcons = {
        pdf: '📕', zip: '📦', rar: '📦', '7z': '📦',
        doc: '📄', docx: '📄', xls: '📊', xlsx: '📊',
        ppt: '📽️', pptx: '📽️', txt: '📝',
        js: '💻', html: '💻', css: '💻', py: '💻', java: '💻'
    };
    
    if (extIcons[ext]) return extIcons[ext];
    
    // Par type MIME
    const typeIcons = {
        image: '🖼️', audio: '🎵', video: '🎬', text: '📄'
    };
    
    return typeIcons[type] || '📁';
}

/**
 * Échappe les caractères HTML
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// SECTION 14 : NOTIFICATIONS
// Système de notifications toast
// ============================================================================

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type: success, warning, error, info
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    
    const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        background-color: ${colors[type] || colors.info};
        white-space: pre-line;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, CONFIG.notificationDuration);
}

// ============================================================================
// SECTION 15 : PERSISTANCE DES DONNÉES
// Sauvegarde et chargement depuis localStorage
// ============================================================================

/**
 * Sauvegarde les données dans localStorage
 */
function saveData() {
    try {
        // Sauvegarder les options
        localStorage.setItem('upload_options', JSON.stringify(state.options));
        
        // Sauvegarder les caractères
        localStorage.setItem('upload_chars', JSON.stringify([...state.invalidChars]));
        
        console.log('💾 Données sauvegardées');
    } catch (e) {
        console.error('❌ Erreur de sauvegarde:', e);
    }
}

/**
 * Charge les données depuis localStorage
 */
function loadSavedData() {
    try {
        // Charger les options
        const savedOptions = localStorage.getItem('upload_options');
        if (savedOptions) {
            state.options = { ...state.options, ...JSON.parse(savedOptions) };
            
            // Mettre à jour l'interface
            const underscoresOption = document.getElementById('underscoresOption');
            const lowercaseOption = document.getElementById('lowercaseOption');
            const prefixOption = document.getElementById('prefixOption');
            const prefixText = document.getElementById('prefixText');
            const prefixInputContainer = document.getElementById('prefixInputContainer');
            
            if (underscoresOption) underscoresOption.checked = state.options.useUnderscores;
            if (lowercaseOption) lowercaseOption.checked = state.options.toLowercase;
            if (prefixOption) prefixOption.checked = state.options.usePrefix;
            if (prefixText) prefixText.value = state.options.prefix;
            if (prefixInputContainer) {
                prefixInputContainer.style.display = state.options.usePrefix ? 'block' : 'none';
            }
        }
        
        // Charger les caractères
        const savedChars = localStorage.getItem('upload_chars');
        if (savedChars) {
            state.invalidChars = new Set(JSON.parse(savedChars));
        }
        
        console.log('📂 Données chargées');
    } catch (e) {
        console.error('❌ Erreur de chargement:', e);
    }
}

// ============================================================================
// SECTION 16 : STYLES D'ANIMATION
// Injection des keyframes CSS pour les notifications
// ============================================================================

/**
 * Ajoute les styles d'animation au document
 */
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// SECTION 17 : DÉMARRAGE DE L'APPLICATION
// Point d'entrée et exposition des fonctions globales
// ============================================================================

// Ajouter les styles d'animation
addAnimationStyles();

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exposer les fonctions nécessaires globalement
window.cleanFile = cleanFile;
window.downloadFile = downloadFile;
window.removeFile = removeFile;
window.removeCharFromList = removeCharFromList;

// ==========================================================================
// FIN DU FICHIER UPLOAD.JS
// ==========================================================================

// ============================================================================
// SECTION 13 : FONCTIONS UTILITAIRES
// Helpers et fonctions de support
// ============================================================================

/**
 * Génère un ID unique
 * @returns {string} ID unique
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Formate une taille de fichier en unité lisible
 * @param {number} bytes - Taille en octets
 * @returns {string} Taille formatée
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 octets';
    
    const units = ['octets', 'Ko', 'Mo', 'Go', 'To'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * Détermine le type de fichier
 * @param {File} file - Fichier
 * @returns {string} Type de fichier
 */
function getFileType(file) {
    if (!file || !file.type) return 'inconnu';
    return file.type.split('/')[0] || 'fichier';
}

/**
 * Retourne l'icône appropriée pour un type de fichier
 * @param {File} file - Fichier
 * @returns {string} Emoji icône
 */
function getFileIcon(file) {
    const type = getFileType(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Par extension
    const extIcons = {
        pdf: '📕', zip: '📦', rar: '📦', '7z': '📦',
        doc: '📄', docx: '📄', xls: '📊', xlsx: '📊',
        ppt: '📽️', pptx: '📽️', txt: '📝',
        js: '💻', html: '💻', css: '💻', py: '💻', java: '💻'
    };
    
    if (extIcons[ext]) return extIcons[ext];
    
    // Par type MIME
    const typeIcons = {
        image: '🖼️', audio: '🎵', video: '🎬', text: '📄'
    };
    
    return typeIcons[type] || '📁';
}

/**
 * Échappe les caractères HTML
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// SECTION 14 : NOTIFICATIONS
// Système de notifications toast
// ============================================================================

/**
 * Affiche une notification toast
 * @param {string} message - Message à afficher
 * @param {string} type - Type: success, warning, error, info
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    
    const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        max-width: 350px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        background-color: ${colors[type] || colors.info};
        white-space: pre-line;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, CONFIG.notificationDuration);
}

// ============================================================================
// SECTION 15 : PERSISTANCE DES DONNÉES
// Sauvegarde et chargement depuis localStorage
// ============================================================================

/**
 * Sauvegarde les données dans localStorage
 */
function saveData() {
    try {
        // Sauvegarder les options
        localStorage.setItem('upload_options', JSON.stringify(state.options));
        
        // Sauvegarder les caractères
        localStorage.setItem('upload_chars', JSON.stringify([...state.invalidChars]));
        
        console.log('💾 Données sauvegardées');
    } catch (e) {
        console.error('❌ Erreur de sauvegarde:', e);
    }
}

/**
 * Charge les données depuis localStorage
 */
function loadSavedData() {
    try {
        // Charger les options
        const savedOptions = localStorage.getItem('upload_options');
        if (savedOptions) {
            state.options = { ...state.options, ...JSON.parse(savedOptions) };
            
            // Mettre à jour l'interface
            const underscoresOption = document.getElementById('underscoresOption');
            const lowercaseOption = document.getElementById('lowercaseOption');
            const prefixOption = document.getElementById('prefixOption');
            const prefixText = document.getElementById('prefixText');
            const prefixInputContainer = document.getElementById('prefixInputContainer');
            
            if (underscoresOption) underscoresOption.checked = state.options.useUnderscores;
            if (lowercaseOption) lowercaseOption.checked = state.options.toLowercase;
            if (prefixOption) prefixOption.checked = state.options.usePrefix;
            if (prefixText) prefixText.value = state.options.prefix;
            if (prefixInputContainer) {
                prefixInputContainer.style.display = state.options.usePrefix ? 'block' : 'none';
            }
        }
        
        // Charger les caractères
        const savedChars = localStorage.getItem('upload_chars');
        if (savedChars) {
            state.invalidChars = new Set(JSON.parse(savedChars));
        }
        
        console.log('📂 Données chargées');
    } catch (e) {
        console.error('❌ Erreur de chargement:', e);
    }
}

// ============================================================================
// SECTION 16 : STYLES D'ANIMATION
// Injection des keyframes CSS pour les notifications
// ============================================================================

/**
 * Ajoute les styles d'animation au document
 */
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// SECTION 17 : DÉMARRAGE DE L'APPLICATION
// Point d'entrée et exposition des fonctions globales
// ============================================================================

// Ajouter les styles d'animation
addAnimationStyles();

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Exposer les fonctions nécessaires globalement
window.cleanFile = cleanFile;
window.downloadFile = downloadFile;
window.removeFile = removeFile;
window.removeCharFromList = removeCharFromList;

// ==========================================================================
// FIN DU FICHIER UPLOAD.JS
// ==========================================================================